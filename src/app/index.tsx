import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AuthPreview from '@/components/auth/auth-preview';
import { BottomTabInset } from '@/constants/theme';

// This route is now the welcome page. The future signed-in Home is a separate task.
export default function WelcomeScreen() {
  const [signedIn, setSignedIn] = useState(false);
  const { width, height } = useWindowDimensions();
  // Give the image explicit display dimensions so its 1398x1125 source size
  // cannot stretch the page. Use a smaller logo on shorter phones.
  const logoWidth = Math.max(80, Math.min(width - 48, height < 700 ? 180 : 240));
  const logoHeight = logoWidth * (1125 / 1398);

  return (
    <SafeAreaView style={styles.page}>
      {/* Scrolling accommodates small phones and larger accessibility text. */}
      <ScrollView style={styles.flex} contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          {/* Size the transparent logo explicitly while keeping its proportions. */}
          <Image
            source={require('@/assets/images/daily-nourish-logo.png')}
            accessibilityLabel="Daily Nourish logo"
            style={[styles.logo, { width: logoWidth, height: logoHeight }]}
            resizeMode="contain"
          />
          <View style={styles.hero}>
            <Text accessibilityRole="header" style={styles.heading}>
              {signedIn ? 'You’re signed in.' : 'Small steps.\nHealthier days.'}
            </Text>
            <Text style={styles.description}>
              {signedIn
                ? 'Your Daily Nourish home is coming soon.'
                : 'Build healthier habits, one day at a time.'}
            </Text>
          </View>

          {/* This existing component owns sessions and opens the full-screen forms. */}
          <AuthPreview onSignedInChange={setSignedIn} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { flex: 1, backgroundColor: '#F7F5EB' },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingTop: 12, paddingBottom: BottomTabInset + 16 },
  content: { width: '100%', maxWidth: 460, alignSelf: 'center' },
  logo: { alignSelf: 'center' },
  // A single centered intro aligns with the logo and authentication buttons.
  hero: { marginTop: 8, marginBottom: 28, alignItems: 'center' },
  heading: { color: '#243B2B', fontSize: 34, lineHeight: 40, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  description: { color: '#58665A', fontSize: 16, lineHeight: 24, textAlign: 'center', maxWidth: 290 },
});
