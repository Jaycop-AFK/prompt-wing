import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const SOURCES = [
  {
    icon: 'partly-sunny-outline',
    title: 'Open-Meteo และ CAMS',
    detail: 'ข้อมูลอากาศและคุณภาพอากาศจากแบบจำลอง · CC BY 4.0',
    url: 'https://open-meteo.com/en/license',
  },
  {
    icon: 'cloud-outline',
    title: 'Air4Thai',
    detail: 'ค่าฝุ่นจากสถานีตรวจวัดของกรมควบคุมมลพิษเมื่อมีข้อมูล',
    url: 'https://air4thai.pcd.go.th/',
  },
  {
    icon: 'map-outline',
    title: 'OpenStreetMap contributors',
    detail: 'ข้อมูลสวน สนาม ลู่วิ่ง สิ่งอำนวยความสะดวก และโครงข่ายถนน · ODbL',
    url: 'https://www.openstreetmap.org/copyright',
  },
  {
    icon: 'navigate-outline',
    title: 'GraphHopper',
    detail: 'สร้างเส้นทางวงกลมและจับเส้น GPS เข้ากับแนวถนน',
    url: 'https://www.graphhopper.com/',
  },
  {
    icon: 'color-palette-outline',
    title: 'Open Doodles',
    detail: 'ภาพประกอบเวกเตอร์โดย Pablo Stanley · CC0',
    url: 'https://www.opendoodles.com/about',
  },
  {
    icon: 'shapes-outline',
    title: 'Ionicons',
    detail: 'ไอคอนส่วนติดต่อผู้ใช้ · MIT License',
    url: 'https://github.com/ionic-team/ionicons',
  },
] as const;

export default function SourcesScreen() {
  const { colors } = useTheme();

  return (
    <Screen title="เครดิตและแหล่งข้อมูล" back>
      <Card background={colors.brandSoft}>
        <AppText variant="heading" weight="bold">
          ข้อมูลไม่ได้มาจากแหล่งเดียว
        </AppText>
        <AppText variant="small" color={colors.brandStrong}>
          แตะแต่ละรายการเพื่อดูเจ้าของข้อมูล เงื่อนไขใช้งาน และรายละเอียดต้นทาง
        </AppText>
      </Card>

      {SOURCES.map((source) => (
        <Pressable
          key={source.title}
          onPress={() => Linking.openURL(source.url)}
          accessibilityRole="link"
          accessibilityLabel={`เปิดแหล่งข้อมูล ${source.title}`}
          style={({ pressed }) => [
            styles.sourceRow,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && styles.pressed,
          ]}>
          <View style={[styles.iconWrap, { backgroundColor: colors.surfaceAlt }]}>
            <Ionicons name={source.icon} size={22} color={colors.brand} />
          </View>
          <View style={styles.sourceCopy}>
            <AppText variant="body" weight="semibold">
              {source.title}
            </AppText>
            <AppText variant="caption" tone="muted">
              {source.detail}
            </AppText>
          </View>
          <Ionicons name="open-outline" size={18} color={colors.textFaint} />
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sourceRow: {
    minHeight: 76,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceCopy: { flex: 1, gap: 2 },
  pressed: { opacity: 0.65 },
});
