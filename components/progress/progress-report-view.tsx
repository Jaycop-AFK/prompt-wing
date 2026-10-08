import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { formatDistance } from '@/components/format';
import { DistanceChart } from '@/components/history/distance-chart';
import { insightCopy, paceOrDash, type InsightTone } from '@/components/progress/copy';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { REPORT_WINDOW_DAYS, type PeriodStats, type ProgressReport } from '@/services/progress-report';

const TONE_ICON: Record<InsightTone, keyof typeof Ionicons.glyphMap> = {
  positive: 'trending-up',
  caution: 'alert-circle-outline',
  tip: 'bulb-outline',
};

interface Row {
  label: string;
  recent: string;
  previous: string;
  /** ทิศที่ถือว่าดีขึ้น 1 คือค่ามากกว่าดีกว่า -1 คือค่าน้อยกว่าดีกว่า เช่น pace */
  better: 1 | -1;
  recentValue: number | null;
  previousValue: number | null;
}

function comparisonRows(recent: PeriodStats, previous: PeriodStats): Row[] {
  return [
    {
      label: 'ระยะรวม',
      recent: formatDistance(recent.distanceKm),
      previous: formatDistance(previous.distanceKm),
      better: 1,
      recentValue: recent.distanceKm,
      previousValue: previous.distanceKm,
    },
    {
      label: 'จำนวนครั้ง',
      recent: `${recent.runs} ครั้ง`,
      previous: `${previous.runs} ครั้ง`,
      better: 1,
      recentValue: recent.runs,
      previousValue: previous.runs,
    },
    {
      label: 'วันที่วิ่ง',
      recent: `${recent.activeDays} วัน`,
      previous: `${previous.activeDays} วัน`,
      better: 1,
      recentValue: recent.activeDays,
      previousValue: previous.activeDays,
    },
    {
      label: 'pace เฉลี่ย',
      recent: paceOrDash(recent.paceSecPerKm),
      previous: paceOrDash(previous.paceSecPerKm),
      better: -1,
      recentValue: recent.paceSecPerKm,
      previousValue: previous.paceSecPerKm,
    },
    {
      label: 'ไกลสุด',
      recent: formatDistance(recent.longestRunKm),
      previous: formatDistance(previous.longestRunKm),
      better: 1,
      recentValue: recent.longestRunKm,
      previousValue: previous.longestRunKm,
    },
  ];
}

/** ค่าล่าสุดดีขึ้นหรือแย่ลงจากช่วงก่อนหน้า null เมื่อเทียบไม่ได้หรือเท่าเดิม */
function changeDirection(row: Row): 'better' | 'worse' | null {
  if (row.recentValue === null || row.previousValue === null) return null;
  if (row.recentValue === row.previousValue) return null;
  return (row.recentValue - row.previousValue) * row.better > 0 ? 'better' : 'worse';
}

