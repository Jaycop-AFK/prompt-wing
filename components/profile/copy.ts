import type { BmiCategory, Objective, Sex } from '@/core/coach';

/** เรียงจากที่คนไทยเลือกบ่อยที่สุดลงไป ลดน้ำหนักมาก่อนเพราะเป็นเหตุผลที่พบบ่อยที่สุดของผู้เริ่มวิ่ง */
export const OBJECTIVE_ORDER: Objective[] = ['loseWeight', 'health', 'endurance', 'marathon'];

export const OBJECTIVE_LABEL: Record<Objective, string> = {
  loseWeight: 'ลดน้ำหนัก',
  health: 'สุขภาพ',
  endurance: 'เพิ่มความอึด',
  marathon: 'มาราธอน',
};

/**
 * ประโยคบอกว่าเลือกอันนี้แล้วเป้าหมายรายวันจะเปลี่ยนไปยังไง ให้ผู้ใช้เห็นผลก่อนกด
 *
 * ต้องบรรยายสิ่งที่โค้ดทำจริงเท่านั้น ห้ามบรรยายสิ่งที่ตั้งใจให้เป็นแต่ยังทำไม่ได้ เช่นเพิ่มความอึด
 * สลับตาม "จำนวนครั้งที่วิ่ง" ไม่ใช่ "วัน" (ดู core/coach/daily-goal.ts) จึงห้ามเขียนว่าสลับวันเว้นวัน
 * และมาราธอนคำนวณจากเจ็ดวันล่าสุดแล้วหารด้วยความถี่ซ้อมสมมติ ผลที่ได้จึงมักน้อยกว่าระยะที่วิ่งมาจริง
 * ไม่ใช่มากกว่า จะเขียนว่า "เพิ่มระยะ" ไม่ได้
 */
export const OBJECTIVE_EFFECT: Record<Objective, string> = {
  loseWeight: 'ระยะคงที่ทุกวัน เน้นความสม่ำเสมอมากกว่าความหนัก',
  health: 'ระยะสั้นคงที่ทุกวัน (ตามหลักการควรเป็นสามวันต่อสัปดาห์ แต่แอปยังคิดเป็นรายวันอยู่)',
  endurance: 'สลับหนักเบาไปทีละครั้งที่วิ่ง วิ่งครั้งถัดไปจะได้ระยะอีกแบบหนึ่ง',
  marathon: 'คิดจากระยะรวมเจ็ดวันล่าสุด บวกไม่เกินสิบเปอร์เซ็นต์ แล้วเฉลี่ยเป็นสี่วันซ้อมต่อสัปดาห์',
};

export const SEX_ORDER: Sex[] = ['male', 'female'];

export const SEX_LABEL: Record<Sex, string> = {
  male: 'ชาย',
  female: 'หญิง',
};

export const BMI_LABEL: Record<BmiCategory, string> = {
  underweight: 'ผอม',
  normal: 'ปกติ',
  overweight: 'น้ำหนักเกิน',
  obese1: 'อ้วนระดับ 1',
  obese2: 'อ้วนระดับ 2',
};

/**
 * ประโยคบอกว่าค่านี้แปลว่าอะไรและควรทำอะไรต่อ ไม่ใช่แค่ป้ายชื่อช่วงลอย ๆ
 *
 * เป็นคำแนะนำการวิ่งทั่วไป ไม่ใช่คำวินิจฉัยทางการแพทย์ จอที่ใช้ต้องกำกับเรื่องนี้ให้ผู้ใช้เห็นด้วย
 */
export const BMI_ADVICE: Record<BmiCategory, string> = {
  underweight: 'ควรกินให้พอกับที่ใช้ไป การวิ่งหนักเกินไปตอนน้ำหนักน้อยเสี่ยงบาดเจ็บที่กระดูก',
  normal: 'อยู่ในช่วงที่ดีแล้ว วิ่งต่อเนื่องเพื่อรักษาระดับนี้ไว้',
  overweight: 'เริ่มจากวิ่งเบา ๆ สลับเดินก่อน ให้ข้อเข่าค่อย ๆ ปรับตัวรับน้ำหนัก',
  obese1: 'เริ่มจากเดินเร็วสลับวิ่งเบา ๆ ก่อน อย่าเพิ่งเร่งระยะ ให้ข้อเข่าและข้อเท้าปรับตัวก่อน',
  obese2: 'เริ่มจากเดินเร็วก่อนวิ่ง และควรปรึกษาแพทย์ก่อนเริ่มโปรแกรมวิ่งจริงจัง',
};

/** สีของแต่ละช่วง BMI ใช้ชื่อโทเคนของธีม ไม่ใช่รหัสสีตรง ๆ ตามกฎใน constants/theme.ts */
export const BMI_COLOR_KEY: Record<BmiCategory, 'clearYellow' | 'clearGreen' | 'clearRed'> = {
  underweight: 'clearYellow',
  normal: 'clearGreen',
  overweight: 'clearYellow',
  obese1: 'clearRed',
  obese2: 'clearRed',
};
