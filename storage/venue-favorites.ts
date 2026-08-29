import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'promptwing.venueFavorites';

/** รหัส Venue ที่บันทึกไว้ทั้งหมด คืนเซตว่างถ้ายังไม่เคยบันทึกหรืออ่านไม่ได้ */
export async function loadFavoriteVenueIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === null) return new Set();

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();

    return new Set(parsed.filter((id): id is string => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

export async function saveFavoriteVenueIds(ids: ReadonlySet<string>): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}
