import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, fontWeight } from '../theme/tokens';
import { Meal } from '../types/mealPlan';

const EMOJI: Record<string, string> = {
  breakfast: '🥣',
  lunch: '🌯',
  dinner: '🍽️',
  snack: '🍓',
};

type Props = { meal: Meal; onPress?: () => void };

export default function MealCard({ meal, onPress }: Props) {
  const typeLabel = meal.meal_type.charAt(0).toUpperCase() + meal.meal_type.slice(1);

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.iconBox}>
        <Text style={styles.emoji}>{EMOJI[meal.meal_type] ?? '🍽️'}</Text>
      </View>
      <View style={styles.textBox}>
        <Text style={styles.type}>{typeLabel}</Text>
        <Text style={styles.name} numberOfLines={1}>{meal.name}</Text>
        <Text style={styles.meta}>
          {meal.calories} calories • {meal.protein_g} g protein
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  emoji: { fontSize: 32 },
  textBox: { flex: 1 },
  type: { fontSize: fontSize.sm, color: colors.textMuted },
  name: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.heading,
    marginVertical: 2,
  },
  meta: { fontSize: fontSize.sm, color: colors.textMuted },
  chevron: { fontSize: 24, color: colors.textMuted, marginLeft: 8 },
});