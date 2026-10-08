import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatBaht, formatThaiDate } from '@/components/format';
import { CheckoutSheet } from '@/components/plus/checkout-sheet';
import {
  changedNotice,
  FREE_FEATURES,
  MOCK_BILLING_NOTE,
  PERIOD_LABEL,
  PLAN_NAME,
  PLAN_SHORT_NAME,
  PLUS_FEATURES,
  priceLabel,
} from '@/components/plus/copy';
import { PlusBadge } from '@/components/plus/plus-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MockBadge } from '@/components/ui/mock-badge';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useSubscription } from '@/hooks/use-subscription';
import { useTheme } from '@/hooks/use-theme';
import {
  isPaidPlan,
  monthlyPriceThb,
  nextRenewalAt,
  PAID_PLAN_ORDER,
  PAID_PLANS,
  yearlySavingThb,
  type PaidPlanId,
  type PlanId,
} from '@/services/subscription';

export default function SubscriptionScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { email } = useAuth();
  const { subscription, isPlus, switchPlan } = useSubscription();

  const [selected, setSelected] = useState<PaidPlanId>(
    isPaidPlan(subscription.plan) ? subscription.plan : 'plusMonthly'
  );
  const [target, setTarget] = useState<PlanId | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; unlocked: boolean } | null>(null);

  const renewal = nextRenewalAt(subscription, Date.now());
  const selectedIsCurrent = subscription.plan === selected;

  const openCheckout = (to: PlanId) => {
    setError(null);
    setNotice(null);
    setTarget(to);
  };

  const confirm = async () => {
    if (target === null) return;
    setSaving(true);
    setError(null);
    try {
      const change = await switchPlan(target);
      setNotice({ text: changedNotice(change, target), unlocked: change === 'subscribe' || change === 'switch' });
      setTarget(null);
    } catch {
      setError('บันทึกสถานะแพ็กเกจไม่สำเร็จ ตรวจการเชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง');
    } finally {
      setSaving(false);
    }
  };

  const primaryLabel = !isPlus
    ? `สมัคร ${PLAN_SHORT_NAME[selected]} · ${priceLabel(PAID_PLANS[selected])}`
    : selectedIsCurrent
      ? 'คุณใช้แพ็กเกจนี้อยู่'
      : `เปลี่ยนเป็น ${PLAN_SHORT_NAME[selected]} · ${priceLabel(PAID_PLANS[selected])}`;

  return (
    <Screen title="พร้อมวิ่ง Plus" back>
      <Image
        source={require('@/assets/images/prompt-wing-brand-concept.png')}
        style={styles.brand}
        contentFit="contain"
        accessibilityLabel="พร้อมวิ่ง พร้อมทุกก้าว ในแบบของคุณ"
      />
      <View style={styles.intro}>
        <AppText variant="title" weight="bold">
          ก้าวต่อไป มีแผนซ้อมที่เข้ากับคุณ
        </AppText>
        <AppText tone="muted">
          เริ่มวิ่งได้ฟรี เลือก Plus เมื่ออยากได้แผนซ้อมที่ปรับตามผลการวิ่งจริง และติดตามพัฒนาการต่อเนื่อง
        </AppText>
      </View>

      <Card background={isPlus ? colors.brandSoft : colors.surface}>
        <View style={styles.statusHeader}>
          <AppText variant="small" tone="muted">
            แพ็กเกจปัจจุบัน
          </AppText>
          <PlusBadge label={isPlus ? 'PLUS' : 'FREE'} muted={!isPlus} />
        </View>
        <AppText variant="title" weight="bold">
          {PLAN_NAME[subscription.plan]}
        </AppText>
        <AppText variant="small" tone="muted">
          {isPaidPlan(subscription.plan)
            ? `${priceLabel(PAID_PLANS[subscription.plan])}${renewal === null ? '' : ` · ต่ออายุอัตโนมัติ ${formatThaiDate(renewal)}`}`
            : 'ใช้ฟีเจอร์พื้นฐานได้ฟรี ไม่จำกัดเวลา'}
        </AppText>
        <MockBadge label={MOCK_BILLING_NOTE} />
      </Card>

      <AppText variant="heading" weight="semibold">
        {isPlus ? 'เปลี่ยนรอบบิล' : 'เลือกแพ็กเกจ Plus'}
      </AppText>
      <View style={styles.options} accessibilityRole="radiogroup">
        {PAID_PLAN_ORDER.map((planId) => (
          <PlanOption
            key={planId}
            planId={planId}
            selected={selected === planId}
            current={subscription.plan === planId}
            onPress={() => {
              setSelected(planId);
              setNotice(null);
            }}
          />
        ))}
      </View>

      {notice ? (
        <Card background={colors.clearGreenSoft}>
          <View style={styles.noticeRow}>
            <Ionicons name="checkmark-circle" size={22} color={colors.clearGreen} />
            <AppText variant="body" weight="semibold" style={styles.noticeText} accessibilityLiveRegion="polite">
              {notice.text}
            </AppText>
          </View>
          {notice.unlocked ? (
            <View style={styles.noticeActions}>
              <Button label="ตั้งแผนซ้อม" onPress={() => router.push('/training-plan')} style={styles.noticeButton} />
              <Button
                label="ดูรายงาน"
                onPress={() => router.push('/progress-report')}
                variant="secondary"
                style={styles.noticeButton}
              />
            </View>
          ) : null}
        </Card>
      ) : null}

      <Button label={primaryLabel} onPress={() => openCheckout(selected)} disabled={isPlus && selectedIsCurrent} />
      {isPlus ? (
        <Pressable
          onPress={() => openCheckout('free')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.cancelRow, pressed && styles.pressed]}>
          <AppText variant="small" weight="semibold" color={colors.clearRed}>
            ยกเลิก Plus และกลับไปใช้แพ็กเกจฟรี
          </AppText>
        </Pressable>
      ) : (
        <AppText variant="caption" tone="muted" align="center">
          {MOCK_BILLING_NOTE} สถานะจะบันทึกในบัญชีของคุณ เปลี่ยนหรือยกเลิกได้ทุกเมื่อ
        </AppText>
      )}

      <Card>
        <AppText variant="heading" weight="bold">
          สิ่งที่ได้ใน Plus
        </AppText>
        {PLUS_FEATURES.map((feature) => {
          const href = feature.href;
          const openable = isPlus && href !== null;
          return (
            <Pressable
              key={feature.id}
              disabled={!openable}
              onPress={() => href && router.push(href)}
              accessibilityRole={openable ? 'button' : undefined}
              style={({ pressed }) => [styles.feature, pressed && styles.pressed]}>
              <View style={[styles.featureIcon, { backgroundColor: colors.brandSoft }]}>
                <Ionicons name={feature.icon} size={20} color={colors.brandStrong} />
              </View>
              <View style={styles.featureCopy}>
                <AppText weight="semibold">{feature.title}</AppText>
                <AppText variant="small" tone="muted">
                  {feature.description}
                </AppText>
              </View>
              {openable ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
            </Pressable>
          );
        })}
        <AppText variant="caption" tone="faint">
          คำแนะนำในแผนซ้อมและรายงานเป็นแนวทางการวิ่งทั่วไป ไม่ใช่การวินิจฉัยหรือป้องกันการบาดเจ็บ
        </AppText>
      </Card>

      <Card>
        <AppText variant="heading" weight="semibold">
          พร้อมวิ่ง Free · 0 บาท
        </AppText>
        {FREE_FEATURES.map((feature) => (
          <View key={feature} style={styles.freeRow}>
            <Ionicons name="checkmark" size={16} color={colors.clearGreen} />
            <AppText variant="small" style={styles.featureCopy}>
              {feature}
            </AppText>
          </View>
        ))}
        <AppText variant="small" tone="muted">
          ข้อมูลความเสี่ยงก่อนวิ่งและประวัติการวิ่งของคุณใช้ได้ในแพ็กเกจฟรีเสมอ
        </AppText>
      </Card>

      <Card>
        <AppText variant="heading" weight="semibold">
          พาร์ทเนอร์ช่วยให้เริ่มวิ่งได้ฟรี
        </AppText>
        <AppText variant="small" tone="muted">
          ร้านรองเท้า เสื้อวิ่ง กระเป๋าคาดเอว และอุปกรณ์สะท้อนแสง ลงการ์ดแนะนำสินค้าในหน้าแรกและชุมชน
          พร้อมป้าย “โฆษณา” ชัดเจน
        </AppText>
        <AppText variant="small">ไม่มีโฆษณาขัดจังหวะขณะวิ่ง วอร์มอัพ หรือบนคำเตือนความเสี่ยง</AppText>
        <AppText variant="caption" tone="muted">
          การ์ดโฆษณาในต้นแบบนี้เป็นตัวอย่าง ยังไม่มีพาร์ทเนอร์จริงร่วมรายการ
        </AppText>
      </Card>

      <CheckoutSheet
        target={target}
        current={subscription.plan}
        email={email}
        saving={saving}
        error={error}
        onConfirm={confirm}
        onClose={() => {
          if (!saving) setTarget(null);
        }}
      />
    </Screen>
  );
}

