import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { RAMP_LABEL, RAMP_LETTER } from '@/components/warmup/copy';
import { moveById } from '@/components/warmup/moves';
import { characterColorsFrom, WarmupCharacter } from '@/components/warmup/warmup-character';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';
import { rampPhaseOf, selectWarmUpSet, type WarmUpMinutes, type WarmUpSet } from '@/core/coach';
import { useTheme } from '@/hooks/use-theme';
import { useTodayConditions } from '@/hooks/use-today-conditions';

type Stage = 'setup' | 'playing' | 'paused' | 'done';

const MINUTE_OPTIONS: WarmUpMinutes[] = [5, 10, 15];

export default function WarmupScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { clearance } = useTodayConditions();

  const [minutes, setMinutes] = useState<WarmUpMinutes>(10);
  const [stage, setStage] = useState<Stage>('setup');
  const [activeSet, setActiveSet] = useState<WarmUpSet | null>(null);
  const [slotIndex, setSlotIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);

  // ยังไม่มีที่เก็บ Session หรือ SessionTarget จริง (รอตั๋ว 13 และตั๋ว 10)
  // จึงส่งค่าเริ่มต้นที่ selectWarmUpSet รองรับอยู่แล้วไปก่อน ส่วนอากาศวันนี้เป็นของจริงจากตั๋ว 03
  const buildSet = (forMinutes: WarmUpMinutes): WarmUpSet =>
    selectWarmUpSet({
      clearanceFactors: clearance?.decidedBy ?? [],
      cadenceDroppedLastTime: false,
      sessionTarget: null,
      minutes: forMinutes,
    });

  const previewSet = stage === 'setup' ? buildSet(minutes) : activeSet;

  /**
   * ไปท่าถัดไป หรือจบชุดถ้านี่คือท่าสุดท้ายแล้ว พร้อมสั่นเตือน
   *
   * ใช้ทั้งตอนหมดเวลาอัตโนมัติและตอนผู้ใช้กดข้ามเอง เพื่อไม่ให้ตรรกะ "ท่าสุดท้ายหรือยัง"
   * ต้องเขียนสองที่แล้วมีโอกาสหลุดไม่ตรงกันภายหลัง
   */
  const advanceSlot = (set: WarmUpSet, currentIndex: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {
      // เครื่องที่ไม่มีมอเตอร์สั่นก็ยังวอร์มอัพต่อได้ตามปกติ
    });

    const isLastSlot = currentIndex >= set.slots.length - 1;
    if (isLastSlot) {
      setStage('done');
      return;
    }

    const nextIndex = currentIndex + 1;
    setSlotIndex(nextIndex);
    setSecondsLeft(set.slots[nextIndex].seconds);
  };

  // นับถอยหลังทีละวินาที แยกออกจาก effect ที่เปลี่ยนท่า เพื่อไม่ให้สั่นซ้ำหรือมีผลข้างเคียง
  // ซ้อนอยู่ในตัวอัปเดตของ setState เดียวกัน
  useEffect(() => {
    if (stage !== 'playing') return;

    const id = setInterval(() => {
      setSecondsLeft((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => clearInterval(id);
  }, [stage]);

  useEffect(() => {
    if (stage !== 'playing' || secondsLeft > 0 || activeSet === null) return;
    advanceSlot(activeSet, slotIndex);
  }, [secondsLeft, stage, slotIndex, activeSet]);

  const handleStart = () => {
    const set = buildSet(minutes);
    setActiveSet(set);
    setSlotIndex(0);
    setSecondsLeft(set.slots[0]?.seconds ?? 0);
    setStage('playing');
  };

  const handlePauseToggle = () => {
    setStage((current) => (current === 'playing' ? 'paused' : 'playing'));
  };

  const handleSkip = () => {
    if (activeSet === null) return;
    advanceSlot(activeSet, slotIndex);
  };

  const handleExit = () => {
    if (stage === 'setup' || stage === 'done') {
      router.back();
      return;
    }

    Alert.alert('ออกจากการวอร์มอัพ?', 'ความคืบหน้าจะไม่ถูกบันทึก', [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ออก', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  if (stage === 'playing' || stage === 'paused') {
    const slot = activeSet!.slots[slotIndex];
    const move = moveById(slot.moveId);
    const phase = rampPhaseOf(slot.moveId);

    return (
      <Screen title="วอร์มอัพ" scroll={false}>
        <View style={styles.playingBody}>
          <Pressable onPress={handleExit} hitSlop={12} style={styles.exitButton}>
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </Pressable>

          <AppText variant="small" tone="muted">
            ท่าวอร์มอัพที่ {slotIndex + 1} จาก {activeSet!.slots.length}
            {phase ? ` · ${RAMP_LETTER[phase]} ${RAMP_LABEL[phase]}` : ''}
          </AppText>

          <View style={styles.stageWrap}>
            <WarmupCharacter move={move} colors={characterColorsFrom(colors)} />
          </View>

          <AppText variant="title" weight="bold" align="center">
            {move.nameTH}
          </AppText>

          <AppText variant="display" weight="bold" color={colors.brand} align="center">
            {secondsLeft}
          </AppText>

          {stage === 'paused' ? (
            <AppText variant="small" tone="muted" align="center">
              หยุดชั่วคราว
            </AppText>
          ) : null}

          <View style={styles.controls}>
            <Pressable onPress={handleSkip} style={[styles.controlButton, { backgroundColor: colors.surfaceAlt }]}>
              <Ionicons name="play-skip-forward" size={22} color={colors.text} />
            </Pressable>

            <Pressable
              onPress={handlePauseToggle}
              style={[styles.controlButtonLarge, { backgroundColor: colors.brand }]}>
              <Ionicons name={stage === 'playing' ? 'pause' : 'play'} size={30} color={colors.onBrand} />
            </Pressable>

            <Pressable onPress={handleExit} style={[styles.controlButton, { backgroundColor: colors.surfaceAlt }]}>
              <Ionicons name="stop" size={22} color={colors.text} />
            </Pressable>
          </View>
        </View>
      </Screen>
    );
  }

  if (stage === 'done') {
    return (
      <Screen title="วอร์มอัพ" back>
        <Card>
          <AppText variant="title" weight="bold">
            วอร์มอัพเสร็จแล้ว พร้อมวิ่ง
          </AppText>
          <AppText variant="body" tone="muted">
            ร่างกายพร้อมแล้ว ไปเริ่มวิ่งกันเลย
          </AppText>
          <Button label="ไปหน้าหลัก" onPress={() => router.back()} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title="วอร์มอัพ" back>
      <View style={styles.minutesRow}>
        {MINUTE_OPTIONS.map((option) => (
          <Pressable
            key={option}
            onPress={() => setMinutes(option)}
            style={[
              styles.minuteChip,
              {
                backgroundColor: option === minutes ? colors.brand : colors.surfaceAlt,
                borderColor: option === minutes ? colors.brand : colors.border,
              },
            ]}>
            <AppText variant="body" weight="semibold" color={option === minutes ? colors.onBrand : colors.text}>
              {option} นาที
            </AppText>
          </Pressable>
        ))}
      </View>

      <Card background={colors.brandSoft}>
        <AppText variant="small" weight="semibold" color={colors.brandStrong}>
          ทำไมชุดนี้ถึงถูกเลือกมา
        </AppText>
        {previewSet && previewSet.reasons.length > 0 ? (
          previewSet.reasons.map((reason) => (
            <AppText key={reason} variant="small" color={colors.brandStrong}>
              • {reason}
            </AppText>
          ))
        ) : (
          <AppText variant="small" color={colors.brandStrong}>
            ชุดมาตรฐานสำหรับวันนี้ ไม่มีการปรับพิเศษ
          </AppText>
        )}
      </Card>

      <Card>
        <AppText variant="heading" weight="semibold">
          ชุดวอร์มอัพวันนี้
        </AppText>
        {previewSet?.slots.map((slot, index) => {
          const move = moveById(slot.moveId);
          const phase = rampPhaseOf(slot.moveId);
          return (
            <View key={`${slot.moveId}-${index}`} style={[styles.slotRow, { borderTopColor: colors.border }]}>
              <View style={styles.slotLabel}>
                <AppText variant="body">{move.nameTH}</AppText>
                {phase ? (
                  <AppText variant="caption" tone="faint">
                    {RAMP_LETTER[phase]} · {RAMP_LABEL[phase]}
                  </AppText>
                ) : null}
              </View>
              <AppText variant="body" weight="semibold" tone="muted">
                {slot.seconds} วิ
              </AppText>
            </View>
          );
        })}
        <AppText variant="small" tone="muted" style={styles.totalRow}>
          รวม {previewSet ? Math.round(previewSet.totalSeconds / 60) : 0} นาที
        </AppText>
      </Card>

      <Button label="เริ่มวอร์มอัพ" onPress={handleStart} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  minutesRow: { flexDirection: 'row', gap: spacing.sm },
  minuteChip: {
    flex: 1,
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.md,
  },
  slotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  slotLabel: { gap: 2 },
  totalRow: { textAlign: 'right', marginTop: spacing.sm },
  playingBody: { flex: 1, alignItems: 'center', padding: spacing.lg, gap: spacing.sm },
  exitButton: { alignSelf: 'flex-end' },
  stageWrap: { marginVertical: spacing.sm },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    marginTop: 'auto',
    paddingBottom: spacing.lg,
  },
  controlButton: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonLarge: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
