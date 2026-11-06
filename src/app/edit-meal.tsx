import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import FoodPickerModal from '../components/food-picker-modal';
import MacroSummary from '../components/macro-summary';
import { colors } from '../constants/colors';
import {
    fmt,
    Food,
    formatDateLong,
    getDayLog,
    MEAL_TYPES,
    MealType,
    saveMeal,
    scaled,
    servingsLabel,
    sumFoods,
    toDateKey,
    useMealLog,
} from '../services/meal-log-store';

export default function EditMealScreen() {
  const params = useLocalSearchParams<{ date?: string; mealType?: string }>();
  const dateKey = params.date ?? toDateKey(new Date());
  const mealType = (params.mealType ?? 'breakfast') as MealType;
  const label = MEAL_TYPES.find((m) => m.key === mealType)?.label ?? 'Meal';

  const log = useMealLog();
  const saved = getDayLog(log, dateKey)[mealType];

  // Edits are kept in a draft until the user presses Save Changes.
  const [foods, setFoods] = useState<Food[]>(saved.foods);
  const [notes, setNotes] = useState(saved.notes);
  const [adding, setAdding] = useState(false);

  const totals = sumFoods(foods);

  const changeServings = (id: string, delta: number) => {
    setFoods((current) =>
      current.map((f) =>
        f.id === id ? { ...f, servings: Math.max(0.5, f.servings + delta) } : f
      )
    );
  };

  const removeFood = (id: string) => {
    setFoods((current) => current.filter((f) => f.id !== id));
  };

  const handleSave = () => {
    saveMeal(dateKey, mealType, foods, notes.trim());
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title: `Edit ${label}`, headerBackTitle: 'Meal Log' }} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.date}>{formatDateLong(dateKey)}</Text>

        {/* Meal total */}
        <View style={styles.totalCard}>
          <View>
            <Text style={styles.totalLabel}>{label.toUpperCase()} TOTAL</Text>
            <Text style={styles.totalCalories}>{fmt(totals.calories)} calories</Text>
          </View>
          <MacroSummary macros={totals} />
        </View>

        <Text style={styles.sectionTitle}>Foods in this meal</Text>

        {foods.length === 0 && (
          <Text style={styles.emptyText}>No foods yet. Tap Add Food to start this meal.</Text>
        )}

        {foods.map((food) => {
          const s = scaled(food);
          return (
            <View key={food.id} style={styles.foodCard}>
              <View style={styles.foodTop}>
                <View style={styles.foodText}>
                  <Text style={styles.foodName}>{food.name}</Text>
                  <Text style={styles.foodMeta}>
                    {food.amount} • {fmt(s.calories)} cal
                  </Text>
                  <Text style={styles.foodMeta}>
                    {fmt(s.protein)} g protein • {fmt(s.carbs)} g carbs • {fmt(s.fat)} g fat
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel={`Remove ${food.name}`}
                  style={styles.removeButton}
                  onPress={() => removeFood(food.id)}
                >
                  <Ionicons name="remove" size={18} color="#C0392B" />
                </Pressable>
              </View>

              <View style={styles.stepper}>
                <Pressable hitSlop={8} onPress={() => changeServings(food.id, -0.5)}>
                  <Ionicons name="remove" size={18} color={colors.primary} />
                </Pressable>
                <Text style={styles.stepperText}>{servingsLabel(food.servings)}</Text>
                <Pressable hitSlop={8} onPress={() => changeServings(food.id, 0.5)}>
                  <Ionicons name="add" size={18} color={colors.primary} />
                </Pressable>
              </View>
            </View>
          );
        })}

        <Pressable style={styles.addFood} onPress={() => setAdding(true)}>
          <Ionicons name="add" size={20} color={colors.primary} />
          <Text style={styles.addFoodText}>Add Food</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Meal notes</Text>
        <TextInput
          style={styles.notes}
          placeholder="Optional: add preparation details or notes..."
          placeholderTextColor={colors.muted}
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <View style={styles.buttonRow}>
          <Pressable style={[styles.button, styles.buttonOutline]} onPress={() => router.back()}>
            <Text style={styles.buttonOutlineText}>Cancel</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.buttonFilled]} onPress={handleSave}>
            <Text style={styles.buttonFilledText}>Save Changes</Text>
          </Pressable>
        </View>
      </ScrollView>

      <FoodPickerModal
        visible={adding}
        onClose={() => setAdding(false)}
        onAdd={(food) => {
          setFoods((current) => [...current, food]);
          setAdding(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 },
  date: { fontSize: 14, color: colors.muted, textAlign: 'center', marginBottom: 12 },

  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.focusBackground,
    borderRadius: 16,
    padding: 16,
  },
  totalLabel: { fontSize: 11, fontWeight: '700', color: colors.primary, letterSpacing: 0.5 },
  totalCalories: { fontSize: 24, fontWeight: '700', color: colors.ink, marginTop: 2 },

  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.ink, marginTop: 20, marginBottom: 10 },
  emptyText: { fontSize: 14, color: colors.muted, marginBottom: 10 },

  foodCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  foodTop: { flexDirection: 'row', alignItems: 'flex-start' },
  foodText: { flex: 1 },
  foodName: { fontSize: 16, fontWeight: '700', color: colors.ink },
  foodMeta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  removeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.sodiumTrack,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 10,
    marginTop: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: colors.focusBackground,
  },
  stepperText: { fontSize: 13, fontWeight: '600', color: colors.ink },

  addFood: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.card,
  },
  addFoodText: { fontSize: 16, fontWeight: '700', color: colors.primary },

  notes: {
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: colors.ink,
  },

  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  button: { flex: 1, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  buttonFilled: { backgroundColor: colors.primary },
  buttonFilledText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  buttonOutline: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.card },
  buttonOutlineText: { color: colors.primary, fontSize: 16, fontWeight: '700' },

});
