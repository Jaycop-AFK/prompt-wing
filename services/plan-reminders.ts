import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import type { PlanGoal } from '@/core/coach';
import { reminderSlots } from '@/services/reminder-slots';

/**
 * การเตือนก่อนเวลาซ้อมตามแผน (ฟีเจอร์ของพร้อมวิ่ง Plus) เป็นการแจ้งเตือนในเครื่อง ไม่ใช่ push จากเซิร์ฟเวอร์
 *
 * การแจ้งเตือนในเครื่องใช้ใน Expo Go ได้ทั้ง iOS และ Android (push จากเซิร์ฟเวอร์ต่างหากที่ใช้ไม่ได้บน
 * Android) แต่เว็บไม่รองรับการตั้งเวลาเลย จึงคืน 'unsupported' แทนการเรียกโมดูล
 *
 * โหลด expo-notifications เฉพาะตอนที่ต้องใช้จริง เพราะแค่ import ใน Expo Go ก็ขึ้นคำเตือนสีเหลืองว่า
 * รองรับไม่ครบแล้ว ผู้ใช้ที่ไม่เคยเปิดการเตือนไม่ควรเห็นคำเตือนนั้นทุกครั้งที่เปิดแอป
 */

export const planRemindersSupported = Platform.OS === 'ios' || Platform.OS === 'android';

/** เตือนก่อนเวลาซ้อมที่ตั้งไว้กี่นาที */
export const REMINDER_LEAD_MINUTES = 30;

const REMINDER_KIND = 'training-plan-reminder';
const ANDROID_CHANNEL_ID = 'training-plan';
/** มีการเตือนที่แอปตั้งไว้ค้างอยู่ในเครื่องนี้ ใช้ตัดสินว่าต้องโหลดโมดูลมายกเลิกหรือไม่ */
const SCHEDULED_FLAG_KEY = 'promptwing.plan-reminders.scheduled';

type NotificationsModule = typeof import('expo-notifications');

let notificationsModule: Promise<NotificationsModule> | null = null;

function loadNotifications(): Promise<NotificationsModule> {
  if (notificationsModule === null) {
    notificationsModule = import('expo-notifications').then((Notifications) => {
      // ไม่ตั้งตัวจัดการไว้ การแจ้งเตือนที่มาถึงตอนเปิดแอปอยู่จะไม่แสดงเลย
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
      return Notifications;
    });
  }
  return notificationsModule;
}

/**
 * ต่อคิวงานตั้งเวลาและยกเลิกให้ทำทีละงาน
 *
 * การตั้งเตือนคือยกเลิกของเดิมทั้งหมดแล้วตั้งใหม่ ถ้าสองงานสลับกันทำ (เช่นผู้ใช้กดเปิดการเตือนพร้อมกับที่
 * แผนเพิ่งถูกแก้) จะได้การเตือนซ้ำสองชุด
 */
let queue: Promise<unknown> = Promise.resolve();
function serialized<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

async function cancelAllPlanReminders(Notifications: NotificationsModule): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((request) => request.content.data?.kind === REMINDER_KIND)
      .map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier))
  );
  await AsyncStorage.removeItem(SCHEDULED_FLAG_KEY);
}

export interface ReminderSchedule {
  goal: PlanGoal;
  runDays: readonly number[];
  minuteOfDay: number;
}

export type ReminderResult = 'scheduled' | 'denied' | 'unsupported';

const GOAL_LABEL: Record<PlanGoal, string> = { '5k': '5K', '10k': '10K' };

/**
 * ตั้งเตือนรายสัปดาห์ของทุกวันซ้อมใหม่ทั้งชุด
 *
 * askPermission เป็น false ตอนซิงก์อัตโนมัติเมื่อเปิดแอป จะได้ไม่มีหน้าขอสิทธิ์เด้งขึ้นมาเองโดยที่ผู้ใช้
 * ไม่ได้กดอะไร ขอสิทธิ์เฉพาะตอนผู้ใช้กดเปิดการเตือนเองเท่านั้น
 */
export function schedulePlanReminders(
  schedule: ReminderSchedule,
  { askPermission }: { askPermission: boolean }
): Promise<ReminderResult> {
  if (!planRemindersSupported) return Promise.resolve('unsupported');

  return serialized(async () => {
    const Notifications = await loadNotifications();

    if (Platform.OS === 'android') {
      // Android 13 ขึ้นไปไม่ขึ้นหน้าขอสิทธิ์จนกว่าจะมีช่องแจ้งเตือนอย่างน้อยหนึ่งช่อง
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'เตือนเวลาซ้อม',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    let permission = await Notifications.getPermissionsAsync();
    if (!permission.granted && askPermission && permission.canAskAgain) {
      permission = await Notifications.requestPermissionsAsync();
    }
    if (!permission.granted) return 'denied';

    await cancelAllPlanReminders(Notifications);
    for (const slot of reminderSlots(schedule.runDays, schedule.minuteOfDay, REMINDER_LEAD_MINUTES)) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `อีก ${REMINDER_LEAD_MINUTES} นาทีถึงเวลาซ้อมแผน ${GOAL_LABEL[schedule.goal]}`,
          body: 'เปิดพร้อมวิ่งดูการซ้อมวันนี้และช่วงอากาศที่เหมาะก่อนออกไปวิ่ง',
          data: { kind: REMINDER_KIND },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          channelId: ANDROID_CHANNEL_ID,
          weekday: slot.weekday,
          hour: slot.hour,
          minute: slot.minute,
        },
      });
    }
    await AsyncStorage.setItem(SCHEDULED_FLAG_KEY, '1');
    return 'scheduled';
  });
}

/** ยกเลิกการเตือนซ้อมทั้งหมดในเครื่องนี้ ไม่โหลดโมดูลการแจ้งเตือนถ้าไม่เคยตั้งไว้ */
export function cancelPlanReminders(): Promise<void> {
  if (!planRemindersSupported) return Promise.resolve();

  return serialized(async () => {
    if ((await AsyncStorage.getItem(SCHEDULED_FLAG_KEY)) === null) return;
    await cancelAllPlanReminders(await loadNotifications());
  });
}
