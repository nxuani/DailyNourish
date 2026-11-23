import { StyleSheet, Text, View } from 'react-native';

import type { FoodSearchItem } from '@/lib/fatsecret';
import { pantryNutrition } from '@/lib/pantry-nutrition';
import { colors, fontSize } from '@/theme/tokens';

type Props = {
  food: FoodSearchItem | null;
  quantity: number;
  unit: string;
  enabled?: boolean;
};

// Reused by add/edit forms. Values describe inventory, not food consumed.
export default function PantryNutritionSummary({
  food, quantity, unit, enabled = true,
}: Props) {
  const nutrition = enabled ? pantryNutrition(food, quantity, unit) : null;
  const entries = [
    { label: 'Calories', value: nutrition?.calories, suffix: 'kcal', decimals: 0 },
    { label: 'Protein', value: nutrition?.protein, suffix: 'g', decimals: 1 },
    { label: 'Carbs', value: nutrition?.carbs, suffix: 'g', decimals: 1 },
    { label: 'Fat', value: nutrition?.fat, suffix: 'g', decimals: 1 },
  ];

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.heading}>
        Nutrition for this amount
      </Text>
      <View style={styles.grid}>
        {entries.map(({ label, value, suffix, decimals }) => (
          <View key={label} style={styles.cell}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>
              {value == null ? '—' : `${Number(value.toFixed(decimals))} ${suffix}`}
            </Text>
          </View>
        ))}
      </View>
      <Text style={styles.hint}>
        {nutrition
          ? 'For the amount in your pantry. — means nutrition is unavailable.'
          : 'Choose a supported unit and valid amount to calculate nutrition.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 24 },
  heading: { fontSize: fontSize.md, fontWeight: '600', color: colors.heading },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  cell: {
    flexGrow: 1, flexBasis: '44%', minWidth: 100,
    padding: 12, borderRadius: 12, backgroundColor: colors.surfaceSoft,
  },
  label: { fontSize: fontSize.sm, color: colors.textMuted },
  value: { marginTop: 5, fontSize: fontSize.md, fontWeight: '700', color: colors.heading },
  hint: { marginTop: 8, fontSize: fontSize.sm, lineHeight: 18, color: colors.textMuted },
});
