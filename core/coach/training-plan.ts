import { buildSessionTarget } from './session-target';
import type {
  CompletedRun,
  EpochMillis,
  PlanGoal,
  PlannedWorkout,
  SessionTarget,
  TrainingPlanSettings,
  TrainingWeek,
  WeekAdjustment,
  WeekReview,
  WorkoutKind,
} from './types';

/**
 * แผนซ้อม 5K / 10K ที่ปรับระดับทีละสัปดาห์ตามผลการวิ่งจริง (ฟีเจอร์ของพร้อมวิ่ง Plus)
 *
 * ระดับของสัปดาห์ปัจจุบันไม่ได้เก็บไว้ที่ไหน คำนวณใหม่ทุกครั้งจากวันเริ่มแผนกับประวัติการวิ่ง
 * โดยเดินผ่านทีละสัปดาห์ที่จบแล้ว ผลที่ได้จึงตรงกับประวัติเสมอแม้ผู้ใช้จะลบการวิ่งหรือเปลี่ยนเครื่อง
 *
 * ตัวเลขในตารางเป็นค่าเริ่มต้นที่ค่อยเป็นค่อยไปสำหรับผู้เริ่มวิ่งที่วิ่งต่อเนื่องได้แล้ว ไม่ได้อ้างว่า
 * ป้องกันการบาดเจ็บหรือรับประกันผล หน้าจอที่แสดงแผนต้องไม่สัญญาเรื่องเหล่านั้นแทนโมดูลนี้
 */

/** ซ้อมได้ตั้งแต่สัดส่วนนี้ของสัปดาห์ขึ้นไป สัปดาห์ถัดไปขยับขึ้นหนึ่งระดับ */
export const PROGRESS_THRESHOLD = 0.8;
/** ซ้อมได้น้อยกว่าสัดส่วนนี้ สัปดาห์ถัดไปลดลงหนึ่งระดับ ระหว่างสองค่านี้ทำระดับเดิมซ้ำ */
export const STEP_BACK_THRESHOLD = 0.5;
/** การซ้อมครั้งหนึ่งที่ทำได้ตั้งแต่สัดส่วนนี้ขึ้นไปถือว่าทำแล้ว */
export const WORKOUT_DONE_THRESHOLD = 0.8;

export const PLAN_MIN_RUN_DAYS = 3;
export const PLAN_MAX_RUN_DAYS = 4;

/**
 * การวิ่งที่สั้นกว่านี้ทั้งระยะและเวลาไม่นับเป็นการซ้อม เช่นกดเริ่มแล้วจบทันทีเพื่อลอง GPS
 * ถ้านับด้วยจะไปจับคู่กับการซ้อมจริงแล้วกินโควตาการวิ่งของสัปดาห์นั้นไป
 */
const MIN_COUNTED_KM = 0.5;
const MIN_COUNTED_SECONDS = 5 * 60;

/**
 * จำนวนการวิ่งสูงสุดต่อสัปดาห์ที่เอามาลองจับคู่กับการซ้อม เลือกครั้งที่ยาวที่สุดก่อน
 * กันไม่ให้การลองทุกแบบช้าลงมากในสัปดาห์ที่มีคนกดบันทึกการวิ่งถี่ผิดปกติ
 */
const MAX_CANDIDATE_RUNS = 10;
/** ความคลาดเคลื่อนของทศนิยมตอนเทียบผลรวมส่วนที่ทำได้ */
const SCORE_EPSILON = 1e-9;

interface LevelTemplate {
  easyMinutes: number;
  quality: { kind: 'steady' | 'intervals'; minutes: number };
  long: { kind: 'long' | 'test'; km: number };
  /** วันที่สี่สำหรับคนที่เลือกซ้อมสี่วันต่อสัปดาห์ */
  extraEasyMinutes: number;
}

function level(
  easyMinutes: number,
  qualityKind: 'steady' | 'intervals',
  qualityMinutes: number,
  longKm: number,
  extraEasyMinutes: number,
  longKind: 'long' | 'test' = 'long'
): LevelTemplate {
  return {
    easyMinutes,
    quality: { kind: qualityKind, minutes: qualityMinutes },
    long: { kind: longKind, km: longKm },
    extraEasyMinutes,
  };
}

