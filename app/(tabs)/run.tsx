import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { levelColors } from '@/components/clearance/colors';
import {
  daylightWarningSentence,
  daylightWarningTitle,
  LEVEL_LABEL,
  reasonSentence,
} from '@/components/clearance/copy';
import { formatPace } from '@/components/format';
import { PlusBadge } from '@/components/plus/plus-badge';
import { buildSessionTarget, KIND_CONFIG, KIND_LABEL, KIND_ORDER } from '@/components/session-target/copy';
import {
  GOAL_LABEL,
  planProgramName,
  WORKOUT_HINT,
  workoutTitle,
} from '@/components/training-plan/copy';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { SummaryStat } from '@/components/ui/summary-stat';
import { AppText } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';
import {
  buildTrainingWeek,
  describeSessionTarget,
  estimateSessionSummary,
  evaluateDaylightWarning,
  magnitudeOf,
  nextWorkout,
  reduceSessionTargetForClearance,
  type SessionTarget,
} from '@/core/coach';
import { useProfile } from '@/hooks/use-profile';
import { useSubscription } from '@/hooks/use-subscription';
import { useTheme } from '@/hooks/use-theme';
import { useTodayConditions } from '@/hooks/use-today-conditions';
import { useTrainingPlan } from '@/hooks/use-training-plan';
import { startOfDay } from '@/services/run-history';
import type { SessionRecord } from '@/services/session-record';
import { listSessions } from '@/storage/session-storage';

type Kind = SessionTarget['kind'];
type RunMode = 'free' | 'goal' | 'program';

const RUN_MODE_LABEL: Record<RunMode, string> = {
  free: 'วิ่งอิสระ',
  goal: 'ตั้งเป้า',
  program: 'โปรแกรม',
};

const RUN_MODE_ICON: Record<RunMode, keyof typeof Ionicons.glyphMap> = {
  free: 'footsteps-outline',
  goal: 'flag-outline',
  program: 'calendar-outline',
};

interface RunProgram {
  name: string;
  description: string;
  target: SessionTarget;
}

/** ตำแหน่งพิเศษของโปรแกรมที่มาจากแผนซ้อม Plus ไม่ใช่ตำแหน่งใน RUN_PROGRAMS */
const PLAN_PROGRAM = -1;

const RUN_PROGRAMS: RunProgram[] = [
  {
    name: 'วิ่งเบา',
    description: 'วิ่งสบาย เน้นสร้างความสม่ำเสมอ',
    target: buildSessionTarget('time', 20),
  },
  {
    name: 'สร้างความอึด',
    description: 'วิ่งต่อเนื่องในจังหวะที่คุมได้',
    target: buildSessionTarget('time', 30),
  },
  {
    name: 'ระยะยาว',
    description: 'สะสมระยะโดยไม่เร่ง pace',
    target: buildSessionTarget('distance', 5),
  },
];

