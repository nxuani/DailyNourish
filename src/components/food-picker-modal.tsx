import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../constants/colors';
import { FoodResult, useFoodSearch } from '../services/fatsecret-search';
import {
    amountOptions,
    BaseServing,
    convertAmount,
    fmtAmount,
    macrosFor,
    nearest,
    parseServing,
    toMultiplier,
    Unit,
    unitsFor,
} from '../services/food-measure';
import { Food, makeId, servingsLabel } from '../services/meal-log-store';
import Wheel from './wheel';

type Props = {
  visible: boolean;
  onClose: () => void;
  onAdd: (food: Food) => void;
};

export default function FoodPickerModal({ visible, onClose, onAdd }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      {/* Only drawn while open, so every visit starts fresh. */}
      {visible && <PickerFlow onClose={onClose} onAdd={onAdd} />}
    </Modal>
  );
}

type Step = 'search' | 'amount' | 'manual';

function PickerFlow({ onClose, onAdd }: { onClose: () => void; onAdd: (food: Food) => void }) {
  const [step, setStep] = useState<Step>('search');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<FoodResult | null>(null);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {step === 'search' && (
        <SearchStep
          query={query}
          setQuery={setQuery}
          onClose={onClose}
          onPick={(food) => {
            setSelected(food);
            setStep('amount');
          }}
          onManual={() => setStep('manual')}
        />
      )}
      {step === 'amount' && selected && (
        <AmountStep
          food={selected}
          onBack={() => setStep('search')}
          onAdd={onAdd}
        />
      )}
      {step === 'manual' && <ManualStep onBack={() => setStep('search')} onAdd={onAdd} />}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Step 1: search as you type
// ---------------------------------------------------------------------------
function SearchStep({
  query,
  setQuery,
  onClose,
  onPick,
  onManual,
}: {
  query: string;
  setQuery: (q: string) => void;
  onClose: () => void;
  onPick: (food: FoodResult) => void;
  onManual: () => void;
}) {
  const { results, loading, error, retry } = useFoodSearch(query);
  const hasQuery = query.trim().length > 0;

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.title}>Add Food</Text>
        <Pressable hitSlop={10} onPress={onClose}>
          <Text style={styles.headerLink}>Cancel</Text>
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search foods, like banana or bread"
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          autoFocus
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {loading && <ActivityIndicator size="small" color={colors.primary} />}
        {!loading && hasQuery && (
          <Pressable hitSlop={10} onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        )}
      </View>

      {!hasQuery && (
        <Text style={styles.hint}>Start typing and suggestions will appear as you type.</Text>
      )}

      {hasQuery && error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={retry}>
            <Text style={styles.retry}>Try again</Text>
          </Pressable>
        </View>
      )}

      {hasQuery && !error && !loading && results.length === 0 && (
        <Text style={styles.hint}>No foods found for "{query.trim()}".</Text>
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable style={styles.resultRow} onPress={() => onPick(item)}>
            <View style={styles.resultText}>
              <Text style={styles.resultName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.resultMeta} numberOfLines={1}>
                {item.brand ? `${item.brand} • ` : ''}
                {item.serving || '1 serving'} • {Math.round(item.calories)} cal
              </Text>
              <Text style={styles.resultMeta}>
                P {Math.round(item.protein)} g • C {Math.round(item.carbs)} g • F{' '}
                {Math.round(item.fat)} g
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            <Pressable onPress={onManual}>
              <Text style={styles.manualLink}>Can't find it? Enter a food manually</Text>
            </Pressable>
            <Text style={styles.attribution}>Nutrition data provided by FatSecret</Text>
          </View>
        }
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Step 2: choose the amount and unit, with the nutrition filled in
// ---------------------------------------------------------------------------

function AmountStep({
  food,
  onBack,
  onAdd,
}: {
  food: FoodResult;
  onBack: () => void;
  onAdd: (food: Food) => void;
}) {
  const base: BaseServing = useMemo(
    () => parseServing(food.serving),
    [food.serving]
  );

  const units = useMemo(() => unitsFor(base), [base]);

  const [unit, setUnit] = useState<Unit>(base.startUnit);

  const [amount, setAmount] = useState<number>(() =>
    nearest(amountOptions(base.startUnit), base.startAmount)
  );

  // Automatically calculate nutrition whenever
  // the serving amount or unit changes.
  const multiplier = toMultiplier(unit, amount, base);

  const computed = useMemo(
    () => macrosFor(food, multiplier),
    [food, multiplier]
  );

  const amounts = amountOptions(unit);

  // Change units while preserving approximately
  // the same physical quantity.
  const changeUnit = (next: Unit) => {
    const converted = convertAmount(unit, amount, next, base);

    setUnit(next);
    setAmount(nearest(amountOptions(next), converted));
  };

  const changeAmount = (next: number) => {
    setAmount(next);
  };

  const handleAdd = () => {
    const amountText =
      unit === 'serving'
        ? servingsLabel(amount)
        : `${fmtAmount(amount)} ${unit}`;

    onAdd({
      id: makeId(),
      name: food.brand
        ? `${food.name} (${food.brand})`
        : food.name,
      amount: amountText,
      servings: 1,
      calories: computed.calories,
      protein: computed.protein,
      carbs: computed.carbs,
      fat: computed.fat,
    });
  };

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Pressable
          hitSlop={10}
          onPress={onBack}
          style={styles.backRow}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={colors.primary}
          />
          <Text style={styles.headerLink}>Search</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.amountContent}>
        <Text style={styles.foodTitle}>{food.name}</Text>

        {food.brand !== '' && (
          <Text style={styles.foodBrand}>{food.brand}</Text>
        )}

        <Text style={styles.sectionLabel}>Serving Size</Text>

        <View style={styles.wheelRow}>
          <Wheel
            label="Amount"
            value={amount}
            options={amounts}
            onChange={changeAmount}
            format={fmtAmount}
          />

          <Wheel
            label="Unit"
            value={unit}
            options={units}
            onChange={changeUnit}
          />
        </View>

        {food.serving !== '' && (
          <Text style={styles.servingNote}>
            1 serving = {food.serving}
          </Text>
        )}

        {units.length === 1 && (
          <Text style={styles.servingNote}>
            Only servings are available because this food
            does not have a convertible weight or volume.
          </Text>
        )}

        <Text style={styles.sectionLabel}>
          Nutrition for this amount
        </Text>

        <View style={styles.nutritionGrid}>
          <View style={styles.nutritionCard}>
            <Text style={styles.nutritionValue}>
              {computed.calories}
            </Text>
            <Text style={styles.nutritionLabel}>Calories</Text>
            <Text style={styles.nutritionUnit}>kcal</Text>
          </View>

          <View style={styles.nutritionCard}>
            <Text style={styles.nutritionValue}>
              {computed.protein}
            </Text>
            <Text style={styles.nutritionLabel}>Protein</Text>
            <Text style={styles.nutritionUnit}>g</Text>
          </View>

          <View style={styles.nutritionCard}>
            <Text style={styles.nutritionValue}>
              {computed.carbs}
            </Text>
            <Text style={styles.nutritionLabel}>Carbs</Text>
            <Text style={styles.nutritionUnit}>g</Text>
          </View>

          <View style={styles.nutritionCard}>
            <Text style={styles.nutritionValue}>
              {computed.fat}
            </Text>
            <Text style={styles.nutritionLabel}>Fat</Text>
            <Text style={styles.nutritionUnit}>g</Text>
          </View>
        </View>

        <Text style={styles.servingNote}>
          Nutrition values automatically update when
          you change the serving amount or unit.
        </Text>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable
          style={[styles.button, styles.buttonFilled]}
          onPress={handleAdd}
        >
          <Text style={styles.buttonFilledText}>
            Add to meal
          </Text>
        </Pressable>
      </View>
    </View>
  );
}


