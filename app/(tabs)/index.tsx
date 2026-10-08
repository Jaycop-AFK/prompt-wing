import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { PartnerAdCard } from '@/components/ads/partner-ad-card';
import { ClearanceCard } from '@/components/clearance/clearance-card';
import { AppIllustration } from '@/components/illustrations/app-illustration';
import { DailyGoalCard } from '@/components/profile/daily-goal-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MockBadge } from '@/components/ui/mock-badge';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { PremiumWatchVisual } from '@/components/watch/premium-watch-visual';
import { radius, spacing } from '@/constants/theme';
import { useMockWatch } from '@/hooks/use-mock-watch';
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
  const mockWatch = useMockWatch('rest');
  const { status, clearance, conditions, location, error, evaluatedAt, reload } =
    useTodayConditions();

  return (
    <Screen title="พร้อมวิ่ง" headerRight={<ThemeToggle />}>
      <View style={[styles.hero, { backgroundColor: colors.brandSoft }]}>
        <View style={styles.greeting}>
          <AppText variant="small" color={colors.brandStrong}>
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
        <AppIllustration name="fitnessStats" style={styles.heroIllustration} />
      </View>

      {/* ใบอนุญาตวิ่งต้องอยู่ใต้คำทักทายทันที เพราะเป็นคำตอบของคำถาม "พร้อมวิ่งหรือยัง" ด้านบน
          ห้ามวางการ์ดใหญ่อย่างนาฬิกาคั่นไว้ก่อน ไม่งั้นการ์ดนี้จะตกไปอยู่นอกจอแรกบนมือถือ */}
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

      {/* ท้ายจอเสมอ ห่างจากใบอนุญาตวิ่งกับเป้าหมายรายวัน ไม่ให้โฆษณามาแทรกระหว่างข้อมูลที่ใช้ตัดสินใจก่อนวิ่ง */}
      <PartnerAdCard placement="home" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    minHeight: 142,
    borderRadius: radius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  greeting: { flex: 1, gap: spacing.xs, zIndex: 1 },
  heroIllustration: { width: 142, height: 112, marginRight: -spacing.md },
  watchHero: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
  },
  watchHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  watchTitle: { flex: 1, gap: 2 },
  watchMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.md,
  },
  watchMetric: { flex: 1, minWidth: 120 },
  connectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  connectedDot: { width: 7, height: 7, borderRadius: 4 },
  loading: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
});
