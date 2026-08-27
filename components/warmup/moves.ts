import type { AngleKeyframe, JointAngles, WarmUpMoveDef } from './skeleton';

/**
 * แปดท่าวอร์มอัพมาตรฐาน ครบทั้งสี่ขั้นของ RAMP ตาม ADR 0004
 *
 * แต่ละท่าคือชุด keyframe ของมุมข้อต่อ ไม่ใช่ไฟล์แอนิเมชันสำเร็จรูป ตาม ADR 0001
 * เพิ่มท่าใหม่ทำได้ด้วยการเพิ่มอ็อบเจกต์ WarmUpMoveDef ใหม่ในอาร์เรย์ MOVES ด้านล่าง
 * โดยไม่ต้องแก้ตัววาดใน warmup-character.tsx เลย
 */

const NEUTRAL: JointAngles = {
  bob: 0,
  torsoLean: 0,
  hipNear: 0,
  hipFar: 0,
  kneeNear: 3,
  kneeFar: 3,
  footNear: 0,
  footFar: 0,
  shoulderNear: 8,
  shoulderFar: 8,
  elbowNear: 12,
  elbowFar: 12,
};

const pose = (overrides: Partial<JointAngles>): JointAngles => ({ ...NEUTRAL, ...overrides });
const at = (t: number, overrides: Partial<JointAngles>): AngleKeyframe => ({ t, angles: pose(overrides) });

