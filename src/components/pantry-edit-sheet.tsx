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
import PantryUnitPicker, {
  PANTRY_UNITS,
} from '@/components/pantry-unit-picker';
import {
  removePantryItem,
  updatePantryItem,
  type PantryType,
} from '@/lib/pantry';
import type { PantryDisplayItem } from '@/lib/pantry-display';
import { colors, fontSize } from '@/theme/tokens';

type Props = {
  item: PantryDisplayItem | null;
  onClose: () => void;
  onChanged: (itemType: PantryType) => void;
};

export default function PantryEditSheet(props: Props) {
  if (!props.item) return null;

  // Unmounting the form resets all unsaved changes.
  return (
    <PantryEditForm
      key={props.item.pantry_item_id}
      item={props.item}
      onClose={props.onClose}
      onChanged={props.onChanged}
    />
  );
}

function PantryEditForm({
  item,
  onClose,
  onChanged,
}: {
  item: PantryDisplayItem;
  onClose: () => void;
  onChanged: (itemType: PantryType) => void;
}) {
  const [quantity, setQuantity] = useState(String(item.quantity));

  // Recognize older capitalization such as "Pieces".
  const [unit, setUnit] = useState(
    PANTRY_UNITS.find(
      (option) =>
        option.value.toLowerCase() === item.unit.trim().toLowerCase()
    )?.value ?? ''
  );

  const [itemType, setItemType] = useState<PantryType>(item.item_type);
  const [expiration, setExpiration] = useState(item.expiration_date ?? '');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [pending, setPending] = useState<'save' | 'remove' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Prevent repeated submissions and closing during a database request.
  const requestInProgress = useRef(false);
  const busy = pending !== null;

  function close() {
    if (!requestInProgress.current) onClose();
  }

  async function submit(action: 'save' | 'remove') {
    if (requestInProgress.current) return;

    setError(null);
    const amountText = quantity.trim().replace(',', '.');

    if (action === 'save') {
      if (!/^\d*\.?\d+$/.test(amountText)) {
        setError('Enter an amount such as 1, 2, or 0.5.');
        return;
      }

      if (!PANTRY_UNITS.some((option) => option.value === unit)) {
        setError('Choose a unit before saving.');
        return;
      }
    }

    requestInProgress.current = true;
    setPending(action);

    try {
      if (action === 'remove') {
        // Delete this batch only, even if another batch has the same food.
        await removePantryItem(item.pantry_item_id);
      } else {
        // The helper validates positive quantities and real dates.
        // Food identity and ownership remain unchanged.
        await updatePantryItem(item.pantry_item_id, {
          quantity: Number(amountText),
          unit,
          itemType,
          expirationDate: expiration.trim() || null,
        });
      }
    } catch (cause: unknown) {
      const message =
        typeof cause === 'object' &&
        cause !== null &&
        'message' in cause &&
        typeof cause.message === 'string'
          ? cause.message
          : 'Unable to update this item. Please try again.';

      setError(message);
      return;
    } finally {
      requestInProgress.current = false;
      setPending(null);
    }

    // The parent closes the form and reloads confirmed database changes.
    onChanged(action === 'save' ? itemType : item.item_type);
  }

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={close}
    >
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
                Edit pantry item
              </Text>
              <Pressable
                onPress={close}
                disabled={busy}
                accessibilityRole="button"
                style={styles.textButton}
              >
                <Text style={styles.linkText}>Cancel</Text>
              </Pressable>
            </View>

            <View style={styles.foodCard}>
              <PantryFoodImage
                image={item.image}
                name={item.detailsUnavailable ? '' : item.name}
              />
              <Text style={styles.foodName}>{item.name}</Text>
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
                  disabled={busy || confirmRemove}
                  onPress={() => setItemType(value)}
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
              editable={!busy && !confirmRemove}
              keyboardType="decimal-pad"
              accessibilityLabel="Quantity"
              style={styles.input}
            />

            <Text style={styles.label}>Unit</Text>
            <PantryUnitPicker
              value={unit}
              onChange={setUnit}
              disabled={busy || confirmRemove}
            />
            <Text style={styles.hint}>
              Amounts describe your inventory; nutrition is not
              automatically calculated.
            </Text>

            <Text style={styles.label}>Expiration date — optional</Text>
            <TextInput
              value={expiration}
              onChangeText={setExpiration}
              editable={!busy && !confirmRemove}
              accessibilityLabel="Optional expiration date, YYYY-MM-DD"
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              autoCorrect={false}
              autoCapitalize="none"
              maxLength={10}
              style={styles.input}
            />
            <Text style={styles.hint}>
              Clear this field to remove the expiration date.
            </Text>

            {error && (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            )}

            {confirmRemove ? (
              <View style={styles.confirmBox}>
                <Text style={styles.confirmTitle}>
                  Remove this item from your pantry?
                </Text>
                <Text style={styles.hint}>
                  This removes the entire saved batch, not just one serving.
                </Text>

                <Pressable
                  disabled={busy}
                  onPress={() => void submit('remove')}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: busy, busy }}
                  style={[styles.removeButton, busy && styles.disabled]}
                >
                  {pending === 'remove' ? (
                    <ActivityIndicator color={colors.onPrimary} />
                  ) : (
                    <Text style={styles.buttonText}>Remove item</Text>
                  )}
                </Pressable>

                <Pressable
                  disabled={busy}
                  onPress={() => {
                    setConfirmRemove(false);
                    setError(null);
                  }}
                  accessibilityRole="button"
                  style={styles.textButton}
                >
                  <Text style={styles.linkText}>Keep item</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Pressable
                  disabled={busy}
                  onPress={() => void submit('save')}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: busy, busy }}
                  style={[styles.saveButton, busy && styles.disabled]}
                >
                  {pending === 'save' ? (
                    <ActivityIndicator color={colors.onPrimary} />
                  ) : (
                    <Text style={styles.buttonText}>Save changes</Text>
                  )}
                </Pressable>

                <Pressable
                  disabled={busy}
                  onPress={() => {
                    setError(null);
                    setConfirmRemove(true);
                  }}
                  accessibilityRole="button"
                  style={styles.textButton}
                >
                  <Text style={styles.removeText}>Remove from pantry</Text>
                </Pressable>
              </>
            )}

            {item.fatsecret_food_id !== null && (
              <Text style={styles.attribution}>
                Food information provided by fatsecret.
              </Text>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
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
  textButton: {
    minHeight: 48,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: { color: colors.primary, fontWeight: '600' },
  foodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.surfaceSoft,
  },
  foodName: {
    flex: 1,
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
  error: { marginTop: 20, color: colors.warning },
  saveButton: {
    marginTop: 28,
    minHeight: 52,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  buttonText: { color: colors.onPrimary, fontWeight: '700' },
  disabled: { opacity: 0.65 },
  removeText: { color: colors.warning, fontWeight: '600' },
  confirmBox: {
    marginTop: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 14,
  },
  confirmTitle: { color: colors.heading, fontWeight: '700' },
  removeButton: {
    marginTop: 16,
    minHeight: 50,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.warning,
  },
  attribution: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});