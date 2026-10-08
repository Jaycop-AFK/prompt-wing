import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { PlusLockedCard } from '@/components/plus/plus-locked-card';
import { ProgressReportView } from '@/components/progress/progress-report-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';
import { useSubscription } from '@/hooks/use-subscription';
import { useTheme } from '@/hooks/use-theme';
import { buildProgressReport, REPORT_WINDOW_DAYS } from '@/services/progress-report';
import type { SessionRecord } from '@/services/session-record';
import { listSessions } from '@/storage/session-storage';

export default function ProgressReportScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { isPlus } = useSubscription();
  const [sessions, setSessions] = useState<SessionRecord[] | null>(null);
  const [failed, setFailed] = useState(false);

  // โหลดใหม่ทุกครั้งที่กลับเข้าจอ รายงานต้องรวมการวิ่งที่เพิ่งจบไปด้วย และไม่โหลดเลยถ้ายังไม่ใช่ Plus
  const load = useCallback(() => {
    if (!isPlus) return;
    let cancelled = false;
    listSessions()
      .then((found) => {
        if (cancelled) return;
        setSessions(found);
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isPlus]);

  useFocusEffect(load);

  if (!isPlus) {
    return (
      <Screen title="รายงานพัฒนาการ" back>
        <PlusLockedCard feature="progressReport">
          <View style={[styles.preview, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <AppText variant="caption" weight="semibold" tone="muted">
              ตัวอย่างสิ่งที่รายงานบอก
            </AppText>
            <AppText variant="small">• ระยะรวม 4 สัปดาห์เพิ่มขึ้นหรือลดลงกี่เปอร์เซ็นต์</AppText>
            <AppText variant="small">• pace เฉลี่ยเร็วขึ้นหรือช้าลงกี่วินาทีต่อกิโลเมตร</AppText>
            <AppText variant="small">• cadence หรือ pace ตกช่วงท้ายบ่อยแค่ไหน พร้อมวิธีปรับ</AppText>
          </View>
        </PlusLockedCard>
      </Screen>
    );
  }

  if (failed) {
    return (
      <Screen title="รายงานพัฒนาการ" back>
        <Card>
          <AppText variant="heading" weight="semibold">
            เปิดรายงานไม่สำเร็จ
          </AppText>
          <AppText tone="muted">อ่านประวัติการวิ่งไม่ได้ การวิ่งที่บันทึกไว้ยังอยู่ครบ ไม่ได้หายไปไหน</AppText>
          <Button
            label="ลองอีกครั้ง"
            onPress={() => {
              setFailed(false);
              load();
            }}
          />
        </Card>
      </Screen>
    );
  }

  if (sessions === null) {
    return (
      <Screen title="รายงานพัฒนาการ" back scroll={false}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      </Screen>
    );
  }

  const report = buildProgressReport(sessions, Date.now());

  if (report.totalRuns === 0) {
    return (
      <Screen title="รายงานพัฒนาการ" back>
        <Card>
          <AppText variant="heading" weight="semibold">
            ยังไม่มีการวิ่งให้สรุป
          </AppText>
          <AppText tone="muted">
            รายงานจะเทียบการวิ่ง {REPORT_WINDOW_DAYS} วันล่าสุดกับช่วงก่อนหน้าให้เองทุกครั้งที่คุณวิ่งจบ
          </AppText>
          <Button label="ไปหน้าวิ่ง" onPress={() => router.dismissTo('/(tabs)/run')} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title="รายงานพัฒนาการ" back>
      <ProgressReportView report={report} onOpenHistory={() => router.push('/run-history')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  preview: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: 2 },
});
