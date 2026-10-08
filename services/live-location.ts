import type { Coordinates } from './geo';

interface DeviceLocationLike {
  coords: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
  };
}

const MAX_MAP_CENTER_ACCURACY_METERS = 10_000;

export interface LiveMapCenter extends Coordinates {
  accuracyMeters: number | null;
}

/**
 * จุดจัดกล้องยอมรับ accuracy กว้างกว่าจุดคำนวณระยะ เพราะตำแหน่งคร่าว ๆ ยังดีกว่าแผนที่โลก
 * แต่ไม่ยอมรับพิกัดเสียหรือ network location ที่คลาดเคลื่อนระดับหลายกิโลเมตร
 */
export function mapCenterFromLocation(location: DeviceLocationLike): LiveMapCenter | null {
  const { latitude, longitude, accuracy } = location.coords;
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180 ||
    (accuracy !== null &&
      accuracy !== undefined &&
      (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > MAX_MAP_CENTER_ACCURACY_METERS))
  ) {
    return null;
  }
  return { latitude, longitude, accuracyMeters: accuracy ?? null };
}
