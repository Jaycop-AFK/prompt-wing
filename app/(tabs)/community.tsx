import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Fragment, useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { PartnerAdCard } from '@/components/ads/partner-ad-card';
import { BuddyPostCard } from '@/components/community/buddy-post-card';
import { CommunityTabs, type CommunityTab } from '@/components/community/community-tabs';
import { CreateBuddyModal, CreateEventModal } from '@/components/community/create-community-modals';
import { EventCard } from '@/components/community/event-card';
import { PACE_PRESETS_SEC_PER_KM, RUN_TIME_PRESETS } from '@/components/community/copy';
import { formatPace } from '@/components/format';
import { AppIllustration } from '@/components/illustrations/app-illustration';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CreateRaceEventInput, CreateRunBuddyInput, RaceEvent, RunBuddy } from '@/services/community';
import {
  addRunBuddyComment,
  createRaceEvent,
  createRunBuddyPost,
  listRaceEvents,
  listRunBuddies,
  loadMyRunVisibility,
  saveMyRunVisibility,
  toggleRaceEventJoined,
  toggleRunBuddyJoined,
} from '@/storage/community-storage';

/** แทรกโฆษณาพาร์ทเนอร์หลังรายการที่เท่าไร ให้คนเห็นเนื้อหาของชุมชนก่อนเสมอ ไม่ใช่โฆษณาเป็นอย่างแรก */
const AD_AFTER_INDEX = 1;

export default function CommunityScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState<CommunityTab>('events');
  const [events, setEvents] = useState<RaceEvent[]>([]);
  const [buddies, setBuddies] = useState<RunBuddy[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [eventModal, setEventModal] = useState(false);
  const [buddyModal, setBuddyModal] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [myPace, setMyPace] = useState<number | null>(390);
  const [myRunTime, setMyRunTime] = useState<string | null>('เช้าตรู่ (05:00-07:00)');
  const [visibleToOthers, setVisibleToOthers] = useState(false);

  const reload = useCallback(async () => {
    const [raceEvents, visibility] = await Promise.all([listRaceEvents(), loadMyRunVisibility()]);
    setEvents(raceEvents);
    setDisplayName(visibility.displayName ?? 'นักวิ่งพร้อมวิ่ง');
    setMyPace(visibility.typicalPaceSecPerKm ?? 390);
    setMyRunTime(visibility.typicalRunTime ?? 'เช้าตรู่ (05:00-07:00)');
    setVisibleToOthers(visibility.visibleToOthers);
    setBuddies(await listRunBuddies(visibility.typicalPaceSecPerKm ?? 390));
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      reload().catch(() => {
        if (active) setLoaded(true);
      });
      return () => {
        active = false;
      };
    }, [reload]),
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
      setBuddies(await listRunBuddies(myPace));
      Alert.alert('บันทึกแล้ว', 'ใช้โปรไฟล์นี้ช่วยเรียงโพสต์ที่ pace ใกล้คุณ');
    } catch {
      Alert.alert('บันทึกไม่สำเร็จ', 'ลองใหม่อีกครั้ง');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateEvent = async (input: CreateRaceEventInput) => {
    await createRaceEvent(input);
    await reload();
  };

  const handleCreateBuddy = async (input: CreateRunBuddyInput) => {
    await createRunBuddyPost(input);
    await reload();
  };

  const handleJoinEvent = async (event: RaceEvent) => {
    await toggleRaceEventJoined(event.id);
    setEvents(await listRaceEvents());
  };

  const handleJoinBuddy = async (buddy: RunBuddy) => {
    if (!buddy.joined && buddy.participantCount >= buddy.capacity) return;
    await toggleRunBuddyJoined(buddy.id);
    setBuddies(await listRunBuddies(myPace));
  };

  const handleComment = async (buddy: RunBuddy, message: string) => {
    await addRunBuddyComment(buddy.id, buddy.comments, displayName.trim() || 'ฉัน', message);
    setBuddies(await listRunBuddies(myPace));
  };

  return (
    <Screen title="ชุมชน">
      <View style={[styles.hero, { backgroundColor: colors.brandSoft }]}>
        <View style={styles.heroCopy}>
          <AppText variant="heading" weight="bold">วิ่งด้วยกัน สนุกกว่าเดิม</AppText>
          <AppText variant="small" color={colors.brandStrong}>สร้างกิจกรรม นัดสถานที่ และหาเพื่อน pace ใกล้กัน</AppText>
        </View>
        <AppIllustration name="socialFriends" style={styles.heroIllustration} />
      </View>

      <CommunityTabs value={tab} onChange={setTab} />

      {!loaded ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.brand} />
          <AppText variant="small" tone="muted">กำลังโหลดชุมชน…</AppText>
        </View>
      ) : tab === 'events' ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitle}>
              <AppText variant="heading" weight="semibold">อีเวนต์ใกล้คุณ</AppText>
              <AppText variant="caption" tone="faint">รวมกิจกรรมตัวอย่างและกิจกรรมที่คุณสร้าง</AppText>
            </View>
            <CreateButton label="สร้าง" icon="add" onPress={() => setEventModal(true)} />
          </View>
          {events.map((event, index) => (
            <Fragment key={String(event.id)}>
              <EventCard
                event={event}
                onJoin={() => handleJoinEvent(event)}
                onOpen={() => router.push({ pathname: '/event-detail', params: { event: JSON.stringify(event) } })}
              />
              {index === AD_AFTER_INDEX ? <PartnerAdCard placement="community" /> : null}
            </Fragment>
          ))}
          {events.length <= AD_AFTER_INDEX ? <PartnerAdCard placement="community" /> : null}
        </View>
      ) : (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitle}>
              <AppText variant="heading" weight="semibold">ฟีดหาเพื่อนวิ่ง</AppText>
              <AppText variant="caption" tone="faint">โพสต์เวลา สถานที่ pace รูป และคุยกันในความคิดเห็น</AppText>
            </View>
            <CreateButton label="โพสต์" icon="create-outline" onPress={() => setBuddyModal(true)} />
          </View>

          <RunnerProfileCard
            displayName={displayName}
            onDisplayName={setDisplayName}
            pace={myPace}
            onPace={setMyPace}
            runTime={myRunTime}
            onRunTime={setMyRunTime}
            visible={visibleToOthers}
            onVisible={setVisibleToOthers}
            saving={saving}
            onSave={handleSaveVisibility}
          />

          {buddies.map((buddy, index) => (
            <Fragment key={buddy.id}>
              <BuddyPostCard
                post={buddy}
                onJoin={() => handleJoinBuddy(buddy)}
                onComment={(message) => handleComment(buddy, message)}
              />
              {index === AD_AFTER_INDEX ? <PartnerAdCard placement="community" /> : null}
            </Fragment>
          ))}
          {buddies.length <= AD_AFTER_INDEX ? <PartnerAdCard placement="community" /> : null}
        </View>
      )}

      <CreateEventModal visible={eventModal} onClose={() => setEventModal(false)} onCreate={handleCreateEvent} />
      <CreateBuddyModal
        visible={buddyModal}
        defaultName={displayName}
        onClose={() => setBuddyModal(false)}
        onCreate={handleCreateBuddy}
      />
    </Screen>
  );
}

