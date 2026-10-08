export type AuthAction = 'login' | 'signup';

interface AuthErrorLike {
  code?: string;
  message?: string;
  status?: number;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCredentials(
  email: string,
  password: string,
  action: AuthAction
): string | null {
  if (!EMAIL_PATTERN.test(email.trim())) return 'กรุณากรอกอีเมลให้ถูกต้อง';
  if (!password) return 'กรุณากรอกรหัสผ่าน';
  if (action === 'signup' && password.length < 6) {
    return 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
  }
  return null;
}

function asAuthError(error: unknown): AuthErrorLike {
  if (!error || typeof error !== 'object') return {};
  return error as AuthErrorLike;
}

/** แปลเฉพาะสิ่งที่ผู้ใช้แก้หรือเข้าใจได้ และไม่เผยข้อความภายในของ backend ตรง ๆ */
export function getAuthErrorMessage(error: unknown, action: AuthAction): string {
  const authError = asAuthError(error);
  const code = authError.code?.toLowerCase();
  const message = authError.message?.toLowerCase() ?? '';

  if (code === 'over_email_send_rate_limit' || message.includes('email rate limit')) {
    return (
      'ระบบส่งอีเมลยืนยันถึงขีดจำกัดชั่วคราว จึงยังสร้างบัญชีไม่ได้ ' +
      'กรุณารอสักครู่แล้วลองใหม่ หรือให้ผู้ดูแลปิดการยืนยันอีเมลสำหรับช่วงทดสอบ'
    );
  }

  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
    return 'บัญชีนี้ยังไม่ได้ยืนยันอีเมล กรุณาเปิดลิงก์ยืนยันในอีเมลก่อนเข้าสู่ระบบ';
  }

  if (
    code === 'invalid_credentials' ||
    message.includes('invalid login credentials') ||
    message.includes('invalid credentials')
  ) {
    return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง หากเพิ่งสมัคร กรุณาตรวจสอบว่าได้รับและกดยืนยันอีเมลแล้ว';
  }

  if (code === 'user_already_exists' || message.includes('already registered')) {
    return 'อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเลือกเข้าสู่ระบบ';
  }

  if (code === 'weak_password' || message.includes('password should be')) {
    return 'รหัสผ่านยังไม่ปลอดภัย กรุณาใช้รหัสผ่านอย่างน้อย 6 ตัวอักษร';
  }

  if (authError.status === 429) {
    return 'มีการลองหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่';
  }

  return action === 'signup'
    ? 'สมัครสมาชิกไม่สำเร็จ กรุณาตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง'
    : 'เชื่อมต่อระบบสมาชิกไม่ได้ กรุณาตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง';
}
