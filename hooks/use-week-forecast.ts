import { useCallback, useEffect, useRef, useState } from 'react';

import { getCurrentCoordinates, type LocationResult } from '@/services/location';
import { fetchOpenMeteoForecastDays, MAX_FORECAST_DAYS, type ForecastDay } from '@/services/open-meteo';

interface State {
  status: 'loading' | 'ready' | 'error';
  days: ForecastDay[];
  location: LocationResult | null;
  error: string | null;
}

const INITIAL: State = { status: 'loading', days: [], location: null, error: null };

/**
 * พยากรณ์รายชั่วโมง MAX_FORECAST_DAYS วันข้างหน้าตรงตำแหน่งของผู้ใช้ สำหรับตารางซ้อม
 *
 * โหลดเฉพาะตอนที่จอส่ง enabled เป็น true จะได้ไม่ขอตำแหน่งและยิงเน็ตให้ผู้ใช้ที่ยังเปิดฟีเจอร์นี้ไม่ได้
 */
export function useWeekForecast(enabled: boolean) {
  const [state, setState] = useState<State>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState((previous) => ({ ...previous, status: 'loading', error: null }));

    try {
      const location = await getCurrentCoordinates();
      const days = await fetchOpenMeteoForecastDays(location.coordinates, MAX_FORECAST_DAYS, controller.signal);
      if (controller.signal.aborted) return;
      setState({ status: 'ready', days, location, error: null });
    } catch (error) {
      if (controller.signal.aborted) return;
      setState({
        ...INITIAL,
        status: 'error',
        error: error instanceof Error && error.message ? error.message : 'ดึงพยากรณ์อากาศไม่สำเร็จ',
      });
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    load();
    return () => abortRef.current?.abort();
  }, [enabled, load]);

  return { ...state, reload: load };
}
