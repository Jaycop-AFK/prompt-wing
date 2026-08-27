import { describe, expect, it } from 'vitest';

import {
  computeSkeletonPoints,
  interpolateAngles,
  wrapUnit,
  type BoneLengths,
  type JointAngles,
  type AngleKeyframe,
} from './skeleton';

const NEUTRAL: JointAngles = {
  bob: 0,
  torsoLean: 0,
  hipNear: 0,
  hipFar: 0,
  kneeNear: 0,
  kneeFar: 0,
  footNear: 0,
  footFar: 0,
  shoulderNear: 0,
  shoulderFar: 0,
  elbowNear: 0,
  elbowFar: 0,
};

const angles = (overrides: Partial<JointAngles>): JointAngles => ({ ...NEUTRAL, ...overrides });

const BONES: BoneLengths = {
  head: 15,
  neck: 8,
  spine: 58,
  upperArm: 36,
  forearm: 32,
  thigh: 52,
  shin: 48,
  foot: 20,
};

const ORIGIN = { x: 0, y: 0 };

describe('wrapUnit', () => {
  it('ครอบค่าปกติในช่วง [0,1) ไว้เหมือนเดิม', () => {
    expect(wrapUnit(0)).toBe(0);
    expect(wrapUnit(0.5)).toBeCloseTo(0.5);
  });

  it('ครอบค่าที่เกิน 1 กลับเข้าช่วง', () => {
    expect(wrapUnit(1.25)).toBeCloseTo(0.25);
    expect(wrapUnit(2)).toBeCloseTo(0);
  });

  it('ครอบค่าติดลบกลับเข้าช่วงโดยไม่ให้ติดลบ', () => {
    expect(wrapUnit(-0.25)).toBeCloseTo(0.75);
    expect(wrapUnit(-1)).toBeCloseTo(0);
  });
});

