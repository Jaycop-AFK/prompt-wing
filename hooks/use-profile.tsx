import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { RunnerProfile } from '@/core/coach';
import { useAuth } from '@/hooks/use-auth';
import { EMPTY_PROFILE, loadProfile, saveProfile } from '@/storage/profile-storage';

interface ProfileContextValue {
  profile: RunnerProfile;
  /** true จนกว่าจะอ่านค่าที่บันทึกไว้เสร็จ จอที่แสดงตัวเลขจากโปรไฟล์ต้องรอก่อน ไม่งั้นจะเห็นค่าว่าง
   * แวบหนึ่งแล้วกระโดดเป็นค่าจริง ซึ่งดูเหมือนแอปลืมข้อมูลที่ผู้ใช้กรอกไว้ */
  loading: boolean;
  /** แก้เฉพาะช่องที่ส่งมา ช่องอื่นคงเดิม บันทึกขึ้น Supabase ให้เองทันที */
  update: (patch: Partial<RunnerProfile>) => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

/**
 * โปรไฟล์ของผู้ใช้ที่ทุกจอใช้ร่วมกัน โหลด/บันทึกผ่าน Supabase (storage/profile-storage.ts)
 *
 * ต้องอยู่ภายใน AuthProvider เสมอ (ดู app/_layout.tsx) เพราะต้องรู้ userId เพื่อโหลดโปรไฟล์ใหม่ทุกครั้ง
 * ที่สถานะล็อกอินเปลี่ยน ไม่ใช่โหลดครั้งเดียวตอน mount เหมือนตอนยังเป็นระบบจำลอง เพราะ Provider นี้อยู่
 * เหนือ Stack.Protected ของหน้าเข้าสู่ระบบ ไม่ได้ unmount/remount ตามรอบล็อกอิน/ออกจากระบบเอง
 */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const { userId, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<RunnerProfile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);

  // นับเฉพาะการแก้ของผู้ใช้จริง ไม่นับค่าที่เพิ่งอ่านขึ้นมา เพื่อไม่ให้เขียนทับสิ่งที่อ่านมาด้วยค่าเดิม
  // ทันทีตอนเปิดแอป ต้องรีเซ็ตเป็น 0 ทุกครั้งที่ userId เปลี่ยน ไม่งั้นการแก้ไขของผู้ใช้คนก่อนจะไป
  // กันไม่ให้โหลดโปรไฟล์ของผู้ใช้คนถัดไปที่ล็อกอินเข้ามาใหม่ทำงานจริง
  const editCount = useRef(0);

  useEffect(() => {
    editCount.current = 0;

    // ยังไม่รู้สถานะล็อกอินจริงจาก Supabase รอไปก่อน ไม่ต้องพยายามโหลดด้วยข้อมูลที่อาจไม่ตรงผู้ใช้จริง
    if (authLoading) return;

    if (userId === null) {
      // ออกจากระบบแล้ว ล้างโปรไฟล์ทันทีไม่ต้องรอโหลด เพราะไม่มี auth.uid() ให้ RLS จับคู่อยู่แล้ว
      // (กันโปรไฟล์ของผู้ใช้คนก่อนค้างแสดงอยู่ชั่วขณะก่อนสลับไปหน้าเข้าสู่ระบบ)
      setProfile(EMPTY_PROFILE);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    loadProfile()
      .then((stored) => {
        if (cancelled) return;
        if (editCount.current === 0) setProfile(stored);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, authLoading]);

  // เขียนขึ้น Supabase หลังจากหน้าจออัปเดตแล้ว ไม่ใช่ระหว่างคำนวณ state ใหม่ เพราะฟังก์ชันที่ส่งให้
  // setState ต้องไม่มีผลข้างเคียง React เรียกซ้ำได้หลายครั้งใน StrictMode และในรอบเรนเดอร์ที่ถูกทิ้ง
  // ข้ามรอบแรกที่ยังโหลดไม่เสร็จเสมอ ไม่งั้นค่าว่างเริ่มต้นจะทับข้อมูลจริงที่ยังอ่านไม่ขึ้น
  useEffect(() => {
    if (loading || editCount.current === 0 || userId === null) return;
    saveProfile(profile).catch(() => {
      // บันทึกไม่ได้ก็ยังใช้ค่าใหม่ได้ในรอบนี้ แค่ไม่ถูกจำไว้รอบหน้า
    });
  }, [profile, loading, userId]);

  const update = useCallback((patch: Partial<RunnerProfile>) => {
    editCount.current += 1;
    setProfile((current) => ({ ...current, ...patch }));
  }, []);

  const value = useMemo<ProfileContextValue>(
    () => ({ profile, loading, update }),
    [profile, loading, update]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const value = useContext(ProfileContext);
  if (!value) throw new Error('useProfile ต้องอยู่ภายใน ProfileProvider');
  return value;
}
