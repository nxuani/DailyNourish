import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DayPicker from '../../components/DayPicker';
import MealCard from '../../components/MealCard';
import { supabase } from '../../lib/supabase';
import { colors, fontSize, fontWeight } from '../../theme/tokens';
import { MealPlan } from '../../types/mealPlan';

// Fake data so the UI can be built before connecting Gemini.
// Switch the useState below to null once the real plan loads.
const MOCK_PLAN: MealPlan = {
  days: [
    {
      day: 'Monday',
      meals: [
        { meal_type: 'breakfast', name: 'Oatmeal & Berries', calories: 320, protein_g: 12, ingredients: [], instructions: [] },
        { meal_type: 'lunch', name: 'Chicken Wrap', calories: 450, protein_g: 38, ingredients: [], instructions: [] },
        { meal_type: 'dinner', name: 'Salmon, Rice & Broccoli', calories: 520, protein_g: 42, ingredients: [], instructions: [] },
        { meal_type: 'snack', name: 'Greek Yogurt', calories: 150, protein_g: 15, ingredients: [], instructions: [] },
      ],
    },
  ],
};

// Monday-to-Sunday dates for the current week
function getWeekDates(): Date[] {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export default function PlanScreen() {
  const dates = useMemo(getWeekDates, []);
  const [selected, setSelected] = useState(0); // 0 = Monday, so the mock day shows
  const [plan, setPlan] = useState<MealPlan | null>(MOCK_PLAN);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generatePlan() {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke('generate-meal-plan', { body: {} });
      if (error) throw error;
      console.log(JSON.stringify(data, null, 2)); // remove once the shape is confirmed
      setPlan(data as MealPlan);
    } catch (e) {
      console.log('generate-meal-plan failed:', e);
      setError('Could not generate a plan. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const meals = plan?.days[selected]?.meals ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Weekly Meal Plan</Text>
        <Text style={styles.subtitle}>Balanced meals for a healthier you.</Text>

        <DayPicker dates={dates} selected={selected} onSelect={setSelected} />

        {loading && (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 40 }} />
        )}

        {error && !loading && <Text style={styles.error}>{error}</Text>}

        {!loading && !error && meals.length === 0 && (
          <Text style={styles.empty}>
            {plan ? 'No meals planned for this day.' : 'Tap below to generate your first plan.'}
          </Text>
        )}

        {!loading &&
          meals.map((meal, i) => (
            <MealCard
              key={i}
              meal={meal}
              onPress={() => {
                // TODO: open Meal Details (owned by another task)
              }}
            />
          ))}

        <Pressable
          style={[styles.button, loading && { opacity: 0.6 }]}
          onPress={generatePlan}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Generating…' : 'Generate New Plan'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.heading },
  subtitle: { fontSize: fontSize.md, color: colors.text, marginTop: 4, marginBottom: 16 },
  empty: { textAlign: 'center', color: colors.textMuted, marginVertical: 40 },
  error: { textAlign: 'center', color: colors.warning, marginVertical: 20 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: colors.onPrimary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
});
