import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { clampSheetOffset, liveRunSheetLayout, nextSheetSnap } from '@/services/live-run-sheet';

interface LiveRunSheetProps {
  children: ReactNode;
  paused: boolean;
}

const SPRING = { damping: 22, stiffness: 240, mass: 0.8 } as const;

/** แผงสถิติที่ลากขึ้นลงบนแผนที่ได้ การลากทำงานบน native UI thread ผ่าน RNGH/Reanimated */
export function LiveRunSheet({ children, paused }: LiveRunSheetProps) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { sheetHeight, collapsedOffset } = liveRunSheetLayout(height, paused);
  const translateY = useSharedValue(collapsedOffset);
  const dragStart = useSharedValue(collapsedOffset);

  useEffect(() => {
    translateY.value = withSpring(collapsedOffset, SPRING);
  }, [collapsedOffset, translateY]);

  const pan = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .onBegin(() => {
      dragStart.value = translateY.value;
    })
    .onUpdate((event) => {
      translateY.value = clampSheetOffset(dragStart.value + event.translationY, collapsedOffset);
    })
    .onEnd((event) => {
      translateY.value = withSpring(
        nextSheetSnap(translateY.value, event.velocityY, collapsedOffset),
        SPRING
      );
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const toggle = () => {
    translateY.value = withSpring(
      translateY.value > collapsedOffset / 2 ? 0 : collapsedOffset,
      SPRING
    );
  };

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          styles.sheet,
          {
            height: sheetHeight,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.text,
            paddingBottom: Math.max(insets.bottom, spacing.sm),
          },
          animatedStyle,
        ]}>
        <Pressable
          onPress={toggle}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="เปิดหรือย่อข้อมูลการวิ่ง"
          style={styles.handleArea}>
          <View style={[styles.handle, { backgroundColor: colors.textFaint }]} />
          <AppText variant="caption" tone="faint">
            ลากขึ้นเพื่อดูข้อมูลทั้งหมด
          </AppText>
        </Pressable>
        <View style={styles.content}>{children}</View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -5 },
    elevation: 14,
  },
  handleArea: { alignItems: 'center', gap: spacing.xs, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  handle: { width: 44, height: 5, borderRadius: radius.pill },
  content: { flex: 1, gap: spacing.sm },
});
