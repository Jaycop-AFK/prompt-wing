import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { SORT_LABEL, SORT_ORDER } from '@/components/venues/copy';
import { VenueCard } from '@/components/venues/venue-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ComingSoon } from '@/components/ui/coming-soon';
import { MockBadge } from '@/components/ui/mock-badge';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useVenues } from '@/hooks/use-venues';
import { venueDisplayName } from '@/services/venue';

type ViewMode = 'list' | 'map';
/** กว้างพอเห็นที่วิ่งหลายแห่งในรัศมีค้นหารอบตัวพร้อมกัน ไม่ใช่ซูมเข้าแห่งเดียวแบบจอรายละเอียด */
const MAP_DELTA = 0.03;

/**
 * ใช้ scroll={false} ของ Screen เสมอไม่ว่าโหมดไหน แล้วจัดการเลื่อนเองเฉพาะโหมดรายการ เพราะโหมดแผนที่
 * ต้องการ MapView ที่กินพื้นที่เต็มแบบ flex:1 คงที่ ผสมสองโหมดที่มีวิธีจัดการพื้นที่ต่างกันไว้ในโครง
 * เดียวจะพังง่าย (ระยะขอบซ้อนกันสองชั้นหรือแผนที่ไม่กินพื้นที่ที่เหลือ) แยกให้ชัดง่ายกว่าเดา
 */
export default function VenuesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { status, venues, location, error, reload, sort, setSort, savedIds, toggleSaved } =
    useVenues();
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const openDetail = (venueId: string) => {
    const venue = venues.find((v) => v.id === venueId);
    if (venue) router.push({ pathname: '/venue-detail', params: { venue: JSON.stringify(venue) } });
  };

  if (status === 'loading') {
    return (
      <Screen title="ที่วิ่ง" scroll={false}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
          <AppText variant="small" tone="muted">
            กำลังหาที่วิ่งใกล้ตัว
          </AppText>
        </View>
      </Screen>
    );
  }

  if (status === 'error') {
    return (
      <Screen title="ที่วิ่ง">
        <Card>
          <AppText variant="heading" weight="semibold">
            หาที่วิ่งใกล้ตัวไม่สำเร็จ
          </AppText>
          <AppText variant="body" tone="muted">
            {error ?? 'ดึงข้อมูลไม่สำเร็จ'}
          </AppText>
          <Button label="ลองอีกครั้ง" onPress={reload} variant="secondary" />
        </Card>
      </Screen>
    );
  }

  const toolbar = (
    <View style={styles.toolbar}>
      <View style={styles.sortRow}>
        {SORT_ORDER.map((option) => {
          const active = option === sort;
          return (
            <Pressable
              key={option}
              onPress={() => setSort(option)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[
                styles.sortChip,
                {
                  backgroundColor: active ? colors.brandSoft : colors.surfaceAlt,
                  borderColor: active ? colors.brand : colors.border,
                },
              ]}>
              <AppText variant="small" weight="semibold" color={active ? colors.brandStrong : colors.text}>
                {SORT_LABEL[option]}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
        accessibilityRole="button"
        accessibilityLabel={viewMode === 'list' ? 'ดูเป็นแผนที่' : 'ดูเป็นรายการ'}
        style={[styles.viewToggle, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
        <Ionicons name={viewMode === 'list' ? 'map-outline' : 'list-outline'} size={20} color={colors.text} />
      </Pressable>
    </View>
  );

  const fallbackNotice = location?.isFallback ? (
    <AppText variant="caption" tone="faint">
      แสดงที่วิ่งรอบ มจพ. ปราจีนบุรี เพราะยังไม่ได้รับสิทธิ์เข้าถึงตำแหน่งของคุณ
    </AppText>
  ) : null;

  // ความนิยมไม่มีข้อมูลจริงรองรับเลย (OSM ไม่มีระบบรีวิว แอปนี้เองก็ไม่มี backend ให้เก็บ) ต้องกำกับ
  // ให้เห็นทุกครั้งที่เลือกเรียงแบบนี้ ไม่ใช่แค่เขียนไว้ในคอมเมนต์ของ services/venue.ts เฉย ๆ
  const popularityNotice =
    sort === 'popularity' ? <MockBadge label="ความนิยมเป็นข้อมูลจำลอง" /> : null;

  const emptyState = (
    <Card background={colors.surfaceAlt}>
      <AppText variant="body" tone="muted">
        ยังไม่พบที่วิ่งในระยะนี้ ลองขยับตำแหน่งหรือกลับมาดูใหม่อีกครั้ง
      </AppText>
    </Card>
  );

  return (
    <Screen title="ที่วิ่ง" scroll={false}>
      <View style={styles.body}>
        {toolbar}
        {fallbackNotice}
        {popularityNotice}

        <ComingSoon ticket="19">ปุ่มสร้างเส้นทางวงกลมตามระยะที่ขอ</ComingSoon>

        {venues.length === 0 ? (
          emptyState
        ) : viewMode === 'map' ? (
          <View style={styles.mapWrap}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: location?.coordinates.latitude ?? 0,
                longitude: location?.coordinates.longitude ?? 0,
                latitudeDelta: MAP_DELTA,
                longitudeDelta: MAP_DELTA,
              }}>
              {venues.map((venue) => (
                <Marker
                  key={venue.id}
                  coordinate={venue.coordinates}
                  title={venueDisplayName(venue)}
                  pinColor={savedIds.has(venue.id) ? colors.brand : undefined}
                  onPress={() => openDetail(venue.id)}
                />
              ))}
            </MapView>
          </View>
        ) : (
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}>
            {venues.map((venue) => (
              <VenueCard
                key={venue.id}
                venue={venue}
                userLocation={location?.coordinates ?? venue.coordinates}
                saved={savedIds.has(venue.id)}
                onPress={() => openDetail(venue.id)}
                onToggleSaved={() => toggleSaved(venue.id)}
              />
            ))}
          </ScrollView>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  // ไม่มี paddingBottom ที่นี่ เพราะโหมดรายการกับโหมดแผนที่ต้องการระยะขอบล่างคนละแบบ (ดูคอมเมนต์
  // ที่ listContent และ mapWrap) ใส่ไว้ตรงนี้อีกชั้นจะซ้อนกับที่ใส่ไว้เฉพาะโหมดจนขอบล่างหนาไม่เท่ากัน
  body: { flex: 1, paddingTop: spacing.lg, paddingHorizontal: spacing.lg, gap: spacing.md },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sortRow: { flex: 1, flexDirection: 'row', gap: spacing.sm },
  sortChip: {
    flex: 1,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
  },
  viewToggle: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { flex: 1 },
  // ระยะขอบล่างของการเลื่อนรายการ ใช้ค่าเดียวกับ Screen ทั่วทั้งแอป (components/ui/screen.tsx)
  listContent: { gap: spacing.md, paddingBottom: spacing.xxl },
  // แผนที่มีระยะขอบล่างของตัวเองแทน ไม่ใช้ paddingBottom ของ xxl แบบรายการ เพราะแผนที่กิน flex:1
  // เต็มพื้นที่อยู่แล้ว ระยะเยอะแบบรายการจะกินพื้นที่แผนที่ที่มองเห็นไปโดยไม่จำเป็น
  mapWrap: { flex: 1, marginBottom: spacing.lg, borderRadius: radius.lg, overflow: 'hidden' },
  map: { flex: 1 },
});
