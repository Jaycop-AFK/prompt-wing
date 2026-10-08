export const DEMO_USER_ID = '00000000-0000-4000-8000-000000000057';

export interface DemoAuthConfig {
  email: string;
  password: string;
}

/**
 * บัญชีทดสอบมีไว้ให้เปิดต้นแบบได้เมื่อ backend สำหรับพัฒนายังไม่พร้อมใช้งานเท่านั้น
 * ค่าอีเมลและรหัสผ่านมาจาก .env และถูกฝังใน bundle จึงห้ามใช้เป็นระบบยืนยันตัวตนจริง
 */
export function getDemoAuthConfig(): DemoAuthConfig | null {
  if (process.env.EXPO_PUBLIC_AUTH_MODE !== 'demo') return null;

  const email = process.env.EXPO_PUBLIC_DEMO_EMAIL?.trim().toLowerCase();
  const password = process.env.EXPO_PUBLIC_DEMO_PASSWORD;
  if (!email || !password) return null;

  return { email, password };
}

export function matchesDemoCredentials(
  config: DemoAuthConfig,
  email: string,
  password: string
): boolean {
  return email.trim().toLowerCase() === config.email && password === config.password;
}
