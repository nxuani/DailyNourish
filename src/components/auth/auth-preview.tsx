import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from './supabase';
import {
  AppState,
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
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// Keep the initial authentication palette here so the shared starter theme is untouched.
const colors = {
  cream: '#F7F5EB', green: '#315C42', ink: '#243B2B',
  muted: '#58665A', border: '#B7C4B4', white: '#FFFFFF', error: '#A12D2D',
};
type Mode = 'signup' | 'login';
type Field = 'email' | 'password' | 'confirm';

// Temporary entry buttons for testing the forms from the existing Home screen.
// A native modal covers the tabs without changing Expo Router's layout or moving routes.
export default function AuthPreview() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const signingOut = useRef(false);

  // This component stays mounted on Home, even when the form panel closes.
  // Subscribe once, restore a saved session, and clean up listeners on unmount.
  useEffect(() => {
    let active = true;
    let changed = false;
    try {
      const client = getSupabase();
      const { data: { subscription } } = client.auth.onAuthStateChange((_event, next) => {
        changed = true;
        if (active) { setSession(next); setReady(true); }
      });
      void client.auth.getSession().then(({ data, error }) => {
        if (!active) return;
        if (error) setStatus(error.message);
        if (!changed) setSession(data.session);
        setReady(true);
      }).catch(() => {
        if (active) { setStatus('Could not restore your session. Please try logging in.'); setReady(true); }
      });

      // Refresh phone sessions only while the app is in the foreground.
      function refresh(state: string) {
        if (state === 'active') client.auth.startAutoRefresh();
        else client.auth.stopAutoRefresh();
      }
      const listener = Platform.OS !== 'web'
        ? AppState.addEventListener('change', refresh)
        : null;
      if (Platform.OS !== 'web') refresh(AppState.currentState);
      return () => {
        active = false;
        subscription.unsubscribe();
        listener?.remove();
        if (Platform.OS !== 'web') client.auth.stopAutoRefresh();
      };
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Check your Supabase setup.');
      setReady(true);
    }
    return () => { active = false; };
  }, []);

  async function signOut() {
    if (signingOut.current) return;
    signingOut.current = true;
    setBusy(true);
    setStatus('');
    try {
      const { error } = await getSupabase().auth.signOut();
      if (error) throw error;
      setSession(null);
      setStatus('You are signed out.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not sign out. Try again.');
    } finally {
      signingOut.current = false;
      setBusy(false);
    }
  }

  function authenticated(next: Session) {
    setSession(next);
    setStatus('You are signed in.');
    setMode(null); // Return to the existing Home screen; intake routing comes later.
  }
  return (
    <View style={styles.entry}>
      {session ? (
        <>
          <Text style={styles.homeStatus}>Signed in as {session.user.email}</Text>
          <Pressable accessibilityRole="button" disabled={busy} style={styles.button} onPress={() => void signOut()}>
            <Text style={styles.buttonText}>{busy ? 'Signing out…' : 'Sign Out'}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Pressable accessibilityRole="button" disabled={!ready || busy} style={styles.button} onPress={() => { setStatus(''); setMode('signup'); }}>
            <Text style={styles.buttonText}>{ready ? 'Create Account' : 'Restoring session…'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={!ready || busy} style={styles.loginEntry} onPress={() => { setStatus(''); setMode('login'); }}>
            <Text style={styles.entryLink}>Log In</Text>
          </Pressable>
        </>
      )}
      {status ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.homeStatus}>{status}</Text> : null}
      <Modal
        visible={mode !== null}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => { if (!busy) setMode(null); }}
      >
        {/* A modal is a separate native surface, so measure its own safe areas. */}
        <SafeAreaProvider>
          {mode && (
            <AuthForm
              key={mode}
              mode={mode}
              onBusy={setBusy}
              onAuthenticated={authenticated}
              onSwitch={() => setMode(mode === 'signup' ? 'login' : 'signup')}
              onClose={() => setMode(null)}
            />
          )}
        </SafeAreaProvider>
      </Modal>
    </View>
  );
}

