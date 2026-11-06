import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import MacroSummary from '../../components/macro-summary';
import { colors } from '../../constants/colors';
import {
    addDays,
    DAILY_TARGETS,
    fmt,
    formatDateLong,
    getDayLog,
    MEAL_TYPES,
    MealType,
    scaled,
    servingsLabel,
    sumDay,
    sumFoods,
    toDateKey,
    useMealLog,
} from '../../services/meal-log-store';

export default function MealLogScreen() {
  const log = useMealLog();
  const todayKey = toDateKey(new Date());
  const [dateKey, setDateKey] = useState(todayKey);

  const day = getDayLog(log, dateKey);
  const dayTotals = sumDay(day);

  const openEdit = (mealType: MealType) => {
    router.push({ pathname: '/edit-meal', params: { date: dateKey, mealType } });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Meal Log</Text>

        {/* Day selector */}
        <View style={styles.dateRow}>
          <Pressable
            accessibilityLabel="Previous day"
            hitSlop={12}
            onPress={() => setDateKey(addDays(dateKey, -1))}
          >
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
          </Pressable>
          <View style={styles.dateCenter}>
            <Text style={styles.dateText}>{formatDateLong(dateKey)}</Text>
            {dateKey !== todayKey && (
              <Pressable hitSlop={8} onPress={() => setDateKey(todayKey)}>
                <Text style={styles.todayLink}>Back to today</Text>
              </Pressable>
            )}
          </View>
          <Pressable
            accessibilityLabel="Next day"
            hitSlop={12}
            onPress={() => setDateKey(addDays(dateKey, 1))}
          >
            <Ionicons name="chevron-forward" size={22} color={colors.primary} />
          </Pressable>
        </View>

        {/* One section per meal */}
        {MEAL_TYPES.map(({ key, label }) => {
          const meal = day[key];
          const totals = sumFoods(meal.foods);
          const isEmpty = meal.foods.length === 0;

          return (
            <View key={key} style={styles.section}>
              <Pressable style={styles.sectionHeader} onPress={() => openEdit(key)}>
                <Text style={styles.sectionTitle}>{label}</Text>
                <View style={styles.sectionHeaderRight}>
                  <Text style={styles.sectionCalories}>{fmt(totals.calories)} cal</Text>
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                </View>
              </Pressable>

              {!isEmpty && (
                <View style={styles.macroBar}>
                  <MacroSummary macros={totals} compact />
                </View>
              )}

              {isEmpty ? (
                <Pressable style={styles.addMeal} onPress={() => openEdit(key)}>
                  <Ionicons name="add" size={20} color={colors.primary} />
                  <Text style={styles.addMealText}>Add Meal</Text>
                </Pressable>
              ) : (
                meal.foods.map((food) => {
                  const s = scaled(food);
                  return (
                    <Pressable key={food.id} style={styles.foodCard} onPress={() => openEdit(key)}>
                      <View style={styles.foodText}>
                        <Text style={styles.foodName}>{food.name}</Text>
                        <Text style={styles.foodMeta}>
                          {food.amount} • {servingsLabel(food.servings)}
                        </Text>
                        <Text style={styles.foodMeta}>
                          {fmt(s.calories)} calories • {fmt(s.protein)} g protein
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                    </Pressable>
                  );
                })
              )}
            </View>
          );
        })}

        {/* Daily totals */}
        <View style={styles.totalsCard}>
          <Text style={styles.totalsTitle}>Daily Totals</Text>
          <TotalRow
            label="Calories"
            value={dayTotals.calories}
            target={DAILY_TARGETS.calories}
            unit="cal"
          />
          <TotalRow label="Protein" value={dayTotals.protein} target={DAILY_TARGETS.protein} unit="g" />
          <TotalRow label="Carbs" value={dayTotals.carbs} target={DAILY_TARGETS.carbs} unit="g" />
          <TotalRow label="Fat" value={dayTotals.fat} target={DAILY_TARGETS.fat} unit="g" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function TotalRow({
  label,
  value,
  target,
  unit,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
}) {
  const pct = Math.min((value / target) * 100, 100);
  const over = value > target;

  return (
    <View style={styles.totalRow}>
      <View style={styles.totalRowTop}>
        <Text style={styles.totalLabel}>{label}</Text>
        <Text style={styles.totalValue}>
          {fmt(value)} / {fmt(target)} {unit}
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${pct}%`, backgroundColor: over ? colors.sodium : colors.primary },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 },
  title: { fontSize: 30, fontWeight: '700', color: colors.ink },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 16,
  },
  dateCenter: { alignItems: 'center' },
  dateText: { fontSize: 17, fontWeight: '700', color: colors.ink },
  todayLink: { fontSize: 12, color: colors.primary, marginTop: 2, fontWeight: '600' },

  section: { marginBottom: 14 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.focusBackground,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
  sectionHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionCalories: { fontSize: 14, fontWeight: '600', color: colors.muted },
  macroBar: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 4 },

  foodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginTop: 8,
  },
  foodText: { flex: 1 },
  foodName: { fontSize: 16, fontWeight: '700', color: colors.ink },
  foodMeta: { fontSize: 13, color: colors.muted, marginTop: 2 },

  addMeal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.card,
  },
  addMealText: { fontSize: 16, fontWeight: '700', color: colors.primary },

  totalsCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginTop: 6,
  },
  totalsTitle: { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 10 },
  totalRow: { marginBottom: 12 },
  totalRowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  totalLabel: { fontSize: 14, fontWeight: '600', color: colors.ink },
  totalValue: { fontSize: 13, color: colors.muted },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.greenTrack, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
});