/**
 * ตารางระดับของแต่ละแผน ทุกสามถึงสี่ระดับมีสัปดาห์ที่เบาลงหนึ่งสัปดาห์ และระดับสุดท้ายคือวิ่งทดสอบ
 * ระยะเป้าหมายของแผน ระดับขยับตามผลการวิ่ง ไม่ใช่ตามจำนวนสัปดาห์ที่ผ่านไป
 */
const PLAN_LEVELS: Record<PlanGoal, LevelTemplate[]> = {
  '5k': [
    level(20, 'steady', 15, 3, 15),
    level(20, 'intervals', 20, 3.5, 15),
    level(25, 'steady', 20, 4, 20),
    level(20, 'steady', 15, 3.5, 15),
    level(25, 'intervals', 25, 4.5, 20),
    level(30, 'steady', 25, 5, 20),
    level(30, 'intervals', 25, 5.5, 20),
    level(20, 'steady', 15, 5, 15, 'test'),
  ],
  '10k': [
    level(30, 'steady', 20, 5, 20),
    level(30, 'intervals', 25, 6, 20),
    level(35, 'steady', 25, 6.5, 25),
    level(30, 'steady', 20, 5.5, 20),
    level(35, 'intervals', 30, 7.5, 25),
    level(40, 'steady', 30, 8, 25),
    level(40, 'intervals', 30, 9, 30),
    level(35, 'steady', 25, 7, 25),
    level(40, 'intervals', 35, 9.5, 30),
    level(30, 'steady', 20, 10, 20, 'test'),
  ],
};

export function totalLevelsOf(goal: PlanGoal): number {
  return PLAN_LEVELS[goal].length;
}

/** วันซ้อมที่เลือกใช้ได้จริง: 3 หรือ 4 วันที่ไม่ซ้ำกันในสัปดาห์ */
export function isValidRunDays(runDays: readonly number[]): boolean {
  const unique = new Set(runDays);
  return (
    unique.size === runDays.length &&
    runDays.length >= PLAN_MIN_RUN_DAYS &&
    runDays.length <= PLAN_MAX_RUN_DAYS &&
    runDays.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)
  );
}

interface WorkoutPlan {
  kind: WorkoutKind;
  target: SessionTarget;
}

/**
 * การซ้อมของระดับหนึ่ง เรียงตามลำดับที่ควรทำในสัปดาห์ วิ่งยาวอยู่ท้ายสุดเสมอ
 * ให้วันเบาและวันที่หนักขึ้นกระจายก่อนวันที่ยาวที่สุดของสัปดาห์
 */
function workoutsForLevel(template: LevelTemplate, dayCount: number): WorkoutPlan[] {
  const easy: WorkoutPlan = { kind: 'easy', target: buildSessionTarget('time', template.easyMinutes) };
  const quality: WorkoutPlan = {
    kind: template.quality.kind,
    target: buildSessionTarget('time', template.quality.minutes),
  };
  const long: WorkoutPlan = { kind: template.long.kind, target: buildSessionTarget('distance', template.long.km) };
  const extra: WorkoutPlan = { kind: 'easy', target: buildSessionTarget('time', template.extraEasyMinutes) };

  return dayCount >= PLAN_MAX_RUN_DAYS ? [easy, quality, extra, long] : [easy, quality, long];
}

