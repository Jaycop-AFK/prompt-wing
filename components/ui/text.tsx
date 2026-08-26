import { Text, type TextProps, type TextStyle } from 'react-native';

import { fontFamily, typography, type TypographyVariant } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Weight = keyof typeof fontFamily;
type Tone = 'default' | 'muted' | 'faint' | 'brand' | 'onBrand';

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  weight?: Weight;
  tone?: Tone;
  /** สีเฉพาะจุด ต้องส่งค่าที่มาจาก theme.colors เท่านั้น */
  color?: string;
  align?: TextStyle['textAlign'];
}

/**
 * ตัวอักษรทุกตัวในแอปต้องผ่านคอมโพเนนต์นี้
 *
 * เหตุผลคือฟอนต์ไทยต้องถูกตั้ง fontFamily อย่างชัดเจนทุกครั้ง
 * ถ้าใช้ Text ของ React Native ตรง ๆ Android จะตกไปใช้ฟอนต์ระบบ
 * ซึ่งวางวรรณยุกต์เพี้ยนเมื่อมีสระบนซ้อนกัน
 */
export function AppText({
  variant = 'body',
  weight = 'regular',
  tone = 'default',
  color,
  align,
  style,
  ...rest
}: AppTextProps) {
  const { colors } = useTheme();

  const toneColor: Record<Tone, string> = {
    default: colors.text,
    muted: colors.textMuted,
    faint: colors.textFaint,
    brand: colors.brand,
    onBrand: colors.onBrand,
  };

  return (
    <Text
      style={[
        typography[variant],
        { fontFamily: fontFamily[weight], color: color ?? toneColor[tone], textAlign: align },
        style,
      ]}
      {...rest}
    />
  );
}
