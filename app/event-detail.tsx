import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { Alert, Linking, Share, StyleSheet, View } from 'react-native';

import MapView, { Marker } from '@/components/map-view';
import { communityImageSource } from '@/components/community/community-image';
import { formatEventDate, formatFeeThb } from '@/components/community/copy';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';
import type { RaceEvent } from '@/services/community';
import { getRaceEventDetail, googleMapsUrl } from '@/services/race-event-detail';

const MAP_DELTA = 0.018;

export default function EventDetailScreen() {
  const params = useLocalSearchParams<{ event?: string }>();

  let event: RaceEvent | null = null;
  try {
    event = params.event ? JSON.parse(params.event) : null;
  } catch {
    event = null;
  }

  if (!event) {
    return (
      <Screen title="รายละเอียดงานวิ่ง" back>
        <Card>
          <AppText variant="body" tone="muted">ไม่พบข้อมูลงานวิ่งนี้</AppText>
        </Card>
      </Screen>
    );
  }

  const detail = getRaceEventDetail(event);

  const openGoogleMaps = () => {
    Linking.openURL(googleMapsUrl(detail)).catch(() => {
      Alert.alert('เปิด Google Maps ไม่สำเร็จ', 'กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง');
    });
  };

  const shareEvent = () => {
    Share.share({
      title: detail.name,
      message: `${detail.name}\n${formatEventDate(detail.dateAt)} · ${detail.distanceKm} กม.\n${detail.venueName}\n${googleMapsUrl(detail)}`,
    }).catch(() => Alert.alert('แชร์ไม่สำเร็จ', 'ลองใหม่อีกครั้ง'));
  };

  return (
    <Screen title="รายละเอียดงานวิ่ง" back>
      <View style={styles.heroWrap}>
        <Image
          source={event.imageId ? communityImageSource(event.imageId) : { uri: detail.imageUrl }}
          contentFit="cover"
          transition={200}
          style={styles.hero}
          accessibilityLabel={`ภาพประกอบสถานที่จัดงาน ${detail.name}`}
        />
      </View>
      <AppText variant="caption" tone="faint">
        {event.imageId ? 'ภาพ Mock สร้างสำหรับต้นแบบ Prompt Wing' : detail.imageCredit}
      </AppText>

      <Card>
        <AppText variant="title" weight="bold">{detail.name}</AppText>
        <View style={styles.factRow}>
          <Fact icon="calendar-outline" text={formatEventDate(detail.dateAt)} />
          <Fact icon="walk-outline" text={`${detail.distanceKm} กม.`} />
        </View>
        <View style={styles.factRow}>
          <Fact icon="location-outline" text={detail.province} />
          <Fact icon="ticket-outline" text={formatFeeThb(detail.feeThb)} />
        </View>
        <AppText variant="body" tone="muted">{detail.description}</AppText>
      </Card>

      <View style={styles.section}>
        <AppText variant="heading" weight="semibold">สถานที่จัดงาน</AppText>
        <View style={styles.mapWrap}>
          <MapView
            style={styles.map}
            initialRegion={{
              ...detail.coordinates,
              latitudeDelta: MAP_DELTA,
              longitudeDelta: MAP_DELTA,
            }}>
            <Marker coordinate={detail.coordinates} title={detail.venueName} />
          </MapView>
        </View>
        <Card>
          <AppText variant="body" weight="semibold">{detail.venueName}</AppText>
          <AppText variant="small" tone="muted">{detail.address}</AppText>
          <Button label="เปิดใน Google Maps" onPress={openGoogleMaps} />
        </Card>
      </View>

      <Card>
        <AppText variant="heading" weight="semibold">กำหนดการ</AppText>
        {detail.schedule.map((item) => <Bullet key={item} text={item} />)}
      </Card>

      <Card>
        <AppText variant="heading" weight="semibold">สิ่งที่ได้รับและบริการในงาน</AppText>
        {detail.included.map((item) => <Bullet key={item} text={item} />)}
      </Card>

      <Button label="แชร์งานวิ่ง" onPress={shareEvent} variant="secondary" />
      <AppText variant="caption" tone="faint" align="center">
        ข้อมูลงานและภาพเป็นข้อมูลจำลองสำหรับต้นแบบ โปรดตรวจสอบกับผู้จัดก่อนสมัครหรือเดินทาง
      </AppText>
    </Screen>
  );
}

function Fact({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.fact}>
      <Ionicons name={icon} size={17} color="#82908B" />
      <AppText variant="small">{text}</AppText>
    </View>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Ionicons name="checkmark-circle" size={18} color="#26D9A0" />
      <AppText variant="body" style={styles.bulletText}>{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  heroWrap: { height: 220, borderRadius: radius.lg, overflow: 'hidden' },
  hero: { flex: 1, backgroundColor: '#18221F' },
  section: { gap: spacing.md },
  mapWrap: { height: 210, borderRadius: radius.lg, overflow: 'hidden' },
  map: { flex: 1 },
  factRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  fact: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minWidth: '42%' },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  bulletText: { flex: 1 },
});
