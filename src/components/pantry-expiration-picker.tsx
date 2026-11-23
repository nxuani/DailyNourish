import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize } from '@/theme/tokens';

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

// Calendar dates stay local; converting through UTC could change the day.
function calendarKey(date: Date): string {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')].join('-');
}

function calendarDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  return Number.isFinite(date.getTime()) && calendarKey(date) === value
    ? date : null;
}

export default function PantryExpirationPicker({
  value, onChange, disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => calendarDate(value) ?? new Date());
  const saved = calendarDate(value);
  const label = saved
    ? saved.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Set expiration date';

  function begin() {
    setDraft(calendarDate(value) ?? new Date());
    setOpen(true);
  }

  return (
    <View>
      <Pressable
        onPress={begin}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`Expiration date: ${label}`}
        accessibilityState={{ disabled, expanded: open }}
        style={[styles.control, disabled && styles.disabled]}
      >
        <Text style={styles.dateText}>{label}</Text>
        <Text accessible={false} style={styles.link}>Choose</Text>
      </Pressable>

      {value !== '' && (
        <Pressable
          disabled={disabled}
          onPress={() => { setOpen(false); onChange(''); }}
          accessibilityRole="button"
          style={styles.button}
        >
          <Text style={styles.link}>Clear date</Text>
        </Pressable>
      )}

      {open && !disabled && (
        <View style={styles.panel}>
          <DateTimePicker
            value={draft}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            themeVariant="light"
            accentColor={colors.primary}
            onValueChange={(_event, date) => {
              setDraft(date);
              if (Platform.OS !== 'ios') {
                onChange(calendarKey(date));
                setOpen(false);
              }
            }}
            onDismiss={() => setOpen(false)}
          />
          {Platform.OS === 'ios' && (
            <View style={styles.actions}>
              <Pressable
                onPress={() => setOpen(false)}
                accessibilityRole="button"
                style={styles.button}
              >
                <Text style={styles.link}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => { onChange(calendarKey(draft)); setOpen(false); }}
                accessibilityRole="button"
                style={styles.button}
              >
                <Text style={styles.link}>Use date</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
      <Text style={styles.hint}>
        Optional. Choose the date on your food or container.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  control: {
    minHeight: 50, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 10, padding: 14,
    borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    backgroundColor: colors.surface,
  },
  dateText: { flex: 1, fontSize: fontSize.md, color: colors.text },
  link: { color: colors.primary, fontWeight: '600', fontSize: fontSize.base },
  button: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' },
  panel: { marginTop: 10, padding: 6, borderRadius: 12, backgroundColor: colors.surface },
  actions: { flexDirection: 'row', justifyContent: 'space-between' },
  hint: { marginTop: 7, fontSize: fontSize.sm, lineHeight: 18, color: colors.textMuted },
  disabled: { opacity: 0.65 },
});
