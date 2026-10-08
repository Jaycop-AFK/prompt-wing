import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { RotatingWatch } from '@/components/watch/rotating-watch';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MockBadge } from '@/components/ui/mock-badge';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';
import { useMockWatch } from '@/hooks/use-mock-watch';
import { useTheme } from '@/hooks/use-theme';
import {
  MOCK_WATCH_DEVICES,
  type MockActivityMode,
  type MockWatchDeviceId,
} from '@/services/mock-watch';

const MODES: { id: MockActivityMode; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { id: 'rest', label: 'พัก', icon: 'cafe-outline' },
  { id: 'walk', label: 'เดิน', icon: 'walk-outline' },
  { id: 'run', label: 'วิ่ง', icon: 'fitness-outline' },
];

export default function MockWatchScreen() {
  const { colors } = useTheme();
  const [mode, setMode] = useState<MockActivityMode>('rest');
  const watch = useMockWatch(mode);
  const [selectedId, setSelectedId] = useState<MockWatchDeviceId>('apple-demo');
  const [connecting, setConnecting] = useState(false);
  const selected = MOCK_WATCH_DEVICES.find((device) => device.id === selectedId)!;

  useEffect(() => {
    if (watch.device) setSelectedId(watch.device.id);
  }, [watch.device]);

  const connect = async () => {
    setConnecting(true);
    await new Promise((resolve) => setTimeout(resolve, 850));
    await watch.connect(selectedId);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setConnecting(false);
  };

  const disconnect = async () => {
    await watch.disconnect();
    await Haptics.selectionAsync().catch(() => {});
  };

  return (
    <Screen title="นาฬิกาจำลอง" back>
      <View style={styles.badgeRow}>
        <MockBadge label="DEMO · ไม่มี Bluetooth จริง" />
      </View>
      <AppText variant="small" tone="muted">
        เลือกอุปกรณ์แล้วกดเชื่อมต่อ แอปจะจำรุ่นที่เลือกและสร้างข้อมูลตัวอย่างเพื่อสาธิตเท่านั้น
        ไม่มีการอ่านข้อมูลสุขภาพจากนาฬิกาหรือโทรศัพท์
      </AppText>

      <RotatingWatch device={watch.device ?? selected} heartRate={watch.metrics.heartRateBpm} />

      <Card>
        <View style={styles.statusRow}>
          <View style={styles.statusLabel}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: watch.device ? colors.clearGreen : colors.textFaint },
              ]}
            />
            <View>
              <AppText variant="body" weight="semibold">
                {watch.device ? 'เชื่อมต่อแบบจำลองแล้ว' : 'ยังไม่ได้เชื่อมต่อ'}
              </AppText>
              <AppText variant="caption" tone="faint">
                {watch.device?.provider ?? 'เลือกนาฬิกาด้านล่าง'}
              </AppText>
            </View>
          </View>
          {watch.device ? (
            <Pressable onPress={disconnect} accessibilityRole="button" accessibilityLabel="ยกเลิกการเชื่อมต่อนาฬิกาจำลอง">
              <AppText variant="small" weight="semibold" color={colors.clearRed}>
                ยกเลิก
              </AppText>
            </Pressable>
          ) : null}
        </View>
      </Card>

      <View style={styles.section}>
        <AppText variant="heading" weight="semibold">
          เลือกนาฬิกา
        </AppText>
        {MOCK_WATCH_DEVICES.map((device) => {
          const active = selectedId === device.id;
          return (
            <Pressable
              key={device.id}
              onPress={() => setSelectedId(device.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              style={[
                styles.deviceRow,
                {
                  backgroundColor: active ? colors.brandSoft : colors.surface,
                  borderColor: active ? colors.brand : colors.border,
                },
              ]}>
              <View style={[styles.deviceIcon, { backgroundColor: device.accent }]}>
                <Ionicons name="watch-outline" size={22} color="#FFFFFF" />
              </View>
              <View style={styles.deviceCopy}>
                <AppText variant="body" weight="semibold">
                  {device.name}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {device.provider}
                </AppText>
              </View>
              <Ionicons
                name={active ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={active ? colors.brand : colors.textFaint}
              />
            </Pressable>
          );
        })}
        <Button
          label={connecting ? 'กำลังเชื่อมต่อแบบจำลอง…' : watch.device ? 'เปลี่ยนนาฬิกาที่เชื่อมต่อ' : 'เชื่อมต่อนาฬิกาจำลอง'}
          onPress={connect}
          disabled={connecting || watch.loading}
        />
      </View>

      {watch.device ? (
        <Card background={colors.brandSoft}>
          <View style={styles.sectionHeader}>
            <View>
              <AppText variant="heading" weight="semibold">
                ข้อมูลสดจำลอง
              </AppText>
              <AppText variant="caption" tone="muted">
                เปลี่ยนทุกวินาทีตามกิจกรรมที่เลือก
              </AppText>
            </View>
            <View style={[styles.livePill, { backgroundColor: colors.clearRedSoft }]}>
              <View style={[styles.liveDot, { backgroundColor: colors.clearRed }]} />
              <AppText variant="caption" weight="semibold" color={colors.clearRed}>
                DEMO LIVE
              </AppText>
            </View>
          </View>

          <View style={styles.modeRow}>
            {MODES.map((item) => {
              const active = item.id === mode;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setMode(item.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.modeChip,
                    { backgroundColor: active ? colors.brand : colors.surface, borderColor: colors.border },
                  ]}>
                  <Ionicons name={item.icon} size={17} color={active ? colors.onBrand : colors.text} />
                  <AppText variant="small" weight="semibold" color={active ? colors.onBrand : colors.text}>
                    {item.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.metricsGrid}>
            <Metric icon="heart" label="อัตราการเต้นหัวใจ" value={`${watch.metrics.heartRateBpm} bpm`} color={colors.clearRed} />
            <Metric icon="footsteps" label="cadence" value={`${watch.metrics.cadenceSpm} ก้าว/นาที`} color={colors.brand} />
            <Metric icon="walk" label="จำนวนก้าว" value={`${watch.metrics.steps} ก้าว`} color={colors.brandStrong} />
            <Metric icon="flame" label="พลังงาน" value={`${watch.metrics.caloriesKcal} kcal`} color={colors.clearYellow} />
            <Metric icon="water" label="ออกซิเจนในเลือด" value={`${watch.metrics.spo2Percent}%`} color="#35B7FF" />
            <Metric icon="battery-half" label="แบตเตอรี่" value={`${watch.metrics.batteryPercent}%`} color={colors.textMuted} />
          </View>
          <AppText variant="caption" tone="faint">
            ตัวเลขทั้งหมดสร้างจากสูตรจำลอง ไม่ควรใช้ตัดสินใจด้านสุขภาพหรือการแพทย์
          </AppText>
        </Card>
      ) : null}
    </Screen>
  );
}

function Metric({ icon, label, value, color }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.metric, { backgroundColor: colors.surface }]}>
      <Ionicons name={icon} size={21} color={color} />
      <AppText variant="caption" tone="muted">{label}</AppText>
      <AppText variant="body" weight="bold">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeRow: { alignItems: 'flex-start' },
  section: { gap: spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  statusLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  deviceRow: { minHeight: 72, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  deviceIcon: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  deviceCopy: { flex: 1 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.pill },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  modeRow: { flexDirection: 'row', gap: spacing.sm },
  modeChip: { flex: 1, minHeight: 42, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: { width: '48%', minHeight: 105, borderRadius: radius.md, padding: spacing.md, gap: 2 },
});
