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
  daily: { time: string[]; sunrise: string[]; sunset: string[] };
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
 * แปลงค่ารายชั่วโมงดิบของสองปลายทางเป็นชนิดข้อมูลของโดเมน ใช้ร่วมกันทั้งวันนี้และพยากรณ์หลายวัน
 * จะได้มีกติกาการตัดชั่วโมงที่ข้อมูลขาดชุดเดียว
 */
function parseHours(forecast: ForecastResponse, air: AirQualityResponse): HourlyConditions[] {
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
  return forecast.hourly.time.flatMap((time, i) => {
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
  const hours = parseHours(forecast, air);

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

/** Open-Meteo พยากรณ์ PM2.5 ได้ไม่เกินเจ็ดวัน ขอเกินกว่านี้ชั่วโมงท้าย ๆ จะไม่มีค่าฝุ่นเลย */
export const MAX_FORECAST_DAYS = 7;

export interface ForecastDay {
  /** เที่ยงคืนของวันนั้นตามเขตเวลาของสถานที่ */
  date: EpochMillis;
  /** ค่ารายชั่วโมงของวันนั้น pm25 มาจากแบบจำลองและอาจว่างในวันท้าย ๆ */
  hours: HourlyConditions[];
  sunrise: EpochMillis;
  sunset: EpochMillis;
}

/**
 * พยากรณ์รายชั่วโมงหลายวันข้างหน้า แยกเป็นรายวัน ใช้วางตารางซ้อมล่วงหน้า (ฟีเจอร์ของ Plus)
 *
 * ต่างจาก fetchOpenMeteoConditions ที่ดูแค่วันนี้และเอาค่าสถานีจริงมาทับชั่วโมงปัจจุบันได้ วันข้างหน้า
 * มีแต่ค่าจากแบบจำลอง หน้าจอที่ใช้ต้องบอกผู้ใช้ว่าเป็นพยากรณ์ ไม่ใช่ค่าที่วัดได้จริง
 */
export async function fetchOpenMeteoForecastDays(
  { latitude, longitude }: Coordinates,
  days: number,
  signal?: AbortSignal
): Promise<ForecastDay[]> {
  const dayCount = Math.min(Math.max(1, Math.round(days)), MAX_FORECAST_DAYS);
  const common = `latitude=${latitude}&longitude=${longitude}&timezone=auto&forecast_days=${dayCount}`;

  const [forecast, air] = await Promise.all([
    getJson<ForecastResponse>(
      `${FORECAST_URL}?${common}&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,uv_index,weather_code&daily=sunrise,sunset`,
      signal
    ),
    getJson<AirQualityResponse>(`${AIR_QUALITY_URL}?${common}&hourly=pm2_5`, signal),
  ]);

  const offset = forecast.utc_offset_seconds;
  const hours = parseHours(forecast, air);
  const DAY_MS = 24 * 60 * 60 * 1000;

  return forecast.daily.time.map((date, i) => {
    const start = toEpochMillis(`${date}T00:00`, offset);
    const nextDate = forecast.daily.time[i + 1];
    const end = nextDate ? toEpochMillis(`${nextDate}T00:00`, offset) : start + DAY_MS;

    return {
      date: start,
      hours: hours.filter((hour) => hour.at >= start && hour.at < end),
      sunrise: toEpochMillis(forecast.daily.sunrise[i], offset),
      sunset: toEpochMillis(forecast.daily.sunset[i], offset),
    };
  });
}
