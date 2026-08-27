import type {
  ClearWindow,
  ClearanceFactor,
  ClearanceLevel,
  EpochMillis,
  EvaluateRunClearanceInput,
  HourClearance,
  HourlyConditions,
  RunClearance,
} from './types';

const HOUR_MS = 60 * 60 * 1000;

/**
 * เกณฑ์ตัดสินใบอนุญาตวิ่ง
 *
 * PM2.5 ที่ 37.5 คือค่ามาตรฐานเฉลี่ย 24 ชั่วโมงของประเทศไทย
 * ดัชนีความร้อนที่ 41 คือขอบล่างของช่วงอันตรายตามการแบ่งของ US NWS
 */
export const CLEARANCE_THRESHOLDS = {
  apparentTemperature: { yellow: 35, red: 41 },
  pm25: { yellow: 25, red: 37.5 },
  uvIndex: { yellow: 8 },
} as const;

/**
 * ชั่วโมงนี้มืดหรือยัง
 *
 * มืดมีสองฝั่ง คือก่อนพระอาทิตย์ขึ้นและหลังพระอาทิตย์ตก
 * ตอนแรกโค้ดเช็คแค่ฝั่งหลัง ทำให้ตีสองถูกตัดสินว่าเขียวเพราะอากาศเย็นและฝุ่นน้อย
 * ซึ่งขัดกับปัญหาเรื่องแสงสว่างไม่เพียงพอที่โปรเจกต์นี้ตั้งใจแก้
 *
 * ชั่วโมงจะถือว่ามืดก็ต่อเมื่อจบลงก่อนพระอาทิตย์ขึ้น ชั่วโมงที่คาบเกี่ยวยังนับว่าสว่าง
 * แล้วให้การตัดหัวช่วงเวลาที่ควรวิ่งจัดการเศษนาทีที่เหลือเอง
 */
function isDarkHour(at: EpochMillis, sunrise: EpochMillis, sunset: EpochMillis): boolean {
  return at + HOUR_MS <= sunrise || at >= sunset;
}

/** ลำดับคงที่ของปัจจัย เพื่อให้ decidedBy เรียงเหมือนกันทุกครั้ง */
const FACTOR_ORDER: ClearanceFactor[] = ['heat', 'pm25', 'uv', 'storm', 'dark'];

const byFactorOrder = (a: ClearanceFactor, b: ClearanceFactor) =>
  FACTOR_ORDER.indexOf(a) - FACTOR_ORDER.indexOf(b);

/**
 * ตัดสินหนึ่งชั่วโมงด้วยกฎ "ตัวที่แย่ที่สุดเป็นคนตัดสิน"
 *
 * ไม่เอาปัจจัยมาเฉลี่ยกัน เพราะอากาศเย็นสบายไม่ได้ชดเชย PM2.5 ที่พุ่ง
 * และเมื่อผลรวมเป็นแดง จะรายงานเฉพาะปัจจัยระดับแดง ไม่ปนปัจจัยระดับเหลือง
 */
function gradeHour(
  hour: HourlyConditions | undefined,
  isDark: boolean
): Pick<HourClearance, 'level' | 'factors'> {
  // ไม่มีข้อมูลของชั่วโมงนี้ ถือว่าไม่เขียว ดีกว่าเดาว่าอากาศดี
  if (!hour) return { level: 'yellow', factors: [] };

  const red: ClearanceFactor[] = [];
  const yellow: ClearanceFactor[] = [];

  if (hour.apparentTemperature >= CLEARANCE_THRESHOLDS.apparentTemperature.red) red.push('heat');
  else if (hour.apparentTemperature >= CLEARANCE_THRESHOLDS.apparentTemperature.yellow)
    yellow.push('heat');

  // ไม่มีค่า PM2.5 ต้องไม่ถูกนับเป็นศูนย์และไม่ถูกนับเป็นค่าที่แย่
  if (hour.pm25 !== null) {
    if (hour.pm25 >= CLEARANCE_THRESHOLDS.pm25.red) red.push('pm25');
    else if (hour.pm25 >= CLEARANCE_THRESHOLDS.pm25.yellow) yellow.push('pm25');
  }

  if (hour.uvIndex >= CLEARANCE_THRESHOLDS.uvIndex.yellow) yellow.push('uv');
  if (hour.thunderstorm) red.push('storm');

  if (red.length > 0) return { level: 'red', factors: red.sort(byFactorOrder) };

  if (isDark) yellow.push('dark');
  if (yellow.length > 0) return { level: 'yellow', factors: yellow.sort(byFactorOrder) };

  return { level: 'green', factors: [] };
}

