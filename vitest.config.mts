import { defineConfig } from 'vitest/config';

/**
 * เทสต์มีที่เดียวคือโมดูลตัวตัดสินใจใน core/ ซึ่งเป็น TypeScript ล้วน
 * ไม่มี import จาก react-native จึงไม่ต้องตั้ง transform ของ React Native
 */
export default defineConfig({
  test: {
    include: ['core/**/*.test.ts'],
    environment: 'node',
  },
});
