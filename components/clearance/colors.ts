import type { ThemeColors } from '@/constants/theme';
import type { ClearanceLevel } from '@/core/coach';

/** สีของแต่ละระดับใบอนุญาตวิ่ง ใช้ร่วมกันทุกจอที่แสดงระดับ */
export function levelColors(colors: ThemeColors, level: ClearanceLevel) {
  const map: Record<ClearanceLevel, { foreground: string; background: string }> = {
    green: { foreground: colors.clearGreen, background: colors.clearGreenSoft },
    yellow: { foreground: colors.clearYellow, background: colors.clearYellowSoft },
    red: { foreground: colors.clearRed, background: colors.clearRedSoft },
  };

  return map[level];
}
