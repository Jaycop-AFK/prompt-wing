import AsyncStorage from '@react-native-async-storage/async-storage';

const preferenceKey = (userId: string) => `promptwing.plan-reminders.enabled.${userId}`;

/**
 * ผู้ใช้คนนี้เปิดการเตือนซ้อมไว้บนเครื่องนี้หรือไม่
 *
 * เก็บแยกต่อเครื่องใน AsyncStorage ไม่ได้เก็บในบัญชี เพราะการแจ้งเตือนถูกตั้งเวลาไว้ในเครื่อง เปิดบนมือถือ
 * เครื่องหนึ่งไม่ได้แปลว่าอีกเครื่องได้รับสิทธิ์แจ้งเตือนแล้ว
 */
export async function loadPlanReminderPreference(userId: string): Promise<boolean> {
  return (await AsyncStorage.getItem(preferenceKey(userId))) === 'on';
}

export async function savePlanReminderPreference(userId: string, enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(preferenceKey(userId), enabled ? 'on' : 'off');
}
