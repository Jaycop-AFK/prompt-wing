import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { formatDistance } from '@/components/format';
import { OBJECTIVE_LABEL } from '@/components/profile/copy';
import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/text';
import { radius } from '@/constants/theme';
import { computeDailyGoal } from '@/core/coach';
import { useProfile } from '@/hooks/use-profile';
import { useTheme } from '@/hooks/use-theme';
import { distanceOnDay } from '@/services/run-history';
import type { SessionRecord } from '@/services/session-record';
import { listSessions } from '@/storage/session-storage';

type LoadState = { kind: 'loading' } | { kind: 'ready'; sessions: SessionRecord[] } | { kind: 'failed' };

/**
 * แถบความคืบหน้าเป้าหมายรายวันบนหน้าแรก
 *
 * โหลดประวัติเองแทนที่จะรับมาทางพร็อพ เพราะหน้าแรกไม่ได้ใช้ประวัติเพื่ออย่างอื่นเลย การให้จอแม่
 * ต้องรู้จักฐานข้อมูลเพียงเพื่อส่งต่อให้การ์ดใบเดียวจะทำให้หน้าแรกผูกกับที่เก็บข้อมูลโดยไม่จำเป็น
 */
export function DailyGoalCard() {
  const { colors } = useTheme();
  const { profile, loading: profileLoading } = useProfile();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      listSessions()
        .then((sessions) => {
          if (!cancelled) setState({ kind: 'ready', sessions });
        })
        .catch(() => {
          if (!cancelled) setState({ kind: 'failed' });
        });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  // รอทั้งโปรไฟล์และประวัติก่อนแสดงตัวเลข ไม่งั้นจะขึ้นเป้าหมายของค่าเริ่มต้นแวบหนึ่งแล้วกระโดด
  // เป็นเป้าหมายจริงที่ผู้ใช้เลือกไว้ ซึ่งดูเหมือนแอปลืมสิ่งที่ตั้งค่าไว้
  if (profileLoading || state.kind === 'loading') {
    return (
      <Card>
        <AppText variant="heading" weight="semibold">
          เป้าหมายรายวัน
        </AppText>
        <AppText variant="body" tone="muted">
          กำลังโหลด
        </AppText>
      </Card>
    );
  }

  // อ่านประวัติไม่ได้ต้องบอกตรง ๆ ไม่ใช่แสดงเป็น "ยังไม่ได้วิ่งวันนี้" เพราะประวัติไม่ได้มีผลแค่กับ
  // ตัวเศษ เป้าหมายของบางแบบ (มาราธอน เพิ่มความอึด) คำนวณจากประวัติด้วย ถ้าอ่านไม่ได้แล้วเดาว่า
  // ประวัติว่าง ตัวหารจะเปลี่ยนไปเงียบ ๆ กลายเป็นวัดผู้ใช้ด้วยเป้าหมายที่ไม่ใช่ของจริง
  if (state.kind === 'failed') {
    return (
      <Card>
        <AppText variant="heading" weight="semibold">
          เป้าหมายรายวัน
        </AppText>
        <AppText variant="body" tone="muted">
          อ่านประวัติการวิ่งในเครื่องไม่ได้ เลยยังคำนวณเป้าหมายรายวันของวันนี้ไม่ได้
        </AppText>
      </Card>
    );
  }

  const now = Date.now();
  const dailyGoal = computeDailyGoal({
    objective: profile.objective,
    history: state.sessions.map((s) => ({ at: s.finishedAt, distanceKm: s.distanceKm })),
    now,
  });

  const todayKm = distanceOnDay(state.sessions, now);
  const ratio = dailyGoal.distanceKm > 0 ? todayKm / dailyGoal.distanceKm : 0;
  const done = ratio >= 1;

  return (
    <Card>
      <View style={styles.header}>
        <AppText variant="heading" weight="semibold">
          เป้าหมายรายวัน
        </AppText>
        <AppText variant="caption" tone="muted">
          {OBJECTIVE_LABEL[profile.objective]}
        </AppText>
      </View>

      <AppText variant="title" weight="bold">
        {formatDistance(todayKm)} / {formatDistance(dailyGoal.distanceKm)}
      </AppText>

      <View style={[styles.track, { backgroundColor: colors.surfaceAlt }]}>
        <View
          style={[
            styles.fill,
            { backgroundColor: colors.brand, width: `${Math.min(100, ratio * 100)}%` },
          ]}
        />
      </View>

      <AppText variant="small" tone={done ? 'brand' : 'muted'}>
        {done
          ? 'ครบเป้าหมายรายวันแล้ววันนี้ เก่งมาก'
          : `เหลืออีก ${formatDistance(dailyGoal.distanceKm - todayKm)} ก็ครบเป้าหมายรายวันของวันนี้`}
      </AppText>

      {profile.objective === 'health' ? (
        <AppText variant="caption" tone="faint">
          เป้าหมายสุขภาพตามหลักการควรเป็นสามวันต่อสัปดาห์ แต่แอปยังคิดเป็นระยะรายวันทุกวันอยู่
          วันพักจึงจะขึ้นว่ายังไม่ครบเสมอ เปลี่ยนเป้าหมายระยะยาวได้ที่หน้าโปรไฟล์
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  track: { height: 10, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
});
