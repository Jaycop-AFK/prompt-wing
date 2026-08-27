import { Accelerometer, type AccelerometerMeasurement } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';

import { cadenceFromStepTimestamps, createStepDetector } from '@/services/step-detector';

export type CadenceSensorStatus = 'checking' | 'unavailable' | 'ready';

/** เก็บตามเวลา (at) ไม่ใช่ตามระยะทางแบบ FormSample ใน core/coach/types.ts ตั๋วที่เชื่อมสองอย่างนี้
 * เข้าด้วยกันต้องแปลงหน่วยเอง เช่น จับคู่กับระยะทางสะสม ณ เวลานั้นจาก useLiveRunTracker */
export interface CadenceSample {
  cadenceSpm: number;
  at: number;
}

export interface CadenceSensorState {
  status: CadenceSensorStatus;
  /** ก้าว/นาทีล่าสุด null ถ้ายังไม่มีข้อมูลพอ (ต้องตรวจพบอย่างน้อยสองก้าว) */
  cadenceSpm: number | null;
  /** ประวัติ cadence สะสมทุกครั้งที่ตรวจพบก้าวใหม่ตลอด Session ไว้ให้ตั๋วสรุปผลวิ่งคำนวณฟอร์มสกอร์
   * (เช่น cadence ที่ตกช่วงท้าย) ไม่ตัดทอนหน้าต่างข้อมูล เพราะต้องใช้ประวัติเต็มช่วงวิ่ง */
  samples: CadenceSample[];
}

const UPDATE_INTERVAL_MS = 200;

/**
 * วัด cadence (ก้าว/นาที) จาก accelerometer ระหว่างวิ่งจริง
 *
 * Android 12 ขึ้นไปบังคับเพดานอัตราสุ่มตัวอย่างไว้ที่ 200ms (5Hz) เสมอ ไม่ว่า setUpdateInterval จะขอ
 * ถี่กว่านั้นแค่ไหน (ยืนยันจากเอกสารทางการของ expo-sensors ณ SDK 54) ทำให้จังหวะวิ่งจริงทั่วไป
 * (160-190 ก้าว/นาที) ถูกประเมินต่ำกว่าจริงอย่างมีนัยสำคัญเสมอบนเครื่องที่โดนเพดานนี้ ไม่ว่าจะจูน
 * อัลกอริทึมอย่างไรก็ตาม เพราะเกินขีดจำกัดของทฤษฎีการสุ่มตัวอย่างของ Nyquist ไปแล้ว ดูเหตุผลเต็มใน
 * services/step-detector.ts เพิ่ม HIGH_SAMPLING_RATE_SENSORS ใน app.json แล้วเผื่อไว้ แต่ไม่น่าจะมีผล
 * ภายใน Expo Go เพราะสิทธิ์ระดับแอนดรอยด์แบบนี้ต้องคอมไพล์ native manifest ใหม่ ซึ่ง Expo Go เป็น
 * เชลล์สำเร็จรูปที่คอมไพล์ไว้ล่วงหน้าแล้ว (ดู ADR 0002) ยังไม่เคยทดสอบกับเครื่องจริงเลย
 *
 * active=false ถอดการติดตามเซนเซอร์ทั้งหมดเพื่อประหยัดแบตเตอรี่ (ตอนหยุดชั่วคราว/ยังไม่เริ่มวิ่ง)
 * เหมือนที่ useLiveRunTracker ถอด GPS ตอนหยุดชั่วคราว ค่าที่สะสมไว้ก่อนหน้าจะไม่ถูกล้าง ต่อยอดสะสม
 * ต่อได้ทันทีที่ active=true อีกครั้ง
 */
export function useCadenceSensor(active: boolean): CadenceSensorState {
  const [status, setStatus] = useState<CadenceSensorStatus>('checking');
  const [cadenceSpm, setCadenceSpm] = useState<number | null>(null);
  const [samples, setSamples] = useState<CadenceSample[]>([]);

  const detectorRef = useRef(createStepDetector());
  const stepTimestampsRef = useRef<number[]>([]);

  useEffect(() => {
    let cancelled = false;

    Accelerometer.isAvailableAsync()
      .then((available) => {
        if (!cancelled) setStatus(available ? 'ready' : 'unavailable');
      })
      .catch(() => {
        if (!cancelled) setStatus('unavailable');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status !== 'ready' || !active) return;

    Accelerometer.setUpdateInterval(UPDATE_INTERVAL_MS);

    const subscription = Accelerometer.addListener(({ x, y, z, timestamp }: AccelerometerMeasurement) => {
      // ใช้ timestamp ของตัวเซนเซอร์เอง (วินาที มาจากนาฬิกาตอนจับตัวอย่างจริงของฮาร์ดแวร์) ไม่ใช่
      // Date.now() ตอน callback มาถึงฝั่ง JS เพราะบวกความหน่วงของ bridge เพิ่มเข้าไปโดยไม่จำเป็น
      // บนสัญญาณที่ตึงมืออยู่แล้วจากเพดานอัตราสุ่มตัวอย่าง ไม่ใช่เวลาปฏิทิน จึงเทียบข้ามอุปกรณ์ไม่ได้
      // แต่ step-detector ใช้แค่ผลต่างระหว่างตัวอย่างต่อเนื่องกัน จึงไม่ต้องอ้างอิงเวลาจริง
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const stepAt = detectorRef.current.addSample({ magnitude, at: timestamp * 1000 });
      if (stepAt === null) return;

      stepTimestampsRef.current.push(stepAt);

      const estimated = cadenceFromStepTimestamps(stepTimestampsRef.current);
      if (estimated === null) return;

      setCadenceSpm(estimated);
      setSamples((previous) => [...previous, { cadenceSpm: estimated, at: stepAt }]);
    });

    return () => subscription.remove();
  }, [status, active]);

  return { status, cadenceSpm, samples };
}
