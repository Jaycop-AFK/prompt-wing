import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

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
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { fontFamily, radius, spacing } from '@/constants/theme';
import {
  bmiCategoryOf,
  BMI_BANDS,
  calculateBmi,
  PROFILE_FIELD_RANGE,
  type ProfileNumericField,
  type RunnerProfile,
} from '@/core/coach';
import { useProfile } from '@/hooks/use-profile';
import { useTheme } from '@/hooks/use-theme';

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

export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { profile, update } = useProfile();

  const bmi = calculateBmi(profile.weightKg, profile.heightCm);
  const category = bmi === null ? null : bmiCategoryOf(bmi);

  // เก็บสิ่งที่ผู้ใช้กำลังพิมพ์อยู่แยกจากค่าที่บันทึกจริง เพราะระหว่างพิมพ์ "175" จะผ่าน "1" กับ "17"
  // ซึ่งอยู่นอกช่วงที่ยอมรับทั้งคู่ ถ้าปฏิเสธทันทีผู้ใช้จะพิมพ์เลขสองหลักขึ้นไปไม่ได้เลย
  const [drafts, setDrafts] = useState<Partial<Record<NumericField, string>>>({});

  const setNumber = (key: NumericField, text: string) => {
    const digits = text.replace(/[^0-9]/g, '');
    setDrafts((current) => ({ ...current, [key]: digits }));

    const { min, max } = PROFILE_FIELD_RANGE[key];
    const value = Number(digits);
    // บันทึกเฉพาะค่าที่อยู่ในช่วงที่ที่เก็บยอมรับจริง ไม่งั้นค่าจะหายไปเงียบ ๆ ตอนเปิดแอปใหม่
    const valid = digits !== '' && value >= min && value <= max;
    update({ [key]: digits === '' ? null : valid ? value : null } as Partial<RunnerProfile>);
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
      <Card>
        <AppText variant="heading" weight="semibold">
          ข้อมูลร่างกาย
        </AppText>
        <AppText variant="small" tone="muted">
          น้ำหนักกับส่วนสูงใช้คำนวณ BMI และน้ำหนักใช้คำนวณแคลอรีให้ใกล้เคียงตัวคุณจริง
          ส่วนอายุกับเพศยังไม่ถูกนำไปคำนวณอะไรในเวอร์ชันนี้ เก็บไว้ในเครื่องเท่านั้น ไม่ได้ส่งไปไหน
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
        <AppText variant="heading" weight="semibold">
          BMI
        </AppText>

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
});