function CreateButton({ label, icon, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={[styles.createButton, { backgroundColor: colors.brand }]}>
      <Ionicons name={icon} size={17} color={colors.onBrand} />
      <AppText variant="small" weight="semibold" color={colors.onBrand}>{label}</AppText>
    </Pressable>
  );
}

function RunnerProfileCard({
  displayName, onDisplayName, pace, onPace, runTime, onRunTime, visible, onVisible, saving, onSave,
}: {
  displayName: string;
  onDisplayName: (value: string) => void;
  pace: number | null;
  onPace: (value: number) => void;
  runTime: string | null;
  onRunTime: (value: string) => void;
  visible: boolean;
  onVisible: (value: boolean) => void;
  saving: boolean;
  onSave: () => void;
}) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  return (
    <Card background={colors.surfaceAlt}>
      <Pressable onPress={() => setExpanded((value) => !value)} style={styles.profileHeader} accessibilityRole="button">
        <View style={styles.profileCopy}>
          <AppText variant="body" weight="semibold">โปรไฟล์จับคู่ของฉัน</AppText>
          <AppText variant="caption" tone="faint">
            {formatPace(pace ?? 390)} /กม. · {runTime ?? 'ยังไม่ระบุเวลา'}
          </AppText>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'options-outline'} size={20} color={colors.textMuted} />
      </Pressable>
      {expanded ? (
        <>
          <View style={styles.visibilityRow}>
            <AppText variant="small">แสดงโปรไฟล์ให้สมาชิกจริงเห็น</AppText>
            <Switch value={visible} onValueChange={onVisible} trackColor={{ false: colors.border, true: colors.brand }} thumbColor={colors.surface} />
          </View>
          <TextInput
            value={displayName}
            onChangeText={onDisplayName}
            placeholder="ชื่อที่แสดง"
            placeholderTextColor={colors.textFaint}
            style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
          />
          <AppText variant="small" tone="muted">pace ปกติ</AppText>
          <View style={styles.chipRow}>
            {PACE_PRESETS_SEC_PER_KM.map((value) => <ProfileChip key={value} active={pace === value} label={formatPace(value)} onPress={() => onPace(value)} />)}
          </View>
          <AppText variant="small" tone="muted">เวลาที่มักวิ่ง</AppText>
          <View style={styles.chipRow}>
            {RUN_TIME_PRESETS.map((value) => <ProfileChip key={value} active={runTime === value} label={value} onPress={() => onRunTime(value)} />)}
          </View>
          <Button label={saving ? 'กำลังบันทึก…' : 'บันทึกโปรไฟล์'} onPress={onSave} disabled={saving} variant="secondary" />
        </>
      ) : null}
    </Card>
  );
}

function ProfileChip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.chip, { backgroundColor: active ? colors.brandSoft : colors.surface, borderColor: active ? colors.brand : colors.border }]}>
      <AppText variant="caption" weight="semibold" color={active ? colors.brandStrong : colors.textMuted}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { minHeight: 142, borderRadius: radius.xl, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  heroCopy: { flex: 1, gap: spacing.xs, zIndex: 1 },
  heroIllustration: { width: 112, height: 126, alignSelf: 'flex-end' },
  loading: { paddingVertical: spacing.xl, alignItems: 'center', gap: spacing.sm },
  section: { gap: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  sectionTitle: { flex: 1 },
  createButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  profileHeader: { flexDirection: 'row', alignItems: 'center' },
  profileCopy: { flex: 1 },
  visibilityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  input: { minHeight: 46, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.md, fontSize: 15 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
});
