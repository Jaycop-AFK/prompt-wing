import { describe, expect, it } from 'vitest';

import { BMI_BANDS, bmiCategoryOf, calculateBmi, kcalPerKm } from './bmi';

describe('calculateBmi', () => {
  it('คำนวณตามสูตรน้ำหนักหารส่วนสูงเป็นเมตรยกกำลังสอง', () => {
    // 70 กก. สูง 175 ซม. => 70 / 1.75^2 = 22.857
    expect(calculateBmi(70, 175)).toBeCloseTo(22.857, 2);
  });

  it('ข้อมูลไม่ครบคืน null ไม่ใช่เดาค่าแทน', () => {
    expect(calculateBmi(null, 175)).toBeNull();
    expect(calculateBmi(70, null)).toBeNull();
    expect(calculateBmi(null, null)).toBeNull();
  });

  it('ค่าที่เป็นไปไม่ได้คืน null ไม่ใช่ปล่อยให้หารด้วยศูนย์', () => {
    expect(calculateBmi(70, 0)).toBeNull();
    expect(calculateBmi(0, 175)).toBeNull();
    expect(calculateBmi(-5, 175)).toBeNull();
  });
});

describe('bmiCategoryOf — ใช้เกณฑ์กรมอนามัย ไม่ใช่เกณฑ์สากล', () => {
  it('แบ่งช่วงตามเกณฑ์ 18.5 / 23 / 25 / 30', () => {
    expect(bmiCategoryOf(17)).toBe('underweight');
    expect(bmiCategoryOf(18.5)).toBe('normal');
    expect(bmiCategoryOf(22.9)).toBe('normal');
    expect(bmiCategoryOf(23)).toBe('overweight');
    expect(bmiCategoryOf(24.9)).toBe('overweight');
    expect(bmiCategoryOf(25)).toBe('obese1');
    expect(bmiCategoryOf(29.9)).toBe('obese1');
    expect(bmiCategoryOf(30)).toBe('obese2');
    expect(bmiCategoryOf(45)).toBe('obese2');
  });

  it('ค่าที่เกณฑ์สากลบอกว่าปกติ แต่เกณฑ์ไทยบอกว่าน้ำหนักเกิน ต้องได้ผลแบบไทย', () => {
    // 24 อยู่ใต้ 25 ของเกณฑ์สากล ถ้าใช้เกณฑ์ผิดจะได้ normal ซึ่งเป็นการบอกผู้ใช้ผิด
    expect(bmiCategoryOf(24)).toBe('overweight');
  });

  it('BMI 26 ต้องเป็นอ้วนระดับ 1 ไม่ใช่แค่น้ำหนักเกิน', () => {
    // ถ้าเผลอไปใช้ action points 23/27.5 ขององค์การอนามัยโลกปี 2004 ค่านี้จะได้ overweight
    // ซึ่งเตือนผู้ใช้น้อยกว่าที่เกณฑ์ไทยกำหนด เทสต์นี้มีไว้กันไม่ให้ย้อนกลับไปใช้เกณฑ์ชุดนั้น
    expect(bmiCategoryOf(26)).toBe('obese1');
  });
});

describe('BMI_BANDS', () => {
  it('ช่วงต่อกันสนิทไม่มีรูโหว่และไม่ทับกัน', () => {
    for (let i = 1; i < BMI_BANDS.length; i++) {
      expect(BMI_BANDS[i].min).toBe(BMI_BANDS[i - 1].max);
    }
  });

  it('ทุกช่วงตรงกับผลของ bmiCategoryOf ที่จุดเริ่มของช่วง', () => {
    for (const band of BMI_BANDS) {
      // จุดเริ่มของช่วงแรกคือ 0 ซึ่งเป็นค่าที่เป็นไปไม่ได้จริง ข้ามไป
      if (band.min === 0) continue;
      expect(bmiCategoryOf(band.min)).toBe(band.category);
    }
  });

  it('ช่วงสุดท้ายไม่มีขอบบน ตารางจึงบรรยาย bmiCategoryOf ได้ครบทุกค่า', () => {
    expect(BMI_BANDS[BMI_BANDS.length - 1].max).toBe(Infinity);
  });
});

describe('kcalPerKm', () => {
  it('ยังไม่กรอกน้ำหนัก ใช้ค่าเดิมก่อนมีโปรไฟล์คือ 60 แคลอรีต่อกิโลเมตร', () => {
    expect(kcalPerKm(null)).toBe(60);
  });

  it('น้ำหนักที่เป็นไปไม่ได้ตกไปใช้ค่าเริ่มต้น ไม่คืนศูนย์ให้ผู้เรียกเอาไปหารจนได้ Infinity', () => {
    expect(kcalPerKm(0)).toBe(60);
    expect(kcalPerKm(-10)).toBe(60);
  });

  it('คนหนักกว่าเผาผลาญต่อกิโลเมตรมากกว่า', () => {
    expect(kcalPerKm(80)).toBeGreaterThan(kcalPerKm(50));
  });
});
