import { describe, expect, it } from 'vitest';

import { clampSheetOffset, liveRunSheetLayout, nextSheetSnap } from './live-run-sheet';

describe('live run draggable sheet', () => {
  it('keeps the sheet between expanded and collapsed positions', () => {
    expect(clampSheetOffset(-40, 300)).toBe(0);
    expect(clampSheetOffset(140, 300)).toBe(140);
    expect(clampSheetOffset(480, 300)).toBe(300);
  });

  it('uses a deliberate swipe to choose the next snap point', () => {
    expect(nextSheetSnap(240, -700, 300)).toBe(0);
    expect(nextSheetSnap(60, 700, 300)).toBe(300);
  });

  it('settles at the nearest snap point after a slow drag', () => {
    expect(nextSheetSnap(100, 50, 300)).toBe(0);
    expect(nextSheetSnap(200, -50, 300)).toBe(300);
  });

  it('keeps enough map visible on short and tall phones', () => {
    expect(liveRunSheetLayout(568, false)).toEqual({ sheetHeight: 420, collapsedOffset: 200 });
    expect(liveRunSheetLayout(1200, true)).toEqual({ sheetHeight: 580, collapsedOffset: 325 });
  });
});
