import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { AMENITY_LABEL, AVAILABILITY_LABEL, formatDistanceFromUser } from '@/components/venues/copy';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { radius } from '@/constants/theme';
import { getCurrentCoordinates } from '@/services/location';
import { distanceFromUser, venueDisplayName, VENUE_KIND_LABEL, type Venue } from '@/services/venue';

/** แคบกว่าจอรายการ (0.03) เพราะจอนี้โฟกัสที่วิ่งแห่งเดียว ไม่ต้องเห็นบริเวณกว้างรอบตัว */
const MAP_DELTA = 0.01;

/** เปิดแอปแผนที่ของเครื่องด้วยพิกัดปลายทาง ใช้ scheme geo: ของแอนดรอยด์ตรง ๆ ตาม AGENTS.md
 * ที่กำหนดให้แอปนี้เป็นแอนดรอยด์ผ่าน Expo Go เท่านั้น ไม่ต้องรองรับ iOS */
function navigateTo(venue: Venue) {
  const label = encodeURIComponent(venueDisplayName(venue));
  const { latitude, longitude } = venue.coordinates;

  Linking.openURL(`geo:0,0?q=${latitude},${longitude}(${label})`).catch(() => {
    Alert.alert('เปิดแอปแผนที่ไม่สำเร็จ', 'เครื่องนี้อาจไม่มีแอปแผนที่ที่รองรับ');
  });
}

export default function VenueDetailScreen() {
  const params = useLocalSearchParams<{ venue?: string }>();
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(
    null
  );

  useEffect(() => {
    getCurrentCoordinates().then((result) => setUserLocation(result.coordinates));
  }, []);

  let venue: Venue | null = null;
  try {
    venue = params.venue ? JSON.parse(params.venue) : null;
  } catch {
    venue = null;
  }

  if (!venue) {
    return (
      <Screen title="รายละเอียดที่วิ่ง" back>
        <Card>
          <AppText variant="body" tone="muted">
            ไม่พบข้อมูลที่วิ่งนี้
          </AppText>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title="รายละเอียดที่วิ่ง" back>
      <Card>
        <AppText variant="title" weight="bold">
          {venueDisplayName(venue)}
        </AppText>
        <AppText variant="caption" tone="muted">
          {VENUE_KIND_LABEL[venue.kind]}
        </AppText>
        {userLocation ? (
          <AppText variant="body" tone="muted">
            {formatDistanceFromUser(distanceFromUser(venue, userLocation))}
          </AppText>
        ) : null}
      </Card>

      <View style={styles.mapWrap}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: venue.coordinates.latitude,
            longitude: venue.coordinates.longitude,
            latitudeDelta: MAP_DELTA,
            longitudeDelta: MAP_DELTA,
          }}>
          <Marker coordinate={venue.coordinates} title={venueDisplayName(venue)} />
        </MapView>
      </View>

      <Card>
        <AppText variant="heading" weight="semibold">
          สิ่งอำนวยความสะดวก
        </AppText>
        {(Object.keys(AMENITY_LABEL) as (keyof typeof AMENITY_LABEL)[]).map((key) => (
          <View key={key} style={styles.amenityRow}>
            <AppText variant="body">{AMENITY_LABEL[key]}</AppText>
            <AppText
              variant="body"
              weight="semibold"
              tone={venue.amenities[key] === 'unknown' ? 'faint' : 'default'}>
              {AVAILABILITY_LABEL[venue.amenities[key]]}
            </AppText>
          </View>
        ))}
      </Card>

      {venue.source === 'curated' ? (
        <AppText variant="caption" tone="faint">
          ข้อมูลที่วิ่งนี้มาจากการกรอกเองเสริม OpenStreetMap ไม่ใช่การสำรวจภาคสนามที่ยืนยันครบทุกจุด
        </AppText>
      ) : null}

      <Button label="นำทางไปที่นี่" onPress={() => navigateTo(venue)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  mapWrap: { height: 180, borderRadius: radius.lg, overflow: 'hidden' },
  map: { flex: 1 },
  amenityRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
