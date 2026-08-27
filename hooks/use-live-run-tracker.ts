import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

import { trackDistanceKm, type Coordinates } from '@/services/geo';

/**
 * สถานะของการติดตามการวิ่งจริง
 *
 * 'requesting' และ 'denied' เกิดก่อนวิ่งเสมอ วนกลับไป 'requesting' ไม่ได้หลังจากนั้น
 * เพราะขอสิทธิ์ตำแหน่งซ้ำระหว่างวิ่งอยู่แล้วไม่มีประโยชน์ ผู้ใช้ต้องออกไปตั้งค่าเองถ้าปฏิเสธ
 */
export type TrackerStatus = 'requesting' | 'denied' | 'ready' | 'running' | 'paused';

const GPS_ACCURACY = Location.Accuracy.BestForNavigation;
/** อัปเดตทุก 5 เมตร กันสัญญาณ GPS กระตุกเล็กน้อยทำให้ระยะทางเพี้ยนตอนยืนอยู่กับที่ */
const DISTANCE_INTERVAL_METERS = 5;
const TIME_INTERVAL_MS = 3000;
const CLOCK_TICK_MS = 1000;

export interface LiveRunState {
  status: TrackerStatus;
  points: Coordinates[];
  distanceKm: number;
  elapsedSeconds: number;
  /** วินาทีต่อกิโลเมตร เฉลี่ยตั้งแต่เริ่มวิ่ง null เมื่อยังไม่มีระยะทางให้คำนวณ */
  paceSecPerKm: number | null;
}

/**
 * ติดตามตำแหน่ง ระยะทาง และเวลาระหว่างวิ่งจริง
 *
 * เวลาที่นับคือเวลาที่ "วิ่งจริง" เท่านั้น หยุดชั่วคราวแล้วนาฬิกาหยุดตามไปด้วย ไม่ใช่แค่ตัวเลข
 * ที่แสดงผลค้างอยู่ ส่วน GPS จะถูกถอดการติดตามทั้งหมดตอนหยุดชั่วคราว แล้วขอใหม่ตอนวิ่งต่อ
 * เพื่อไม่ให้สัญญาณ GPS กระตุกตอนยืนนิ่งเพิ่มระยะทางปลอมเข้าไปในเส้นทาง
 */
export function useLiveRunTracker() {
  const [status, setStatus] = useState<TrackerStatus>('requesting');
  const [points, setPoints] = useState<Coordinates[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const runningSinceRef = useRef<number | null>(null);
  const accumulatedSecondsRef = useRef(0);

  // เพิ่มขึ้นทุกครั้งที่หยุดการติดตาม GPS ตั้งใจให้เป็นตัวยกเลิกงานที่ค้างอยู่ (ดูเหตุผลใน
  // startWatching) ไม่ใช่ตัวนับจำนวนครั้งที่มีความหมายอะไรในตัวมันเอง
  const watchGenerationRef = useRef(0);

  const requestPermission = useCallback(async () => {
    try {
      const { status: permission } = await Location.requestForegroundPermissionsAsync();
      setStatus(permission === Location.PermissionStatus.GRANTED ? 'ready' : 'denied');
    } catch {
      setStatus('denied');
    }
  }, []);

  useEffect(() => {
    requestPermission();
    // ขอสิทธิ์แค่ตอนจอนี้เปิดขึ้นครั้งแรกเท่านั้น การกดลองอีกครั้งของผู้ใช้เรียก requestPermission
    // เองโดยตรง ไม่ต้องพึ่ง dependency array
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        setPoints((previous) => [
          ...previous,
          { latitude: location.coords.latitude, longitude: location.coords.longitude },
        ]);
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

  // นาฬิกานับเวลาที่วิ่งจริง เดินทุกวินาทีเฉพาะตอนสถานะเป็น running เท่านั้น
  useEffect(() => {
    if (status !== 'running') return;

    const id = setInterval(() => {
      const since = runningSinceRef.current;
      if (since === null) return;
      setElapsedSeconds(accumulatedSecondsRef.current + (Date.now() - since) / 1000);
    }, CLOCK_TICK_MS);

    return () => clearInterval(id);
  }, [status]);

  useEffect(() => stopWatching, [stopWatching]);

  /** เริ่มนับเวลาจากตอนนี้ ใช้ทั้งตอนเริ่มวิ่งครั้งแรกและตอนวิ่งต่อหลังหยุดชั่วคราว */
  const beginRunningClock = () => {
    runningSinceRef.current = Date.now();
  };

  /** พักการนับเวลา รวมช่วงที่เพิ่งวิ่งเข้ากับยอดสะสม แล้วอัปเดตตัวเลขที่แสดงผลให้ตรงทันที
   * ใช้ทั้งตอนหยุดชั่วคราวและตอนจบการวิ่ง ไม่งั้นตัวเลขที่โชว์อาจค้างช้ากว่าความจริงได้ถึงหนึ่งวินาที */
  const flushRunningClock = () => {
    const since = runningSinceRef.current;
    if (since !== null) accumulatedSecondsRef.current += (Date.now() - since) / 1000;
    runningSinceRef.current = null;
    setElapsedSeconds(accumulatedSecondsRef.current);
  };

  const start = useCallback(async () => {
    if (status !== 'ready') return;
    beginRunningClock();
    setStatus('running');
    await startWatching();
  }, [status, startWatching]);

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

  const finish = useCallback(() => {
    flushRunningClock();
    stopWatching();
  }, [stopWatching]);

  const distanceKm = trackDistanceKm(points);
  const paceSecPerKm = distanceKm > 0 ? elapsedSeconds / distanceKm : null;

  const state: LiveRunState = { status, points, distanceKm, elapsedSeconds, paceSecPerKm };

  return { ...state, start, pause, resume, finish, requestPermission };
}
