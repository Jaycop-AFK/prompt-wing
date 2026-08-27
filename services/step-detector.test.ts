import { describe, expect, it } from 'vitest';

import {
  cadenceFromStepTimestamps,
  createStepDetector,
  DEFAULT_STEP_DETECTOR_OPTIONS,
  type AccelerometerSample,
} from './step-detector';

/**
 * สร้างสัญญาณ magnitude สังเคราะห์เลียนแบบการวิ่งด้วยคลื่นไซน์รอบเส้นฐาน 1g บวกสัญญาณรบกวน
 * ความถี่สูงคงที่ (ไม่ใช้ตัวสุ่ม เพื่อให้เทสต์ได้ผลเดิมทุกครั้งที่รัน)
 */
function generateRunningSignal(
  cadenceSpm: number,
  durationMs: number,
  sampleIntervalMs: number,
  amplitude = 0.6,
  noiseAmplitude = 0.03
): AccelerometerSample[] {
  const periodMs = 60000 / cadenceSpm;
  const samples: AccelerometerSample[] = [];

  for (let t = 0; t <= durationMs; t += sampleIntervalMs) {
    const wave = amplitude * Math.sin((2 * Math.PI * t) / periodMs);
    const noise = noiseAmplitude * Math.sin((2 * Math.PI * t) / 17);
    samples.push({ magnitude: 1 + wave + noise, at: t });
  }

  return samples;
}

function detectSteps(samples: AccelerometerSample[]): number[] {
  const detector = createStepDetector();
  const steps: number[] = [];
  for (const sample of samples) {
    const stepAt = detector.addSample(sample);
    if (stepAt !== null) steps.push(stepAt);
  }
  return steps;
}

describe('createStepDetector — สัญญาณนิ่ง ไม่มีการก้าว', () => {
  it('ไม่ตรวจพบก้าวเลยเมื่อเครื่องอยู่นิ่ง (magnitude คงที่ 1g)', () => {
    const flat: AccelerometerSample[] = Array.from({ length: 50 }, (_, i) => ({
      magnitude: 1,
      at: i * 200,
    }));

    expect(detectSteps(flat)).toHaveLength(0);
  });

  it('สัญญาณรบกวนเล็กน้อยรอบเส้นฐานไม่ถูกนับเป็นก้าว', () => {
    const jitter: AccelerometerSample[] = Array.from({ length: 100 }, (_, i) => ({
      magnitude: 1 + 0.05 * Math.sin((2 * Math.PI * i) / 3),
      at: i * 200,
    }));

    expect(detectSteps(jitter)).toHaveLength(0);
  });
});

describe('createStepDetector — อัตราสุ่มตัวอย่างที่แอนดรอยด์ 12 ขึ้นไปบังคับ (200ms = 5Hz)', () => {
  // Android 12 ขึ้นไปบังคับเพดานไว้ที่ 200ms เสมอไม่ว่าแอปจะขอถี่แค่ไหน (ยืนยันแล้วจากเอกสารทางการ
  // ของ Android และ expo-sensors) ความถี่ไนควิสต์ของอัตรานี้คือ 2.5Hz = 150 ก้าว/นาทีพอดี
  // เทสต์กลุ่มนี้ตั้งใจแยกสองโซนตามทฤษฎี ไม่ใช่ตั้งเกณฑ์คลาดเคลื่อนแบบเดียวกันหมด

  it('จังหวะต่ำกว่าไนควิสต์ (140 spm) กู้คืนได้แม่นยำ', () => {
    const samples = generateRunningSignal(140, 20000, 200);
    const estimated = cadenceFromStepTimestamps(detectSteps(samples));

    expect(estimated).not.toBeNull();
    expect(estimated!).toBeGreaterThan(140 * 0.9);
    expect(estimated!).toBeLessThan(140 * 1.1);
  });

  it('จังหวะเหนือไนควิสต์ (170, 190 spm) ถูกประเมินต่ำกว่าจริงอย่างมีนัยสำคัญเสมอ — บันทึกข้อจำกัดนี้ไว้เป็นเทสต์', () => {
    // นี่คือข้อจำกัดทางคณิตศาสตร์ของทฤษฎีการสุ่มตัวอย่าง (Nyquist) ไม่ใช่บั๊กที่ควรแก้ด้วยการจูน
    // เกณฑ์เพิ่ม ถ้าเทสต์นี้เริ่มพังในอนาคต (ค่าประมาณดีขึ้นจนใกล้ค่าจริง) แปลว่าอัลกอริทึมเปลี่ยนไป
    // มากพอที่ต้องทบทวนขีดจำกัดนี้ใหม่ทั้งหมด ไม่ใช่แค่แก้เทสต์ให้ผ่าน
    const estimated170 = cadenceFromStepTimestamps(detectSteps(generateRunningSignal(170, 20000, 200)));
    const estimated190 = cadenceFromStepTimestamps(detectSteps(generateRunningSignal(190, 20000, 200)));

    expect(estimated170).not.toBeNull();
    expect(estimated190).not.toBeNull();
    expect(estimated170!).toBeLessThan(170 * 0.85);
    expect(estimated190!).toBeLessThan(190 * 0.75);
  });

  it('ยังคงคืนตัวเลขที่อยู่ในช่วงที่เป็นไปได้ทางสรีรวิทยา ไม่ใช่ค่าที่ไร้ความหมาย', () => {
    for (const cadence of [140, 170, 190]) {
      const estimated = cadenceFromStepTimestamps(detectSteps(generateRunningSignal(cadence, 20000, 200)));
      expect(estimated).not.toBeNull();
      expect(estimated!).toBeGreaterThan(60);
      expect(estimated!).toBeLessThan(250);
    }
  });
});

