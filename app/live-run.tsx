import { Ionicons } from '@expo/vector-icons';
import * as KeepAwake from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, View } from 'react-native';

import { formatCadence, formatDistance, formatDuration, formatPace } from '@/components/format';
import { LiveRunSheet } from '@/components/live-run/live-run-sheet';
import MapView, { Polyline, type MapViewRef } from '@/components/map-view';
import { buildSessionTarget } from '@/components/session-target/copy';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SummaryStat } from '@/components/ui/summary-stat';
import { AppText } from '@/components/ui/text';
import { WatchSyncPanel } from '@/components/watch/watch-sync-panel';
import { radius, spacing } from '@/constants/theme';
import { caloriesFromDistance, describeSessionTarget, type SessionTarget } from '@/core/coach';
import { useCadenceSensor } from '@/hooks/use-cadence-sensor';
import { useProfile } from '@/hooks/use-profile';
import { useTheme } from '@/hooks/use-theme';
import { useLiveRunTracker } from '@/hooks/use-live-run-tracker';
import { useMockWatch } from '@/hooks/use-mock-watch';
import { useVoiceCoach } from '@/hooks/use-voice-coach';
import { evaluateSessionFormScore } from '@/services/form-samples';
import { averagePaceSecPerKm, bestPaceSecPerKm, computeSplits, runSaveReadiness } from '@/services/geo';
import type { RunMode } from '@/services/session-record';
import { saveSession } from '@/storage/session-storage';

const HOLD_TO_UNLOCK_MS = 900;
const HOLD_TO_FINISH_MS = 1200;
const MAP_DELTA = 0.006;

