/**
 * ตรวจจับก้าววิ่งจากขนาดเวกเตอร์ความเร่งของ accelerometer
 *
 * ไม่ import จาก react-native หรือ expo เลย จึงเทสต์ด้วยสัญญาณสังเคราะห์ได้โดยไม่ต้องมีเครื่องจริง
 * ซึ่งสำคัญมากสำหรับไฟล์นี้ เพราะไม่มีทางตรวจสอบกับความเคลื่อนไหวของคนจริงได้ในสภาพแวดล้อมนี้เลย
 *
 * เลือกวิธี "ข้ามเกณฑ์แบบมีฮิสเทอรีซิส" (hysteresis threshold-crossing) แทนการหายอดคลื่นสามจุด
 * (ขึ้น-สูงสุด-ลง) เพราะ Android 12 ขึ้นไปบังคับเพดานอัตราสุ่มตัวอย่างเซ็นเซอร์ไว้ที่ 200ms
 * (5Hz) โดยไม่สนใจค่าที่ขอไป ไม่ว่าแอปจะขอถี่แค่ไหน ที่ 5Hz เทียบกับจังหวะก้าววิ่งทั่วไป
 * (~170 ก้าว/นาที คือรอบละ ~353ms) จะได้แค่ประมาณ 1.7 ตัวอย่างต่อหนึ่งก้าว ซึ่งไม่พอจะเห็นรูป
 * ยอดคลื่นครบสามจุดอย่างน่าเชื่อถือ การข้ามเกณฑ์ต้องการแค่เห็นตัวอย่างใดตัวอย่างหนึ่งอยู่เหนือเกณฑ์
 * สูงและใดตัวอย่างหนึ่งอยู่ใต้เกณฑ์ต่ำในแต่ละรอบ ทนทานต่ออัตราสุ่มตัวอย่างต่ำกว่ามาก
 */

export interface AccelerometerSample {
  /** ขนาดเวกเตอร์ความเร่งรวมสามแกน หน่วย g (แรงโน้มถ่วงโลก 1.0 = 9.81 m/s²) */
  magnitude: number;
  at: number;
}

export interface StepDetectorOptions {
  /**
   * ค่าคงที่การปรับเส้นฐานทีละน้อย ยิ่งน้อยเส้นฐานยิ่งขยับช้า ตั้งใจให้ช้ากว่าจังหวะการก้าวมาก
   * เพื่อให้เส้นฐานแทนค่าเฉลี่ยระยะยาว (แรงโน้มถ่วงบวกการเอียงตัวช้า ๆ) ไม่ใช่ไล่ตามคลื่นการก้าวเอง
   */
  baselineSmoothing: number;
  /** ต้องสูงกว่าเส้นฐานเท่านี้ (หน่วย g) ถึงจะนับว่าข้ามขึ้นเป็นจังหวะกระแทกของการก้าว */
  highOffset: number;
  /** ต้องต่ำกว่าจุดนี้ก่อน ถึงจะพร้อมนับก้าวถัดไปได้ ต่ำกว่า highOffset เพื่อกันสัญญาณรบกวน
   * ใกล้เกณฑ์เดียวกันสั่นแล้วถูกนับซ้ำ (ฮิสเทอรีซิส) */
  lowOffset: number;
  /** ห้ามนับก้าวถัดไปเร็วกว่านี้ กันสัญญาณรบกวนถูกนับเป็นก้าวเพิ่ม ตั้งไว้ที่ 240 ก้าว/นาที
   * ซึ่งเร็วกว่าจังหวะวิ่งจริงของมนุษย์ทุกกรณี */
  minStepIntervalMs: number;
}

/**
 * ค่าเริ่มต้นปรับจูนด้วยสัญญาณสังเคราะห์ให้ทำงานได้ดีที่สุดเท่าที่ทำได้ภายใต้ข้อจำกัดจริงของ
 * แอนดรอยด์ 12 ขึ้นไป ซึ่งบังคับเพดานอัตราสุ่มตัวอย่างเซ็นเซอร์ไว้ที่ 200ms (5Hz) เสมอไม่ว่าแอปจะ
 * ขอถี่แค่ไหน (ดู services/step-detector.test.ts และ hooks/use-cadence-sensor.ts) ที่ 5Hz นี้
 * ความถี่ไนควิสต์คือ 2.5Hz = 150 ก้าว/นาที เกณฑ์ที่ใกล้เส้นกึ่งกลางสัญญาณแบบนี้ (ไม่ใช่ใกล้ยอดคลื่น)
 * กู้คืนจังหวะที่ต่ำกว่า ~150 ก้าว/นาที (เดินเร็ว/จ๊อกกิ้งเบา ๆ) ได้แม่นยำมาก แต่จังหวะวิ่งจริงทั่วไป
 * (160-190 ก้าว/นาที) จะถูกประเมินต่ำกว่าจริงอย่างมีนัยสำคัญเสมอบนเครื่องที่โดนเพดานนี้ ไม่ว่าจะ
 * จูนเกณฑ์อย่างไรก็ตาม เพราะเกินขีดจำกัดทางคณิตศาสตร์ของทฤษฎีการสุ่มตัวอย่างของ Nyquist ไปแล้ว
 * ไม่ใช่ปัญหาการจูนอัลกอริทึม บนอุปกรณ์ที่ไม่ติดเพดานนี้ (iOS ส่วนใหญ่ แอนดรอยด์รุ่นเก่า) ความแม่นยำ
 * จะดีมากตลอดช่วงจังหวะการวิ่งปกติ ยังไม่เคยผ่านการทดสอบกับเครื่องจริงเลย ต้องปรับค่าเหล่านี้ใหม่
 * หลังทดสอบวิ่งจริงบนมือถือจริงเสมอ ห้ามเชื่อว่าแม่นยำจากเทสต์สังเคราะห์อย่างเดียว
 */
