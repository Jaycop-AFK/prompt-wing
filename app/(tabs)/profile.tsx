import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';

import {
  BMI_ADVICE,
  BMI_COLOR_KEY,
  BMI_LABEL,
  OBJECTIVE_EFFECT,
  OBJECTIVE_LABEL,
  OBJECTIVE_ORDER,
  SEX_LABEL,
  SEX_ORDER,
} from '@/components/profile/copy';
import { BodyTrend } from '@/components/profile/body-trend';
import { MeasurementGuide } from '@/components/profile/measurement-guide';
import { PlanStatusCard } from '@/components/plus/plan-status-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { fontFamily, radius, spacing } from '@/constants/theme';
import {
  bmiCategoryOf,
  BMI_BANDS,
  calculateNavyBodyFat,
  calculateBmi,
  PROFILE_FIELD_RANGE,
  type ProfileNumericField,
  type RunnerProfile,
} from '@/core/coach';
import { useProfile } from '@/hooks/use-profile';
import { useTheme } from '@/hooks/use-theme';
import { nativeHealthProvider, syncNativeBodyMetrics } from '@/services/health-sync';
import {
  loadBodyMeasurementHistory,
  type BodyMeasurementHistoryEntry,
} from '@/storage/body-measurement-storage';

/** ช่วงที่แถบ BMI แสดง ต่ำกว่า 15 หรือสูงกว่า 40 พบได้น้อยมากและทำให้แถบบีบจนอ่านไม่ออก
 * เป็นเรื่องของการแสดงผลอย่างเดียว ไม่ใช่เกณฑ์ทางสุขภาพ เกณฑ์จริงอยู่ใน core/coach/bmi.ts */
const BAR_MIN = 15;
const BAR_MAX = 40;

const VISIBLE_BANDS = BMI_BANDS;

/** ความกว้างของแท่งตามสัดส่วนของช่วงจริง โดยตัดที่ขอบของกราฟ ป้ายตัวเลขใช้ตัวเดียวกันจะได้ตรงกัน */
function bandWidth(band: (typeof BMI_BANDS)[number]): number {
  return Math.min(band.max, BAR_MAX) - Math.max(band.min, BAR_MIN);
}

type NumericField = ProfileNumericField;

const FIELDS: { key: NumericField; label: string; unit: string }[] = [
  { key: 'weightKg', label: 'น้ำหนัก', unit: 'กก.' },
  { key: 'heightCm', label: 'ส่วนสูง', unit: 'ซม.' },
  { key: 'age', label: 'อายุ', unit: 'ปี' },
];

const COMPOSITION_FIELDS = {
  circumference: [
    { key: 'waistCm', label: 'รอบเอว', unit: 'ซม.' },
    { key: 'neckCm', label: 'รอบคอ', unit: 'ซม.' },
  ],
  bia: [
    { key: 'bodyFatPercent', label: 'ไขมัน', unit: '%' },
    { key: 'muscleMassKg', label: 'กล้ามเนื้อ', unit: 'กก.' },
    { key: 'visceralFatLevel', label: 'ไขมันช่องท้อง', unit: 'ระดับ' },
  ],
} satisfies Record<string, { key: NumericField; label: string; unit: string }[]>;

