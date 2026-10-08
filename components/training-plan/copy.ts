import {
  describeSessionTarget,
  PROGRESS_THRESHOLD,
  STEP_BACK_THRESHOLD,
  type PlanGoal,
  type PlannedWorkout,
  type WeekReview,
  type WorkoutKind,
} from '@/core/coach';

/** ถ้อยคำของแผนซ้อม ใช้ร่วมกันระหว่างหน้าแผนซ้อมกับหน้าวิ่ง */

export const GOAL_LABEL: Record<PlanGoal, string> = { '5k': '5K', '10k': '10K' };

export const GOAL_ORDER: PlanGoal[] = ['5k', '10k'];

/** บอกว่าแผนเหมาะกับใคร ให้ผู้ใช้เลือกแผนที่ไม่หนักเกินตัวตั้งแต่แรก */
export const GOAL_FIT: Record<PlanGoal, string> = {
  '5k': 'เหมาะกับคนที่วิ่งต่อเนื่องได้ราว 15–20 นาทีแล้ว',
  '10k': 'เหมาะกับคนที่วิ่ง 5 กม. หรือราว 30 นาทีต่อเนื่องได้แล้ว',
};

export const WORKOUT_LABEL: Record<WorkoutKind, string> = {
  easy: 'วิ่งเบา',
  steady: 'วิ่งต่อเนื่อง',
  intervals: 'วิ่งสลับเร็ว',
  long: 'วิ่งยาว',
  test: 'วิ่งทดสอบ',
};

export const WORKOUT_HINT: Record<WorkoutKind, string> = {
  easy: 'จังหวะสบายที่ยังพูดเป็นประโยคได้',
  steady: 'เร็วกว่าวิ่งเบาเล็กน้อย แต่ยังคุมลมหายใจได้ตลอด',
  intervals: 'วิ่งเร็ว 1 นาที สลับวิ่งเบา 2 นาที จนครบเวลา',
  long: 'สะสมระยะแบบไม่เร่ง pace เดินพักสั้น ๆ ได้ถ้าจำเป็น',
  test: 'วิ่งให้ครบระยะเป้าหมายของแผนในจังหวะที่คุมได้',
};

/** เช่น "วิ่งเบา 20 นาที" */
export function workoutTitle(workout: Pick<PlannedWorkout, 'kind' | 'target'>): string {
  return `${WORKOUT_LABEL[workout.kind]} ${describeSessionTarget(workout.target)}`;
}

/** ชื่อโปรแกรมที่บันทึกลงประวัติการวิ่ง เช่น "แผน 5K · วิ่งเบา" */
export function planProgramName(goal: PlanGoal, workout: Pick<PlannedWorkout, 'kind'>): string {
  return `แผน ${GOAL_LABEL[goal]} · ${WORKOUT_LABEL[workout.kind]}`;
}

const percent = (ratio: number) => Math.round(ratio * 100);

/** อธิบายว่าทำไมสัปดาห์นี้ได้ระดับนี้ ต้องบอกตัวเลขที่ใช้ตัดสินเสมอ ผู้ใช้จะได้เชื่อว่าแผนปรับตามตัวเองจริง */
export function reviewSentence(review: WeekReview | null, level: number, totalLevels: number): string {
  if (review === null) return 'สัปดาห์แรกของแผน เริ่มที่ระดับ 1 แล้วระดับจะปรับทุกสัปดาห์ตามการวิ่งจริงของคุณ';

  const done = `สัปดาห์ก่อนซ้อมได้ ${percent(review.completion)}%`;
  switch (review.adjustment) {
    case 'progress':
      return review.level === totalLevels
        ? `${done} อยู่ในระดับสุดท้ายของแผนแล้ว`
        : `${done} ขยับขึ้นเป็นระดับ ${level}`;
    case 'repeat':
      return `${done} ทำระดับ ${level} ซ้ำอีกสัปดาห์ให้ร่างกายคุ้นก่อน`;
    case 'stepBack':
      return review.level === 1
        ? `${done} เริ่มระดับ 1 อีกสัปดาห์แบบไม่รีบ`
        : `${done} ลดเหลือระดับ ${level} ให้กลับเข้าจังหวะก่อน`;
  }
}

/** กติกาการปรับระดับ แสดงให้ผู้ใช้เห็นตรง ๆ ตรงกับค่าคงที่ใน core/coach/training-plan.ts */
export const ADJUSTMENT_RULE = `ซ้อมได้ ${percent(PROGRESS_THRESHOLD)}% ขึ้นไปขยับระดับ · ${percent(STEP_BACK_THRESHOLD)}–${percent(PROGRESS_THRESHOLD) - 1}% ทำระดับเดิมซ้ำ · ต่ำกว่า ${percent(STEP_BACK_THRESHOLD)}% ลดระดับ`;

/** เวลาซ้อมที่เลือกได้ นาทีนับจากเที่ยงคืน เช้ามืดกับเย็นคือช่วงที่คนไทยวิ่งกันมากที่สุด */
export const PREFERRED_TIME_PRESETS = [5 * 60 + 30, 6 * 60, 6 * 60 + 30, 17 * 60, 17 * 60 + 30, 18 * 60 + 30];
