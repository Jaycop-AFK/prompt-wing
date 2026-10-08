export type MockWatchDeviceId = 'apple-demo' | 'garmin-demo' | 'prompt-band';
export type MockActivityMode = 'rest' | 'walk' | 'run';

export interface MockWatchDevice {
  id: MockWatchDeviceId;
  name: string;
  provider: string;
  shape: 'square' | 'round' | 'band';
  accent: string;
}

export interface MockWatchMetrics {
  heartRateBpm: number;
  cadenceSpm: number;
  steps: number;
  caloriesKcal: number;
  spo2Percent: number;
  batteryPercent: number;
}

export const MOCK_WATCH_DEVICES: readonly MockWatchDevice[] = [
  {
    id: 'apple-demo',
    name: 'Apple Watch Demo',
    provider: 'Apple Health (จำลอง)',
    shape: 'square',
    accent: '#FF5A76',
  },
  {
    id: 'garmin-demo',
    name: 'Garmin Runner Demo',
    provider: 'Garmin Connect (จำลอง)',
    shape: 'round',
    accent: '#35B7FF',
  },
  {
    id: 'prompt-band',
    name: 'Prompt Band Demo',
    provider: 'พร้อมวิ่ง Mock Device',
    shape: 'band',
    accent: '#3FA34D',
  },
] as const;

export function findMockWatchDevice(id: string | null): MockWatchDevice | null {
  return MOCK_WATCH_DEVICES.find((device) => device.id === id) ?? null;
}

function wave(tick: number, phase: number): number {
  return Math.sin(tick * 0.7 + phase) * 0.65 + Math.sin(tick * 0.19 + phase * 2) * 0.35;
}

function roundedInRange(center: number, amplitude: number, tick: number, phase: number): number {
  return Math.round(center + amplitude * wave(tick, phase));
}

/** ค่าจำลองมีช่วงตามกิจกรรมและเปลี่ยนอย่างต่อเนื่อง เพื่อสาธิต UI เท่านั้น ไม่ใช่ข้อมูลสุขภาพ */
export function simulateWatchMetrics(
  mode: MockActivityMode,
  tick: number,
  batteryStart = 87
): MockWatchMetrics {
  const profile = {
    rest: { heart: 72, heartAmp: 5, cadence: 0, stepRate: 0, caloriesRate: 0.02 },
    walk: { heart: 101, heartAmp: 9, cadence: 116, stepRate: 2, caloriesRate: 0.08 },
    run: { heart: 154, heartAmp: 13, cadence: 174, stepRate: 3, caloriesRate: 0.16 },
  }[mode];

  return {
    heartRateBpm: roundedInRange(profile.heart, profile.heartAmp, tick, 0.4),
    cadenceSpm:
      profile.cadence === 0 ? 0 : roundedInRange(profile.cadence, mode === 'run' ? 7 : 9, tick, 1.1),
    steps: Math.max(0, Math.floor(tick * profile.stepRate)),
    caloriesKcal: Math.max(0, Math.round(tick * profile.caloriesRate)),
    spo2Percent: Math.max(95, Math.min(99, roundedInRange(98, 1, tick, 2.2))),
    batteryPercent: Math.max(5, batteryStart - Math.floor(tick / 900)),
  };
}
