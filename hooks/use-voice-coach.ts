import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';

import { kmMilestoneSpeech, paceDriftSpeech } from '@/components/live-run/copy';
import { classifyPaceDrift, nextKmMilestone } from '@/core/coach';

const STORAGE_KEY = 'promptwing.voiceCoachEnabled';

/** ห่างกันขั้นต่ำระหว่างคำเตือนเรื่อง pace สองครั้งที่พูดสำเร็จจริง กันไม่ให้พูดซ้ำถี่ ๆ ตลอดช่วงที่ยัง
 * หลุดช่วงต่อเนื่อง การประกาศครบกิโลเมตรไม่ต้องมีคูลดาวน์แบบนี้ เพราะเป็นเหตุการณ์ที่เกิดครั้งเดียวต่อ
 * กิโลเมตรอยู่แล้ว */
const PACE_NUDGE_COOLDOWN_MS = 60_000;

/** ถ้าเอนจินเสียงพูดของเครื่องรับคำสั่งไปแล้วแต่ไม่เรียก callback กลับมาเลยสักตัว (ปัญหาของเอนจิน
 * บางรุ่น ไม่ใช่พฤติกรรมที่เอกสาร expo-speech รับประกันไว้) isSpeakingRef จะค้างเป็น true ตลอดไป
 * และโค้ชจะเงียบไปตลอดการวิ่งที่เหลือ ตัวจับเวลานี้บังคับล้างค่าทิ้งถ้าไม่มี callback ไหนตอบกลับมา
 * ภายในเวลานี้ ตั้งไว้นานกว่าประโยคที่ยาวที่สุดที่โค้ชนี้พูดจริงมากพอสมควร ไม่ให้ตัดจังหวะประโยคที่
 * กำลังพูดอยู่จริงโดยไม่ตั้งใจ */
const SPEECH_WATCHDOG_MS = 8_000;

interface UseVoiceCoachInput {
  isRunning: boolean;
  /** pace เฉลี่ยสะสม ตัวเดียวกับที่แสดงบนจอ null เมื่อยังไม่มีระยะทางพอคำนวณ */
  paceSecPerKm: number | null;
  /** pace ที่แนะนำของ session นี้ null เมื่อไม่ทราบ (เช่นเข้าจอนี้มาโดยไม่มี SessionTarget) */
  recommendedPaceSecPerKm: number | null;
  distanceKm: number;
  elapsedSeconds: number;
}

/**
 * โค้ชเสียงภาษาไทยระหว่างวิ่ง พูดเตือนเมื่อ pace หลุดช่วงที่แนะนำ และพูดทุกครั้งที่ครบหนึ่งกิโลเมตร
 *
 * กันเสียงพูดซ้อนกันด้วย isSpeakingRef ของตัวเอง ไม่พึ่ง Speech.isSpeakingAsync() เพราะฟังก์ชันนั้น
 * ต้อง await ข้ามเฟรม ระหว่างนั้นอาจมีอีกจังหวะหนึ่งเรียกซ้ำเข้ามาก่อนได้ผลลัพธ์กลับมา speak() จึงคืน
 * ค่า boolean บอกผู้เรียกว่าเพิ่งเริ่มพูดจริงหรือถูกข้ามเพราะกำลังพูดประโยคอื่นค้างอยู่ ผู้เรียกที่นับ
 * เหตุการณ์ครั้งเดียว (เช่นกิโลเมตรที่เพิ่งประกาศ หรือคูลดาวน์ของคำเตือน pace) ต้องขยับตัวนับของตัวเอง
 * ต่อเมื่อได้ true กลับมาเท่านั้น ไม่งั้นเหตุการณ์ที่ถูกข้ามไปเพราะชนกับประโยคอื่นจะหายไปเงียบ ๆ
 * ทั้งที่ไม่เคยถูกพูดออกมาจริงเลยสักครั้ง
 */
