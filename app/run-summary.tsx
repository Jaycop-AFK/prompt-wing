import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';

import { formatDistance, formatDuration, formatPace } from '@/components/format';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SummaryStat } from '@/components/ui/summary-stat';
import { AppText } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getSession, type SessionRecord } from '@/storage/session-storage';

const MAP_EDGE_PADDING = { top: 40, right: 40, bottom: 40, left: 40 };

type ScreenStatus = 'loading' | 'not-found' | 'ready';

/**
 * หน้าสรุปการวิ่งครั้งหนึ่ง โหลดจากฐานข้อมูลด้วย id เสมอ ไม่ว่าจะเพิ่งจบวิ่งมาสด ๆ (จาก live-run.tsx
 * ที่บันทึกแล้วค่อย navigate มาที่นี่) หรือเปิดซ้ำจากประวัติ (ตั๋ว 14) เพื่อให้มีทางเดียวที่แสดงผล
 * Session ที่บันทึกแล้ว ไม่ต้องดูแลโค้ดแสดงผลสองชุดที่อาจเพี้ยนไปจากกันได้
 */
export default function RunSummaryScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const mapRef = useRef<MapView>(null);

  const [status, setStatus] = useState<ScreenStatus>('loading');
  const [record, setRecord] = useState<SessionRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    const id = Number(params.id);

    if (!params.id || Number.isNaN(id)) {
      setStatus('not-found');
      return;
    }

    getSession(id)
      .then((found) => {
        if (cancelled) return;
        setRecord(found);
        setStatus(found ? 'ready' : 'not-found');
      })
      .catch(() => {
        if (!cancelled) setStatus('not-found');
      });

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (status === 'loading') {
    return (
      <Screen title="สรุปการวิ่ง" back scroll={false}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      </Screen>
    );
  }

  if (status === 'not-found' || !record) {
    return (
      <Screen title="สรุปการวิ่ง" back>
        <Card>
          <AppText variant="body" tone="muted">
            ไม่พบข้อมูลการวิ่งครั้งนี้
          </AppText>
          <Button label="กลับหน้าหลัก" onPress={() => router.dismissTo('/(tabs)')} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title="สรุปการวิ่ง" back>
      <Card>
        <AppText variant="title" weight="bold">
          จบการวิ่งแล้ว
        </AppText>
        <View style={styles.statsGrid}>
          <SummaryStat label="ระยะทาง" value={formatDistance(record.distanceKm)} />
          <SummaryStat label="เวลา" value={formatDuration(record.elapsedSeconds)} />
        </View>
        <View style={styles.statsGrid}>
          <SummaryStat
            label="pace เฉลี่ย"
            value={record.paceSecPerKm === null ? '—' : `${formatPace(record.paceSecPerKm)} /กม.`}
          />
          <SummaryStat label="แคลอรี (ประมาณ)" value={`${record.calories} แคลอรี`} />
        </View>
      </Card>

      {record.route.length >= 2 ? (
        <View style={styles.mapWrap}>
          <MapView
            ref={mapRef}
            style={styles.map}
            scrollEnabled={false}
            zoomEnabled={false}
            onMapReady={() =>
              mapRef.current?.fitToCoordinates(record.route, {
                edgePadding: MAP_EDGE_PADDING,
                animated: false,
              })
            }>
            <Polyline coordinates={record.route} strokeColor={colors.brand} strokeWidth={4} />
          </MapView>
        </View>
      ) : (
        <Card background={colors.surfaceAlt}>
          <AppText variant="small" tone="muted">
            ไม่มีเส้นทางบันทึกไว้สำหรับการวิ่งครั้งนี้
          </AppText>
        </Card>
      )}

      <Card background={colors.brandSoft}>
        <AppText variant="heading" weight="semibold">
          คะแนนฟอร์มการวิ่ง
        </AppText>
        <AppText variant="body">{record.formScore.summary}</AppText>
        {record.formScore.hasEnoughData ? (
          // เตือนเสมอเมื่อมีการตัดสินจริงเกิดขึ้น (ไม่ใช่แค่ตอน cadence ตก) เพราะแม้ผลจะออกมาว่า
          // ฟอร์มดี ตัวเลขที่ใช้ตัดสินก็มาจากเซนเซอร์ตัวเดียวกันที่วัดจังหวะวิ่งเร็วได้ไม่แม่นเท่ากับ
          // จังหวะช้า (ดู services/step-detector.ts) คำวินิจฉัยเรื่องเสี่ยงเจ็บใน core/coach/form-score.ts
          // สมมติว่าตัวเลขแม่น ต้องกำกับความไม่แน่นอนนี้ไว้ที่นี่แทน เพราะ core/coach ไม่ควรรู้เรื่อง
          // ข้อจำกัดของฮาร์ดแวร์เซนเซอร์เลย
          <AppText variant="caption" tone="muted">
            คำนวณจาก cadence ที่วัดได้จากเซนเซอร์ในเครื่อง ซึ่งอาจคลาดเคลื่อนที่จังหวะวิ่งเร็ว
            ใช้เป็นแนวทางคร่าว ๆ ไม่ใช่ค่าที่แม่นยำสมบูรณ์
          </AppText>
        ) : null}
      </Card>

      {record.splits.length > 0 ? (
        <Card>
          <AppText variant="heading" weight="semibold">
            สถิติรายกิโลเมตร
          </AppText>
          {record.splits.map((split) => (
            <View key={split.km} style={styles.splitRow}>
              <AppText variant="body" tone="muted">
                กม. {split.km}
              </AppText>
              <AppText variant="body" weight="semibold">
                {formatPace(split.paceSecPerKm)} /กม.
              </AppText>
            </View>
          ))}
        </Card>
      ) : null}

      <Button label="กลับหน้าหลัก" onPress={() => router.dismissTo('/(tabs)')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statsGrid: { flexDirection: 'row' },
  mapWrap: { height: 200, borderRadius: radius.lg, overflow: 'hidden' },
  map: { flex: 1 },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
});