describe('createStepDetector — อัตราสุ่มตัวอย่างสูงกว่า (33ms ตัวแทน iOS หรือแอนดรอยด์รุ่นเก่า)', () => {
  it('นับจำนวนก้าวได้แม่นยำกว่าตอนอัตราสุ่มตัวอย่างต่ำ', () => {
    const durationMs = 20000;
    const cadence = 170;
    const samples = generateRunningSignal(cadence, durationMs, 33);
    const expectedSteps = Math.floor(durationMs / (60000 / cadence));

    const steps = detectSteps(samples);

    expect(steps.length).toBeGreaterThan(expectedSteps * 0.9);
    expect(steps.length).toBeLessThan(expectedSteps * 1.1);
  });
});

describe('createStepDetector — ช่วงเวลาห้ามนับซ้ำ (refractory period)', () => {
  it('ไม่นับสองก้าวติดกันเร็วกว่า minStepIntervalMs แม้สัญญาณจะกระตุกซ้อนกัน', () => {
    const detector = createStepDetector({
      ...DEFAULT_STEP_DETECTOR_OPTIONS,
      minStepIntervalMs: 250,
    });

    const bumps = [
      { magnitude: 1, at: 0 },
      { magnitude: 1.5, at: 50 }, // ก้าวแรก
      // ต้องลดลงต่ำกว่าเส้นฐานจริง (ไม่ใช่แค่กลับมาเท่าเส้นฐาน) เพราะเกณฑ์ต่ำอยู่ใต้เส้นฐาน
      // (lowOffset ติดลบ) ตั้งแต่ปรับจูนให้กู้คืน cadence ได้แม่นยำขึ้น
      { magnitude: 0.8, at: 100 },
      { magnitude: 1.5, at: 150 }, // เร็วเกินไป ไม่ควรนับ (ห่างจากก้าวแรกแค่ 100ms)
      { magnitude: 0.8, at: 200 },
      { magnitude: 1.5, at: 400 }, // ห่างจากก้าวแรกครบ 350ms แล้ว ควรนับได้
    ];

    const detected = bumps.map((s) => detector.addSample(s)).filter((at) => at !== null);

    expect(detected).toEqual([50, 400]);
  });
});

describe('cadenceFromStepTimestamps', () => {
  it('คืน null เมื่อมีน้อยกว่าสองก้าว', () => {
    expect(cadenceFromStepTimestamps([])).toBeNull();
    expect(cadenceFromStepTimestamps([1000])).toBeNull();
  });

  it('คำนวณจากช่วงเวลาเฉลี่ยของก้าวถูกต้อง', () => {
    // ก้าวห่างกันคงที่ 300ms ต่อก้าว เท่ากับ 200 ก้าวต่อนาที
    const steps = [0, 300, 600, 900, 1200];
    expect(cadenceFromStepTimestamps(steps)).toBeCloseTo(200, 5);
  });

  it('ใช้แค่หน้าต่างท้ายอาร์เรย์ ไม่ใช่ทั้งหมด เพื่อให้ตอบสนองจังหวะปัจจุบัน', () => {
    // ช่วงแรกช้า (150 spm) ช่วงหลังเร็ว (200 spm) ผลลัพธ์ควรใกล้ 200 ไม่ใช่ค่าเฉลี่ยรวม
    const slowPart = [0, 400, 800, 1200, 1600]; // 150 spm
    const fastPart = [1900, 2200, 2500, 2800, 3100, 3400, 3700, 4000]; // 300ms ต่อก้าว = 200 spm
    const steps = [...slowPart, ...fastPart];

    const cadence = cadenceFromStepTimestamps(steps, 8);

    expect(cadence).toBeCloseTo(200, 0);
  });
});
