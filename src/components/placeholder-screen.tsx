import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';

type Props = { title: string; children?: React.ReactNode };

// Temporary empty screen so every tab can be opened.
// Replace the contents of the screen file that uses this when you build the real screen.
export default function PlaceholderScreen({ title, children }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>This screen hasn't been built yet.</Text>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
  title: { fontSize: 30, fontWeight: '700', color: colors.ink },
  subtitle: { fontSize: 16, color: colors.muted, marginTop: 6 },
});