export const DEFAULT_STEP_DETECTOR_OPTIONS: StepDetectorOptions = {
  baselineSmoothing: 0.05,
  highOffset: 0.08,
  lowOffset: -0.08,
  minStepIntervalMs: 250,
};

interface StepDetectorState {
  baseline: number;
  phase: 'below' | 'above';
  lastStepAt: number | null;
}

export interface StepDetector {
  /** ป้อนตัวอย่างทีละจุดตามลำดับเวลา คืนเวลาที่ตรวจพบก้าว หรือ null ถ้าตัวอย่างนี้ไม่ใช่ก้าวใหม่ */
  addSample(sample: AccelerometerSample): number | null;
}

/** สร้างตัวตรวจจับก้าวใหม่หนึ่งตัว ใช้ตัวเดียวตลอด Session เดียว มีสถานะภายในที่ต้องต่อเนื่องกัน */
export function createStepDetector(
  options: StepDetectorOptions = DEFAULT_STEP_DETECTOR_OPTIONS
): StepDetector {
  const state: StepDetectorState = {
    baseline: 1, // เริ่มที่ 1g สมมติว่าตอนเริ่มเครื่องอยู่นิ่ง ๆ ก่อน จะปรับเข้าค่าจริงเองภายในไม่กี่ตัวอย่าง
    phase: 'below',
    lastStepAt: null,
  };

  return {
    addSample({ magnitude, at }: AccelerometerSample): number | null {
      const highThreshold = state.baseline + options.highOffset;
      const lowThreshold = state.baseline + options.lowOffset;

      let stepAt: number | null = null;

      if (state.phase === 'below' && magnitude >= highThreshold) {
        const enoughTimePassed =
          state.lastStepAt === null || at - state.lastStepAt >= options.minStepIntervalMs;

        if (enoughTimePassed) {
          stepAt = at;
          state.lastStepAt = at;
        }
        state.phase = 'above';
      } else if (state.phase === 'above' && magnitude <= lowThreshold) {
        state.phase = 'below';
      }

      // ปรับเส้นฐานหลังตัดสินใจของรอบนี้เสร็จแล้วเสมอ ไม่งั้นเส้นฐานจะขยับตามค่าที่เพิ่งใช้ตัดสิน
      // ก้าวปัจจุบันไปแล้ว ทำให้เกณฑ์ของก้าวถัดไปเพี้ยนจากที่ตั้งใจไว้
      state.baseline += options.baselineSmoothing * (magnitude - state.baseline);

      return stepAt;
    },
  };
}

/** จำนวนก้าวล่าสุดที่ใช้คำนวณ cadence เฉลี่ย มากไปตอบสนองจังหวะที่เปลี่ยนช้า น้อยไปสั่นไหวง่ายตามสัญญาณรบกวน */
export const DEFAULT_CADENCE_WINDOW_SIZE = 8;

/**
 * ก้าวต่อนาที จากช่วงเวลาเฉลี่ยของก้าวล่าสุดไม่กี่ก้าว null เมื่อยังมีข้อมูลไม่พอ (น้อยกว่าสองก้าว)
 *
 * ใช้หน้าต่างท้ายอาร์เรย์แทนทั้งหมด เพื่อให้ตัวเลขตอบสนองต่อจังหวะปัจจุบัน ไม่ใช่ค่าเฉลี่ยทั้ง Session
 */
export function cadenceFromStepTimestamps(
  steps: readonly number[],
  windowSize = DEFAULT_CADENCE_WINDOW_SIZE
): number | null {
  if (steps.length < 2) return null;

  const recent = steps.slice(-windowSize);
  const totalMs = recent[recent.length - 1] - recent[0];
  const intervalCount = recent.length - 1;

  if (totalMs <= 0) return null;

  const averageIntervalMs = totalMs / intervalCount;
  return 60000 / averageIntervalMs;
}