/**
 * ตำแหน่งของชั่วโมงที่ครอบเวลาที่ให้มา คืน -1 เมื่อไม่มี
 *
 * รับอะไรก็ได้ที่มีฟิลด์ at เพราะทั้งค่ารายชั่วโมงและผลการตัดสินรายชั่วโมง
 * ต่างก็ต้องหาชั่วโมงปัจจุบันด้วยวิธีเดียวกัน
 */
export function indexOfHourAt<T extends { at: EpochMillis }>(
  hours: T[],
  at: EpochMillis
): number {
  return hours.findIndex((hour) => at >= hour.at && at < hour.at + HOUR_MS);
}

/** ชั่วโมงที่ครอบเวลาที่ให้มา */
export function hourAt<T extends { at: EpochMillis }>(hours: T[], at: EpochMillis): T | undefined {
  const index = indexOfHourAt(hours, at);
  return index === -1 ? undefined : hours[index];
}

/**
 * ตัดสินทุกชั่วโมงของวันแยกกันทีละชั่วโมง
 *
 * ใช้ระบายแถบเวลาทั้งวันในหน้าอากาศ และเป็นวัตถุดิบของการหาช่วงเวลาที่ควรวิ่ง
 * ชั่วโมงที่เริ่มตั้งแต่เวลาพระอาทิตย์ตกเป็นต้นไปนับว่าฟ้ามืดแล้ว
 */
export function gradeHourlyClearance(
  hours: HourlyConditions[],
  sunrise: EpochMillis,
  sunset: EpochMillis
): HourClearance[] {
  return hours.map((hour) => ({
    at: hour.at,
    ...gradeHour(hour, isDarkHour(hour.at, sunrise, sunset)),
  }));
}

/**
 * ช่วงเขียวติดต่อกันที่ยาวที่สุดซึ่งยังไม่ผ่านไป
 *
 * หัวช่วงถูกตัดที่เวลาปัจจุบันและที่เวลาพระอาทิตย์ขึ้น ท้ายช่วงถูกตัดที่เวลาพระอาทิตย์ตก
 * ช่วงที่จบไปก่อนเวลาปัจจุบันจะไม่ถูกเลือกแม้จะเป็นช่วงที่ยาวที่สุด
 */
function findClearWindow(
  graded: HourClearance[],
  sunrise: EpochMillis,
  sunset: EpochMillis,
  now: EpochMillis
): ClearWindow | null {
  const runs: HourClearance[][] = [];
  let current: HourClearance[] = [];

  for (const hour of graded) {
    const isGreen = hour.level === 'green';
    const isContiguous =
      current.length === 0 || hour.at === current[current.length - 1].at + HOUR_MS;

    if (isGreen && isContiguous) {
      current.push(hour);
      continue;
    }

    if (current.length > 0) runs.push(current);
    current = isGreen ? [hour] : [];
  }
  if (current.length > 0) runs.push(current);

  let best: ClearWindow | null = null;

  for (const run of runs) {
    const start = Math.max(run[0].at, now, sunrise);
    const end = Math.min(run[run.length - 1].at + HOUR_MS, sunset);
    if (end <= start) continue;

    if (best === null || end - start > best.end - best.start) best = { start, end };
  }

  return best;
}

/**
 * ประเมินใบอนุญาตวิ่งของตอนนี้ พร้อมช่วงเวลาที่ควรวิ่งของวันนี้
 *
 * ฟังก์ชันนี้ไม่อ่านนาฬิกาเอง เวลาปัจจุบันต้องส่งเข้ามาทาง `now` เสมอ
 */
export function evaluateRunClearance({
  hours,
  sunrise,
  sunset,
  now,
}: EvaluateRunClearanceInput): RunClearance {
  const currentHour = hourAt(hours, now);
  const { level, factors } = gradeHour(currentHour, now < sunrise || now >= sunset);

  return {
    level,
    decidedBy: factors,
    clearWindow: findClearWindow(
      gradeHourlyClearance(hours, sunrise, sunset),
      sunrise,
      sunset,
      now
    ),
    pm25Unknown: currentHour === undefined || currentHour.pm25 === null,
  };
}
