import { View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { AppText } from '@/components/ui/text';
import { spacing } from '@/constants/theme';
import type { BodyMeasurementHistoryEntry } from '@/storage/body-measurement-storage';

function pointsOf(values: number[]): string {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  return values.map((value, index) => {
    const x = (index / (values.length - 1)) * 260;
    const y = 58 - ((value - min) / range) * 50 - 4;
    return `${x},${y}`;
  }).join(' ');
}

function lastPoint(points: string): number[] {
  return points.split(' ').at(-1)?.split(',').map(Number) ?? [260, 29];
}

export function BodyTrend({ entries, bmiColor, fatColor }: { entries: BodyMeasurementHistoryEntry[]; bmiColor: string; fatColor: string }) {
  const bmiValues = entries.flatMap((entry) => entry.bmi === null ? [] : [entry.bmi]);
  const fatValues = entries.flatMap((entry) => entry.bodyFatPercent === null ? [] : [entry.bodyFatPercent]);
  const bmiPoints = bmiValues.length >= 2 ? pointsOf(bmiValues) : null;
  const fatPoints = fatValues.length >= 2 ? pointsOf(fatValues) : null;
  if (!bmiPoints && !fatPoints) {
    return <AppText variant="caption" tone="faint">กราฟจะขึ้นเมื่อมีข้อมูลอย่างน้อย 2 วัน</AppText>;
  }
  const bmiLast = bmiPoints ? lastPoint(bmiPoints) : null;
  const fatLast = fatPoints ? lastPoint(fatPoints) : null;
  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, flexWrap: 'wrap' }}>
        <AppText variant="caption" tone="muted">แนวโน้ม · {entries.length} วันล่าสุด</AppText>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <AppText variant="caption" color={bmiColor}>● BMI {bmiValues.at(-1)?.toFixed(1) ?? '—'}</AppText>
          <AppText variant="caption" color={fatColor}>● ไขมัน {fatValues.at(-1)?.toFixed(1) ?? '—'}%</AppText>
        </View>
      </View>
      <Svg width="100%" height={64} viewBox="0 0 260 64" preserveAspectRatio="none" accessibilityLabel="กราฟแนวโน้ม BMI และเปอร์เซ็นต์ไขมัน">
        {bmiPoints ? <Polyline points={bmiPoints} fill="none" stroke={bmiColor} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" /> : null}
        {fatPoints ? <Polyline points={fatPoints} fill="none" stroke={fatColor} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" /> : null}
        {bmiLast ? <Circle cx={bmiLast[0]} cy={bmiLast[1]} r="4" fill={bmiColor} /> : null}
        {fatLast ? <Circle cx={fatLast[0]} cy={fatLast[1]} r="4" fill={fatColor} /> : null}
      </Svg>
    </View>
  );
}
