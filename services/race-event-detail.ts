import type { RaceEvent } from '@/services/community';

export interface RaceEventDetail extends RaceEvent {
  venueName: string;
  address: string;
  coordinates: { latitude: number; longitude: number };
  imageUrl: string;
  imageCredit: string;
  description: string;
  schedule: string[];
  included: string[];
}

type CuratedDetail = Omit<RaceEventDetail, keyof RaceEvent>;

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1200&q=80';

const DETAILS_BY_NAME: Record<string, CuratedDetail> = {
  'มินิมาราธอนเมืองปราจีน': {
    venueName: 'ลานพระบรมราชานุสาวรีย์ รัชกาลที่ 5',
    address: 'ตำบลหน้าเมือง อำเภอเมืองปราจีนบุรี จังหวัดปราจีนบุรี',
    coordinates: { latitude: 14.0522, longitude: 101.3686 },
    imageUrl: 'https://images.unsplash.com/photo-1530137073520-4ea6e2f10a48?auto=format&fit=crop&w=1200&q=80',
    imageCredit: 'ภาพประกอบจาก Unsplash',
    description: 'งานวิ่งระยะ 10 กิโลเมตรผ่านย่านเมืองปราจีนบุรี เหมาะสำหรับนักวิ่งทั่วไปและผู้ที่ต้องการทดลองลงงานระยะมินิมาราธอน',
    schedule: ['04:30 น. เปิดรับนักวิ่ง', '05:30 น. ปล่อยตัว', '08:00 น. สิ้นสุดกิจกรรม'],
    included: ['เสื้อที่ระลึก', 'หมายเลขวิ่ง', 'เหรียญสำหรับผู้เข้าเส้นชัย', 'จุดบริการน้ำ'],
  },
  'วิ่งการกุศลสวนหลวง': {
    venueName: 'สวนหลวง ร.9',
    address: 'ถนนเฉลิมพระเกียรติ ร.9 เขตประเวศ กรุงเทพมหานคร',
    coordinates: { latitude: 13.6871, longitude: 100.6636 },
    imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
    imageCredit: 'ภาพประกอบจาก Unsplash',
    description: 'กิจกรรมวิ่งระยะ 5 กิโลเมตรในพื้นที่สวน รายได้หลังหักค่าใช้จ่ายใช้สนับสนุนกิจกรรมสาธารณประโยชน์ตามรายละเอียดของผู้จัด',
    schedule: ['05:00 น. ลงทะเบียน', '06:00 น. ปล่อยตัว', '08:00 น. จบกิจกรรม'],
    included: ['เสื้อกิจกรรม', 'หมายเลขวิ่ง', 'เหรียญที่ระลึก', 'อาหารว่าง'],
  },
  'ฮาล์ฟมาราธอนริมโขง': {
    venueName: 'ลานพญาศรีสัตตนาคราช',
    address: 'ถนนสุนทรวิจิตร อำเภอเมืองนครพนม จังหวัดนครพนม',
    coordinates: { latitude: 17.3949, longitude: 104.7904 },
    imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80',
    imageCredit: 'ภาพประกอบจาก Unsplash',
    description: 'เส้นทางฮาล์ฟมาราธอนริมแม่น้ำโขง บรรยากาศเช้าตรู่และวิวฝั่งลาว เหมาะกับผู้ที่มีประสบการณ์วิ่งระยะไกล',
    schedule: ['03:30 น. เปิดพื้นที่', '04:30 น. ปล่อยตัว', '08:30 น. ปิดเส้นชัย'],
    included: ['เสื้อแข่งขัน', 'หมายเลขพร้อมชิปจับเวลา', 'เหรียญผู้เข้าเส้นชัย', 'จุดน้ำและปฐมพยาบาล'],
  },
  'เทรลดอยเชียงดาว': {
    venueName: 'บริเวณอำเภอเชียงดาว',
    address: 'อำเภอเชียงดาว จังหวัดเชียงใหม่',
    coordinates: { latitude: 19.3654, longitude: 98.9647 },
    imageUrl: 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1200&q=80',
    imageCredit: 'ภาพประกอบจาก Unsplash',
    description: 'เส้นทางวิ่งเทรลระยะ 15 กิโลเมตร มีพื้นผิวและความลาดชันหลากหลาย ผู้ร่วมกิจกรรมควรเตรียมรองเท้าและอุปกรณ์ให้เหมาะสม',
    schedule: ['04:00 น. ตรวจอุปกรณ์', '05:00 น. ปล่อยตัว', '11:00 น. ปิดเส้นชัย'],
    included: ['เสื้อแข่งขัน', 'หมายเลขวิ่ง', 'เหรียญผู้เข้าเส้นชัย', 'จุดน้ำและทีมปฐมพยาบาล'],
  },
  'ไนท์รันขอนแก่น': {
    venueName: 'บึงแก่นนคร',
    address: 'ถนนรอบบึงแก่นนคร อำเภอเมืองขอนแก่น จังหวัดขอนแก่น',
    coordinates: { latitude: 16.4206, longitude: 102.8377 },
    imageUrl: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=80',
    imageCredit: 'ภาพประกอบจาก Unsplash',
    description: 'กิจกรรมวิ่งกลางคืนระยะ 10 กิโลเมตรรอบบึงแก่นนคร เน้นบรรยากาศสนุกและการมองเห็นที่ปลอดภัยตลอดเส้นทาง',
    schedule: ['17:00 น. เปิดรับนักวิ่ง', '19:00 น. ปล่อยตัว', '22:00 น. จบกิจกรรม'],
    included: ['เสื้อสะท้อนแสง', 'หมายเลขวิ่ง', 'เหรียญที่ระลึก', 'จุดน้ำ'],
  },
  'มาราธอนหาดจอมเทียน': {
    venueName: 'ชายหาดจอมเทียน',
    address: 'ถนนจอมเทียนสายหนึ่ง เมืองพัทยา จังหวัดชลบุรี',
    coordinates: { latitude: 12.8852, longitude: 100.8742 },
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    imageCredit: 'ภาพประกอบจาก Unsplash',
    description: 'งานวิ่งมาราธอนริมชายหาดระยะ 42.2 กิโลเมตร สำหรับผู้ที่ผ่านการฝึกซ้อมระยะไกลมาแล้ว',
    schedule: ['02:30 น. เปิดพื้นที่', '03:30 น. ปล่อยตัว', '10:30 น. ปิดเส้นชัย'],
    included: ['เสื้อแข่งขัน', 'หมายเลขพร้อมชิปจับเวลา', 'เสื้อผู้พิชิตและเหรียญ', 'จุดน้ำและปฐมพยาบาล'],
  },
};

