import { indexOfHourAt, type EpochMillis, type HourlyConditions } from '@/core/coach';
import { fetchNearestPm25, type Air4ThaiReading } from '@/services/air4thai';
import type { Coordinates } from '@/services/geo';
import { fetchOpenMeteoConditions } from '@/services/open-meteo';

/**
 * ที่มาของค่า PM2.5 ที่แสดงอยู่
 *
 * ต้องบอกผู้ใช้เสมอว่าตัวเลขมาจากไหน ความซื่อสัตย์เรื่องแหล่งข้อมูล
 * สำคัญกว่าการทำให้จอดูสะอาด และเป็นสิ่งที่ทำให้ตัวเลขนี้เชื่อถือได้
 */
export type Pm25Source =
  | { kind: 'station'; reading: Air4ThaiReading }
  | { kind: 'model' }
  | { kind: 'none' };

export interface TodayConditions {
  hours: HourlyConditions[];
  sunrise: EpochMillis;
  sunset: EpochMillis;
  pm25Source: Pm25Source;
  /** ค่า PM2.5 ของชั่วโมงปัจจุบัน null เมื่อไม่มีข้อมูลจากที่ไหนเลย */
  pm25Now: number | null;
  temperatureNow: number | null;
  humidityNow: number | null;
}

/**
 * รวมข้อมูลของวันนี้จากทุกแหล่ง
 *
 * โครงคือ Open-Meteo ให้ค่ารายชั่วโมงทั้งวัน ซึ่งจำเป็นสำหรับหาช่วงเวลาที่ควรวิ่ง
 * ส่วน Air4Thai ให้ค่าที่วัดจริงได้แค่ตอนนี้ตอนเดียว จึงเอามาทับเฉพาะชั่วโมงปัจจุบัน
 *
 * ลำดับการถอยของ PM2.5 คือ สถานีจริงที่ใกล้ที่สุดซึ่งยังส่งค่า แล้วจึงเป็นแบบจำลอง
 * แล้วจึงยอมรับว่าไม่มีข้อมูล ห้ามเดาค่าเองในทุกกรณี
 */
export async function fetchTodayConditions(
  at: Coordinates,
  signal?: AbortSignal
): Promise<TodayConditions> {
  // Air4Thai ล่มต้องไม่ทำให้ทั้งหน้าพัง ค่าจากแบบจำลองยังใช้ต่อได้
  const [openMeteo, station] = await Promise.all([
    fetchOpenMeteoConditions(at, signal),
    fetchNearestPm25(at, signal).catch(() => null),
  ]);

  const nowIndex = indexOfHourAt(openMeteo.hours, Date.now());
  const modelPm25 = nowIndex === -1 ? null : openMeteo.hours[nowIndex].pm25;

  const hours =
    station !== null && nowIndex !== -1
      ? openMeteo.hours.map((hour, i) =>
          i === nowIndex ? { ...hour, pm25: station.pm25 } : hour
        )
      : openMeteo.hours;

  const pm25Now = station?.pm25 ?? modelPm25;

  let pm25Source: Pm25Source;
  if (station !== null) pm25Source = { kind: 'station', reading: station };
  else if (modelPm25 !== null) pm25Source = { kind: 'model' };
  else pm25Source = { kind: 'none' };

  return {
    hours,
    sunrise: openMeteo.sunrise,
    sunset: openMeteo.sunset,
    pm25Source,
    pm25Now,
    temperatureNow: openMeteo.temperatureNow,
    humidityNow: openMeteo.humidityNow,
  };
}
