import { useCallback, useEffect, useRef, useState } from 'react';

import { evaluateRunClearance, type RunClearance } from '@/core/coach';
import { fetchTodayConditions, type TodayConditions } from '@/services/conditions';
import { getCurrentCoordinates, type LocationResult } from '@/services/location';

interface State {
  status: 'loading' | 'ready' | 'error';
  conditions: TodayConditions | null;
  clearance: RunClearance | null;
  location: LocationResult | null;
  /** ข้อความบอกผู้ใช้เมื่อดึงข้อมูลไม่สำเร็จ */
  error: string | null;
  /** เวลาที่ใช้ประเมิน เก็บไว้เพื่อให้จอแสดงผลอ้างเวลาเดียวกันทั้งหมด */
  evaluatedAt: number;
}

const INITIAL: State = {
  status: 'loading',
  conditions: null,
  clearance: null,
  location: null,
  error: null,
  evaluatedAt: 0,
};

/**
 * สภาพอากาศของวันนี้พร้อมใบอนุญาตวิ่งที่ประเมินแล้ว
 *
 * เวลาปัจจุบันถูกอ่านที่นี่ที่เดียวแล้วส่งเข้าโมดูลตัวตัดสินใจเป็นพารามิเตอร์
 * โมดูลนั้นไม่อ่านนาฬิกาเอง เพื่อให้เขียนเทสต์เรื่องช่วงเวลาได้
 */
export function useTodayConditions() {
  const [state, setState] = useState<State>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((previous) => ({ ...previous, status: 'loading', error: null }));

    try {
      const location = await getCurrentCoordinates();
      const conditions = await fetchTodayConditions(location.coordinates, controller.signal);
      if (controller.signal.aborted) return;

      const now = Date.now();

      setState({
        status: 'ready',
        conditions,
        clearance: evaluateRunClearance({
          hours: conditions.hours,
          sunrise: conditions.sunrise,
          sunset: conditions.sunset,
          now,
        }),
        location,
        error: null,
        evaluatedAt: now,
      });
    } catch (error) {
      if (controller.signal.aborted) return;

      setState({
        ...INITIAL,
        status: 'error',
        error:
          error instanceof Error && error.message
            ? error.message
            : 'ดึงข้อมูลสภาพอากาศไม่สำเร็จ',
      });
    }
  }, []);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  return { ...state, reload: load };
}
