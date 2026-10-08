import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** ป้ายสั้นบอกว่าเป็นฟีเจอร์หรือแพ็กเกจของพร้อมวิ่ง Plus */
export function PlusBadge({ label = 'PLUS', muted = false }: { label?: string; muted?: boolean }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.badge, { backgroundColor: muted ? colors.surfaceAlt : colors.brand }]}>
      <AppText variant="caption" weight="bold" color={muted ? colors.textMuted : colors.onBrand}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
  },
});
