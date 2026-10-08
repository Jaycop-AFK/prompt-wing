import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { formatDistance, formatDuration, formatPace } from '@/components/format';
import { DistanceChart } from '@/components/history/distance-chart';
import { PlusBadge } from '@/components/plus/plus-badge';
import { OBJECTIVE_LABEL } from '@/components/profile/copy';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Legend } from '@/components/ui/legend';
import { Screen } from '@/components/ui/screen';
import { SummaryStat } from '@/components/ui/summary-stat';
import { AppText } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';
import { computeDailyGoal } from '@/core/coach';
import { useProfile } from '@/hooks/use-profile';
import { useTheme } from '@/hooks/use-theme';
import {
  formTrend,
  summarizeHistory,
  type FormTrendPoint,
  type HistoryRange,
} from '@/services/run-history';
import type { SessionRecord } from '@/services/session-record';
import { listSessions } from '@/storage/session-storage';

/** จำนวนครั้งล่าสุดที่เอามาดูแนวโน้มฟอร์ม ตั้งใจไม่ผูกกับช่วงที่เลือก เพราะช่วงสั้น ๆ อาจมี
 * การวิ่งครั้งเดียวซึ่งดูแนวโน้มอะไรไม่ได้เลย */
const TREND_LIMIT = 10;

const RANGE_ORDER: HistoryRange[] = ['week', 'month', 'year'];
const RANGE_LABEL: Record<HistoryRange, string> = {
  week: '7 วันล่าสุด',
  month: 'เดือนนี้',
  year: 'ปีนี้',
};

const TREND_COLOR_KEY: Record<FormTrendPoint, 'clearGreen' | 'clearYellow' | 'clearRed' | 'border'> =
  {
    good: 'clearGreen',
    cadenceDropped: 'clearRed',
    paceDropped: 'clearYellow',
    notEnoughData: 'border',
  };

/** ลำดับที่แสดงในคำอธิบายสี เรียงจากดีที่สุดไปแย่ที่สุด แล้วปิดท้ายด้วยกรณีที่ประเมินไม่ได้ */
const TREND_ORDER: FormTrendPoint[] = ['good', 'paceDropped', 'cadenceDropped', 'notEnoughData'];

const TREND_LABEL: Record<FormTrendPoint, string> = {
  good: 'ฟอร์มดี',
  cadenceDropped: 'cadence ตก',
  paceDropped: 'pace ตก',
  notEnoughData: 'ข้อมูลไม่พอ',
};

/** วันที่แบบสั้น พร้อมปี พ.ศ. สองหลัก เช่น 15/6/69 */
function formatDay(at: number): string {
  const d = new Date(at);
  return `${d.getDate()}/${d.getMonth() + 1}/${(d.getFullYear() + 543) % 100}`;
}

