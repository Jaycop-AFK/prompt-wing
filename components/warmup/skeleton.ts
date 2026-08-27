/**
 * คณิตศาสตร์ล้วนของโครงกระดูกตัวละครวอร์มอัพ
 *
 * ไม่มี import จาก react-native, expo หรือ skia เลยแม้แต่ตัวเดียว จึงเทสต์ด้วย vitest ได้ตรง ๆ
 * เลเยอร์ Skia/Reanimated ที่วาดจริงต้องรันบนเครื่องและตรวจด้วยตา ซึ่งทำในสภาพแวดล้อมนี้ไม่ได้
 * ความถูกต้องของสูตรทั้งหมดจึงต้องพิสูจน์ผ่านเทสต์ในไฟล์นี้แทนการดูภาพ
 *
 * ฟังก์ชันที่ถูกเรียกจาก useDerivedValue ของ Reanimated ต้องมี 'worklet' เป็นบรรทัดแรก
 * เพื่อให้ Babel แปลงให้รันบน UI thread ได้ ในสภาพแวดล้อมเทสต์ (Node ธรรมดา ไม่มี Babel
 * ปลั๊กอินของ Reanimated) บรรทัดนี้เป็นแค่ string literal เฉย ๆ ไม่มีผลต่อการทำงาน
 */

export interface Point {
  x: number;
  y: number;
}

/** มุมของทุกข้อต่อ หน่วยองศา เว้น bob ที่เป็นพิกเซล */
export interface JointAngles {
  /** พิกเซลที่เลื่อนกระดูกเชิงกรานขึ้นลงจากตำแหน่งฐาน บวก = เลื่อนลง ใช้ทำจังหวะเด้งหรือยกสะโพก */
  bob: number;
  /** มุมเอนของลำตัวจากแนวดิ่ง บวกหมุนไปทางเดียวกับขาที่ยกไปข้างหน้า */
  torsoLean: number;
  /** มุมต้นขาจากแนวดิ่งที่สะโพก บวก = ยกไปทางด้านหน้า */
  hipNear: number;
  hipFar: number;
  /** มุมงอเข่า สัมพัทธ์กับทิศทางต้นขา ยิ่งมากยิ่งงอ ศูนย์คือขาตรง */
  kneeNear: number;
  kneeFar: number;
  /** มุมของเท้าที่ข้อเท้า บวก = ปลายเท้าลง (เขย่งส้น) ลบ = ปลายเท้ากระดกขึ้น */
  footNear: number;
  footFar: number;
  /** มุมต้นแขนจากแนวดิ่งที่ไหล่ */
  shoulderNear: number;
  shoulderFar: number;
  /** มุมงอศอก สัมพัทธ์กับทิศทางต้นแขน */
  elbowNear: number;
  elbowFar: number;
}

export interface AngleKeyframe {
  /** ตำแหน่งในหนึ่งรอบ ตั้งแต่ 0 ถึงน้อยกว่า 1 ต้องเรียงจากน้อยไปมาก */
  t: number;
  angles: JointAngles;
}

export type MuscleTarget = 'calfShin' | 'thighHip' | 'glute' | 'ankle' | 'core';

/**
 * ท่าที่เคลื่อนไปหน้าหลังใช้มุมมองด้านข้าง ท่าที่กางออกข้างใช้มุมมองด้านหน้า
 *
 * ท่าทั้งแปดของตั๋ว 07 ใช้ side ทั้งหมด front ยังไม่มีท่าไหนใช้จริง เตรียมไว้สำหรับ
 * วงแขนซึ่งเป็นท่าสำรองตาม ADR 0004 ที่ยังไม่ถูกสร้าง มีเทสต์ยืนยัน STANCE_BY_VIEW.front
 * ตรง ๆ ใน skeleton.test.ts แต่ยังไม่ผ่านการเรียกจาก WarmUpMoveDef จริงสักท่าเดียว
 */
export type SkeletonView = 'side' | 'front';
export type SkeletonOrientation = 'standing' | 'supine';
export type RampPhase = 'raise' | 'activate' | 'mobilise' | 'potentiate';

