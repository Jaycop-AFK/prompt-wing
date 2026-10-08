import { startOfDay, type HistoryBucket } from './run-history';
import type { SessionRecord } from './session-record';

/**
 * รายงานพัฒนาการ (ฟีเจอร์ของพร้อมวิ่ง Plus)
 *
 * เทียบ 28 วันล่าสุดกับ 28 วันก่อนหน้า และ 7 วันล่าสุดกับ 7 วันก่อนหน้า แล้วสรุปเป็นข้อสังเกตที่ผู้ใช้
 * เอาไปทำต่อได้ ไฟล์นี้คืนข้อสังเกตเป็นชนิดกับตัวเลขเท่านั้น ถ้อยคำภาษาไทยอยู่ที่ components/progress/copy.ts
 *
 * ใช้ช่วงวันแบบนับย้อนจากวันนี้ ไม่ใช่สัปดาห์หรือเดือนตามปฏิทิน ด้วยเหตุผลเดียวกับหน้าประวัติการวิ่ง
 * (ดู rangeBounds ใน run-history.ts) คนที่เปิดดูต้นสัปดาห์จะได้ไม่เห็นตัวเลขเกือบว่างทั้งที่เพิ่งวิ่งมา
 */

export interface PeriodStats {
  runs: number;
  distanceKm: number;
  /** pace เฉลี่ยถ่วงตามระยะจากเวลาที่เคลื่อนไหวจริง null เมื่อไม่มีระยะให้คิด */
  paceSecPerKm: number | null;
  longestRunKm: number;
  /** จำนวนวันที่มีการวิ่ง วันเดียววิ่งสองครั้งนับหนึ่งวัน */
  activeDays: number;
}

export interface FormTally {
  /** ครั้งที่ประเมินฟอร์มได้จริง */
  rated: number;
  good: number;
  cadenceDropped: number;
  paceDropped: number;
}

export type Insight =
  | { kind: 'comeback'; daysSinceLastRun: number }
  | { kind: 'loadJump'; percent: number }
  | { kind: 'paceFaster'; secPerKm: number }
  | { kind: 'paceSlower'; secPerKm: number }
  | { kind: 'distanceUp'; percent: number }
  | { kind: 'distanceDown'; percent: number }
  | { kind: 'longestRun'; km: number }
  | { kind: 'cadenceFade'; count: number; rated: number }
  | { kind: 'paceFade'; count: number; rated: number }
  | { kind: 'consistencyGood'; activeDays: number }
  | { kind: 'consistencyLow'; activeDays: number }
  | { kind: 'firstSteps'; runsNeeded: number };

export interface ProgressReport {
  totalRuns: number;
  /** REPORT_WINDOW_DAYS วันล่าสุดรวมวันนี้ */
  recent: PeriodStats;
  /** REPORT_WINDOW_DAYS วันก่อนหน้าช่วง recent */
  previous: PeriodStats;
  /** 7 วันล่าสุดรวมวันนี้ */
  thisWeek: PeriodStats;
  lastWeek: PeriodStats;
  /** ระยะรวมของช่วง 7 วันย้อนหลัง WEEK_BUCKETS ช่วง เรียงจากเก่าไปใหม่ ใช้กับ DistanceChart ได้ตรง ๆ */
  weeks: HistoryBucket[];
  /** ผลฟอร์มการวิ่งของช่วง recent */
  form: FormTally;
  /** pace ปกติของผู้ใช้ มัธยฐานจากการวิ่งล่าสุดที่ยาวพอ null เมื่อยังไม่มี */
  typicalPaceSecPerKm: number | null;
  /** เรียงจากเรื่องที่ควรรู้ก่อน ไม่เกิน MAX_INSIGHTS ข้อ */
  insights: Insight[];
}

export const REPORT_WINDOW_DAYS = 28;
const WEEK_BUCKETS = 8;
const MAX_INSIGHTS = 4;

/** ไม่ได้วิ่งนานเท่านี้ขึ้นไปถือว่ากำลังกลับมาวิ่ง */
const COMEBACK_DAYS = 7;
/** ระยะ 7 วันล่าสุดเพิ่มจาก 7 วันก่อนตั้งแต่สัดส่วนนี้ ถือว่าเพิ่มเร็ว ตั้งไว้สูงกว่ากฎ 10% เพื่อไม่ให้เตือนจนชิน */
const LOAD_JUMP_RATIO = 1.3;
/** ต่ำกว่าระยะนี้ สัดส่วนที่เพิ่มขึ้นแกว่งแรงเกินจะแปลผล เช่น 1 กม. เป็น 2 กม. คือเพิ่ม 100% */
const MIN_BASELINE_WEEK_KM = 3;
const MIN_BASELINE_PERIOD_KM = 5;
/** จำนวนครั้งขั้นต่ำต่อช่วงก่อนจะเทียบ pace กัน */
const MIN_RUNS_FOR_PACE = 3;
const PACE_FASTER_SEC = 10;
const PACE_SLOWER_SEC = 15;
const DISTANCE_UP_RATIO = 1.1;
const DISTANCE_DOWN_RATIO = 0.7;
const MIN_LONGEST_RUN_KM = 3;
/** ต้องไกลกว่าครั้งไกลสุดของช่วงก่อนอย่างน้อยเท่านี้ ไม่ให้ความคลาดเคลื่อนของ GPS กลายเป็นสถิติใหม่ */
const LONGEST_RUN_MARGIN_KM = 0.2;
const MIN_RATED_FOR_FORM = 3;
const FORM_FADE_RATIO = 0.5;
/** 28 วันมีวันวิ่งตั้งแต่เท่านี้ขึ้นไปถือว่าสม่ำเสมอ เท่ากับราวสามวันต่อสัปดาห์ */
const CONSISTENT_DAYS = 12;
/** ไม่เกินราวหนึ่งวันต่อสัปดาห์ */
const INCONSISTENT_DAYS = 5;
/** ประวัติน้อยกว่านี้ยังเทียบแนวโน้มอะไรไม่ได้มาก */
const RUNS_FOR_MEANINGFUL_REPORT = 4;
const TYPICAL_PACE_SAMPLE = 10;
const MIN_TYPICAL_PACE_KM = 1;

