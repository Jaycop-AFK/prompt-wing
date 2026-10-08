import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  MOCK_RUN_BUDDIES,
  mockRaceEvents,
  type CommunityComment,
  type CreateRaceEventInput,
  type CreateRunBuddyInput,
  type MyRunVisibility,
  type RaceEvent,
  type RunBuddy,
} from '@/services/community';
import { supabase } from '@/services/supabase';

const CREATED_EVENTS_KEY = '@prompt-wing/community-created-events-v1';
const JOINED_EVENTS_KEY = '@prompt-wing/community-joined-events-v1';
const CREATED_BUDDIES_KEY = '@prompt-wing/community-created-buddies-v1';
const BUDDY_OVERRIDES_KEY = '@prompt-wing/community-buddy-overrides-v1';
const LOCAL_VISIBILITY_KEY = '@prompt-wing/community-visibility-v1';

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

interface RaceEventRow {
  id: number;
  name: string;
  event_date: string;
  distance_km: number;
  province: string;
  fee_thb: number;
}

export async function listRaceEvents(): Promise<RaceEvent[]> {
  const [created, joinedIds] = await Promise.all([
    readJson<RaceEvent[]>(CREATED_EVENTS_KEY, []),
    readJson<string[]>(JOINED_EVENTS_KEY, []),
  ]);

  let remoteEvents: RaceEvent[] = [];
  try {
    const { data, error } = await supabase
      .from('race_events')
      .select('*')
      .order('event_date', { ascending: true });
    if (!error && data) {
      remoteEvents = (data as RaceEventRow[]).map((row, index) => ({
        id: row.id,
        name: row.name,
        dateAt: new Date(row.event_date).getTime(),
        distanceKm: row.distance_km,
        province: row.province,
        feeThb: row.fee_thb,
        participantCount: 8 + index * 7,
        imageId: (['morning', 'night', 'lakeside'] as const)[index % 3],
      }));
    }
  } catch {
    // ชุมชน Mock และข้อมูลที่ผู้ใช้สร้างยังต้องเปิดได้แม้ Supabase ออฟไลน์
  }

  const joined = new Set(joinedIds);
  const all = [...created, ...mockRaceEvents(), ...remoteEvents];
  const deduped = all.filter(
    (event, index) => all.findIndex((item) => item.name === event.name && item.dateAt === event.dateAt) === index,
  );

  return deduped
    .map((event) => ({
      ...event,
      joined: joined.has(String(event.id)),
      participantCount: (event.participantCount ?? 0) + (joined.has(String(event.id)) ? 1 : 0),
    }))
    .sort((a, b) => a.dateAt - b.dateAt);
}

export async function createRaceEvent(input: CreateRaceEventInput): Promise<RaceEvent> {
  const created = await readJson<RaceEvent[]>(CREATED_EVENTS_KEY, []);
  const id = `local-event-${Date.now()}`;
  const imageIds = ['morning', 'night', 'lakeside'] as const;
  const event: RaceEvent = {
    id,
    name: input.name.trim(),
    dateAt: Date.parse(`${input.date}T${input.time}:00+07:00`),
    timeLabel: `${input.time} น.`,
    venue: input.venue.trim(),
    province: input.province.trim(),
    distanceKm: input.distanceKm,
    communityDescription: input.description.trim() || 'กิจกรรมวิ่งที่สร้างโดยสมาชิกในชุมชน',
    feeThb: 0,
    participantCount: 1,
    imageId: imageIds[created.length % imageIds.length],
    isMine: true,
  };
  await writeJson(CREATED_EVENTS_KEY, [event, ...created]);
  return event;
}

export async function toggleRaceEventJoined(id: RaceEvent['id']): Promise<boolean> {
  const ids = await readJson<string[]>(JOINED_EVENTS_KEY, []);
  const key = String(id);
  const joined = !ids.includes(key);
  await writeJson(JOINED_EVENTS_KEY, joined ? [...ids, key] : ids.filter((item) => item !== key));
  return joined;
}

interface ProfileMatchRow {
  id: string;
  display_name: string | null;
  typical_pace_sec_per_km: number | null;
  typical_run_time: string | null;
  email_confirmed: boolean;
}

interface BuddyOverride {
  joined?: boolean;
  comments?: CommunityComment[];
}