export default function RunHistoryScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { profile } = useProfile();

  const [range, setRange] = useState<HistoryRange>('week');
  const [sessions, setSessions] = useState<SessionRecord[] | null>(null);
  const [failed, setFailed] = useState(false);

  // ตัวโหลดตัวเดียวที่ใช้ทั้งตอนเข้าจอและตอนผู้ใช้กดลองใหม่ คืนฟังก์ชันยกเลิกให้ผู้เรียกจัดการเอง
  // เพราะตอนเข้าจอต้องยกเลิกเมื่อออกจากจอ แต่ตอนกดปุ่มไม่ต้อง
  const load = useCallback(() => {
    let cancelled = false;

    listSessions()
      .then((found) => {
        if (cancelled) return;
        setSessions(found);
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // โหลดใหม่ทุกครั้งที่กลับเข้าจอนี้ ไม่ใช่แค่ตอน mount ครั้งแรก เพราะผู้ใช้อาจวิ่งจบอีกครั้งแล้ว
  // ย้อนกลับมาดู ถ้าโหลดแค่ครั้งเดียวจะไม่เห็นการวิ่งที่เพิ่งบันทึกไป
  useFocusEffect(load);

  if (failed) {
    return (
      <Screen title="ประวัติการวิ่ง" back>
        <Card>
          <AppText variant="heading" weight="semibold">
            เปิดประวัติการวิ่งไม่สำเร็จ
          </AppText>
          <AppText variant="body" tone="muted">
            อ่านข้อมูลที่บันทึกไว้ในเครื่องไม่ได้ การวิ่งที่บันทึกไปแล้วยังอยู่ครบ ไม่ได้หายไปไหน
          </AppText>
          <Button
            label="ลองอีกครั้ง"
            onPress={() => {
              setFailed(false);
              load();
            }}
          />
        </Card>
      </Screen>
    );
  }

  if (sessions === null) {
    return (
      <Screen title="ประวัติการวิ่ง" back scroll={false}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      </Screen>
    );
  }

  if (sessions.length === 0) {
    return (
      <Screen title="ประวัติการวิ่ง" back>
        <Card>
          <AppText variant="heading" weight="semibold">
            ยังไม่มีประวัติการวิ่ง
          </AppText>
          <AppText variant="body" tone="muted">
            ประวัติจะขึ้นที่นี่เองทุกครั้งที่คุณวิ่งจบ ยังไม่ต้องตั้งค่าอะไรเพิ่ม
            ออกไปวิ่งครั้งแรกแล้วกลับมาดูได้เลย
          </AppText>
          <Button label="ไปหน้าวิ่ง" onPress={() => router.push('/(tabs)/run')} />
        </Card>
      </Screen>
    );
  }

  const now = Date.now();
  const dailyGoal = computeDailyGoal({
    objective: profile.objective,
    history: sessions.map((s) => ({ at: s.finishedAt, distanceKm: s.distanceKm })),
    now,
  });
  const summary = summarizeHistory(sessions, range, now, dailyGoal.distanceKm);
  const trend = formTrend(sessions, TREND_LIMIT);
  const goalRatio =
    summary.goalDistanceKm > 0 ? summary.totalDistanceKm / summary.goalDistanceKm : 0;

  return (
    <Screen title="ประวัติการวิ่ง" back>
      <View style={styles.rangeRow}>
        {RANGE_ORDER.map((option) => {
          const active = option === range;
          return (
            <Pressable
              key={option}
              onPress={() => setRange(option)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[
                styles.rangeChip,
                {
                  backgroundColor: active ? colors.brandSoft : colors.surfaceAlt,
                  borderColor: active ? colors.brand : colors.border,
                },
              ]}>
              <AppText
                variant="small"
                weight="semibold"
                color={active ? colors.brandStrong : colors.text}>
                {RANGE_LABEL[option]}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <Card>
        <View style={styles.statsRow}>
          <SummaryStat label="ระยะรวม" value={formatDistance(summary.totalDistanceKm)} />
          <SummaryStat label="จำนวนครั้ง" value={`${summary.sessions.length} ครั้ง`} />
        </View>

        <DistanceChart buckets={summary.buckets} />

        <View style={styles.goalRow}>
          <AppText variant="caption" tone="muted">
            เทียบเป้าหมายรายวันสะสม {formatDistance(summary.goalDistanceKm)}
          </AppText>
          <AppText variant="caption" weight="semibold" tone={goalRatio >= 1 ? 'brand' : 'muted'}>
            {Math.round(goalRatio * 100)}%
          </AppText>
        </View>
        <View style={[styles.goalTrack, { backgroundColor: colors.surfaceAlt }]}>
          <View
            style={[
              styles.goalFill,
              { backgroundColor: colors.brand, width: `${Math.min(100, goalRatio * 100)}%` },
            ]}
          />
        </View>
        <AppText variant="caption" tone="faint">
          คิดจากเป้าหมายระยะยาว {OBJECTIVE_LABEL[profile.objective]} ({formatDistance(dailyGoal.distanceKm)}{' '}
          ต่อวัน) คูณทุกวันในช่วงนี้ จึงถือว่าวิ่งทุกวันไม่มีวันพัก ตัวเลขนี้เลยสูงกว่าที่ควรตั้งจริง
          เปลี่ยนเป้าหมายระยะยาวได้ที่หน้าโปรไฟล์
        </AppText>
      </Card>

      <Card onPress={() => router.push('/progress-report')} accessibilityLabel="เปิดรายงานพัฒนาการ">
        <View style={styles.reportHeader}>
          <AppText variant="heading" weight="semibold">
            รายงานพัฒนาการ
          </AppText>
          <PlusBadge />
        </View>
        <AppText variant="small" tone="muted">
          เทียบ 4 สัปดาห์ล่าสุดกับช่วงก่อนหน้า ทั้งระยะ pace ความสม่ำเสมอ และฟอร์ม พร้อมคำแนะนำที่ทำต่อได้
        </AppText>
      </Card>

      <Card>
        <AppText variant="heading" weight="semibold">
          แนวโน้มคะแนนฟอร์มการวิ่ง
        </AppText>
        <AppText variant="caption" tone="faint">
          {TREND_LIMIT} ครั้งล่าสุดทั้งหมด ไม่ขึ้นกับช่วงที่เลือกด้านบน
        </AppText>
        {trend.points.length === 0 ? (
          <AppText variant="body" tone="muted">
            ยังไม่มีข้อมูลพอจะดูแนวโน้ม
          </AppText>
        ) : (
          <>
            <View style={styles.trendRow}>
              {trend.points.map((point, index) => (
                <View
                  key={index}
                  style={[styles.trendDot, { backgroundColor: colors[TREND_COLOR_KEY[point]] }]}
                  accessible
                  accessibilityRole="image"
                  accessibilityLabel={`ครั้งที่ ${index + 1} ${TREND_LABEL[point]}`}
                />
              ))}
            </View>
            <View style={styles.legendRow}>
              {TREND_ORDER.map((point) => (
                <Legend key={point} color={colors[TREND_COLOR_KEY[point]]} label={TREND_LABEL[point]} />
              ))}
            </View>
            <AppText variant="body" tone="muted">
              {trend.ratedCount === 0
                ? `${trend.points.length} ครั้งล่าสุดยังประเมินฟอร์มไม่ได้ ต้องวิ่งให้ยาวขึ้นและเปิดเซนเซอร์ไว้`
                : `${trend.ratedCount} ครั้งล่าสุดที่ประเมินได้ ฟอร์มดี ${trend.goodCount} ครั้ง เรียงจากเก่าไปใหม่จากซ้ายไปขวา`}
            </AppText>
            {trend.ratedCount > 0 ? (
              <AppText variant="caption" tone="faint">
                มาจาก cadence ที่วัดด้วยเซนเซอร์ในเครื่อง ซึ่งอาจคลาดเคลื่อนที่จังหวะวิ่งเร็ว
                ใช้ดูทิศทางรวม ๆ ไม่ใช่ตัดสินทีละครั้ง
              </AppText>
            ) : null}
          </>
        )}
      </Card>

      <Card>
        <AppText variant="heading" weight="semibold">
          {RANGE_LABEL[range]}
        </AppText>
        {summary.sessions.length === 0 ? (
          <AppText variant="body" tone="muted">
            ไม่มีการวิ่งในช่วงนี้ ลองเปลี่ยนไปดูช่วงที่ยาวกว่านี้
          </AppText>
        ) : (
          summary.sessions.map((item) => (
            <Pressable
              key={item.id}
              onPress={() =>
                router.push({ pathname: '/run-summary', params: { id: String(item.id) } })
              }
              accessibilityRole="button"
              accessibilityLabel={`ดูสรุปการวิ่งวันที่ ${formatDay(item.finishedAt)}`}
              style={({ pressed }) => [
                styles.sessionRow,
                { borderColor: colors.border },
                pressed && styles.pressed,
              ]}>
              <View style={styles.sessionMain}>
                <AppText variant="body" weight="semibold">
                  {formatDistance(item.distanceKm)}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {formatDay(item.finishedAt)} · {formatDuration(item.elapsedSeconds)}
                  {item.paceSecPerKm === null ? '' : ` · ${formatPace(item.paceSecPerKm)} /กม.`}
                </AppText>
              </View>
              <AppText variant="caption" tone="faint">
                ดูสรุป
              </AppText>
            </Pressable>
          ))
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  rangeRow: { flexDirection: 'row', gap: spacing.sm },
  rangeChip: {
    flex: 1,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
  },
  statsRow: { flexDirection: 'row' },
  reportHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalTrack: { height: 8, borderRadius: radius.pill, overflow: 'hidden' },
  goalFill: { height: '100%', borderRadius: radius.pill },
  trendRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  trendDot: { width: 14, height: 14, borderRadius: radius.pill },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
  },
  sessionMain: { gap: 2 },
  pressed: { opacity: 0.6 },
});
