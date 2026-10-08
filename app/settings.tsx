import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';

import { ABOUT_TEXT, HELP_ITEMS, LANGUAGE_OPTIONS, UNIT_OPTIONS } from '@/components/auth/copy';
import { PLAN_NAME, priceLabel } from '@/components/plus/copy';
import { PlusBadge } from '@/components/plus/plus-badge';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useSubscription } from '@/hooks/use-subscription';
import { useTheme } from '@/hooks/use-theme';
import { PAID_PLANS } from '@/services/subscription';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { email, signOut } = useAuth();
  const { subscription, isPlus } = useSubscription();

  // ค่าในจอนี้ (แจ้งเตือน/หน่วย) ไม่ได้ผูก AsyncStorage เพราะยังไม่มีผลจริงต่อจอไหนเลยในเวอร์ชันนี้
  // เก็บแค่ในหน่วยความจำก็พอ ไม่งั้นจะดูเหมือนเป็นการตั้งค่าจริงที่ผู้ใช้ควรไว้ใจว่าจำไว้ข้ามเซสชัน
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [unit, setUnit] = useState<'km' | 'mi'>('km');
  const [helpExpanded, setHelpExpanded] = useState(false);
  const [aboutExpanded, setAboutExpanded] = useState(false);

  const handleLogout = () => {
    Alert.alert('ออกจากระบบ?', 'คุณจะต้องเข้าสู่ระบบใหม่อีกครั้งในครั้งถัดไป', [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ออกจากระบบ', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <Screen title="เพิ่มเติม" back>
      <Card onPress={() => router.push('/subscription')} accessibilityLabel="จัดการแพ็กเกจพร้อมวิ่ง Plus">
        <View style={styles.row}>
          <View style={styles.planCopy}>
            <AppText variant="heading" weight="semibold">พร้อมวิ่ง Plus</AppText>
            <AppText variant="small" tone="muted">
              แพ็กเกจปัจจุบัน {PLAN_NAME[subscription.plan]}
            </AppText>
            <AppText variant="caption" tone="muted">
              {isPlus
                ? 'แตะเพื่อเปลี่ยนรอบบิลหรือยกเลิก'
                : `พร้อมทุกก้าว ในแบบของคุณ · เริ่ม ${priceLabel(PAID_PLANS.plusMonthly)}`}
            </AppText>
          </View>
          <PlusBadge label={isPlus ? 'PLUS' : 'FREE'} muted={!isPlus} />
        </View>
      </Card>
      {email ? (
        <AppText variant="small" tone="muted">
          เข้าสู่ระบบเป็น {email}
        </AppText>
      ) : null}

      <Card>
        <View style={styles.row}>
          <AppText variant="body">การแจ้งเตือน</AppText>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: colors.border, true: colors.brand }}
            thumbColor={colors.surface}
          />
        </View>
        <AppText variant="caption" tone="faint">
          ยังไม่เชื่อมกับการแจ้งเตือนจริงของเครื่องในเวอร์ชันนี้
        </AppText>
      </Card>

      <Card>
        <AppText variant="body">หน่วยการวัด</AppText>
        <View style={styles.chipRow}>
          {UNIT_OPTIONS.map((option) => {
            const active = unit === option.key;
            return (
              <Pressable
                key={option.key}
                onPress={() => setUnit(option.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.brandSoft : colors.surfaceAlt,
                    borderColor: active ? colors.brand : colors.border,
                  },
                ]}>
                <AppText variant="small" weight="semibold" color={active ? colors.brandStrong : colors.text}>
                  {option.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <AppText variant="caption" tone="faint">
          ตอนนี้ทั้งแอปแสดงผลเป็นกิโลเมตรเท่านั้น การตั้งค่านี้ยังไม่มีผลกับหน้าจออื่น
        </AppText>
      </Card>

      <Card>
        <AppText variant="body">ภาษา</AppText>
        <View style={styles.chipRow}>
          {LANGUAGE_OPTIONS.map((option) => (
            <View
              key={option.key}
              style={[
                styles.chip,
                {
                  backgroundColor: option.available ? colors.brandSoft : colors.surfaceAlt,
                  borderColor: option.available ? colors.brand : colors.border,
                  opacity: option.available ? 1 : 0.5,
                },
              ]}>
              <AppText
                variant="small"
                weight="semibold"
                color={option.available ? colors.brandStrong : colors.textFaint}>
                {option.label}
                {option.available ? '' : ' (เร็ว ๆ นี้)'}
              </AppText>
            </View>
          ))}
        </View>
      </Card>

      <Card
        onPress={() => router.push('/mock-watch')}
        accessibilityLabel="เปิดการเชื่อมต่อนาฬิกาจำลอง">
        <View style={styles.row}>
          <View style={styles.linkLabel}>
            <Ionicons name="watch-outline" size={22} color={colors.brand} />
            <View>
              <AppText variant="body" weight="semibold">
                นาฬิกาและข้อมูลสุขภาพ
              </AppText>
              <AppText variant="caption" tone="muted">
                เชื่อมต่ออุปกรณ์จำลอง · ไม่มี Bluetooth จริง
              </AppText>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      </Card>

      <Card onPress={() => setHelpExpanded((current) => !current)}>
        <View style={styles.row}>
          <AppText variant="body" weight="semibold">
            ช่วยเหลือ
          </AppText>
          <Ionicons
            name={helpExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textMuted}
          />
        </View>
        {helpExpanded ? (
          <View style={styles.helpList}>
            {HELP_ITEMS.map((item) => (
              <View key={item.question} style={styles.helpItem}>
                <AppText variant="small" weight="semibold">
                  {item.question}
                </AppText>
                <AppText variant="small" tone="muted">
                  {item.answer}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}
      </Card>

      <Card onPress={() => setAboutExpanded((current) => !current)}>
        <View style={styles.row}>
          <AppText variant="body" weight="semibold">
            เกี่ยวกับเรา
          </AppText>
          <Ionicons
            name={aboutExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textMuted}
          />
        </View>
        {aboutExpanded ? (
          <AppText variant="small" tone="muted">
            {ABOUT_TEXT}
          </AppText>
        ) : null}
      </Card>

      <Card
        onPress={() => router.push('/sources')}
        accessibilityLabel="ดูเครดิตและแหล่งข้อมูล">
        <View style={styles.row}>
          <View style={styles.linkLabel}>
            <Ionicons name="library-outline" size={20} color={colors.brand} />
            <AppText variant="body" weight="semibold">
              เครดิตและแหล่งข้อมูล
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      </Card>

      <Pressable
        onPress={handleLogout}
        accessibilityRole="button"
        accessibilityLabel="ออกจากระบบ"
        style={[styles.logoutRow, { borderColor: colors.border }]}>
        <Ionicons name="log-out-outline" size={20} color={colors.clearRed} />
        <AppText variant="body" weight="semibold" color={colors.clearRed}>
          ออกจากระบบ
        </AppText>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planCopy: { flex: 1, gap: 2 },
  chipRow: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  helpList: { gap: spacing.md },
  helpItem: { gap: 2 },
  linkLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.sm,
  },
});