export async function listRunBuddies(myPaceSecPerKm: number | null): Promise<RunBuddy[]> {
  const [created, overrides] = await Promise.all([
    readJson<RunBuddy[]>(CREATED_BUDDIES_KEY, []),
    readJson<Record<string, BuddyOverride>>(BUDDY_OVERRIDES_KEY, {}),
  ]);

  let remoteBuddies: RunBuddy[] = [];
  try {
    const { data: authData } = await supabase.auth.getSession();
    const session = authData.session;
    if (session) {
      const { data, error } = await supabase
        .from('runner_directory')
        .select('id, display_name, typical_pace_sec_per_km, typical_run_time, email_confirmed')
        .eq('visible_to_others', true)
        .not('typical_pace_sec_per_km', 'is', null)
        .neq('id', session.user.id);
      if (!error && data) {
        remoteBuddies = (data as ProfileMatchRow[]).map((row) => ({
          id: row.id,
          displayName: row.display_name?.trim() ? row.display_name : `นักวิ่ง ${row.id.slice(0, 4)}`,
          paceSecPerKm: row.typical_pace_sec_per_km as number,
          runTime: row.typical_run_time ?? 'ยังไม่ได้ระบุเวลา',
          emailConfirmed: row.email_confirmed,
          meetingPlace: 'รอนัดสถานที่ในคอมเมนต์',
          message: 'กำลังหาเพื่อนที่ pace ใกล้กันเพื่อออกไปวิ่งด้วยกัน',
          participantCount: 1,
          capacity: 4,
          imageUri: null,
          comments: [],
        }));
      }
    }
  } catch {
    // ใช้ Mock และข้อมูลในเครื่องต่อได้
  }

  const buddies = [...created, ...MOCK_RUN_BUDDIES, ...remoteBuddies].map((buddy) => {
    const override = overrides[buddy.id];
    return {
      ...buddy,
      joined: override?.joined ?? buddy.joined ?? false,
      participantCount: buddy.participantCount + (override?.joined ? 1 : 0),
      comments: override?.comments ?? buddy.comments,
    };
  });

  return buddies.sort((a, b) => {
    if (a.isMine !== b.isMine) return a.isMine ? -1 : 1;
    if (myPaceSecPerKm === null) return a.displayName.localeCompare(b.displayName);
    return Math.abs(a.paceSecPerKm - myPaceSecPerKm) - Math.abs(b.paceSecPerKm - myPaceSecPerKm);
  });
}

export async function createRunBuddyPost(input: CreateRunBuddyInput): Promise<RunBuddy> {
  const created = await readJson<RunBuddy[]>(CREATED_BUDDIES_KEY, []);
  const post: RunBuddy = {
    id: `local-buddy-${Date.now()}`,
    displayName: input.displayName.trim(),
    paceSecPerKm: input.paceSecPerKm,
    runTime: input.runTime.trim(),
    emailConfirmed: true,
    meetingPlace: input.meetingPlace.trim(),
    message: input.message.trim(),
    participantCount: 1,
    capacity: input.capacity,
    imageUri: input.imageUri ?? null,
    comments: [],
    isMine: true,
  };
  await writeJson(CREATED_BUDDIES_KEY, [post, ...created]);
  return post;
}

export async function toggleRunBuddyJoined(id: string): Promise<boolean> {
  const overrides = await readJson<Record<string, BuddyOverride>>(BUDDY_OVERRIDES_KEY, {});
  const joined = !(overrides[id]?.joined ?? false);
  overrides[id] = { ...overrides[id], joined };
  await writeJson(BUDDY_OVERRIDES_KEY, overrides);
  return joined;
}

export async function addRunBuddyComment(
  id: string,
  current: CommunityComment[],
  author: string,
  message: string,
): Promise<CommunityComment> {
  const overrides = await readJson<Record<string, BuddyOverride>>(BUDDY_OVERRIDES_KEY, {});
  const comment: CommunityComment = {
    id: `comment-${Date.now()}`,
    author: author.trim() || 'ฉัน',
    message: message.trim(),
    createdAt: Date.now(),
  };
  overrides[id] = { ...overrides[id], comments: [...current, comment] };
  await writeJson(BUDDY_OVERRIDES_KEY, overrides);
  return comment;
}

const EMPTY_VISIBILITY: MyRunVisibility = {
  displayName: null,
  typicalPaceSecPerKm: null,
  typicalRunTime: null,
  visibleToOthers: false,
};

export async function loadMyRunVisibility(): Promise<MyRunVisibility> {
  const local = await readJson<MyRunVisibility>(LOCAL_VISIBILITY_KEY, EMPTY_VISIBILITY);
  try {
    const { data: authData } = await supabase.auth.getSession();
    if (!authData.session) return local;
    const { data, error } = await supabase
      .from('runner_directory')
      .select('display_name, typical_pace_sec_per_km, typical_run_time, visible_to_others')
      .eq('id', authData.session.user.id)
      .maybeSingle();
    if (error || !data) return local;
    return {
      displayName: data.display_name,
      typicalPaceSecPerKm: data.typical_pace_sec_per_km,
      typicalRunTime: data.typical_run_time,
      visibleToOthers: data.visible_to_others,
    };
  } catch {
    return local;
  }
}

export async function saveMyRunVisibility(visibility: MyRunVisibility): Promise<void> {
  await writeJson(LOCAL_VISIBILITY_KEY, visibility);
  try {
    const { data: authData } = await supabase.auth.getSession();
    if (!authData.session) return;
    await supabase
      .from('runner_directory')
      .update({
        display_name: visibility.displayName,
        typical_pace_sec_per_km: visibility.typicalPaceSecPerKm,
        typical_run_time: visibility.typicalRunTime,
        visible_to_others: visibility.visibleToOthers,
        updated_at: new Date().toISOString(),
      })
      .eq('id', authData.session.user.id);
  } catch {
    // สำเนาในเครื่องถูกบันทึกแล้ว จึงไม่ทำให้ flow เดโมล้ม
  }
}
