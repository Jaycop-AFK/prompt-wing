import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type CommunityTab = 'events' | 'buddies';

export function CommunityTabs({ value, onChange }: { value: CommunityTab; onChange: (tab: CommunityTab) => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceAlt }]} accessibilityRole="tablist">
      <Tab label="อีเวนต์วิ่ง" active={value === 'events'} onPress={() => onChange('events')} />
      <Tab label="หาเพื่อนวิ่ง" active={value === 'buddies'} onPress={() => onChange('buddies')} />
    </View>
  );
}

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.tab,
        active && { backgroundColor: colors.surface },
        pressed && styles.pressed,
      ]}>
      <AppText variant="small" weight="semibold" color={active ? colors.brandStrong : colors.textMuted}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', borderRadius: radius.md, padding: 4, gap: 4 },
  tab: { flex: 1, alignItems: 'center', borderRadius: radius.sm, paddingVertical: spacing.sm },
  pressed: { opacity: 0.72 },
});
