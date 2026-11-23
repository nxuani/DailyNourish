import { colors } from '@/constants/colors';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const PROFILE_SETTINGS = [
  {
    title: 'Profile',
    value: 'Edit profile',
  },
  {
    title: 'Activity Level',
    value: 'Not set',
  },
  {
    title: 'Meal Generation',
    value: 'Edit',
  },
  {
    title: 'Goal',
    value: 'Not set',
  },
  {
    title: 'Allergies',
    value: 'Not set',
  },
  {
    title: 'Restrictions',
    value: 'Not set',
  },
  {
    title: "Favorites",
    value: 'View recipes',
  },
  {
    title: 'Your Recipes',
    value: 'Add recipes',
  },
  {
    title: 'Appearance',
    value: 'Light mode',
  },
];

export default function ProfileScreen()
{
  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try
            {
              console.log('Profile logout button pressed');
              const { error } = await supabase.auth.signOut();
              if(error)
              {
                Alert.alert('Logout Failed', error.message);
                return;
              }
              console.log('Supabase signout completed');

              const { data: { session }, error: sessionError, } = await supabase.auth.getSession();

              if(sessionError)
              {
                Alert.alert('Session Check Failed', sessionError.message);
                return;
              }
              console.log('Session exits after logout:', session !== null);

              if(session !== null)
              {
                Alert.alert(
                  'Logout Check',
                  'Your session still exits after signing out'
                );
                return;
              }
              console.log('Logout successful. Root layout will redirect');
            }
            catch(error)
            {
              Alert.alert(
                'Logout failed',
                error instanceof Error ? error.message : 'Something went wrong'
              );
            }
          }
        },
      ]
    );
  };
  
  const handleSettingPress = (setting: string) => {
    Alert.alert(
      setting,
      'This settings page will be available as we build the Profile section'
    );
  };
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* page heading */}
        <View style={styles.headingContainer}>
          <Text style={styles.heading}>Profile</Text>
          <Text style={styles.subtitle}>
            A healthier you, on your terms
          </Text>
        </View>

        {/* profile settings */}
        <View style={styles.settingsContainer}>
          {PROFILE_SETTINGS.map((setting, index) => (
            <Pressable
                key={setting.title}
                onPress={() => handleSettingPress(setting.title)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.settingCard,
                  pressed && styles.pressedCard,
                ]}
              >

                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>
                    {setting.title}
                  </Text>
                </View>

                <View style={styles.settingRight}>
                  <Text style={styles.settingValue}>
                    {setting.value}
                  </Text>

                  <Text style={styles.arrow}>›</Text>
                </View>
              </Pressable>
          ))}
        </View>

        {/* log out button */}
        <Pressable
          onPress={handleLogout}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.pressedCard,
          ]}
        >
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

//styles for profile screen
const styles = StyleSheet.create({
  //main screen background and layout
  container:
  {
    flex: 1,
    backgroundColor: colors.background,
  },

  //controls padding around scrollable content
  scrollContent:
  {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.six,
  },

  //adds space below heading and subtitle
  headingContainer:
  {
    marginBottom: Spacing.four,
  },

  //main profile heading
  heading:
  {
    fontSize: 30,
    fontWeight: '700',
    color: colors.ink,
  },

  //subtitle underneath profile heading
  subtitle:
  {
    fontSize: 15,
    color: colors.muted,
    marginTop: Spacing.one,
  },

  //adds vertical spacing between setting cards
  settingsContainer:
  {
    gap: Spacing.three,
  },

  //apperance and layout of each individual setting card
  settingCard:
  {
    minHeight: 82,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  //background color displayed while card being pressed
  pressedCard:
  {
    backgroundColor: colors.focusBackground,
  },

  //allows title and description to use available card space
  settingTextContainer:
  {
    flex: 1,
    paddingRight: Spacing.two,
  },

  //style for each setting title
  settingTitle:
  {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },

  //aligns current value and arrow on right side
  settingRight:
  {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },

  //style for current setting value
  settingValue:
  {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },

  //naviagtion arrow displayed on each card
  arrow:
  {
    fontSize: 25,
    color: colors.primary,
  },

  logoutButton:
  {
    marginTop: Spacing.four,
    minHeight: 60,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
  },

  logoutText:
  {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
});
