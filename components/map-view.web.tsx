import { forwardRef, useImperativeHandle, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/text';

type MapViewProps = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  onMapReady?: () => void;
  /** Native-only map props are intentionally ignored by the web placeholder. */
  initialRegion?: unknown;
  loadingEnabled?: boolean;
  showsUserLocation?: boolean;
  showsCompass?: boolean;
  showsMyLocationButton?: boolean;
  toolbarEnabled?: boolean;
  mapPadding?: unknown;
};

type OverlayProps = {
  [key: string]: unknown;
};

export type MapViewRef = {
  fitToCoordinates: (...args: unknown[]) => void;
  animateCamera: (...args: unknown[]) => void;
};

const WebMapView = forwardRef<MapViewRef, MapViewProps>(function WebMapView(
  { style, onMapReady },
  ref,
) {
  useImperativeHandle(
    ref,
    () => ({ fitToCoordinates: () => undefined, animateCamera: () => undefined }),
    []
  );

  return (
    <View
      accessibilityLabel="แผนที่ใช้ได้ในแอปมือถือ"
      accessibilityRole="image"
      onLayout={() => onMapReady?.()}
      style={[styles.container, style]}>
      <AppText variant="small" tone="muted" align="center">
        เปิดหน้านี้ใน Expo Go เพื่อดูแผนที่
      </AppText>
    </View>
  );
});

export function Marker(_props: OverlayProps) {
  return null;
}

export function Polyline(_props: OverlayProps) {
  return null;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
  },
});

export default WebMapView;
