import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  findMockWatchDevice,
  simulateWatchMetrics,
  type MockActivityMode,
  type MockWatchDeviceId,
} from '@/services/mock-watch';
import { loadConnectedMockWatch, saveConnectedMockWatch } from '@/storage/mock-watch-storage';

export function useMockWatch(activity: MockActivityMode = 'rest') {
  const [deviceId, setDeviceId] = useState<MockWatchDeviceId | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    loadConnectedMockWatch()
      .then((stored) => {
        if (active) setDeviceId(stored);
      })
      .catch(() => {
        // ถ้าข้อมูล local เสียหรือ storage ใช้ไม่ได้ ให้กลับเป็นยังไม่เชื่อมต่ออย่างปลอดภัย
        if (active) setDeviceId(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!deviceId) return;
    const timer = setInterval(() => setTick((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [deviceId]);

  // เริ่มตัวนับข้อมูลของกิจกรรมใหม่จากศูนย์ เช่น ตอนเปลี่ยนจากหน้ารอเป็นเริ่มวิ่งจริง
  // เพื่อไม่ให้ก้าว/แคลอรีช่วงที่ผู้ใช้ยังไม่ได้เริ่มไหลมารวมกับเซสชันวิ่ง
  useEffect(() => {
    setTick(0);
  }, [activity]);

  const connect = useCallback(async (nextId: MockWatchDeviceId) => {
    await saveConnectedMockWatch(nextId);
    setTick(0);
    setDeviceId(nextId);
  }, []);

  const disconnect = useCallback(async () => {
    await saveConnectedMockWatch(null);
    setDeviceId(null);
    setTick(0);
  }, []);

  return {
    loading,
    device: findMockWatchDevice(deviceId),
    metrics: useMemo(() => simulateWatchMetrics(activity, tick), [activity, tick]),
    connect,
    disconnect,
  };
}
