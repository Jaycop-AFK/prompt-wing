import Constants, { ExecutionEnvironment } from 'expo-constants';

import type { NativeBodyMetrics } from './health-sync';

export const nativeHealthProvider = 'Health Connect';

export async function syncNativeBodyMetrics(): Promise<NativeBodyMetrics> {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    throw new Error('Health Connect ใช้ไม่ได้ใน Expo Go กรุณาเปิดด้วย Development Build');
  }

  const { getSdkStatus, initialize, readRecords, requestPermission, SdkAvailabilityStatus } =
    await import('react-native-health-connect');
  const status = await getSdkStatus();
  if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) {
    throw new Error('ไม่พบ Health Connect หรือจำเป็นต้องอัปเดตในเครื่องนี้');
  }
  if (!(await initialize())) throw new Error('เริ่มต้น Health Connect ไม่สำเร็จ');

  const requested = [
    { accessType: 'read', recordType: 'Weight' },
    { accessType: 'read', recordType: 'BodyFat' },
    { accessType: 'read', recordType: 'LeanBodyMass' },
  ] as const;
  const granted = await requestPermission([...requested]);
  if (!requested.every((permission) => granted.some(
    (item) => item.accessType === permission.accessType && item.recordType === permission.recordType
  ))) {
    throw new Error('กรุณาอนุญาต Weight, Body fat และ Lean body mass ใน Health Connect');
  }

  const options = {
    timeRangeFilter: {
      operator: 'after' as const,
      startTime: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    },
    ascendingOrder: false,
    pageSize: 1,
  };
  const [weight, bodyFat, leanBodyMass] = await Promise.all([
    readRecords('Weight', options),
    readRecords('BodyFat', options),
    readRecords('LeanBodyMass', options),
  ]);
  const weightRecord = weight.records[0];
  const fatRecord = bodyFat.records[0];
  const leanRecord = leanBodyMass.records[0];
  const dates = [weightRecord?.time, fatRecord?.time, leanRecord?.time]
    .filter((value): value is string => typeof value === 'string')
    .map((value) => Date.parse(value))
    .filter(Number.isFinite);

  return {
    source: 'Health Connect',
    measuredAt: dates.length ? new Date(Math.max(...dates)).toISOString() : new Date().toISOString(),
    weightKg: weightRecord?.weight.inKilograms ?? null,
    bodyFatPercent: fatRecord?.percentage ?? null,
    leanBodyMassKg: leanRecord?.mass.inKilograms ?? null,
  };
}