const PROVINCE_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  ปราจีนบุรี: { latitude: 14.05, longitude: 101.37 },
  กรุงเทพมหานคร: { latitude: 13.7563, longitude: 100.5018 },
  นครพนม: { latitude: 17.392, longitude: 104.7696 },
  เชียงใหม่: { latitude: 18.7883, longitude: 98.9853 },
  ขอนแก่น: { latitude: 16.4322, longitude: 102.8236 },
  ชลบุรี: { latitude: 13.3611, longitude: 100.9847 },
};

export function getRaceEventDetail(event: RaceEvent): RaceEventDetail {
  const curated = DETAILS_BY_NAME[event.name];
  if (curated) return { ...event, ...curated };

  return {
    ...event,
    venueName: event.venue ?? event.province,
    address: event.venue ? `${event.venue} จังหวัด${event.province}` : `จังหวัด${event.province}`,
    coordinates: PROVINCE_COORDINATES[event.province] ?? { latitude: 13.7563, longitude: 100.5018 },
    imageUrl: DEFAULT_IMAGE,
    imageCredit: 'ภาพประกอบจาก Unsplash',
    description: event.communityDescription ?? `กิจกรรมวิ่งระยะ ${event.distanceKm} กิโลเมตรในจังหวัด${event.province}`,
    schedule: [event.timeLabel ? `${event.timeLabel} นัดพบและเริ่มกิจกรรม` : 'โปรดตรวจสอบกำหนดการกับผู้จัดอีกครั้ง'],
    included: ['รายละเอียดของที่ระลึกและบริการจะแจ้งโดยผู้จัด'],
  };
}

export function googleMapsUrl(detail: RaceEventDetail): string {
  const { latitude, longitude } = detail.coordinates;
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}