/** เที่ยงคืนของวันที่ระบุ ตามเขตเวลาของเครื่อง */
function midnightOf(at: EpochMillis): EpochMillis {
  const d = new Date(at);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** เที่ยงคืนของวันที่ห่างจาก base ไป days วัน สร้างด้วยตัวสร้าง Date เพื่อไม่เพี้ยนในวันที่ปรับเวลาตามฤดูกาล */
function addDays(base: EpochMillis, days: number): EpochMillis {
  const d = new Date(base);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days).getTime();
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** สัปดาห์ของแผนที่ครอบเวลา at เริ่มนับที่ 0 เวลาก่อนวันเริ่มแผนนับเป็นสัปดาห์แรก */
function weekIndexAt(planStart: EpochMillis, at: EpochMillis): number {
  // ปัดเศษแทนปัดลง เพราะช่วงที่มีวันยาว 23 หรือ 25 ชั่วโมงจะหารได้ไม่ลงตัวพอดี
  const days = Math.round((midnightOf(at) - planStart) / DAY_MS);
  return Math.max(0, Math.floor(days / 7));
}

/** เที่ยงคืนของทุกวันซ้อมในช่วง [from, to) เรียงตามวันที่ */
export function runDaysBetween(
  runDays: readonly number[],
  from: EpochMillis,
  to: EpochMillis
): EpochMillis[] {
  const days: EpochMillis[] = [];
  for (let day = midnightOf(from); day < to; day = addDays(day, 1)) {
    if (runDays.includes(new Date(day).getDay())) days.push(day);
  }
  return days;
}

function isCountedRun(run: CompletedRun): boolean {
  return run.distanceKm >= MIN_COUNTED_KM || run.movingSeconds >= MIN_COUNTED_SECONDS;
}

/** ส่วนที่การวิ่งครั้งนี้ทำได้เมื่อเทียบกับเป้าหมายของการซ้อม เทียบในหน่วยเดียวกับที่ตั้งไว้เสมอ */
function completionOf(target: SessionTarget, run: CompletedRun): number {
  switch (target.kind) {
    case 'distance':
      return Math.min(1, run.distanceKm / target.km);
    case 'time':
      return Math.min(1, run.movingSeconds / 60 / target.minutes);
    case 'calories':
      return 0;
  }
}

/** ขนาดคร่าว ๆ ของการวิ่งหนึ่งครั้ง ใช้แค่เลือกว่าครั้งไหนควรถูกลองจับคู่ก่อน */
function runSize(run: CompletedRun): number {
  return run.movingSeconds + run.distanceKm * 420;
}

/**
 * จับคู่การวิ่งในสัปดาห์กับการซ้อม คืนส่วนที่ทำได้ของการซ้อมแต่ละครั้งตามลำดับเดิม
 *
 * เลือกการจับคู่ที่ได้ผลรวมส่วนที่ทำได้มากที่สุด ถ้าเท่ากันเลือกแบบที่วันวิ่งจริงใกล้วันที่วางไว้ที่สุด
 * การวิ่งหนึ่งครั้งนับให้การซ้อมได้ครั้งเดียว ไม่จับคู่ตามลำดับเวลาตรง ๆ เพราะคนที่ไปวิ่งยาวก่อนวันเบา
 * จะดูเหมือนซ้อมไม่ครบทั้งที่ซ้อมครบ และไม่ให้การซ้อมที่หนักที่สุดเลือกก่อน เพราะวิ่งเบาครั้งเดียวต้นสัปดาห์
 * ที่ระยะใกล้วิ่งยาวจะถูกนับเป็นวิ่งยาวของวันศุกร์ แทนที่จะเป็นวิ่งเบาของวันนั้นเอง
 *
 * ลองทุกแบบได้เพราะหนึ่งสัปดาห์มีการซ้อมไม่เกินสี่ครั้งและการวิ่งถูกจำกัดไว้ที่ MAX_CANDIDATE_RUNS
 */
function matchCompletions(
  plan: WorkoutPlan[],
  scheduledOn: EpochMillis[],
  runs: CompletedRun[]
): number[] {
  const candidates =
    runs.length > MAX_CANDIDATE_RUNS
      ? [...runs].sort((a, b) => runSize(b) - runSize(a)).slice(0, MAX_CANDIDATE_RUNS)
      : runs;
  const scores = plan.map((workout) => candidates.map((run) => completionOf(workout.target, run)));
  const dayGaps = plan.map((_, workoutIndex) =>
    candidates.map((run) => Math.abs(midnightOf(run.at) - (scheduledOn[workoutIndex] ?? run.at)))
  );

  let best = { total: 0, gap: 0, picks: plan.map(() => -1) };
  const picks: number[] = [];
  const used = new Set<number>();

  const search = (workoutIndex: number, total: number, gap: number) => {
    if (workoutIndex === plan.length) {
      const better =
        total > best.total + SCORE_EPSILON ||
        (Math.abs(total - best.total) <= SCORE_EPSILON && gap < best.gap);
      if (better) best = { total, gap, picks: [...picks] };
      return;
    }

    picks.push(-1);
    search(workoutIndex + 1, total, gap);
    picks.pop();

    candidates.forEach((_, runIndex) => {
      const score = scores[workoutIndex][runIndex];
      if (used.has(runIndex) || score === 0) return;
      used.add(runIndex);
      picks.push(runIndex);
      search(workoutIndex + 1, total + score, gap + dayGaps[workoutIndex][runIndex]);
      picks.pop();
      used.delete(runIndex);
    });
  };
  search(0, 0, 0);

  return best.picks.map((runIndex, workoutIndex) => (runIndex === -1 ? 0 : scores[workoutIndex][runIndex]));
}

function adjustmentFor(completion: number): WeekAdjustment {
  if (completion >= PROGRESS_THRESHOLD) return 'progress';
  if (completion >= STEP_BACK_THRESHOLD) return 'repeat';
  return 'stepBack';
}

const LEVEL_DELTA: Record<WeekAdjustment, number> = { progress: 1, repeat: 0, stepBack: -1 };

function evaluateWeek(
  settings: TrainingPlanSettings,
  planStart: EpochMillis,
  levelNumber: number,
  weekIndex: number,
  counted: CompletedRun[]
): Pick<TrainingWeek, 'startsAt' | 'endsAt' | 'workouts' | 'completion'> {
  const startsAt = addDays(planStart, 7 * weekIndex);
  const endsAt = addDays(planStart, 7 * (weekIndex + 1));
  const template = PLAN_LEVELS[settings.goal][levelNumber - 1];
  const plan = workoutsForLevel(template, settings.runDays.length);
  const days = runDaysBetween(settings.runDays, startsAt, endsAt);
  const completions = matchCompletions(
    plan,
    days,
    counted.filter((run) => run.at >= startsAt && run.at < endsAt)
  );

  const workouts: PlannedWorkout[] = plan.map((workout, index) => ({
    ...workout,
    // วันซ้อมที่ถูกต้องมี 3–4 วันเท่ากับจำนวนการซ้อมเสมอ ค่าสำรองมีไว้กันข้อมูลตั้งค่าที่ผิดรูปเท่านั้น
    scheduledOn: days[index] ?? days[days.length - 1] ?? startsAt,
    completion: completions[index],
  }));

  return {
    startsAt,
    endsAt,
    workouts,
    completion: completions.reduce((sum, value) => sum + value, 0) / Math.max(1, completions.length),
  };
}

export interface BuildTrainingWeekInput {
  settings: TrainingPlanSettings;
  /** ประวัติการวิ่งทั้งหมดของผู้ใช้ ไม่ต้องเรียงลำดับ */
  runs: readonly CompletedRun[];
  now: EpochMillis;
}

/**
 * สัปดาห์ปัจจุบันของแผนซ้อม พร้อมระดับที่ปรับตามผลของทุกสัปดาห์ที่จบไปแล้ว
 *
 * เริ่มที่ระดับ 1 แล้วทบทวนทีละสัปดาห์ ซ้อมได้ตั้งแต่ PROGRESS_THRESHOLD ขยับขึ้น ต่ำกว่า
 * STEP_BACK_THRESHOLD ลดลง ระหว่างนั้นทำซ้ำ สัปดาห์ที่ไม่ได้วิ่งเลยจึงลดลงทีละระดับ ให้คนที่หายไป
 * หลายสัปดาห์กลับมาเริ่มที่เบากว่าเดิม ไม่อ่านนาฬิกาเอง เวลาปัจจุบันต้องส่งเข้ามาทาง now
 */
export function buildTrainingWeek({ settings, runs, now }: BuildTrainingWeekInput): TrainingWeek {
  const totalLevels = totalLevelsOf(settings.goal);
  const planStart = midnightOf(settings.startedAt);
  const currentIndex = weekIndexAt(planStart, now);
  const counted = runs.filter(isCountedRun);

  let levelNumber = 1;
  let review: WeekReview | null = null;
  let finished = false;

  for (let weekIndex = 0; weekIndex < currentIndex; weekIndex += 1) {
    const { completion } = evaluateWeek(settings, planStart, levelNumber, weekIndex, counted);
    const adjustment = adjustmentFor(completion);
    if (levelNumber === totalLevels && adjustment === 'progress') finished = true;

    review = { level: levelNumber, completion, adjustment };
    levelNumber = Math.min(totalLevels, Math.max(1, levelNumber + LEVEL_DELTA[adjustment]));
  }

  return {
    weekNumber: currentIndex + 1,
    level: levelNumber,
    totalLevels,
    ...evaluateWeek(settings, planStart, levelNumber, currentIndex, counted),
    review,
    finished,
  };
}

/** การซ้อมครั้งถัดไปที่ยังทำไม่ครบของสัปดาห์นี้ null เมื่อซ้อมครบทุกครั้งแล้ว */
export function nextWorkout(week: TrainingWeek): PlannedWorkout | null {
  return week.workouts.find((workout) => workout.completion < WORKOUT_DONE_THRESHOLD) ?? null;
}
