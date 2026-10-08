/**
 * ชนิดข้อมูลของโมดูลตัวตัดสินใจ
 *
 * โมดูลนี้เป็น seam เดียวของโปรเจกต์ ห้าม import อะไรจาก react-native หรือ expo
 * และห้ามอ่านนาฬิกาข้างใน เวลาปัจจุบันส่งเข้ามาเป็นพารามิเตอร์เสมอ
 */

/**
 * เวลาเป็น epoch milliseconds
 *
 * ตั้งชื่อไว้เพราะตัวเชื่อมข้างนอกคืนเวลามาคนละหน่วย Open-Meteo เป็นสตริง ISO
 * ส่วน Air4Thai เป็นสตริงวันที่กับเวลาแยกกัน การแปลงต้องจบที่ขอบก่อนเข้าโมดูลนี้
 */
export type EpochMillis = number;

/** ระดับของใบอนุญาตวิ่ง */
export type ClearanceLevel = 'green' | 'yellow' | 'red';

/** ปัจจัยที่เป็นคนตัดสินว่าทำไมวันนี้ไม่เขียว */
export type ClearanceFactor = 'heat' | 'pm25' | 'uv' | 'storm' | 'dark';

/** ค่าที่วัดได้ของหนึ่งชั่วโมง */
export interface HourlyConditions {
  /** เวลาต้นชั่วโมง */
  at: EpochMillis;
  /** อุณหภูมิที่รู้สึกได้ องศาเซลเซียส */
  apparentTemperature: number;
  /** PM2.5 ไมโครกรัมต่อลูกบาศก์เมตร null เมื่อไม่มีข้อมูล */
  pm25: number | null;
  /** ดัชนี UV */
  uvIndex: number;
  /** ชั่วโมงนี้มีพายุฝนฟ้าคะนอง */
  thunderstorm: boolean;
}

/** ระดับของหนึ่งชั่วโมง ใช้ระบายแถบเวลาทั้งวัน */
export interface HourClearance {
  at: EpochMillis;
  level: ClearanceLevel;
  /** ปัจจัยที่ตัดสินชั่วโมงนี้ ว่างเปล่าเมื่อเป็นสีเขียว */
  factors: ClearanceFactor[];
}

/** ช่วงเวลาที่ควรวิ่ง */
export interface ClearWindow {
  start: EpochMillis;
  end: EpochMillis;
}

/** คำตัดสินว่าวันนี้ออกไปวิ่งกลางแจ้งได้หรือไม่ */
export interface RunClearance {
  level: ClearanceLevel;
  /** ปัจจัยที่ตัดสินระดับนี้ ว่างเปล่าเมื่อเป็นสีเขียว เรียงตามลำดับคงที่ */
  decidedBy: ClearanceFactor[];
  /** ช่วงเขียวติดต่อกันที่ยาวที่สุดที่ยังไม่ผ่านไป null เมื่อไม่มีเลย */
  clearWindow: ClearWindow | null;
  /** true เมื่อชั่วโมงที่ประเมินไม่มีค่า PM2.5 ให้ใช้ */
  pm25Unknown: boolean;
}

export interface EvaluateRunClearanceInput {
  /** ค่ารายชั่วโมงของวันนี้ ต้องเรียงจากเช้าไปเย็น */
  hours: HourlyConditions[];
  /** เวลาพระอาทิตย์ขึ้นของวันนี้ */
  sunrise: EpochMillis;
  /** เวลาพระอาทิตย์ตกของวันนี้ */
  sunset: EpochMillis;
  /** เวลาปัจจุบัน */
  now: EpochMillis;
}

/** เหตุผลที่ผู้ใช้วิ่ง ตั้งครั้งเดียวแล้วกำหนดเป้าหมายรายวันทั้งเดือน */
export type Objective = 'loseWeight' | 'health' | 'marathon' | 'endurance';

/** การวิ่งครั้งหนึ่งในอดีต ย่อเหลือแค่สิ่งที่ตัวตัดสินใจต้องใช้ */
export interface RunHistoryEntry {
  at: EpochMillis;
  distanceKm: number;
}

/** ระยะทางที่ควรสะสมให้ครบภายในวันนี้ เกิดจาก Objective ไม่ใช่ผู้ใช้ตั้งเอง */
export interface DailyGoal {
  distanceKm: number;
}

/** เพศทางสรีรวิทยา ใช้ประกอบการแปลผลเท่านั้น ไม่ได้ใช้ตัดสินใจอะไรที่ต่างกันในเวอร์ชันนี้ */
export type Sex = 'male' | 'female';

export type BodyCompositionMethod = 'circumference' | 'bia';

