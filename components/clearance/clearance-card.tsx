import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { levelColors } from '@/components/clearance/colors';
import { clearWindowSentence, LEVEL_LABEL, reasonSentence } from '@/components/clearance/copy';
import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';
import { hourAt, type RunClearance } from '@/core/coach';
import { useTheme } from '@/hooks/use-theme';
import type { TodayConditions } from '@/services/conditions';

interface Props {
  clearance: RunClearance;
  conditions: TodayConditions;
  now: number;
  onPress: () => void;
}

/** ใบอนุญาตวิ่งวันนี้ ย่อให้เหลือสิ่งที่ตัดสินใจได้ในสามวินาที */
export function ClearanceCard({ clearance, conditions, now, onPress }: Props) {
  const { colors } = useTheme();
  const level = levelColors(colors, clearance.level);
  const reason = reasonSentence(clearance.decidedBy);

  return (
    <Card onPress={onPress} accessibilityLabel={`ใบอนุญาตวิ่งวันนี้ ${LEVEL_LABEL[clearance.level]}`}>
      <View style={styles.headerRow}>
        <View style={[styles.dot, { backgroundColor: level.foreground }]} />
        <AppText variant="heading" weight="bold" color={level.foreground} style={styles.flex}>
          {LEVEL_LABEL[clearance.level]}
        </AppText>
        <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
      </View>

      <AppText variant="body" weight="medium">
        {clearWindowSentence(clearance.clearWindow, now)}
      </AppText>

      {reason ? (
        <View style={[styles.reason, { backgroundColor: level.background }]}>
          <AppText variant="small" weight="medium" color={level.foreground}>
            เพราะ {reason}
          </AppText>
        </View>
      ) : null}

      <View style={[styles.stats, { borderTopColor: colors.border }]}>
        <Stat label="รู้สึกเหมือน" value={formatApparent(currentApparent(conditions, now))} />
        <Stat
          label="PM2.5"
          value={conditions.pm25Now === null ? 'ไม่มีข้อมูล' : `${Math.round(conditions.pm25Now)}`}
        />
        <Stat
          label="ความชื้น"
          value={conditions.humidityNow === null ? 'ไม่ทราบ' : `${Math.round(conditions.humidityNow)}%`}
        />
      </View>
    </Card>
  );
}

/** อุณหภูมิที่รู้สึกได้ของชั่วโมงนี้ null เมื่อไม่มีข้อมูลของชั่วโมงนี้ */
function currentApparent(conditions: TodayConditions, now: number): number | null {
  return hourAt(conditions.hours, now)?.apparentTemperature ?? null;
}

const formatApparent = (value: number | null) =>
  value === null ? 'ไม่ทราบ' : `${Math.round(value)}°`;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      <AppText variant="body" weight="semibold">
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: radius.pill },
  reason: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  stats: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
  },
  stat: { flex: 1, gap: 2 },
});
