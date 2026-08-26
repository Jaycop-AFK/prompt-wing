import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { fontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/** ห้าแท็บของ พร้อมวิ่ง เรียงตามลำดับที่ผู้ใช้เดินผ่านในหนึ่งรอบของการวิ่ง */
const TABS: { name: string; title: string; icon: IoniconName; iconActive: IoniconName }[] = [
  { name: 'index', title: 'หน้าหลัก', icon: 'home-outline', iconActive: 'home' },
  { name: 'venues', title: 'ที่วิ่ง', icon: 'map-outline', iconActive: 'map' },
  { name: 'run', title: 'วิ่ง', icon: 'walk-outline', iconActive: 'walk' },
  { name: 'community', title: 'ชุมชน', icon: 'people-outline', iconActive: 'people' },
  { name: 'profile', title: 'โปรไฟล์', icon: 'person-outline', iconActive: 'person' },
];

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        tabBarLabelStyle: { fontFamily: fontFamily.medium, fontSize: 11 },
      }}>
      {TABS.map(({ name, title, icon, iconActive }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? iconActive : icon} size={24} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