const DAY_MS = 24 * 60 * 60 * 1000;

/** เที่ยงคืนของวันที่ห่างจากวันนี้ไป days วัน สร้างด้วยตัวสร้าง Date เพื่อไม่เพี้ยนในวันที่ปรับเวลาตามฤดูกาล */
function midnightFromToday(now: number, days: number): number {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days).getTime();
}

/** ช่วงยาว lengthDays วัน ที่จบก่อนวันนี้ endsDaysAgo วัน (0 คือจบสิ้นวันนี้) */
function windowOf(now: number, endsDaysAgo: number, lengthDays: number): { start: number; end: number } {
  return {
    start: midnightFromToday(now, 1 - endsDaysAgo - lengthDays),
    end: midnightFromToday(now, 1 - endsDaysAgo),
  };
}

function inWindow(sessions: readonly SessionRecord[], { start, end }: { start: number; end: number }) {
  return sessions.filter((session) => session.finishedAt >= start && session.finishedAt < end);
}

export function periodStats(sessions: readonly SessionRecord[]): PeriodStats {
  const withDistance = sessions.filter((session) => session.distanceKm > 0);
  const paceDistance = withDistance.reduce((sum, session) => sum + session.distanceKm, 0);
  const paceSeconds = withDistance.reduce((sum, session) => sum + session.movingSeconds, 0);

  return {
    runs: sessions.length,
    distanceKm: sessions.reduce((sum, session) => sum + session.distanceKm, 0),
    paceSecPerKm: paceDistance > 0 ? paceSeconds / paceDistance : null,
    longestRunKm: sessions.reduce((longest, session) => Math.max(longest, session.distanceKm), 0),
    activeDays: new Set(sessions.map((session) => startOfDay(session.finishedAt))).size,
  };
}

