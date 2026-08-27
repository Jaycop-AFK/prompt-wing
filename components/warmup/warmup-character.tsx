import { BlurMask, Canvas, Circle, Path, Rect, Skia, type SkPath } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Easing, useDerivedValue, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import {
  computeSkeletonPoints,
  interpolateAngles,
  type BoneLengths,
  type MuscleTarget,
  type Point,
  type SidePoints,
  type SkeletonPoints,
  type WarmUpMoveDef,
} from '@/components/warmup/skeleton';
import type { ThemeColors } from '@/constants/theme';

/**
 * ตัวละครวอร์มอัพวาดด้วย Skia
 *
 * เลเยอร์นี้ตั้งใจให้บางที่สุดเท่าที่ทำได้ แค่อ่านจุดที่คำนวณไว้แล้วจาก skeleton.ts
 * แล้วประกอบเป็นเส้นวาด คณิตศาสตร์ทั้งหมดถูกเทสต์แยกไว้ต่างหากแล้วใน skeleton.test.ts
 * เพราะเลเยอร์นี้ต้องรันบนเครื่องจริงถึงจะตรวจสอบได้ ไม่มีเทสต์อัตโนมัติสำหรับส่วนนี้
 *
 * การเคลื่อนไหวขับเคลื่อนด้วย Reanimated shared value ที่ Skia อ่านค่าตรง ๆ บน UI thread
 * ไม่ผ่านการ re-render ของ React ต่อเฟรม จึงลื่นแม้บนเครื่องระดับล่าง
 */

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

export const CHARACTER_WIDTH = 280;
export const CHARACTER_HEIGHT = 300;
const ANCHOR: Point = { x: CHARACTER_WIDTH / 2, y: 176 };
const GROUND_Y = 284;
const GROUND_RADIUS = CHARACTER_WIDTH * 0.22;

export interface CharacterColors {
  stage: string;
  near: string;
  far: string;
  glow: string;
  ground: string;
}

/**
 * ดึงสีตัวละครจากธีมปัจจุบัน
 *
 * ทุกจอที่วาด WarmupCharacter ต้องแปลง ThemeColors เป็น CharacterColors แบบเดียวกันเสมอ
 * ก่อนหน้านี้แต่ละจอเขียนแมปสีชุดนี้ซ้ำเอง จนหน้าวอร์มอัพจริง (ตั๋ว 08) ก็อปมาจากหน้าตัวอย่าง
 * ของตั๋ว 07 ที่ถูกลบไปแล้ว รวมไว้ที่เดียวกันเลยเพื่อไม่ให้เกิดสำเนาที่สามในอนาคต
 */
export function characterColorsFrom(colors: ThemeColors): CharacterColors {
  return {
    stage: colors.characterStage,
    near: colors.characterNear,
    far: colors.characterFar,
    glow: colors.characterGlow,
    ground: colors.characterGround,
  };
}

interface Props {
  move: WarmUpMoveDef;
  colors: CharacterColors;
}

function multiSegmentPath(segments: Point[][]): SkPath {
  'worklet';
  const path = Skia.Path.Make();
  for (const segment of segments) {
    if (segment.length < 2) continue;
    path.moveTo(segment[0].x, segment[0].y);
    for (let i = 1; i < segment.length; i++) path.lineTo(segment[i].x, segment[i].y);
  }
  return path;
}

/** เส้นของแขนขาข้างหนึ่ง รวมขาและแขนไว้ในเส้นเดียวเพื่อวาดด้วย paint ก้อนเดียว */
function sidePath(side: SidePoints): SkPath {
  'worklet';
  return multiSegmentPath([
    [side.hip, side.knee, side.ankle],
    [side.ankle, side.toe],
    [side.ankle, side.heel],
    [side.shoulder, side.elbow, side.wrist],
  ]);
}

function torsoPath(points: SkeletonPoints): SkPath {
  'worklet';
  return multiSegmentPath([
    [points.far.hip, points.near.hip],
    [points.pelvis, points.neck],
    [points.far.shoulder, points.near.shoulder],
  ]);
}

