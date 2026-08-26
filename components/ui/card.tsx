import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  /** พื้นหลังทางเลือก ต้องเป็นค่าจาก theme.colors */
  background?: string;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

/** กล่องเนื้อหามาตรฐาน ใช้เป็นหน่วยวางเนื้อหาหลักของทุกจอ */
export function Card({ children, onPress, background, style, accessibilityLabel }: CardProps) {
  const { colors } = useTheme();

  const cardStyle: ViewStyle = {
    backgroundColor: background ?? colors.surface,
    borderColor: colors.border,
  };

  if (!onPress) {
    return <View style={[styles.card, cardStyle, style]}>{children}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.card, cardStyle, pressed && styles.pressed, style]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.md,
  },
  pressed: { opacity: 0.7 },
});
