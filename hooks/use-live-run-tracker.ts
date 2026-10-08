import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  matchTrackToRoad,
  mergeMatchedRoute,
} from '@/services/graphhopper-map-matching';
import {
  averagePaceSecPerKm,
  currentPaceSecPerKm,
  isTrackPointUsable,
  trackDistanceKm,
  type Coordinates,
  type TrackPoint,
} from '@/services/geo';
import { mapCenterFromLocation, type LiveMapCenter } from '@/services/live-location';

/**
 * สถานะของการติดตามการวิ่งจริง
 *
 * 'requesting' และ 'denied' เกิดก่อนวิ่งเสมอ วนกลับไป 'requesting' ไม่ได้หลังจากนั้น
 * เพราะขอสิทธิ์ตำแหน่งซ้ำระหว่างวิ่งอยู่แล้วไม่มีประโยชน์ ผู้ใช้ต้องออกไปตั้งค่าเองถ้าปฏิเสธ
 */
export type TrackerStatus =
  | 'idle'
  | 'requesting'
  | 'denied'
  | 'locationOff'
  | 'ready'
  | 'running'
  | 'paused';

const GPS_ACCURACY = Location.Accuracy.BestForNavigation;
/** อัปเดตทุก 5 เมตร กันสัญญาณ GPS กระตุกเล็กน้อยทำให้ระยะทางเพี้ยนตอนยืนอยู่กับที่ */
const DISTANCE_INTERVAL_METERS = 5;
const TIME_INTERVAL_MS = 3000;
const CLOCK_TICK_MS = 1000;
const MAP_MATCH_MIN_POINTS = 4;
const MAP_MATCH_NEW_POINTS = 3;
const MAP_MATCH_OVERLAP_POINTS = 2;

export type RoadMatchStatus = 'waiting' | 'matching' | 'matched' | 'fallback';

export interface LiveRunState {
  status: TrackerStatus;
  /** จุด GPS ที่กรองความคลาดเคลื่อนแล้ว ใช้คำนวณสัญญาณเวลาและ FormScore */
  points: TrackPoint[];
  /** เส้นที่จับเข้าถนนแล้ว และมี GPS ดิบช่วงท้ายเป็น fallback ระหว่างรอ API */
  routePoints: Coordinates[];
  roadMatchStatus: RoadMatchStatus;
  /** ตำแหน่งสำหรับจัดกล้อง อาจหยาบกว่าจุดที่ยอมให้นับเป็นระยะวิ่ง */
  mapCenter: LiveMapCenter | null;
  distanceKm: number;
  elapsedSeconds: number;
  /** เวลารวมตั้งแต่กดเริ่ม รวมช่วงหยุดชั่วคราว */
  totalElapsedSeconds: number;
  /** วินาทีต่อกิโลเมตร เฉลี่ยตั้งแต่เริ่มวิ่ง null เมื่อยังไม่มีระยะทางให้คำนวณ */
  paceSecPerKm: number | null;
  /** pace จาก GPS ช่วง 30 วินาทีล่าสุด */
  currentPaceSecPerKm: number | null;
  currentSpeedKmh: number | null;
}

/**
 * ติดตามตำแหน่ง ระยะทาง และเวลาระหว่างวิ่งจริง
 *
 * เวลาที่นับคือเวลาที่ "วิ่งจริง" เท่านั้น หยุดชั่วคราวแล้วนาฬิกาหยุดตามไปด้วย ไม่ใช่แค่ตัวเลข
 * ที่แสดงผลค้างอยู่ ส่วน GPS จะถูกถอดการติดตามทั้งหมดตอนหยุดชั่วคราว แล้วขอใหม่ตอนวิ่งต่อ
 * เพื่อไม่ให้สัญญาณ GPS กระตุกตอนยืนนิ่งเพิ่มระยะทางปลอมเข้าไปในเส้นทาง
 */
