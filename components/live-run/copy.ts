import type { PaceDriftLevel } from '@/core/coach';

/**
 * ประโยคที่โค้ชเสียงพูดเมื่อ pace หลุดช่วงที่แนะนำ คืน null ตอน onPace เพราะไม่มีอะไรต้องพูด
 *
 * ตั้งใจไม่พูดตัวเลข pace ในประโยค เพราะฟังตัวเลขจากเสียงพูดสั้น ๆ ระหว่างวิ่งเข้าใจยากกว่าดูตัวเลข
 * บนจอเอง ประโยคจึงบอกแค่ทิศทางที่ควรปรับ ให้ผู้ใช้กวาดตาดูตัวเลขจริงเองถ้าอยากรู้รายละเอียด
 */
export function paceDriftSpeech(level: PaceDriftLevel): string | null {
  switch (level) {
    case 'tooFast':
      return 'ช้าลงหน่อย คุณวิ่งเร็วกว่า pace ที่แนะนำ';
    case 'tooSlow':
      return 'เร่งขึ้นอีกนิด คุณวิ่งช้ากว่า pace ที่แนะนำ';
    case 'onPace':
      return null;
  }
}

/**
 * ประโยคที่โค้ชเสียงพูดตอนวิ่งครบแต่ละกิโลเมตร
 *
 * บอกจำนวนนาทีสะสมแบบปัดเป็นจำนวนเต็ม ไม่ใช้ formatDuration (ซึ่งให้รูปแบบ "ชั่วโมง:นาที:วินาที"
 * สำหรับอ่านด้วยตา) เพราะเสียงพูดอ่านตัวเลขคั่นด้วยเครื่องหมายทวิภาคทีละหลักจะฟังดูแปลกกว่าพูดเป็น
 * จำนวนนาทีตรง ๆ
 */
export function kmMilestoneSpeech(km: number, elapsedSeconds: number): string {
  const totalMinutes = Math.round(elapsedSeconds / 60);
  return `ครบ ${km} กิโลเมตร ใช้เวลา ${totalMinutes} นาที`;
}
