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

import { darkTheme, lightTheme, type AppTheme } from '@/constants/theme';

/**
 * โหมดธีมที่ผู้ใช้เลือก
 *
 * ตั้งใจไม่มีโหมด "ตามเครื่อง" เพราะยังไม่มีจอไหนให้ผู้ใช้เลือกมัน
 * ถ้าหน้าเพิ่มเติมในตั๋ว 18 ต้องการ ค่อยเพิ่มตอนนั้น
 */
export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'promptwing.themeMode';

interface ThemeContextValue {
  theme: AppTheme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  /** สลับสว่างกับมืด */
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // ค่าเริ่มต้นของแอปคือสว่าง ไม่ใช่ตามเครื่อง เพราะห้องนำเสนอเปิดไฟและจอมืดอ่านไม่ออก
  const [mode, setModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (cancelled) return;
        if (stored === 'light' || stored === 'dark') setModeState(stored);
      })
      .catch(() => {
        // อ่านค่าที่บันทึกไว้ไม่ได้ก็ใช้ค่าเริ่มต้นต่อไป ไม่ใช่เรื่องที่ต้องรบกวนผู้ใช้
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
      // บันทึกไม่ได้ก็ยังใช้ธีมใหม่ในรอบนี้ได้ แค่ไม่ถูกจำไว้
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: mode === 'dark' ? darkTheme : lightTheme,
      mode,
      setMode,
      toggle: () => setMode(mode === 'dark' ? 'light' : 'dark'),
    }),
    [mode, setMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useThemeContext() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme ต้องอยู่ภายใน ThemeProvider');
  return value;
}

/** ธีมที่ใช้อยู่ตอนนี้ */
export function useTheme(): AppTheme {
  return useThemeContext().theme;
}

/** โหมดที่ผู้ใช้เลือก พร้อมวิธีเปลี่ยน */
export function useThemeMode() {
  const { mode, setMode, toggle, theme } = useThemeContext();
  return { mode, setMode, toggle, isDark: theme.dark };
}
