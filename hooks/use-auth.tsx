import type { AuthError } from '@supabase/supabase-js';
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

import { supabase } from '@/services/supabase';
import {
  DEMO_USER_ID,
  getDemoAuthConfig,
  matchesDemoCredentials,
} from '@/services/demo-auth';

const DEMO_SESSION_KEY = 'promptwing.demo-session';
const DEMO_CONFIG = getDemoAuthConfig();
const NO_METADATA: Readonly<Record<string, unknown>> = Object.freeze({});

function demoAuthError(message: string, code: string): AuthError {
  return { name: 'AuthApiError', message, status: 400, code } as AuthError;
}

interface AuthContextValue {
  /** auth.uid() ของผู้ใช้ที่ล็อกอินอยู่ null คือยังไม่ได้ล็อกอิน ใช้ผูกกับข้อมูลของผู้ใช้ในทุกตาราง */
  userId: string | null;
  /** อีเมลของผู้ใช้ที่ล็อกอินอยู่ สำหรับแสดงผลเท่านั้น */
  email: string | null;
  /**
   * user_metadata ของบัญชีที่ล็อกอินอยู่ อ็อบเจกต์ว่างเมื่อยังไม่ได้ล็อกอิน อ่านผ่าน hook เฉพาะเรื่อง
   * (hooks/use-subscription.ts, hooks/use-training-plan.ts) แทนการอ่านคีย์ตรง ๆ จากจอ
   */
  accountMetadata: Readonly<Record<string, unknown>>;
  /** true จนกว่าจะรู้สถานะเซสชันจริงจาก Supabase ตัวนำทางที่ราก (app/_layout.tsx) ต้องรอค่านี้ก่อน */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthError | null>;
  /** needsEmailConfirmation เป็น true เมื่อสมัครสำเร็จแต่ยังไม่มี session จริง เพราะโปรเจกต์ Supabase
   * เปิดให้ต้องยืนยันอีเมลก่อน (ค่าเริ่มต้นของ Supabase) ผู้เรียกต้องบอกผู้ใช้ให้ไปเช็คอีเมล ไม่ใช่
   * เข้าใจว่าสมัครเสร็จแล้วเข้าแอปได้ทันที */
  signUp: (
    email: string,
    password: string
  ) => Promise<{ error: AuthError | null; needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * สถานะเข้าสู่ระบบจริงผ่าน Supabase Auth (อีเมล+รหัสผ่าน) แทนที่ระบบจำลองเดิม
 *
 * ไม่เรียก supabase.auth.getSession() เองแยกต่างหาก เพราะ onAuthStateChange ยิง event
 * 'INITIAL_SESSION' ให้ทันทีตอน subscribe อยู่แล้วพร้อมสถานะเซสชันปัจจุบัน เรียกซ้ำสองทางจะมี
 * โอกาสแข่งกันเองโดยไม่จำเป็น ใช้แหล่งเดียวพอ
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const demoConfig = DEMO_CONFIG;
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [accountMetadata, setAccountMetadata] = useState<Readonly<Record<string, unknown>>>(NO_METADATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (demoConfig) {
      let cancelled = false;
      AsyncStorage.getItem(DEMO_SESSION_KEY)
        .then((storedEmail) => {
          if (cancelled || storedEmail !== demoConfig.email) return;
          setUserId(DEMO_USER_ID);
          setEmail(demoConfig.email);
        })
        .catch(() => {
          // ถ้าอ่าน session ทดสอบไม่ได้ ให้ผู้ใช้เข้าสู่ระบบใหม่ตามปกติ
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
      setEmail(session?.user.email ?? null);
      // USER_UPDATED หลัง updateAccountMetadata ก็มาทางนี้ แพ็กเกจที่เพิ่งสมัครจึงมีผลทุกจอทันที
      setAccountMetadata(session?.user.user_metadata ?? NO_METADATA);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [demoConfig]);

  const signIn = useCallback(async (emailInput: string, password: string) => {
    if (demoConfig) {
      if (!matchesDemoCredentials(demoConfig, emailInput, password)) {
        return demoAuthError('Invalid login credentials', 'invalid_credentials');
      }
      await AsyncStorage.setItem(DEMO_SESSION_KEY, demoConfig.email);
      setUserId(DEMO_USER_ID);
      setEmail(demoConfig.email);
      return null;
    }

    const { error } = await supabase.auth.signInWithPassword({ email: emailInput, password });
    return error;
  }, [demoConfig]);

  const signUp = useCallback(async (emailInput: string, password: string) => {
    if (demoConfig) {
      if (!matchesDemoCredentials(demoConfig, emailInput, password)) {
        return {
          error: demoAuthError(
            'Demo mode accepts only the configured test account',
            'invalid_credentials'
          ),
          needsEmailConfirmation: false,
        };
      }
      await AsyncStorage.setItem(DEMO_SESSION_KEY, demoConfig.email);
      setUserId(DEMO_USER_ID);
      setEmail(demoConfig.email);
      return { error: null, needsEmailConfirmation: false };
    }

    const { data, error } = await supabase.auth.signUp({ email: emailInput, password });
    return { error, needsEmailConfirmation: error === null && data.session === null };
  }, [demoConfig]);

  const signOut = useCallback(async () => {
    if (demoConfig) {
      await AsyncStorage.removeItem(DEMO_SESSION_KEY);
      setUserId(null);
      setEmail(null);
      return;
    }
    await supabase.auth.signOut();
  }, [demoConfig]);

  const value = useMemo<AuthContextValue>(
    () => ({ userId, email, accountMetadata, loading, signIn, signUp, signOut }),
    [userId, email, accountMetadata, loading, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth ต้องอยู่ภายใน AuthProvider');
  return value;
}
