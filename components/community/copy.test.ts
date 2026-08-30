import { describe, expect, it } from 'vitest';

import { formatEventDate, formatFeeThb } from './copy';

describe('formatEventDate', () => {
  it('แสดงวันที่แบบไทยสั้น ๆ ด้วยปี พ.ศ.', () => {
    expect(formatEventDate(new Date(2026, 8, 27).getTime())).toBe('27 ก.ย. 2569');
  });

  it('เดือนมกราคมใช้ตัวย่อ ม.ค. ไม่ใช่ดัชนีเดือนดิบ', () => {
    expect(formatEventDate(new Date(2027, 0, 5).getTime())).toBe('5 ม.ค. 2570');
  });
});

describe('formatFeeThb', () => {
  it('ค่าน้อยกว่าพันไม่มีจุลภาค', () => {
    expect(formatFeeThb(350)).toBe('350 บาท');
  });

  it('ค่าตั้งแต่พันขึ้นไปคั่นหลักพันด้วยจุลภาค', () => {
    expect(formatFeeThb(1200)).toBe('1,200 บาท');
  });

  it('ปัดเศษทศนิยมก่อนแสดงผลเสมอ', () => {
    expect(formatFeeThb(999.6)).toBe('1,000 บาท');
  });
});
