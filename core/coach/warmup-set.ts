import type {
  ClearanceFactor,
  RampPhase,
  SessionTarget,
  WarmUpMinutes,
  WarmUpSet,
  WarmUpSlot,
} from './types';

/**
 * แคตตาล็อกท่าวอร์มอัพแปดท่า ตามลำดับ RAMP ใน ADR 0004
 *
 * ไฟล์นี้จงใจไม่ import จาก components/warmup แม้ moves.ts จะไม่มี react-native/skia
 * อยู่ตอนนี้ก็ตาม เพราะ core/coach ต้องไม่ผูกกับโฟลเดอร์ UI แม้ในทางเทคนิคจะยังไม่มีปัญหา
 * รหัสท่า (id) ทั้งแปดตัวด้านล่างต้องตรงกับ components/warmup/moves.ts เสมอ เปลี่ยนที่หนึ่ง
 * ต้องเปลี่ยนอีกที่ด้วยมือ
 */
interface CatalogEntry {
  id: string;
  ramp: RampPhase;
  baseSeconds: number;
  isJumping: boolean;
  targetsCalfShin: boolean;
}

const CATALOG: readonly CatalogEntry[] = [
  { id: 'jog-in-place', ramp: 'raise', baseSeconds: 45, isJumping: false, targetsCalfShin: false },
  { id: 'glute-bridge', ramp: 'activate', baseSeconds: 30, isJumping: false, targetsCalfShin: false },
  { id: 'calf-raise', ramp: 'activate', baseSeconds: 30, isJumping: false, targetsCalfShin: true },
  { id: 'toe-raise', ramp: 'activate', baseSeconds: 30, isJumping: false, targetsCalfShin: true },
  { id: 'leg-swing', ramp: 'mobilise', baseSeconds: 30, isJumping: false, targetsCalfShin: false },
  { id: 'ankle-roll', ramp: 'mobilise', baseSeconds: 30, isJumping: false, targetsCalfShin: false },
  { id: 'walking-lunge', ramp: 'mobilise', baseSeconds: 45, isJumping: false, targetsCalfShin: false },
  { id: 'high-knee', ramp: 'potentiate', baseSeconds: 30, isJumping: true, targetsCalfShin: false },
];

/** ลำดับความสำคัญของขั้น Mobilise ตัดจากท้ายก่อนเมื่อย่อชุดให้สั้นลง */
const MOBILISE_IDS = ['leg-swing', 'ankle-roll', 'walking-lunge'];

/**
 * วันที่ร้อน ลดเวลาท่ากระโดดเหลือสัดส่วนนี้ ไม่ตัดออกทั้งหมด
 *
 * ตัดออกทั้งหมดจะทำให้ขั้น Potentiate ไม่มีท่าเหลือเลย เพราะท่าเดียวในขั้นนี้คือท่ากระโดด
 * ซึ่งขัดกับกฎที่ต้องครบทั้งสี่ขั้นเสมอ การลดเวลาลงมากจึงเป็นทางเลือกที่ปลอดภัยกว่าการตัดทิ้ง
 */
const HOT_DAY_JUMP_SCALE = 0.4;
/** ยืดเวลาท่าน่อง/หน้าแข้งเพิ่มเมื่อ FormScore ครั้งก่อนบอกว่า cadence ตกช่วงท้าย */
const CADENCE_DROP_EXTRA_SCALE = 1.4;
const LONG_TARGET_SCALE = 1.25;
const SHORT_TARGET_SCALE = 0.85;

/**
 * เกณฑ์ระยะไกล/ระยะสั้นของ SessionTarget แยกตามหน่วยที่ผู้ใช้เลือกตั้ง
 *
 * ระยะไกล 8 กม.ขึ้นไปเข้าเขต long run ระยะสั้น 3 กม.ลงมาเป็นวิ่งฟื้นฟู/เบา ๆ
 * 45 นาทีและ 20 นาทีคือระยะเวลาที่มักแปลงเป็นระยะทางประมาณนี้ที่ pace ทั่วไป
 * ส่วนแคลอรีอิงจากอัตราการเผาผลาญประมาณ 50 kcal/กม. คูณกับเกณฑ์ระยะทางข้างต้น
 */
const SESSION_TARGET_THRESHOLDS: Record<SessionTarget['kind'], { long: number; short: number }> = {
  distance: { long: 8, short: 3 },
  time: { long: 45, short: 20 },
  calories: { long: 400, short: 150 },
};

/** ตัวเลขดิบของ SessionTarget ไม่ว่าจะตั้งเป็นระยะทาง เวลา หรือแคลอรี */
function magnitudeOf(target: SessionTarget): number {
  switch (target.kind) {
    case 'distance':
      return target.km;
    case 'time':
      return target.minutes;
    case 'calories':
      return target.kcal;
  }
}

function isLongSessionTarget(target: SessionTarget | null): boolean {
  if (target === null) return false;
  return magnitudeOf(target) >= SESSION_TARGET_THRESHOLDS[target.kind].long;
}

function isShortSessionTarget(target: SessionTarget | null): boolean {
  if (target === null) return false;
  return magnitudeOf(target) <= SESSION_TARGET_THRESHOLDS[target.kind].short;
}

