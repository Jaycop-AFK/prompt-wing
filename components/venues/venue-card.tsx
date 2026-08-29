import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatDistanceFromUser, formatLoopLength } from '@/components/venues/copy';
import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/text';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Coordinates } from '@/services/geo';
import { distanceFromUser, venueDisplayName, VENUE_KIND_LABEL, type Venue } from '@/services/venue';

const KIND_ICON: Record<Venue['kind'], keyof typeof Ionicons.glyphMap> = {
  park: 'leaf-outline',
  track: 'ellipse-outline',
  sportsCentre: 'basketball-outline',
  stadium: 'trophy-outline',
  field: 'football-outline',
  other: 'location-outline',
};

interface VenueCardProps {
  venue: Venue;
  userLocation: Coordinates;
  saved: boolean;
  onPress: () => void;
  onToggleSaved: () => void;
}

export function VenueCard({ venue, userLocation, saved, onPress, onToggleSaved }: VenueCardProps) {
  const { colors } = useTheme();

  return (
    <Card onPress={onPress} accessibilityLabel={`ดูรายละเอียด ${venueDisplayName(venue)}`}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: colors.surfaceAlt }]}>
          <Ionicons name={KIND_ICON[venue.kind]} size={20} color={colors.brand} />
        </View>

        <View style={styles.main}>
          <AppText variant="body" weight="semibold" numberOfLines={1}>
            {venueDisplayName(venue)}
          </AppText>
          {venue.name ? (
            <AppText variant="caption" tone="faint">
              {VENUE_KIND_LABEL[venue.kind]}
            </AppText>
          ) : null}
          <View style={styles.statsRow}>
            <AppText variant="caption" tone="muted">
              {formatDistanceFromUser(distanceFromUser(venue, userLocation))}
            </AppText>
            {venue.loopLengthKm !== null ? (
              <AppText variant="caption" tone="muted">
                {' · '}
                {formatLoopLength(venue.loopLengthKm)}
              </AppText>
            ) : null}
          </View>
        </View>

        <Pressable
          onPress={onToggleSaved}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={saved ? 'เอาออกจากที่บันทึกไว้' : 'บันทึกที่วิ่งนี้ไว้'}>
          <Ionicons
            name={saved ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={saved ? colors.brand : colors.textFaint}
          />
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: { flex: 1, gap: 2 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap' },
});
