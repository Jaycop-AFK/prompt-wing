import { describe, expect, it } from 'vitest';

import { kmMilestoneSpeech, paceDriftSpeech } from './copy';

describe('paceDriftSpeech', () => {
  it('onPace ไม่มีอะไรต้องพูด คืน null', () => {
    expect(paceDriftSpeech('onPace')).toBeNull();
  });

  it('tooFast บอกให้ช้าลง', () => {
    expect(paceDriftSpeech('tooFast')).toBe('ช้าลงหน่อย คุณวิ่งเร็วกว่า pace ที่แนะนำ');
  });

  it('tooSlow บอกให้เร่งขึ้น', () => {
    expect(paceDriftSpeech('tooSlow')).toBe('เร่งขึ้นอีกนิด คุณวิ่งช้ากว่า pace ที่แนะนำ');
  });
});

describe('kmMilestoneSpeech', () => {
  it('ปัดวินาทีเป็นจำนวนนาทีเต็มที่ใกล้ที่สุด', () => {
    expect(kmMilestoneSpeech(3, 24 * 60 + 40)).toBe('ครบ 3 กิโลเมตร ใช้เวลา 25 นาที');
  });

  it('กิโลเมตรแรกที่เวลายังไม่ถึงนาที ปัดลงเป็นศูนย์นาทีได้', () => {
    expect(kmMilestoneSpeech(1, 20)).toBe('ครบ 1 กิโลเมตร ใช้เวลา 0 นาที');
  });
});
