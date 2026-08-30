import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { formatPace } from '@/components/format';
import {
  formatEventDate,
  formatFeeThb,
  PACE_PRESETS_SEC_PER_KM,
  RUN_TIME_PRESETS,
} from '@/components/community/copy';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { RaceEvent, RunBuddy } from '@/services/community';
import {
  listRaceEvents,
  listRunBuddies,
  loadMyRunVisibility,
  saveMyRunVisibility,
} from '@/storage/community-storage';

export default function CommunityScreen() {
  const { colors } = useTheme();

  const [events, setEvents] = useState<RaceEvent[]>([]);
  const [buddies, setBuddies] = useState<RunBuddy[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [myPace, setMyPace] = useState<number | null>(null);
  const [myRunTime, setMyRunTime] = useState<string | null>(null);
  const [visibleToOthers, setVisibleToOthers] = useState(false);

  // โหลดใหม่ทุกครั้งที่กลับมาที่จอนี้ ไม่ใช่แค่ตอน mount ครั้งแรก เพราะการมองเห็น/pace ของคนอื่นอาจ
  // เปลี่ยนระหว่างที่ไม่ได้อยู่หน้านี้ (รูปแบบเดียวกับ components/profile/daily-goal-card.tsx)
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      Promise.all([listRaceEvents(), loadMyRunVisibility()]).then(async ([raceEvents, visibility]) => {
        if (cancelled) return;
        setEvents(raceEvents);
        setDisplayName(visibility.displayName ?? '');
        setMyPace(visibility.typicalPaceSecPerKm);
        setMyRunTime(visibility.typicalRunTime);
        setVisibleToOthers(visibility.visibleToOthers);

        const matched = await listRunBuddies(visibility.typicalPaceSecPerKm);
        if (cancelled) return;
        setBuddies(matched);
        setLoaded(true);
      });

      return () => {
        cancelled = true;
      };
    }, [])
  );

  const handleSaveVisibility = async () => {
    setSaving(true);
    try {
      await saveMyRunVisibility({
        displayName: displayName.trim() || null,
        typicalPaceSecPerKm: myPace,
        typicalRunTime: myRunTime,
        visibleToOthers,
      });
      const matched = await listRunBuddies(myPace);
      setBuddies(matched);
      Alert.alert(
        'บันทึกแล้ว',
        visibleToOthers ? 'คนอื่นจะเห็นคุณในหน้าหาเพื่อนวิ่งได้แล้ว' : 'ปิดการมองเห็นของคุณแล้ว'
      );
    } catch {
      Alert.alert('บันทึกไม่สำเร็จ', 'ลองใหม่อีกครั้ง');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="ชุมชน">
      <View style={styles.section}>
        <AppText variant="heading" weight="semibold">
          ปฏิทินงานวิ่ง
        </AppText>
        {loaded && events.length === 0 ? (
          <Card background={colors.surfaceAlt}>
            <AppText variant="body" tone="muted">
              ยังไม่มีงานวิ่งในปฏิทิน
            </AppText>
          </Card>
        ) : (
          events.map((event) => (
            <Card key={event.id}>
              <AppText variant="body" weight="semibold">
                {event.name}
              </AppText>
              <AppText variant="small" tone="muted">
                {formatEventDate(event.dateAt)} · {event.province}
              </AppText>
              <View style={styles.metaRow}>
                <AppText variant="small" tone="muted">
                  {event.distanceKm} กม.
                </AppText>
                <AppText variant="small" weight="semibold">
                  {formatFeeThb(event.feeThb)}
                </AppText>
              </View>
            </Card>
          ))
        )}
      </View>

      <View style={styles.section}>
        <AppText variant="heading" weight="semibold">
          หาเพื่อนวิ่ง
        </AppText>
        <AppText variant="caption" tone="faint">
          ป้ายยืนยันด้านล่างอิงจากการยืนยันอีเมลผ่านระบบเข้าสู่ระบบเท่านั้น ไม่ใช่การยืนยันตัวตน
          แบบเต็มรูปแบบ ซึ่งยังอยู่นอกขอบเขตของแอปนี้
        </AppText>

        <Card>
          <AppText variant="body" weight="semibold">
            การมองเห็นของฉัน
          </AppText>

          <View style={styles.row}>
            <AppText variant="small">ให้คนอื่นเห็นฉันในหน้านี้</AppText>
            <Switch
              value={visibleToOthers}
              onValueChange={setVisibleToOthers}
              trackColor={{ false: colors.border, true: colors.brand }}
              thumbColor={colors.surface}
            />
          </View>

          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="ชื่อที่อยากให้คนอื่นเห็น (ไม่ใช่อีเมล)"
            placeholderTextColor={colors.textFaint}
            accessibilityLabel="ชื่อที่อยากให้คนอื่นเห็น"
            style={[
              styles.input,
              { color: colors.text, backgroundColor: colors.surfaceAlt, borderColor: colors.border },
            ]}
          />

          <AppText variant="small" tone="muted">
            pace ที่มักวิ่ง
          </AppText>
          <View style={styles.chipRow}>
            {PACE_PRESETS_SEC_PER_KM.map((preset) => {
              const active = preset === myPace;
              return (
                <Pressable
                  key={preset}
                  onPress={() => setMyPace(preset)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? colors.brandSoft : colors.surfaceAlt,
                      borderColor: active ? colors.brand : colors.border,
                    },
                  ]}>
                  <AppText variant="small" weight="semibold" color={active ? colors.brandStrong : colors.text}>
                    {formatPace(preset)} /กม.
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          <AppText variant="small" tone="muted">
            เวลาที่มักวิ่ง
          </AppText>
          <View style={styles.chipRow}>
            {RUN_TIME_PRESETS.map((preset) => {
              const active = preset === myRunTime;
              return (
                <Pressable
                  key={preset}
                  onPress={() => setMyRunTime(preset)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? colors.brandSoft : colors.surfaceAlt,
                      borderColor: active ? colors.brand : colors.border,
                    },
                  ]}>
                  <AppText variant="small" weight="semibold" color={active ? colors.brandStrong : colors.text}>
                    {preset}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          <Button
            label={saving ? 'กำลังบันทึก...' : 'บันทึก'}
            onPress={handleSaveVisibility}
            disabled={saving}
            variant="secondary"
          />
        </Card>

        {loaded && buddies.length === 0 ? (
          <Card background={colors.surfaceAlt}>
            <AppText variant="body" tone="muted">
              ยังไม่มีคนที่จับคู่ได้ตอนนี้ ต้องมีผู้ใช้คนอื่นเปิดการมองเห็นและกรอก pace ไว้ก่อน
            </AppText>
          </Card>
        ) : (
          buddies.map((buddy) => (
            <Card key={buddy.id}>
              <View style={styles.metaRow}>
                <AppText variant="body" weight="semibold">
                  {buddy.displayName}
                </AppText>
                <View
                  style={[
                    styles.verifiedBadge,
                    { backgroundColor: buddy.emailConfirmed ? colors.brandSoft : colors.surfaceAlt },
                  ]}>
                  <Ionicons
                    name={buddy.emailConfirmed ? 'checkmark-circle' : 'help-circle-outline'}
                    size={13}
                    color={buddy.emailConfirmed ? colors.brandStrong : colors.textMuted}
                  />
                  <AppText
                    variant="caption"
                    weight="medium"
                    color={buddy.emailConfirmed ? colors.brandStrong : colors.textMuted}>
                    {buddy.emailConfirmed ? 'ยืนยันอีเมลแล้ว' : 'ยังไม่ยืนยันอีเมล'}
                  </AppText>
                </View>
              </View>
              <AppText variant="small" tone="muted">
                pace {formatPace(buddy.paceSecPerKm)} /กม. · วิ่ง {buddy.runTime}
              </AppText>
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  input: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
});