describe('interpolateAngles', () => {
  it('คีย์เฟรมเดียวคืนมุมนั้นตลอดไม่ว่า t จะเป็นเท่าไหร่', () => {
    const keyframes: AngleKeyframe[] = [{ t: 0, angles: angles({ hipNear: 30 }) }];

    expect(interpolateAngles(keyframes, 0).hipNear).toBe(30);
    expect(interpolateAngles(keyframes, 0.7).hipNear).toBe(30);
  });

  it('ตรงจุดคีย์เฟรมพอดีให้ค่าของคีย์เฟรมนั้นเป๊ะ', () => {
    const keyframes: AngleKeyframe[] = [
      { t: 0, angles: angles({ hipNear: 0 }) },
      { t: 0.5, angles: angles({ hipNear: 40 }) },
    ];

    expect(interpolateAngles(keyframes, 0.5).hipNear).toBeCloseTo(40);
  });

  it('ค่าระหว่างสองคีย์เฟรมอยู่ระหว่างค่าทั้งสองเสมอ', () => {
    const keyframes: AngleKeyframe[] = [
      { t: 0, angles: angles({ hipNear: 0 }) },
      { t: 0.5, angles: angles({ hipNear: 40 }) },
    ];

    const mid = interpolateAngles(keyframes, 0.25).hipNear;
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(40);
  });

  it('กึ่งกลางพอดีของช่วงให้ค่ากึ่งกลางพอดีของมุม เพราะโค้งอีสซิ่งสมมาตร', () => {
    const keyframes: AngleKeyframe[] = [
      { t: 0, angles: angles({ hipNear: 0 }) },
      { t: 1, angles: angles({ hipNear: 40 }) },
    ];

    expect(interpolateAngles(keyframes, 0.5).hipNear).toBeCloseTo(20, 5);
  });

  it('ก่อนถึงคีย์เฟรมแรก ไล่ค่าข้ามรอยต่อจากคีย์เฟรมสุดท้ายมาหาคีย์เฟรมแรก', () => {
    const keyframes: AngleKeyframe[] = [
      { t: 0.2, angles: angles({ hipNear: 10 }) },
      { t: 0.8, angles: angles({ hipNear: 50 }) },
    ];

    // t=0.9 อยู่ในช่วงวน จาก 0.8 (มุม 50) ไปหา 0.2 ของรอบถัดไป (มุม 10) ความยาวช่วง 0.6
    // เดินมาแล้ว 0.1 จาก 0.6 คือยังไม่ถึงครึ่งทาง มุมจึงต้องยังใกล้ 50 มากกว่า 10
    const result = interpolateAngles(keyframes, 0.9).hipNear;
    expect(result).toBeLessThan(50);
    expect(result).toBeGreaterThan(30);
  });

  it('วนข้ามรอยต่อ 1.0 กลับ 0.0 อย่างต่อเนื่อง ไม่กระโดด', () => {
    const keyframes: AngleKeyframe[] = [
      { t: 0, angles: angles({ hipNear: -20 }) },
      { t: 0.5, angles: angles({ hipNear: 20 }) },
    ];

    const justBefore = interpolateAngles(keyframes, 0.999).hipNear;
    const justAfter = interpolateAngles(keyframes, 1.001).hipNear;

    // ทั้งสองจุดอยู่ห่างกันแค่ 0.002 ของรอบ มุมต้องต่างกันเพียงเล็กน้อยเท่านั้น
    // ถ้าโค้ดกระโดดกลับไปคีย์เฟรมแรกทันทีที่ t ครบ 1 ผลต่างจะใหญ่ผิดปกติ (เกือบ 40 องศา)
    expect(Math.abs(justAfter - justBefore)).toBeLessThan(1);
  });

  it('t ติดลบเล็กน้อยให้ผลต่อเนื่องกับ t ที่ใกล้ 1 จากฝั่งบวก', () => {
    const keyframes: AngleKeyframe[] = [
      { t: 0, angles: angles({ hipNear: -20 }) },
      { t: 0.5, angles: angles({ hipNear: 20 }) },
    ];

    const beforeWrap = interpolateAngles(keyframes, -0.001).hipNear;
    const afterWrap = interpolateAngles(keyframes, 0.999).hipNear;

    expect(beforeWrap).toBeCloseTo(afterWrap, 3);
  });

  it('รองรับคีย์เฟรมมากกว่าสองจุดโดยเลือกคู่ที่ถูกต้อง', () => {
    const keyframes: AngleKeyframe[] = [
      { t: 0, angles: angles({ hipNear: 0 }) },
      { t: 0.25, angles: angles({ hipNear: 40 }) },
      { t: 0.5, angles: angles({ hipNear: 10 }) },
      { t: 0.75, angles: angles({ hipNear: 40 }) },
    ];

    expect(interpolateAngles(keyframes, 0.25).hipNear).toBeCloseTo(40);
    expect(interpolateAngles(keyframes, 0.5).hipNear).toBeCloseTo(10);
    const betweenSecondThird = interpolateAngles(keyframes, 0.375).hipNear;
    expect(betweenSecondThird).toBeLessThan(40);
    expect(betweenSecondThird).toBeGreaterThan(10);
  });
});

describe('computeSkeletonPoints — ท่ายืนตรงเป็นเส้นฐาน', () => {
  const points = computeSkeletonPoints(NEUTRAL, BONES, 'side', 'standing', ORIGIN);

  it('ศีรษะอยู่เหนือคอ คออยู่เหนือกระดูกเชิงกราน', () => {
    expect(points.head.y).toBeLessThan(points.neck.y);
    expect(points.neck.y).toBeLessThan(points.pelvis.y);
  });

  it('ขาตรงดิ่งลง เข่าอยู่ใต้สะโพก ข้อเท้าอยู่ใต้เข่า', () => {
    expect(points.near.knee.y).toBeGreaterThan(points.near.hip.y);
    expect(points.near.ankle.y).toBeGreaterThan(points.near.knee.y);
    expect(points.far.knee.y).toBeGreaterThan(points.far.hip.y);
    expect(points.far.ankle.y).toBeGreaterThan(points.far.knee.y);
  });

  it('ข้างใกล้อยู่ทาง +x ข้างไกลอยู่ทาง -x ของกระดูกเชิงกราน', () => {
    expect(points.near.hip.x).toBeGreaterThan(points.pelvis.x);
    expect(points.far.hip.x).toBeLessThan(points.pelvis.x);
    expect(points.near.shoulder.x).toBeGreaterThan(points.pelvis.x);
    expect(points.far.shoulder.x).toBeLessThan(points.pelvis.x);
  });

  it('แขนตรงดิ่งลง ศอกอยู่ใต้ไหล่ ข้อมืออยู่ใต้ศอก', () => {
    expect(points.near.elbow.y).toBeGreaterThan(points.near.shoulder.y);
    expect(points.near.wrist.y).toBeGreaterThan(points.near.elbow.y);
  });

  it('ความยาวแต่ละท่อนตรงกับข้อมูลกระดูกที่กำหนด', () => {
    const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.hypot(a.x - b.x, a.y - b.y);

    expect(dist(points.near.hip, points.near.knee)).toBeCloseTo(BONES.thigh, 5);
    expect(dist(points.near.knee, points.near.ankle)).toBeCloseTo(BONES.shin, 5);
    expect(dist(points.near.shoulder, points.near.elbow)).toBeCloseTo(BONES.upperArm, 5);
    expect(dist(points.near.elbow, points.near.wrist)).toBeCloseTo(BONES.forearm, 5);
    expect(dist(points.pelvis, points.neck)).toBeCloseTo(BONES.spine, 5);
  });
});

