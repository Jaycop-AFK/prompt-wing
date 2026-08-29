import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { levelColors } from '@/components/clearance/colors';
import {
  daylightWarningSentence,
  daylightWarningTitle,
  LEVEL_LABEL,
  reasonSentence,
} from '@/components/clearance/copy';
import { formatPace } from '@/components/format';
import { buildSessionTarget, KIND_CONFIG, KIND_LABEL, KIND_ORDER } from '@/components/session-target/copy';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SummaryStat } from '@/components/ui/summary-stat';
import { AppText } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';
import {
  describeSessionTarget,
  estimateSessionSummary,
  evaluateDaylightWarning,
  magnitudeOf,
  reduceSessionTargetForClearance,
  type SessionTarget,
} from '@/core/coach';
import { useProfile } from '@/hooks/use-profile';
import { useTheme } from '@/hooks/use-theme';
import { useTodayConditions } from '@/hooks/use-today-conditions';
import { startOfDay } from '@/services/run-history';

type Kind = SessionTarget['kind'];

export default function RunScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { clearance, conditions } = useTodayConditions();
  const { profile } = useProfile();

  // เก็บเป็น SessionTarget ก้อนเดียว ไม่แยกเป็น kind กับ magnitude สองตัวแปร
  // เพราะสองตัวแปรแยกกันมีจังหวะที่หลุดไม่ตรงกันได้ (เช่นลืมรีเซ็ต magnitude ตอนเปลี่ยน kind)
  // ส่วน kind และขนาดตัวเลขที่ต้องใช้แสดงผล ดึงจากก้อนเดียวกันนี้ด้วย target.kind และ magnitudeOf
  const [rawTarget, setRawTarget] = useState<SessionTarget>(
    buildSessionTarget('distance', KIND_CONFIG.distance.defaultMagnitude)
  );
  const [overrideConfirmed, setOverrideConfirmed] = useState(false);

  const kind = rawTarget.kind;
  const magnitude = magnitudeOf(rawTarget);
  const level = clearance?.level ?? 'green';
  const reduction = reduceSessionTargetForClearance(rawTarget, level);
  const wasReduced = reduction.reason !== null;
  const effectiveTarget = !wasReduced || overrideConfirmed ? rawTarget : reduction.target;
  const summary = estimateSessionSummary(effectiveTarget, level, profile.weightKg);

  // เตือนเรื่องแสงกลางวันได้ต่อเมื่อรู้เวลาพระอาทิตย์ขึ้นตกจริงเท่านั้น ถ้าดึงข้อมูลอากาศไม่สำเร็จ
  // ต้องเงียบไปเลย ไม่ใช่เดาเวลาเอาเอง เพราะคำเตือนที่อิงเวลาผิดแย่กว่าไม่เตือน
  //
  // ใช้เวลาปัจจุบันจริง ไม่ใช่เวลาที่ดึงข้อมูลอากาศมา เพราะคำเตือนนี้ขึ้นกับว่า "ตอนนี้" เหลือแสงเท่าไร
  // ถ้าเปิดจอนี้ค้างไว้นาน เวลาที่ดึงข้อมูลจะเก่าจนคำเตือนหลุด ตัวเลขนี้คำนวณใหม่ทุกครั้งที่จอวาดใหม่
  // ไม่ได้เดินเองตามวินาที ซึ่งพอสำหรับจอที่ผู้ใช้กำลังกดเลือกเป้าหมายรอบนี้อยู่
  //
  // แต่ต้องเช็คด้วยว่าเวลาพระอาทิตย์ตกที่ถืออยู่เป็นของวันนี้จริง เพราะ useTodayConditions ดึงข้อมูล
  // ครั้งเดียวตอนเปิดจอ ถ้าเปิดแอปค้างข้ามคืน เวลาพระอาทิตย์ตกจะเป็นของเมื่อวาน เทียบกับเวลาตอนนี้
  // แล้วจะขึ้นว่า "ฟ้ามืดแล้ว" ค้างตลอดเช้าวันถัดไป เงียบไว้ดีกว่าเตือนผิด
  const now = Date.now();
  const sunsetIsToday =
    conditions !== null && startOfDay(conditions.sunset) === startOfDay(now);

  const daylight =
    conditions === null || !sunsetIsToday
      ? null
      : evaluateDaylightWarning({
          now,
          sunrise: conditions.sunrise,
          sunset: conditions.sunset,
          estimatedMinutes: summary.estimatedMinutes,
        });

  // ใบอนุญาตวิ่งเปลี่ยนได้ระหว่างที่หน้าเปิดอยู่ (ดึงข้อมูลใหม่, เวลาผ่านไป) การยืนยันขอปรับกลับ
  // ขึ้นควรผูกกับ "สถานการณ์ตอนที่กด" เท่านั้น ถ้าระดับเปลี่ยนไปจริง ให้ประเมินใหม่จากค่าดิบเสมอ
  useEffect(() => {
    setOverrideConfirmed(false);
  }, [level]);

  const selectKind = (nextKind: Kind) => {
    setRawTarget(buildSessionTarget(nextKind, KIND_CONFIG[nextKind].defaultMagnitude));
    setOverrideConfirmed(false);
  };

  const selectMagnitude = (value: number) => {
    setRawTarget(buildSessionTarget(kind, value));
    setOverrideConfirmed(false);
  };

  const adjustMagnitude = (direction: 1 | -1) => {
    const { step, minMagnitude } = KIND_CONFIG[kind];
    const next = Math.max(minMagnitude, magnitude + step * direction);
    selectMagnitude(Math.round(next * 10) / 10);
  };

  const redLevel = levelColors(colors, 'red');

  return (
    <Screen title="วิ่ง">
      <View style={styles.kindRow}>
        {KIND_ORDER.map((option) => (
          <Pressable
            key={option}
            onPress={() => selectKind(option)}
            style={[
              styles.kindChip,
              {
                backgroundColor: option === kind ? colors.brand : colors.surfaceAlt,
                borderColor: option === kind ? colors.brand : colors.border,
              },
            ]}>
            <AppText variant="body" weight="semibold" color={option === kind ? colors.onBrand : colors.text}>
              {KIND_LABEL[option]}
            </AppText>
          </Pressable>
        ))}
      </View>

      <Card>
        <View style={styles.presetRow}>
          {KIND_CONFIG[kind].presets.map((value) => (
            <Pressable
              key={value}
              onPress={() => selectMagnitude(value)}
              style={[
                styles.presetChip,
                {
                  backgroundColor: value === magnitude ? colors.brandSoft : colors.surfaceAlt,
                  borderColor: value === magnitude ? colors.brand : colors.border,
                },
              ]}>
              <AppText variant="small" weight="semibold" color={value === magnitude ? colors.brandStrong : colors.text}>
                {value}
              </AppText>
            </Pressable>
          ))}
        </View>

        <View style={styles.customRow}>
          <AppText variant="small" tone="muted">
            กำหนดเอง
          </AppText>
          <View style={styles.stepper}>
            <Pressable
              onPress={() => adjustMagnitude(-1)}
              style={[styles.stepButton, { backgroundColor: colors.surfaceAlt }]}
              accessibilityLabel="ลดเป้าหมายรอบนี้">
              <AppText variant="heading" weight="bold">
                −
              </AppText>
            </Pressable>
            <AppText variant="heading" weight="bold" style={styles.stepValue}>
              {kind === 'distance' ? magnitude.toFixed(1) : Math.round(magnitude)}
            </AppText>
            <Pressable
              onPress={() => adjustMagnitude(1)}
              style={[styles.stepButton, { backgroundColor: colors.surfaceAlt }]}
              accessibilityLabel="เพิ่มเป้าหมายรอบนี้">
              <AppText variant="heading" weight="bold">
                +
              </AppText>
            </Pressable>
          </View>
        </View>
      </Card>

      {level === 'red' ? (
        <Card background={redLevel.background}>
          <AppText variant="heading" weight="bold" color={redLevel.foreground}>
            {LEVEL_LABEL.red}
          </AppText>
          <AppText variant="small" color={redLevel.foreground}>
            {clearance ? reasonSentence(clearance.decidedBy) || 'สภาพอากาศไม่เหมาะกับการวิ่งกลางแจ้งตอนนี้' : ''}
          </AppText>
          <AppText variant="small" weight="medium" color={redLevel.foreground}>
            ถ้าจะวิ่งต่อ เป็นการตัดสินใจของคุณเอง แนะนำให้เลื่อนไปวิ่งช่วงที่ปลอดภัยกว่านี้แทน
          </AppText>
        </Card>
      ) : null}

      {wasReduced && !overrideConfirmed ? (
        <Card background={colors.clearYellowSoft}>
          <AppText variant="small" color={colors.clearYellow} weight="semibold">
            {reduction.reason}
          </AppText>
          <Button
            label={`ยืนยันวิ่ง ${describeSessionTarget(rawTarget)} ตามเดิม`}
            onPress={() => setOverrideConfirmed(true)}
            variant="ghost"
          />
        </Card>
      ) : null}

      {daylight && conditions ? (
        // ตั้งใจไม่ใช้สีของใบอนุญาตวิ่ง เพราะความมืดทำให้ใบอนุญาตเป็นสีเหลืองอยู่แล้ว การ์ดลดเป้าหมาย
        // สีเหลืองจึงขึ้นอยู่เหนือการ์ดนี้พอดี ถ้าใช้สีเดียวกันสองใบติดกันจะอ่านรวมเป็นก้อนเดียว
        // และคำเตือนเรื่องเวลานี้เป็นคนละเรื่องกับระดับใบอนุญาตวิ่ง ไม่ควรยืมสีของกันและกันมาใช้
        <Card background={colors.surfaceAlt}>
          <View style={styles.warningHeader}>
            <Ionicons name="partly-sunny-outline" size={20} color={colors.textMuted} />
            <AppText variant="heading" weight="bold">
              {daylightWarningTitle(daylight)}
            </AppText>
          </View>
          <AppText variant="small" tone="muted">
            {daylightWarningSentence(daylight, conditions.sunset)}
          </AppText>
        </Card>
      ) : null}

      <Card>
        <AppText variant="heading" weight="semibold">
          สรุปก่อนวิ่ง
        </AppText>
        <View style={styles.summaryRow}>
          <SummaryStat label="เวลาที่คาด" value={`${summary.estimatedMinutes} นาที`} valueVariant="body" />
          <SummaryStat label="แคลอรีที่คาด" value={`${summary.estimatedKcal} แคลอรี`} valueVariant="body" />
          <SummaryStat
            label="pace แนะนำ"
            value={`${formatPace(summary.recommendedPaceSecPerKm)} /กม.`}
            valueVariant="body"
          />
        </View>
      </Card>

      <Button
        label="เริ่มวิ่ง"
        onPress={() =>
          router.push({
            pathname: '/live-run',
            params: { targetKind: effectiveTarget.kind, targetMagnitude: String(magnitudeOf(effectiveTarget)) },
          })
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  kindRow: { flexDirection: 'row', gap: spacing.sm },
  kindChip: {
    flex: 1,
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.md,
  },
  presetRow: { flexDirection: 'row', gap: spacing.sm },
  presetChip: {
    flex: 1,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
  },
  customRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: { minWidth: 48, textAlign: 'center' },
  summaryRow: { flexDirection: 'row' },
  warningHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
