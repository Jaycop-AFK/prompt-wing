import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { formatPace } from '@/components/format';
import { formatEventDate, formatFeeThb } from '@/components/community/copy';
import { Card } from '@/components/ui/card';
import { MockBadge } from '@/components/ui/mock-badge';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { MOCK_RACE_EVENTS, MOCK_RUN_BUDDIES } from '@/services/mock-community';

const SORTED_EVENTS = [...MOCK_RACE_EVENTS].sort((a, b) => a.dateAt - b.dateAt);

export default function CommunityScreen() {
  const { colors } = useTheme();

  return (
    <Screen title="ชุมชน" headerRight={<MockBadge />}>
      <View style={styles.section}>
        <AppText variant="heading" weight="semibold">
          ปฏิทินงานวิ่ง
        </AppText>
        {SORTED_EVENTS.map((event) => (
          <Card key={event.id}>
            <AppText variant="body" weight="semibold">
              {event.name}
            </AppText>
            <View style={styles.metaRow}>
              <AppText variant="small" tone="muted">
                {formatEventDate(event.dateAt)} · {event.province}
              </AppText>
            </View>
            <View style={styles.metaRow}>
              <AppText variant="small" tone="muted">
                {event.distanceKm} กม.
              </AppText>
              <AppText variant="small" weight="semibold">
                {formatFeeThb(event.feeThb)}
              </AppText>
            </View>
          </Card>
        ))}
      </View>

      <View style={styles.section}>
        <AppText variant="heading" weight="semibold">
          หาเพื่อนวิ่ง
        </AppText>
        <AppText variant="caption" tone="faint">
          การยืนยันตัวตนของผู้ใช้ยังไม่รองรับในเวอร์ชันนี้ แสดงเป็นป้ายสถานะจำลองเท่านั้น
        </AppText>
        {MOCK_RUN_BUDDIES.map((buddy) => (
          <Card key={buddy.id}>
            <View style={styles.metaRow}>
              <AppText variant="body" weight="semibold">
                {buddy.name}
              </AppText>
              <View
                style={[
                  styles.verifiedBadge,
                  { backgroundColor: buddy.verified ? colors.brandSoft : colors.surfaceAlt },
                ]}>
                <Ionicons
                  name={buddy.verified ? 'checkmark-circle' : 'help-circle-outline'}
                  size={13}
                  color={buddy.verified ? colors.brandStrong : colors.textMuted}
                />
                <AppText
                  variant="caption"
                  weight="medium"
                  color={buddy.verified ? colors.brandStrong : colors.textMuted}>
                  {buddy.verified ? 'ยืนยันตัวตนแล้ว' : 'ยังไม่ยืนยันตัวตน'}
                </AppText>
              </View>
            </View>
            <AppText variant="small" tone="muted">
              pace {formatPace(buddy.paceSecPerKm)} /กม. · วิ่ง {buddy.runTime}
            </AppText>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
});
