import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface OAuthProvider {
  id: 'google' | 'apple' | 'facebook';
  label: string;
  icon: IoniconName;
}

/** ปุ่มผู้ให้บริการภายนอกตามแบบร่าง ยังไม่ได้ต่อ OAuth จริงสักตัว ดู ADR 0003 */
export const OAUTH_PROVIDERS: OAuthProvider[] = [
  { id: 'google', label: 'Google', icon: 'logo-google' },
  { id: 'apple', label: 'Apple', icon: 'logo-apple' },
  { id: 'facebook', label: 'Facebook', icon: 'logo-facebook' },
];

export const UNIT_OPTIONS: { key: 'km' | 'mi'; label: string }[] = [
  { key: 'km', label: 'กิโลเมตร' },
  { key: 'mi', label: 'ไมล์' },
];

/**
 * ตัวเลือกภาษา ภาษาอังกฤษแสดงไว้ตามแบบร่างแต่กดเลือกไม่ได้ เพราะ spec ตั้งใจให้เป็นภาษาไทยเท่านั้น
 * ในเวอร์ชันนี้ (เขียนผ่านโครงสร้างที่รองรับ i18n ในอนาคตได้ แต่ยังไม่มีคำแปลอังกฤษจริง)
 */
export const LANGUAGE_OPTIONS: { key: 'th' | 'en'; label: string; available: boolean }[] = [
  { key: 'th', label: 'ไทย', available: true },
  { key: 'en', label: 'English', available: false },
];

export const HELP_ITEMS: { question: string; answer: string }[] = [
  {
    question: 'ทำไมใบอนุญาตวิ่งวันนี้ไม่ขึ้น',
    answer: 'ต้องเปิดสิทธิ์เข้าถึงตำแหน่งให้แอปก่อน ระบบใช้ตำแหน่งเพื่อดึงอากาศและ PM2.5 ใกล้ตัวคุณ',
  },
  {
    question: 'ทำไม cadence หรือ FormScore ดูไม่แม่นยำ',
    answer: 'ค่านี้ประมาณจากเซนเซอร์ในมือถือที่พกติดตัวระหว่างวิ่ง ความแม่นยำขึ้นกับตำแหน่งที่พกเครื่อง',
  },
  {
    question: 'ทำไมชีพจรที่แสดงระหว่างวิ่งดูไม่สมจริง',
    answer: 'ค่านี้เป็นข้อมูลตัวอย่างเสมอ มือถือเปล่าวัดชีพจรจริงไม่ได้ ต้องใช้สายรัดหรือนาฬิกาแยกต่างหาก',
  },
];

export const ABOUT_TEXT =
  'พร้อมวิ่ง (Prompt Wing) เป็นแอปต้นแบบสำหรับนักวิ่งชาวไทย ช่วยตัดสินใจว่าวันนี้ควรวิ่งไหม ' +
  'แนะนำวอร์มอัพที่ปรับตามอากาศและฟอร์มครั้งก่อน และเตือนเรื่องแสงก่อนฟ้ามืด ข้อมูลทั้งหมดเก็บในเครื่อง ' +
  'ไม่มีเซิร์ฟเวอร์ ไม่มีการยืนยันตัวตนจริง เวอร์ชันต้นแบบสำหรับการนำเสนอ';
