import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatThaiDate } from '@/components/format';
import { confirmTitle, MOCK_BILLING_NOTE, PLAN_NAME, priceLabel } from '@/components/plus/copy';
import { Button } from '@/components/ui/button';
import { MockBadge } from '@/components/ui/mock-badge';
import { AppText } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  addCalendarMonths,
  isPaidPlan,
  PAID_PLANS,
  planChangeOf,
  type PlanId,
} from '@/services/subscription';

interface CheckoutSheetProps {
  /** แพ็กเกจที่กำลังจะเปลี่ยนไป null คือปิดหน้าต่าง */
  target: PlanId | null;
  current: PlanId;
  email: string | null;
  saving: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * หน้ายืนยันการสมัคร เปลี่ยน หรือยกเลิกแพ็กเกจ ทำหน้าที่แทนหน้าชำระเงินของร้านแอปในต้นแบบนี้
 *
 * ใช้ Modal ในจอแทน Alert เพราะ Alert ของ React Native บนเว็บไม่มีปุ่มให้กด และหน้ายืนยันต้องบอก
 * รายละเอียดรอบบิลกับข้อจำกัดของโหมดทดลองได้ครบกว่ากล่องข้อความสั้น ๆ
 */
export function CheckoutSheet({ target, current, email, saving, error, onConfirm, onClose }: CheckoutSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  if (target === null) return null;

  const change = planChangeOf(current, target);
  const now = Date.now();
  const rows: [string, string][] = [];

  if (isPaidPlan(target)) {
    const plan = PAID_PLANS[target];
    rows.push(['แพ็กเกจ', PLAN_NAME[target]]);
    rows.push(['ราคา', priceLabel(plan)]);
    if (change === 'switch') rows.push(['จากแพ็กเกจเดิม', PLAN_NAME[current]]);
    rows.push(['เริ่มใช้', `วันนี้ ${formatThaiDate(now)}`]);
    rows.push([
      'ต่ออายุรอบถัดไป',
      formatThaiDate(addCalendarMonths(now, plan.period === 'year' ? 12 : 1)),
    ]);
  } else {
    rows.push(['หลังยกเลิก', 'กลับไปใช้พร้อมวิ่ง Free ทันที']);
    rows.push(['แผนซ้อมที่ตั้งไว้', 'ยังเก็บในบัญชี สมัครใหม่แล้วซ้อมต่อได้']);
    rows.push(['การเตือนซ้อม', 'หยุดเตือนจนกว่าจะกลับมาใช้ Plus']);
  }

  const cancelling = change === 'cancel';

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={saving ? undefined : onClose} accessibilityLabel="ปิดหน้าต่าง" />
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.background, paddingBottom: insets.bottom + spacing.lg },
          ]}
          accessibilityViewIsModal>
          <View style={styles.header}>
            <AppText variant="heading" weight="bold" style={styles.title}>
              {confirmTitle(change, target)}
            </AppText>
            <Pressable onPress={onClose} disabled={saving} hitSlop={10} accessibilityRole="button" accessibilityLabel="ปิด">
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          <MockBadge label={MOCK_BILLING_NOTE} />

          <View style={[styles.summary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {rows.map(([label, value]) => (
              <View key={label} style={styles.row}>
                <AppText variant="small" tone="muted">
                  {label}
                </AppText>
                <AppText variant="small" weight="semibold" align="right" style={styles.value}>
                  {value}
                </AppText>
              </View>
            ))}
          </View>

          <AppText variant="caption" tone="muted">
            {cancelling
              ? 'ในแอปจริง Plus จะยังใช้ได้จนจบรอบบิลที่จ่ายไปแล้ว ต้นแบบนี้เปลี่ยนทันทีเพื่อให้ทดลองเปิดปิดฟีเจอร์ได้'
              : `บันทึกสถานะแพ็กเกจในบัญชี${email ? ` ${email}` : ''} เท่านั้น ในแอปจริงการชำระเงินจะผ่าน App Store หรือ Google Play`}
          </AppText>

          {error ? (
            <AppText variant="small" weight="semibold" color={colors.clearRed} accessibilityLiveRegion="polite">
              {error}
            </AppText>
          ) : null}

          {cancelling ? (
            <Pressable
              onPress={onConfirm}
              disabled={saving}
              accessibilityRole="button"
              accessibilityState={{ disabled: saving }}
              style={({ pressed }) => [
                styles.destructive,
                { borderColor: colors.clearRed },
                (pressed || saving) && styles.dimmed,
              ]}>
              <AppText variant="body" weight="semibold" color={colors.clearRed}>
                {saving ? 'กำลังยกเลิก…' : 'ยืนยันยกเลิก Plus'}
              </AppText>
            </Pressable>
          ) : (
            <Button
              label={saving ? 'กำลังบันทึก…' : change === 'switch' ? 'ยืนยันเปลี่ยนแพ็กเกจ' : 'ยืนยันสมัคร (ทดลอง)'}
              onPress={onConfirm}
              disabled={saving}
            />
          )}
          <Button label={cancelling ? 'ใช้ Plus ต่อ' : 'ยกเลิก'} onPress={onClose} disabled={saving} variant="secondary" />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.48)' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { flex: 1 },
  summary: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  value: { flexShrink: 1 },
  destructive: {
    minHeight: 52,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimmed: { opacity: 0.6 },
});
