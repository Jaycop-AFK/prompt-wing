/**
 * ข้อมูลจำลองล้วนสำหรับตั๋ว 19 ปฏิทินงานวิ่งและหาเพื่อนวิ่ง ไม่มีตรรกะจริงอยู่เบื้องหลังตามที่ตั๋วกำหนด
 * ชื่องานเป็นชื่อที่ตั้งขึ้นเอง ไม่ใช่งานวิ่งจริงที่มีอยู่ ชื่อคนก็เช่นกัน ไม่ใช่บัญชีผู้ใช้จริง
 */

export interface RaceEvent {
  id: string;
  name: string;
  /** วันที่จัดงาน หน่วย epoch ms */
  dateAt: number;
  distanceKm: number;
  province: string;
  feeThb: number;
}

export interface RunBuddy {
  id: string;
  /** ชื่อเล่น + อักษรย่อนามสกุล ไม่ใช่ชื่อเต็ม เพื่อไม่ให้ดูเหมือนข้อมูลบัญชีจริงที่ระบุตัวได้ */
  name: string;
  paceSecPerKm: number;
  /** เวลาที่มักออกวิ่ง เป็นข้อความอิสระ ไม่ใช่ timestamp เพราะเป็นแค่ช่วงเวลาที่มักวิ่งประจำ */
  runTime: string;
  /** สถานะยืนยันตัวตนแบบจำลอง การยืนยันตัวตนจริงอยู่นอกขอบเขตของตั๋วนี้ */
  verified: boolean;
}

export const MOCK_RACE_EVENTS: RaceEvent[] = [
  {
    id: 'event-1',
    name: 'มินิมาราธอนเมืองปราจีน',
    dateAt: new Date(2026, 8, 27).getTime(),
    distanceKm: 10,
    province: 'ปราจีนบุรี',
    feeThb: 350,
  },
  {
    id: 'event-2',
    name: 'วิ่งการกุศลสวนหลวง',
    dateAt: new Date(2026, 9, 11).getTime(),
    distanceKm: 5,
    province: 'กรุงเทพมหานคร',
    feeThb: 250,
  },
  {
    id: 'event-3',
    name: 'ฮาล์ฟมาราธอนริมโขง',
    dateAt: new Date(2026, 9, 25).getTime(),
    distanceKm: 21.1,
    province: 'นครพนม',
    feeThb: 690,
  },
  {
    id: 'event-4',
    name: 'เทรลดอยเชียงดาว',
    dateAt: new Date(2026, 10, 8).getTime(),
    distanceKm: 15,
    province: 'เชียงใหม่',
    feeThb: 890,
  },
  {
    id: 'event-5',
    name: 'ไนท์รันขอนแก่น',
    dateAt: new Date(2026, 10, 21).getTime(),
    distanceKm: 10,
    province: 'ขอนแก่น',
    feeThb: 400,
  },
  {
    id: 'event-6',
    name: 'มาราธอนหาดจอมเทียน',
    dateAt: new Date(2026, 11, 13).getTime(),
    distanceKm: 42.2,
    province: 'ชลบุรี',
    feeThb: 1200,
  },
];

export const MOCK_RUN_BUDDIES: RunBuddy[] = [
  { id: 'buddy-1', name: 'แนน ก.', paceSecPerKm: 330, runTime: '06:00 น. ทุกวัน', verified: true },
  { id: 'buddy-2', name: 'ต้น ส.', paceSecPerKm: 390, runTime: '18:30 น. จ-ศ', verified: true },
  { id: 'buddy-3', name: 'มายด์ พ.', paceSecPerKm: 450, runTime: '05:30 น. ส-อา', verified: false },
  { id: 'buddy-4', name: 'โบว์ ว.', paceSecPerKm: 420, runTime: '19:00 น. ทุกวัน', verified: true },
  { id: 'buddy-5', name: 'เจมส์ ล.', paceSecPerKm: 480, runTime: '06:30 น. อา', verified: false },
];
