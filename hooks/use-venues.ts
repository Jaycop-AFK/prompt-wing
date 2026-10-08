import { useCallback, useEffect, useRef, useState } from 'react';

import { CURATED_VENUES } from '@/services/curated-venues';
import { distanceKm, type Coordinates } from '@/services/geo';
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
import { loadVenueCache, saveVenueCache } from '@/storage/venue-cache';

/** รัศมีค้นหารอบตำแหน่งผู้ใช้ กว้างพอสำหรับคนที่ยอมเดินทางไปวิ่งไกลจากบ้านนิดหน่อย แต่ไม่กว้างจน
 * Overpass คืนผลช้าหรือได้ที่วิ่งที่ไกลเกินจะไปจริง */
const SEARCH_RADIUS_METERS = 5000;
const CACHE_LOCATION_TOLERANCE_KM = 0.75;

interface State {
  status: 'loading' | 'ready' | 'error';
  venues: Venue[];
  location: LocationResult | null;
  error: string | null;
  isRefreshing: boolean;
}

const INITIAL: State = {
  status: 'loading',
  venues: [],
  location: null,
  error: null,
  isRefreshing: false,
};

function combineVenues(overpassVenues: Venue[], location: LocationResult): Venue[] {
  const nearbyCurated = withinSearchRadius(
    CURATED_VENUES,
    location.coordinates,
    SEARCH_RADIUS_METERS / 1000
  );
  return mergeCuratedVenues(overpassVenues, nearbyCurated);
}

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

  const load = useCallback(async (forceRefresh = false) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((previous) =>
      previous.venues.length > 0
        ? { ...previous, status: 'ready', error: null, isRefreshing: true }
        : { ...INITIAL, isRefreshing: true }
    );

    try {
      const cached = forceRefresh ? null : await loadVenueCache();
      if (controller.signal.aborted) return;

      if (cached) {
        setState({
          status: 'ready',
          venues: combineVenues(cached.overpassVenues, cached.location),
          location: cached.location,
          error: null,
          isRefreshing: true,
        });
      }

      const location = await getCurrentCoordinates();
      if (controller.signal.aborted) return;

      if (
        cached?.isFresh &&
        distanceKm(cached.location.coordinates, location.coordinates) <= CACHE_LOCATION_TOLERANCE_KM
      ) {
        setState({
          status: 'ready',
          venues: combineVenues(cached.overpassVenues, location),
          location,
          error: null,
          isRefreshing: false,
        });
        return;
      }

      const overpassVenues = await fetchNearbyVenues(
        location.coordinates,
        SEARCH_RADIUS_METERS,
        controller.signal,
        forceRefresh
      );
      if (controller.signal.aborted) return;

      setState({
        status: 'ready',
        venues: combineVenues(overpassVenues, location),
        location,
        error: null,
        isRefreshing: false,
      });
      saveVenueCache(location, overpassVenues).catch(() => {
        // Cache เป็นตัวเร่งเท่านั้น เขียนไม่ได้ต้องไม่ทำให้ข้อมูลสดที่เพิ่งโหลดมาหายไป
      });
    } catch (error) {
      if (controller.signal.aborted) return;

      const message =
        error instanceof Error && error.message ? error.message : 'หาที่วิ่งใกล้ตัวไม่สำเร็จ';
      setState((current) =>
        current.venues.length > 0
          ? { ...current, status: 'ready', error: message, isRefreshing: false }
          : { ...INITIAL, status: 'error', error: message }
      );
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

  const reload = useCallback(() => load(true), [load]);

  return {
    status: state.status,
    venues: sorted,
    location: state.location,
    error: state.error,
    reload,
    isRefreshing: state.isRefreshing,
    sort,
    setSort,
    savedIds,
    toggleSaved,
  };
}
