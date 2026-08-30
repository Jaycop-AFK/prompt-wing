import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { OAUTH_PROVIDERS } from '@/components/auth/copy';
import { Button } from '@/components/ui/button';
import { MockBadge } from '@/components/ui/mock-badge';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';

type Mode = 'login' | 'signup';

const MODE_ORDER: Mode[] = ['login', 'signup'];
const MODE_LABEL: Record<Mode, string> = { login: 'เข้าสู่ระบบ', signup: 'สมัครสมาชิก' };

export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // เข้าสู่ระบบจริงผ่าน Supabase Auth แล้ว (ไม่ใช่ระบบจำลองอีกต่อไป) ทั้งอีเมลและรหัสผ่านต้องกรอก
  // จริงเพราะเป็นเซิร์ฟเวอร์จริงที่ตรวจสอบ
  const canSubmit = identifier.trim().length > 0 && password.length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);

    if (mode === 'signup') {
      const { error, needsEmailConfirmation } = await signUp(identifier.trim(), password);
      setSubmitting(false);

      if (error) {
        Alert.alert('สมัครสมาชิกไม่สำเร็จ', error.message);
        return;
      }
      if (needsEmailConfirmation) {
        // โปรเจกต์ Supabase เปิดให้ต้องยืนยันอีเมลก่อน (ค่าเริ่มต้น) ต้องบอกตรง ๆ ไม่งั้นผู้ใช้จะ
        // กดสมัครแล้วรู้สึกว่าไม่มีอะไรเกิดขึ้นเลย ทั้งที่จริงสมัครสำเร็จแล้วแค่รอยืนยัน
        Alert.alert(
          'สมัครสมาชิกสำเร็จ',
          'ตรวจอีเมลของคุณเพื่อยืนยันบัญชี แล้วกลับมาเข้าสู่ระบบอีกครั้ง'
        );
        setMode('login');
      }
      // ถ้าไม่ต้องยืนยันอีเมล (ปิดไว้ในโปรเจกต์ Supabase) session จะถูกสร้างทันที และ
      // onAuthStateChange ใน hooks/use-auth.tsx จะพาเข้าแอปเองผ่าน Stack.Protected โดยไม่ต้องทำอะไรต่อ
      return;
    }

    const error = await signIn(identifier.trim(), password);
    if (error) {
      setSubmitting(false);
      Alert.alert('เข้าสู่ระบบไม่สำเร็จ', error.message);
      return;
    }

    // ไม่ setSubmitting(false) ตรงนี้เพราะจอนี้กำลังจะถูกแทนที่จาก Stack.Protected ที่ตรวจจับว่า
    // userId เปลี่ยนแล้วอยู่ดี router.replace ยังเรียกไว้ตามรูปแบบที่ Expo Router แนะนำอย่างเป็นทางการ
    router.replace('/');
  };

  const handleOAuth = (providerLabel: string) => {
    Alert.alert(
      'ยังไม่เชื่อมต่อจริง',
      `การ${mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}ด้วย ${providerLabel} เป็นภาพจำลองสำหรับสาธิตเท่านั้น ยังไม่ได้ต่อ OAuth จริง`
    );
  };

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="display" weight="bold" align="center">
          พร้อมวิ่ง
        </AppText>
        <AppText variant="body" tone="muted" align="center">
          {mode === 'login' ? 'เข้าสู่ระบบเพื่อเริ่มวิ่ง' : 'สมัครสมาชิกเพื่อเริ่มวิ่ง'}
        </AppText>
      </View>

      <View style={[styles.modeSwitch, { backgroundColor: colors.surfaceAlt }]}>
        {MODE_ORDER.map((option) => {
          const active = mode === option;
          return (
            <Pressable
              key={option}
              onPress={() => setMode(option)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[styles.modeChip, active && { backgroundColor: colors.surface }]}>
              <AppText variant="small" weight="semibold" color={active ? colors.text : colors.textMuted}>
                {MODE_LABEL[option]}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.field}>
        <AppText variant="small" tone="muted">
          อีเมล
        </AppText>
        <TextInput
          value={identifier}
          onChangeText={setIdentifier}
          placeholder="you@example.com"
          placeholderTextColor={colors.textFaint}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          accessibilityLabel="อีเมล"
          style={[
            styles.input,
            { color: colors.text, backgroundColor: colors.surfaceAlt, borderColor: colors.border },
          ]}
        />
      </View>

      <View style={styles.field}>
        <AppText variant="small" tone="muted">
          รหัสผ่าน
        </AppText>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={colors.textFaint}
          secureTextEntry
          autoComplete="password"
          accessibilityLabel="รหัสผ่าน"
          style={[
            styles.input,
            { color: colors.text, backgroundColor: colors.surfaceAlt, borderColor: colors.border },
          ]}
        />
      </View>

      <Button
        label={submitting ? 'กำลังดำเนินการ...' : MODE_LABEL[mode]}
        onPress={handleSubmit}
        disabled={!canSubmit}
      />

      <View style={styles.dividerRow}>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        <AppText variant="caption" tone="faint">
          หรือ
        </AppText>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
      </View>

      <MockBadge label="ยังไม่เชื่อมต่อจริง" />

      <View style={styles.oauthList}>
        {OAUTH_PROVIDERS.map((provider) => (
          <Pressable
            key={provider.id}
            onPress={() => handleOAuth(provider.label)}
            accessibilityRole="button"
            accessibilityLabel={`${MODE_LABEL[mode]}ด้วย ${provider.label}`}
            style={[styles.oauthButton, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Ionicons name={provider.icon} size={20} color={colors.text} />
            <AppText variant="body" weight="semibold">
              {MODE_LABEL[mode]}ด้วย {provider.label}
            </AppText>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs, marginTop: spacing.xxl, marginBottom: spacing.md },
  modeSwitch: {
    flexDirection: 'row',
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: spacing.sm,
  },
  modeChip: {
    flex: 1,
    alignItems: 'center',
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
  },
  field: { gap: spacing.xs },
  input: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
  },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  oauthList: { gap: spacing.sm },
  oauthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
