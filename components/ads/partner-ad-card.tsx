import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { partnerAdFor, type PartnerAdPlacement } from '@/components/ads/copy';
import { Card } from '@/components/ui/card';
import { MockBadge } from '@/components/ui/mock-badge';
import { AppText } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';
import { useSubscription } from '@/hooks/use-subscription';
import { useTheme } from '@/hooks/use-theme';

/**
 * พื้นที่โฆษณาพาร์ทเนอร์ของแพ็กเกจฟรี ผู้ใช้ Plus ไม่เห็นการ์ดนี้เลย
 *
 * วางได้เฉพาะหน้าแรกกับหน้าชุมชน ห้ามวางในหน้าวิ่ง วอร์มอัพ หรือติดกับคำเตือนความเสี่ยง ตามหลักใน
 * docs/business-model.md และต้องมีป้าย "โฆษณา" ชัดเจนเสมอ ไม่ให้ดูเหมือนรีวิวหรือคำแนะนำของแอป
 */
export function PartnerAdCard({ placement }: { placement: PartnerAdPlacement }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { isPlus } = useSubscription();

  if (isPlus) return null;

  const ad = partnerAdFor(placement, Date.now());

  return (
    <Card accessibilityLabel={`โฆษณา ${ad.category} ${ad.title}`}>
      <View style={styles.header}>
        <View style={[styles.adLabel, { borderColor: colors.textMuted }]}>
          <AppText variant="caption" weight="bold" tone="muted">
            โฆษณา
          </AppText>
        </View>
        <AppText variant="caption" tone="muted" style={styles.category}>
          {ad.category}
        </AppText>
        <MockBadge label="พาร์ทเนอร์ตัวอย่าง" />
      </View>

      <View style={styles.body}>
        <View style={[styles.icon, { backgroundColor: colors.surfaceAlt }]}>
          <Ionicons name={ad.icon} size={26} color={colors.textMuted} />
        </View>
        <View style={styles.copy}>
          <AppText variant="body" weight="semibold">
            {ad.title}
          </AppText>
          <AppText variant="small" tone="muted">
            {ad.body}
          </AppText>
        </View>
      </View>

      <Pressable
        onPress={() => router.push('/subscription')}
        accessibilityRole="button"
        style={({ pressed }) => [styles.hide, pressed && styles.pressed]}>
        <Ionicons name="eye-off-outline" size={14} color={colors.brandStrong} />
        <AppText variant="caption" weight="semibold" color={colors.brandStrong}>
          ซ่อนโฆษณาด้วยพร้อมวิ่ง Plus
        </AppText>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  adLabel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs + 2,
  },
  category: { flex: 1 },
  body: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 2 },
  hide: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start' },
  pressed: { opacity: 0.7 },
});
