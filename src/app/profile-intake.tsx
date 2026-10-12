import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';

//collects profile info and saves it to supabase
export default function ProfileIntakeScreen()
{
    const theme = useTheme();

    //state variables hold values entered or selected in the form
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('');
    const [activityLevel, setActivityLevel] = useState('');
    const [goal, setGoal] = useState('');
    const [allergies, setAllergies] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const genderOptions = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

    const activityOptions = [
        'Very active',
        'Moderately active',
        'Lightly active',
        'Not very active'
    ];

    //dont know if want to add more or have less
    const goalOptions = [
        'Weight loss',
        'Muscle gain',
        'Maintain weight',
        'Heart health',
        'Diabetes management',
        'High blood pressure management',
    ];

    //validate the form and save the info to supabase
    const handleSubmit = async () => {
        setError('');

        //prevent user from submitting the form multiple times
        if(saving)
        {
            return;
        }

        //validate age
        if(!age.trim())
        {
            setError('Please enter your age');
            return;
        }

        const ageNumber = Number(age);
        if(!Number.isInteger(ageNumber) || ageNumber < 13 || ageNumber > 120)
        {
            setError('Please enter a valid age between 13 and 120');
            return;
        }

        //validate required selections
        if(!gender)
        {
            setError('Please select your gender');
            return;
        }

        if(!activityLevel)
        {
            setError('Please select your activity level');
            return;
        }

        if(!goal)
        {
            setError('Please select a health goal');
            return;
        }

        setSaving(true);

        //get currently authenticated supabase user and their UUID
        //is stored in users.auth_is
        try
        {
            const
            {
                data: authData,
                error: authError,
            } = await supabase.auth.getUser();

            if(authError) throw authError;
            const authUser = authData.user;

            //a profile must be associated with an authenticated account
            if(!authUser)
            {
                setError('Please sign in before saving your profile');
                return;
            }

            //database stores date_of_birth rather than age
            //estimates birth date from age entered so approximate
            //because we don't ask for birthday ?
            const birthDate = new Date();
            birthDate.setFullYear(
                birthDate.getFullYear() - ageNumber,
            );

            const dateOfBirth = [
                birthDate.getFullYear(),
                String(birthDate.getMonth() + 1).padStart(2, '0'),
                String(birthDate.getDate()).padStart(2, '0'),
            ].join('-');

            //use account's name if available otherwise use part
            //of the email address before @ symbol
            const name =
                authUser.user_metadata?.full_name ??
                authUser.user_metadata?.name ??
                authUser.email?.split('@')[0] ??
                '';
            
            //check whether this authenticated user already has profile
            const 
            {
                data: existingProfile,
                error: lookUpError,
            } = await supabase
                .from('users')
                .select('user_id')
                .eq('auth_id', authUser.id)
                .maybeSingle();

            if(lookUpError) throw lookUpError;

            //prepare profile fields using your database column names
            const now = new Date().toISOString();
            const profileData = {
                auth_id: authUser.id,
                name,
                email: authUser.email ?? '',
                date_of_birth: dateOfBirth,
                gender,
                activity_level: activityLevel,
                updated_at: now,
            };

            //need the integer user_id to associate a goal with the profile
            let profileId: number;
            if(existingProfile)
            {
                //update existing profile than creating a duplicate
                const
                {
                    data: updatedProfile,
                    error: updateError,
                } = await supabase
                    .from('users')
                    .update(profileData)
                    .eq('user_id', existingProfile.user_id)
                    .select('user_id')
                    .single();
                
                if(updateError) throw updateError;
                profileId = updatedProfile.user_id;
            }
            else
            {
                //create new profile linked to authenticated account
                const
                {
                    data: newProfile,
                    error: insertError,
                } = await supabase
                    .from('users')
                    .insert({
                        ...profileData,
                        created_at: now,
                    })
                    .select('user_id')
                    .single();
                
                if(insertError) throw insertError;
                profileId = newProfile.user_id;
            }

            //save selected health goal in separate goals table
            //this creates new active goal each time this form is submitted
            const
            {
                error: goalError,
            } = await supabase
                .from('goals')
                .insert({
                    user_id: profileId,
                    goal_type: goal,
                    is_active: true,
                    start_date: new Date().toISOString().slice(0, 10),
                });
            
            if(goalError) throw goalError;

            //for now allergies are collected but not saved, later match
            //them against public.allergies and create records in public.user_allergies
            //inform user that database operations succeeded
            Alert.alert(
                'Profile Saved',
                'Your profile and health goal have been saved',
                [
                    {
                        text: 'Continue',
                        onPress: () => router.replace('/'),
                    },
                ],
            );
        } catch(err) {

            //log technical details for debugging
            console.error('Profile save failed:', err);

            //display error instead of falsely reporting success
            setError(
                err instanceof Error
                    ? err.message
                    : 'Could not save your profile. Please try again',
            );
        } finally {

            //re-enable button whether the save succeeds or fails
            setSaving(false);
        }
    };

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* screen heading and explanation */}
                    <View style={styles.header}>
                        <ThemedText type="title" style={styles.headerTitle}>
                            Your Profile
                        </ThemedText>

                        <ThemedText style={styles.headerDescription}>
                            Tell us about yourself so we can personalize
                            your nutrition recommendations
                        </ThemedText>
                    </View>

                    {/* age input */}
                    <View style={styles.section}>
                        <ThemedText type="smallBold" style={styles.label}>
                            Age
                        </ThemedText>

                        <TextInput
                            value={age}
                            onChangeText={setAge}
                            placeholder="Enter your age"
                            placeholderTextColor={theme.text}
                            keyboardType="number-pad"
                            style={[
                                styles.textInput,
                                {
                                    color: theme.text,
                                    borderColor: theme.backgroundElement,
                                    backgroundColor: theme.backgroundElement,
                                },
                            ]}
                        />
                    </View>

                    {/* gender choices */}
                    <View style={styles.section}>
                        <ThemedText type="smallBold" style={styles.label}>
                            Gender
                        </ThemedText>

                        <View style={styles.optionsContainer}>
                            {genderOptions.map((option) => (
                                <OptionButton
                                    key={option}
                                    label={option}
                                    selected={gender === option}
                                    onPress={() => setGender(option)}
                                    theme={theme}
                                />
                            ))}
                        </View>
                    </View>

                    {/* activity level choices */}
                    <View style={styles.section}>
                        <ThemedText type="smallBold" style={styles.label}>
                            Activity Level
                        </ThemedText>

                        <View style={styles.optionsContainer}>
                            {activityOptions.map((option) => (
                                <OptionButton
                                    key={option}
                                    label={option}
                                    selected={activityLevel === option}
                                    onPress={() => setActivityLevel(option)}
                                    theme={theme}
                                />
                            ))}
                        </View>
                    </View>

                    {/* health goal choices */}
                    <View style={styles.section}>
                        <ThemedText type="smallBold" style={styles.label}>
                            Health Goal
                        </ThemedText>

                        <View style={styles.optionsContainer}>
                            {goalOptions.map((option) => (
                                <OptionButton
                                    key={option}
                                    label={option}
                                    selected={goal === option}
                                    onPress={() => setGoal(option)}
                                    theme={theme}
                                />
                            ))}
                        </View>
                    </View>

                    {/* allergy input -> saving these requires additional table logical */}
                    <View style={styles.section}>
                        <ThemedText type="smallBold" style={styles.label}>
                            Food Allergies
                        </ThemedText>

                        <ThemedText type="small" style={styles.helperText}>
                            Enter any food allergies, separated by commas
                        </ThemedText>

                        <TextInput
                            value={allergies}
                            onChangeText={setAllergies}
                            placeholder="Example: peanuts, shellfish"
                            placeholderTextColor={theme.text}
                            multiline
                            style={[
                                styles.textInput,
                                styles.allergyInput,
                                {
                                    color: theme.text,
                                    borderColor: theme.backgroundElement,
                                    backgroundColor: theme.backgroundElement,
                                },
                            ]}
                        />  
                    </View>

                    {/* show validation or database errors */}
                    {error ? (
                        <ThemedText style={styles.errorText}>
                            {error}
                        </ThemedText>
                    ) : null}

                    {/* submit the form and show a loading label while saving */}
                    <Pressable
                        disabled={saving}
                        onPress={handleSubmit}
                        style={({ pressed }) => [
                            styles.continueButton,
                            (pressed || saving) && styles.buttonPressed,
                        ]}
                    >
                        <ThemedText style={styles.buttonText}>
                            {saving ? 'Saving...' : 'Continue'}
                        </ThemedText>
                    </Pressable>
                </ScrollView>
            </SafeAreaView>
        </ThemedView>
    );
}

