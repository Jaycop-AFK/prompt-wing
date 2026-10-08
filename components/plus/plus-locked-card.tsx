import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { MOCK_BILLING_NOTE, plusFeature, priceLabel, type PlusFeatureId } from '@/components/plus/copy';
import { PlusBadge } from '@/components/plus/plus-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/text';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PAID_PLANS } from '@/services/subscription';

/**
 * การ์ดแทนฟีเจอร์ Plus สำหรับผู้ใช้แพ็กเกจฟรี
 *
 * บอกว่าฟีเจอร์นี้ทำอะไรให้ได้ก่อนชวนสมัคร ไม่ใช่แค่แม่กุญแจเปล่า ๆ ผู้ใช้ต้องตัดสินใจได้ว่าคุ้มหรือไม่
 */
export function PlusLockedCard({ feature, children }: { feature: PlusFeatureId; children?: ReactNode }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { icon, title, description } = plusFeature(feature);

  return (
    <Card background={colors.brandSoft}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.surface }]}>
          <Ionicons name={icon} size={22} color={colors.brandStrong} />
        </View>
        <View style={styles.badges}>
          <PlusBadge />
          <Ionicons name="lock-closed" size={16} color={colors.brandStrong} accessibilityLabel="ล็อกอยู่" />
        </View>
      </View>

      <AppText variant="heading" weight="bold">
        {title}
      </AppText>
      <AppText variant="small" tone="muted">
        {description}
      </AppText>
      {children}

      <Button label="ดูแพ็กเกจพร้อมวิ่ง Plus" onPress={() => router.push('/subscription')} />
      <AppText variant="caption" tone="muted" align="center">
        เริ่ม {priceLabel(PAID_PLANS.plusMonthly)} หรือ {priceLabel(PAID_PLANS.plusYearly)} · {MOCK_BILLING_NOTE}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  badges: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
