import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
    addFoodToMeal,
    makeId,
    toDateKey,
} from '@/services/meal-log-store';
import { colors, fontSize, fontWeight } from '@/theme/tokens';
import { RecipeDetail } from '@/types/recipe';

// Mock recipe until a real source exists (the FatSecret proxy has no
// recipe.get route, and the Plan's AI meals don't carry this much detail).
// Swap this for a fetch keyed on the route's `id` param when one lands.
const MOCK_RECIPE: RecipeDetail = {
    id: 'chicken-rice-spinach-bowl',
    name: 'Chicken, Rice & Spinach Bowl',
    mealType: 'dinner',
    tags: ['Low sodium', 'Pantry-friendly'],
    image: null,
    emoji: '🥗',
    servingLabel: 'bowl',
    prepMinutes: 5,
    cookMinutes: 20,
    ingredients: [
        { name: 'Chicken breast', qty: 5, unit: 'oz' },
        { name: 'Brown rice, cooked', qty: 1, unit: 'cup' },
        { name: 'Fresh spinach', qty: 2, unit: 'cups' },
        { name: 'Olive oil & seasoning', qty: 1, unit: 'tbsp' },
    ],
    note: 'Use 1 tbsp olive oil in total, plus salt-free seasoning to taste. Rice quantity is measured cooked.',
    steps: [
        {
            title: 'Prep the ingredients',
            body: 'Pat the chicken dry. Rinse the spinach and measure the cooked rice. Season with pepper and salt-free herbs.',
        },
        {
            title: 'Cook the chicken',
            body: 'Heat half the olive oil in a skillet over medium heat. Cook the chicken for 6–8 minutes per side, until the center reaches 165°F. Rest, then slice.',
        },
        {
            title: 'Warm rice & wilt spinach',
            body: 'Warm the cooked rice until steaming. In the skillet, sauté spinach with the remaining olive oil for 1–2 minutes, until just wilted.',
        },
        {
            title: 'Build your bowl',
            body: 'Add the rice and spinach to a bowl, top with sliced chicken and finish with your preferred salt-free seasoning.',
        },
    ],
    nutrition: {
        calories: 520,
        protein: 42,
        carbs: 48,
        fat: 18,
        saturatedFat: 3,
        fiber: 5,
        sugars: 2,
        sodium: 120,
    },
};

// Trim trailing zeros from a scaled amount (e.g. 1.5 -> "1.5", 2 -> "2").
const fmtQty = (n: number) => Number(n.toFixed(2)).toString();
const round = (n: number) => Math.round(n);

