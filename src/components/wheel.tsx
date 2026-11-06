import { Picker } from '@react-native-picker/picker';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';

type Props<T extends string | number> = {
  label: string;
  value: T;
  options: T[];
  onChange: (value: T) => void;
  format?: (value: T) => string;
};

// A scrolling wheel, like the hour and minute wheels when you set an alarm on an iPhone.
// Pass the SAME options array each render (use useMemo) so it stays fast.
export default function Wheel<T extends string | number>({
  label,
  value,
  options,
  onChange,
  format,
}: Props<T>) {
  const items = useMemo(
    () =>
      options.map((option) => (
        <Picker.Item
          key={String(option)}
          label={format ? format(option) : String(option)}
          value={option}
        />
      )),
    [options, format]
  );

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <Picker
        selectedValue={value}
        onValueChange={(next) => onChange(next as T)}
        style={styles.picker}
        itemStyle={styles.item}
      >
        {items}
      </Picker>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, alignItems: 'center' },
  label: { fontSize: 12, fontWeight: '700', color: colors.primary, marginBottom: 2 },
  picker: { width: '100%', height: 130 },
  item: { height: 130, fontSize: 19, color: colors.ink },
});