function AuthForm({ mode, onSwitch, onClose, onBusy, onAuthenticated }: {
  mode: Mode;
  onSwitch: () => void;
  onClose: () => void;
  onBusy: (value: boolean) => void;
  onAuthenticated: (session: Session) => void;
}) {
  const signup = mode === 'signup';
  // Input state is temporary. Submit sends credentials to Supabase over HTTPS.
  // The client persists session tokens, not the typed password.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  // Block rapid repeat taps before the disabled button renders.
  const pending = useRef(false);

  function update(field: Field, value: string) {
    const setters = { email: setEmail, password: setPassword, confirm: setConfirm };
    setters[field](value);
    setErrors({});
    setNotice('');
  }

  async function submit() {
    if (pending.current) return;
    const next: Partial<Record<Field, string>> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = 'Enter a valid email address.';
    }
    // Sign Up checks a proposed minimum; Login accepts any nonempty password.
    // Preserve password whitespace because it may be intentional.
    if (!password) next.password = 'Enter your password.';
    else if (signup && password.length < 8) next.password = 'Use at least 8 characters.';
    if (signup && !confirm) next.confirm = 'Confirm your password.';
    else if (signup && password !== confirm) next.confirm = 'Your passwords do not match.';
    setErrors(next);
    setNotice('');
    if (Object.keys(next).length) return;
    pending.current = true;
    setLoading(true);
    onBusy(true);
    try {
      const client = getSupabase();
      const credentials = { email: email.trim(), password };
      const { data, error } = signup
        ? await client.auth.signUp(credentials)
        : await client.auth.signInWithPassword(credentials);
      if (error) throw error;
      setPassword('');
      setConfirm('');
      if (data.session) {
        onAuthenticated(data.session);
      } else if (signup) {
        // No session is normal when email confirmation is required.
        // Avoid claiming a new account exists: Supabase can mask duplicate signups.
        setNotice('Check your email for a confirmation link. After confirming, return here and log in. If you already have an account, use Log In.');
      } else {
        setNotice('No login session was returned. Please try again.');
      }
    } catch (error) {
      // Surface failures without printing credentials or session tokens.
      setNotice(error instanceof Error ? error.message : 'Could not connect. Please try again.');
    } finally {
      pending.current = false;
      setLoading(false);
      onBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <Text style={styles.brand}>Daily Nourish</Text>
            <Text style={styles.tagline}>A little nourishment, every day.</Text>
            <View style={styles.card}>
              <Text accessibilityRole="header" style={styles.heading}>
                {signup ? 'Create Your Account' : 'Welcome Back'}
              </Text>
              <Text style={styles.description}>
                {signup ? 'Start your journey toward healthier habits.' : 'Log in to continue your nourishment journey.'}
              </Text>
              <Text style={styles.label}>Email</Text>
              <TextInput
                editable={!loading}
                accessibilityLabel="Email"
                style={[styles.input, errors.email && styles.invalid]}
                value={email}
                onChangeText={(value) => update('email', value)}
                placeholder="you@example.com"
                placeholderTextColor={colors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
              />
              {errors.email && <Text accessibilityRole="alert" style={styles.error}>{errors.email}</Text>}
              <Text style={styles.label}>Password</Text>
              <View style={[styles.passwordRow, errors.password && styles.invalid]}>
                <TextInput
                  editable={!loading}
                  accessibilityLabel="Password"
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={(value) => update('password', value)}
                  placeholder={signup ? 'At least 8 characters' : 'Enter your password'}
                  placeholderTextColor={colors.muted}
                  secureTextEntry={!visible}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete={signup ? 'new-password' : 'current-password'}
                  returnKeyType={signup ? 'next' : 'done'}
                  onSubmitEditing={signup ? undefined : () => void submit()}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={visible ? 'Hide password' : 'Show password'}
                  style={styles.textButton}
                  onPress={() => setVisible(!visible)}
                >
                  <Text style={styles.link}>{visible ? 'Hide' : 'Show'}</Text>
                </Pressable>
              </View>
              {errors.password && <Text accessibilityRole="alert" style={styles.error}>{errors.password}</Text>}
              {/* Confirmation is only needed when creating a new account. */}
              {signup && (
                <>
                  <Text style={styles.label}>Confirm Password</Text>
                  <TextInput
                    editable={!loading}
                    accessibilityLabel="Confirm Password"
                    style={[styles.input, errors.confirm && styles.invalid]}
                    value={confirm}
                    onChangeText={(value) => update('confirm', value)}
                    placeholder="Re-enter your password"
                    placeholderTextColor={colors.muted}
                    secureTextEntry={!visible}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    returnKeyType="done"
                    onSubmitEditing={() => void submit()}
                  />
                  {errors.confirm && <Text accessibilityRole="alert" style={styles.error}>{errors.confirm}</Text>}
                </>
              )}
              <Pressable accessibilityRole="button" disabled={loading} accessibilityState={{ disabled: loading, busy: loading }} onPress={() => void submit()} style={({ pressed }) => [styles.button, styles.submit, (pressed || loading) && styles.pressed]}>
                <Text style={styles.buttonText}>{loading ? 'Please wait…' : signup ? 'Create Account' : 'Log In'}</Text>
              </Pressable>
              {notice ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
              <View style={styles.footer}>
                <Text style={styles.description}>{signup ? 'Already have an account?' : 'New to Daily Nourish?'}</Text>
                <Pressable accessibilityRole="button" disabled={loading} onPress={onSwitch} style={styles.textButton}>
                  <Text style={styles.link}>{signup ? 'Log In' : 'Sign Up'}</Text>
                </Pressable>
              </View>
            </View>
            <Pressable accessibilityRole="button" disabled={loading} onPress={onClose} style={styles.textButton}>
              <Text style={styles.link}>Back to Home</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Flexible heights and scrolling accommodate smaller screens, large text, and the keyboard.
const styles = StyleSheet.create({
  flex: { flex: 1 },
  // A cream surface keeps the entry text readable on both light and dark Home themes.
  homeStatus: { color: colors.ink, backgroundColor: colors.cream, padding: 10, borderRadius: 8, textAlign: 'center', fontSize: 14 },
  loginEntry: { minHeight: 48, padding: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream, borderRadius: 12 },
  entryLink: { color: colors.green, fontSize: 15, fontWeight: '700', textDecorationLine: 'underline' },
  entry: { width: '100%', maxWidth: 460, gap: 4 },
  page: { flex: 1, backgroundColor: colors.cream },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  content: { width: '100%', maxWidth: 460, alignSelf: 'center' },
  brand: { fontSize: 32, fontWeight: '700', color: colors.green, textAlign: 'center' },
  tagline: { color: colors.muted, textAlign: 'center', marginTop: 8, marginBottom: 28, fontSize: 15 },
  card: { backgroundColor: colors.white, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: colors.border },
  heading: { fontSize: 26, fontWeight: '700', color: colors.ink, marginBottom: 8 },
  description: { color: colors.muted, fontSize: 15, lineHeight: 23 },
  label: { color: colors.ink, fontSize: 15, fontWeight: '600', marginTop: 22, marginBottom: 8 },
  input: { minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: colors.ink, fontSize: 16, backgroundColor: colors.cream },
  passwordRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.cream },
  passwordInput: { flex: 1, minWidth: 0, minHeight: 52, paddingHorizontal: 14, paddingVertical: 12, color: colors.ink, fontSize: 16 },
  textButton: { minHeight: 48, paddingHorizontal: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  link: { color: colors.green, fontWeight: '700', fontSize: 15, textDecorationLine: 'underline' },
  invalid: { borderColor: colors.error },
  error: { color: colors.error, marginTop: 6, fontSize: 14 },
  button: { backgroundColor: colors.green, borderRadius: 12, minHeight: 54, alignItems: 'center', justifyContent: 'center', padding: 14 },
  submit: { marginTop: 26 },
  buttonText: { color: colors.white, fontSize: 17, fontWeight: '700' },
  pressed: { opacity: 0.8 },
  notice: { color: colors.ink, fontSize: 14, lineHeight: 21, marginTop: 16 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', marginTop: 16 },
});
