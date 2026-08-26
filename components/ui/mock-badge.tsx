import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * ป้ายบอกว่าสิ่งที่เห็นเป็นข้อมูลจำลอง
 *
 * ทุกจอและทุกตัวเลขที่ยังไม่ได้มาจากของจริงต้องติดป้ายนี้
 * เพื่อให้ตอนนำเสนออธิบายได้ตรงไปตรงมาว่าส่วนไหนทำงานจริง
 */
export function MockBadge({ label = 'ข้อมูลจำลอง' }: { label?: string }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.badge, { backgroundColor: colors.mockBadge }]}>
      <AppText variant="caption" weight="medium" color={colors.mockBadgeText}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
});
