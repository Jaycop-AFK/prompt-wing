const THAI_MONTH_ABBR = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

/** วันที่แบบไทยสั้น ๆ เช่น "27 ก.ย. 2569" ใช้ปี พ.ศ. ตามธรรมเนียมการอ่านวันที่ของคนไทย */
export function formatEventDate(at: number): string {
  const date = new Date(at);
  const buddhistYear = date.getFullYear() + 543;
  return `${date.getDate()} ${THAI_MONTH_ABBR[date.getMonth()]} ${buddhistYear}`;
}

/**
 * ค่าสมัครเป็นบาท คั่นหลักพันด้วยจุลภาค เช่น 1,200 บาท
 *
 * คั่นหลักด้วย regex เองแทน toLocaleString เพราะการรองรับ locale ไทยของ Intl บน Hermes
 * ยังไม่แน่นอนพอที่จะเชื่อได้โดยไม่ทดสอบบนเครื่องจริง ทำเองด้วยวิธีที่ทำงานเหมือนกันทุกเอนจินแน่นอนกว่า
 */
export function formatFeeThb(feeThb: number): string {
  const withSeparators = Math.round(feeThb).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${withSeparators} บาท`;
}

/**
 * ตัวเลือก pace ที่มักวิ่งประจำ สำหรับหน้าตั้งค่าการมองเห็นในหาเพื่อนวิ่ง เป็นชิปเลือกตายตัวแทน
 * ช่องกรอกอิสระ เพราะการกรอกนาที:วินาทีเป็นทศนิยมอิสระ (เช่น "5.30") มีโอกาสตีความผิดว่าเป็น
 * 5 นาที 30 วินาที หรือ 5.30 นาที (ซึ่งคือ 5 นาที 18 วินาที) สับสนโดยไม่จำเป็น
 */
export const PACE_PRESETS_SEC_PER_KM = [270, 300, 330, 360, 390, 420, 450, 480];

export const RUN_TIME_PRESETS = [
  'เช้าตรู่ (05:00-07:00)',
  'เย็น (17:00-19:00)',
  'ค่ำ (19:00-21:00)',
  'วันหยุดสุดสัปดาห์',
];
