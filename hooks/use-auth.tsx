import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'promptwing.username';

interface AuthContextValue {
  /** ชื่อผู้ใช้ที่เข้าสู่ระบบอยู่ null คือยังไม่ได้เข้าสู่ระบบ ไม่มีรหัสผ่านเก็บอยู่ที่ไหนเลย ดู ADR 0003 */
  username: string | null;
  /** true จนกว่าจะอ่านค่าที่บันทึกไว้เสร็จ ตัวนำทางที่ราก (app/_layout.tsx) ต้องรอค่านี้ก่อนตัดสินใจ
   * ว่าจะพาไปหน้าเข้าสู่ระบบหรือเข้าแอปเลย ไม่งั้นผู้ใช้ที่เคยเข้าสู่ระบบไว้แล้วจะเห็นหน้าเข้าสู่ระบบ
   * กระพริบขึ้นมาเดี๋ยวเดียวก่อนสลับเข้าแอป */
  loading: boolean;
  login: (username: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * สถานะเข้าสู่ระบบแบบจำลอง ไม่มีการยืนยันตัวตนจริง เก็บแค่ชื่อผู้ใช้ในเครื่อง (ดู ADR 0003)
 *
 * ปุ่มเข้าสู่ระบบ/สมัครสมาชิก และปุ่มออกจากระบบ ล้วนแค่เขียน/ลบชื่อผู้ใช้นี้ ไม่มีเซิร์ฟเวอร์ให้เรียก
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!cancelled) setUsername(stored);
      })
      .catch(() => {
        // อ่านค่าที่บันทึกไว้ไม่ได้ก็ถือว่ายังไม่ได้เข้าสู่ระบบ ผู้ใช้เข้าสู่ระบบใหม่ได้ตามปกติ
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback((next: string) => {
    setUsername(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
      // บันทึกไม่ได้ก็ยังเข้าแอปได้ในรอบนี้ แค่เปิดแอปใหม่ครั้งหน้าต้องเข้าสู่ระบบอีกครั้ง
    });
  }, []);

  const logout = useCallback(() => {
    setUsername(null);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {
      // ลบไม่สำเร็จก็ยังออกจากระบบได้ในรอบนี้ แค่ค่าเก่าอาจค้างอยู่ในเครื่อง
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ username, loading, login, logout }),
    [username, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth ต้องอยู่ภายใน AuthProvider');
  return value;
}
