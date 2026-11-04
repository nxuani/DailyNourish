import PantryUnitPicker, {
  PANTRY_UNITS,
} from '@/components/pantry-unit-picker';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
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

import PantryFoodImage from '@/components/pantry-food-image';
import type { FoodSearchItem } from '@/lib/fatsecret';
import { addPantryItem, type PantryType } from '@/lib/pantry';
import { colors, fontSize } from '@/theme/tokens';

type Props = {
  // Null means the sheet is closed.
  food: FoodSearchItem | null;
  initialType: PantryType;
  onClose: () => void;
  onSaved: () => void;
};

// Keeping the form inside this conditional modal resets its fields
// whenever it is closed and opened again.
export default function PantryAddSheet(props: Props) {
  if (!props.food) return null;

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={props.onClose}
    >
      <PantryAddForm
        key={props.food.id}
        food={props.food}
        initialType={props.initialType}
        onClose={props.onClose}
        onSaved={props.onSaved}
      />
    </Modal>
  );
}

function PantryAddForm({
  food,
  initialType,
  onClose,
  onSaved,
}: {
  food: FoodSearchItem;
  initialType: PantryType;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [quantity, setQuantity] = useState('1');
  // Prepared meals start with servings.
  // Ingredients require the user to choose a unit.
  const [unit, setUnit] = useState(
    initialType === 'prepared_meal' ? 'servings' : ''
  );
  const [itemType, setItemType] = useState<PantryType>(initialType);
  const [expiration, setExpiration] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A ref blocks a second tap immediately, before React rerenders.
  const saveInProgress = useRef(false);

  async function save() {
    if (saveInProgress.current) return;

    setError(null);
    // Only accept units available in the picker.
    if (!PANTRY_UNITS.some((option) => option.value === unit)) {
      setError('Choose a unit before saving.');
      return;
    }

    // Accept decimal amounts such as 0.5 or 1,5.
    // Reject scientific notation or other unexpected formats.
    const amountText = quantity.trim().replace(',', '.');

    if (!/^\d*\.?\d+$/.test(amountText)) {
      setError('Enter an amount such as 1, 2, or 0.5.');
      return;
    }

    saveInProgress.current = true;
    setSaving(true);

    try {
      // The helper validates positive amounts, units, and calendar dates.
      // Only the food ID and user-entered pantry details are persisted.
      await addPantryItem({
        fatsecretFoodId: String(food.id),
        quantity: Number(amountText),
        unit,
        itemType,
        expirationDate: expiration.trim() || null,
      });
    } catch (cause: unknown) {
      const message =
        typeof cause === 'object' &&
        cause !== null &&
        'message' in cause &&
        typeof cause.message === 'string'
          ? cause.message
          : 'Unable to save this item. Please try again.';

      setError(message);
      return;
    } finally {
      saveInProgress.current = false;
      setSaving(false);
    }

    // Notify the parent only after the database confirms success.
    onSaved();
  }

  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>
              Add to pantry
            </Text>
            <Pressable
              onPress={onClose}
              disabled={saving}
              accessibilityRole="button"
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>

          <View style={styles.foodCard}>
            <PantryFoodImage
              image={food.image}
              name={food.name}
            />
            <View style={styles.foodText}>
              <Text style={styles.foodName}>{food.name}</Text>
              {food.brand ? (
                <Text style={styles.hint}>{food.brand}</Text>
              ) : null}
            </View>
          </View>

          <Text style={styles.label}>Save under</Text>
          <View style={styles.typeRow}>
            {(
              [
                ['ingredient', 'Ingredients'],
                ['prepared_meal', 'Meals & Leftovers'],
              ] as const
            ).map(([value, label]) => (
              <Pressable
                key={value}
                onPress={() => setItemType(value)}
                disabled={saving}
                accessibilityRole="radio"
                accessibilityState={{ checked: itemType === value }}
                style={[
                  styles.typeButton,
                  itemType === value && styles.selectedType,
                ]}
              >
                <Text
                  style={[
                    styles.typeText,
                    itemType === value && styles.selectedText,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Quantity</Text>
          <TextInput
            value={quantity}
            onChangeText={setQuantity}
            editable={!saving}
            keyboardType="decimal-pad"
            accessibilityLabel="Quantity"
            placeholder="For example, 2"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          <Text style={styles.label}>Unit</Text>
          <PantryUnitPicker
            value={unit}
            onChange={setUnit}
            disabled={saving}
          />
          <Text style={styles.hint}>
            Describe how much you have. This amount is not automatically
            converted into nutrition values.
          </Text>

          <Text style={styles.label}>Expiration date — optional</Text>
          <TextInput
            value={expiration}
            onChangeText={setExpiration}
            editable={!saving}
            accessibilityLabel="Optional expiration date, YYYY-MM-DD"
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
            autoCapitalize="none"
            maxLength={10}
            style={styles.input}
          />
          <Text style={styles.hint}>
            Leave blank if unknown. Use the date on your food or container.
          </Text>

          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : null}

          <Pressable
            onPress={() => void save()}
            disabled={saving}
            accessibilityRole="button"
            accessibilityState={{ disabled: saving, busy: saving }}
            style={[
              styles.saveButton,
              saving && styles.disabled,
            ]}
          >
            {saving ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.saveText}>Add to pantry</Text>
            )}
          </Pressable>

          <Text style={styles.attribution}>
            Food information provided by fatsecret.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.heading,
  },
  cancelButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  cancelText: { color: colors.primary, fontWeight: '600' },
  foodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.surfaceSoft,
  },
  foodText: { flex: 1 },
  foodName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.heading,
  },
  label: {
    marginTop: 24,
    marginBottom: 9,
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.heading,
  },
  input: {
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: fontSize.md,
  },
  hint: {
    marginTop: 7,
    fontSize: fontSize.sm,
    lineHeight: 18,
    color: colors.textMuted,
  },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeButton: {
    flex: 1,
    minHeight: 48,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.surfaceSoft,
  },
  selectedType: { backgroundColor: colors.primary },
  typeText: {
    textAlign: 'center',
    fontWeight: '600',
    color: colors.text,
    fontSize: fontSize.base,
  },
  selectedText: { color: colors.onPrimary },
  error: {
    marginTop: 20,
    color: colors.warning,
    fontSize: fontSize.md,
  },
  saveButton: {
    marginTop: 28,
    minHeight: 52,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  saveText: {
    color: colors.onPrimary,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  disabled: { opacity: 0.65 },
  attribution: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});