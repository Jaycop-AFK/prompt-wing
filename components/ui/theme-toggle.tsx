import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { useTheme, useThemeMode } from '@/hooks/use-theme';

/** ปุ่มสลับธีมสว่างกับมืด ค่าที่เลือกถูกจำไว้ข้ามการเปิดปิดแอป */
export function ThemeToggle() {
  const { colors } = useTheme();
  const { toggle, isDark } = useThemeMode();

  return (
    <Pressable
      onPress={toggle}
      hitSlop={12}
      accessibilityRole="switch"
      accessibilityState={{ checked: isDark }}
      accessibilityLabel={isDark ? 'เปลี่ยนเป็นธีมสว่าง' : 'เปลี่ยนเป็นธีมมืด'}
      style={({ pressed }) => [pressed && styles.pressed]}>
      <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={22} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.6 },
});