/**
 * ส่วนของโครงกระดูกที่ตรงกับกล้ามเนื้อเป้าหมายของท่านี้ ใช้วาดเรืองแสงทับ
 *
 * แมปเป็น Record ที่ TypeScript บังคับให้ครบทุกคีย์ของ MuscleTarget แทนที่จะเป็นลำดับ if
 * เพราะถ้าเพิ่มกล้ามเนื้อเป้าหมายใหม่ในอนาคตแล้วลืมเพิ่มที่นี่ ของเดิมจะคอมไพล์ผ่านเงียบ ๆ
 * โดยกล้ามเนื้อตัวใหม่ไม่เรืองแสงเลย ซึ่งเป็นบั๊กที่มองไม่ออกจนกว่าจะเห็นบนจอ
 */
function glowPath(points: SkeletonPoints, targets: readonly MuscleTarget[]): SkPath {
  'worklet';
  const segmentsByTarget: Record<MuscleTarget, Point[][]> = {
    calfShin: [
      [points.near.knee, points.near.ankle],
      [points.far.knee, points.far.ankle],
    ],
    thighHip: [
      [points.near.hip, points.near.knee],
      [points.far.hip, points.far.knee],
    ],
    ankle: [
      [points.near.ankle, points.near.toe],
      [points.near.ankle, points.near.heel],
      [points.far.ankle, points.far.toe],
      [points.far.ankle, points.far.heel],
    ],
    core: [[points.pelvis, points.neck]],
    glute: [[points.far.hip, points.near.hip]],
  };

  const segments: Point[][] = [];
  for (const target of targets) segments.push(...segmentsByTarget[target]);

  return multiSegmentPath(segments);
}

export function WarmupCharacter({ move, colors }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration: move.cycleDurationMs, easing: Easing.linear }),
      -1,
      false
    );
    // ตั้งใจไม่ใส่ move.keyframes เป็น dependency เพราะ id เพียงพอที่จะบอกว่าท่าเปลี่ยนแล้ว
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [move.id, move.cycleDurationMs]);

  const points = useDerivedValue<SkeletonPoints>(() => {
    const angles = interpolateAngles(move.keyframes, progress.value);
    return computeSkeletonPoints(angles, BONES, move.view, move.orientation, ANCHOR);
  });

  const farLimbsPath = useDerivedValue(() => sidePath(points.value.far));
  const nearLimbsPath = useDerivedValue(() => sidePath(points.value.near));
  const torso = useDerivedValue(() => torsoPath(points.value));
  const glow = useDerivedValue(() => glowPath(points.value, move.targetMuscles));
  const headCx = useDerivedValue(() => points.value.head.x);
  const headCy = useDerivedValue(() => points.value.head.y);
  const glowOpacity = useDerivedValue(
    () => 0.45 + 0.35 * (0.5 + 0.5 * Math.sin(progress.value * Math.PI * 2 * 3))
  );

  return (
    <Canvas style={styles.canvas}>
      <Rect x={0} y={0} width={CHARACTER_WIDTH} height={CHARACTER_HEIGHT} color={colors.stage} />
      <Circle cx={ANCHOR.x} cy={GROUND_Y} r={GROUND_RADIUS} color={colors.ground} opacity={0.6} />

      <Path path={glow} style="stroke" strokeWidth={14} strokeCap="round" color={colors.glow} opacity={glowOpacity}>
        <BlurMask blur={9} style="normal" />
      </Path>

      <Path path={torso} style="stroke" strokeWidth={7} strokeCap="round" strokeJoin="round" color={colors.near} />
      <Path path={farLimbsPath} style="stroke" strokeWidth={6} strokeCap="round" strokeJoin="round" color={colors.far} />
      <Path path={nearLimbsPath} style="stroke" strokeWidth={7} strokeCap="round" strokeJoin="round" color={colors.near} />

      <Circle cx={headCx} cy={headCy} r={BONES.head} color={colors.near} />
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: { width: CHARACTER_WIDTH, height: CHARACTER_HEIGHT },
});