export function useLiveRunTracker() {
  const [status, setStatus] = useState<TrackerStatus>('idle');
  const [points, setPoints] = useState<TrackPoint[]>([]);
  const [matchedPoints, setMatchedPoints] = useState<Coordinates[]>([]);
  const [roadMatchStatus, setRoadMatchStatus] = useState<RoadMatchStatus>('waiting');
  const [mapCenter, setMapCenter] = useState<LiveMapCenter | null>(null);
  const [matchRevision, setMatchRevision] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState(0);

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const runningSinceRef = useRef<number | null>(null);
  const sessionStartedAtRef = useRef<number | null>(null);
  const accumulatedSecondsRef = useRef(0);
  const matchedPointsRef = useRef<Coordinates[]>([]);
  const submittedRawCountRef = useRef(0);
  const matchedRawCountRef = useRef(0);
  const matchInFlightRef = useRef(false);

  // เพิ่มขึ้นทุกครั้งที่หยุดการติดตาม GPS ตั้งใจให้เป็นตัวยกเลิกงานที่ค้างอยู่ (ดูเหตุผลใน
  // startWatching) ไม่ใช่ตัวนับจำนวนครั้งที่มีความหมายอะไรในตัวมันเอง
  const watchGenerationRef = useRef(0);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    setStatus('requesting');
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setStatus('locationOff');
        return false;
      }

      const { status: permission } = await Location.requestForegroundPermissionsAsync();
      const granted = permission === Location.PermissionStatus.GRANTED;
      setStatus(granted ? 'ready' : 'denied');
      return granted;
    } catch {
      setStatus('denied');
      return false;
    }
  }, []);

  const stopWatching = useCallback(() => {
    // เพิ่มเลขรุ่นก่อนเสมอ ทำให้ startWatching ที่กำลังรอ Location.watchPositionAsync อยู่
    // (ยังไม่ได้ resolve) รู้ตัวว่าถูกยกเลิกไปแล้วตอนมัน resolve จริง แล้วลบตัวเองทิ้งแทนที่จะ
    // เขียนทับ subscriptionRef.current ด้วยการติดตามที่ควรถูกหยุดไปแล้ว
    watchGenerationRef.current += 1;
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
  }, []);

  const startWatching = useCallback(async () => {
    const generation = ++watchGenerationRef.current;

    const subscription = await Location.watchPositionAsync(
      {
        accuracy: GPS_ACCURACY,
        distanceInterval: DISTANCE_INTERVAL_METERS,
        timeInterval: TIME_INTERVAL_MS,
      },
      (location) => {
        const nextMapCenter = mapCenterFromLocation(location);
        if (nextMapCenter) setMapCenter(nextMapCenter);
        const candidate: TrackPoint = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          at: location.timestamp,
          accuracyMeters: location.coords.accuracy,
        };
        setPoints((previous) => {
          const latest = previous[previous.length - 1];
          return isTrackPointUsable(candidate, latest) ? [...previous, candidate] : previous;
        });
      }
    );

    // ระหว่างรอ watchPositionAsync ผู้ใช้อาจกดหยุดชั่วคราวไปแล้ว (stopWatching เพิ่มเลขรุ่นไปแล้ว)
    // ถ้าเลขรุ่นไม่ตรงกับตอนเริ่มขอ แปลว่าการขอครั้งนี้ล้าสมัยไปแล้ว ต้องลบทิ้งทันที ไม่ใช่ปล่อยให้
    // เขียนทับ subscriptionRef.current เพราะจะกลายเป็น GPS ที่ยังทำงานอยู่เบื้องหลังทั้งที่หน้าจอ
    // บอกผู้ใช้ว่าหยุดชั่วคราวแล้ว
    if (watchGenerationRef.current !== generation) {
      subscription.remove();
      return;
    }

    subscriptionRef.current = subscription;
  }, []);

  // นาฬิกา moving time เดินเฉพาะตอนวิ่ง ส่วน total time เดินต่อระหว่าง manual pause
  useEffect(() => {
    if (status !== 'running' && status !== 'paused') return;

    const id = setInterval(() => {
      const since = runningSinceRef.current;
      const now = Date.now();
      if (since !== null) {
        setElapsedSeconds(accumulatedSecondsRef.current + (now - since) / 1000);
      }
      const startedAt = sessionStartedAtRef.current;
      if (startedAt !== null) setTotalElapsedSeconds((now - startedAt) / 1000);
    }, CLOCK_TICK_MS);

    return () => clearInterval(id);
  }, [status]);

  useEffect(() => stopWatching, [stopWatching]);

  // GraphHopper ทำ Map Matching ได้แม่นกว่าการยิงทีละจุด เพราะต้องดูทิศทางจากหลาย GPS points
  // ส่งทุกสามจุดใหม่และซ้ำท้าย batch ก่อนหน้าสองจุด เส้นจึงต่อเนื่องแต่ไม่ยิง API ทุก callback
  useEffect(() => {
    if (
      points.length < MAP_MATCH_MIN_POINTS ||
      points.length - submittedRawCountRef.current < MAP_MATCH_NEW_POINTS ||
      matchInFlightRef.current
    ) {
      return;
    }

    const submittedCount = points.length;
    const start = Math.max(0, submittedRawCountRef.current - MAP_MATCH_OVERLAP_POINTS);
    const batch = points.slice(start, submittedCount);
    submittedRawCountRef.current = submittedCount;
    matchInFlightRef.current = true;
    setRoadMatchStatus('matching');

    void matchTrackToRoad(batch)
      .then((matched) => {
        const existing = matchedPointsRef.current;
        const merged = mergeMatchedRoute(existing, matched);
        // ถ้า batch ใหม่หาจุดร่วมกับเส้นเดิมไม่ได้ อย่าทิ้ง GPS ช่วงท้ายหรือเชื่อมข้ามพื้นที่เป็นเส้นตรง
        // ให้ใช้ raw fallback ต่อไปแล้วลองจับใหม่ใน batch ถัดไปแทน
        if (existing.length > 0 && merged.length === existing.length) {
          setRoadMatchStatus('fallback');
          return;
        }
        matchedRawCountRef.current = submittedCount;
        matchedPointsRef.current = merged;
        setMatchedPoints(merged);
        setRoadMatchStatus('matched');
      })
      .catch(() => {
        // การวิ่งต้องไม่หยุดเพราะเน็ตหรือโควตา GraphHopper ใช้ GPS ที่กรองแล้วต่อทันทีและลองใหม่
        // เมื่อมีจุดชุดถัดไป โดยไม่แสดง error ขวางผู้ใช้กลางการวิ่ง
        setRoadMatchStatus('fallback');
      })
      .finally(() => {
        matchInFlightRef.current = false;
        setMatchRevision((revision) => revision + 1);
      });
  }, [points, matchRevision]);

  /** เริ่มนับเวลาจากตอนนี้ ใช้ทั้งตอนเริ่มวิ่งครั้งแรกและตอนวิ่งต่อหลังหยุดชั่วคราว */
  const beginRunningClock = () => {
    const now = Date.now();
    runningSinceRef.current = now;
    sessionStartedAtRef.current ??= now;
  };

  /** พักการนับเวลา รวมช่วงที่เพิ่งวิ่งเข้ากับยอดสะสม แล้วอัปเดตตัวเลขที่แสดงผลให้ตรงทันที
   * ใช้ทั้งตอนหยุดชั่วคราวและตอนจบการวิ่ง ไม่งั้นตัวเลขที่โชว์อาจค้างช้ากว่าความจริงได้ถึงหนึ่งวินาที */
  const flushRunningClock = () => {
    const since = runningSinceRef.current;
    if (since !== null) accumulatedSecondsRef.current += (Date.now() - since) / 1000;
    runningSinceRef.current = null;
    setElapsedSeconds(accumulatedSecondsRef.current);
    const startedAt = sessionStartedAtRef.current;
    if (startedAt !== null) setTotalElapsedSeconds((Date.now() - startedAt) / 1000);
  };

  const start = useCallback(async () => {
    if (status !== 'idle' && status !== 'ready') return;
    const granted = status === 'ready' ? true : await requestPermission();
    if (!granted) return;

    beginRunningClock();
    setStatus('running');
    // last-known ช่วยให้กล้องเข้าหามือถือทันที ส่วน current fix ทำงานต่อโดยไม่ขวางการเริ่มจับ GPS
    void Location.getLastKnownPositionAsync({ maxAge: 60_000, requiredAccuracy: 10_000 })
      .then((known) => {
        const center = known ? mapCenterFromLocation(known) : null;
        if (center) {
          setMapCenter(center);
          return;
        }
        return Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then(
          (current) => {
            const currentCenter = mapCenterFromLocation(current);
            if (currentCenter) setMapCenter(currentCenter);
          }
        );
      })
      .catch(() => {
        // watchPositionAsync ด้านล่างยังมีโอกาสได้พิกัดต่อ ไม่ให้ one-shot fix ขัดการเริ่มวิ่ง
      });
    try {
      await startWatching();
    } catch {
      flushRunningClock();
      stopWatching();
      setStatus('locationOff');
    }
  }, [status, requestPermission, startWatching, stopWatching]);

  const pause = useCallback(() => {
    if (status !== 'running') return;
    flushRunningClock();
    stopWatching();
    setStatus('paused');
  }, [status, stopWatching]);

  const resume = useCallback(async () => {
    if (status !== 'paused') return;
    beginRunningClock();
    setStatus('running');
    await startWatching();
  }, [status, startWatching]);

  /** คืน moving/total time แบบแม่นยำ ณ ตอนนี้ (ไม่ใช่ state) เพราะ flushRunningClock
   * อัปเดต state ผ่าน setElapsedSeconds ซึ่งเป็น async จะยังไม่เห็นผลใน closure เดียวกันที่เรียก
   * finish() อยู่ ผู้เรียกที่ต้องใช้เวลาที่แม่นยำทันที (เช่นตอนบันทึกผลวิ่งลงเครื่อง) ต้องใช้ค่าที่
   * คืนมานี้ ไม่ใช่อ่าน tracker.elapsedSeconds ต่อจากนี้ในซิงโครนัสเดียวกัน */
  const finish = useCallback(() => {
    flushRunningClock();
    stopWatching();
    setStatus('paused');
    const startedAt = sessionStartedAtRef.current;
    return {
      movingSeconds: accumulatedSecondsRef.current,
      totalElapsedSeconds: startedAt === null ? accumulatedSecondsRef.current : (Date.now() - startedAt) / 1000,
    };
  }, [stopWatching]);

  const rawTail = points.slice(matchedRawCountRef.current).map(({ latitude, longitude }) => ({
    latitude,
    longitude,
  }));
  const routePoints = matchedPoints.length > 0 ? [...matchedPoints, ...rawTail] : [...points];
  const distanceKm = trackDistanceKm(routePoints);
  const paceSecPerKm = averagePaceSecPerKm(distanceKm, elapsedSeconds);
  const livePaceSecPerKm = currentPaceSecPerKm(points);
  const currentSpeedKmh = livePaceSecPerKm === null ? null : 3600 / livePaceSecPerKm;

  const state: LiveRunState = {
    status,
    points,
    routePoints,
    roadMatchStatus,
    mapCenter,
    distanceKm,
    elapsedSeconds,
    totalElapsedSeconds,
    paceSecPerKm,
    currentPaceSecPerKm: livePaceSecPerKm,
    currentSpeedKmh,
  };

  return { ...state, start, pause, resume, finish, requestPermission };
}
