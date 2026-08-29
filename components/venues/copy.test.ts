import { describe, expect, it } from 'vitest';

import { formatDistanceFromUser, formatLoopLength } from './copy';

describe('formatDistanceFromUser', () => {
  it('ใกล้กว่าหนึ่งกิโลเมตร แสดงเป็นเมตรจำนวนเต็ม', () => {
    expect(formatDistanceFromUser(0.8)).toBe('ห่างจากคุณ 800 ม.');
  });

  it('ไกลตั้งแต่หนึ่งกิโลเมตรขึ้นไป แสดงเป็นกิโลเมตรทศนิยมหนึ่งตำแหน่ง', () => {
    expect(formatDistanceFromUser(2.34)).toBe('ห่างจากคุณ 2.3 กม.');
  });

  it('ปัดเป็นเมตรแล้วพอดี 1000 ต้องข้ามไปแสดงเป็นกิโลเมตร ไม่ใช่ "1000 ม."', () => {
    // 0.9996 กม. ยังไม่ถึง 1 กม. เป๊ะ แต่ปัดเป็นเมตรแล้วได้ 1000 พอดี
    expect(formatDistanceFromUser(0.9996)).toBe('ห่างจากคุณ 1.0 กม.');
  });

  it('ระยะเป็นศูนย์ ยังแสดงหน่วยเมตรได้ตามปกติ ไม่พัง', () => {
    expect(formatDistanceFromUser(0)).toBe('ห่างจากคุณ 0 ม.');
  });
});

describe('formatLoopLength', () => {
  it('แสดงเป็นกิโลเมตรทศนิยมหนึ่งตำแหน่งเสมอ ไม่สลับหน่วยแบบ formatDistanceFromUser', () => {
    expect(formatLoopLength(1.8)).toBe('ลู่วิ่งยาว 1.8 กม.');
  });

  it('ลู่สั้นกว่าหนึ่งกิโลเมตรก็ยังแสดงเป็นกิโลเมตร ไม่สลับไปเป็นเมตรเหมือน distanceFromUser', () => {
    // สองความหมายนี้ต้องไม่ใช้ตัวจัดรูปแบบร่วมกัน (ดู CONTEXT.md) รวมถึงกฎการสลับหน่วยด้วย
    expect(formatLoopLength(0.4)).toBe('ลู่วิ่งยาว 0.4 กม.');
  });
});
