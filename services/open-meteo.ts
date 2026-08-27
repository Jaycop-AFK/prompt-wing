import type { EpochMillis, HourlyConditions } from '@/core/coach';
import type { Coordinates } from '@/services/geo';

/**
 * ตัวเชื่อม Open-Meteo
 *
 * ฟรีและไม่ต้องมี API key จึงใช้ได้ตั้งแต่วันแรกโดยไม่ต้องรออนุมัติอะไร
 * หน้าที่ของไฟล์นี้คือแปลงรูปแบบของ API ให้เป็นชนิดข้อมูลของโดเมนที่ขอบ
 * โมดูลตัวตัดสินใจต้องไม่เคยเห็นรูปแบบดิบของ API เลย
 */

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

/** รหัสสภาพอากาศ WMO ที่หมายถึงพายุฝนฟ้าคะนอง */
const THUNDERSTORM_CODES = new Set([95, 96, 99]);

/**
 * แปลงเวลาท้องถิ่นที่ Open-Meteo คืนมาเป็น epoch milliseconds
 *
 * Open-Meteo คืนเวลาแบบ "2026-08-27T05:00" ซึ่งไม่มี offset ต่อท้าย
 * ถ้าเอาไปให้ Date อ่านตรง ๆ ผลจะเพี้ยนไปเจ็ดชั่วโมงบนเครื่องที่ตั้งเขตเวลาอื่น
 * จึงต้องอ่านเป็น UTC แล้วหัก utc_offset_seconds ที่ API บอกมาออกเอง
 */
function toEpochMillis(localTime: string, utcOffsetSeconds: number): EpochMillis {
  return Date.parse(`${localTime}:00Z`) - utcOffsetSeconds * 1000;
}

interface ForecastResponse {
  utc_offset_seconds: number;
  hourly: {
    time: string[];
    apparent_temperature: (number | null)[];
    relative_humidity_2m: (number | null)[];
    temperature_2m: (number | null)[];
    uv_index: (number | null)[];
    weather_code: (number | null)[];
  };
  daily: { sunrise: string[]; sunset: string[] };
}

interface AirQualityResponse {
  utc_offset_seconds: number;
  hourly: { time: string[]; pm2_5: (number | null)[] };
}

export interface OpenMeteoConditions {
  /** ค่ารายชั่วโมงของวันนี้ pm25 มาจากแบบจำลอง ไม่ใช่สถานีตรวจวัดจริง */
  hours: HourlyConditions[];
  sunrise: EpochMillis;
  sunset: EpochMillis;
  /** อุณหภูมิจริงและความชื้นของชั่วโมงปัจจุบัน ใช้แสดงผลเท่านั้น */
  temperatureNow: number | null;
  humidityNow: number | null;
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Open-Meteo ตอบกลับด้วยสถานะ ${response.status}`);
  return (await response.json()) as T;
}

/**
 * ดึงสภาพอากาศและ PM2.5 แบบจำลองรายชั่วโมงของวันนี้
 *
 * ยิงสองปลายทางพร้อมกันเพราะอยู่คนละโฮสต์และไม่ขึ้นต่อกัน
 */
export async function fetchOpenMeteoConditions(
  { latitude, longitude }: Coordinates,
  signal?: AbortSignal
): Promise<OpenMeteoConditions> {
  const common = `latitude=${latitude}&longitude=${longitude}&timezone=auto&forecast_days=1`;

  const [forecast, air] = await Promise.all([
    getJson<ForecastResponse>(
      `${FORECAST_URL}?${common}&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,uv_index,weather_code&daily=sunrise,sunset`,
      signal
    ),
    getJson<AirQualityResponse>(`${AIR_QUALITY_URL}?${common}&hourly=pm2_5`, signal),
  ]);

  const offset = forecast.utc_offset_seconds;

  // จับคู่ PM2.5 กับชั่วโมงด้วยเวลา ไม่ใช่ด้วยตำแหน่งในอาร์เรย์
  // เพราะสองปลายทางไม่รับประกันว่าจะคืนจำนวนชั่วโมงเท่ากัน
  const pm25ByTime = new Map<string, number | null>();
  air.hourly.time.forEach((time, i) => pm25ByTime.set(time, air.hourly.pm2_5[i] ?? null));

  // ชั่วโมงที่ขาดอุณหภูมิหรือ UV ถูกตัดทิ้ง ไม่ใช่เติมศูนย์
  //
  // ศูนย์องศาต่ำกว่าทุกเกณฑ์ ถ้าเติมเข้าไปชั่วโมงนั้นจะกลายเป็นสีเขียว
  // แปลว่าแอปจะบอกว่าวิ่งได้ทั้งที่ไม่รู้ค่าจริง ซึ่งผิดทางที่อันตราย
  // การตัดทิ้งทำให้ชั่วโมงนั้นกลายเป็นช่องว่างที่ตัดช่วงเขียวขาดจากกันแทน
  const hours: HourlyConditions[] = forecast.hourly.time.flatMap((time, i) => {
    const apparentTemperature = forecast.hourly.apparent_temperature[i];
    const uvIndex = forecast.hourly.uv_index[i];
    if (typeof apparentTemperature !== 'number' || typeof uvIndex !== 'number') return [];

    return [
      {
        at: toEpochMillis(time, offset),
        apparentTemperature,
        pm25: pm25ByTime.get(time) ?? null,
        uvIndex,
        thunderstorm: THUNDERSTORM_CODES.has(forecast.hourly.weather_code[i] ?? -1),
      },
    ];
  });

  // หาตำแหน่งในอาร์เรย์ต้นฉบับ ไม่ใช่ในอาร์เรย์ที่กรองแล้ว
  // เพราะการกรองทำให้ตำแหน่งเลื่อน แล้วอุณหภูมิที่แสดงจะเป็นของคนละชั่วโมง
  const HOUR_MS = 60 * 60 * 1000;
  const now = Date.now();
  const rawNowIndex = forecast.hourly.time.findIndex((time) => {
    const at = toEpochMillis(time, offset);
    return now >= at && now < at + HOUR_MS;
  });

  return {
    hours,
    sunrise: toEpochMillis(forecast.daily.sunrise[0], offset),
    sunset: toEpochMillis(forecast.daily.sunset[0], offset),
    temperatureNow:
      rawNowIndex === -1 ? null : (forecast.hourly.temperature_2m[rawNowIndex] ?? null),
    humidityNow:
      rawNowIndex === -1 ? null : (forecast.hourly.relative_humidity_2m[rawNowIndex] ?? null),
  };
}
