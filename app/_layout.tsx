import {
  NotoSansThai_400Regular,
  NotoSansThai_500Medium,
  NotoSansThai_600SemiBold,
  NotoSansThai_700Bold,
  useFonts,
} from '@expo-google-fonts/noto-sans-thai';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { ProfileProvider } from '@/hooks/use-profile';
import { ThemeProvider, useTheme } from '@/hooks/use-theme';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync().catch(() => {
  // หน้า splash ซ่อนไปเองแล้ว ไม่ใช่เรื่องที่ต้องหยุดแอป
});

function RootNavigator() {
  const { colors, dark } = useTheme();

  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="weather" />
        <Stack.Screen name="warmup" />
        <Stack.Screen name="live-run" />
        <Stack.Screen name="run-summary" />
        <Stack.Screen name="run-history" />
        <Stack.Screen name="venue-detail" />
      </Stack>
      <StatusBar style={dark ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    NotoSansThai_400Regular,
    NotoSansThai_500Medium,
    NotoSansThai_600SemiBold,
    NotoSansThai_700Bold,
  });

  useEffect(() => {
    // ถ้าฟอนต์โหลดไม่สำเร็จก็ยังต้องแสดงแอป ไม่ใช่ค้างที่หน้า splash ตลอดไป
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ProfileProvider>
          <RootNavigator />
        </ProfileProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