function PlanOption({
  planId,
  selected,
  current,
  onPress,
}: {
  planId: PaidPlanId;
  selected: boolean;
  current: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const plan = PAID_PLANS[planId];
  const yearly = plan.period === 'year';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${PLAN_NAME[planId]} ${priceLabel(plan)}${current ? ' แพ็กเกจที่ใช้อยู่' : ''}`}
      style={({ pressed }) => [
        styles.option,
        {
          backgroundColor: selected ? colors.brandSoft : colors.surface,
          borderColor: selected ? colors.brand : colors.border,
        },
        pressed && styles.pressed,
      ]}>
      <View style={styles.optionHeader}>
        <View style={[styles.radio, { borderColor: selected ? colors.brand : colors.textFaint }]}>
          {selected ? <View style={[styles.radioDot, { backgroundColor: colors.brand }]} /> : null}
        </View>
        <AppText variant="heading" weight="bold" style={styles.optionTitle}>
          {PERIOD_LABEL[plan.period]}
        </AppText>
        {current ? (
          <PlusBadge label="ใช้อยู่" />
        ) : yearly ? (
          <PlusBadge label={`ประหยัด ${formatBaht(yearlySavingThb())} บาท`} muted />
        ) : null}
      </View>
      <AppText variant="title" weight="bold">
        {formatBaht(plan.priceThb)}{' '}
        <AppText variant="body" tone="muted">
          บาท/{yearly ? 'ปี' : 'เดือน'}
        </AppText>
      </AppText>
      <AppText variant="small" tone="muted">
        {yearly
          ? `เฉลี่ย ${formatBaht(monthlyPriceThb(plan))} บาท/เดือน จ่ายครั้งเดียวต่อปี`
          : 'จ่ายทีละเดือน ยกเลิกได้ทุกเมื่อ'}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  brand: { width: '100%', aspectRatio: 1.5, maxHeight: 240 },
  intro: { gap: spacing.xs },
  statusHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  options: { gap: spacing.sm },
  option: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  optionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  optionTitle: { flex: 1 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  noticeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  noticeText: { flex: 1 },
  noticeActions: { flexDirection: 'row', gap: spacing.sm },
  noticeButton: { flex: 1, paddingHorizontal: spacing.md },
  cancelRow: { alignItems: 'center', paddingVertical: spacing.sm },
  feature: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  featureIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  featureCopy: { flex: 1, gap: 2 },
  freeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  pressed: { opacity: 0.7 },
});
