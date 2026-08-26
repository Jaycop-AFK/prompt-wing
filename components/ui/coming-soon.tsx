import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/text';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * ที่ว่างของส่วนที่ยังไม่ได้สร้าง พร้อมบอกว่าอยู่ในตั๋วใบไหน
 *
 * ตั้งใจให้ดูออกทันทีว่ายังไม่เสร็จ ดีกว่าปล่อยจอว่างซึ่งดูเหมือนแอปพัง
 */
export function ComingSoon({ ticket, children }: { ticket: string; children: string }) {
  const { colors } = useTheme();

  return (
    <Card background={colors.surfaceAlt}>
      <View style={styles.row}>
        <Ionicons name="construct-outline" size={18} color={colors.textMuted} />
        <AppText variant="small" weight="semibold" tone="muted">
          ตั๋ว {ticket}
        </AppText>
      </View>
      <AppText variant="body" tone="muted">
        {children}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
