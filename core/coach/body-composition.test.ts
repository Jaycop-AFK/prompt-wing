import { describe, expect, it } from 'vitest';

import { calculateNavyBodyFat } from './body-composition';

describe('calculateNavyBodyFat', () => {
  it('คำนวณผู้ชายด้วยเอว คอ และส่วนสูง', () => {
    expect(calculateNavyBodyFat({ sex: 'male', heightCm: 175, waistCm: 85, neckCm: 38, hipCm: null })).toBeCloseTo(17.01, 1);
  });

  it('คำนวณผู้หญิงโดยบังคับใช้รอบสะโพก', () => {
    expect(calculateNavyBodyFat({ sex: 'female', heightCm: 165, waistCm: 75, neckCm: 33, hipCm: 98 })).toBeCloseTo(28.73, 1);
    expect(calculateNavyBodyFat({ sex: 'female', heightCm: 165, waistCm: 75, neckCm: 33, hipCm: null })).toBeNull();
  });

  it('ไม่คำนวณเมื่อข้อมูลไม่ครบหรือเอวไม่ใหญ่กว่าคอ', () => {
    expect(calculateNavyBodyFat({ sex: null, heightCm: 175, waistCm: 85, neckCm: 38, hipCm: null })).toBeNull();
    expect(calculateNavyBodyFat({ sex: 'male', heightCm: 175, waistCm: 35, neckCm: 38, hipCm: null })).toBeNull();
  });
});
