import { Image } from 'expo-image';
import type { ImageStyle, StyleProp } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export type AppIllustrationName = 'fitnessStats' | 'locationTracking' | 'socialFriends';

const SOURCES = {
  fitnessStats: {
    light: require('../../assets/illustrations/runner-sprinting.svg'),
    dark: require('../../assets/illustrations/runner-sprinting-dark.svg'),
  },
  locationTracking: {
    light: require('../../assets/illustrations/runner-strolling.svg'),
    dark: require('../../assets/illustrations/runner-strolling-dark.svg'),
  },
  socialFriends: {
    light: require('../../assets/illustrations/runner-selfie.svg'),
    dark: require('../../assets/illustrations/runner-selfie-dark.svg'),
  },
} as const;

interface AppIllustrationProps {
  name: AppIllustrationName;
  style?: StyleProp<ImageStyle>;
}

/** ภาพประกอบเวกเตอร์ที่บันเดิลมากับแอป ไม่ต้องรอโหลดจากอินเทอร์เน็ต */
export function AppIllustration({ name, style }: AppIllustrationProps) {
  const { dark } = useTheme();
  return (
    <Image
      source={SOURCES[name][dark ? 'dark' : 'light']}
      style={style}
      contentFit="contain"
      cachePolicy="memory-disk"
      accessible={false}
    />
  );
}
