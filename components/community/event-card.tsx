import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { communityImageSource } from '@/components/community/community-image';
import { formatEventDate, formatFeeThb } from '@/components/community/copy';
import { AppText } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { RaceEvent } from '@/services/community';

export function EventCard({
  event,
  onOpen,
  onJoin,
}: {
  event: RaceEvent;
  onOpen: () => void;
  onJoin: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`ดูรายละเอียด ${event.name}`}>
        <Image
          source={communityImageSource(event.imageId)}
          style={styles.image}
          contentFit="cover"
          transition={160}
          cachePolicy="memory-disk"
          accessibilityLabel={`ภาพกิจกรรม ${event.name}`}
        />
      </Pressable>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <View style={styles.badgeRow}>
              {event.isMine ? <Badge label="สร้างโดยคุณ" /> : null}
              {event.isMock ? <Badge label="ตัวอย่าง" /> : null}
            </View>
            <AppText variant="heading" weight="bold">{event.name}</AppText>
          </View>
          <Pressable onPress={onOpen} hitSlop={8} accessibilityLabel="ดูรายละเอียดอีเวนต์">
            <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
          </Pressable>
        </View>
        <Meta icon="calendar-outline" text={`${formatEventDate(event.dateAt)} · ${event.timeLabel ?? 'ตรวจสอบเวลา'}`} />
        <Meta icon="location-outline" text={event.venue ?? event.province} />
        {event.communityDescription ? (
          <AppText variant="small" tone="muted" numberOfLines={2}>{event.communityDescription}</AppText>
        ) : null}
        <View style={styles.bottomRow}>
          <View style={styles.factRow}>
            <AppText variant="small" weight="semibold">{event.distanceKm} กม.</AppText>
            <AppText variant="small" tone="muted">{formatFeeThb(event.feeThb)}</AppText>
            <AppText variant="small" tone="muted">{event.participantCount ?? 0} คน</AppText>
          </View>
          <Pressable
            onPress={onJoin}
            accessibilityRole="button"
            accessibilityState={{ selected: event.joined }}
            style={[
              styles.joinButton,
              { backgroundColor: event.joined ? colors.brandSoft : colors.brand },
            ]}>
            <AppText variant="small" weight="semibold" color={event.joined ? colors.brandStrong : colors.onBrand}>
              {event.joined ? 'เข้าร่วมแล้ว' : 'เข้าร่วม'}
            </AppText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function Badge({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: colors.mockBadge }]}>
      <AppText variant="caption" color={colors.mockBadgeText}>{label}</AppText>
    </View>
  );
}

function Meta({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={16} color={colors.brand} />
      <AppText variant="small" tone="muted" style={styles.metaText}>{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  image: { width: '100%', height: 172 },
  content: { padding: spacing.lg, gap: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleCopy: { flex: 1, gap: spacing.xs },
  badgeRow: { flexDirection: 'row', gap: spacing.xs },
  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaText: { flex: 1 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  factRow: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  joinButton: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
});
