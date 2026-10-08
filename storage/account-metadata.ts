import { supabase } from '@/services/supabase';

/**
 * เขียนข้อมูลเล็ก ๆ ของบัญชีลง user_metadata ของ Supabase Auth
 *
 * ใช้เก็บแพ็กเกจสมาชิกจำลองกับการตั้งค่าแผนซ้อม ซึ่งยังไม่มีตารางของตัวเองในฐานข้อมูล (ดู docs/adr/0006)
 * Supabase รวมคีย์ที่ส่งไปเข้ากับของเดิมระดับบนสุด คีย์อื่นจึงไม่หาย และคีย์ที่ส่งค่า null ไปจะถูกลบออก
 *
 * ไม่ต้องอัปเดต state ของแอปเอง supabase-js ยิง USER_UPDATED พร้อมผู้ใช้ที่อัปเดตแล้วให้
 * onAuthStateChange ก่อนฟังก์ชันนี้จะคืนค่า AuthProvider (hooks/use-auth.tsx) รับไปกระจายต่อทั้งแอปเอง
 */
export async function updateAccountMetadata(patch: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.auth.updateUser({ data: patch });
  if (error) throw error;
}
