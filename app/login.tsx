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
import { getAuthErrorMessage, validateCredentials } from '@/services/auth-error';

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
    const email = identifier.trim().toLowerCase();
    const validationError = validateCredentials(email, password, mode);
    if (validationError) {
      Alert.alert('ตรวจสอบข้อมูล', validationError);
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'signup') {
        const { error, needsEmailConfirmation } = await signUp(email, password);

        if (error) {
          Alert.alert('สมัครสมาชิกไม่สำเร็จ', getAuthErrorMessage(error, 'signup'));
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
        // ถ้าไม่ต้องยืนยันอีเมล session จะถูกสร้างทันที และ onAuthStateChange จะพาเข้าแอปเอง
        return;
      }

      const error = await signIn(email, password);
      if (error) {
        Alert.alert('เข้าสู่ระบบไม่สำเร็จ', getAuthErrorMessage(error, 'login'));
        return;
      }

      router.replace('/');
    } catch (error) {
      Alert.alert(
        mode === 'signup' ? 'สมัครสมาชิกไม่สำเร็จ' : 'เข้าสู่ระบบไม่สำเร็จ',
        getAuthErrorMessage(error, mode)
      );
    } finally {
      // สำคัญสำหรับ network error: ปุ่มต้องกลับมากดได้ ไม่ค้างที่ "กำลังดำเนินการ..."
      setSubmitting(false);
    }
  };

  const handleOAuth = (providerLabel: string) => {
    Alert.alert(
      'ยังไม่เชื่อมต่อจริง',
      `การ${mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}ด้วย ${providerLabel} เป็นภาพจำลองสำหรับสาธิตเท่านั้น ยังไม่ได้ต่อ OAuth จริง`
    );
  };

  return (
    <Screen>
      <View
        style={[
          styles.hero,
          { backgroundColor: mode === 'login' ? colors.brand : colors.brandSoft },
        ]}>
        <View
          style={[
            styles.heroIcon,
            { backgroundColor: mode === 'login' ? colors.brandStrong : colors.surface },
          ]}>
          <Ionicons
            name={mode === 'login' ? 'footsteps' : 'sparkles'}
            size={26}
            color={mode === 'login' ? colors.onBrand : colors.brand}
          />
        </View>
        <AppText
          variant="display"
          weight="bold"
          align="center"
          color={mode === 'login' ? colors.onBrand : colors.text}>
          {mode === 'login' ? 'ยินดีต้อนรับกลับ' : 'เริ่มก้าวแรกของคุณ'}
        </AppText>
        <AppText
          variant="body"
          align="center"
          color={mode === 'login' ? colors.onBrand : colors.textMuted}>
          {mode === 'login' ? 'พร้อมวิ่งรอพาคุณกลับไปซ้อมต่อ' : 'วางแผนการวิ่งที่เข้ากับชีวิตคุณ'}
        </AppText>

        <View style={styles.heroPoints}>
          {(mode === 'login'
            ? ['แผนซ้อมของคุณยังอยู่ครบ', 'ดูความก้าวหน้าได้ทันที']
            : ['แผนซ้อมเฉพาะคุณ', 'ติดตามทุกก้าวที่วิ่ง'])
            .map((point) => (
              <View key={point} style={styles.heroPoint}>
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={mode === 'login' ? colors.onBrand : colors.brand}
                />
                <AppText
                  variant="small"
                  color={mode === 'login' ? colors.onBrand : colors.text}
                  style={styles.heroPointText}>
                  {point}
                </AppText>
              </View>
            ))}
        </View>
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
  hero: {
    alignItems: 'center',
    borderRadius: radius.xl,
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  heroIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    justifyContent: 'center',
    marginBottom: spacing.xs,
    height: 52,
    width: 52,
  },
  heroPoints: { alignSelf: 'stretch', gap: spacing.xs, marginTop: spacing.md },
  heroPoint: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  heroPointText: { flex: 1 },
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
