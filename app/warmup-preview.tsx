import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';
import { MUSCLE_LABEL, RAMP_LABEL, RAMP_LETTER, RAMP_ORDER } from '@/components/warmup/copy';
import { MOVES } from '@/components/warmup/moves';
import type { RampPhase, WarmUpMoveDef } from '@/components/warmup/skeleton';
import { WarmupCharacter } from '@/components/warmup/warmup-character';
import { useTheme } from '@/hooks/use-theme';

/**
 * ตัวอย่างตัวละครวอร์มอัพ ตั๋ว 07
 *
 * จอนี้แสดงตัวละครและให้เลือกดูครบท่าวอร์มอัพทั้งแปด หน้าวอร์มอัพจริงที่เลือกชุดวอร์มอัพอัตโนมัติ
 * ตามอากาศและฟอร์มครั้งก่อน พร้อมตัวเล่นนับถอยหลัง จะสร้างในตั๋ว 08
 */
export default function WarmupPreviewScreen() {
  const { colors } = useTheme();
  const [selectedId, setSelectedId] = useState<string>(MOVES[0].id);
  const move = MOVES.find((m) => m.id === selectedId) ?? MOVES[0];

  const movesByPhase = (phase: RampPhase) => MOVES.filter((m) => m.ramp === phase);

  return (
    <Screen title="ตัวอย่างท่าวอร์มอัพ" back>
      <Card background={colors.surfaceAlt}>
        <AppText variant="small" tone="muted">
          หน้านี้เป็นตัวอย่างของตัวละคร ยังไม่ใช่หน้าวอร์มอัพจริง หน้าจริงที่เลือกชุดวอร์มอัพให้อัตโนมัติ
          ตามอากาศวันนี้และฟอร์มการวิ่งครั้งก่อนจะมาใน ตั๋ว 08
        </AppText>
      </Card>

      <Card>
        <View style={styles.stageWrap}>
          <WarmupCharacter
            move={move}
            colors={{
              stage: colors.characterStage,
              near: colors.characterNear,
              far: colors.characterFar,
              glow: colors.characterGlow,
              ground: colors.characterGround,
            }}
          />
        </View>

        <View style={styles.captionRow}>
          <View style={styles.captionText}>
            <AppText variant="heading" weight="semibold">
              {move.nameTH}
            </AppText>
            <AppText variant="small" tone="muted">
              กล้ามเนื้อเป้าหมาย: {move.targetMuscles.map((m) => MUSCLE_LABEL[m]).join(', ')}
            </AppText>
          </View>
          <RampBadge phase={move.ramp} />
        </View>
      </Card>

      {RAMP_ORDER.map((phase) => (
        <View key={phase} style={styles.phaseSection}>
          <AppText variant="small" weight="semibold" tone="muted">
            {RAMP_LETTER[phase]} · {RAMP_LABEL[phase]}
          </AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {movesByPhase(phase).map((candidate) => (
              <MoveChip
                key={candidate.id}
                move={candidate}
                selected={candidate.id === selectedId}
                onPress={() => setSelectedId(candidate.id)}
              />
            ))}
          </ScrollView>
        </View>
      ))}
    </Screen>
  );
}

function RampBadge({ phase }: { phase: RampPhase }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.rampBadge, { backgroundColor: colors.brandSoft }]}>
      <AppText variant="small" weight="bold" color={colors.brandStrong}>
        {RAMP_LETTER[phase]}
      </AppText>
    </View>
  );
}

function MoveChip({
  move,
  selected,
  onPress,
}: {
  move: WarmUpMoveDef;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.brand : colors.surfaceAlt,
          borderColor: selected ? colors.brand : colors.border,
        },
      ]}>
      <AppText variant="small" weight="medium" color={selected ? colors.onBrand : colors.text}>
        {move.nameTH}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stageWrap: { alignItems: 'center' },
  captionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  captionText: { flex: 1, gap: spacing.xs },
  rampBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseSection: { gap: spacing.sm },
  chipRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  chip: {
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