export default function LiveRunScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{
    targetKind?: string;
    targetMagnitude?: string;
    recommendedPaceSecPerKm?: string;
    runMode?: string;
    programName?: string;
  }>();
  const tracker = useLiveRunTracker();
  const { profile } = useProfile();

  const [locked, setLocked] = useState(false);
  const [holding, setHolding] = useState(false);
  const [finishHolding, setFinishHolding] = useState(false);
  const [saving, setSaving] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const targetReachedRef = useRef(false);
  const mapRef = useRef<MapViewRef | null>(null);
  const mapReadyRef = useRef(false);
  const latest = tracker.mapCenter;
  const mapZoom =
    latest?.accuracyMeters === null || latest?.accuracyMeters === undefined
      ? 16
      : latest.accuracyMeters <= 100
        ? 17
        : latest.accuracyMeters <= 500
          ? 15
          : 12;
  const initialMapDelta = latest?.accuracyMeters && latest.accuracyMeters > 500 ? 0.08 : MAP_DELTA;

  const target: SessionTarget | null =
    params.targetKind && params.targetMagnitude
      ? buildSessionTarget(params.targetKind as SessionTarget['kind'], Number(params.targetMagnitude))
      : null;
  const runMode: RunMode =
    params.runMode === 'goal' || params.runMode === 'program' ? params.runMode : 'free';
  const currentCalories = caloriesFromDistance(tracker.distanceKm, profile.weightKg);

  // สถานะที่ใช้ซ้ำหลายจุดของจอนี้ รวมไว้ที่เดียวแทนการเทียบ tracker.status ตรง ๆ กระจายทั่วไฟล์
  // เพิ่มสถานะใหม่ในอนาคตจะได้แก้น้อยจุดกว่า
  const isTracking = tracker.status === 'running' || tracker.status === 'paused';
  const isRunning = tracker.status === 'running';
  const mockWatch = useMockWatch(isTracking ? 'run' : 'rest');

  // ติดตามเฉพาะตอนวิ่งจริง หยุดตอนหยุดชั่วคราวเหมือนที่ GPS หยุด ประหยัดแบตเตอรี่และเลี่ยงนับก้าว
  // ปลอมตอนยืนนิ่ง ดูข้อจำกัดเรื่องความแม่นยำเต็ม ๆ ใน hooks/use-cadence-sensor.ts จบการวิ่งแล้วจอนี้
  // จะ navigate ออกไปเสมอ (ดู handleFinish) ทำให้ effect ของ hook นี้ถูกล้างไปเองตอน unmount
  // ไม่ต้องกันเป็นพิเศษระหว่างช่วงกำลังบันทึกสั้น ๆ ก่อนหน้านั้น
  const cadence = useCadenceSensor(isRunning);
  const cadenceValue = mockWatch.device
    ? `${mockWatch.metrics.cadenceSpm} spm · นาฬิกา`
    : cadence.status === 'unavailable'
      ? 'ไม่มีเซนเซอร์'
      : cadence.cadenceSpm === null
        ? '—'
        : formatCadence(cadence.cadenceSpm);

  const voiceCoach = useVoiceCoach({
    isRunning,
    paceSecPerKm: tracker.paceSecPerKm,
    recommendedPaceSecPerKm: params.recommendedPaceSecPerKm ? Number(params.recommendedPaceSecPerKm) : null,
    distanceKm: tracker.distanceKm,
    elapsedSeconds: tracker.elapsedSeconds,
  });

  // กันหน้าจอดับระหว่างวิ่งหรือหยุดชั่วคราวเท่านั้น เพราะ GPS หยุดเก็บทันทีที่หน้าจอดับ
  // (ข้อจำกัดของ Expo Go ตาม ADR 0002) ไม่ต้องกันหน้าจอดับตอนยังไม่เริ่มหรือตอนดูสรุปแล้ว
  useEffect(() => {
    if (!isTracking) return;

    KeepAwake.activateKeepAwakeAsync('live-run').catch(() => {
      // เครื่องบางรุ่นอาจไม่รองรับ ก็ยังวิ่งต่อได้ตามปกติ แค่หน้าจออาจดับเองถ้าไม่แตะ
    });
    return () => {
      KeepAwake.deactivateKeepAwake('live-run');
    };
  }, [isTracking]);

  // ใช้กล้องแบบ imperative เพื่อเลื่อนตามผู้วิ่งอย่างนุ่ม การส่ง controlled region ใหม่ทุก GPS
  // callback ทำให้ native map กระชากและอาจตีกับ gesture ที่ผู้ใช้กำลังซูมหรือเลื่อนอยู่
  useEffect(() => {
    if (!latest || !isTracking || !mapReadyRef.current) return;
    mapRef.current?.animateCamera(
      { center: { latitude: latest.latitude, longitude: latest.longitude }, zoom: mapZoom },
      { duration: 700 }
    );
  }, [latest, isTracking, mapZoom]);

  useEffect(() => {
    if (!target || !isRunning || targetReachedRef.current) return;
    const reached =
      target.kind === 'distance'
        ? tracker.distanceKm >= target.km
        : target.kind === 'time'
          ? tracker.elapsedSeconds >= target.minutes * 60
          : currentCalories >= target.kcal;
    if (!reached) return;

    targetReachedRef.current = true;
    Alert.alert(
      'ถึงเป้าหมายรอบนี้แล้ว 🎯',
      `${describeSessionTarget(target)} สำเร็จแล้ว วิ่งต่อได้ตามต้องการ ระบบจะบันทึกจนกว่าคุณจะกดจบ`
    );
  }, [currentCalories, isRunning, target, tracker.distanceKm, tracker.elapsedSeconds]);

  const handleFinish = () => {
    const readiness = runSaveReadiness(
      tracker.distanceKm,
      tracker.elapsedSeconds,
      tracker.points.length
    );
    if (readiness === 'tooShort') {
      Alert.alert(
        'ยังเร็วเกินไปที่จะบันทึก',
        'วิ่งต่ออย่างน้อย 10 วินาที เพื่อไม่ให้สัญญาณ GPS ช่วงเริ่มต้นกลายเป็นสถิติผิด'
      );
      return;
    }
    if (readiness === 'waitingForGps') {
      Alert.alert(
        'กำลังรอ GPS ที่แม่นพอ',
        'วิ่งต่อจนมีระยะอย่างน้อย 30 เมตรและเห็นเส้นทางบนแผนที่ แล้วค่อยกดจบการวิ่ง'
      );
      return;
    }

    Alert.alert('จบการวิ่ง?', 'ยืนยันเพื่อสิ้นสุดการวิ่งครั้งนี้', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'จบการวิ่ง',
        style: 'destructive',
        onPress: async () => {
          // ใช้ค่าที่ finish() คืนมาตรง ๆ ไม่ใช่ tracker.elapsedSeconds เพราะ flushRunningClock
          // ภายในอัปเดต state แบบ async ยังไม่เห็นผลใน closure นี้ทัน อ่านต่อจาก state จะได้ค่าที่
          // ค้างช้ากว่าความจริงได้ถึงหนึ่งวินาที ซึ่งจะถูกบันทึกลงเครื่องถาวรผิดไปเลย
          const finishedTime = tracker.finish();
          const movingSeconds = finishedTime.movingSeconds;
          const elapsedSeconds = Math.max(movingSeconds, finishedTime.totalElapsedSeconds);
          setSaving(true);

          try {
            const distanceKm = tracker.distanceKm;
            const id = await saveSession({
              finishedAt: Date.now(),
              distanceKm,
              elapsedSeconds,
              movingSeconds,
              paceSecPerKm: averagePaceSecPerKm(distanceKm, movingSeconds),
              bestPaceSecPerKm: bestPaceSecPerKm(tracker.points),
              runMode,
              programName: runMode === 'program' ? params.programName ?? null : null,
              sessionTarget: target,
              calories: caloriesFromDistance(distanceKm, profile.weightKg),
              formScore: evaluateSessionFormScore(tracker.points, cadence.samples),
              splits: computeSplits(tracker.points),
              route: tracker.routePoints,
            });
            router.replace({ pathname: '/run-summary', params: { id: String(id) } });
          } catch {
            // การเขียนลงเครื่องต้องเกิดก่อนเสมอ (ดู ADR 0003) ถ้าล้มเหลวต้องให้ผู้ใช้ลองใหม่ได้
            // ไม่ใช่ค้างที่หน้าจอ "กำลังบันทึก" ตลอดไปโดยไม่บอกอะไรเลย
            setSaving(false);
            Alert.alert('บันทึกไม่สำเร็จ', 'ลองกดจบการวิ่งอีกครั้ง');
          }
        },
      },
    ]);
  };

  // ต้องกดค้างครบเวลาถึงจะปลดล็อก ปล่อยนิ้วก่อนครบต้องยกเลิกตัวจับเวลา ไม่งั้นแตะสั้น ๆ
  // แล้วปล่อยจะยังปลดล็อกอยู่ดีตอน 900ms ผ่านไป ซึ่งขัดกับจุดประสงค์ของการล็อกหน้าจอทั้งหมด
  const startHold = () => {
    setHolding(true);
    holdTimer.current = setTimeout(() => {
      setLocked(false);
      setHolding(false);
    }, HOLD_TO_UNLOCK_MS);
  };

  const cancelHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    setHolding(false);
  };

  const cancelFinishHold = () => {
    if (finishTimer.current) clearTimeout(finishTimer.current);
    finishTimer.current = null;
    setFinishHolding(false);
  };

  const startFinishHold = () => {
    setFinishHolding(true);
    finishTimer.current = setTimeout(() => {
      finishTimer.current = null;
      setFinishHolding(false);
      handleFinish();
    }, HOLD_TO_FINISH_MS);
  };

  useEffect(() => cancelHold, []);
  useEffect(() => cancelFinishHold, []);

  if (tracker.status === 'requesting') {
    return (
      <Screen title="วิ่ง" scroll={false}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
          <AppText variant="small" tone="muted">
            กำลังขอสิทธิ์เข้าถึงตำแหน่ง
          </AppText>
        </View>
      </Screen>
    );
  }

  if (tracker.status === 'denied') {
    return (
      <Screen title="วิ่ง" back>
        <Card>
          <AppText variant="heading" weight="semibold">
            ต้องใช้สิทธิ์เข้าถึงตำแหน่ง
          </AppText>
          <AppText variant="body" tone="muted">
            พร้อมวิ่งต้องรู้ตำแหน่งของคุณเพื่อวาดเส้นทางและวัดระยะทางระหว่างวิ่ง กรุณาเปิดสิทธิ์
            เข้าถึงตำแหน่งให้แอปในตั้งค่าเครื่อง แล้วกลับมาลองใหม่
          </AppText>
          <Button label="เปิดตั้งค่าเครื่อง" onPress={() => Linking.openSettings()} />
          <Button label="ลองอีกครั้ง" onPress={() => tracker.requestPermission()} variant="secondary" />
        </Card>
      </Screen>
    );
  }

  if (tracker.status === 'locationOff') {
    return (
      <Screen title="วิ่ง" back>
        <Card>
          <AppText variant="heading" weight="semibold">
            ต้องเปิดบริการระบุตำแหน่งของเครื่อง
          </AppText>
          <AppText variant="body" tone="muted">
            เปิด Location Services ในตั้งค่าเครื่องก่อน แล้วกลับมากดตรวจอีกครั้ง
          </AppText>
          <Button label="เปิดตั้งค่าเครื่อง" onPress={() => Linking.openSettings()} />
          <Button
            label="ตรวจอีกครั้ง"
            onPress={() => tracker.requestPermission()}
            variant="secondary"
          />
        </Card>
      </Screen>
    );
  }

  if (saving) {
    return (
      <Screen title="วิ่ง" scroll={false}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
          <AppText variant="small" tone="muted">
            กำลังบันทึกการวิ่ง
          </AppText>
        </View>
      </Screen>
    );
  }

  if (locked) {
    // จอล็อกแทนที่จอวิ่งทั้งหน้าแทนการวางซ้อนทับด้วย View ลอย เพราะ MapView บนแอนดรอยด์
    // วาดด้วย native SurfaceView ที่บางรุ่นแสดงผลทับ View ของ React Native ทุกชั้นเสมอไม่ว่า
    // ลำดับใน JSX จะเป็นอย่างไร ถ้าล็อกแค่วางทับ ปุ่มใต้แผนที่อาจยังกดโดนได้จริงบนเครื่องจริง
    // การไม่ mount MapView เลยตอนล็อกตัดปัญหานี้ทิ้งไปทั้งหมด ตัวติดตามยังทำงานต่อในพื้นหลัง
    // เหมือนเดิม เพราะสถานะอยู่ใน useLiveRunTracker ไม่ได้ขึ้นกับสิ่งที่จอนี้กำลังแสดงผล
    return (
      <Screen title="วิ่ง" scroll={false}>
        <View style={styles.lockOverlay}>
          <Ionicons name="lock-closed" size={40} color={colors.textMuted} />
          <AppText variant="body" tone="muted" align="center">
            หน้าจอถูกล็อกไว้กันการกดโดนระหว่างวิ่ง
          </AppText>

          <View style={styles.statsRow}>
            <SummaryStat label="เวลา" value={formatDuration(tracker.elapsedSeconds)} />
            <SummaryStat label="ระยะทาง" value={formatDistance(tracker.distanceKm)} />
          </View>

          <Pressable
            onPressIn={startHold}
            onPressOut={cancelHold}
            style={[
              styles.unlockButton,
              { backgroundColor: holding ? colors.brand : colors.surfaceAlt, borderColor: colors.brand },
            ]}>
            <AppText variant="small" weight="semibold" color={holding ? colors.onBrand : colors.text}>
              กดค้างเพื่อปลดล็อก
            </AppText>
          </Pressable>
        </View>
      </Screen>
    );
  }

  if (isTracking) {
    const recenterMap = () => {
      if (!latest) return;
      mapRef.current?.animateCamera(
        { center: { latitude: latest.latitude, longitude: latest.longitude }, zoom: mapZoom },
        { duration: 450 }
      );
    };

    return (
      <Screen
        title="วิ่ง"
        scroll={false}
        headerRight={
          <Pressable
            onPress={voiceCoach.toggle}
            hitSlop={12}
            accessibilityRole="switch"
            accessibilityState={{ checked: voiceCoach.enabled }}
            accessibilityLabel={voiceCoach.enabled ? 'ปิดเสียงโค้ช' : 'เปิดเสียงโค้ช'}>
            <Ionicons
              name={voiceCoach.enabled ? 'volume-high-outline' : 'volume-mute-outline'}
              size={22}
              color={colors.text}
            />
          </Pressable>
        }>
        <View style={styles.liveMapScreen}>
          {latest ? (
            <MapView
              ref={mapRef}
              style={StyleSheet.absoluteFill}
              initialRegion={{
                latitude: latest.latitude,
                longitude: latest.longitude,
                latitudeDelta: initialMapDelta,
                longitudeDelta: initialMapDelta,
              }}
              loadingEnabled
              showsUserLocation
              showsCompass
              showsMyLocationButton={false}
              toolbarEnabled={false}
              mapPadding={{ top: 70, right: 20, bottom: 220, left: 20 }}
              onMapReady={() => {
                mapReadyRef.current = true;
                recenterMap();
              }}>
              {tracker.routePoints.length > 1 ? (
                <Polyline coordinates={tracker.routePoints} strokeColor={colors.brand} strokeWidth={5} />
              ) : null}
            </MapView>
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.locatingMap, { backgroundColor: colors.surfaceAlt }]}>
              <ActivityIndicator color={colors.brand} />
              <AppText variant="small" tone="muted">กำลังจับพิกัดจากมือถือ…</AppText>
              <AppText variant="caption" tone="faint" align="center">
                เปิดตำแหน่งแบบแม่นยำ แล้วออกไปในที่โล่งเพื่อให้ GPS จับได้เร็วขึ้น
              </AppText>
            </View>
          )}

          <View pointerEvents="box-none" style={styles.mapActions}>
            <View style={[styles.roadMatchBadge, { backgroundColor: colors.surface }]}>
              <AppText variant="caption" tone="muted">
                {tracker.roadMatchStatus === 'matching'
                  ? 'กำลังจับเส้นเข้าถนน…'
                  : tracker.roadMatchStatus === 'matched'
                    ? 'ติดตามตามแนวถนนแล้ว'
                    : tracker.roadMatchStatus === 'fallback'
                      ? 'ใช้ GPS ชั่วคราว'
                      : latest
                        ? 'พบตำแหน่งแล้ว · รอเริ่มเคลื่อนที่'
                        : 'กำลังค้นหา GPS'}
              </AppText>
            </View>
            <Pressable
              onPress={recenterMap}
              disabled={!latest}
              accessibilityRole="button"
              accessibilityLabel="เลื่อนแผนที่กลับมาที่ตำแหน่งของฉัน"
              style={[styles.recenterButton, { backgroundColor: colors.surface, opacity: latest ? 1 : 0.5 }]}>
              <Ionicons name="locate" size={23} color={colors.brand} />
            </Pressable>
          </View>

          <LiveRunSheet paused={!isRunning}>
            <AppText variant="display" weight="bold" align="center">
              {formatDuration(tracker.elapsedSeconds)}
            </AppText>
            <AppText variant="caption" tone="faint" align="center">
              เวลาที่เคลื่อนไหว
              {!isRunning ? ` · เวลารวม ${formatDuration(tracker.totalElapsedSeconds)}` : ''}
            </AppText>

            <View style={styles.controlsCompact}>
              {isRunning ? (
                <Pressable
                  onPress={() => setLocked(true)}
                  style={[styles.controlButton, { backgroundColor: colors.surfaceAlt }]}
                  accessibilityRole="button"
                  accessibilityLabel="ล็อกหน้าจอ">
                  <Ionicons name="lock-closed-outline" size={22} color={colors.text} />
                </Pressable>
              ) : null}

              <Pressable
                onPress={() => (isRunning ? tracker.pause() : tracker.resume())}
                style={[styles.controlButtonLarge, { backgroundColor: colors.brand }]}
                accessibilityRole="button"
                accessibilityLabel={isRunning ? 'หยุดวิ่งชั่วคราว' : 'วิ่งต่อ'}>
                <Ionicons name={isRunning ? 'pause' : 'play'} size={30} color={colors.onBrand} />
              </Pressable>

              {!isRunning ? (
                <Pressable
                  onPressIn={startFinishHold}
                  onPressOut={cancelFinishHold}
                  style={[
                    styles.finishButton,
                    { backgroundColor: finishHolding ? colors.clearRed : colors.surfaceAlt },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="กดค้างเพื่อจบการวิ่ง">
                  <Ionicons name="stop" size={22} color={finishHolding ? colors.onBrand : colors.text} />
                  <AppText variant="caption" color={finishHolding ? colors.onBrand : colors.textMuted}>
                    กดค้างเพื่อจบ
                  </AppText>
                </Pressable>
              ) : null}
            </View>

            {target ? (
              <AppText variant="small" tone="muted" align="center">
                เป้าหมาย {describeSessionTarget(target)}
              </AppText>
            ) : null}
            <View style={styles.statsRow}>
              <SummaryStat label="ระยะทาง" value={formatDistance(tracker.distanceKm)} />
              <SummaryStat
                label="pace ปัจจุบัน"
                value={tracker.currentPaceSecPerKm === null ? '—' : `${formatPace(tracker.currentPaceSecPerKm)} /กม.`}
              />
            </View>
            <View style={styles.statsRow}>
              <SummaryStat
                label="pace เฉลี่ย"
                value={tracker.paceSecPerKm === null ? '—' : `${formatPace(tracker.paceSecPerKm)} /กม.`}
              />
              <SummaryStat
                label="ความเร็ว"
                value={tracker.currentSpeedKmh === null ? '—' : `${tracker.currentSpeedKmh.toFixed(1)} กม./ชม.`}
              />
            </View>
            <View style={styles.statsRow}>
              <SummaryStat label="แคลอรี" value={`${currentCalories} แคลอรี`} />
              <SummaryStat label="cadence (ประมาณ)" value={cadenceValue} />
            </View>
            {mockWatch.device ? <WatchSyncPanel device={mockWatch.device} metrics={mockWatch.metrics} /> : null}
          </LiveRunSheet>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      title="วิ่ง"
      scroll={false}
      headerRight={
        <Pressable
          onPress={voiceCoach.toggle}
          hitSlop={12}
          accessibilityRole="switch"
          accessibilityState={{ checked: voiceCoach.enabled }}
          accessibilityLabel={voiceCoach.enabled ? 'ปิดเสียงโค้ช' : 'เปิดเสียงโค้ช'}
          style={({ pressed }) => [pressed && styles.headerButtonPressed]}>
          <Ionicons
            name={voiceCoach.enabled ? 'volume-high-outline' : 'volume-mute-outline'}
            size={22}
            color={colors.text}
          />
        </Pressable>
      }>
      <View style={styles.body}>
        <Card background={colors.surfaceAlt}>
          <AppText variant="small" tone="muted">
            ต้องเปิดหน้าจอค้างไว้ตลอดการวิ่ง เพราะแอปนี้ยังไม่รองรับการเก็บตำแหน่งเมื่อปิดหน้าจอ
            ถ้าหน้าจอดับ การเก็บระยะทางจะหยุดจนกว่าจะเปิดหน้าจอกลับมา
          </AppText>
        </Card>
        <Button
          label={tracker.status === 'idle' ? 'เริ่มวิ่งและเปิดตำแหน่ง' : 'เริ่มวิ่ง'}
          onPress={() => tracker.start()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  headerButtonPressed: { opacity: 0.6 },
  body: { flex: 1, padding: spacing.lg, gap: spacing.md },
  liveMapScreen: { flex: 1, overflow: 'hidden' },
  locatingMap: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg },
  roadMatchBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    opacity: 0.92,
  },
  mapActions: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recenterButton: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  statsRow: { flexDirection: 'row' },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    marginTop: 'auto',
    paddingBottom: spacing.lg,
  },
  controlButton: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonLarge: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlsCompact: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  finishButton: {
    minWidth: 92,
    height: 52,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  lockOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  unlockButton: {
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
});
