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
