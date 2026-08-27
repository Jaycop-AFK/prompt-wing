import type { MuscleTarget, RampPhase } from './skeleton';

/** ป้ายภาษาไทยของแต่ละขั้นใน RAMP เรียงตามลำดับที่ควรทำ */
export const RAMP_ORDER: RampPhase[] = ['raise', 'activate', 'mobilise', 'potentiate'];

export const RAMP_LABEL: Record<RampPhase, string> = {
  raise: 'ยกอุณหภูมิ',
  activate: 'กระตุ้นกล้ามเนื้อ',
  mobilise: 'ยืดข้อต่อ',
  potentiate: 'เร่งประสาท',
};

export const RAMP_LETTER: Record<RampPhase, string> = {
  raise: 'R',
  activate: 'A',
  mobilise: 'M',
  potentiate: 'P',
};

export const MUSCLE_LABEL: Record<MuscleTarget, string> = {
  calfShin: 'น่องและหน้าแข้ง',
  thighHip: 'ต้นขาและสะโพก',
  glute: 'สะโพกและก้น',
  ankle: 'ข้อเท้า',
  core: 'แกนกลางลำตัว',
};