export const MOVES: WarmUpMoveDef[] = [
  {
    id: 'jog-in-place',
    nameTH: 'วิ่งเหยาะอยู่กับที่',
    ramp: 'raise',
    view: 'side',
    orientation: 'standing',
    targetMuscles: ['core'],
    cycleDurationMs: 900,
    keyframes: [
      at(0, {
        hipNear: 42, kneeNear: 65, footNear: 8,
        hipFar: -12, kneeFar: 6, footFar: -6,
        shoulderNear: -30, elbowNear: 35,
        shoulderFar: 32, elbowFar: 38,
        bob: -5,
      }),
      at(0.25, {
        hipNear: 8, kneeNear: 20, hipFar: 8, kneeFar: 20,
        shoulderNear: 2, elbowNear: 16, shoulderFar: 2, elbowFar: 16,
      }),
      at(0.5, {
        hipFar: 42, kneeFar: 65, footFar: 8,
        hipNear: -12, kneeNear: 6, footNear: -6,
        shoulderFar: -30, elbowFar: 35,
        shoulderNear: 32, elbowNear: 38,
        bob: -5,
      }),
      at(0.75, {
        hipNear: 8, kneeNear: 20, hipFar: 8, kneeFar: 20,
        shoulderNear: 2, elbowNear: 16, shoulderFar: 2, elbowFar: 16,
      }),
    ],
  },
  {
    id: 'glute-bridge',
    nameTH: 'สะพานสะโพก',
    ramp: 'activate',
    view: 'side',
    orientation: 'supine',
    targetMuscles: ['glute'],
    cycleDurationMs: 1600,
    keyframes: [
      at(0, {
        hipNear: 72, hipFar: 72, kneeNear: 144, kneeFar: 144,
        shoulderNear: 10, shoulderFar: 10, elbowNear: 15, elbowFar: 15, bob: 0,
      }),
      at(0.5, {
        hipNear: 72, hipFar: 72, kneeNear: 128, kneeFar: 128,
        shoulderNear: 10, shoulderFar: 10, elbowNear: 15, elbowFar: 15, bob: -16,
      }),
    ],
  },
  {
    id: 'calf-raise',
    nameTH: 'เขย่งปลายเท้า',
    ramp: 'activate',
    view: 'side',
    orientation: 'standing',
    targetMuscles: ['calfShin'],
    cycleDurationMs: 1400,
    keyframes: [
      at(0, {}),
      at(0.5, { footNear: 38, footFar: 38, bob: -6 }),
    ],
  },
  {
    id: 'toe-raise',
    nameTH: 'กระดกปลายเท้า',
    ramp: 'activate',
    view: 'side',
    orientation: 'standing',
    targetMuscles: ['calfShin'],
    cycleDurationMs: 1400,
    keyframes: [
      at(0, {}),
      at(0.5, { footNear: -32, footFar: -32 }),
    ],
  },
  {
    id: 'leg-swing',
    nameTH: 'แกว่งขา',
    ramp: 'mobilise',
    view: 'side',
    orientation: 'standing',
    targetMuscles: ['thighHip'],
    cycleDurationMs: 1100,
    keyframes: [
      at(0, { hipNear: -32, kneeNear: 8, footNear: -4, shoulderNear: 20, shoulderFar: -10 }),
      at(0.5, { hipNear: 34, kneeNear: 14, footNear: 6, shoulderNear: -16, shoulderFar: 14 }),
    ],
  },
  {
    id: 'walking-lunge',
    nameTH: 'ลันจ์เดิน',
    ramp: 'mobilise',
    view: 'side',
    orientation: 'standing',
    targetMuscles: ['thighHip', 'glute'],
    cycleDurationMs: 1800,
    keyframes: [
      at(0, { hipNear: 6, kneeNear: 8, hipFar: -4, kneeFar: 5 }),
      at(0.4, {
        hipNear: 38, kneeNear: 88, footNear: 4,
        hipFar: -18, kneeFar: 45, footFar: -6,
        torsoLean: 4, bob: 10,
        shoulderNear: -8, elbowNear: 18, shoulderFar: 10, elbowFar: 18,
      }),
      at(0.7, {
        hipNear: 16, kneeNear: 30, footNear: 2,
        hipFar: -8, kneeFar: 15, footFar: -2,
        torsoLean: 1, bob: 4,
      }),
    ],
  },
  {
    id: 'ankle-roll',
    nameTH: 'หมุนข้อเท้า',
    ramp: 'mobilise',
    view: 'side',
    orientation: 'standing',
    targetMuscles: ['ankle'],
    cycleDurationMs: 1500,
    keyframes: [
      at(0, { hipNear: 14, kneeNear: 26, footNear: -28 }),
      at(0.33, { hipNear: 14, kneeNear: 26, footNear: 24 }),
      at(0.66, { hipNear: 14, kneeNear: 26, footNear: -10 }),
    ],
  },
  {
    id: 'high-knee',
    nameTH: 'ยกเข่าสูง',
    ramp: 'potentiate',
    view: 'side',
    orientation: 'standing',
    targetMuscles: ['thighHip'],
    cycleDurationMs: 550,
    keyframes: [
      at(0, {
        hipNear: 108, kneeNear: 105, footNear: 14,
        hipFar: -18, kneeFar: 8, footFar: -8,
        shoulderNear: -40, elbowNear: 55,
        shoulderFar: 42, elbowFar: 58,
        bob: -7,
      }),
      at(0.25, {
        hipNear: 10, kneeNear: 20, hipFar: 10, kneeFar: 20,
        shoulderNear: 0, elbowNear: 20, shoulderFar: 0, elbowFar: 20,
      }),
      at(0.5, {
        hipFar: 108, kneeFar: 105, footFar: 14,
        hipNear: -18, kneeNear: 8, footNear: -8,
        shoulderFar: -40, elbowFar: 55,
        shoulderNear: 42, elbowNear: 58,
        bob: -7,
      }),
      at(0.75, {
        hipNear: 10, kneeNear: 20, hipFar: 10, kneeFar: 20,
        shoulderNear: 0, elbowNear: 20, shoulderFar: 0, elbowFar: 20,
      }),
    ],
  },
];

export function moveById(id: string): WarmUpMoveDef {
  const move = MOVES.find((m) => m.id === id);
  if (!move) throw new Error(`ไม่พบท่าวอร์มอัพ id: ${id}`);
  return move;
}
