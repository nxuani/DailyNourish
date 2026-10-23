import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

// Placeholder name. Replace with user's name later
const userName = 'Name';

export default function HomeScreen() {
  return (

    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>

        <ThemedView style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Daily Nourish
          </ThemedText>
          <ThemedText type="subtitle">Hello, {userName}</ThemedText>
          <ThemedText style={styles.description}>
            Fuel your goals, one meal at a time.
          </ThemedText>
        </ThemedView>

        {/* <Pressable
          accessibilityRole="button"
          onPress={() => 
          {
            console.log('Set up my profile button pressed');
            router.push('/profile-intake')
          }}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
        >
          <ThemedText style={styles.buttonText}>
            Set up my profile
          </ThemedText>
        </Pressable> */}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.five,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  title: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#367A58',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonPressed:
  {
    opacity: 0.75,
  },
  buttonText:
  {
    color: '#ffffff',
    fontWeight: '600'
  },
});
