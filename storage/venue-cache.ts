import AsyncStorage from '@react-native-async-storage/async-storage';

import type { LocationResult } from '@/services/location';
import type { Venue } from '@/services/venue';

const STORAGE_KEY = '@prompt-wing/nearby-venues-v1';
const CACHE_VERSION = 1;
const FRESH_FOR_MS = 15 * 60 * 1000;
const KEEP_FOR_MS = 7 * 24 * 60 * 60 * 1000;

interface StoredVenueCache {
  version: number;
  storedAt: number;
  location: LocationResult;
  overpassVenues: Venue[];
}

export interface LoadedVenueCache {
  storedAt: number;
  isFresh: boolean;
  location: LocationResult;
  overpassVenues: Venue[];
}

function isFiniteCoordinates(value: unknown): value is LocationResult['coordinates'] {
  if (!value || typeof value !== 'object') return false;
  const point = value as { latitude?: unknown; longitude?: unknown };
  return Number.isFinite(point.latitude) && Number.isFinite(point.longitude);
}

function isVenue(value: unknown): value is Venue {
  if (!value || typeof value !== 'object') return false;
  const venue = value as Partial<Venue>;
  return (
    typeof venue.id === 'string' &&
    isFiniteCoordinates(venue.coordinates) &&
    venue.source === 'overpass' &&
    typeof venue.mockPopularity === 'number' &&
    !!venue.amenities
  );
}

function parseCache(raw: string, now: number): LoadedVenueCache | null {
  try {
    const value = JSON.parse(raw) as Partial<StoredVenueCache>;
    if (
      value.version !== CACHE_VERSION ||
      typeof value.storedAt !== 'number' ||
      now - value.storedAt < 0 ||
      now - value.storedAt > KEEP_FOR_MS ||
      !value.location ||
      typeof value.location.isFallback !== 'boolean' ||
      !isFiniteCoordinates(value.location.coordinates) ||
      !Array.isArray(value.overpassVenues) ||
      !value.overpassVenues.every(isVenue)
    ) {
      return null;
    }

    return {
      storedAt: value.storedAt,
      isFresh: now - value.storedAt < FRESH_FOR_MS,
      location: value.location,
      overpassVenues: value.overpassVenues,
    };
  } catch {
    return null;
  }
}

/** Cache สาธารณะจาก OSM เท่านั้น ไม่มี token, session หรือข้อมูลบัญชีผู้ใช้ */
export async function loadVenueCache(now = Date.now()): Promise<LoadedVenueCache | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = parseCache(raw, now);
    if (!parsed) await AsyncStorage.removeItem(STORAGE_KEY);
    return parsed;
  } catch {
    return null;
  }
}

export async function saveVenueCache(
  location: LocationResult,
  overpassVenues: Venue[],
  now = Date.now()
): Promise<void> {
  const value: StoredVenueCache = {
    version: CACHE_VERSION,
    storedAt: now,
    location,
    overpassVenues,
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}