/** ข้อมูลตัวผู้ใช้ที่กรอกเองในหน้าโปรไฟล์ ทุกช่องเป็นทางเลือก กรอกทีหลังได้ */
export interface RunnerProfile {
  weightKg: number | null;
  heightCm: number | null;
  age: number | null;
  sex: Sex | null;
  bodyCompositionMethod: BodyCompositionMethod;
  waistCm: number | null;
  neckCm: number | null;
  hipCm: number | null;
  bodyFatPercent: number | null;
  muscleMassKg: number | null;
  visceralFatLevel: number | null;
  /** เวลาที่ผู้ใช้กรอกหรือซิงก์ค่าร่างกายล่าสุด เป็น ISO 8601 */
  bodyMeasuredAt: string | null;
  objective: Objective;
}

/** ช่วงของค่า BMI ตามเกณฑ์กรมอนามัย ดู core/coach/bmi.ts */
export type BmiCategory = 'underweight' | 'normal' | 'overweight' | 'obese1' | 'obese2';

/** ตัวอย่างหนึ่งจุดระหว่างการวิ่ง เรียงจากระยะสะสมน้อยไปมาก */
export interface FormSample {
  /** ระยะสะสมจากจุดเริ่มวิ่ง หน่วยกิโลเมตร */
  distanceKm: number;
  cadenceSpm: number;
  /** วินาทีต่อกิโลเมตร ณ ตัวอย่างนี้ ยิ่งมากยิ่งช้า */
  paceSecPerKm: number;
}

/** การประเมินคุณภาพท่าวิ่งหลังจบ Session หนึ่งครั้ง */
export interface FormScore {
  /** false เมื่อ Session สั้นเกินกว่าจะประเมินได้ ค่าฟิลด์อื่นไม่มีความหมายเมื่อเป็น false */
  hasEnoughData: boolean;
  cadenceDropped: boolean;
  paceDropped: boolean;
  /** ประโยคภาษาไทยที่บอกผู้ใช้ว่าควรทำอะไรต่อ มีเสมอไม่ว่าผลจะเป็นอย่างไร */
  summary: string;
}

/** สิ่งที่ผู้ใช้ตั้งใจจะทำให้ได้ในการวิ่งครั้งเดียวที่กำลังจะเริ่ม */
export type SessionTarget =
  | { kind: 'distance'; km: number }
  | { kind: 'time'; minutes: number }
  | { kind: 'calories'; kcal: number };

/**
 * ขั้นหนึ่งของ RAMP ทุกชุดวอร์มอัพต้องมีท่าอย่างน้อยหนึ่งท่าจากทุกขั้น
 *
 * components/warmup/skeleton.ts ก็ประกาศยูเนียนนี้ซ้ำอีกชุดหนึ่งด้วยค่าเดียวกันเป๊ะ
 * ตั้งใจไม่ import ข้ามมาใช้ร่วมกัน เพราะ core/coach ต้องไม่ผูกกับโฟลเดอร์ UI เลยแม้แต่ตอน
 * import แค่ type ก็ตาม ถ้าจะเพิ่มขั้นที่ห้าในอนาคตต้องแก้ทั้งสองที่ด้วยมือ
 */
export type RampPhase = 'raise' | 'activate' | 'mobilise' | 'potentiate';

/** จำนวนนาทีที่เลือกวอร์มอัพได้ ตรงกับสามตัวเลือกในหน้าวอร์มอัพ */
export type WarmUpMinutes = 5 | 10 | 15;

/** ท่าหนึ่งท่าในชุดวอร์มอัพ พร้อมเวลาที่ควรทำ */
export interface WarmUpSlot {
  moveId: string;
  seconds: number;
}

/** ชุดวอร์มอัพที่ระบบเลือกมาให้สำหรับการวิ่งครั้งนี้โดยเฉพาะ */
export interface WarmUpSet {
  slots: WarmUpSlot[];
  totalSeconds: number;
  /** เหตุผลที่ปรับชุดจากค่าเริ่มต้น ว่างเปล่าเมื่อไม่มีการปรับ แสดงให้ผู้ใช้เห็นเสมอ */
  reasons: string[];
}

/** SessionTarget ที่อาจถูกลดลงจากที่ผู้ใช้ตั้งไว้ เพราะใบอนุญาตวิ่งวันนี้เป็นสีเหลือง */
export interface ReducedSessionTarget {
  target: SessionTarget;
  /** เหตุผลที่ลดเป้าหมายรอบนี้ลง null เมื่อไม่ได้ลด */
  reason: string | null;
}

/** สรุปก่อนเริ่มวิ่ง คาดการณ์จาก SessionTarget ที่จะใช้จริง (หลังลดแล้วถ้ามีการลด) */
export interface SessionSummary {
  estimatedMinutes: number;
  estimatedKcal: number;
  recommendedPaceSecPerKm: number;
}

/** ระยะที่แผนซ้อมพาผู้ใช้ไปให้ถึง */
export type PlanGoal = '5k' | '10k';

