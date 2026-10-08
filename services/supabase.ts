import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'ไม่พบ EXPO_PUBLIC_SUPABASE_URL หรือ EXPO_PUBLIC_SUPABASE_ANON_KEY — คัดลอก .env.example ' +
      'เป็น .env แล้วใส่ค่าจริงจาก Supabase > Settings > API ก่อนรันแอป'
  );
}

/**
 * ไคลเอนต์ Supabase ตัวเดียวที่ทั้งแอปใช้ร่วมกัน
 *
 * เก็บ session ผ่าน AsyncStorage เฉพาะ native ตามรูปแบบที่ Supabase แนะนำสำหรับ React Native/Expo
 * ส่วนเว็บปล่อยให้ supabase-js ใช้กลไกของเว็บเอง เพื่อไม่ให้ static rendering เรียก AsyncStorage
 * ใน Node ซึ่งไม่มี window ส่วน detectSessionInUrl ปิดไว้เพราะแอปนี้ไม่มี URL callback ให้ตรวจจับ
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