export default function RunScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { clearance, conditions } = useTodayConditions();
  const { profile } = useProfile();
  const { isPlus } = useSubscription();
  const { settings: planSettings } = useTrainingPlan();
  const { plan: planRequest } = useLocalSearchParams<{ plan?: string }>();
  const [mode, setMode] = useState<RunMode>('free');
  const [programIndex, setProgramIndex] = useState(0);
  const [planSessions, setPlanSessions] = useState<SessionRecord[] | null>(null);
  const [planHistoryFailed, setPlanHistoryFailed] = useState(false);

  const planEnabled = isPlus && planSettings !== null;

  // ประวัติใช้หาการซ้อมครั้งถัดไปของแผน โหลดใหม่ทุกครั้งที่กลับมาแท็บนี้ เพราะเพิ่งวิ่งจบไปก็ต้องขยับไป
  // การซ้อมครั้งถัดไปทันที โหลดเฉพาะคนที่ใช้แผนได้จริง คนอื่นไม่ต้องยิงฐานข้อมูลเพิ่มทุกครั้งที่เปิดแท็บ
  useFocusEffect(
    useCallback(() => {
      if (!planEnabled) return;
      let cancelled = false;
      listSessions()
        .then((found) => {
          if (cancelled) return;
          setPlanSessions(found);
          setPlanHistoryFailed(false);
        })
        .catch(() => {
          if (!cancelled) setPlanHistoryFailed(true);
        });
      return () => {
        cancelled = true;
      };
    }, [planEnabled])
  );

  // เก็บเป็น SessionTarget ก้อนเดียว ไม่แยกเป็น kind กับ magnitude สองตัวแปร
  // เพราะสองตัวแปรแยกกันมีจังหวะที่หลุดไม่ตรงกันได้ (เช่นลืมรีเซ็ต magnitude ตอนเปลี่ยน kind)
  // ส่วน kind และขนาดตัวเลขที่ต้องใช้แสดงผล ดึงจากก้อนเดียวกันนี้ด้วย target.kind และ magnitudeOf
  const [rawTarget, setRawTarget] = useState<SessionTarget>(
    buildSessionTarget('distance', KIND_CONFIG.distance.defaultMagnitude)
  );
  const [overrideConfirmed, setOverrideConfirmed] = useState(false);

  // มาจากปุ่มในหน้าแผนซ้อม เลือกโหมดโปรแกรมกับแผนซ้อมให้เลย ค่าที่ส่งมาเป็นเวลาที่กด จึงเปลี่ยนทุกครั้ง
  // ที่กดปุ่ม แม้ผู้ใช้จะเคยสลับไปโหมดอื่นหลังมาจากหน้าแผนซ้อมรอบก่อนแล้วก็ตาม
  useEffect(() => {
    if (!planRequest) return;
    setMode('program');
    setProgramIndex(PLAN_PROGRAM);
    setOverrideConfirmed(false);
  }, [planRequest]);

  const planWeek =
    planEnabled && planSessions !== null
      ? buildTrainingWeek({
          settings: planSettings,
          runs: planSessions.map((session) => ({
            at: session.finishedAt,
            distanceKm: session.distanceKm,
            movingSeconds: session.movingSeconds,
          })),
          now: Date.now(),
        })
      : null;
  const planWorkout = planWeek ? nextWorkout(planWeek) : null;
  const planProgram: RunProgram | null =
    planSettings !== null && planWorkout !== null
      ? {
          name: planProgramName(planSettings.goal, planWorkout),
          description: WORKOUT_HINT[planWorkout.kind],
          target: planWorkout.target,
        }
      : null;

  // เลือกแผนซ้อมไว้แต่แผนใช้ไม่ได้แล้ว (ยกเลิก Plus หรือซ้อมครบสัปดาห์) ถอยไปโปรแกรมแรกแทนการค้างว่าง
  const usingPlan = programIndex === PLAN_PROGRAM && planProgram !== null;
  const activeProgramIndex = usingPlan ? PLAN_PROGRAM : Math.max(0, programIndex);
  const program = usingPlan && planProgram ? planProgram : RUN_PROGRAMS[activeProgramIndex];
  const targetBeforeSafety = mode === 'program' ? program.target : rawTarget;
  const kind = rawTarget.kind;
  const magnitude = magnitudeOf(rawTarget);
  const level = clearance?.level ?? 'green';
  const reduction = reduceSessionTargetForClearance(targetBeforeSafety, level);
  const wasReduced = reduction.reason !== null;
  const effectiveTarget = !wasReduced || overrideConfirmed ? targetBeforeSafety : reduction.target;
  const sessionTarget = mode === 'free' ? null : effectiveTarget;
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
          estimatedMinutes: mode === 'free' ? 1 : summary.estimatedMinutes,
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
      <View style={styles.modeRow}>
        {(Object.keys(RUN_MODE_LABEL) as RunMode[]).map((option) => (
          <Pressable
            key={option}
            onPress={() => {
              setMode(option);
              setOverrideConfirmed(false);
            }}
            style={[
              styles.modeChip,
              {
                backgroundColor: option === mode ? colors.brand : colors.surfaceAlt,
                borderColor: option === mode ? colors.brand : colors.border,
              },
            ]}>
            <Ionicons
              name={RUN_MODE_ICON[option]}
              size={17}
              color={option === mode ? colors.onBrand : colors.textMuted}
            />
            <AppText variant="small" weight="semibold" color={option === mode ? colors.onBrand : colors.text}>
              {RUN_MODE_LABEL[option]}
            </AppText>
          </Pressable>
        ))}
      </View>

      {mode === 'free' ? (
        <Card background={colors.brandSoft}>
          <AppText variant="title" weight="bold">วิ่งอิสระ</AppText>
          <AppText variant="body" tone="muted">
            ไม่ต้องกำหนดระยะหรือเวลา วิ่งได้ตามต้องการและกดจบเมื่อคุณพร้อม
          </AppText>
          <View style={styles.readyRow}>
            <Ionicons name="location" size={18} color={colors.brandStrong} />
            <AppText variant="small" weight="semibold" color={colors.brandStrong}>
              GPS จะเริ่มทำงานเมื่อกดเริ่มวิ่ง
            </AppText>
          </View>
        </Card>
      ) : null}

      {mode === 'goal' ? (
        <>
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
              <AppText variant="small" tone="muted">กำหนดเอง</AppText>
              <View style={styles.stepper}>
                <Pressable
                  onPress={() => adjustMagnitude(-1)}
                  style={[styles.stepButton, { backgroundColor: colors.surfaceAlt }]}
                  accessibilityLabel="ลดเป้าหมายรอบนี้">
                  <AppText variant="heading" weight="bold">−</AppText>
                </Pressable>
                <AppText variant="heading" weight="bold" style={styles.stepValue}>
                  {kind === 'distance' ? magnitude.toFixed(1) : Math.round(magnitude)}
                </AppText>
                <Pressable
                  onPress={() => adjustMagnitude(1)}
                  style={[styles.stepButton, { backgroundColor: colors.surfaceAlt }]}
                  accessibilityLabel="เพิ่มเป้าหมายรอบนี้">
                  <AppText variant="heading" weight="bold">+</AppText>
                </Pressable>
              </View>
            </View>
          </Card>
        </>
      ) : null}

      {mode === 'program' ? (
        <View style={styles.programList}>
          <PlanProgramOption
            isPlus={isPlus}
            hasPlan={planSettings !== null}
            loading={planEnabled && planSessions === null && !planHistoryFailed}
            failed={planHistoryFailed}
            title={
              planSettings !== null && planWeek !== null
                ? `แผน ${GOAL_LABEL[planSettings.goal]} · สัปดาห์ที่ ${planWeek.weekNumber}`
                : null
            }
            workout={planWorkout ? workoutTitle(planWorkout) : null}
            hint={planProgram?.description ?? null}
            active={usingPlan}
            onSelect={() => {
              setProgramIndex(PLAN_PROGRAM);
              setOverrideConfirmed(false);
            }}
            onOpenPlan={() => router.push('/training-plan')}
            onUpgrade={() => router.push('/subscription')}
          />
          {RUN_PROGRAMS.map((option, index) => {
            const active = index === activeProgramIndex;
            return (
              <Pressable
                key={option.name}
                onPress={() => {
                  setProgramIndex(index);
                  setOverrideConfirmed(false);
                }}>
                <Card background={active ? colors.brandSoft : colors.surfaceAlt}>
                  <View style={styles.programHeader}>
                    <View style={styles.programCopy}>
                      <AppText variant="body" weight="semibold">{option.name}</AppText>
                      <AppText variant="small" tone="muted">{option.description}</AppText>
                    </View>
                    <AppText variant="small" weight="bold" color={active ? colors.brandStrong : colors.textMuted}>
                      {describeSessionTarget(option.target)}
                    </AppText>
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>
      ) : null}

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

      {mode !== 'free' && wasReduced && !overrideConfirmed ? (
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

      {sessionTarget ? <Card>
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
      </Card> : null}

      <Button
        label={
          mode === 'free'
            ? 'เริ่มวิ่งอิสระ'
            : mode === 'program'
              ? `เริ่ม${usingPlan && planWorkout ? workoutTitle(planWorkout) : program.name}`
              : 'เริ่มวิ่งตามเป้า'
        }
        onPress={() => {
          const targetParams = sessionTarget
            ? {
                targetKind: sessionTarget.kind,
                targetMagnitude: String(magnitudeOf(sessionTarget)),
                recommendedPaceSecPerKm: String(summary.recommendedPaceSecPerKm),
              }
            : {};
          router.push({
            pathname: '/live-run',
            params: {
              runMode: mode,
              ...(mode === 'program' ? { programName: program.name } : {}),
              ...targetParams,
            },
          });
        }}
      />
    </Screen>
  );
}

interface PlanProgramOptionProps {
  isPlus: boolean;
  hasPlan: boolean;
  loading: boolean;
  failed: boolean;
  title: string | null;
  workout: string | null;
  hint: string | null;
  active: boolean;
  onSelect: () => void;
  onOpenPlan: () => void;
  onUpgrade: () => void;
}

/**
 * ตัวเลือกโปรแกรมจากแผนซ้อม Plus อยู่บนสุดของรายการโปรแกรม
 *
 * ผู้ใช้ฟรีเห็นว่ามีตัวเลือกนี้แต่ล็อกอยู่ ผู้ใช้ Plus ที่ยังไม่ตั้งแผนได้ทางลัดไปตั้งแผน และคนที่มีแผนแล้ว
 * เลือกการซ้อมครั้งถัดไปได้ทันที เป้าหมายรอบนี้ยังผ่านการลดตามใบอนุญาตวิ่งด้านล่างเหมือนโปรแกรมอื่นทุกอย่าง
 */
function PlanProgramOption({
  isPlus,
  hasPlan,
  loading,
  failed,
  title,
  workout,
  hint,
  active,
  onSelect,
  onOpenPlan,
  onUpgrade,
}: PlanProgramOptionProps) {
  const { colors } = useTheme();

  if (!isPlus || !hasPlan || loading || failed || workout === null) {
    const [heading, detail, onPress, icon]: [string, string, () => void, keyof typeof Ionicons.glyphMap] = !isPlus
      ? ['แผนซ้อม 5K / 10K', 'ซ้อมตามแผนที่ปรับระดับทุกสัปดาห์จากการวิ่งจริงของคุณ', onUpgrade, 'lock-closed']
      : !hasPlan
        ? ['ตั้งแผนซ้อม 5K / 10K', 'เลือกระยะ วันที่สะดวก และเวลาซ้อม แล้วการซ้อมครั้งถัดไปจะขึ้นที่นี่', onOpenPlan, 'chevron-forward']
        : [
            title ?? 'แผนซ้อม',
            loading
              ? 'กำลังดูการซ้อมครั้งถัดไป…'
              : failed
                ? 'อ่านประวัติการวิ่งไม่ได้ แตะเพื่อเปิดแผนซ้อม'
                : 'ซ้อมครบทุกครั้งของสัปดาห์นี้แล้ว แตะเพื่อดูแผนซ้อม',
            onOpenPlan,
            'chevron-forward',
          ];

    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${heading} ${detail}${isPlus ? '' : ' ต้องใช้ Plus'}`}>
        <Card background={colors.surfaceAlt}>
          <View style={styles.programHeader}>
            <View style={styles.programCopy}>
              <View style={styles.planTitleRow}>
                <AppText variant="body" weight="semibold">
                  {heading}
                </AppText>
                <PlusBadge />
              </View>
              <AppText variant="small" tone="muted">
                {detail}
              </AppText>
            </View>
            <Ionicons name={icon} size={18} color={colors.textMuted} />
          </View>
        </Card>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onSelect} accessibilityRole="radio" accessibilityState={{ checked: active }}>
      <Card background={active ? colors.brandSoft : colors.surfaceAlt}>
        <View style={styles.programHeader}>
          <View style={styles.programCopy}>
            <View style={styles.planTitleRow}>
              <AppText variant="small" weight="semibold" color={colors.brandStrong}>
                {title}
              </AppText>
              <PlusBadge />
            </View>
            <AppText variant="body" weight="semibold">
              {workout}
            </AppText>
            {hint ? (
              <AppText variant="small" tone="muted">
                {hint}
              </AppText>
            ) : null}
          </View>
          <Pressable onPress={onOpenPlan} hitSlop={8} accessibilityRole="button" accessibilityLabel="เปิดแผนซ้อม">
            <Ionicons name="calendar-outline" size={20} color={active ? colors.brandStrong : colors.textMuted} />
          </Pressable>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  modeRow: { flexDirection: 'row', gap: spacing.sm },
  modeChip: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
  },
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
  readyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  programList: { gap: spacing.sm },
  programHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  programCopy: { flex: 1, gap: spacing.xs },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
});
