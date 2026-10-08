import { formatDistance, formatPace } from '@/components/format';
import type { Insight } from '@/services/progress-report';

/** น้ำเสียงของข้อสังเกต ใช้เลือกไอคอนและสี ไม่ได้บอกว่าผู้ใช้ทำถูกหรือผิด */
export type InsightTone = 'positive' | 'caution' | 'tip';

export interface InsightCopy {
  tone: InsightTone;
  title: string;
  detail: string;
}

/**
 * ถ้อยคำของข้อสังเกตในรายงานพัฒนาการ
 *
 * เป็นคำแนะนำการวิ่งทั่วไปเท่านั้น ห้ามเขียนว่าป้องกันหรือวินิจฉัยการบาดเจ็บ (ดู docs/business-model.md)
 * และต้องบอกเสมอว่าเทียบกับช่วงไหน ไม่งั้นตัวเลขเปอร์เซ็นต์จะลอยโดยไม่มีฐานให้เข้าใจ
 */
export function insightCopy(insight: Insight): InsightCopy {
  switch (insight.kind) {
    case 'comeback':
      return {
        tone: 'caution',
        title: `ห่างจากการวิ่งมา ${insight.daysSinceLastRun} วัน`,
        detail: 'กลับมาเริ่มด้วยวิ่งเบาสั้น ๆ 15–20 นาทีก่อน แล้วค่อยเพิ่มระยะในสัปดาห์ถัดไป',
      };
    case 'loadJump':
      return {
        tone: 'caution',
        title: `ระยะ 7 วันล่าสุดเพิ่มขึ้น ${insight.percent}%`,
        detail:
          'เพิ่มเร็วกว่า 7 วันก่อนหน้ามาก ลองสลับวันวิ่งเบาหรือวันพัก และเพิ่มระยะทีละน้อย ถ้ามีอาการเจ็บให้หยุดพักก่อน',
      };
    case 'paceFaster':
      return {
        tone: 'positive',
        title: `pace เฉลี่ยเร็วขึ้น ${insight.secPerKm} วินาที/กม.`,
        detail: 'เทียบ 4 สัปดาห์ล่าสุดกับ 4 สัปดาห์ก่อนหน้า ยังคงวันวิ่งเบาไว้ด้วย ร่างกายจะได้ฟื้นตัวทัน',
      };
    case 'paceSlower':
      return {
        tone: 'tip',
        title: `pace เฉลี่ยช้าลง ${insight.secPerKm} วินาที/กม.`,
        detail:
          'เทียบกับ 4 สัปดาห์ก่อนหน้า อาจมาจากอากาศร้อน เส้นทาง หรือความล้า ไม่จำเป็นต้องเร่ง ลองวิ่งในช่วงที่ใบอนุญาตวิ่งเป็นสีเขียว',
      };
    case 'distanceUp':
      return {
        tone: 'positive',
        title: `ระยะรวม 4 สัปดาห์เพิ่มขึ้น ${insight.percent}%`,
        detail: 'สม่ำเสมอขึ้นจากช่วงก่อนหน้า ถ้าจะเพิ่มต่อ ให้ค่อย ๆ เพิ่มทีละสัปดาห์',
      };
    case 'distanceDown':
      return {
        tone: 'tip',
        title: `ระยะรวม 4 สัปดาห์ลดลง ${insight.percent}%`,
        detail: 'ถ้าตั้งใจพักก็ไม่เป็นไร ถ้าไม่ได้ตั้งใจ ลองกำหนดวันซ้อมประจำในแผนซ้อมแล้วเปิดการเตือนไว้',
      };
    case 'longestRun':
      return {
        tone: 'positive',
        title: `วิ่งไกลสุด ${formatDistance(insight.km)} ใน 4 สัปดาห์`,
        detail: 'ไกลกว่าครั้งไกลที่สุดของช่วงก่อนหน้า วันถัดไปให้เป็นวันเบาหรือวันพัก',
      };
    case 'cadenceFade':
      return {
        tone: 'tip',
        title: `cadence ตกช่วงท้าย ${insight.count} จาก ${insight.rated} ครั้ง`,
        detail: 'ลองออกตัวช้าลงเล็กน้อย หรือแบ่งเป็นช่วงวิ่งสลับเดิน ให้จังหวะก้าวคงที่ไปจนจบ',
      };
    case 'paceFade':
      return {
        tone: 'tip',
        title: `pace ตกช่วงท้าย ${insight.count} จาก ${insight.rated} ครั้ง`,
        detail: 'ลองออกตัวช้ากว่าที่คิดเล็กน้อย แล้วค่อยเร่งในช่วงท้ายถ้ายังไหว',
      };
    case 'consistencyGood':
      return {
        tone: 'positive',
        title: `วิ่ง ${insight.activeDays} วันใน 4 สัปดาห์`,
        detail: 'สม่ำเสมอราวสามวันต่อสัปดาห์ขึ้นไป เป็นฐานที่ดีสำหรับขยับระยะ',
      };
    case 'consistencyLow':
      return {
        tone: 'tip',
        title: `วิ่ง ${insight.activeDays} วันใน 4 สัปดาห์`,
        detail: 'ลองตั้งวันซ้อมประจำ 3 วันต่อสัปดาห์ในแผนซ้อม การวิ่งบ่อยแต่สั้นช่วยได้มากกว่าวิ่งยาวนาน ๆ ครั้ง',
      };
    case 'firstSteps':
      return {
        tone: 'tip',
        title: 'ข้อมูลยังน้อย',
        detail: `วิ่งอีก ${insight.runsNeeded} ครั้ง รายงานจะเทียบแนวโน้มได้ชัดขึ้น`,
      };
  }
}

/** pace หรือขีดเมื่อไม่มีค่า */
export function paceOrDash(secPerKm: number | null): string {
  return secPerKm === null ? '—' : `${formatPace(secPerKm)} /กม.`;
}
