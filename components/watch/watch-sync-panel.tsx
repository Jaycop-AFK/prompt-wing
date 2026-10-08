import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { MockWatchDevice, MockWatchMetrics } from '@/services/mock-watch';

export function WatchSyncPanel({ device, metrics }: { device: MockWatchDevice; metrics: MockWatchMetrics }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.panel, { backgroundColor: colors.brandSoft, borderColor: colors.brand }]}>
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: colors.brand }]}>
          <Ionicons name="watch-outline" size={18} color={colors.onBrand} />
        </View>
        <View style={styles.headerCopy}>
          <AppText variant="small" weight="semibold">ซิงก์จาก {device.name}</AppText>
          <View style={styles.liveRow}>
            <View style={[styles.liveDot, { backgroundColor: colors.clearGreen }]} />
            <AppText variant="caption" color={colors.brandStrong}>ข้อมูล Demo แบบสด</AppText>
          </View>
        </View>
        <AppText variant="caption" tone="faint">แบต {metrics.batteryPercent}%</AppText>
      </View>
      <View style={styles.metrics}>
        <Metric icon="heart" label="ชีพจร" value={`${metrics.heartRateBpm} bpm`} accent={colors.clearRed} />
        <Metric icon="footsteps-outline" label="cadence" value={`${metrics.cadenceSpm} spm`} />
        <Metric icon="walk-outline" label="ก้าว" value={`${metrics.steps}`} />
        <Metric icon="water-outline" label="SpO₂" value={`${metrics.spo2Percent}%`} />
        <Metric icon="flame-outline" label="แคลอรีจากนาฬิกา" value={`${metrics.caloriesKcal} kcal`} />
        <Metric icon="battery-half-outline" label="แบตเตอรี่" value={`${metrics.batteryPercent}%`} />
      </View>
    </View>
  );
}

function Metric({ icon, label, value, accent }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; accent?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={15} color={accent ?? colors.brandStrong} />
      <View>
        <AppText variant="caption" tone="faint">{label}</AppText>
        <AppText variant="small" weight="bold" color={accent ?? colors.text}>{value}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md, gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.sm },
  metric: { width: '33.333%', minWidth: 92, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
