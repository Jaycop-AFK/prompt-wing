import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

/**
 * เทสต์มีที่เดียวคือโมดูลตัวตัดสินใจใน core/ ซึ่งเป็น TypeScript ล้วน
 * ไม่มี import จาก react-native จึงไม่ต้องตั้ง transform ของ React Native
 */
export default defineConfig({
  resolve: {
    // ให้ตรงกับ paths ใน tsconfig เพื่อให้เทสต์อ้าง @/ ได้เหมือนโค้ดแอป
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  test: {
    include: ['core/**/*.test.ts', 'components/**/*.test.ts'],
    environment: 'node',
  },
});