/** ขั้น RAMP ของท่าที่ระบุ null เมื่อไม่รู้จักรหัสท่านี้ */
export function rampPhaseOf(moveId: string): RampPhase | null {
  return CATALOG.find((entry) => entry.id === moveId)?.ramp ?? null;
}

/**
 * รายชื่อรหัสท่าทั้งหมดในแคตตาล็อกนี้ ไม่ export ตัว CATALOG เองเพราะรายละเอียดเรื่องเวลา
 * และป้ายกำกับเป็นเรื่องภายในของการเลือกชุด export แค่รายชื่อไว้ให้เทสต์ตรวจสอบว่าตรงกับ
 * components/warmup/moves.ts หรือไม่เท่านั้น
 */
export function catalogMoveIds(): string[] {
  return CATALOG.map((entry) => entry.id);
}

export interface SelectWarmUpSetInput {
  /** จาก RunClearance.decidedBy ของวันนี้ */
  clearanceFactors: readonly ClearanceFactor[];
  /** จาก FormScore.cadenceDropped ของครั้งก่อน false เมื่อไม่มีประวัติให้เทียบ */
  cadenceDroppedLastTime: boolean;
  sessionTarget: SessionTarget | null;
  minutes: WarmUpMinutes;
}

/**
 * เลือกชุดวอร์มอัพสำหรับการวิ่งครั้งนี้โดยเฉพาะ ตามอากาศวันนี้ ฟอร์มครั้งก่อน และเวลาที่มี
 *
 * เดินสองขั้นตอนเสมอ ขั้นแรกเลือกว่ามีท่าอะไรบ้าง (ครบสี่ขั้น RAMP เสมอ ไม่ว่าจะเลือกกี่นาที)
 * ขั้นสองปรับเวลาต่อท่าตามสัญญาณต่าง ๆ แล้วบีบผลรวมให้ไม่เกินเวลาที่มีเป็นขั้นตอนสุดท้าย
 * เพื่อให้ค่าคงที่เชิงตัวเลขที่ปรับจูนไม่แม่นพอไม่มีทางทำให้ผลรวมเกินเพดานได้เลย
 */
export function selectWarmUpSet({
  clearanceFactors,
  cadenceDroppedLastTime,
  sessionTarget,
  minutes,
}: SelectWarmUpSetInput): WarmUpSet {
  const isHot = clearanceFactors.includes('heat');
  const isLong = isLongSessionTarget(sessionTarget);
  const isShort = isShortSessionTarget(sessionTarget);

  const mobiliseCount = minutes <= 5 ? 2 : 3;
  const moveIds = [
    'jog-in-place',
    'glute-bridge',
    'calf-raise',
    'toe-raise',
    ...MOBILISE_IDS.slice(0, mobiliseCount),
    'high-knee',
  ];

  const targetScale = isLong ? LONG_TARGET_SCALE : isShort ? SHORT_TARGET_SCALE : 1;

  const reasons: string[] = [];
  if (isHot) {
    reasons.push('วันนี้อากาศร้อน ลดเวลาท่ากระโดดลงเพื่อไม่ให้ร่างกายร้อนเกินไปก่อนวิ่ง');
  }
  if (cadenceDroppedLastTime) {
    reasons.push('ครั้งก่อน cadence ตกช่วงท้าย เพิ่มเวลาท่าน่องและหน้าแข้งให้มากขึ้น');
  }
  if (isLong) {
    reasons.push('เป้าหมายรอบนี้เป็นระยะไกล จึงวอร์มอัพนานขึ้นกว่าปกติ');
  }

  let slots: WarmUpSlot[] = moveIds.map((id) => {
    const entry = CATALOG.find((candidate) => candidate.id === id);
    if (!entry) throw new Error(`ไม่พบท่าวอร์มอัพในแคตตาล็อก id: ${id}`);

    let seconds = entry.baseSeconds * targetScale;
    if (isHot && entry.isJumping) seconds *= HOT_DAY_JUMP_SCALE;
    if (cadenceDroppedLastTime && entry.targetsCalfShin) seconds *= CADENCE_DROP_EXTRA_SCALE;

    return { moveId: id, seconds: Math.round(seconds) };
  });

  const capSeconds = minutes * 60;
  const rawTotal = slots.reduce((sum, slot) => sum + slot.seconds, 0);

  if (rawTotal > capSeconds) {
    const shrink = capSeconds / rawTotal;
    slots = slots.map((slot) => ({ ...slot, seconds: Math.round(slot.seconds * shrink) }));
  }

  // การปัดเศษหลังหดอาจทำให้ผลรวมเกินเป้าไปหนึ่งหรือสองวินาที ตัดส่วนเกินออกจากท่าที่ยาวที่สุด
  // ทีละวินาทีจนกว่าจะไม่เกิน วิธีนี้รับประกันว่าผลรวมไม่มีทางเกิน capSeconds ไม่ว่าค่าคงที่
  // ด้านบนจะถูกปรับจูนไปเป็นเท่าไหร่ในอนาคต
  let total = slots.reduce((sum, slot) => sum + slot.seconds, 0);
  while (total > capSeconds) {
    const longest = slots.reduce((a, b) => (b.seconds > a.seconds ? b : a));
    longest.seconds -= 1;
    total -= 1;
  }

  return { slots, totalSeconds: total, reasons };
}