describe('computeSkeletonPoints — มุมสะโพกและเข่า', () => {
  it('ต้นขายกไปด้านหน้า 90 องศาทำให้เข่าอยู่ระดับเดียวกับสะโพกและเยื้องไปทาง +x', () => {
    const points = computeSkeletonPoints(angles({ hipNear: 90 }), BONES, 'side', 'standing', ORIGIN);

    expect(points.near.knee.y).toBeCloseTo(points.near.hip.y, 5);
    expect(points.near.knee.x).toBeGreaterThan(points.near.hip.x);
  });

  it('งอเข่า 90 องศาโดยต้นขาตรงดิ่ง ทำให้หน้าแข้งพับไปด้านหลัง ไม่ใช่ด้านหน้า', () => {
    const straight = computeSkeletonPoints(angles({ hipNear: 0, kneeNear: 0 }), BONES, 'side', 'standing', ORIGIN);
    const bent = computeSkeletonPoints(angles({ hipNear: 0, kneeNear: 90 }), BONES, 'side', 'standing', ORIGIN);

    // ขาตรง ข้อเท้าอยู่ใต้เข่าพอดี (x เท่ากัน) งอเข่าแล้วข้อเท้าต้องเยื้องไปด้านหลัง (ตรงข้ามกับ +x)
    expect(straight.near.ankle.x).toBeCloseTo(straight.near.knee.x, 5);
    expect(bent.near.ankle.x).toBeLessThan(bent.near.knee.x);
    expect(bent.near.ankle.y).toBeLessThan(straight.near.ankle.y);
  });

  it('มุมศูนย์ทุกตัวทำให้ข้างใกล้กับข้างไกลสมมาตรกันรอบกระดูกเชิงกราน', () => {
    const points = computeSkeletonPoints(NEUTRAL, BONES, 'side', 'standing', ORIGIN);

    expect(points.near.ankle.x).toBeCloseTo(-points.far.ankle.x, 5);
    expect(points.near.ankle.y).toBeCloseTo(points.far.ankle.y, 5);
  });
});

