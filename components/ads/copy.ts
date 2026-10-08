import type { Ionicons } from '@expo/vector-icons';

/**
 * การ์ดโฆษณาตัวอย่างของพาร์ทเนอร์ ยังไม่มีร้านค้าจริงร่วมรายการ (ดู docs/business-model.md)
 *
 * ตั้งใจไม่ใส่ชื่อร้าน ยี่ห้อ หรือส่วนลดสมมติ เพราะจะดูเหมือนข้อเสนอจริงที่ผู้ใช้ไปขอรับได้ และอาจไปซ้ำ
 * กับชื่อร้านที่มีอยู่จริง การ์ดบอกแค่หมวดสินค้าที่พาร์ทเนอร์แต่ละประเภทจะมาลงโฆษณา
 */

export type PartnerAdPlacement = 'home' | 'community';

export interface PartnerAd {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  category: string;
  title: string;
  body: string;
}

export const SAMPLE_PARTNER_ADS: PartnerAd[] = [
  {
    id: 'shoes',
    icon: 'footsteps-outline',
    category: 'ร้านรองเท้าวิ่ง',
    title: 'ลองวัดรูปเท้าก่อนเลือกรองเท้าวิ่ง',
    body: 'ร้านพาร์ทเนอร์ใกล้คุณช่วยดูรูปเท้าและให้ลองวิ่งก่อนเลือกรุ่นที่เข้ากับระยะที่ซ้อม',
  },
  {
    id: 'shirts',
    icon: 'shirt-outline',
    category: 'เสื้อวิ่ง',
    title: 'เสื้อวิ่งผ้าระบายอากาศสำหรับอากาศร้อนชื้น',
    body: 'เลือกเนื้อผ้าที่แห้งไวและเบาตัว วิ่งช่วงเช้าหรือเย็นได้สบายขึ้น',
  },
  {
    id: 'belts',
    icon: 'wallet-outline',
    category: 'กระเป๋าคาดเอว',
    title: 'กระเป๋าคาดเอวใส่มือถือระหว่างวิ่ง',
    body: 'เก็บมือถือ กุญแจ และบัตรให้แนบตัว เปิดแอปดูเส้นทางได้โดยไม่ต้องถือไว้ในมือ',
  },
  {
    id: 'reflective',
    icon: 'flashlight-outline',
    category: 'อุปกรณ์สะท้อนแสง',
    title: 'อุปกรณ์สะท้อนแสงสำหรับวิ่งเช้ามืดและหัวค่ำ',
    body: 'ปลอกแขน เสื้อกั๊ก และไฟกะพริบ ช่วยให้คนขับรถมองเห็นคุณได้จากระยะไกลขึ้น',
  },
];

const PLACEMENT_OFFSET: Record<PartnerAdPlacement, number> = { home: 0, community: 2 };

/**
 * เลือกโฆษณาของวันนี้ หมุนวันละชิ้น และให้หน้าแรกกับชุมชนได้คนละชิ้นในวันเดียวกัน
 * ใช้วันที่ตามปฏิทินของเครื่อง จะได้ไม่เปลี่ยนชิ้นทุกครั้งที่จอวาดใหม่
 */
export function partnerAdFor(placement: PartnerAdPlacement, now: number): PartnerAd {
  const date = new Date(now);
  const dayNumber = Math.floor(
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / (24 * 60 * 60 * 1000)
  );
  const index = (dayNumber + PLACEMENT_OFFSET[placement]) % SAMPLE_PARTNER_ADS.length;
  return SAMPLE_PARTNER_ADS[index];
}
