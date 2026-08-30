/** งานวิ่งหนึ่งงานในปฏิทิน อ่านได้จาก Supabase เท่านั้น แก้ไขผ่าน Table Editor ของ Supabase */
export interface RaceEvent {
  id: number;
  name: string;
  /** วันที่จัดงาน หน่วย epoch ms */
  dateAt: number;
  distanceKm: number;
  province: string;
  feeThb: number;
}

/** คนที่จับคู่ได้ในหน้าหาเพื่อนวิ่ง มาจากโปรไฟล์ผู้ใช้จริงที่เปิด visible_to_others ไว้เท่านั้น */
export interface RunBuddy {
  id: string;
  displayName: string;
  paceSecPerKm: number;
  runTime: string;
  /** อีเมลยืนยันแล้วจริงหรือยัง (ผ่าน Supabase Auth) การยืนยันตัวตนแบบอื่นอยู่นอกขอบเขต */
  emailConfirmed: boolean;
}

/** การตั้งค่าที่ผู้ใช้ตัวเองควบคุมว่าจะให้คนอื่นเห็นอะไรบ้างในหน้าหาเพื่อนวิ่ง */
export interface MyRunVisibility {
  displayName: string | null;
  typicalPaceSecPerKm: number | null;
  typicalRunTime: string | null;
  visibleToOthers: boolean;
}
