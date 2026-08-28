import type { FormScore } from '@/core/coach';

import type { Split, TrackPoint } from './geo';

/**
 * การวิ่งหนึ่งครั้งที่บันทึกไว้แล้ว
 *
 * อยู่ใน services/ ไม่ใช่ storage/ เพราะเป็นรูปร่างของข้อมูลในโดเมน ไม่ใช่รายละเอียดของวิธีเก็บ
 * โมดูลที่คำนวณจากประวัติการวิ่ง (เช่น services/run-history.ts) จึงใช้ชนิดนี้ได้โดยไม่ต้องลาก
 * expo-sqlite ติดมาด้วย ซึ่งจะทำให้เทสต์โดยไม่มีเครื่องจริงไม่ได้
 */
export interface SessionRecord {
  id: number;
  /** เวลาที่กดจบการวิ่ง หน่วย epoch ms */
  finishedAt: number;
  distanceKm: number;
  elapsedSeconds: number;
  /** null ถ้าระยะทางเป็นศูนย์ (คำนวณ pace ไม่ได้) */
  paceSecPerKm: number | null;
  calories: number;
  formScore: FormScore;
  splits: Split[];
  route: TrackPoint[];
}

/** Session ที่ยังไม่ได้บันทึก จึงยังไม่มี id ที่ฐานข้อมูลเป็นคนกำหนดให้ */
export type NewSessionRecord = Omit<SessionRecord, 'id'>;
