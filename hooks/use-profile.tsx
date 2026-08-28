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
import { EMPTY_PROFILE, loadProfile, saveProfile } from '@/storage/profile-storage';

interface ProfileContextValue {
  profile: RunnerProfile;
  /** true จนกว่าจะอ่านค่าที่บันทึกไว้เสร็จ จอที่แสดงตัวเลขจากโปรไฟล์ต้องรอก่อน ไม่งั้นจะเห็นค่าว่าง
   * แวบหนึ่งแล้วกระโดดเป็นค่าจริง ซึ่งดูเหมือนแอปลืมข้อมูลที่ผู้ใช้กรอกไว้ */
  loading: boolean;
  /** แก้เฉพาะช่องที่ส่งมา ช่องอื่นคงเดิม บันทึกลงเครื่องให้เองทันที */
  update: (patch: Partial<RunnerProfile>) => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

/**
 * โปรไฟล์ของผู้ใช้ที่ทุกจอใช้ร่วมกัน
 *
 * ต้องเป็น context ไม่ใช่ hook ที่แต่ละจออ่านเองแยกกัน เพราะการเปลี่ยนเป้าหมายระยะยาวในหน้าโปรไฟล์
 * ต้องทำให้เป้าหมายรายวันบนหน้าแรกขยับทันทีต่อหน้าต่อตา ถ้าแต่ละจอถือสำเนาของตัวเอง หน้าแรกจะยัง
 * แสดงค่าเก่าจนกว่าจะโหลดใหม่ ซึ่งทำให้ปุ่มเลือกเป้าหมายดูเหมือนปุ่มตาย
 */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<RunnerProfile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);

  // นับเฉพาะการแก้ของผู้ใช้จริง ไม่นับค่าที่เพิ่งอ่านขึ้นมาจากเครื่อง เพื่อไม่ให้เขียนทับสิ่งที่อ่านมา
  // ด้วยค่าเดิมทันทีตอนเปิดแอป ซึ่งเปลืองโดยเปล่าประโยชน์
  const editCount = useRef(0);

  useEffect(() => {
    let cancelled = false;

    loadProfile()
      .then((stored) => {
        if (cancelled) return;
        // ถ้าผู้ใช้ทันแก้อะไรไปแล้วระหว่างรออ่าน ห้ามเอาค่าที่อ่านมาทับ ไม่งั้นสิ่งที่เพิ่งกดจะหายไป
        if (editCount.current === 0) setProfile(stored);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // เขียนลงเครื่องหลังจากหน้าจออัปเดตแล้ว ไม่ใช่ระหว่างคำนวณ state ใหม่ เพราะฟังก์ชันที่ส่งให้
  // setState ต้องไม่มีผลข้างเคียง React เรียกซ้ำได้หลายครั้งใน StrictMode และในรอบเรนเดอร์ที่ถูกทิ้ง
  // ข้ามรอบแรกที่ยังโหลดไม่เสร็จเสมอ ไม่งั้นค่าว่างเริ่มต้นจะทับข้อมูลจริงที่ยังอ่านไม่ขึ้น
  useEffect(() => {
    if (loading || editCount.current === 0) return;
    saveProfile(profile).catch(() => {
      // บันทึกไม่ได้ก็ยังใช้ค่าใหม่ได้ในรอบนี้ แค่ไม่ถูกจำไว้รอบหน้า
    });
  }, [profile, loading]);

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
