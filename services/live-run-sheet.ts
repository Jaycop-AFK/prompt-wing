const SWIPE_VELOCITY = 500;

export function liveRunSheetLayout(viewportHeight: number, paused: boolean) {
  const sheetHeight = Math.min(Math.max(viewportHeight * 0.6, 420), 580);
  const visibleHeight = paused ? 255 : 220;
  return { sheetHeight, collapsedOffset: Math.max(0, sheetHeight - visibleHeight) };
}

export function clampSheetOffset(offset: number, collapsedOffset: number) {
  'worklet';
  return Math.min(Math.max(offset, 0), collapsedOffset);
}

export function nextSheetSnap(offset: number, velocityY: number, collapsedOffset: number) {
  'worklet';
  if (velocityY <= -SWIPE_VELOCITY) return 0;
  if (velocityY >= SWIPE_VELOCITY) return collapsedOffset;
  return offset < collapsedOffset / 2 ? 0 : collapsedOffset;
}