export interface WarmUpMoveDef {
  id: string;
  nameTH: string;
  ramp: RampPhase;
  view: SkeletonView;
  orientation: SkeletonOrientation;
  targetMuscles: MuscleTarget[];
  /** ระยะเวลาของหนึ่งรอบการเคลื่อนไหว หน่วยมิลลิวินาที */
  cycleDurationMs: number;
  /** อย่างน้อยหนึ่งจุด เรียงจาก t น้อยไปมาก ไม่ต้องซ้ำจุดแรกที่ท้ายรอบ */
  keyframes: AngleKeyframe[];
}

const DEG_TO_RAD = Math.PI / 180;

function clamp01(value: number): number {
  'worklet';
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/** ครอบเวลาให้อยู่ในช่วง [0,1) เสมอ รองรับค่าติดลบและค่าที่เกิน 1 */
export function wrapUnit(t: number): number {
  'worklet';
  const wrapped = t % 1;
  return wrapped < 0 ? wrapped + 1 : wrapped;
}

/**
 * โค้งเร่งเข้าชะลอออก
 *
 * ทำให้จังหวะที่ผ่านแต่ละคีย์เฟรมดูนุ่มนวลกว่าการไล่ค่าเชิงเส้นตรง ๆ
 * ซึ่งจะดูเหมือนหยุดกระตุกทุกครั้งที่ถึงคีย์เฟรม
 */
function easeInOutSine(t: number): number {
  'worklet';
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

function lerp(a: number, b: number, t: number): number {
  'worklet';
  return a + (b - a) * t;
}

function lerpAngles(a: JointAngles, b: JointAngles, t: number): JointAngles {
  'worklet';
  return {
    bob: lerp(a.bob, b.bob, t),
    torsoLean: lerp(a.torsoLean, b.torsoLean, t),
    hipNear: lerp(a.hipNear, b.hipNear, t),
    hipFar: lerp(a.hipFar, b.hipFar, t),
    kneeNear: lerp(a.kneeNear, b.kneeNear, t),
    kneeFar: lerp(a.kneeFar, b.kneeFar, t),
    footNear: lerp(a.footNear, b.footNear, t),
    footFar: lerp(a.footFar, b.footFar, t),
    shoulderNear: lerp(a.shoulderNear, b.shoulderNear, t),
    shoulderFar: lerp(a.shoulderFar, b.shoulderFar, t),
    elbowNear: lerp(a.elbowNear, b.elbowNear, t),
    elbowFar: lerp(a.elbowFar, b.elbowFar, t),
  };
}

/**
 * มุมของทุกข้อต่อ ณ ตำแหน่ง t ของรอบ ไล่ค่าต่อเนื่องกันเป็นวงปิด
 *
 * คีย์เฟรมสุดท้ายไม่ต้องมีค่าเหมือนคีย์เฟรมแรก ฟังก์ชันนี้ไล่ค่าข้ามรอยต่อ 1.0 กลับไป 0.0
 * ให้เองเสมอ นี่คือกลไกที่ทำให้ตัวละครวนลูปเนียนโดยไม่ต้องก็อปจุดแรกไปวางซ้ำที่ท้ายข้อมูล
 */
export function interpolateAngles(keyframes: readonly AngleKeyframe[], t: number): JointAngles {
  'worklet';
  if (keyframes.length === 1) return keyframes[0].angles;

  const wrapped = wrapUnit(t);

  let prevIndex = keyframes.length - 1;
  for (let i = 0; i < keyframes.length; i++) {
    if (keyframes[i].t <= wrapped) prevIndex = i;
  }
  const nextIndex = (prevIndex + 1) % keyframes.length;
  const wrapsAround = prevIndex === keyframes.length - 1;

  const prev = keyframes[prevIndex];
  const next = keyframes[nextIndex];

  const span = wrapsAround ? 1 - prev.t + next.t : next.t - prev.t;
  const elapsed = wrapped >= prev.t ? wrapped - prev.t : wrapped + 1 - prev.t;
  const ratio = span <= 0 ? 0 : clamp01(elapsed / span);

  return lerpAngles(prev.angles, next.angles, easeInOutSine(ratio));
}

// ===== โครงกระดูกและการคำนวณตำแหน่งจุดต่อ (forward kinematics) =====

export interface BoneLengths {
  head: number;
  neck: number;
  spine: number;
  upperArm: number;
  forearm: number;
  thigh: number;
  shin: number;
  foot: number;
}

interface StanceConfig {
  /** ระยะห่างแนวราบระหว่างสะโพกข้างใกล้กับข้างไกล */
  hipSpread: number;
  /** ระยะห่างแนวราบระหว่างไหล่ข้างใกล้กับข้างไกล */
  shoulderSpread: number;
}

/**
 * ระยะห่างระหว่างข้างใกล้กับข้างไกลตามมุมมอง
 *
 * มุมมองด้านข้างให้ระยะห่างน้อย ขาซ้ายขวาเกือบซ้อนกันแต่แยกสีให้ดูออก
 * มุมมองด้านหน้าให้ระยะห่างมาก สมจริงกับท่าที่กางแขนขาออกด้านข้าง
 */
const STANCE_BY_VIEW: Record<SkeletonView, StanceConfig> = {
  side: { hipSpread: 6, shoulderSpread: 7 },
  front: { hipSpread: 17, shoulderSpread: 24 },
};

/**
 * มุมหมุนทั้งตัวตามท่าทาง
 *
 * ท่ายืนใช้ 0 องศาตามปกติ ท่านอนหงายหมุน -90 องศา ทำให้ทิศ "ลง" ของขาที่เคยชี้ลง
 * กลายเป็นชี้ไปทางขวาแทน และทิศ "ขึ้น" ของกระดูกสันหลังกลายเป็นชี้ไปทางซ้าย
 * ผลคือตัวละครนอนหงายโดยหันศีรษะไปทางซ้าย ขาทั้งสองงออยู่ทางขวา ซึ่งตรงกับท่าสะพานสะโพก
 */
const ORIENTATION_ROTATION_DEG: Record<SkeletonOrientation, number> = {
  standing: 0,
  supine: -90,
};

function add(a: Point, b: Point): Point {
  'worklet';
  return { x: a.x + b.x, y: a.y + b.y };
}

/** เวกเตอร์ชี้ลงจากแนวดิ่ง หมุนไปทาง +x เมื่อมุมเป็นบวก ใช้กับแขนและขา */
function downVec(length: number, angleDeg: number): Point {
  'worklet';
  const rad = angleDeg * DEG_TO_RAD;
  return { x: length * Math.sin(rad), y: length * Math.cos(rad) };
}

/** เวกเตอร์ชี้ขึ้นจากแนวดิ่ง หมุนไปทาง +x เมื่อมุมเป็นบวก ใช้กับกระดูกสันหลัง */
function upVec(length: number, angleDeg: number): Point {
  'worklet';
  const down = downVec(length, angleDeg);
  return { x: down.x, y: -down.y };
}

function rotateAroundOrigin(p: Point, angleDeg: number): Point {
  'worklet';
  if (angleDeg === 0) return p;
  const rad = angleDeg * DEG_TO_RAD;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos };
}

/** จุดทั้งหมดของแขนขาข้างหนึ่ง ทั้งขาและแขนรวมกัน เพราะผู้เรียกต้องใช้ทั้งคู่พร้อมกันเสมอ */
export interface SidePoints {
  hip: Point;
  knee: Point;
  ankle: Point;
  toe: Point;
  heel: Point;
  shoulder: Point;
  elbow: Point;
  wrist: Point;
}

export interface SkeletonPoints {
  pelvis: Point;
  neck: Point;
  head: Point;
  near: SidePoints;
  far: SidePoints;
}

function buildLeg(
  hipLocal: Point,
  bones: BoneLengths,
  hipAngle: number,
  kneeBend: number,
  footAngle: number
) {
  'worklet';
  const knee = add(hipLocal, downVec(bones.thigh, hipAngle));
  // งอเข่าพับไปทางตรงข้ามกับที่ต้นขายก ไม่ใช่ทางเดียวกัน ขาตรงจึงเกิดเมื่อ kneeBend เป็นศูนย์
  const ankle = add(knee, downVec(bones.shin, hipAngle - kneeBend));

  const footRest: Point = { x: bones.foot * 0.92, y: bones.foot * 0.3 };
  const heelRest: Point = { x: -bones.foot * 0.32, y: bones.foot * 0.22 };
  const toe = add(ankle, rotateAroundOrigin(footRest, footAngle));
  const heel = add(ankle, rotateAroundOrigin(heelRest, footAngle));

  return { hip: hipLocal, knee, ankle, toe, heel };
}

function buildArm(shoulderLocal: Point, bones: BoneLengths, shoulderAngle: number, elbowBend: number) {
  'worklet';
  const elbow = add(shoulderLocal, downVec(bones.upperArm, shoulderAngle));
  const wrist = add(elbow, downVec(bones.forearm, shoulderAngle - elbowBend));
  return { shoulder: shoulderLocal, elbow, wrist };
}

function toScreen(p: Point, rotationDeg: number, anchor: Point, bob: number): Point {
  'worklet';
  const rotated = rotateAroundOrigin(p, rotationDeg);
  return { x: rotated.x + anchor.x, y: rotated.y + anchor.y + bob };
}

/**
 * ตำแหน่งจุดต่อทุกจุดบนหน้าจอ จากมุมข้อต่อและโครงกระดูกที่กำหนด
 *
 * คำนวณในระบบพิกัดท้องถิ่นก่อน โดยกระดูกเชิงกรานอยู่ที่จุดกำเนิด แล้วจึงหมุนทั้งชุดตาม
 * มุมมองที่ต้องการ (ยืนหรือนอนหงาย) และเลื่อนไปยังตำแหน่งบนจอในขั้นตอนสุดท้ายทีเดียว
 */
export function computeSkeletonPoints(
  angles: JointAngles,
  bones: BoneLengths,
  view: SkeletonView,
  orientation: SkeletonOrientation,
  anchor: Point
): SkeletonPoints {
  'worklet';
  const stance = STANCE_BY_VIEW[view];
  const rotationDeg = ORIENTATION_ROTATION_DEG[orientation];

  const pelvisLocal: Point = { x: 0, y: 0 };
  const hipNearLocal: Point = { x: stance.hipSpread / 2, y: 0 };
  const hipFarLocal: Point = { x: -stance.hipSpread / 2, y: 0 };

  const neckLocal = add(pelvisLocal, upVec(bones.spine, angles.torsoLean));
  const headLocal = add(neckLocal, upVec(bones.neck + bones.head, angles.torsoLean));
  const shoulderNearLocal = add(neckLocal, { x: stance.shoulderSpread / 2, y: 0 });
  const shoulderFarLocal = add(neckLocal, { x: -stance.shoulderSpread / 2, y: 0 });

  const legNear = buildLeg(hipNearLocal, bones, angles.hipNear, angles.kneeNear, angles.footNear);
  const legFar = buildLeg(hipFarLocal, bones, angles.hipFar, angles.kneeFar, angles.footFar);
  const armNear = buildArm(shoulderNearLocal, bones, angles.shoulderNear, angles.elbowNear);
  const armFar = buildArm(shoulderFarLocal, bones, angles.shoulderFar, angles.elbowFar);

  const project = (p: Point) => toScreen(p, rotationDeg, anchor, angles.bob);

  const projectSide = (leg: ReturnType<typeof buildLeg>, arm: ReturnType<typeof buildArm>): SidePoints => ({
    hip: project(leg.hip),
    knee: project(leg.knee),
    ankle: project(leg.ankle),
    toe: project(leg.toe),
    heel: project(leg.heel),
    shoulder: project(arm.shoulder),
    elbow: project(arm.elbow),
    wrist: project(arm.wrist),
  });

  return {
    pelvis: project(pelvisLocal),
    neck: project(neckLocal),
    head: project(headLocal),
    near: projectSide(legNear, armNear),
    far: projectSide(legFar, armFar),
  };
}
