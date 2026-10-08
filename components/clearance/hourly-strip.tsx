import { ScrollView, StyleSheet, View } from 'react-native';

import { levelColors } from '@/components/clearance/colors';
import { formatTime } from '@/components/clearance/copy';
import { AppText } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';
import { indexOfHourAt, type HourClearance, type HourlyConditions } from '@/core/coach';
import { useTheme } from '@/hooks/use-theme';

const HOUR_MS = 60 * 60 * 1000;

interface Props {
  graded: HourClearance[];
  hours: HourlyConditions[];
  now: number;
}

/**
 * แถบเวลาทั้งวันระบายสีตามใบอนุญาตวิ่งของแต่ละชั่วโมง
 *
 * ทำให้ผู้ใช้เห็นภาพรวมทั้งวันในครั้งเดียวว่าช่วงไหนวิ่งได้
 * ซึ่งเป็นสิ่งที่ตัวเลขอุณหภูมิเดี่ยว ๆ บอกไม่ได้
 */
export function HourlyStrip({ graded, hours, now }: Props) {
  const { colors } = useTheme();
  const nowIndex = indexOfHourAt(graded, now);

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        {graded.map((hour, index) => (
          <View
            key={hour.at}
            style={[
              styles.segment,
              { backgroundColor: levelColors(colors, hour.level).foreground },
              index === nowIndex && styles.segmentNow,
              index === nowIndex && { borderColor: colors.text },
            ]}
          />
        ))}
      </View>

      <View style={styles.axis}>
        {axisLabels(graded).map((label, index) => (
          <AppText key={`${index}-${label}`} variant="caption" tone="faint">
            {label}
          </AppText>
        ))}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cells}>
        {graded.map((hour, index) => {
          const level = levelColors(colors, hour.level);
          const conditions = hours[index];

          return (
            <View
              key={hour.at}
              style={[
                styles.cell,
                { backgroundColor: level.background },
                index === nowIndex && { borderColor: level.foreground, borderWidth: 1 },
              ]}>
              <AppText variant="caption" tone="muted">
                {index === nowIndex ? 'ตอนนี้' : formatTime(hour.at)}
              </AppText>
              <AppText variant="body" weight="semibold" color={level.foreground}>
                {Math.round(conditions.apparentTemperature)}°
              </AppText>
              <AppText variant="caption" tone="faint">
                {conditions.pm25 === null ? '—' : Math.round(conditions.pm25)}
              </AppText>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

/**
 * ป้ายเวลาใต้แถบ อ่านจากชั่วโมงที่มีอยู่จริง
 *
 * ชั่วโมงที่ขาดข้อมูลถูกตัดทิ้งตั้งแต่ตอนแปลงข้อมูล แถบจึงไม่ได้มี 24 ช่องเสมอ
 * ถ้าเขียนป้ายตายตัวเป็น 00:00 06:00 12:00 18:00 ป้ายจะเลื่อนไม่ตรงกับสีที่อยู่ข้างบน
 */
function axisLabels(graded: HourClearance[]): string[] {
  if (graded.length === 0) return [];

  const positions = [0, 0.25, 0.5, 0.75].map((fraction) =>
    Math.floor(fraction * graded.length)
  );

  const labels = positions.map((index) => formatTime(graded[index].at));
  labels.push(formatTime(graded[graded.length - 1].at + HOUR_MS));

  return labels;
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  bar: { flexDirection: 'row', height: 12, borderRadius: radius.pill, overflow: 'hidden', gap: 1 },
  segment: { flex: 1 },
  segmentNow: { borderWidth: 2, borderRadius: 2 },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
  cells: { gap: spacing.sm, paddingVertical: spacing.xs },
  cell: {
    alignItems: 'center',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 62,
    gap: 2,
  },
});
