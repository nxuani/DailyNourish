import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import { fmt, Macros } from '../services/meal-log-store';

type Props = {
  macros: Macros;
  compact?: boolean;
};

// Shows protein, carbs, and fat side by side, e.g. "42 g Protein".
export default function MacroSummary({ macros, compact = false }: Props) {
  const items = [
    { label: 'Protein', value: macros.protein },
    { label: 'Carbs', value: macros.carbs },
    { label: 'Fat', value: macros.fat },
  ];

  return (
    <View style={styles.row}>
      {items.map((item) => (
        <View key={item.label} style={styles.item}>
          <Text style={compact ? styles.valueCompact : styles.value}>{fmt(item.value)} g</Text>
          <Text style={styles.label}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 18 },
  item: { alignItems: 'flex-start' },
  value: { fontSize: 16, fontWeight: '700', color: colors.ink },
  valueCompact: { fontSize: 13, fontWeight: '700', color: colors.ink },
  label: { fontSize: 11, color: colors.muted, marginTop: 1 },
});