export function useVoiceCoach({
  isRunning,
  paceSecPerKm,
  recommendedPaceSecPerKm,
  distanceKm,
  elapsedSeconds,
}: UseVoiceCoachInput) {
  const [enabled, setEnabled] = useState(true);

  const isSpeakingRef = useRef(false);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAnnouncedKmRef = useRef(0);
  const lastPaceNudgeAtRef = useRef(0);

  // นับเฉพาะการกดสลับของผู้ใช้จริง ไม่นับค่าที่อ่านขึ้นมาจากเครื่อง ถ้าผู้ใช้กดสลับระหว่างที่ยังโหลด
  // ค่าเดิมจากเครื่องไม่เสร็จ ห้ามให้ผลโหลดที่มาทีหลังทับสิ่งที่เพิ่งกดไป (รูปแบบเดียวกับที่แก้ไว้ใน
  // hooks/use-profile.tsx และ hooks/use-venues.ts)
  const editCount = useRef(0);

  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (cancelled) return;
        if (stored === 'off' && editCount.current === 0) setEnabled(false);
      })
      .catch(() => {
        // อ่านค่าที่บันทึกไว้ไม่ได้ก็ใช้ค่าเริ่มต้น (เปิด) ต่อไป ไม่ใช่เรื่องที่ต้องรบกวนผู้ใช้
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      Speech.stop().catch(() => {
        // หยุดไม่สำเร็จก็ปล่อยไป จอถัดไปไม่ได้ใช้เสียงโค้ชอยู่แล้ว
      });
    };
  }, []);

  // ไม่มี effect รีเซ็ตตัวนับเมื่อหยุดชั่วคราว เพราะ isRunning จะเป็น false ทุกครั้งที่หยุดชั่วคราว
  // ด้วยเหมือนกัน ถ้ารีเซ็ตตรงนั้นจะทำให้กิโลเมตรที่ประกาศไปแล้วก่อนหยุดถูกประกาศซ้ำอีกครั้งตอนวิ่งต่อ
  // ค่าเริ่มต้น 0 จาก useRef ก็เพียงพออยู่แล้วสำหรับรอบวิ่งใหม่ เพราะจอนี้ navigate ออกไปเสมอตอนจบ
  // การวิ่งแต่ละครั้ง (ดู handleFinish ใน live-run.tsx) ทำให้ได้ instance ใหม่พร้อม ref ใหม่เสมอ
  // ไม่มีทางที่ status จะย้อนกลับไป 'ready' ได้เองภายใน mount เดียวกัน

  const speak = useCallback((text: string): boolean => {
    if (isSpeakingRef.current) return false;
    isSpeakingRef.current = true;

    const clear = () => {
      isSpeakingRef.current = false;
      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
    };

    watchdogRef.current = setTimeout(clear, SPEECH_WATCHDOG_MS);

    try {
      Speech.speak(text, {
        language: 'th-TH',
        onDone: clear,
        onStopped: clear,
        onError: clear,
      });
    } catch {
      // เรียกเข้าโมดูลเสียงพูดของเครื่องไม่สำเร็จตั้งแต่ต้น (เช่นไม่มีเอนจินเสียงพูดติดตั้งอยู่บนเครื่อง
      // เลย) ต้องไม่ทำให้แอปพัง แค่ข้ามการพูดครั้งนี้ไป ผู้ใช้ยังวิ่งต่อได้ตามปกติโดยไม่มีเสียงคอยบอก
      // ส่วนกรณีเครื่องไม่มีเสียงภาษาไทยติดตั้งแต่ยังมีเอนจินอื่นอยู่ expo-speech เลือกเสียงสำรองให้เอง
      // โดยไม่ throw อยู่แล้ว ไม่ต้องจับตรงนี้เป็นพิเศษ
      clear();
    }

    return true;
  }, []);

  const toggle = useCallback(() => {
    editCount.current += 1;
    const next = !enabled;
    setEnabled(next);

    AsyncStorage.setItem(STORAGE_KEY, next ? 'on' : 'off').catch(() => {
      // บันทึกไม่ได้ก็ยังสลับได้ในรอบนี้ แค่ไม่ถูกจำไว้รอบหน้า
    });
    if (!next) {
      Speech.stop().catch(() => {});
    }
  }, [enabled]);

  useEffect(() => {
    if (!isRunning || !enabled) return;

    const milestone = nextKmMilestone(distanceKm, lastAnnouncedKmRef.current);
    if (milestone !== null) {
      // ขยับตัวนับต่อเมื่อพูดสำเร็จจริงเท่านั้น ถ้ากำลังพูดประโยคอื่นค้างอยู่ (speak คืน false) ต้อง
      // รอไปพูดกิโลเมตรนี้ในรอบถัดไปแทน ไม่งั้นกิโลเมตรนี้จะถูกข้ามไปเงียบ ๆ ทั้งที่ไม่เคยพูดจริงเลย
      if (speak(kmMilestoneSpeech(milestone, elapsedSeconds))) {
        lastAnnouncedKmRef.current = milestone;
      }
      return;
    }

    if (recommendedPaceSecPerKm === null) return;

    const sentence = paceDriftSpeech(classifyPaceDrift(paceSecPerKm, recommendedPaceSecPerKm));
    if (!sentence) return;

    const now = Date.now();
    if (now - lastPaceNudgeAtRef.current < PACE_NUDGE_COOLDOWN_MS) return;

    // เช่นเดียวกับกิโลเมตร เริ่มนับคูลดาวน์ต่อเมื่อพูดสำเร็จจริง ไม่งั้นครั้งที่ถูกข้ามเพราะกำลังพูด
    // เรื่องอื่นค้างอยู่จะไปกินโควตาคูลดาวน์ทั้งที่ผู้วิ่งยังไม่เคยได้ยินคำเตือนนี้เลยสักครั้ง
    if (speak(sentence)) {
      lastPaceNudgeAtRef.current = now;
    }
  }, [isRunning, enabled, distanceKm, elapsedSeconds, paceSecPerKm, recommendedPaceSecPerKm, speak]);

  return { enabled, toggle };
}
