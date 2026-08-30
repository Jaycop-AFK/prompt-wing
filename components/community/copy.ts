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