describe('computeSkeletonPoints — มุมมองและท่าทาง', () => {
  it('มุมมองด้านหน้ามีระยะห่างข้างใกล้ข้างไกลมากกว่ามุมมองด้านข้าง', () => {
    const side = computeSkeletonPoints(NEUTRAL, BONES, 'side', 'standing', ORIGIN);
    const front = computeSkeletonPoints(NEUTRAL, BONES, 'front', 'standing', ORIGIN);

    const sideSpread = side.near.hip.x - side.far.hip.x;
    const frontSpread = front.near.hip.x - front.far.hip.x;

    expect(frontSpread).toBeGreaterThan(sideSpread);
  });

  it('ท่านอนหงายหมุนขาจากชี้ลงเป็นชี้ไปด้านข้างแทน', () => {
    const standing = computeSkeletonPoints(NEUTRAL, BONES, 'side', 'standing', ORIGIN);
    const supine = computeSkeletonPoints(NEUTRAL, BONES, 'side', 'supine', ORIGIN);

    // ยืน ขาชี้ลงชัดเจน (dy มาก, dx น้อย) นอนหงาย ขาต้องชี้ออกด้านข้างแทน (dx มาก, dy น้อย)
    const standingLeg = { dx: Math.abs(standing.near.ankle.x - standing.pelvis.x), dy: standing.near.ankle.y - standing.pelvis.y };
    const supineLeg = { dx: Math.abs(supine.near.ankle.x - supine.pelvis.x), dy: Math.abs(supine.near.ankle.y - supine.pelvis.y) };

    expect(standingLeg.dy).toBeGreaterThan(standingLeg.dx);
    expect(supineLeg.dx).toBeGreaterThan(supineLeg.dy);
  });

  it('bob เลื่อนทุกจุดลงพร้อมกันโดยไม่เปลี่ยนรูปร่างท่าทาง', () => {
    const base = computeSkeletonPoints(NEUTRAL, BONES, 'side', 'standing', ORIGIN);
    const bobbed = computeSkeletonPoints(angles({ bob: -10 }), BONES, 'side', 'standing', ORIGIN);

    expect(bobbed.pelvis.y).toBeCloseTo(base.pelvis.y - 10, 5);
    expect(bobbed.near.ankle.y).toBeCloseTo(base.near.ankle.y - 10, 5);
    expect(bobbed.pelvis.x).toBeCloseTo(base.pelvis.x, 5);
  });
});

describe('computeSkeletonPoints — เทียบท่าจริงจาก moves.ts', () => {
  // เทสต์กลุ่มนี้ตรวจท่าที่ต้องใช้เหตุผลเรื่องมุมซับซ้อนที่สุดในชุดข้อมูลจริง
  // เพื่อกันการแก้ moves.ts ในอนาคตแล้วได้ท่าที่ดูผิดโดยไม่มีใครรู้จนกว่าจะเห็นบนจอ

  it('ท่ายกเข่าสูง จุดสูงสุดของขาที่ยก เข่าต้องอยู่เหนือสะโพก', async () => {
    const { MOVES } = await import('./moves');
    const move = MOVES.find((m) => m.id === 'high-knee')!;
    const points = computeSkeletonPoints(
      interpolateAngles(move.keyframes, 0),
      BONES,
      move.view,
      move.orientation,
      ORIGIN
    );

    expect(points.near.knee.y).toBeLessThan(points.near.hip.y);
  });

  it('ท่าสะพานสะโพก เข่าต้องชี้ขึ้นและข้อเท้าอยู่ใกล้ระดับเดียวกับสะโพก', async () => {
    const { MOVES } = await import('./moves');
    const move = MOVES.find((m) => m.id === 'glute-bridge')!;
    const points = computeSkeletonPoints(
      interpolateAngles(move.keyframes, 0),
      BONES,
      move.view,
      move.orientation,
      ORIGIN
    );

    expect(points.near.knee.y).toBeLessThan(points.near.hip.y);
    expect(Math.abs(points.near.ankle.y - points.near.hip.y)).toBeLessThan(20);
  });

  it('ท่าลันจ์เดิน ตอนลงลึก ขาหลังต้องทอดต่ำไปด้านหลัง ไม่ใช่ยกสูงขึ้น', async () => {
    const { MOVES } = await import('./moves');
    const move = MOVES.find((m) => m.id === 'walking-lunge')!;
    const points = computeSkeletonPoints(
      interpolateAngles(move.keyframes, 0.4),
      BONES,
      move.view,
      move.orientation,
      ORIGIN
    );

    expect(points.far.ankle.x).toBeLessThan(points.far.hip.x - 20);
    expect(points.far.ankle.y).toBeGreaterThan(points.far.knee.y);
  });

  it('ทุกท่าให้ผลลัพธ์เป็นตัวเลขจริงเสมอ ไม่มี NaN หลุดออกมาไม่ว่า t ใด', async () => {
    const { MOVES } = await import('./moves');

    for (const move of MOVES) {
      for (let step = 0; step <= 10; step++) {
        const points = computeSkeletonPoints(
          interpolateAngles(move.keyframes, step / 10),
          BONES,
          move.view,
          move.orientation,
          ORIGIN
        );
        for (const p of [points.pelvis, points.neck, points.head, ...Object.values(points.near), ...Object.values(points.far)]) {
          expect(Number.isFinite(p.x)).toBe(true);
          expect(Number.isFinite(p.y)).toBe(true);
        }
      }
    }
  });
});