/** ชนิดของการซ้อมหนึ่งครั้งในแผนซ้อม */
export type WorkoutKind = 'easy' | 'steady' | 'intervals' | 'long' | 'test';

/** การตั้งค่าแผนซ้อมที่ผู้ใช้เลือกเอง */
export interface TrainingPlanSettings {
  goal: PlanGoal;
  /** วันที่สะดวกซ้อมตาม Date.getDay() (0 = อาทิตย์) ไม่ซ้ำกัน เรียงจากน้อยไปมาก */
  runDays: number[];
  /** เวลาที่ตั้งใจออกไปซ้อม นับเป็นนาทีจากเที่ยงคืน เช่น 360 คือ 06:00 */
  preferredMinuteOfDay: number;
  /** เวลาที่เริ่มแผน วันของเวลานี้คือวันแรกของสัปดาห์ที่ 1 */
  startedAt: EpochMillis;
}

/** การวิ่งที่จบแล้ว ย่อเหลือแค่สิ่งที่แผนซ้อมใช้ตัดสินว่าซ้อมไปได้แค่ไหน */
export interface CompletedRun {
  at: EpochMillis;
  distanceKm: number;
  movingSeconds: number;
}

/** การซ้อมหนึ่งครั้งในสัปดาห์ของแผนซ้อม */
export interface PlannedWorkout {
  kind: WorkoutKind;
  target: SessionTarget;
  /** เที่ยงคืนของวันที่วางไว้ให้ซ้อม */
  scheduledOn: EpochMillis;
  /** ส่วนที่ทำได้จริง 0 ถึง 1 จากการวิ่งที่จับคู่กับการซ้อมนี้ 0 เมื่อยังไม่มีการวิ่งที่นับได้ */
  completion: number;
}

/** สิ่งที่แผนซ้อมทำกับระดับของสัปดาห์ถัดไป หลังทบทวนสัปดาห์ที่จบแล้ว */
export type WeekAdjustment = 'progress' | 'repeat' | 'stepBack';

/** ผลทบทวนสัปดาห์ที่จบไปแล้ว เป็นเหตุผลของระดับในสัปดาห์ถัดไป */
export interface WeekReview {
  /** ระดับของสัปดาห์ที่ถูกทบทวน */
  level: number;
  /** ส่วนที่ซ้อมได้จริงของทั้งสัปดาห์ 0 ถึง 1 */
  completion: number;
  adjustment: WeekAdjustment;
}

/** สัปดาห์ปัจจุบันของแผนซ้อม ระดับคำนวณใหม่จากประวัติการวิ่งทุกครั้ง ไม่ได้เก็บไว้ */
export interface TrainingWeek {
  /** สัปดาห์ที่เท่าไรนับจากวันเริ่มแผน เริ่มที่ 1 */
  weekNumber: number;
  /** ระดับความหนักของสัปดาห์นี้ 1 ถึง totalLevels */
  level: number;
  totalLevels: number;
  startsAt: EpochMillis;
  /** เที่ยงคืนหลังวันสุดท้ายของสัปดาห์ */
  endsAt: EpochMillis;
  /** เรียงตามวันที่วางไว้ */
  workouts: PlannedWorkout[];
  /** ส่วนที่ซ้อมได้แล้วของสัปดาห์นี้ 0 ถึง 1 */
  completion: number;
  /** ทบทวนสัปดาห์ก่อนหน้า null ในสัปดาห์แรก */
  review: WeekReview | null;
  /** เคยซ้อมสัปดาห์ของระดับสุดท้ายได้ครบแล้วอย่างน้อยหนึ่งครั้ง */
  finished: boolean;
}

/** ภาพรวมช่วงเวลาวิ่งของทั้งวัน ใช้กับวันในอนาคตที่ยังไม่มีคำว่า "ตอนนี้" ให้ตัดสิน */
export interface DayOutlook {
  /** ระดับที่ดีที่สุดของชั่วโมงกลางวันที่ยังไม่ผ่านไป null เมื่อไม่เหลือชั่วโมงให้ประเมิน */
  bestLevel: ClearanceLevel | null;
  clearWindow: ClearWindow | null;
  /** ปัจจัยของชั่วโมงที่อยู่ในระดับดีที่สุด ว่างเปล่าเมื่อเป็นสีเขียว เรียงตามลำดับคงที่ */
  factors: ClearanceFactor[];
  /** ชั่วโมงกลางวันที่เหลืออยู่มีบางชั่วโมงไม่มีค่า PM2.5 */
  pm25Unknown: boolean;
  /** ผลตัดสินรายชั่วโมงของทั้งวัน ใช้เช็คเวลาที่ผู้ใช้ตั้งใจจะวิ่ง */
  hours: HourClearance[];
}
