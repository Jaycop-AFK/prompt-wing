import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const PREMIUM_WATCH = require('@/assets/images/prompt-wing-watch-premium.png');

export function PremiumWatchVisual() {
  const { colors } = useTheme();
  const motion = useSharedValue(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    motion.value = reduceMotion
      ? 0
      : withRepeat(
          withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.ease) }),
          -1,
          true,
        );
  }, [motion, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -5 * motion.value },
      { rotateZ: `${-1.2 + 2.4 * motion.value}deg` },
      { scale: 0.985 + 0.015 * motion.value },
    ],
  }));

  return (
    <View
      style={[styles.stage, { backgroundColor: colors.characterStage }]}
      accessibilityRole="image"
      accessibilityLabel="Prompt Wing Watch นาฬิกาวิ่งจำลองสีกราไฟต์">
      <View style={[styles.glowLarge, { backgroundColor: colors.brand }]} />
      <View style={[styles.glowSmall, { backgroundColor: colors.clearRed }]} />
      <View style={[styles.ground, { backgroundColor: colors.characterGround }]} />
      <Animated.View style={[styles.imageWrap, animatedStyle]}>
        <Image
          source={PREMIUM_WATCH}
          style={styles.image}
          contentFit="contain"
          cachePolicy="memory-disk"
          priority="high"
          transition={180}
          accessibilityLabel="Prompt Wing Watch"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    height: 276,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  glowLarge: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    opacity: 0.13,
    transform: [{ translateX: -38 }, { translateY: -10 }],
  },
  glowSmall: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    opacity: 0.08,
    transform: [{ translateX: 108 }, { translateY: -72 }],
  },
  ground: {
    position: 'absolute',
    bottom: 21,
    width: 184,
    height: 24,
    borderRadius: radius.pill,
    opacity: 0.55,
    transform: [{ scaleX: 1.18 }],
  },
  imageWrap: { width: 266, height: 266 },
  image: { width: '100%', height: '100%' },
});