//props used by each reuable selection button
type OptionButtonProps = {
    label: string;
    selected: boolean;
    onPress: () => void;
    theme: ReturnType<typeof useTheme>;
};

//reusable button for gender, activity level, and goal choices
function OptionButton({
    label,
    selected,
    onPress,
    theme,
}: OptionButtonProps) {
    return (
        <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={onPress}
            style={[
                styles.optionButton,
                {
                    borderColor: selected
                    ? '#3c87f7'
                    : theme.backgroundElement,
                    backgroundColor: selected
                    ? '#3c87f7'
                    : theme.backgroundElement,
                },
            ]}
        >
            <ThemedText
                style={[
                styles.optionText,
                {
                    color: selected ? '#ffffff' : theme.text,
                },
            ]}
            >
                {label}
            </ThemedText>
        </Pressable>
    );
}

//styles used throughout screen
const styles = StyleSheet.create({
    container: 
    {
        flex: 1,
    },

    safeArea: 
    {
        flex: 1,
    },

    scrollContent:
    {
        padding: 24,
        paddingBottom: 40,
    },

    header:
    {
        marginBottom: 32,
    },

    headerTitle:
    {
        fontSize: 36,
        lineHeight: 42,
        marginBottom: 12,
    },

    headerDescription:
    {
        fontSize: 16,
        lineHeight: 24,
    },

    section:
    {
        marginBottom: 28,
    },

    label:
    {
        marginBottom: 10,
    },

    helperText:
    {
        marginBottom: 10,
    },

    textInput:
    {
        minHeight: 50,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 16,
        fontSize: 16,
    },

    allergyInput:
    {
        minHeight: 90,
        paddingTop: 14,
        textAlignVertical: 'top',
    },

    optionsContainer:
    {
        gap: 10,
    },

    optionButton:
    {
        minHeight: 50,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 16,
        justifyContent: 'center',
    },

    optionText:
    {
        fontSize: 16,
        fontWeight: '500',
    },

    errorText:
    {
        color: '#d32f2f',
        marginBottom: 16,
        fontWeight: '600',
    },

    continueButton:
    {
        minHeight: 54,
        borderRadius: 12,
        backgroundColor: '#3c87f7',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },

    buttonPressed:
    {
        opacity: 0.7,
    },

    buttonText:
    {
        color: '#ffffff',
        fontSize: 17,
        fontWeight: '700',
    },
});