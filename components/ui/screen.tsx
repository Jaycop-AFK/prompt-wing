import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/text';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ScreenProps {
  children: ReactNode;
  /** หัวจอ ถ้าไม่ส่งจะไม่มีแถบหัว */
  title?: string;
  /** แสดงปุ่มย้อนกลับที่มุมซ้ายของแถบหัว */
  back?: boolean;
  /** ปุ่มหรือไอคอนที่มุมขวาของแถบหัว */
  headerRight?: ReactNode;
  /** ปิดการเลื่อนเมื่อจอจัดการการเลื่อนเอง เช่น จอที่มีแผนที่เต็มพื้นที่ */
  scroll?: boolean;
}

/**
 * โครงจอมาตรฐาน จัดการพื้นหลังตามธีม ขอบปลอดภัย และแถบหัวให้เหมือนกันทุกจอ
 */
export function Screen({ children, title, back, headerRight, scroll = true }: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const header = title ? (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <View style={styles.headerSide}>
        {back ? (
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="ย้อนกลับ">
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
        ) : null}
      </View>

      <AppText variant="heading" weight="semibold" numberOfLines={1} style={styles.headerTitle}>
        {title}
      </AppText>

      <View style={[styles.headerSide, styles.headerRight]}>{headerRight}</View>
    </View>
  ) : null;

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={styles.flex}>{children}</View>
  );

  return (
    <View
      style={[styles.flex, { backgroundColor: colors.background, paddingTop: insets.top }]}
      testID="screen">
      {header}
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSide: { width: 40, justifyContent: 'center' },
  headerRight: { alignItems: 'flex-end' },
  headerTitle: { flex: 1, textAlign: 'center' },
});
