import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { HistoryBucket } from '@/services/run-history';

const CHART_HEIGHT = 120;
/** ความสูงขั้นต่ำของแท่งที่มีค่ามากกว่าศูนย์ ให้เห็นว่ามีการวิ่งวันนั้นแม้ระยะจะน้อยมาก */
const MIN_VISIBLE_BAR = 3;
/** เกินจำนวนนี้ (ประมาณหนึ่งเดือน) ป้ายใต้แท่งจะเบียดกันจนอ่านไม่ออก เลยแสดงเว้นแท่ง */
const CROWDED_LABEL_COUNT = 12;
/** เมื่อแท่งเยอะเกินไป แสดงป้ายทุก ๆ กี่แท่ง เลือก 5 ให้อ่านเป็นช่วงห้าวันได้ง่าย */
const LABEL_STEP = 5;

interface DistanceChartProps {
  buckets: HistoryBucket[];
}

/**
 * กราฟแท่งระยะทาง วาดด้วย View ธรรมดาไม่ใช้ไลบรารีกราฟ
 *
 * ข้อมูลเป็นแค่ชุดตัวเลขบวกที่ต้องเทียบความสูงกัน ไลบรารีกราฟทั้งตัวจะเพิ่มขนาดแอปและความเสี่ยง
 * ว่าจะใช้ใน Expo Go ไม่ได้ (ดู ADR 0002) โดยไม่ได้อะไรที่ View กับ flex ทำไม่ได้อยู่แล้ว
 */
export function DistanceChart({ buckets }: DistanceChartProps) {
  const { colors } = useTheme();

  const maxDistance = Math.max(...buckets.map((b) => b.distanceKm), 0);
  const showEveryLabel = buckets.length <= CROWDED_LABEL_COUNT;

  return (
    <View>
      <View style={styles.chart}>
        {buckets.map((bucket, index) => {
          const isCurrent = bucket.isCurrent;
          // ป้ายแท่งสุดท้ายต้องขึ้นเสมอ เพราะเป็นแท่งของวันนี้ที่ผู้ใช้อยากรู้วันที่มากที่สุด
          const showLabel = showEveryLabel || index % LABEL_STEP === 0 || index === buckets.length - 1;
          const ratio = maxDistance > 0 ? bucket.distanceKm / maxDistance : 0;
          const height = bucket.distanceKm > 0 ? Math.max(MIN_VISIBLE_BAR, ratio * CHART_HEIGHT) : 0;

          return (
            <View key={bucket.startsAt} style={styles.column}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    {
                      height,
                      backgroundColor: isCurrent ? colors.brandStrong : colors.brand,
                    },
                  ]}
                />
              </View>
              <AppText
                variant="caption"
                tone={isCurrent ? 'brand' : 'faint'}
                weight={isCurrent ? 'semibold' : 'regular'}
                numberOfLines={1}
                style={styles.label}>
                {showLabel ? bucket.label : ''}
              </AppText>
            </View>
          );
        })}
      </View>

      {maxDistance === 0 ? (
        <AppText variant="caption" tone="faint" align="center">
          ยังไม่มีการวิ่งในช่วงนี้
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: CHART_HEIGHT + 20 },
  column: { flex: 1, alignItems: 'center', gap: spacing.xs },
  barTrack: { height: CHART_HEIGHT, justifyContent: 'flex-end', width: '100%' },
  bar: { width: '100%', borderRadius: radius.sm, minHeight: 0 },
  label: { textAlign: 'center' },
});
