# อยู่ใน Expo Go ตลอดโปรเจกต์ ไม่ทำ development build

โปรเจกต์นี้เลือกไลบรารีทุกตัวจากเงื่อนไขเดียว คือ "ต้องรันใน Expo Go ของ SDK 54 ได้" และจะไม่ทำ development build หรือ EAS Build เลย

## เหตุผล

พร้อมวิ่ง เป็น prototype สำหรับนำเสนอในวิชา Design Thinking ภายใน 2 สัปดาห์ โดยมีคนเขียนโค้ดคนเดียว ปลายทางไม่ได้ลงสโตร์ การตั้ง Android Studio, EAS, keystore และ SHA-1 กินเวลา 1-2 วันและพังได้หลายจุด ซึ่งเป็นสัดส่วนเวลาที่ยอมไม่ได้

โชคดีที่ของสำคัญทั้งหมดอยู่ใน Expo Go อยู่แล้ว: `react-native-maps` (ไม่ต้องขอ Google Maps API key ตอนใช้ใน Expo Go), `@shopify/react-native-skia`, `expo-speech` (โค้ชเสียงไทย `th-TH`), `expo-location` ตอนเปิดแอปอยู่, `expo-sensors` และ `expo-sqlite`

## สิ่งที่เสียไปเพราะข้อจำกัดนี้

- **GPS หยุดเก็บเมื่อปิดหน้าจอ** — ต้องเปิดหน้าจอค้างไว้ตอนวิ่ง ไม่กระทบการเดโมบนเวที
- **เชื่อมนาฬิกาหรือแอปสุขภาพไม่ได้** — Health Connect และ HealthKit ต้อง development build ดังนั้นค่า Heart Rate ในหน้าวิ่งจะเป็นข้อมูลสมมติถาวร และต้องกำกับให้ผู้ใช้เห็นว่าเป็นข้อมูลตัวอย่าง
- **cadence จาก accelerometer ไม่แม่นที่จังหวะวิ่งทั่วไปบนแอนดรอยด์ 12 ขึ้นไป** — ระบบปฏิบัติการบังคับเพดานอัตราสุ่มตัวอย่างเซนเซอร์ไว้ที่ 200ms (5Hz) เสมอ ต่ำกว่าที่ต้องการเพื่อวัดจังหวะวิ่ง 160-190 ก้าว/นาทีให้แม่นตามทฤษฎี Nyquist สิทธิ์ `HIGH_SAMPLING_RATE_SENSORS` ที่ยกเพดานนี้ได้ต้องคอมไพล์ native manifest ใหม่ ซึ่ง Expo Go เป็นเชลล์สำเร็จรูปที่คอมไพล์ไว้ล่วงหน้าแล้ว ทำไม่ได้ในเงื่อนไขนี้ ดู services/step-detector.ts และตั๋ว 12
- **ใช้ Rive ไม่ได้** — ดู [ADR 0001](./0001-skia-procedural-character-instead-of-rive-or-lottie.md)
- **ใช้ `expo-maps` ไม่ได้** — ใช้ `react-native-maps` แทน

ถ้าวันหนึ่งโปรเจกต์จะลงสโตร์จริง ข้อจำกัดนี้ยกเลิกได้ด้วยการทำ development build แล้วค่อยเพิ่ม background location กับ health integration ทีหลัง
