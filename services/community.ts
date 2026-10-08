export type CommunityImageId = 'morning' | 'night' | 'lakeside';

export interface RaceEvent {
  id: number | string;
  name: string;
  dateAt: number;
  distanceKm: number;
  province: string;
  feeThb: number;
  timeLabel?: string;
  venue?: string;
  communityDescription?: string;
  participantCount?: number;
  imageId?: CommunityImageId;
  joined?: boolean;
  isMock?: boolean;
  isMine?: boolean;
}

export interface RunBuddy {
  id: string;
  displayName: string;
  paceSecPerKm: number;
  runTime: string;
  emailConfirmed: boolean;
  meetingPlace: string;
  message: string;
  participantCount: number;
  capacity: number;
  imageUri?: string | null;
  comments: CommunityComment[];
  joined?: boolean;
  isMock?: boolean;
  isMine?: boolean;
}

export interface CommunityComment {
  id: string;
  author: string;
  message: string;
  createdAt: number;
}

export interface MyRunVisibility {
  displayName: string | null;
  typicalPaceSecPerKm: number | null;
  typicalRunTime: string | null;
  visibleToOthers: boolean;
}

export interface CreateRaceEventInput {
  name: string;
  date: string;
  time: string;
  venue: string;
  province: string;
  distanceKm: number;
  description: string;
}