const BODY_MEASUREMENT_FIELDS = new Set<NumericField>([
  'weightKg',
  'heightCm',
  'waistCm',
  'neckCm',
  'hipCm',
  'bodyFatPercent',
  'muscleMassKg',
  'visceralFatLevel',
]);

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function formatMeasuredAt(value: string | null): string {
  if (!value) return 'ยังไม่มีข้อมูล';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'ยังไม่มีข้อมูล';
  return `${date.getDate()} ${THAI_MONTHS[date.getMonth()]} ${date.getFullYear() + 543} · ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const { profile, saveStatus, retrySave, update } = useProfile();
  const compact = width < 420;
  const [history, setHistory] = useState<BodyMeasurementHistoryEntry[]>([]);
  const [syncingHealth, setSyncingHealth] = useState(false);

  useEffect(() => {
    if (saveStatus === 'saving' || saveStatus === 'error') return;
    let cancelled = false;
    loadBodyMeasurementHistory()
      .then((entries) => {
        if (!cancelled) setHistory(entries);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [saveStatus]);

  const bmi = calculateBmi(profile.weightKg, profile.heightCm);
  const category = bmi === null ? null : bmiCategoryOf(bmi);
  const navyBodyFat = calculateNavyBodyFat({
    sex: profile.sex,
    heightCm: profile.heightCm,
    waistCm: profile.waistCm,
    neckCm: profile.neckCm,
    hipCm: profile.hipCm,
  });
  const displayedBodyFat = profile.bodyCompositionMethod === 'bia' ? profile.bodyFatPercent : navyBodyFat;

  // เก็บสิ่งที่ผู้ใช้กำลังพิมพ์อยู่แยกจากค่าที่บันทึกจริง เพราะระหว่างพิมพ์ "175" จะผ่าน "1" กับ "17"
  // ซึ่งอยู่นอกช่วงที่ยอมรับทั้งคู่ ถ้าปฏิเสธทันทีผู้ใช้จะพิมพ์เลขสองหลักขึ้นไปไม่ได้เลย
  const [drafts, setDrafts] = useState<Partial<Record<NumericField, string>>>({});

  const setNumber = (key: NumericField, text: string) => {
    const normalized = text.replace(',', '.');
    const digits = key === 'age'
      ? normalized.replace(/[^0-9]/g, '')
      : normalized.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    setDrafts((current) => ({ ...current, [key]: digits }));

    const { min, max } = PROFILE_FIELD_RANGE[key];
    const value = Number(digits);
    // บันทึกเฉพาะค่าที่อยู่ในช่วงที่ที่เก็บยอมรับจริง ไม่งั้นค่าจะหายไปเงียบ ๆ ตอนเปิดแอปใหม่
    const valid = digits !== '' && value >= min && value <= max;
    if (digits === '') {
      update({ [key]: null } as Partial<RunnerProfile>);
    } else if (valid) {
      update({
        [key]: value,
        ...(BODY_MEASUREMENT_FIELDS.has(key) ? { bodyMeasuredAt: new Date().toISOString() } : {}),
      } as Partial<RunnerProfile>);
    }
  };

  const fillDemoHealthData = (source: 'Apple Health' | 'Google Fit') => {
    const bodyFatPercent = profile.sex === 'female' ? 27.4 : 19.8;
    const muscleMassKg = profile.weightKg ? Number((profile.weightKg * 0.42).toFixed(1)) : 28.6;
    update({
      bodyCompositionMethod: 'bia',
      bodyFatPercent,
      muscleMassKg,
      visceralFatLevel: 7,
      bodyMeasuredAt: new Date().toISOString(),
    });
    setDrafts((current) => ({ ...current, bodyFatPercent: String(bodyFatPercent), muscleMassKg: String(muscleMassKg), visceralFatLevel: '7' }));
    Alert.alert('ซิงก์ข้อมูลจำลองแล้ว', `${source} ในหน้านี้เป็น Demo ยังไม่ได้อ่านข้อมูลสุขภาพจริงจากเครื่อง`);
  };

  const syncRealHealthData = async () => {
    if (syncingHealth) return;
    setSyncingHealth(true);
    try {
      const metrics = await syncNativeBodyMetrics();
      const weightKg = metrics.weightKg !== null && metrics.weightKg >= PROFILE_FIELD_RANGE.weightKg.min && metrics.weightKg <= PROFILE_FIELD_RANGE.weightKg.max
        ? Number(metrics.weightKg.toFixed(1))
        : null;
      const bodyFatPercent = metrics.bodyFatPercent !== null && metrics.bodyFatPercent >= PROFILE_FIELD_RANGE.bodyFatPercent.min && metrics.bodyFatPercent <= PROFILE_FIELD_RANGE.bodyFatPercent.max
        ? Number(metrics.bodyFatPercent.toFixed(1))
        : null;
      if (weightKg === null && bodyFatPercent === null && metrics.leanBodyMassKg === null) {
        Alert.alert('ยังไม่มีข้อมูล', `ไม่พบข้อมูลร่างกายใน ${metrics.source} ช่วง 1 ปีล่าสุด`);
        return;
      }

      update({
        bodyCompositionMethod: 'bia',
        ...(weightKg === null ? {} : { weightKg }),
        ...(bodyFatPercent === null ? {} : { bodyFatPercent }),
        bodyMeasuredAt: metrics.measuredAt,
      });
      setDrafts((current) => ({
        ...current,
        ...(weightKg === null ? {} : { weightKg: String(weightKg) }),
        ...(bodyFatPercent === null ? {} : { bodyFatPercent: String(bodyFatPercent) }),
      }));
      const imported = [weightKg === null ? null : 'น้ำหนัก', bodyFatPercent === null ? null : 'ไขมัน']
        .filter(Boolean)
        .join(' และ ');
      Alert.alert(
        'ซิงก์สำเร็จ',
        `${metrics.source}: ${imported || 'พบเฉพาะมวลไร้ไขมัน'}${metrics.leanBodyMassKg === null ? '' : '\nมวลไร้ไขมันไม่ถูกแทนเป็นมวลกล้ามเนื้อ เพราะเป็นคนละค่า'}`
      );
    } catch (error) {
      Alert.alert('เชื่อมต่อไม่สำเร็จ', error instanceof Error ? error.message : 'ลองใหม่อีกครั้ง');
    } finally {
      setSyncingHealth(false);
    }
  };

  const draftOf = (key: NumericField): string => {
    const draft = drafts[key];
    if (draft !== undefined) return draft;
    return profile[key] === null ? '' : String(profile[key]);
  };

  const [blurred, setBlurred] = useState<Partial<Record<NumericField, boolean>>>({});

  /**
   * ควรเตือนว่าค่านอกช่วงหรือยัง
   *
   * ระหว่างพิมพ์ "175" จะผ่าน "1" กับ "17" ซึ่งต่ำกว่าขั้นต่ำทั้งคู่ ถ้าเตือนทันทีผู้ใช้จะเห็นกรอบแดง
   * ตั้งแต่ตัวเลขตัวแรกของทุกช่อง ซึ่งกวนกว่ามีประโยชน์ จึงเตือนเฉพาะสองกรณี คือค่าเกินขั้นสูงไปแล้ว
   * (พิมพ์ต่อมีแต่จะเกินหนักขึ้น ไม่มีทางกลับมาถูกได้) หรือผู้ใช้ออกจากช่องไปแล้วทั้งที่ค่ายังไม่ถูก
   */
  const outOfRange = (key: NumericField): boolean => {
    const draft = drafts[key];
    if (draft === undefined || draft === '') return false;

    const { min, max } = PROFILE_FIELD_RANGE[key];
    const value = Number(draft);

    if (value > max) return true;
    return blurred[key] === true && value < min;
  };

  return (
    <Screen title="โปรไฟล์" headerRight={<ThemeToggle />}>
      <PlanStatusCard />

      <Card>
        <View style={styles.sectionHeader}>
          <AppText variant="heading" weight="semibold">ข้อมูลร่างกาย</AppText>
          <Pressable
            disabled={saveStatus !== 'error'}
            onPress={retrySave}
            accessibilityRole={saveStatus === 'error' ? 'button' : 'text'}
            accessibilityLabel={saveStatus === 'error' ? 'บันทึกไม่สำเร็จ แตะเพื่อลองใหม่' : undefined}
            style={styles.saveStatus}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    saveStatus === 'error'
                      ? colors.clearRed
                      : saveStatus === 'saving'
                        ? colors.clearYellow
                        : colors.clearGreen,
                },
              ]}
            />
            <AppText
              variant="caption"
              color={saveStatus === 'error' ? colors.clearRed : colors.textMuted}>
              {saveStatus === 'saving'
                ? 'กำลังบันทึก…'
                : saveStatus === 'saved'
                  ? 'บันทึกแล้ว'
                  : saveStatus === 'error'
                    ? 'บันทึกไม่สำเร็จ · ลองใหม่'
                    : 'บันทึกอัตโนมัติ'}
            </AppText>
          </Pressable>
        </View>
        <AppText variant="small" tone="muted">
          น้ำหนักกับส่วนสูงใช้คำนวณ BMI และน้ำหนักใช้คำนวณแคลอรีให้ใกล้เคียงตัวคุณจริง
          อายุใช้ปรับคำแนะนำ ส่วนเพศใช้เฉพาะสูตรประมาณไขมัน ข้อมูลบันทึกในบัญชีของคุณ
        </AppText>

        {FIELDS.map(({ key, label, unit }) => {
          const invalid = outOfRange(key);
          const { min, max } = PROFILE_FIELD_RANGE[key];

          return (
            <View key={key} style={styles.field}>
              <View style={styles.fieldRow}>
                <AppText variant="body">{label}</AppText>
                <View style={styles.inputWrap}>
                  <TextInput
                    value={draftOf(key)}
                    onChangeText={(text) => setNumber(key, text)}
                    onFocus={() => setBlurred((current) => ({ ...current, [key]: false }))}
                    onBlur={() => setBlurred((current) => ({ ...current, [key]: true }))}
                    keyboardType="number-pad"
                    maxLength={String(max).length}
                    placeholder="—"
                    placeholderTextColor={colors.textFaint}
                    accessibilityLabel={label}
                    style={[
                      styles.input,
                      {
                        color: colors.text,
                        backgroundColor: colors.surfaceAlt,
                        borderColor: invalid ? colors.clearRed : colors.border,
                      },
                    ]}
                  />
                  <AppText variant="small" tone="muted" style={styles.unit}>
                    {unit}
                  </AppText>
                </View>
              </View>
              {invalid ? (
                <AppText variant="caption" color={colors.clearRed} align="right">
                  กรอกได้ระหว่าง {min} ถึง {max} {unit} ค่านอกช่วงนี้จะไม่ถูกบันทึก
                </AppText>
              ) : null}
            </View>
          );
        })}

        <View style={styles.fieldRow}>
          <AppText variant="body">เพศ</AppText>
          <View style={styles.chipRow}>
            {SEX_ORDER.map((option) => {
              const active = profile.sex === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => update({ sex: active ? null : option })}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? colors.brandSoft : colors.surfaceAlt,
                      borderColor: active ? colors.brand : colors.border,
                    },
                  ]}>
                  <AppText
                    variant="small"
                    weight="semibold"
                    color={active ? colors.brandStrong : colors.text}>
                    {SEX_LABEL[option]}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Card>

      <Card>
        <View style={styles.sectionHeader}>
          <AppText variant="heading" weight="semibold">BMI และองค์ประกอบร่างกาย</AppText>
          <AppText variant="caption" tone="faint" align="right">
            วัดล่าสุด {formatMeasuredAt(profile.bodyMeasuredAt)}
          </AppText>
        </View>

        {bmi === null || category === null ? (
          <AppText variant="body" tone="muted">
            กรอกน้ำหนักและส่วนสูงด้านบนแล้ว BMI จะขึ้นที่นี่
          </AppText>
        ) : (
          <>
            <View style={styles.bmiHeader}>
              <AppText variant="display" weight="bold">
                {bmi.toFixed(1)}
              </AppText>
              <View style={[styles.badge, { backgroundColor: colors[BMI_COLOR_KEY[category]] }]}>
                <AppText variant="small" weight="semibold" color={colors.onBrand}>
                  {BMI_LABEL[category]}
                </AppText>
              </View>
            </View>

            <View style={styles.bandRow}>
              {VISIBLE_BANDS.map((band) => (
                <View
                  key={band.category}
                  style={[
                    styles.band,
                    {
                      flex: bandWidth(band),
                      backgroundColor: colors[BMI_COLOR_KEY[band.category]],
                      opacity: band.category === category ? 1 : 0.35,
                    },
                  ]}
                />
              ))}
            </View>
            <View style={styles.bandLabels}>
              {VISIBLE_BANDS.map((band) => (
                <View key={band.category} style={{ flex: bandWidth(band) }}>
                  <AppText variant="caption" tone="faint">
                    {band.min === 0 ? BAR_MIN : band.min}
                  </AppText>
                </View>
              ))}
              <AppText variant="caption" tone="faint">
                {BAR_MAX}
              </AppText>
            </View>

            <AppText variant="body" tone="muted">
              {BMI_ADVICE[category]}
            </AppText>
            <AppText variant="caption" tone="faint">
              ใช้เกณฑ์ของกรมอนามัย ซึ่งต่ำกว่าเกณฑ์สากลเพราะคนไทยเสี่ยงตั้งแต่ค่าที่ต่ำกว่า
              BMI เป็นค่าคร่าว ๆ ไม่ได้แยกกล้ามเนื้อกับไขมัน คนที่กล้ามเนื้อเยอะอาจได้ค่าสูงโดยไม่ได้อ้วน
              คำแนะนำข้างต้นเป็นแนวทางการวิ่งทั่วไป ไม่ใช่คำวินิจฉัยทางการแพทย์
            </AppText>
          </>
        )}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.methodRow}>
          {([
            ['circumference', 'วัดสัดส่วน'],
            ['bia', 'กรอกจากเครื่องชั่ง'],
          ] as const).map(([method, label]) => {
            const active = profile.bodyCompositionMethod === method;
            return (
              <Pressable
                key={method}
                onPress={() => update({ bodyCompositionMethod: method })}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.methodChip, { backgroundColor: active ? colors.brandSoft : colors.surfaceAlt, borderColor: active ? colors.brand : colors.border }]}>
                <AppText variant="small" weight="semibold" color={active ? colors.brandStrong : colors.text}>{label}</AppText>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.compGrid}>
          {[
            ...COMPOSITION_FIELDS[profile.bodyCompositionMethod],
            ...(profile.bodyCompositionMethod === 'circumference' && profile.sex === 'female'
              ? [{ key: 'hipCm' as NumericField, label: 'รอบสะโพก', unit: 'ซม.' }]
              : []),
          ].map(({ key, label, unit }) => (
            <View key={key} style={[styles.compField, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <AppText variant="caption" tone="muted">{label}</AppText>
              <View style={styles.compInputRow}>
                <TextInput
                  value={draftOf(key)}
                  onChangeText={(text) => setNumber(key, text)}
                  keyboardType="decimal-pad"
                  placeholder="—"
                  placeholderTextColor={colors.textFaint}
                  accessibilityLabel={label}
                  style={[styles.compInput, { color: colors.text }]}
                />
                <AppText variant="caption" tone="muted">{unit}</AppText>
              </View>
            </View>
          ))}
        </View>

        {profile.bodyCompositionMethod === 'circumference' && !profile.sex ? (
          <AppText variant="caption" tone="muted">เลือกเพศด้านบนเพื่อคำนวณ และระบบจะแสดงรอบสะโพกเฉพาะผู้หญิง</AppText>
        ) : null}

        {profile.bodyCompositionMethod === 'circumference' ? (
          <MeasurementGuide female={profile.sex === 'female'} />
        ) : null}

        <View style={[styles.summary, compact && styles.summaryCompact, { backgroundColor: colors.brandSoft }]}>
          <View style={compact && styles.summaryItem}><AppText variant="caption" tone="muted">BMI</AppText><AppText weight="bold">{bmi?.toFixed(1) ?? '—'}</AppText></View>
          <View style={compact && styles.summaryItem}><AppText variant="caption" tone="muted">ไขมัน</AppText><AppText weight="bold">{displayedBodyFat ? `${displayedBodyFat.toFixed(1)}%` : '—'}</AppText></View>
          <View style={compact && styles.summaryItem}><AppText variant="caption" tone="muted">กล้ามเนื้อ</AppText><AppText weight="bold">{profile.muscleMassKg ? `${profile.muscleMassKg} กก.` : '—'}</AppText></View>
          <View style={compact && styles.summaryItem}><AppText variant="caption" tone="muted">ช่องท้อง</AppText><AppText weight="bold">{profile.visceralFatLevel ?? '—'}</AppText></View>
        </View>

        <View style={styles.syncRow}>
          <AppText variant="caption" tone="muted">แหล่งข้อมูลสุขภาพ</AppText>
          <View style={styles.syncButtons}>
            <Pressable
              disabled={syncingHealth}
              onPress={syncRealHealthData}
              accessibilityRole="button"
              accessibilityState={{ disabled: syncingHealth }}
              style={[styles.syncButton, { borderColor: colors.brand, backgroundColor: colors.brandSoft }, syncingHealth && styles.syncDisabled]}>
              <AppText variant="caption" weight="semibold" color={colors.brandStrong}>{syncingHealth ? 'กำลังเชื่อมต่อ…' : `เชื่อม ${nativeHealthProvider}`}</AppText>
            </Pressable>
            <Pressable onPress={() => fillDemoHealthData('Apple Health')} style={[styles.syncButton, { borderColor: colors.border }]}><AppText variant="caption">ใช้ข้อมูล Demo</AppText></Pressable>
          </View>
        </View>
        <BodyTrend entries={history} bmiColor={colors.brand} fatColor={colors.clearYellow} />
        <AppText variant="caption" tone="faint">ค่าจากสัดส่วนเป็นเพียงค่าประมาณ ไม่ใช่ผลวินิจฉัยทางการแพทย์</AppText>
      </Card>

      <Card>
        <AppText variant="heading" weight="semibold">
          เป้าหมายระยะยาว
        </AppText>
        <AppText variant="small" tone="muted">
          เหตุผลที่คุณวิ่ง เปลี่ยนแล้วเป้าหมายรายวันบนหน้าแรกจะขยับตามทันที
        </AppText>

        {OBJECTIVE_ORDER.map((option) => {
          const active = profile.objective === option;
          return (
            <Pressable
              key={option}
              onPress={() => update({ objective: option })}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[
                styles.objectiveRow,
                {
                  backgroundColor: active ? colors.brandSoft : colors.surfaceAlt,
                  borderColor: active ? colors.brand : colors.border,
                },
              ]}>
              <AppText
                variant="body"
                weight="semibold"
                color={active ? colors.brandStrong : colors.text}>
                {OBJECTIVE_LABEL[option]}
              </AppText>
              <AppText variant="caption" tone="muted">
                {OBJECTIVE_EFFECT[option]}
              </AppText>
            </Pressable>
          );
        })}
      </Card>

      <Card>
        <AppText variant="heading" weight="semibold">
          ประวัติการวิ่ง
        </AppText>
        <AppText variant="body" tone="muted">
          ระยะทางรายสัปดาห์ รายเดือน และรายปี พร้อมแนวโน้มคะแนนฟอร์มการวิ่งย้อนหลัง
        </AppText>
        <Button
          label="ดูประวัติการวิ่ง"
          onPress={() => router.push('/run-history')}
          variant="secondary"
        />
      </Card>

      <Card>
        <AppText variant="heading" weight="semibold">
          เพิ่มเติม
        </AppText>
        <AppText variant="body" tone="muted">
          การแจ้งเตือน หน่วยการวัด ภาษา ช่วยเหลือ เกี่ยวกับเรา และออกจากระบบ
        </AppText>
        <Button label="ดูเพิ่มเติม" onPress={() => router.push('/settings')} variant="secondary" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, flexWrap: 'wrap' },
  saveStatus: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 32 },
  statusDot: { width: 7, height: 7, borderRadius: radius.pill },
  field: { gap: spacing.xs },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: {
    minWidth: 76,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    textAlign: 'center',
    fontFamily: fontFamily.semibold,
    fontSize: 16,
  },
  unit: { minWidth: 28 },
  chipRow: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  bmiHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  bandRow: { flexDirection: 'row', gap: 2, height: 10 },
  band: { borderRadius: radius.sm },
  bandLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  objectiveRow: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: 2,
  },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.xs },
  methodRow: { flexDirection: 'row', gap: spacing.sm },
  methodChip: { flex: 1, alignItems: 'center', borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, padding: spacing.sm },
  compGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  compField: { flexGrow: 1, flexBasis: '45%', borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  compInputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  compInput: { minWidth: 48, paddingVertical: 2, fontFamily: fontFamily.semibold, fontSize: 18 },
  summary: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, borderRadius: radius.md, padding: spacing.md },
  summaryCompact: { flexWrap: 'wrap' },
  summaryItem: { flexBasis: '44%', flexGrow: 1 },
  syncRow: { gap: spacing.xs },
  syncButtons: { flexDirection: 'row', gap: spacing.sm },
  syncButton: { flex: 1, alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: spacing.sm },
  syncDisabled: { opacity: 0.55 },
});
