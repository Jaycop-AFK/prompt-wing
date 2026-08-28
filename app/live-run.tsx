import { Ionicons } from '@expo/vector-icons';
import * as KeepAwake from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { formatCadence, formatDistance, formatDuration, formatPace } from '@/components/format';
import { buildSessionTarget } from '@/components/session-target/copy';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SummaryStat } from '@/components/ui/summary-stat';
import { AppText } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';
import { caloriesFromDistance, describeSessionTarget, type SessionTarget } from '@/core/coach';
import { useCadenceSensor } from '@/hooks/use-cadence-sensor';
import { useProfile } from '@/hooks/use-profile';
import { useTheme } from '@/hooks/use-theme';
import { useLiveRunTracker } from '@/hooks/use-live-run-tracker';
import { evaluateSessionFormScore } from '@/services/form-samples';
import { computeSplits } from '@/services/geo';
import { saveSession } from '@/storage/session-storage';

const HOLD_TO_UNLOCK_MS = 900;
const MAP_DELTA = 0.006;

export default function LiveRunScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ targetKind?: string; targetMagnitude?: string }>();
  const tracker = useLiveRunTracker();
  const { profile } = useProfile();

  const [locked, setLocked] = useState(false);
  const [holding, setHolding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mockHeartRate, setMockHeartRate] = useState(140);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const target: SessionTarget | null =
    params.targetKind && params.targetMagnitude
      ? buildSessionTarget(params.targetKind as SessionTarget['kind'], Number(params.targetMagnitude))
      : null;

  // สถานะที่ใช้ซ้ำหลายจุดของจอนี้ รวมไว้ที่เดียวแทนการเทียบ tracker.status ตรง ๆ กระจายทั่วไฟล์
  // เพิ่มสถานะใหม่ในอนาคตจะได้แก้น้อยจุดกว่า
  const isTracking = tracker.status === 'running' || tracker.status === 'paused';
  const isRunning = tracker.status === 'running';

  // ติดตามเฉพาะตอนวิ่งจริง หยุดตอนหยุดชั่วคราวเหมือนที่ GPS หยุด ประหยัดแบตเตอรี่และเลี่ยงนับก้าว
  // ปลอมตอนยืนนิ่ง ดูข้อจำกัดเรื่องความแม่นยำเต็ม ๆ ใน hooks/use-cadence-sensor.ts จบการวิ่งแล้วจอนี้
  // จะ navigate ออกไปเสมอ (ดู handleFinish) ทำให้ effect ของ hook นี้ถูกล้างไปเองตอน unmount
  // ไม่ต้องกันเป็นพิเศษระหว่างช่วงกำลังบันทึกสั้น ๆ ก่อนหน้านั้น
  const cadence = useCadenceSensor(isRunning);
  const cadenceValue =
    cadence.status === 'unavailable'
      ? 'ไม่มีเซนเซอร์'
      : cadence.cadenceSpm === null
        ? '—'
        : formatCadence(cadence.cadenceSpm);

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

  // ชีพจรตัวอย่างขยับเบา ๆ ทุกครั้งที่นาฬิกาเดิน ให้ดูมีชีวิตแทนที่จะเป็นเลขนิ่งตายตัว
  // ยังคงเป็นข้อมูลจำลองอยู่ดี มือถือเปล่าวัดชีพจรจริงไม่ได้ ดู ADR 0002
  useEffect(() => {
    if (!isRunning) return;
    setMockHeartRate((hr) => Math.min(165, Math.max(120, hr + Math.round((Math.random() - 0.5) * 6))));
  }, [tracker.elapsedSeconds, isRunning]);

  const handleFinish = () => {
    Alert.alert('จบการวิ่ง?', 'ยืนยันเพื่อสิ้นสุดการวิ่งครั้งนี้', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'จบการวิ่ง',
        style: 'destructive',
        onPress: async () => {
          // ใช้ค่าที่ finish() คืนมาตรง ๆ ไม่ใช่ tracker.elapsedSeconds เพราะ flushRunningClock
          // ภายในอัปเดต state แบบ async ยังไม่เห็นผลใน closure นี้ทัน อ่านต่อจาก state จะได้ค่าที่
          // ค้างช้ากว่าความจริงได้ถึงหนึ่งวินาที ซึ่งจะถูกบันทึกลงเครื่องถาวรผิดไปเลย
          const elapsedSeconds = tracker.finish();
          setSaving(true);

          try {
            const distanceKm = tracker.distanceKm;
            const id = await saveSession({
              finishedAt: Date.now(),
              distanceKm,
              elapsedSeconds,
              paceSecPerKm: distanceKm > 0 ? elapsedSeconds / distanceKm : null,
              calories: caloriesFromDistance(distanceKm, profile.weightKg),
              formScore: evaluateSessionFormScore(tracker.points, cadence.samples),
              splits: computeSplits(tracker.points),
              route: tracker.points,
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

  useEffect(() => cancelHold, []);

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

  const latest = tracker.points[tracker.points.length - 1] ?? null;

  return (
    <Screen title="วิ่ง" scroll={false}>
      <View style={styles.body}>
        {!isTracking ? (
          <Card background={colors.surfaceAlt}>
            <AppText variant="small" tone="muted">
              ต้องเปิดหน้าจอค้างไว้ตลอดการวิ่ง เพราะแอปนี้ยังไม่รองรับการเก็บตำแหน่งเมื่อปิดหน้าจอ
              ถ้าหน้าจอดับ การเก็บระยะทางจะหยุดจนกว่าจะเปิดหน้าจอกลับมา
            </AppText>
          </Card>
        ) : (
          <View style={styles.mapWrap}>
            <MapView
              style={styles.map}
              region={
                latest
                  ? {
                      latitude: latest.latitude,
                      longitude: latest.longitude,
                      latitudeDelta: MAP_DELTA,
                      longitudeDelta: MAP_DELTA,
                    }
                  : undefined
              }>
              {tracker.points.length > 1 ? (
                <Polyline coordinates={tracker.points} strokeColor={colors.brand} strokeWidth={4} />
              ) : null}
              {latest ? <Marker coordinate={latest} pinColor={colors.brand} /> : null}
            </MapView>
          </View>
        )}

        <AppText variant="display" weight="bold" align="center">
          {formatDuration(tracker.elapsedSeconds)}
        </AppText>

        {target ? (
          <AppText variant="small" tone="muted" align="center">
            เป้าหมายรอบนี้ {describeSessionTarget(target)}
            {target.kind === 'distance' ? ` · ไปแล้ว ${formatDistance(tracker.distanceKm)}` : ''}
          </AppText>
        ) : null}

        <View style={styles.statsRow}>
          <SummaryStat label="ระยะทาง" value={formatDistance(tracker.distanceKm)} />
          <SummaryStat
            label="pace เฉลี่ย"
            value={tracker.paceSecPerKm === null ? '—' : `${formatPace(tracker.paceSecPerKm)} /กม.`}
          />
        </View>
        <View style={styles.statsRow}>
          <SummaryStat label="ชีพจร (ตัวอย่าง)" value={`${mockHeartRate} bpm`} />
          <SummaryStat label="cadence (ประมาณ)" value={cadenceValue} />
        </View>

        {!isTracking ? (
          <Button label="เริ่มวิ่ง" onPress={() => tracker.start()} />
        ) : (
          <View style={styles.controls}>
            <Pressable
              onPress={() => setLocked(true)}
              style={[styles.controlButton, { backgroundColor: colors.surfaceAlt }]}
              accessibilityLabel="ล็อกหน้าจอ">
              <Ionicons name="lock-closed-outline" size={22} color={colors.text} />
            </Pressable>

            <Pressable
              onPress={() => (isRunning ? tracker.pause() : tracker.resume())}
              style={[styles.controlButtonLarge, { backgroundColor: colors.brand }]}>
              <Ionicons name={isRunning ? 'pause' : 'play'} size={30} color={colors.onBrand} />
            </Pressable>

            <Pressable
              onPress={handleFinish}
              style={[styles.controlButton, { backgroundColor: colors.surfaceAlt }]}
              accessibilityLabel="จบการวิ่ง">
              <Ionicons name="stop" size={22} color={colors.text} />
            </Pressable>
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  body: { flex: 1, padding: spacing.lg, gap: spacing.md },
  mapWrap: { height: 200, borderRadius: radius.lg, overflow: 'hidden' },
  map: { flex: 1 },
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
