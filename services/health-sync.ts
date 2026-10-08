export interface NativeBodyMetrics {
  source: 'Apple Health' | 'Health Connect';
  measuredAt: string;
  weightKg: number | null;
  bodyFatPercent: number | null;
  leanBodyMassKg: number | null;
}

export const nativeHealthProvider = 'Development Build';

export async function syncNativeBodyMetrics(): Promise<NativeBodyMetrics> {
  throw new Error('เปิดฟีเจอร์นี้ผ่าน Development Build บน iPhone หรือ Android');
}