/** เนื้อหาของรายงานพัฒนาการ แยกจากจอที่จัดการโหลดข้อมูลและการล็อกฟีเจอร์ */
export function ProgressReportView({
  report,
  onOpenHistory,
}: {
  report: ProgressReport;
  onOpenHistory: () => void;
}) {
  const { colors } = useTheme();

  return (
    <>
      <Card>
        <AppText variant="heading" weight="bold">
          คำแนะนำจากการวิ่งของคุณ
        </AppText>
        {report.insights.length === 0 ? (
          <AppText tone="muted">ช่วงนี้การวิ่งของคุณสม่ำเสมอ ยังไม่มีเรื่องที่ต้องปรับเป็นพิเศษ</AppText>
        ) : (
          report.insights.map((insight) => {
            const copy = insightCopy(insight);
            const tint =
              copy.tone === 'positive'
                ? { fg: colors.clearGreen, bg: colors.clearGreenSoft }
                : copy.tone === 'caution'
                  ? { fg: colors.clearYellow, bg: colors.clearYellowSoft }
                  : { fg: colors.brandStrong, bg: colors.brandSoft };
            return (
              <View key={insight.kind} style={[styles.insight, { backgroundColor: tint.bg }]}>
                <Ionicons name={TONE_ICON[copy.tone]} size={22} color={tint.fg} />
                <View style={styles.insightCopy}>
                  <AppText variant="body" weight="semibold">
                    {copy.title}
                  </AppText>
                  <AppText variant="small" tone="muted">
                    {copy.detail}
                  </AppText>
                </View>
              </View>
            );
          })
        )}
        <AppText variant="caption" tone="faint">
          คำแนะนำการวิ่งทั่วไปจากตัวเลขในประวัติ ไม่ใช่การวินิจฉัยทางการแพทย์
        </AppText>
      </Card>

      <Card>
        <AppText variant="heading" weight="bold">
          ระยะรายสัปดาห์
        </AppText>
        <AppText variant="caption" tone="faint">
          แต่ละแท่งคือ 7 วัน ป้ายใต้แท่งคือวันแรกของช่วง แท่งขวาสุดคือ 7 วันล่าสุด
        </AppText>
        <DistanceChart buckets={report.weeks} />
        <View style={styles.weekCompare}>
          <AppText variant="small" tone="muted">
            7 วันล่าสุด {formatDistance(report.thisWeek.distanceKm)}
          </AppText>
          <AppText variant="small" tone="muted">
            7 วันก่อนหน้า {formatDistance(report.lastWeek.distanceKm)}
          </AppText>
        </View>
      </Card>

      <Card>
        <AppText variant="heading" weight="bold">
          {REPORT_WINDOW_DAYS} วันล่าสุด เทียบช่วงก่อนหน้า
        </AppText>
        <View style={[styles.tableHeader, { borderColor: colors.border }]}>
          <View style={styles.labelCell} />
          <AppText variant="caption" weight="semibold" style={styles.valueCell} align="right">
            {REPORT_WINDOW_DAYS} วันล่าสุด
          </AppText>
          <AppText variant="caption" tone="muted" style={styles.valueCell} align="right">
            ก่อนหน้า
          </AppText>
        </View>
        {comparisonRows(report.recent, report.previous).map((row) => {
          const change = changeDirection(row);
          return (
            <View key={row.label} style={styles.tableRow}>
              <AppText variant="small" tone="muted" style={styles.labelCell}>
                {row.label}
              </AppText>
              <View style={[styles.valueCell, styles.recentCell]}>
                {change === null ? null : (
                  <Ionicons
                    name={change === 'better' ? 'caret-up' : 'caret-down'}
                    size={12}
                    color={change === 'better' ? colors.clearGreen : colors.textFaint}
                    accessibilityLabel={change === 'better' ? 'ดีขึ้น' : 'น้อยลง'}
                  />
                )}
                <AppText variant="small" weight="semibold" align="right">
                  {row.recent}
                </AppText>
              </View>
              <AppText variant="small" tone="muted" style={styles.valueCell} align="right">
                {row.previous}
              </AppText>
            </View>
          );
        })}
        {report.typicalPaceSecPerKm !== null ? (
          <AppText variant="caption" tone="faint">
            pace ปกติของคุณราว {paceOrDash(report.typicalPaceSecPerKm)} (มัธยฐานจากการวิ่งล่าสุด)
            วันวิ่งเบาช้ากว่านี้ได้
          </AppText>
        ) : null}
      </Card>

      <Card>
        <AppText variant="heading" weight="bold">
          ฟอร์มการวิ่ง {REPORT_WINDOW_DAYS} วันล่าสุด
        </AppText>
        {report.form.rated === 0 ? (
          <AppText tone="muted">ยังไม่มีการวิ่งที่ยาวพอจะประเมินฟอร์มในช่วงนี้</AppText>
        ) : (
          <>
            <AppText variant="body">
              ประเมินได้ {report.form.rated} ครั้ง · ฟอร์มดี {report.form.good} ครั้ง
            </AppText>
            <AppText variant="small" tone="muted">
              cadence ตกช่วงท้าย {report.form.cadenceDropped} ครั้ง · pace ตกช่วงท้าย{' '}
              {report.form.paceDropped} ครั้ง
            </AppText>
          </>
        )}
        <Button label="ดูประวัติการวิ่งทั้งหมด" onPress={onOpenHistory} variant="secondary" />
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  insight: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  insightCopy: { flex: 1, gap: 2 },
  weekCompare: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm },
  tableHeader: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: spacing.xs },
  tableRow: { flexDirection: 'row', alignItems: 'center' },
  labelCell: { flex: 1.1 },
  valueCell: { flex: 1 },
  recentCell: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
});
