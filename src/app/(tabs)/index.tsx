
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { supabase } from '@/lib/supabase';

export default function HomeScreen() {
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadUserName = async () => {
      try {
        // Get the currently signed-in user
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          if (active) setUserName('');
          return;
        }

        // Get the user's name from their saved profile
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('name')
          .eq('auth_id', user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        // Use the saved name, account metadata, or email
        const name =
          profile?.name?.trim() ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          'there';

        if (active) {
          setUserName(name);
        }
      } catch (error) {
        console.error('Error loading user name:', error);

        if (active) {
          setUserName('there');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadUserName();

    return () => {
      active = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>
          Daily Nourish
        </Text>

        <Text style={styles.subtitle}>
          {loading
            ? 'Welcome!'
            : userName
              ? `Hello, ${userName}`
              : 'Welcome!'}
        </Text>

        <Text style={styles.description}>
          Fuel your goals, one meal at a time.
        </Text>

        <Pressable
          onPress={() => router.push('/FoodSearch')}
          accessibilityRole="button"
          accessibilityLabel="Search foods"
          style={({ pressed }) => [
            styles.searchButton,
            pressed && styles.searchButtonPressed,
          ]}
        >
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchText}>Search foods</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.muted,
    marginTop: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: colors.muted,
    marginTop: 10,
    lineHeight: 24,
    textAlign: 'center',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 28,
    alignSelf: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchButtonPressed: {
    opacity: 0.8,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.muted,
  },
});
