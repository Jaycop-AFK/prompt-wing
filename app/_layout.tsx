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
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { PlanReminderSync } from '@/components/training-plan/plan-reminder-sync';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
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
  const { userId, loading: authLoading } = useAuth();

  // หน้า splash ยังค้างอยู่จนกว่าจะรู้สถานะเข้าสู่ระบบจริง (ไม่ใช่แค่ฟอนต์โหลดเสร็จ) ไม่งั้นจะมีจังหวะ
  // ว่างเปล่าโผล่ขึ้นมาสั้น ๆ ก่อนสลับไปหน้าเข้าสู่ระบบหรือเข้าแอป ดู RootLayout ด้านล่างที่ค้าง
  // การเรนเดอร์ต้นไม้นี้ทั้งหมดไว้จนกว่าฟอนต์จะโหลดเสร็จอยู่แล้ว ผลคือตอน effect นี้ทำงาน ฟอนต์
  // พร้อมเสมอ เหลือรอแค่เงื่อนไข auth เพิ่มอีกอย่างเดียว
  useEffect(() => {
    if (!authLoading) SplashScreen.hideAsync().catch(() => {});
  }, [authLoading]);

  if (authLoading) return null;

  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Protected guard={userId !== null}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="weather" />
          <Stack.Screen name="warmup" />
          <Stack.Screen name="live-run" />
          <Stack.Screen name="run-summary" />
          <Stack.Screen name="run-history" />
          <Stack.Screen name="venue-detail" />
          <Stack.Screen name="event-detail" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="subscription" />
          <Stack.Screen name="training-plan" />
          <Stack.Screen name="progress-report" />
          <Stack.Screen name="mock-watch" />
          <Stack.Screen name="sources" />
          <Stack.Screen name="route-generator" />
        </Stack.Protected>

        <Stack.Protected guard={userId === null}>
          <Stack.Screen name="login" />
        </Stack.Protected>
      </Stack>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <PlanReminderSync />
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

  // ถ้าฟอนต์โหลดไม่สำเร็จก็ยังต้องแสดงแอปต่อ ไม่ใช่ค้างที่หน้า splash ตลอดไป การซ่อนหน้า splash จริง
  // ทำใน RootNavigator แทน (รอเงื่อนไข auth เพิ่มด้วย) แต่ต้องรอฟอนต์ให้พร้อมก่อนเสมอด้วย return null
  // นี้ ไม่งั้นตัวอักษรจะเปลี่ยนฟอนต์ให้เห็นหลังจอแรกเปิดขึ้นมาแล้ว
  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          {/* AuthProvider ต้องอยู่นอก ProfileProvider เสมอ เพราะ ProfileProvider เรียก useAuth()
              เพื่อรู้ userId แล้วโหลดโปรไฟล์ใหม่ทุกครั้งที่สถานะล็อกอินเปลี่ยน (ดู hooks/use-profile.tsx) */}
          <AuthProvider>
            <ProfileProvider>
              <RootNavigator />
            </ProfileProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