// ---------------------------------------------------------------------------
// Step 3 (optional): type a food in by hand
// ---------------------------------------------------------------------------
function ManualStep({ onBack, onAdd }: { onBack: () => void; onAdd: (food: Food) => void }) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [error, setError] = useState('');

  const handleAdd = () => {
    const numbers = [calories, protein, carbs, fat].map((v) => (v.trim() === '' ? 0 : Number(v)));
    if (name.trim() === '') {
      setError('Please enter a food name.');
      return;
    }
    if (numbers.some((n) => Number.isNaN(n) || n < 0)) {
      setError('Calories and nutrients must be numbers that are zero or higher.');
      return;
    }
    onAdd({
      id: makeId(),
      name: name.trim(),
      amount: amount.trim() === '' ? '1 serving' : amount.trim(),
      servings: 1,
      calories: numbers[0],
      protein: numbers[1],
      carbs: numbers[2],
      fat: numbers[3],
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={onBack} style={styles.backRow}>
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
          <Text style={styles.headerLink}>Search</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.amountContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.foodTitle}>Enter a food</Text>

        <TextInput
          style={styles.input}
          placeholder="Food name"
          placeholderTextColor={colors.muted}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Amount (for example, 1 cup)"
          placeholderTextColor={colors.muted}
          value={amount}
          onChangeText={setAmount}
        />
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, styles.inputHalf]}
            placeholder="Calories"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            value={calories}
            onChangeText={setCalories}
          />
          <TextInput
            style={[styles.input, styles.inputHalf]}
            placeholder="Protein (g)"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            value={protein}
            onChangeText={setProtein}
          />
        </View>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, styles.inputHalf]}
            placeholder="Carbs (g)"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            value={carbs}
            onChangeText={setCarbs}
          />
          <TextInput
            style={[styles.input, styles.inputHalf]}
            placeholder="Fat (g)"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            value={fat}
            onChangeText={setFat}
          />
        </View>

        {error !== '' && <Text style={styles.errorInline}>{error}</Text>}

        <Pressable style={[styles.button, styles.buttonFilled, styles.manualAdd]} onPress={handleAdd}>
          <Text style={styles.buttonFilledText}>Add to meal</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 24, fontWeight: '700', color: colors.ink },
  headerLink: { fontSize: 16, fontWeight: '600', color: colors.primary },
  backRow: { flexDirection: 'row', alignItems: 'center' },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  searchInput: { flex: 1, fontSize: 16, color: colors.ink },
  hint: { fontSize: 14, color: colors.muted, paddingHorizontal: 20, paddingVertical: 12 },

  errorBox: {
    marginHorizontal: 20,
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.sodiumTrack,
  },
  errorText: { fontSize: 14, color: '#8A3B1E' },
  retry: { fontSize: 14, fontWeight: '700', color: colors.primary, marginTop: 8 },
  errorInline: { fontSize: 13, color: '#C0392B', marginBottom: 4 },

  listContent: { paddingHorizontal: 20, paddingBottom: 24 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultText: { flex: 1, paddingRight: 8 },
  resultName: { fontSize: 16, fontWeight: '700', color: colors.ink },
  resultMeta: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  footer: { paddingTop: 20, alignItems: 'center', gap: 12 },
  manualLink: { fontSize: 14, fontWeight: '600', color: colors.primary },
  attribution: { fontSize: 11, color: colors.muted },

  amountContent: { paddingHorizontal: 20, paddingBottom: 24 },
  foodTitle: { fontSize: 24, fontWeight: '700', color: colors.ink, marginTop: 4 },
  foodBrand: { fontSize: 14, color: colors.muted, marginTop: 2 },
  sectionLabel: { fontSize: 16, fontWeight: '700', color: colors.ink, marginTop: 22 },
  wheelRow: { flexDirection: 'row', marginTop: 6 },
  servingNote: { fontSize: 12.5, color: colors.muted, marginTop: 6, textAlign: 'center' },

  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  button: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  buttonFilled: { backgroundColor: colors.primary },
  buttonFilledText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  manualAdd: { marginTop: 16 },

  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.ink,
    marginTop: 10,
  },
  inputRow: { flexDirection: 'row', gap: 10 },
  inputHalf: { flex: 1 },


nutritionGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 10,
  marginTop: 14,
},

nutritionCard: {
  width: '47%',
  backgroundColor: colors.card,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 14,
  paddingVertical: 18,
  alignItems: 'center',
},

nutritionValue: {
  fontSize: 26,
  fontWeight: '700',
  color: colors.primary,
},

nutritionLabel: {
  fontSize: 14,
  fontWeight: '600',
  color: colors.ink,
  marginTop: 4,
},

nutritionUnit: {
  fontSize: 12,
  color: colors.muted,
  marginTop: 2,
},

});
