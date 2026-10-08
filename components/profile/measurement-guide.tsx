import { View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { AppText } from '@/components/ui/text';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function MeasurementGuide({ female }: { female: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <Svg width={72} height={92} viewBox="0 0 72 92" accessibilityLabel="ภาพตำแหน่งวัดรอบคอ เอว และสะโพก">
        <Circle cx="36" cy="12" r="8" fill={colors.surfaceAlt} stroke={colors.textMuted} />
        <Path d="M25 23 C20 34 20 62 25 82 L47 82 C52 62 52 34 47 23 Z" fill={colors.surfaceAlt} stroke={colors.textMuted} />
        <Line x1="25" y1="25" x2="47" y2="25" stroke={colors.brand} strokeWidth="3" />
        <Line x1="21" y1="50" x2="51" y2="50" stroke={colors.clearYellow} strokeWidth="3" />
        {female ? <Line x1="22" y1="67" x2="50" y2="67" stroke={colors.clearRed} strokeWidth="3" /> : null}
      </Svg>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <AppText variant="caption"><AppText variant="caption" color={colors.brand}>●</AppText> คอ: ใต้ลูกกระเดือกเล็กน้อย</AppText>
        <AppText variant="caption"><AppText variant="caption" color={colors.clearYellow}>●</AppText> เอว: แนวสะดือ ไม่กลั้นหายใจ</AppText>
        {female ? <AppText variant="caption"><AppText variant="caption" color={colors.clearRed}>●</AppText> สะโพก: จุดที่กว้างที่สุด</AppText> : null}
      </View>
    </View>
  );
}
