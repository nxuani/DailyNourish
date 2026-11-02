import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, fontWeight } from '../theme/tokens';

type Props = {
  dates: Date[];
  selected: number;
  onSelect: (index: number) => void;
};

export default function DayPicker({ dates, selected, onSelect }: Props) {
  return (
    <View style={styles.row}>
      {dates.map((d, i) => {
        const active = i === selected;
        return (
          <Pressable
            key={i}
            onPress={() => onSelect(i)}
            style={[styles.day, active && styles.dayActive]}
          >
            <Text style={[styles.label, active && styles.textActive]}>
              {d.toLocaleDateString('en-US', { weekday: 'short' })}
            </Text>
            <Text style={[styles.num, active && styles.textActive]}>
              {d.getDate()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 20,
    padding: 8,
    marginBottom: 16,
  },
  day: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 8, borderRadius: 12 },
  dayActive: { backgroundColor: colors.primary },
  label: { fontSize: fontSize.sm, color: colors.textMuted },
  num: { fontSize: fontSize.md, color: colors.textMuted, marginTop: 2 },
  textActive: { color: colors.onPrimary, fontWeight: fontWeight.bold },
});