export default function FoodDetailsScreen() {
    const recipe = MOCK_RECIPE;
    const [servings, setServings] = useState(1);
    const [saved, setSaved] = useState(false);

    const totalMinutes = recipe.prepMinutes + recipe.cookMinutes;
    const nut = recipe.nutrition; // the facts card stays per-serving
    const servingsWord = servings === 1 ? 'serving' : 'servings';

    const addToMealLog = () => {
        // Nutrition is stored per serving; the store scales by `servings`.
        addFoodToMeal(toDateKey(new Date()), recipe.mealType, {
            id: makeId(),
            name: recipe.name,
            amount: `1 ${recipe.servingLabel}`,
            servings,
            calories: nut.calories,
            protein: nut.protein,
            carbs: nut.carbs,
            fat: nut.fat,
        });
        router.push('/(tabs)/meal-log');
    };

    return (
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Custom header */}
            <View style={styles.header}>
                <Pressable
                    hitSlop={10}
                    onPress={() => router.back()}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <Ionicons
                        name="chevron-back"
                        size={24}
                        color={colors.heading}
                    />
                </Pressable>
                <Text style={styles.headerTitle}>Food Details</Text>
                <Pressable
                    hitSlop={10}
                    onPress={() => setSaved((s) => !s)}
                    accessibilityRole="button"
                    accessibilityLabel={saved ? 'Remove saved recipe' : 'Save recipe'}
                >
                    <Ionicons
                        name={saved ? 'bookmark' : 'bookmark-outline'}
                        size={22}
                        color={colors.primary}
                    />
                </Pressable>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero */}
                <View style={styles.hero}>
                    <View style={styles.heroImage}>
                        {recipe.image ? (
                            <Image
                                source={{ uri: recipe.image }}
                                style={styles.heroImageFill}
                                contentFit="cover"
                                transition={150}
                            />
                        ) : (
                            <Text style={styles.heroEmoji}>{recipe.emoji}</Text>
                        )}
                    </View>
                    <View style={styles.heroText}>
                        <Text style={styles.heroKicker}>
                            {recipe.mealType.toUpperCase()}
                        </Text>
                        <Text style={styles.heroTitle}>{recipe.name}</Text>
                        <Text style={styles.heroMeta}>
                            {round(nut.calories)} cal • {round(nut.protein)} g
                            protein
                        </Text>
                        {recipe.tags.length > 0 && (
                            <Text style={styles.heroTags}>
                                {recipe.tags.join(' • ')}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Prep / Cook / Total */}
                <View style={styles.timeRow}>
                    <TimeCell label="Prep" value={`${recipe.prepMinutes} min`} />
                    <View style={styles.timeDivider} />
                    <TimeCell label="Cook" value={`${recipe.cookMinutes} min`} />
                    <View style={styles.timeDivider} />
                    <TimeCell label="Total" value={`${totalMinutes} min`} />
                </View>

                {/* Ingredients */}
                <View style={styles.sectionRow}>
                    <Text style={styles.sectionTitle}>Ingredients</Text>
                    <View style={styles.stepper}>
                        <Pressable
                            hitSlop={8}
                            onPress={() =>
                                setServings((s) => Math.max(1, s - 1))
                            }
                            accessibilityRole="button"
                            accessibilityLabel="Fewer servings"
                            disabled={servings <= 1}
                        >
                            <Ionicons
                                name="remove"
                                size={18}
                                color={
                                    servings <= 1
                                        ? colors.textMuted
                                        : colors.primary
                                }
                            />
                        </Pressable>
                        <Text style={styles.stepperText}>
                            {servings} {servingsWord}
                        </Text>
                        <Pressable
                            hitSlop={8}
                            onPress={() => setServings((s) => s + 1)}
                            accessibilityRole="button"
                            accessibilityLabel="More servings"
                        >
                            <Ionicons
                                name="add"
                                size={18}
                                color={colors.primary}
                            />
                        </Pressable>
                    </View>
                </View>

                <View style={styles.list}>
                    {recipe.ingredients.map((ing) => (
                        <View key={ing.name} style={styles.ingredientRow}>
                            <View style={styles.checkCircle} />
                            <Text style={styles.ingredientName} numberOfLines={1}>
                                {ing.name}
                            </Text>
                            <Text style={styles.ingredientAmount}>
                                {fmtQty(ing.qty * servings)} {ing.unit}
                            </Text>
                        </View>
                    ))}
                </View>

                {recipe.note && <Text style={styles.note}>{recipe.note}</Text>}

                {/* How to prepare */}
                <Text style={[styles.sectionTitle, styles.blockTitle]}>
                    How to prepare
                </Text>
                {recipe.steps.map((step, i) => (
                    <View key={step.title} style={styles.step}>
                        <View style={styles.stepNum}>
                            <Text style={styles.stepNumText}>{i + 1}</Text>
                        </View>
                        <View style={styles.stepBody}>
                            <Text style={styles.stepTitle}>{step.title}</Text>
                            <Text style={styles.stepText}>{step.body}</Text>
                        </View>
                    </View>
                ))}

                {/* Nutritional facts (per serving) */}
                <Text style={[styles.sectionTitle, styles.blockTitle]}>
                    Nutritional facts
                </Text>
                <View style={styles.nutCard}>
                    <View style={styles.nutHeader}>
                        <View style={styles.nutHeaderLeft}>
                            <Text style={styles.nutPer}>
                                Per 1 serving • 1 {recipe.servingLabel}
                            </Text>
                            <Text style={styles.nutCaloriesLabel}>Calories</Text>
                        </View>
                        <Text style={styles.nutCaloriesValue}>
                            {round(nut.calories)}
                        </Text>
                    </View>

                    <View style={styles.macroStrip}>
                        <MacroCol value={`${round(nut.protein)} g`} label="Protein" />
                        <MacroCol value={`${round(nut.carbs)} g`} label="Carbs" />
                        <MacroCol value={`${round(nut.fat)} g`} label="Fat" />
                    </View>

                    <NutRow
                        label="Saturated fat"
                        value={`${round(nut.saturatedFat)} g`}
                    />
                    <NutRow label="Fiber" value={`${round(nut.fiber)} g`} />
                    <NutRow label="Total sugars" value={`${round(nut.sugars)} g`} />
                    <NutRow label="Sodium" value={`${round(nut.sodium)} mg`} last />

                    <Text style={styles.nutNote}>
                        Estimated values; may vary with ingredients and
                        preparation.
                    </Text>
                </View>
            </ScrollView>

            {/* Pinned actions */}
            <View style={styles.footer}>
                <Pressable
                    style={[styles.btn, styles.btnOutline]}
                    onPress={() => setSaved((s) => !s)}
                    accessibilityRole="button"
                >
                    <Text style={styles.btnOutlineText}>
                        {saved ? 'Saved ✓' : 'Save recipe'}
                    </Text>
                </Pressable>
                <Pressable
                    style={[styles.btn, styles.btnFilled]}
                    onPress={addToMealLog}
                    accessibilityRole="button"
                >
                    <Text style={styles.btnFilledText}>Add to Meal Log</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

function TimeCell({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.timeCell}>
            <Text style={styles.timeLabel}>{label}</Text>
            <Text style={styles.timeValue}>{value}</Text>
        </View>
    );
}

function MacroCol({ value, label }: { value: string; label: string }) {
    return (
        <View style={styles.macroCol}>
            <Text style={styles.macroValue}>{value}</Text>
            <Text style={styles.macroLabel}>{label}</Text>
        </View>
    );
}

