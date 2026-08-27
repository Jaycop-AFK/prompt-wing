import { describe, expect, it } from 'vitest';

import { formatDuration, formatPace } from './format';

describe('formatPace', () => {
  it('จัดรูปเป็นนาที:วินาที โดยเติมศูนย์หน้าวินาทีที่หลักเดียว', () => {
    expect(formatPace(450)).toBe('7:30');
    expect(formatPace(305)).toBe('5:05');
  });

  it('ปัดวินาทีเป็นจำนวนเต็ม', () => {
    expect(formatPace(450.6)).toBe('7:31');
  });
});

describe('formatDuration', () => {
  it('จัดรูปเป็น ชั่วโมง:นาที:วินาที เติมศูนย์หน้าทุกหลัก', () => {
    expect(formatDuration(750)).toBe('00:12:30');
    expect(formatDuration(5)).toBe('00:00:05');
  });

  it('ขึ้นชั่วโมงเมื่อเกินหนึ่งชั่วโมง', () => {
    expect(formatDuration(3725)).toBe('01:02:05');
  });

  it('ค่าติดลบไม่ทำให้พัง คืนศูนย์แทน', () => {
    expect(formatDuration(-5)).toBe('00:00:00');
  });
});
