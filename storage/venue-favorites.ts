import { supabase } from '@/services/supabase';

/** รหัส Venue ที่บันทึกไว้ทั้งหมดของผู้ใช้ที่ล็อกอินอยู่ (RLS กรองให้เอง) คืนเซตว่างถ้าอ่านไม่ได้ */
export async function loadFavoriteVenueIds(): Promise<Set<string>> {
  const { data, error } = await supabase.from('venue_favorites').select('venue_id');
  if (error || !data) return new Set();
  return new Set(data.map((row) => row.venue_id));
}

/**
 * บันทึกรายการที่บันทึกไว้ทั้งชุดทับของเดิม (ลบทั้งหมดแล้วใส่ชุดใหม่) ตรงกับรูปแบบเดิมสมัยเก็บเป็น
 * เซตเดียวใน AsyncStorage ผู้เรียก (hooks/use-venues.ts) ยังคงคำนวณเซตใหม่ทั้งก้อนแล้วส่งมาที่นี่
 * เหมือนเดิม ไม่ต้องแก้ตรรกะฝั่งนั้นเลย
 */
export async function saveFavoriteVenueIds(ids: ReadonlySet<string>): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;

  const { error: deleteError } = await supabase
    .from('venue_favorites')
    .delete()
    .eq('user_id', session.user.id);
  if (deleteError) throw deleteError;

  if (ids.size === 0) return;

  const { error: insertError } = await supabase
    .from('venue_favorites')
    .insert([...ids].map((venueId) => ({ venue_id: venueId })));
  if (insertError) throw insertError;
}
