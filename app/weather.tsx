import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { levelColors } from '@/components/clearance/colors';
import { clearWindowSentence, formatTime, LEVEL_LABEL, reasonSentence } from '@/components/clearance/copy';
import { HourlyStrip } from '@/components/clearance/hourly-strip';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Legend } from '@/components/ui/legend';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { spacing } from '@/constants/theme';
import { gradeHourlyClearance } from '@/core/coach';
import { useTheme } from '@/hooks/use-theme';
import { useTodayConditions } from '@/hooks/use-today-conditions';
import type { Pm25Source } from '@/services/conditions';
import { FALLBACK_LOCATION_LABEL } from '@/services/location';

export default function WeatherScreen() {
  const { colors } = useTheme();
  const { status, clearance, conditions, location, error, evaluatedAt, reload } =
    useTodayConditions();

  if (status === 'loading') {
    return (
      <Screen title="สภาพอากาศ" back scroll={false}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
          <AppText variant="small" tone="muted">
            กำลังดึงข้อมูลอากาศและฝุ่น
          </AppText>
        </View>
      </Screen>
    );
  }

  if (status === 'error' || clearance === null || conditions === null) {
    return (
      <Screen title="สภาพอากาศ" back>
        <Card>
          <AppText variant="heading" weight="semibold">
            ดึงข้อมูลไม่สำเร็จ
          </AppText>
          <AppText variant="body" tone="muted">
            {error ?? 'ไม่ทราบสาเหตุ'}
          </AppText>
          <Button label="ลองอีกครั้ง" onPress={reload} variant="secondary" />
        </Card>
      </Screen>
    );
  }

  const level = levelColors(colors, clearance.level);
  const reason = reasonSentence(clearance.decidedBy);
  const graded = gradeHourlyClearance(conditions.hours, conditions.sunrise, conditions.sunset);

  return (
    <Screen title="สภาพอากาศ" back>
      {location?.isFallback ? (
        <Card background={colors.surfaceAlt}>
          <AppText variant="small" tone="muted">
            ไม่ได้รับสิทธิ์เข้าถึงตำแหน่ง กำลังแสดงข้อมูลของ {FALLBACK_LOCATION_LABEL}
          </AppText>
        </Card>
      ) : null}

      <Card background={level.background}>
        <AppText variant="title" weight="bold" color={level.foreground}>
          {LEVEL_LABEL[clearance.level]}
        </AppText>
        <AppText variant="body" weight="medium">
          {clearWindowSentence(clearance.clearWindow, evaluatedAt)}
        </AppText>
        {reason ? (
          <AppText variant="small" color={level.foreground}>
            เพราะ {reason}
          </AppText>
        ) : null}
      </Card>

      <Card>
        <AppText variant="heading" weight="semibold">
          ทั้งวันนี้
        </AppText>
        <HourlyStrip graded={graded} hours={conditions.hours} now={evaluatedAt} />
        <View style={styles.legend}>
          <Legend color={colors.clearGreen} label="วิ่งได้" />
          <Legend color={colors.clearYellow} label="ลดความหนัก" />
          <Legend color={colors.clearRed} label="งดวิ่ง" />
        </View>
        <AppText variant="caption" tone="faint">
          ตัวเลขบนคือรู้สึกเหมือนกี่องศา ตัวเลขล่างคือ PM2.5
          {conditions.pm25Source.kind === 'station'
            ? ' โดยมีเฉพาะชั่วโมงปัจจุบันที่ใช้ค่าจากสถานีตรวจวัดจริง ชั่วโมงอื่นเป็นค่าจากแบบจำลอง'
            : ''}
        </AppText>
      </Card>

      <Card>
        <AppText variant="heading" weight="semibold">
          ค่าตอนนี้
        </AppText>
        <Row
          label="อุณหภูมิจริง"
          value={conditions.temperatureNow === null ? 'ไม่ทราบ' : `${Math.round(conditions.temperatureNow)}°C`}
        />
        <Row
          label="ความชื้น"
          value={conditions.humidityNow === null ? 'ไม่ทราบ' : `${Math.round(conditions.humidityNow)}%`}
        />
        <Row
          label="PM2.5"
          value={
            conditions.pm25Now === null
              ? 'ไม่มีข้อมูล'
              : `${conditions.pm25Now.toFixed(1)} µg/m³`
          }
        />
        <Row label="พระอาทิตย์ขึ้น" value={formatTime(conditions.sunrise)} />
        <Row label="พระอาทิตย์ตก" value={formatTime(conditions.sunset)} />
      </Card>

      <Card background={colors.surfaceAlt}>
        <View style={styles.sourceHeader}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
          <AppText variant="small" weight="semibold" tone="muted">
            ที่มาของค่า PM2.5
          </AppText>
        </View>
        <AppText variant="small" tone="muted">
          {describeSource(conditions.pm25Source)}
        </AppText>
        <AppText variant="caption" tone="faint">
          อากาศจาก Open-Meteo · ฝุ่นจาก Air4Thai กรมควบคุมมลพิษ
        </AppText>
      </Card>

      <Button label="ดึงข้อมูลใหม่" onPress={reload} variant="secondary" />
    </Screen>
  );
}

/**
 * บอกตรง ๆ ว่าตัวเลขที่เห็นมาจากไหน
 *
 * ผู้ใช้ประเมินความน่าเชื่อถือเองได้ก็ต่อเมื่อรู้ว่าสถานีอยู่ห่างแค่ไหน
 * และการบอกว่า "ไม่มีข้อมูล" ตรง ๆ ดีกว่าปล่อยให้เข้าใจว่าอากาศดี
 */
function describeSource(source: Pm25Source): string {
  if (source.kind === 'none') {
    return 'ตอนนี้ไม่มีข้อมูล PM2.5 จากทั้งสถานีตรวจวัดและแบบจำลอง จึงยังประเมินเรื่องฝุ่นไม่ได้';
  }

  if (source.kind === 'model') {
    return 'ไม่มีสถานีตรวจวัดที่ส่งข้อมูลอยู่ กำลังใช้ค่าจากแบบจำลองของ Open-Meteo ซึ่งหยาบกว่าค่าจากสถานีจริง';
  }

  const { nameTH, areaTH, distanceFromUserKm, observedAt } = source.reading;
  return `สถานี ${nameTH} (${areaTH}) ห่างจากคุณ ${distanceFromUserKm.toFixed(1)} กม. วัดเมื่อ ${observedAt}`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <AppText variant="body" tone="muted">
        {label}
      </AppText>
      <AppText variant="body" weight="semibold">
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  legend: { flexDirection: 'row', gap: spacing.lg },
  sourceHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