function tallyForm(sessions: readonly SessionRecord[]): FormTally {
  const rated = sessions.filter((session) => session.formScore.hasEnoughData);
  return {
    rated: rated.length,
    good: rated.filter((s) => !s.formScore.cadenceDropped && !s.formScore.paceDropped).length,
    cadenceDropped: rated.filter((s) => s.formScore.cadenceDropped).length,
    paceDropped: rated.filter((s) => s.formScore.paceDropped).length,
  };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function typicalPace(sessions: readonly SessionRecord[]): number | null {
  const recentLongEnough = [...sessions]
    .filter((session) => session.distanceKm >= MIN_TYPICAL_PACE_KM && session.movingSeconds > 0)
    .sort((a, b) => b.finishedAt - a.finishedAt)
    .slice(0, TYPICAL_PACE_SAMPLE);
  return median(recentLongEnough.map((session) => session.movingSeconds / session.distanceKm));
}

function weekBuckets(sessions: readonly SessionRecord[], now: number): HistoryBucket[] {
  return Array.from({ length: WEEK_BUCKETS }, (_, index) => {
    const weeksAgo = WEEK_BUCKETS - 1 - index;
    const window = windowOf(now, weeksAgo * 7, 7);
    const start = new Date(window.start);
    return {
      label: `${start.getDate()}/${start.getMonth() + 1}`,
      distanceKm: inWindow(sessions, window).reduce((sum, session) => sum + session.distanceKm, 0),
      startsAt: window.start,
      isCurrent: weeksAgo === 0,
    };
  });
}

const percentChange = (current: number, baseline: number) => Math.round((current / baseline - 1) * 100);

function collectInsights(report: Omit<ProgressReport, 'insights'>, daysSinceLastRun: number | null): Insight[] {
  const { recent, previous, thisWeek, lastWeek, form, totalRuns } = report;
  // ยังไม่เคยวิ่งเลย หน้าจอแสดงสถานะว่างที่ชวนออกไปวิ่งครั้งแรกแทน ไม่ใช่ข้อสังเกตจากข้อมูลที่ไม่มี
  if (totalRuns === 0) return [];

  const insights: Insight[] = [];
  const comingBack = daysSinceLastRun !== null && daysSinceLastRun >= COMEBACK_DAYS;

  if (daysSinceLastRun !== null && comingBack) insights.push({ kind: 'comeback', daysSinceLastRun });

  if (
    lastWeek.distanceKm >= MIN_BASELINE_WEEK_KM &&
    thisWeek.distanceKm >= lastWeek.distanceKm * LOAD_JUMP_RATIO
  ) {
    insights.push({ kind: 'loadJump', percent: percentChange(thisWeek.distanceKm, lastWeek.distanceKm) });
  }

  // ลำดับที่ push คือลำดับความสำคัญ เพราะตัดเหลือ MAX_INSIGHTS ข้อ เรื่องที่ควรระวังมาก่อน ตามด้วยเรื่องที่
  // ลงมือปรับได้ทันทีอย่างฟอร์มการวิ่ง แล้วจึงเป็นแนวโน้มและคำชม ซึ่งหลุดไปก่อนได้ถ้ามีเรื่องเยอะ
  if (form.rated >= MIN_RATED_FOR_FORM) {
    if (form.cadenceDropped / form.rated >= FORM_FADE_RATIO) {
      insights.push({ kind: 'cadenceFade', count: form.cadenceDropped, rated: form.rated });
    } else if (form.paceDropped / form.rated >= FORM_FADE_RATIO) {
      insights.push({ kind: 'paceFade', count: form.paceDropped, rated: form.rated });
    }
  }

  if (
    recent.runs >= MIN_RUNS_FOR_PACE &&
    previous.runs >= MIN_RUNS_FOR_PACE &&
    recent.paceSecPerKm !== null &&
    previous.paceSecPerKm !== null
  ) {
    const faster = previous.paceSecPerKm - recent.paceSecPerKm;
    if (faster >= PACE_FASTER_SEC) insights.push({ kind: 'paceFaster', secPerKm: Math.round(faster) });
    else if (-faster >= PACE_SLOWER_SEC) insights.push({ kind: 'paceSlower', secPerKm: Math.round(-faster) });
  }

  if (previous.distanceKm >= MIN_BASELINE_PERIOD_KM) {
    if (recent.distanceKm >= previous.distanceKm * DISTANCE_UP_RATIO) {
      insights.push({ kind: 'distanceUp', percent: percentChange(recent.distanceKm, previous.distanceKm) });
    } else if (!comingBack && recent.distanceKm <= previous.distanceKm * DISTANCE_DOWN_RATIO) {
      insights.push({ kind: 'distanceDown', percent: -percentChange(recent.distanceKm, previous.distanceKm) });
    }
  }

  if (
    previous.runs > 0 &&
    recent.longestRunKm >= MIN_LONGEST_RUN_KM &&
    recent.longestRunKm >= previous.longestRunKm + LONGEST_RUN_MARGIN_KM
  ) {
    insights.push({ kind: 'longestRun', km: recent.longestRunKm });
  }

  if (recent.activeDays >= CONSISTENT_DAYS) {
    insights.push({ kind: 'consistencyGood', activeDays: recent.activeDays });
  } else if (!comingBack && recent.runs > 0 && recent.activeDays <= INCONSISTENT_DAYS) {
    insights.push({ kind: 'consistencyLow', activeDays: recent.activeDays });
  }

  if (totalRuns < RUNS_FOR_MEANINGFUL_REPORT) {
    insights.push({ kind: 'firstSteps', runsNeeded: RUNS_FOR_MEANINGFUL_REPORT - totalRuns });
  }

  return insights.slice(0, MAX_INSIGHTS);
}

/** รายงานพัฒนาการจากประวัติการวิ่งทั้งหมด ไม่อ่านนาฬิกาเอง เวลาปัจจุบันต้องส่งเข้ามาทาง now */
export function buildProgressReport(sessions: readonly SessionRecord[], now: number): ProgressReport {
  const past = sessions.filter((session) => session.finishedAt < midnightFromToday(now, 1));
  const recentWindow = windowOf(now, 0, REPORT_WINDOW_DAYS);

  const report: Omit<ProgressReport, 'insights'> = {
    totalRuns: past.length,
    recent: periodStats(inWindow(past, recentWindow)),
    previous: periodStats(inWindow(past, windowOf(now, REPORT_WINDOW_DAYS, REPORT_WINDOW_DAYS))),
    thisWeek: periodStats(inWindow(past, windowOf(now, 0, 7))),
    lastWeek: periodStats(inWindow(past, windowOf(now, 7, 7))),
    weeks: weekBuckets(past, now),
    form: tallyForm(inWindow(past, recentWindow)),
    typicalPaceSecPerKm: typicalPace(past),
  };

  const lastRunAt = past.reduce<number | null>(
    (latest, session) => (latest === null || session.finishedAt > latest ? session.finishedAt : latest),
    null
  );
  const daysSinceLastRun =
    lastRunAt === null ? null : Math.round((startOfDay(now) - startOfDay(lastRunAt)) / DAY_MS);

  return { ...report, insights: collectInsights(report, daysSinceLastRun) };
}
