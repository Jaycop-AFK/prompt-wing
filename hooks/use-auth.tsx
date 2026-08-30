import type { AuthError } from '@supabase/supabase-js';
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

interface AuthContextValue {
  /** auth.uid() ของผู้ใช้ที่ล็อกอินอยู่ null คือยังไม่ได้ล็อกอิน ใช้ผูกกับข้อมูลของผู้ใช้ในทุกตาราง */
  userId: string | null;
  /** อีเมลของผู้ใช้ที่ล็อกอินอยู่ สำหรับแสดงผลเท่านั้น */
  email: string | null;
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
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
      setEmail(session?.user.email ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (emailInput: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: emailInput, password });
    return error;
  }, []);

  const signUp = useCallback(async (emailInput: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email: emailInput, password });
    return { error, needsEmailConfirmation: error === null && data.session === null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ userId, email, loading, signIn, signUp, signOut }),
    [userId, email, loading, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth ต้องอยู่ภายใน AuthProvider');
  return value;
}
