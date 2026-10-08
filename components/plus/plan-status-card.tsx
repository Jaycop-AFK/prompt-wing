import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatThaiDate } from '@/components/format';
import { PLAN_NAME, PLUS_FEATURES, priceLabel } from '@/components/plus/copy';
import { PlusBadge } from '@/components/plus/plus-badge';
import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';
import { useSubscription } from '@/hooks/use-subscription';
import { useTheme } from '@/hooks/use-theme';
import { isPaidPlan, nextRenewalAt, PAID_PLANS } from '@/services/subscription';

/**
 * แพ็กเกจปัจจุบันของบัญชีบนหน้าโปรไฟล์ แตะเพื่อไปสมัครหรือเปลี่ยนแพ็กเกจ
 * พร้อมทางลัดไปฟีเจอร์ Plus ที่มีจอของตัวเอง ผู้ใช้ฟรีเห็นแม่กุญแจแต่ยังกดเข้าไปดูได้ว่าฟีเจอร์ทำอะไร
 */
export function PlanStatusCard() {
  const router = useRouter();
  const { colors } = useTheme();
  const { subscription, isPlus } = useSubscription();
  const renewal = nextRenewalAt(subscription, Date.now());

  const detail = isPaidPlan(subscription.plan)
    ? `${priceLabel(PAID_PLANS[subscription.plan])}${renewal === null ? '' : ` · ต่ออายุ ${formatThaiDate(renewal)}`}`
    : 'ใช้ฟรีได้ไม่จำกัดเวลา อัปเกรดเพื่อปลดล็อกแผนซ้อม รายงาน และตัดโฆษณา';

  const linkedFeatures = PLUS_FEATURES.filter((feature) => feature.href !== null && feature.id !== 'forecastSchedule');

  return (
    <Card background={isPlus ? colors.brandSoft : colors.surface}>
      <Pressable
        onPress={() => router.push('/subscription')}
        accessibilityRole="button"
        accessibilityLabel={`แพ็กเกจของคุณ ${PLAN_NAME[subscription.plan]} แตะเพื่อจัดการแพ็กเกจ`}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}>
        <Image
          source={require('@/assets/images/prompt-wing-plus-icon.png')}
          style={styles.icon}
          contentFit="cover"
          accessibilityIgnoresInvertColors
        />
        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <AppText variant="caption" tone="muted">
              แพ็กเกจของคุณ
            </AppText>
            <PlusBadge label={isPlus ? 'PLUS' : 'FREE'} muted={!isPlus} />
          </View>
          <AppText variant="heading" weight="bold">
            {PLAN_NAME[subscription.plan]}
          </AppText>
          <AppText variant="small" tone="muted">
            {detail}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Pressable>

      {isPlus ? null : (
        <Pressable
          onPress={() => router.push('/subscription')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.upgrade, { backgroundColor: colors.brand }, pressed && styles.pressed]}>
          <AppText variant="small" weight="semibold" color={colors.onBrand}>
            สมัคร Plus · เริ่ม {priceLabel(PAID_PLANS.plusMonthly)}
          </AppText>
        </Pressable>
      )}

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {linkedFeatures.map((feature) => (
        <Pressable
          key={feature.id}
          onPress={() => feature.href && router.push(feature.href)}
          accessibilityRole="button"
          accessibilityLabel={`${feature.title}${isPlus ? '' : ' ล็อกอยู่ ต้องใช้ Plus'}`}
          style={({ pressed }) => [styles.featureRow, pressed && styles.pressed]}>
          <Ionicons name={feature.icon} size={20} color={colors.brandStrong} />
          <AppText variant="body" weight="semibold" style={styles.featureTitle}>
            {feature.title}
          </AppText>
          <Ionicons
            name={isPlus ? 'chevron-forward' : 'lock-closed'}
            size={16}
            color={isPlus ? colors.textMuted : colors.textFaint}
          />
        </Pressable>
      ))}
      <View style={styles.featureRow}>
        <Ionicons name="eye-off-outline" size={20} color={colors.brandStrong} />
        <AppText variant="body" weight="semibold" style={styles.featureTitle}>
          ไม่มีโฆษณา
        </AppText>
        <AppText variant="caption" weight="semibold" color={isPlus ? colors.brandStrong : colors.textFaint}>
          {isPlus ? 'เปิดอยู่' : 'เฉพาะ Plus'}
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 52, height: 52, borderRadius: radius.md },
  copy: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  upgrade: { alignItems: 'center', borderRadius: radius.pill, paddingVertical: spacing.sm },
  divider: { height: StyleSheet.hairlineWidth },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 36 },
  featureTitle: { flex: 1 },
  pressed: { opacity: 0.7 },
});
