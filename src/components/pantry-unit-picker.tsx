import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, fontSize } from '@/theme/tokens';

// Inventory units only. These do not imply a FatSecret serving size
// or automatically calculate nutrition.
export const PANTRY_UNITS = [
  { value: 'pieces', label: 'Pieces' },
  { value: 'servings', label: 'Servings' },
  { value: 'g', label: 'Grams (g)' },
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'oz', label: 'Ounces (oz)' },
  { value: 'lb', label: 'Pounds (lb)' },
  { value: 'ml', label: 'Milliliters (ml)' },
  { value: 'L', label: 'Liters (L)' },
  { value: 'cups', label: 'Cups' },
  { value: 'tablespoons', label: 'Tablespoons' },
  { value: 'teaspoons', label: 'Teaspoons' },
  { value: 'bags', label: 'Bags' },
  { value: 'containers', label: 'Containers' },
] as const;

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export default function PantryUnitPicker({
  value,
  onChange,
  disabled = false,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const selected = PANTRY_UNITS.find(
    (option) => option.value === value
  );

  return (
    <View>
      <Pressable
        onPress={() => setExpanded((current) => !current)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`Unit: ${selected?.label ?? 'Choose a unit'}`}
        accessibilityState={{ expanded, disabled }}
        style={[
          styles.control,
          disabled && styles.disabled,
        ]}
      >
        <Text
          style={[
            styles.controlText,
            !selected && styles.placeholder,
          ]}
        >
          {selected?.label ?? 'Choose a unit'}
        </Text>
        <Text accessible={false} style={styles.arrow}>
          {expanded ? '▴' : '▾'}
        </Text>
      </Pressable>

      {expanded && !disabled && (
        <View style={styles.options}>
          {/* Limit height so all units remain reachable on small phones. */}
          <ScrollView
            style={styles.optionScroll}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {PANTRY_UNITS.map((option) => {
              const checked = value === option.value;

              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked }}
                  onPress={() => {
                    onChange(option.value);
                    setExpanded(false);
                  }}
                  style={[
                    styles.option,
                    checked && styles.selectedOption,
                  ]}
                >
                  <Text style={styles.optionText}>
                    {option.label}
                  </Text>
                  {checked && (
                    <Text accessible={false} style={styles.check}>
                      ✓
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  control: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  controlText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  placeholder: { color: colors.textMuted },
  arrow: { color: colors.primary, fontSize: 18 },
  disabled: { opacity: 0.65 },
  options: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  optionScroll: { maxHeight: 220 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectedOption: { backgroundColor: colors.surfaceSoft },
  optionText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  check: { color: colors.primary, fontWeight: '700' },
});