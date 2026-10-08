import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/ui/text';
import { radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { MockWatchDevice } from '@/services/mock-watch';

export function RotatingWatch({
  device,
  heartRate,
  compact = false,
}: {
  device: MockWatchDevice;
  heartRate: number;
  compact?: boolean;
}) {
  const { colors } = useTheme();
  const rotation = useSharedValue(-18);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    rotation.value = reduceMotion
      ? 0
      : withRepeat(withTiming(342, { duration: 9000, easing: Easing.inOut(Easing.ease) }), -1, false);
  }, [reduceMotion, rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 700 },
      { rotateY: `${rotation.value}deg` },
      { rotateX: '-7deg' },
      { scale: compact ? 0.76 : 1 },
    ],
  }));
  const round = device.shape === 'round';
  const band = device.shape === 'band';

  return (
    <View
      style={[styles.stage, compact && styles.stageCompact, { backgroundColor: colors.characterStage }]}
      accessibilityLabel={`โมเดลหมุน ${device.name}`}>
      <View
        style={[
          styles.shadow,
          compact && styles.shadowCompact,
          { backgroundColor: colors.characterGround },
        ]}
      />
      <Animated.View style={[styles.watch, animatedStyle]}>
        <View style={[styles.strap, styles.strapTop, { backgroundColor: colors.characterFar }]} />
        <View
          style={[
            styles.case,
            round && styles.roundCase,
            band && styles.bandCase,
            { backgroundColor: colors.characterNear, borderColor: device.accent },
          ]}>
          <View
            style={[
              styles.screen,
              round && styles.roundScreen,
              band && styles.bandScreen,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}>
            <Ionicons name="heart" size={band ? 16 : 24} color={device.accent} />
            <AppText variant={band ? 'small' : 'heading'} weight="bold" color={colors.text}>
              {heartRate}
            </AppText>
            {!band ? (
              <AppText variant="caption" tone="faint">
                BPM · DEMO
              </AppText>
            ) : null}
          </View>
          {!band ? <View style={[styles.crown, { backgroundColor: device.accent }]} /> : null}
        </View>
        <View style={[styles.strap, styles.strapBottom, { backgroundColor: colors.characterFar }]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { height: 280, alignItems: 'center', justifyContent: 'center', borderRadius: radius.xl, overflow: 'hidden' },
  stageCompact: { height: 210 },
  shadow: { position: 'absolute', bottom: 28, width: 150, height: 22, borderRadius: radius.pill, opacity: 0.55 },
  shadowCompact: { bottom: 18, width: 120, height: 17 },
  watch: { width: 150, height: 250, alignItems: 'center', justifyContent: 'center' },
  strap: { width: 72, height: 72, position: 'absolute', left: 39 },
  strapTop: { top: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  strapBottom: { bottom: 0, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  case: { width: 134, height: 146, padding: 8, borderRadius: 34, borderWidth: 4, zIndex: 2, elevation: 10 },
  roundCase: { width: 142, height: 142, borderRadius: 71 },
  bandCase: { width: 84, height: 142, borderRadius: 38 },
  screen: { flex: 1, borderRadius: 25, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', gap: 1 },
  roundScreen: { borderRadius: 64 },
  bandScreen: { borderRadius: 31 },
  crown: { position: 'absolute', right: -10, top: 46, width: 10, height: 28, borderRadius: 5 },
});
