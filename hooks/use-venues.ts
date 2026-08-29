import { useCallback, useEffect, useRef, useState } from 'react';

import { CURATED_VENUES } from '@/services/curated-venues';
import type { Coordinates } from '@/services/geo';
import { getCurrentCoordinates, type LocationResult } from '@/services/location';
import { fetchNearbyVenues } from '@/services/overpass';
import {
  mergeCuratedVenues,
  sortVenues,
  withinSearchRadius,
  type Venue,
  type VenueSort,
} from '@/services/venue';
import { loadFavoriteVenueIds, saveFavoriteVenueIds } from '@/storage/venue-favorites';

/** รัศมีค้นหารอบตำแหน่งผู้ใช้ กว้างพอสำหรับคนที่ยอมเดินทางไปวิ่งไกลจากบ้านนิดหน่อย แต่ไม่กว้างจน
 * Overpass คืนผลช้าหรือได้ที่วิ่งที่ไกลเกินจะไปจริง */
const SEARCH_RADIUS_METERS = 5000;

interface State {
  status: 'loading' | 'ready' | 'error';
  venues: Venue[];
  location: LocationResult | null;
  error: string | null;
}

const INITIAL: State = { status: 'loading', venues: [], location: null, error: null };

/**
 * ที่วิ่งรอบตำแหน่งผู้ใช้ รวมสองชั้นข้อมูล (Overpass สด + กรอกเองรอบ มจพ. ปราจีนบุรี) พร้อมเรียงลำดับ
 * และจัดการรายการที่บันทึกไว้ ทุกจอที่ต้องใช้ที่วิ่งเรียก hook นี้ตัวเดียว ไม่ต้องประกอบเองซ้ำ
 */
export function useVenues() {
  const [state, setState] = useState<State>(INITIAL);
  const [sort, setSort] = useState<VenueSort>('nearest');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const abortRef = useRef<AbortController | null>(null);

  // นับเฉพาะการแก้ของผู้ใช้จริง (toggleSaved) ไม่นับค่าที่อ่านขึ้นมาจากเครื่อง ถ้าผู้ใช้กดบันทึก
  // ระหว่างที่ยังโหลดค่าเดิมจากเครื่องไม่เสร็จ ห้ามให้ผลโหลดที่มาทีหลังทับสิ่งที่เพิ่งกดไป ทั้งที่
  // เครื่องอาจบันทึกค่าใหม่นั้นเสร็จไปแล้วด้วยซ้ำ (รูปแบบเดียวกับที่แก้ไว้ใน hooks/use-profile.tsx)
  const editCount = useRef(0);

  useEffect(() => {
    loadFavoriteVenueIds().then((stored) => {
      if (editCount.current === 0) setSavedIds(stored);
    });
  }, []);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((previous) => ({ ...previous, status: 'loading', error: null }));

    try {
      const location = await getCurrentCoordinates();
      const overpassVenues = await fetchNearbyVenues(
        location.coordinates,
        SEARCH_RADIUS_METERS,
        controller.signal
      );
      if (controller.signal.aborted) return;

      // กรอง curated ด้วยระยะค้นหาเดียวกับที่ใช้ยิง Overpass ก่อนเสมอ ไม่งั้น Venue ที่กรอกเองรอบ
      // มจพ. ปราจีนบุรี จะโผล่ในรายการ "รอบตัว" ของผู้ใช้ทุกจังหวัดทั่วประเทศ
      const nearbyCurated = withinSearchRadius(
        CURATED_VENUES,
        location.coordinates,
        SEARCH_RADIUS_METERS / 1000
      );

      setState({
        status: 'ready',
        venues: mergeCuratedVenues(overpassVenues, nearbyCurated),
        location,
        error: null,
      });
    } catch (error) {
      if (controller.signal.aborted) return;

      setState({
        ...INITIAL,
        status: 'error',
        error: error instanceof Error && error.message ? error.message : 'หาที่วิ่งใกล้ตัวไม่สำเร็จ',
      });
    }
  }, []);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  const toggleSaved = useCallback((id: string) => {
    editCount.current += 1;
    setSavedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveFavoriteVenueIds(next).catch(() => {
        // บันทึกไม่ได้ก็ยังใช้ค่าใหม่ได้ในรอบนี้ แค่ไม่ถูกจำไว้รอบหน้า
      });
      return next;
    });
  }, []);

  const userLocation: Coordinates = state.location?.coordinates ?? { latitude: 0, longitude: 0 };
  const sorted = sortVenues(state.venues, sort, userLocation, savedIds);

  return {
    status: state.status,
    venues: sorted,
    location: state.location,
    error: state.error,
    reload: load,
    sort,
    setSort,
    savedIds,
    toggleSaved,
  };
}
