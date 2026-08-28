import { describe, expect, it } from 'vitest';

import { formatCadence, formatDistance, formatDuration, formatPace } from './format';

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

describe('formatCadence', () => {
  it('ปัดเป็นจำนวนเต็มและเติมหน่วยก้าว/นาที', () => {
    expect(formatCadence(172.4)).toBe('172 ก้าว/นาที');
    expect(formatCadence(172.6)).toBe('173 ก้าว/นาที');
  });
});

describe('formatDistance', () => {
  it('จัดรูปทศนิยมสองตำแหน่งเสมอและเติมหน่วย กม.', () => {
    expect(formatDistance(5.2)).toBe('5.20 กม.');
    expect(formatDistance(0)).toBe('0.00 กม.');
  });

  it('ปัดทศนิยมตำแหน่งที่สาม ไม่ตัดทิ้งเฉย ๆ', () => {
    expect(formatDistance(5.126)).toBe('5.13 กม.');
  });
});
