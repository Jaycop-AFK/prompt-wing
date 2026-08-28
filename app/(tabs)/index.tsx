import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ClearanceCard } from '@/components/clearance/clearance-card';
import { DailyGoalCard } from '@/components/profile/daily-goal-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTodayConditions } from '@/hooks/use-today-conditions';
import { FALLBACK_LOCATION_LABEL } from '@/services/location';

/** คำทักทายตามช่วงเวลาของวัน */
function greeting(now: number): string {
  const hour = new Date(now).getHours();
  if (hour < 12) return 'สวัสดีตอนเช้า';
  if (hour < 17) return 'สวัสดีตอนบ่าย';
  return 'สวัสดีตอนเย็น';
}

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { status, clearance, conditions, location, error, evaluatedAt, reload } =
    useTodayConditions();

  return (
    <Screen title="พร้อมวิ่ง" headerRight={<ThemeToggle />}>
      <View style={styles.greeting}>
        <AppText variant="small" tone="muted">
          {greeting(evaluatedAt || Date.now())}
        </AppText>
        <AppText variant="title" weight="bold">
          พร้อมวิ่งหรือยัง
        </AppText>
        {location?.isFallback ? (
          <AppText variant="caption" tone="faint">
            แสดงข้อมูลของ {FALLBACK_LOCATION_LABEL} เพราะยังไม่ได้รับสิทธิ์เข้าถึงตำแหน่ง
          </AppText>
        ) : null}
      </View>

      {status === 'loading' ? (
        <Card>
          <View style={styles.loading}>
            <ActivityIndicator color={colors.brand} />
            <AppText variant="small" tone="muted">
              กำลังตรวจอากาศและฝุ่นรอบตัวคุณ
            </AppText>
          </View>
        </Card>
      ) : null}

      {status === 'error' ? (
        <Card>
          <AppText variant="heading" weight="semibold">
            ยังบอกไม่ได้ว่าวันนี้วิ่งได้ไหม
          </AppText>
          <AppText variant="body" tone="muted">
            {error ?? 'ดึงข้อมูลไม่สำเร็จ'}
          </AppText>
          <Button label="ลองอีกครั้ง" onPress={reload} variant="secondary" />
        </Card>
      ) : null}

      {status === 'ready' && clearance !== null && conditions !== null ? (
        <ClearanceCard
          clearance={clearance}
          conditions={conditions}
          now={evaluatedAt}
          onPress={() => router.push('/weather')}
        />
      ) : null}

      <DailyGoalCard />

      <Card>
        <AppText variant="heading" weight="semibold">
          วอร์มอัพ
        </AppText>
        <AppText variant="body" tone="muted">
          ชุดท่าที่เลือกมาให้สำหรับวันนี้โดยเฉพาะ ตามอากาศตอนนี้และปรับความยาวได้
        </AppText>
        <Button label="เริ่มวอร์มอัพ" onPress={() => router.push('/warmup')} variant="secondary" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  greeting: { gap: spacing.xs },
  loading: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
});
