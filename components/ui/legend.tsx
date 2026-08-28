import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/text';
import { spacing } from '@/constants/theme';

/** จุดสีพร้อมคำอธิบายว่าสีนั้นหมายถึงอะไร ใช้คู่กับกราฟหรือแถบที่สื่อความหมายด้วยสีเพียงอย่างเดียว */
export function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.item}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
