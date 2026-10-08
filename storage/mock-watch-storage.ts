import AsyncStorage from '@react-native-async-storage/async-storage';

import { findMockWatchDevice, type MockWatchDeviceId } from '@/services/mock-watch';

const KEY = 'prompt-wing.mock-watch.v1';

export async function loadConnectedMockWatch(): Promise<MockWatchDeviceId | null> {
  const stored = await AsyncStorage.getItem(KEY);
  return findMockWatchDevice(stored)?.id ?? null;
}

export async function saveConnectedMockWatch(deviceId: MockWatchDeviceId | null): Promise<void> {
  if (deviceId === null) {
    await AsyncStorage.removeItem(KEY);
    return;
  }
  await AsyncStorage.setItem(KEY, deviceId);
}
