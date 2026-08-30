import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MockBadge } from '@/components/ui/mock-badge';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Coordinates } from '@/services/geo';
import { getCurrentCoordinates } from '@/services/location';
import { generateCircularRoute } from '@/services/route-generator';

const DISTANCE_PRESETS = [3, 5, 8, 10, 15, 21];
/** จุดเริ่มต้นของกล้องก่อน fitToCoordinates จะปรับให้พอดีกับเส้นทางจริงอีกที ไม่ต้องคำนวณตามระยะ
 * ที่ขอให้แม่นยำ เพราะ fitToCoordinates จะยิงตามมาเกือบทันทีเสมอ (ดู onMapReady/handleGenerate) */
const INITIAL_MAP_DELTA = 0.02;
const ROUTE_EDGE_PADDING = { top: 48, right: 48, bottom: 48, left: 48 };

export default function RouteGeneratorScreen() {
  const { colors } = useTheme();
  const [distanceKm, setDistanceKm] = useState(5);
  const [origin, setOrigin] = useState<Coordinates | null>(null);
  const [route, setRoute] = useState<Coordinates[] | null>(null);
  const [isFallbackLocation, setIsFallbackLocation] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const mapRef = useRef<MapView | null>(null);
  // MapView ตัวจริงพร้อมรับคำสั่ง fitToCoordinates ต่อเมื่อโหลดเสร็จแล้วเท่านั้น (onMapReady)
  // เรียกก่อนหน้านั้นจะเงียบ ๆ ไม่มีผล ต้องแยกสองกรณี คือครั้งแรกที่ยังไม่เคย mount (รอ onMapReady
  // จัดการเอง) กับครั้งถัดไปที่แผนที่พร้อมอยู่แล้วตอนกดสร้างเส้นทางใหม่ด้วยระยะอื่น (เรียกเองตรงนี้เลย
  // เพราะ onMapReady ยิงแค่ครั้งเดียวตอน mount ไม่ยิงซ้ำให้)
  const isMapReadyRef = useRef(false);

  const fitToRoute = (points: Coordinates[]) => {
    mapRef.current?.fitToCoordinates(points, { edgePadding: ROUTE_EDGE_PADDING, animated: true });
  };

  // getCurrentCoordinates ไม่ throw เลย (ดู services/location.ts) ถอยไปใช้ตำแหน่งสำรองเองเมื่อขอ
  // ตำแหน่งจริงไม่ได้ จึงไม่ต้องมี try/catch หรือสถานะ error ที่นี่ แค่บอกผู้ใช้เมื่อเป็นตำแหน่งสำรอง
  //
  // ยังต้องมีสถานะกำลังโหลดอยู่ดี แม้จะไม่มีทาง error เพราะ getCurrentPositionAsync ของเครื่องจริง
  // ใช้เวลาได้หลายวินาทีเวลาสัญญาณ GPS อ่อน ปุ่มที่ไม่ตอบสนองอะไรเลยระหว่างรอจะดูเหมือนจอค้าง
  // (รูปแบบเดียวกับที่ hooks/use-venues.ts + app/(tabs)/venues.tsx ทำไว้กับ getCurrentCoordinates
  // ตัวเดียวกันนี้) ปิดปุ่มไว้ระหว่างรอด้วย กันกดซ้ำจนยิงคำขอตำแหน่งซ้อนกันหลายรอบโดยไม่จำเป็น
  const handleGenerate = async () => {
    setIsGenerating(true);
    const location = await getCurrentCoordinates();
    const nextRoute = generateCircularRoute(location.coordinates, distanceKm);

    setOrigin(location.coordinates);
    setIsFallbackLocation(location.isFallback);
    setRoute(nextRoute);
    setIsGenerating(false);

    // สร้างเส้นทางใหม่ทับของเดิมด้วยระยะอื่น ต้อง fit เองเพราะแผนที่ mount อยู่แล้ว ครั้งแรกปล่อยให้
    // onMapReady จัดการแทน เพราะตอนนี้ (ก่อน state ข้างบนอัปเดตจริง) แผนที่ยังไม่ถูก mount เลยด้วยซ้ำ
    if (isMapReadyRef.current) fitToRoute(nextRoute);
  };

  return (
    <Screen title="สร้างเส้นทางวงกลม" back>
      <MockBadge label="เส้นทางจำลอง ไม่ได้ตรวจสอบกับถนนจริง" />

      <Card>
        <AppText variant="body">ระยะที่ต้องการ</AppText>
        <View style={styles.presetRow}>
          {DISTANCE_PRESETS.map((value) => {
            const active = value === distanceKm;
            return (
              <Pressable
                key={value}
                onPress={() => setDistanceKm(value)}
                disabled={isGenerating}
                accessibilityRole="button"
                accessibilityState={{ selected: active, disabled: isGenerating }}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: active ? colors.brandSoft : colors.surfaceAlt,
                    borderColor: active ? colors.brand : colors.border,
                    opacity: isGenerating ? 0.5 : 1,
                  },
                ]}>
                <AppText variant="small" weight="semibold" color={active ? colors.brandStrong : colors.text}>
                  {value} กม.
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <Button
          label={isGenerating ? 'กำลังหาตำแหน่ง...' : 'สร้างเส้นทาง'}
          onPress={handleGenerate}
          disabled={isGenerating}
        />
      </Card>

      {isFallbackLocation ? (
        <AppText variant="caption" tone="faint">
          หาตำแหน่งปัจจุบันไม่ได้ วาดเส้นทางจากตำแหน่งสำรอง (มจพ. ปราจีนบุรี) แทน
        </AppText>
      ) : null}

      {route && origin ? (
        <View style={styles.mapWrap}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              latitude: origin.latitude,
              longitude: origin.longitude,
              latitudeDelta: INITIAL_MAP_DELTA,
              longitudeDelta: INITIAL_MAP_DELTA,
            }}
            onMapReady={() => {
              isMapReadyRef.current = true;
              fitToRoute(route);
            }}>
            <Polyline coordinates={route} strokeColor={colors.brand} strokeWidth={4} />
            <Marker coordinate={origin} pinColor={colors.brand} title="จุดเริ่มต้น/สิ้นสุด" />
          </MapView>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  presetChip: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  mapWrap: { height: 280, borderRadius: radius.lg, overflow: 'hidden' },
  map: { flex: 1 },
});
