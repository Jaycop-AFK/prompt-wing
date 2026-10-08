import { describe, expect, it } from 'vitest';

import { getAuthErrorMessage, validateCredentials } from '@/services/auth-error';

describe('validateCredentials', () => {
  it('rejects malformed email before calling Supabase', () => {
    expect(validateCredentials('not-an-email', 'password123', 'login')).toBe(
      'กรุณากรอกอีเมลให้ถูกต้อง'
    );
  });

  it('requires the Supabase minimum password length for sign up', () => {
    expect(validateCredentials('runner@example.com', '12345', 'signup')).toBe(
      'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'
    );
  });
});

describe('getAuthErrorMessage', () => {
  it('explains the email rate limit and does not expose the raw server message', () => {
    const message = getAuthErrorMessage(
      { code: 'over_email_send_rate_limit', message: 'email rate limit exceeded' },
      'signup'
    );

    expect(message).toContain('ระบบส่งอีเมลยืนยันถึงขีดจำกัด');
    expect(message).not.toContain('email rate limit exceeded');
  });

  it('explains that an unconfirmed account cannot sign in yet', () => {
    expect(
      getAuthErrorMessage(
        { code: 'email_not_confirmed', message: 'Email not confirmed' },
        'login'
      )
    ).toContain('ยังไม่ได้ยืนยันอีเมล');
  });

  it('uses a safe Thai fallback for thrown network errors', () => {
    expect(getAuthErrorMessage(new TypeError('Failed to fetch'), 'login')).toContain(
      'เชื่อมต่อระบบสมาชิกไม่ได้'
    );
  });
});