function NutRow({
    label,
    value,
    last = false,
}: {
    label: string;
    value: string;
    last?: boolean;
}) {
    return (
        <View style={[styles.nutRow, last && styles.nutRowLast]}>
            <Text style={styles.nutRowLabel}>{label}</Text>
            <Text style={styles.nutRowValue}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    headerTitle: {
        fontSize: fontSize.xl,
        fontWeight: fontWeight.bold,
        color: colors.heading,
    },

    content: { paddingHorizontal: 20, paddingBottom: 24 },

    // Hero
    hero: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceSoft,
        borderRadius: 20,
        padding: 16,
        gap: 14,
    },
    heroImage: {
        width: 84,
        height: 84,
        borderRadius: 42,
        backgroundColor: colors.foodBackdrop,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    heroImageFill: { width: '100%', height: '100%' },
    heroEmoji: { fontSize: 40 },
    heroText: { flex: 1 },
    heroKicker: {
        fontSize: fontSize.xs,
        fontWeight: fontWeight.bold,
        letterSpacing: 0.8,
        color: colors.primary,
        marginBottom: 2,
    },
    heroTitle: {
        fontSize: fontSize.xl,
        fontWeight: fontWeight.bold,
        color: colors.heading,
    },
    heroMeta: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 4 },
    heroTags: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },

    // Time row
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: colors.borderSoft,
        marginTop: 20,
        paddingVertical: 14,
    },
    timeCell: { flex: 1, alignItems: 'center' },
    timeDivider: {
        width: 1,
        height: 28,
        backgroundColor: colors.borderSoft,
    },
    timeLabel: { fontSize: fontSize.sm, color: colors.textMuted },
    timeValue: {
        fontSize: fontSize.md,
        fontWeight: fontWeight.bold,
        color: colors.heading,
        marginTop: 3,
    },

    // Section header + stepper
    sectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 22,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
        color: colors.heading,
    },
    blockTitle: { marginTop: 24, marginBottom: 12 },
    stepper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 20,
        paddingHorizontal: 14,
        height: 36,
    },
    stepperText: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: colors.heading,
        minWidth: 64,
        textAlign: 'center',
    },

    // Ingredients
    list: { gap: 10 },
    ingredientRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 14,
        gap: 12,
    },
    checkCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: colors.controlOutline,
    },
    ingredientName: {
        flex: 1,
        fontSize: fontSize.md,
        fontWeight: fontWeight.semibold,
        color: colors.heading,
    },
    ingredientAmount: { fontSize: fontSize.base, color: colors.textMuted },
    note: {
        fontSize: fontSize.sm,
        color: colors.textMuted,
        marginTop: 12,
        lineHeight: 18,
    },

    // Steps
    step: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    stepNum: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepNumText: {
        fontSize: fontSize.sm,
        fontWeight: fontWeight.bold,
        color: colors.onPrimary,
    },
    stepBody: { flex: 1 },
    stepTitle: {
        fontSize: fontSize.md,
        fontWeight: fontWeight.bold,
        color: colors.heading,
        marginBottom: 3,
    },
    stepText: {
        fontSize: fontSize.base,
        color: colors.text,
        lineHeight: 20,
    },

    // Nutrition card
    nutCard: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        padding: 16,
    },
    nutHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    nutHeaderLeft: { flex: 1 },
    nutPer: { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: 4 },
    nutCaloriesLabel: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
        color: colors.heading,
    },
    nutCaloriesValue: {
        fontSize: 34,
        fontWeight: fontWeight.bold,
        color: colors.primary,
    },
    macroStrip: {
        flexDirection: 'row',
        backgroundColor: colors.surfaceSoft,
        borderRadius: 12,
        paddingVertical: 14,
        marginTop: 14,
        marginBottom: 6,
    },
    macroCol: { flex: 1, alignItems: 'center' },
    macroValue: {
        fontSize: fontSize.lg,
        fontWeight: fontWeight.bold,
        color: colors.heading,
    },
    macroLabel: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
    nutRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderSoft,
    },
    nutRowLast: { borderBottomWidth: 0 },
    nutRowLabel: { fontSize: fontSize.md, color: colors.text },
    nutRowValue: {
        fontSize: fontSize.md,
        fontWeight: fontWeight.semibold,
        color: colors.heading,
    },
    nutNote: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 10 },

    // Footer
    footer: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 8,
        borderTopWidth: 1,
        borderTopColor: colors.borderSoft,
        backgroundColor: colors.background,
    },
    btn: {
        flex: 1,
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnOutline: {
        borderWidth: 1.5,
        borderColor: colors.primary,
        backgroundColor: colors.surface,
    },
    btnOutlineText: {
        fontSize: fontSize.md,
        fontWeight: fontWeight.bold,
        color: colors.primary,
    },
    btnFilled: { backgroundColor: colors.primary },
    btnFilledText: {
        fontSize: fontSize.md,
        fontWeight: fontWeight.bold,
        color: colors.onPrimary,
    },
});
