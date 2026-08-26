import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
}: ButtonProps) {
  const { colors } = useTheme();

  const background: Record<Variant, string> = {
    primary: colors.brand,
    secondary: colors.surfaceAlt,
    ghost: 'transparent',
  };
  const textColor: Record<Variant, string> = {
    primary: colors.onBrand,
    secondary: colors.text,
    ghost: colors.brand,
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
      // เครื่องที่ไม่มีมอเตอร์สั่นก็ยังกดปุ่มได้ตามปกติ
    });
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background[variant] },
        variant === 'ghost' && { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.brand },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      <AppText variant="body" weight="semibold" color={textColor[variant]}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.4 },
});
