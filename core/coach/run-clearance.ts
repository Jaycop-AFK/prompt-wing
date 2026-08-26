import type {
  ClearWindow,
  ClearanceFactor,
  ClearanceLevel,
  EvaluateRunClearanceInput,
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

/** ลำดับคงที่ของปัจจัย เพื่อให้ decidedBy เรียงเหมือนกันทุกครั้ง */
const FACTOR_ORDER: ClearanceFactor[] = ['heat', 'pm25', 'uv', 'storm', 'dark'];

const byFactorOrder = (a: ClearanceFactor, b: ClearanceFactor) =>
  FACTOR_ORDER.indexOf(a) - FACTOR_ORDER.indexOf(b);

interface HourGrade {
  level: ClearanceLevel;
  factors: ClearanceFactor[];
}

/**
 * ตัดสินหนึ่งชั่วโมงด้วยกฎ "ตัวที่แย่ที่สุดเป็นคนตัดสิน"
 *
 * ไม่เอาปัจจัยมาเฉลี่ยกัน เพราะอากาศเย็นสบายไม่ได้ชดเชย PM2.5 ที่พุ่ง
 * และเมื่อผลรวมเป็นแดง จะรายงานเฉพาะปัจจัยระดับแดง ไม่ปนปัจจัยระดับเหลือง
 */
function gradeHour(hour: HourlyConditions | undefined, isDark: boolean): HourGrade {
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

/** ชั่วโมงที่ครอบเวลา now อยู่ */
function hourContaining(hours: HourlyConditions[], now: number) {
  return hours.find((hour) => now >= hour.at && now < hour.at + HOUR_MS);
}

/**
 * ช่วงเขียวติดต่อกันที่ยาวที่สุดซึ่งยังไม่ผ่านไป
 *
 * หัวช่วงถูกตัดที่เวลาปัจจุบัน และท้ายช่วงถูกตัดที่เวลาพระอาทิตย์ตก
 * ช่วงที่จบไปก่อนเวลาปัจจุบันจะไม่ถูกเลือกแม้จะเป็นช่วงที่ยาวที่สุด
 */
function findClearWindow(
  hours: HourlyConditions[],
  sunset: number,
  now: number
): ClearWindow | null {
  const runs: HourlyConditions[][] = [];
  let current: HourlyConditions[] = [];

  for (const hour of hours) {
    const isGreen = gradeHour(hour, hour.at >= sunset).level === 'green';
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
    const start = Math.max(run[0].at, now);
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
  sunset,
  now,
}: EvaluateRunClearanceInput): RunClearance {
  const currentHour = hourContaining(hours, now);
  const { level, factors } = gradeHour(currentHour, now >= sunset);

  return {
    level,
    decidedBy: factors,
    clearWindow: findClearWindow(hours, sunset, now),
    pm25Unknown: currentHour === undefined || currentHour.pm25 === null,
  };
}
