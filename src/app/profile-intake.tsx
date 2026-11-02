import { supabase } from '@/lib/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';

const COLORS = 
{
    background: '#f7f5ed',
    green: '#244d3f',
    text: '#244B3B',
    secondary: '#718071',
    white: '#fffdf7',
    selected: '#e9ede3',
    progressEmpty: '#ffffff',
    border: '#e5e5da',
};

const TOTAL_STEPS = 7;

const GENDERS = [
    'Female',
    'Male',
    'Non-binary',
    'Prefer not to answer',
];

const ACTIVITY_LEVELS = [
    'Very active',
    'Moderately active',
    'Lightly active',
    'Not active',
];

const MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];

//collects profile info and saves it to supabase
export default function ProfileIntakeScreen()
{
    //state variables hold values entered or selected in the form
    const [step, setStep] = useState(0);
    const initialPickerDate = new Date(1997, 8, 1);
    const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);

    const [gender, setGender] = useState('');
    const [heightft, setHeightft] = useState('');
    const [heightin, setHeightin] = useState('');
    const [weight, setWeight] = useState('');
    const [activityLevel, setActivityLevel] = useState('');
    const [goal, setGoal] = useState('');
    const [allergies, setAllergies] = useState('');
    const [restrictions, setRestrictions] = useState('')
    const [saving, setSaving] = useState(false);

    const goBack = () => {
        if(step > 0)
        {
            setStep((current) => current - 1);
        }
        else
        {
            router.back();
        }
    };

    const skipStep = () => {
        if(step < TOTAL_STEPS - 1)
        {
            setStep((current) => current + 1);
        }
    };

    //validate answers before allowing user to continue
    const validateCurrentStep = () => {
        if(step === 0 && !dateOfBirth)
        {
            Alert.alert(
                'Date of birth',
                'Please scroll to select your birthday or choose Skip',
            );
            return false;
        }

        //validate height and weight on measurement screen
        if(step === 2)
        {
            const ft = Number(heightft);
            const inches = Number(heightin);
            const lbs = Number(weight);

            if(!heightft.trim() || !heightin.trim() || !weight.trim())
            {
                Alert.alert(
                    'Height and weight',
                    'Please complete all three fields or choose Skip'
                );
                return false;
            }

            if(!Number.isInteger(ft) || !Number.isInteger(inches) || ft < 1 || ft > 8 || inches < 0 || inches > 11)
            {
                Alert.alert(
                    'Invalid height',
                    'Enter your height in ft and in'
                );
                return false;
            }

            if(!Number.isFinite(lbs) || lbs < 22 || lbs > 1100)
            {
                Alert.alert(
                    'Invalid weight',
                    'Enter a weight between 22 and 1100 pounds'
                );
                return false;
            }
        }

        //validate activity level
        if(step === 3 && !activityLevel)
        {
            Alert.alert(
                'Activity level',
                'Please select an activity level or choose Skip'
            );
            return false;
        }

        //validate goal
        if(step === 4 && !goal.trim())
        {
            Alert.alert(
                'Goal',
                'Please enter what your goal is or choose Skip'
            );
            return false;
        }
        return true;
    };

    //advance to next screen or save completed intake form
    const continueStep = async () => {
        //don't proceed when current answers are invalid
        if(!validateCurrentStep())
        {
            return;
        }

        //move to next screen unless this is the final screen
        if(step < TOTAL_STEPS - 1)
        {
            setStep((current) => current + 1);
            return;
        }

        //final screen is complete and save profile
        await saveProfile();
    };

    //save profile details and selected health goal to supabase
    const saveProfile = async () => {
        //avoid submitting form more than once at a time
        if(saving)
        {
            return;
        }

        try {
            //find the currently signed in supabase user
            const {
                data: { user },
                error: authError,
            } = await supabase.auth.getUser();

            //profile cannot be saved without an authenticated user
            if(authError || !user)
            {
                Alert.alert(
                    'Sign in required',
                    'Please sign in before saving your profile'
                );
                return;
            }

            //format the selected birthday as YYYY-MM-DD for supabase
            const formattedDateOfBirth = dateOfBirth 
                ? [
                    dateOfBirth.getFullYear(),
                    String(dateOfBirth.getMonth() + 1).padStart(2, '0'),
                    String(dateOfBirth.getDate()).padStart(2, '0'),
                  ].join('-')
                : null;


            //start with empty measurement values in case user 
            //has skipped the height and weight screen
            let heightCm: number | null = null;
            let weightKg: number | null = null;

            //convert ft and in into cm
            if(heightft.trim() && heightin.trim())
            {
                const totalInches = Number(heightft) * 12 + Number(heightin);
                heightCm = totalInches * 2.54;
            }

            //convert lbs into kgs
            if(weight.trim())
            {
                weightKg = Number(weight) * 0.45359237;
            }

            //prepare the profile info for public.users
            const profileData = {
                auth_id: user.id,

                //use account name when available otherwise use part of email before @
                name:
                    user.user_metadata?.name ??
                    user.email?.split('@')[0] ??
                    'User',
                email: user.email ?? '',

                //store actual birthday
                date_of_birth: formattedDateOfBirth,

                //save empty optional ans as null
                gender: gender || null,
                height: heightCm,
                weight: weightKg,
                activity_level: activityLevel || null,
                restrictions: restrictions.trim() || null,
            };

            //check whether the user already has a profile
            //auth_id connects public.users to auth.users
            const {
                data: existingProfile,
                error: lookupError,
            } = await supabase
              .from('users')
              .select('user_id')
              .eq('auth_id', user.id)
              .maybeSingle();
            
            if(lookupError)
            {
                throw lookupError;
            }

            //update the existing profile, or create one if the user has none yet
            if(existingProfile)
            {
                const { error: updateError } = await supabase
                  .from('users')
                  .update(profileData)
                  .eq('auth_id', user.id);

                if(updateError)
                {
                    throw updateError;
                }
            }
            else
            {
                const { error: insertError } = await supabase
                  .from('users')
                  .insert(profileData);

                if(insertError)
                {
                    throw insertError;
                }
            }
            //save selected goal only when user chose one
            if(goal)
            {
                //retrieve internal user_id from public.users
                //goals.user_id references this integer, not auth UUID
                const {
                    data: savedProfile,
                    error: profileError,
                } = await supabase
                  .from('users')
                  .select('user_id')
                  .eq('auth_id', user.id)
                  .single();
                    
                if(profileError)
                {
                    throw profileError;
                }

                //look for an existing active goal of the same type
                //prevents inserting same active goal repeatedly
                const {
                    data: existingGoal,
                    error: goalLookupError,
                } = await supabase
                  .from('goals')
                  .select('goal_id')
                  .eq('user_id', savedProfile.user_id)
                  .eq('goal_type', goal)
                  .eq('is_active', true)
                  .maybeSingle();
                    
                if(goalLookupError)
                {
                    throw goalLookupError;
                }

                //only create a new goal when one does not already exist
                if(!existingGoal)
                {
                    const today = new Date()
                      .toISOString()
                      .split('T')[0];
                        
                    const { error: goalError } = await supabase
                      .from('goals')
                      .insert({
                        //foreign kett to public.users.user_id
                        user_id: savedProfile.user_id,
                        goal_type: goal,
                        description: goal,
                        //target_calories: null,
                        //target_protein: null,
                        start_date: today,
                        //target_date omitted for right now
                        is_active: true,
                      });
                        
                    if(goalError)
                    {
                        throw goalError;
                    }
                }
            }

            //allergies ans currently collected in state but not saved here
            //saving it requires mapping the entered allergy names to allergies
            //records and inserting the matching IDs into user_allergies

            Alert.alert(
                'Profile saved',
                'Your Daily Nourish profile is ready',
                [
                    {
                        text: 'Continue',
                        onPress: () => router.replace('/(tabs)'),
                    },
                ]
            );
        } catch(error) {
            //log underlying error to help with debugging
            console.error('Error saving profile:', error);

            //show readable error message to user
            Alert.alert(
                'Unable to save profile',
                error instanceof Error
                    ? error.message
                    : 'Something went wrong. Please try again'
            );
        } finally {
            //reenable the button even if saving failed
            setSaving(false);
        }
    };

    //render a selectable option button
    const renderOption = (
        label: string,
        selected: boolean,
        onPress: () => void
    ) => (
        <Pressable
            key={label}
            onPress={onPress}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            style={[
                styles.option,
                selected && styles.selectedOption,
            ]}
        >
            <Text
                style={[
                    styles.optionText,
                    selected && styles.selectedOptionText,
                ]}
            >
                {label}
            </Text>
        </Pressable>
    );

    //screen 1: date of birth
    const renderDateOfBirth = () => (
        <>
            <Text style={styles.dateOfBirthHeading}>
                What is your date{'\n'}of birth?
            </Text>

            {/* white box containing scrolling date wheels */}
            <View style={styles.dateCard}>
                <DateTimePicker
                    //show selected birthday or default date initially
                    value={dateOfBirth ?? initialPickerDate}
                    mode="date"
                    display="spinner"

                    //allow dates from jan 1, 1900 through today
                    minimumDate={new Date(1900, 0, 1)}
                    maximumDate={new Date()}

                    //save date whenever the user changes the picker
                    onChange={(event, selectedDate) => {
                        if(event.type === 'set' && selectedDate)
                        {
                            setDateOfBirth(selectedDate);
                        }
                    }}
                    style={styles.datePicker}
                    themeVariant="light"
                />
            </View>
        </>
    );

    //screen 2: gender
    const renderGender = () => (
        <>
            <Text style={styles.genderHeading}>
                What gender best{'\n'}describes you?
            </Text>

            <View style={styles.options}>
                {GENDERS.map((item) =>
                    renderOption(
                        item,
                        gender === item,
                        () => setGender(gender === item ? '' : item)
                    )
                )}
            </View>
        </>
    );

    //screen 3: height and weight
    const renderHeightWeight = () => (
        <>
            <Text style={styles.heightWeightHeading}>
                What is your height{'\n'}and weight?
            </Text>

            <View style={styles.measurementRow}>
                <View style={styles.measurementColumn}>
                    <Text style={styles.fieldLabel}>Feet</Text>

                    <TextInput
                        style={styles.input}
                        value={heightft}
                        onChangeText={(value) =>
                            setHeightft(value.replace(/[^0-9]/g, '').slice(0, 1))
                        }
                        placeholder="5 ft"
                        placeholderTextColor={COLORS.secondary}
                        keyboardType="number-pad"
                        maxLength={1}
                    />
                </View>

                <View style={styles.measurementColumn}>
                    <Text style={styles.fieldLabel}>Inches</Text>

                    <TextInput
                        style={styles.input}
                        value={heightin}
                        onChangeText={(value) =>
                            setHeightin(value.replace(/[^0-9]/g, '').slice(0, 2))
                        }
                        placeholder="10 in"
                        placeholderTextColor={COLORS.secondary}
                        keyboardType="number-pad"
                        maxLength={2}
                    />
                </View>
            </View>

            {/* weight occupies the full width below height */}
            <View style={styles.weightSection}>
                <Text style={styles.fieldLabel}>Pounds</Text>

                <TextInput
                    style={styles.input}
                    value={weight}
                    onChangeText={(value) =>
                        setWeight(value.replace(/[^0-9.]/g, ''))
                    }
                    placeholder="150 lb"
                    placeholderTextColor={COLORS.secondary}
                    keyboardType="decimal-pad"
                />
            </View>
        </>
    );

    //screen 4: activity level
    const renderActivity = () => (
        <>
            <Text style={styles.activityLevelHeading}>
                What activity level{'\n'}best describes you?    
            </Text>

            <View style={styles.options}>
                {ACTIVITY_LEVELS.map((item) =>
                renderOption(
                    item,
                    activityLevel === item,
                    () => setActivityLevel(activityLevel === item ? '' : item)
                )
            )}
            </View>
        </>
    );

    //screen 5: health goal
    const renderGoal = () => (
        <>
            <Text style={styles.goalHeading}>
                Can you describe{'\n'}what is your goal?
            </Text>

            <Text style={styles.helperText}>
                Tell us what you want to achieve. You can type your own goal
                or one of the examples provided
            </Text>

            {/* text field for user's personal goa */}
            <View style={styles.textAreaCard}>
                <TextInput
                    style={styles.goalInput}
                    value={goal}
                    onChangeText={setGoal}
                    placeholder="Examples: Weight loss, Muscle gain,
                        Maintain weight, Heart health, Diabetes management,
                        High blood pressure management"
                    placeholderTextColor="#92988a"
                    multiline
                    textAlignVertical="top"
                />
            </View>
        </>
    );

    //screen 6: food allergies
    const renderAllergies = () => (
        <>
            <Text style={styles.allergyHeading}>
                Do you have any{'\n'}food allergies?
            </Text>

            <Text style={styles.helperText}>
                Enter any food allergies, separated by commas
            </Text>

            <TextInput
                style={styles.allergiesTextArea}
                value={allergies}
                onChangeText={setAllergies}
                placeholder="Examples: Peanuts, Shellfish, Milk"
                placeholderTextColor="#92988a"
                multiline
                textAlignVertical="top"
            />
        </>
    );

    //screen 7: dietary restrictions
    const renderRestrictions = () => (
        <>
            <Text style={styles.restrictionHeading}>
                Do you have any{'\n'}restrictions?
            </Text>

            <Text style={styles.helperText}>
                Enter any dietary restrictions or preferences on ingredients, separated by commas
            </Text>

            <TextInput
                style={styles.restrictionsTextArea}
                value={restrictions}
                onChangeText={setRestrictions}
                placeholder="Examples: Vegan, Vegetarian, halal, Onions, Pork, Cilantro"
                placeholderTextColor="#92988a"
                multiline
                textAlignVertical="top"
            />
        </>
    );

    //choose which screen to display based on current step
    const renderCurrentStep = () => {
        switch(step)
        {
            case 0:
                return renderDateOfBirth();
            
            case 1:
                return renderGender();
            
            case 2:
                return renderHeightWeight();
            
            case 3:
                return renderActivity();
            
            case 4:
                return renderGoal();
            
            case 5:
                return renderAllergies();

            case 6:
                return renderRestrictions();

            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>

            {/* keep layout visible when keyboard opens */}
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.screen}>

                    {/* top navigation row with back arrow and skip */}
                    <View style={styles.topBar}>
                        <Pressable
                            onPress={goBack}
                            style={styles.backArrow}
                            accessibilityLabel="Go back"
                        >
                            <Text style={styles.backArrowText}>‹</Text>
                        </Pressable>

                        {/* hide skip on final screen */}
                        {step < TOTAL_STEPS - 1 && (
                            <Pressable
                                onPress={skipStep}
                                style={styles.skipButton}
                            >
                                <Text style={styles.skipText}>Skip</Text>
                            </Pressable>
                        )}
                    </View>

                    {/* highlight progress segments up to current screen */}
                    <View style={styles.progressBar}>
                        {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.progressSegment,
                                    index <= step && styles.progressActive,
                                ]}
                            />
                        ))}
                    </View>

                    {/* allow longer screens to scroll if needed */}
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {renderCurrentStep()}
                    </ScrollView>

                    {/* keep navigation buttons at bottom of screen */}
                    <View style={styles.bottomButtons}>

                        {/* dont show back on the first screen */}
                        {step > 0 && (
                            <Pressable
                                onPress={goBack}
                                disabled={saving}
                                style={({ pressed }) => [
                                    styles.actionButton,
                                    styles.secondaryButton,
                                    pressed && styles.pressedButton,
                                ]}
                            >
                                <Text style={styles.buttonText}>Back</Text>
                            </Pressable>
                        )}

                        {/* continue advance the form and finish saves it */}
                        <Pressable
                            onPress={continueStep}
                            disabled={saving}
                            style={({ pressed }) => [
                                styles.actionButton,
                                styles.continueButton,
                                pressed && styles.pressedButton,
                                saving && styles.disabledButton,
                            ]}
                        >
                            <Text style={styles.buttonText}>
                                {saving
                                    ? 'Saving...'
                                    : step === TOTAL_STEPS - 1
                                        ? 'Finish'
                                        : 'Continue'}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    flex: 
    {
        flex: 1,
    },

    safeArea: 
    {
        flex: 1,
        backgroundColor: COLORS.background,
    },

    screen:
    {
        flex: 1,
        backgroundColor: COLORS.background,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 18,
    },

    //header containing back arrow and skip button
    topBar:
    {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: 30,
        marginBottom: 14,
    },

    backArrow:
    {
        width: 16,
        height: 48,
        justifyContent: 'center',
    },

    backArrowText:
    {
        fontSize: 34,
        lineHeight: 34,
        fontWeight: '700',
        color: COLORS.green,
    },

    skipButton:
    {
        paddingHorizontal: 4,
        paddingVertical: 6,
    },

    skipText:
    {
        fontSize: 18,
        color: COLORS.green,
    },

    //seven horizontal segments show progress through the questions
    progressBar:
    {
        flexDirection: 'row',
        gap: 4,
        marginBottom: 26,
    },

    progressSegment:
    {
        flex: 1,
        height: 4,
        borderRadius: 3,
        backgroundColor: COLORS.white,
    },

    progressActive:
    {
        backgroundColor: COLORS.green,
    },

    scrollContent:
    {
        flexGrow: 1,
        paddingBottom: 18,
    },
 
    dateOfBirthHeading:
    {
        fontSize: 32,
        fontWeight: '700',
        lineHeight: 35,
        color: COLORS.text,
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 25,
    },

    //size the scrolling date picker inside its white box
    datePicker:
    {
        width: '100%',
        height: 190,
        alignSelf: 'center',
    },

    //white box containing date inputs
    dateCard:
    {
        marginTop: 30,
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        borderRadius: 18,
        padding: 10,
        gap: 8,
        minHeight: 220,
    },

    genderHeading:
    {
        fontSize: 32,
        fontWeight: '700',
        lineHeight: 35,
        color: COLORS.text,
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 25,
    },

    heightWeightHeading:
    {
        fontSize: 32,
        fontWeight: '700',
        lineHeight: 35,
        color: COLORS.text,
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 25,
    },

    //side by side fields for ft and in
    measurementRow: 
    {
        flexDirection: 'row',
        gap: 18,
    },

    measurementColumn: 
    {
        flex: 1,
        marginTop: 30,
    },

    //shared styling for measurement inputs
    input: 
    {
        minHeight: 42,
        borderRadius: 9,
        backgroundColor: COLORS.white,
        paddingHorizontal: 12,
        fontSize: 15,
        color: COLORS.text,
    },

    weightSection: 
    {
        marginTop: 35,
    },

    activityLevelHeading:
    {
        fontSize: 32,
        fontWeight: '700',
        lineHeight: 35,
        color: COLORS.text,
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 25,
    },

    goalHeading:
    {
        fontSize: 32,
        fontWeight: '700',
        lineHeight: 35,
        color: COLORS.text,
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 25,
    },

    goalInput:
    {
        minHeight: 180,
        fontSize: 14,
        lineHeight: 20,
        color: COLORS.text,
        padding: 2,
        paddingTop: 0,
    },

    allergyHeading:
    {
        fontSize: 32,
        fontWeight: '700',
        lineHeight: 35,
        color: COLORS.text,
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 25,
    },

    restrictionHeading:
    {
        fontSize: 32,
        fontWeight: '700',
        lineHeight: 35,
        color: COLORS.text,
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 25,
    },

    options:
    {
        gap: 13,
        marginTop: 20,
    },

    //stack selection button vertically
    option:
    {
        minHeight: 48,
        borderRadius: 12,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: 'transparent',
    },

    //highlight the selected option
    selectedOption:
    {
        backgroundColor: COLORS.selected,
        borderColor: COLORS.green,
    },

    optionText:
    {
        fontSize: 16,
        color: COLORS.secondary,
        textAlign: 'center',
    },

    selectedOptionText:
    {
        color: COLORS.green,
        fontWeight: '600',
    },

    fieldLabel:
    {
        fontSize: 14,
        color: COLORS.secondary,
        marginBottom: 4,
        marginLeft: 5,
    },

    helperText: 
    {
        color: '#899180',
        fontSize: 11,
        lineHeight: 15,
        textAlign: 'center',
        marginTop: -5,
        marginBottom: 30,
        paddingHorizontal: 8,
    },

    //white box used to display goal options
    textAreaCard: 
    {
        backgroundColor: COLORS.white,
        borderRadius: 17,
        padding: 14,
        gap: 13,
    },
    
    //box for allergies
    allergiesTextArea: 
    {
        height: 208,
        backgroundColor: COLORS.white,
        borderRadius: 17,
        padding: 16,
        fontSize: 14,
        lineHeight: 17,
        color: COLORS.text,
        marginTop: 16,
    },

    //box for restrictions
    restrictionsTextArea:
    {
        height: 210,
        backgroundColor: COLORS.white,
        borderRadius: 17,
        padding: 16,
        fontSize: 14,
        lineHeight: 17,
        color: COLORS.text,
        marginTop: 1,
    },

    //place back and continue side by side
    bottomButtons: 
    {
        flexDirection: 'row',
        gap: 10,
        marginTop: 12,
    },

    actionButton: 
    {
        flex: 1,
        minHeight: 43,
        borderRadius: 7,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 8,
    },

    continueButton: 
    {
        backgroundColor: COLORS.green,
    },

    secondaryButton: 
    {
        backgroundColor: COLORS.green,
    },

    buttonText: 
    {
        color: COLORS.white,
        fontSize: 15,
        fontWeight: '700',
    },

    pressedButton: 
    {
        opacity: 0.8,
    },

    disabledButton: 
    {
        opacity: 0.6,
    },
});