export interface CreateRunBuddyInput {
  displayName: string;
  meetingPlace: string;
  runTime: string;
  paceSecPerKm: number;
  message: string;
  capacity: number;
  imageUri?: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function futureDateAt(now: number, days: number, hour: number, minute = 0): number {
  const date = new Date(now + days * DAY_MS);
  date.setHours(hour, minute, 0, 0);
  return date.getTime();
}

export function mockRaceEvents(now = Date.now()): RaceEvent[] {
  return [
    {
      id: 'mock-lumphini-sunrise',
      name: 'Sunrise Social Run',
      dateAt: futureDateAt(now, 4, 6),
      timeLabel: '06:00 น.',
      distanceKm: 5,
      province: 'กรุงเทพมหานคร',
      venue: 'สวนลุมพินี · ประตู 3',
      feeThb: 0,
      communityDescription: 'วิ่ง easy pace รอบสวน แล้วแวะกาแฟด้วยกัน มือใหม่มาได้',
      participantCount: 18,
      imageId: 'morning',
      isMock: true,
    },
    {
      id: 'mock-river-night',
      name: 'River Night Run',
      dateAt: futureDateAt(now, 7, 19),
      timeLabel: '19:00 น.',
      distanceKm: 7,
      province: 'กรุงเทพมหานคร',
      venue: 'สวนเบญจกิติ · หน้าอาคารพิพิธภัณฑ์',
      feeThb: 0,
      communityDescription: 'วิ่งคุยกันได้ pace 6:30–7:30 พร้อมจุดพักน้ำกลางทาง',
      participantCount: 26,
      imageId: 'night',
      isMock: true,
    },
    {
      id: 'mock-lake-10k',
      name: 'Lake Loop 10K Challenge',
      dateAt: futureDateAt(now, 12, 5, 45),
      timeLabel: '05:45 น.',
      distanceKm: 10,
      province: 'กรุงเทพมหานคร',
      venue: 'สวนหลวง ร.9 · ลานดอกไม้',
      feeThb: 150,
      communityDescription: 'ซ้อมยาวแบบไม่ทิ้งกัน แบ่งกลุ่มตาม pace และมีน้ำให้ทุก 2.5 กม.',
      participantCount: 34,
      imageId: 'lakeside',
      isMock: true,
    },
  ];
}

export const MOCK_RUN_BUDDIES: readonly RunBuddy[] = [
  {
    id: 'mock-buddy-mint', displayName: 'มิ้นท์ Morning Miles', paceSecPerKm: 390,
    runTime: 'พรุ่งนี้ · 06:15 น.', emailConfirmed: true, meetingPlace: 'สวนลุมพินี ประตู 3',
    message: 'ชวนวิ่ง easy 5K คุยได้เรื่อย ๆ มือใหม่มาด้วยกันนะ', participantCount: 2, capacity: 5,
    imageUri: 'asset:morning', comments: [
      { id: 'mint-c1', author: 'ฝน', message: 'ไปด้วยค่ะ pace นี้กำลังดีเลย', createdAt: Date.now() - 18 * 60 * 1000 },
      { id: 'mint-c2', author: 'บอส', message: 'เจอกันประตู 3 ครับ', createdAt: Date.now() - 7 * 60 * 1000 },
    ], isMock: true,
  },
  {
    id: 'mock-buddy-ton', displayName: 'ต้น Run After Work', paceSecPerKm: 345,
    runTime: 'วันศุกร์ · 19:00 น.', emailConfirmed: true, meetingPlace: 'สวนเบญจกิติ ทางเข้าฝั่ง MRT',
    message: 'หาเพื่อน tempo เบา ๆ 6K วอร์มและคูลดาวน์ด้วยกัน', participantCount: 3, capacity: 6,
    imageUri: 'asset:night', comments: [
      { id: 'ton-c1', author: 'เจ', message: 'ขอจอยด้วยคนครับ', createdAt: Date.now() - 34 * 60 * 1000 },
    ], isMock: true,
  },
  {
    id: 'mock-buddy-pang', displayName: 'แป้ง Weekend Jogger', paceSecPerKm: 450,
    runTime: 'วันอาทิตย์ · 07:00 น.', emailConfirmed: true, meetingPlace: 'สวนรถไฟ หน้าอาคารกีฬา',
    message: 'วิ่งสลับเดิน 4K เน้นสนุก ไม่กด pace แล้วไปหาอาหารเช้ากัน', participantCount: 1, capacity: 4,
    imageUri: null, comments: [], isMock: true,
  },
  {
    id: 'mock-buddy-non', displayName: 'นนท์ Long Run Club', paceSecPerKm: 375,
    runTime: 'วันเสาร์ · 05:30 น.', emailConfirmed: true, meetingPlace: 'สวนหลวง ร.9 ลานดอกไม้',
    message: 'Long run 12K มีพักน้ำทุก 4K ใครกำลังเตรียมฮาล์ฟมาราธอนมาจอยได้', participantCount: 4, capacity: 8,
    imageUri: 'asset:lakeside', comments: [
      { id: 'non-c1', author: 'ออม', message: 'มีที่ฝากน้ำตรงไหนบ้างคะ', createdAt: Date.now() - 52 * 60 * 1000 },
      { id: 'non-c2', author: 'นนท์', message: 'ฝากที่โต๊ะจุดเริ่มได้เลยครับ', createdAt: Date.now() - 43 * 60 * 1000 },
    ], isMock: true,
  },
];

export function validateRaceEventInput(input: CreateRaceEventInput, now = Date.now()): string | null {
  if (input.name.trim().length < 3) return 'กรอกชื่ออีเวนต์อย่างน้อย 3 ตัวอักษร';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return 'กรอกวันที่รูปแบบ YYYY-MM-DD';
  if (!/^\d{2}:\d{2}$/.test(input.time)) return 'กรอกเวลารูปแบบ HH:MM';
  const dateAt = Date.parse(`${input.date}T${input.time}:00+07:00`);
  if (!Number.isFinite(dateAt) || dateAt <= now) return 'วันและเวลาต้องอยู่ในอนาคต';
  if (input.venue.trim().length < 3) return 'กรอกจุดนัดพบให้ชัดเจน';
  if (input.province.trim().length < 2) return 'กรอกจังหวัด';
  if (!Number.isFinite(input.distanceKm) || input.distanceKm <= 0 || input.distanceKm > 100) {
    return 'ระยะทางต้องอยู่ระหว่าง 0.1–100 กม.';
  }
  return null;
}

export function validateRunBuddyInput(input: CreateRunBuddyInput): string | null {
  if (input.displayName.trim().length < 2) return 'กรอกชื่อที่ให้เพื่อนเห็น';
  if (input.meetingPlace.trim().length < 3) return 'กรอกสถานที่นัดพบ';
  if (input.runTime.trim().length < 3) return 'กรอกวันและเวลาที่จะวิ่ง';
  if (!Number.isFinite(input.paceSecPerKm) || input.paceSecPerKm < 180 || input.paceSecPerKm > 900) {
    return 'เลือก pace ที่ต้องการ';
  }
  if (input.message.trim().length < 5) return 'เขียนรายละเอียดสั้น ๆ อย่างน้อย 5 ตัวอักษร';
  if (!Number.isInteger(input.capacity) || input.capacity < 2 || input.capacity > 20) {
    return 'จำนวนสมาชิกต้องอยู่ระหว่าง 2–20 คน';
  }
  return null;
}
