import Constants, { ExecutionEnvironment } from 'expo-constants';

import type { NativeBodyMetrics } from './health-sync';

export const nativeHealthProvider = 'Apple Health';

export async function syncNativeBodyMetrics(): Promise<NativeBodyMetrics> {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    throw new Error('Apple Health ใช้ไม่ได้ใน Expo Go กรุณาเปิดด้วย Development Build');
  }

  const {
    getMostRecentQuantitySample,
    isHealthDataAvailableAsync,
    requestAuthorization,
  } = await import('@kingstinct/react-native-healthkit');
  if (!(await isHealthDataAvailableAsync())) {
    throw new Error('อุปกรณ์นี้ไม่รองรับ Apple Health');
  }

  const identifiers = [
    'HKQuantityTypeIdentifierBodyMass',
    'HKQuantityTypeIdentifierBodyFatPercentage',
    'HKQuantityTypeIdentifierLeanBodyMass',
  ] as const;
  const authorized = await requestAuthorization({ toRead: identifiers });
  if (!authorized) throw new Error('ไม่ได้รับอนุญาตให้อ่านข้อมูลจาก Apple Health');

  const [weight, bodyFat, leanBodyMass] = await Promise.all([
    getMostRecentQuantitySample('HKQuantityTypeIdentifierBodyMass', 'kg'),
    getMostRecentQuantitySample('HKQuantityTypeIdentifierBodyFatPercentage', '%'),
    getMostRecentQuantitySample('HKQuantityTypeIdentifierLeanBodyMass', 'kg'),
  ]);
  const dates = [weight?.endDate, bodyFat?.endDate, leanBodyMass?.endDate]
    .filter((value): value is Date => value instanceof Date)
    .map((value) => value.getTime());

  return {
    source: 'Apple Health',
    measuredAt: dates.length ? new Date(Math.max(...dates)).toISOString() : new Date().toISOString(),
    weightKg: weight?.quantity ?? null,
    bodyFatPercent: bodyFat?.quantity ?? null,
    leanBodyMassKg: leanBodyMass?.quantity ?? null,
  };
}
