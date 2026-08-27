import * as Location from 'expo-location';

import type { Coordinates } from '@/services/geo';

/**
 * ตำแหน่งสำรองคือ มจพ. ปราจีนบุรี
 *
 * ใช้เมื่อผู้ใช้ไม่ให้สิทธิ์หรือหาตำแหน่งไม่ได้ เพื่อให้แอปยังมีอะไรให้ดู
 * ทุกจอที่ใช้ค่านี้ต้องบอกผู้ใช้ว่ากำลังแสดงข้อมูลของที่ไหน
 */
export const FALLBACK_LOCATION: Coordinates = { latitude: 14.164, longitude: 101.3452 };
export const FALLBACK_LOCATION_LABEL = 'มจพ. ปราจีนบุรี';

export interface LocationResult {
  coordinates: Coordinates;
  /** true เมื่อเป็นตำแหน่งสำรอง ไม่ใช่ตำแหน่งจริงของผู้ใช้ */
  isFallback: boolean;
}

/**
 * ตำแหน่งปัจจุบันของผู้ใช้ ถอยไปใช้ตำแหน่งสำรองเมื่อขอไม่ได้
 *
 * ไม่ throw เพราะการไม่ให้สิทธิ์ตำแหน่งเป็นทางเลือกปกติของผู้ใช้ ไม่ใช่ความผิดพลาด
 */
export async function getCurrentCoordinates(): Promise<LocationResult> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) {
      return { coordinates: FALLBACK_LOCATION, isFallback: true };
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      coordinates: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
      isFallback: false,
    };
  } catch {
    return { coordinates: FALLBACK_LOCATION, isFallback: true };
  }
}
