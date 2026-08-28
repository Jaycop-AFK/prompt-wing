import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/text';
import type { TypographyVariant } from '@/constants/theme';

interface SummaryStatProps {
  label: string;
  value: string;
  /** ขนาดตัวเลข จอที่มีสถิติแน่นหลายตัวใช้ "body" จอที่เน้นตัวเลขเด่นใช้ "heading" (ค่าเริ่มต้น) */
  valueVariant?: TypographyVariant;
}

/** ป้ายกำกับเล็กด้านบน ตัวเลขใหญ่ด้านล่าง ใช้ซ้ำในทุกจอที่แสดงสถิติการวิ่งเป็นตาราง */
export function SummaryStat({ label, value, valueVariant = 'heading' }: SummaryStatProps) {
  return (
    <View style={styles.summaryStat}>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      <AppText variant={valueVariant} weight="bold">
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryStat: { flex: 1, gap: 2 },
});
