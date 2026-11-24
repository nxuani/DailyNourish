import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import PantryUnitPicker from '@/components/pantry-unit-picker';
import {
    getFoodById,
    getRecipeById,
    searchFoods,
    type FoodSearchItem,
    type RecipeDetail,
} from '@/lib/fatsecret';
import { matchFoodIcon } from '@/lib/foodIcon';
import {
    convertPantryQuantity,
    pantryServingMultiplier,
    pantryUnitOptions,
} from '@/lib/pantry-nutrition';
import {
    addFoodToMeal,
    makeId,
    toDateKey,
    type MealType,
} from '@/services/meal-log-store';
import { colors, fontSize, fontWeight } from '@/theme/tokens';

type Nutrition = {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    saturatedFat: number | null;
    fiber: number | null;
    sugars: number | null;
    sodium: number | null;
};

// Round for display; show a dash when a value is missing.
const round = (n: number | null | undefined) =>
    n == null ? '—' : String(Math.round(n));
// Trim trailing zeros from a scaled amount (1.5 -> "1.5", 2 -> "2").
const fmtQty = (n: number) => Number(n.toFixed(2)).toString();

// No meal picker in this pass — slot the food by time of day.
function currentMealType(): MealType {
    const h = new Date().getHours();
    if (h < 11) return 'breakfast';
    if (h < 16) return 'lunch';
    if (h < 21) return 'dinner';
    return 'snack';
}

const iconFor = (name: string) => matchFoodIcon(name) ?? '🍽️';

// Scale a food's per-serving nutrition by a serving multiplier (null-safe).
function scaleNutrition(food: FoodSearchItem, mult: number): Nutrition {
    const s = (v: number | null | undefined) =>
        typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v * mult : null;
    return {
        calories: s(food.calories),
        protein: s(food.protein),
        carbs: s(food.carbs),
        fat: s(food.fat),
        saturatedFat: s(food.saturatedFat),
        fiber: s(food.fiber),
        sugars: s(food.sugars),
        sodium: s(food.sodium),
    };
}

export default function FoodDetailsScreen() {
    // type=recipe → full breakdown; type=food → nutrition only.
    // A food opens by id (from a search result) or by name (a curated
    // ingredient, which has no FatSecret id until we look it up).
    const params = useLocalSearchParams<{
        type?: string;
        id?: string;
        name?: string;
    }>();
    const type = params.type === 'recipe' ? 'recipe' : 'food';
    const id = params.id;
    const name = params.name;

    const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
    const [food, setFood] = useState<FoodSearchItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);

    const [saved, setSaved] = useState(false);
    // Which recipe ingredients the user has ticked off ("I have this").
    const [checked, setChecked] = useState<Set<number>>(() => new Set());

    // Food: an amount + unit the user can change; nutrition recalculates live.
    const [amount, setAmount] = useState('1');
    const [unit, setUnit] = useState('servings');

    const unitOptions = useMemo(() => pantryUnitOptions(food), [food]);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            setError(null);
            setRecipe(null);
            setFood(null);
            try {
                if (type === 'recipe' && id) {
                    const r = await getRecipeById(id);
                    if (!cancelled) setRecipe(r);
                } else if (type === 'food' && id) {
                    const f = await getFoodById(id);
                    if (!cancelled) {
                        setFood(f);
                        // Start at "1 <natural unit>" for the just-loaded food.
                        setUnit(pantryUnitOptions(f)[0]?.value ?? 'servings');
                        setAmount('1');
                    }
                } else if (type === 'food' && name) {
                    // Curated ingredient: resolve the name to a generic food.
                    const res = await searchFoods(name, {
                        foodType: 'generic',
                        maxResults: 1,
                    });
                    if (!cancelled) {
                        const f = res.results[0];
                        if (f) {
                            setFood(f);
                            setUnit(
                                pantryUnitOptions(f)[0]?.value ?? 'servings'
                            );
                            setAmount('1');
                        } else
                            setError(
                                'No nutrition info found for this ingredient.'
                            );
                    }
                } else if (!cancelled) {
                    setError('Nothing to show.');
                }
            } catch (e) {
                if (!cancelled)
                    setError(
                        e instanceof Error ? e.message : 'Something went wrong'
                    );
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, [type, id, name, reloadKey]);

    const isRecipe = !!recipe;
    const title = recipe?.name ?? food?.name ?? '';

    // --- Food: live multiplier + scaled nutrition from the chosen amount/unit.
    const amountNum = parseFloat(amount);
    const foodMultiplier =
        food && Number.isFinite(amountNum)
            ? pantryServingMultiplier(food, amountNum, unit)
            : null;
    const unitLabel =
        unitOptions.find((o) => o.value === unit)?.label ?? unit;

    // Per-serving nutrition for the facts card.
    const nutrition: Nutrition | null = recipe
        ? recipe.nutrition
        : food
          ? scaleNutrition(food, foodMultiplier ?? 0)
          : null;

    // Switch units but keep the same physical amount (1 serving -> 100 g).
    const onUnitChange = (next: string) => {
        if (food && Number.isFinite(amountNum)) {
            const converted = convertPantryQuantity(
                food,
                amountNum,
                unit,
                next
            );
            if (converted != null) setAmount(fmtQty(converted));
        }
        setUnit(next);
    };

    const image = recipe?.image ?? food?.image ?? null;
    const kicker = recipe
        ? (recipe.types[0] ?? 'Recipe').toUpperCase()
        : (
              food?.brand ?? (food?.type === 'brand' ? 'Food' : 'Ingredient')
          ).toUpperCase();
    const heroSubtitle =
        recipe?.description ?? (food?.serving ? `Per ${food.serving}` : null);

    const totalMinutes =
        recipe && (recipe.prepMinutes != null || recipe.cookMinutes != null)
            ? (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0)
            : null;
    const showTimes =
        !!recipe && (recipe.prepMinutes != null || recipe.cookMinutes != null);

    const factsLabel = recipe
        ? 'Per 1 serving'
        : `Per ${amount || '0'} ${unitLabel}`;

    const addToMealLog = () => {
        if (!nutrition) return;
        if (isRecipe) {
            addFoodToMeal(toDateKey(new Date()), currentMealType(), {
                id: makeId(),
                name: title,
                amount: '1 serving',
                servings: 1,
                calories: recipe!.nutrition.calories ?? 0,
                protein: recipe!.nutrition.protein ?? 0,
                carbs: recipe!.nutrition.carbs ?? 0,
                fat: recipe!.nutrition.fat ?? 0,
            });
        } else if (food && foodMultiplier && foodMultiplier > 0) {
            // Store scales per-serving nutrition by `servings`; the multiplier
            // is how many base servings the chosen amount equals.
            addFoodToMeal(toDateKey(new Date()), currentMealType(), {
                id: makeId(),
                name: title,
                amount: `${amount} ${unitLabel}`,
                servings: foodMultiplier,
                calories: food.calories ?? 0,
                protein: food.protein ?? 0,
                carbs: food.carbs ?? 0,
                fat: food.fat ?? 0,
            });
        } else {
            return;
        }
        router.push('/(tabs)/meal-log');
    };

    const canAdd = isRecipe || !!(foodMultiplier && foodMultiplier > 0);

    const toggleChecked = (i: number) =>
        setChecked((prev) => {
            const next = new Set(prev);
            if (next.has(i)) next.delete(i);
            else next.add(i);
            return next;
        });

    return (
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <Pressable
                    hitSlop={10}
                    onPress={() => router.back()}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <Ionicons name="chevron-back" size={24} color={colors.heading} />
                </Pressable>
                <Text style={styles.headerTitle}>Food Details</Text>
                {isRecipe ? (
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
                ) : (
                    <View style={styles.headerSpacer} />
                )}
            </View>

            {loading ? (
                <View style={styles.centerBox}>
                    <ActivityIndicator color={colors.primary} />
                </View>
            ) : error ? (
                <View style={styles.centerBox}>
                    <Text style={styles.errorText}>{error}</Text>
                    <Pressable
                        onPress={() => setReloadKey((k) => k + 1)}
                        style={styles.retryButton}
                    >
                        <Text style={styles.retryText}>Try again</Text>
                    </Pressable>
                </View>
            ) : !nutrition ? (
                <View style={styles.centerBox}>
                    <Text style={styles.emptyText}>Nothing to show.</Text>
                </View>
            ) : (
                <>
                    <ScrollView
                        contentContainerStyle={styles.content}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Hero */}
                        <View style={styles.hero}>
                            <View style={styles.heroImage}>
                                {image ? (
                                    <Image
                                        source={{ uri: image }}
                                        style={styles.heroImageFill}
                                        contentFit="cover"
                                        transition={150}
                                    />
                                ) : (
                                    <Text style={styles.heroEmoji}>
                                        {iconFor(title)}
                                    </Text>
                                )}
                            </View>
                            <View style={styles.heroText}>
                                <Text style={styles.heroKicker}>{kicker}</Text>
                                <Text style={styles.heroTitle}>{title}</Text>
                                <Text style={styles.heroMeta}>
                                    {round(nutrition.calories)} cal •{' '}
                                    {round(nutrition.protein)} g protein
                                </Text>
                                {heroSubtitle ? (
                                    <Text
                                        style={styles.heroSubtitle}
                                        numberOfLines={2}
                                    >
                                        {heroSubtitle}
                                    </Text>
                                ) : null}
                            </View>
                        </View>

                        {/* Prep / Cook / Total (recipe only) */}
                        {showTimes && (
                            <View style={styles.timeRow}>
                                <TimeCell
                                    label="Prep"
                                    value={
                                        recipe!.prepMinutes != null
                                            ? `${recipe!.prepMinutes} min`
                                            : '—'
                                    }
                                />
                                <View style={styles.timeDivider} />
                                <TimeCell
                                    label="Cook"
                                    value={
                                        recipe!.cookMinutes != null
                                            ? `${recipe!.cookMinutes} min`
                                            : '—'
                                    }
                                />
                                <View style={styles.timeDivider} />
                                <TimeCell
                                    label="Total"
                                    value={
                                        totalMinutes != null
                                            ? `${totalMinutes} min`
                                            : '—'
                                    }
                                />
                            </View>
                        )}

                        {/* Food: amount + unit (nutrition recalculates live) */}
                        {!isRecipe && (
                            <View style={styles.amountBlock}>
                                <Text style={styles.sectionTitle}>Amount</Text>
                                <View style={styles.amountRow}>
                                    <TextInput
                                        style={styles.amountInput}
                                        value={amount}
                                        onChangeText={setAmount}
                                        keyboardType="decimal-pad"
                                        placeholder="1"
                                        placeholderTextColor={colors.textMuted}
                                        accessibilityLabel="Amount"
                                    />
                                    <View style={styles.amountUnit}>
                                        <PantryUnitPicker
                                            value={unit}
                                            onChange={onUnitChange}
                                            options={unitOptions.map((o) => ({
                                                value: o.value,
                                                label: o.label,
                                            }))}
                                        />
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Recipe: Ingredients (real measurement text) */}
                        {isRecipe && recipe!.ingredients.length > 0 && (
                            <>
                                <View style={styles.sectionRow}>
                                    <Text style={styles.sectionTitle}>
                                        Ingredients
                                    </Text>
                                    {recipe!.servings ? (
                                        <Text style={styles.makesCaption}>
                                            Makes {recipe!.servings}{' '}
                                            {recipe!.servings === 1
                                                ? 'serving'
                                                : 'servings'}
                                        </Text>
                                    ) : null}
                                </View>

                                <View style={styles.list}>
                                    {recipe!.ingredients.map((ing, i) => {
                                        // Prefer FatSecret's human text ("3 1/4
                                        // cups crushed tomatoes"); its number +
                                        // unit fields are often junk like
                                        // "3.25 serving".
                                        const line =
                                            ing.description?.trim() ||
                                            [
                                                ing.quantity != null
                                                    ? fmtQty(ing.quantity)
                                                    : null,
                                                ing.unit,
                                                ing.name,
                                            ]
                                                .filter(Boolean)
                                                .join(' ') ||
                                            ing.name ||
                                            '';
                                        const isChecked = checked.has(i);
                                        return (
                                            <View
                                                key={`${ing.foodId ?? ing.name ?? i}-${i}`}
                                                style={styles.ingredientRow}
                                            >
                                                <Pressable
                                                    onPress={() =>
                                                        toggleChecked(i)
                                                    }
                                                    hitSlop={8}
                                                    accessibilityRole="checkbox"
                                                    accessibilityState={{
                                                        checked: isChecked,
                                                    }}
                                                    accessibilityLabel={line}
                                                    style={[
                                                        styles.checkCircle,
                                                        isChecked &&
                                                            styles.checkCircleOn,
                                                    ]}
                                                >
                                                    {isChecked && (
                                                        <Ionicons
                                                            name="checkmark"
                                                            size={14}
                                                            color={
                                                                colors.onPrimary
                                                            }
                                                        />
                                                    )}
                                                </Pressable>
                                                <Text
                                                    style={[
                                                        styles.ingredientText,
                                                        isChecked &&
                                                            styles.ingredientTextChecked,
                                                    ]}
                                                >
                                                    {line}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            </>
                        )}

                        {/* How to prepare (recipe only) */}
                        {isRecipe && recipe!.steps.length > 0 && (
                            <>
                                <Text
                                    style={[styles.sectionTitle, styles.blockTitle]}
                                >
                                    How to prepare
                                </Text>
                                {recipe!.steps.map((step, i) => (
                                    <View key={i} style={styles.step}>
                                        <View style={styles.stepNum}>
                                            <Text style={styles.stepNumText}>
                                                {step.number ?? i + 1}
                                            </Text>
                                        </View>
                                        <Text style={styles.stepText}>
                                            {step.text}
                                        </Text>
                                    </View>
                                ))}
                            </>
                        )}

                        {/* Nutritional facts (both variants) */}
                        <Text style={[styles.sectionTitle, styles.blockTitle]}>
                            Nutritional facts
                        </Text>
                        <View style={styles.nutCard}>
                            <View style={styles.nutHeader}>
                                <View style={styles.nutHeaderLeft}>
                                    <Text style={styles.nutPer}>
                                        {factsLabel}
                                    </Text>
                                    <Text style={styles.nutCaloriesLabel}>
                                        Calories
                                    </Text>
                                </View>
                                <Text style={styles.nutCaloriesValue}>
                                    {round(nutrition.calories)}
                                </Text>
                            </View>

                            <View style={styles.macroStrip}>
                                <MacroCol
                                    value={`${round(nutrition.protein)} g`}
                                    label="Protein"
                                />
                                <MacroCol
                                    value={`${round(nutrition.carbs)} g`}
                                    label="Carbs"
                                />
                                <MacroCol
                                    value={`${round(nutrition.fat)} g`}
                                    label="Fat"
                                />
                            </View>

                            <NutRow
                                label="Saturated fat"
                                value={`${round(nutrition.saturatedFat)} g`}
                            />
                            <NutRow
                                label="Fiber"
                                value={`${round(nutrition.fiber)} g`}
                            />
                            <NutRow
                                label="Total sugars"
                                value={`${round(nutrition.sugars)} g`}
                            />
                            <NutRow
                                label="Sodium"
                                value={`${round(nutrition.sodium)} mg`}
                                last
                            />

                            <Text style={styles.nutNote}>
                                Estimated values; may vary with ingredients and
                                preparation.
                            </Text>
                        </View>
                    </ScrollView>

                    {/* Pinned actions */}
                    <View style={styles.footer}>
                        {isRecipe && (
                            <Pressable
                                style={[styles.btn, styles.btnOutline]}
                                onPress={() => setSaved((s) => !s)}
                                accessibilityRole="button"
                            >
                                <Text style={styles.btnOutlineText}>
                                    {saved ? 'Saved ✓' : 'Save recipe'}
                                </Text>
                            </Pressable>
                        )}
                        <Pressable
                            style={[
                                styles.btn,
                                styles.btnFilled,
                                !canAdd && styles.btnDisabled,
                            ]}
                            onPress={addToMealLog}
                            disabled={!canAdd}
                            accessibilityRole="button"
                        >
                            <Text style={styles.btnFilledText}>
                                Add to Meal Log
                            </Text>
                        </Pressable>
                    </View>
                </>
            )}
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
    headerSpacer: { width: 22 },

    content: { paddingHorizontal: 20, paddingBottom: 24 },

    // Loading / error / empty
    centerBox: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        gap: 12,
    },
    errorText: {
        fontSize: fontSize.base,
        color: colors.warning,
        textAlign: 'center',
    },
    emptyText: {
        fontSize: fontSize.base,
        color: colors.textMuted,
        textAlign: 'center',
    },
    retryButton: {
        paddingHorizontal: 16,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.primary,
        justifyContent: 'center',
    },
    retryText: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        color: colors.primary,
    },

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
    heroSubtitle: {
        fontSize: fontSize.sm,
        color: colors.textMuted,
        marginTop: 3,
    },

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
    timeDivider: { width: 1, height: 28, backgroundColor: colors.borderSoft },
    timeLabel: { fontSize: fontSize.sm, color: colors.textMuted },
    timeValue: {
        fontSize: fontSize.md,
        fontWeight: fontWeight.bold,
        color: colors.heading,
        marginTop: 3,
    },

    // Amount control (food variant)
    amountBlock: { marginTop: 22 },
    amountRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginTop: 12,
    },
    amountInput: {
        width: 88,
        height: 50,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        backgroundColor: colors.surface,
        paddingHorizontal: 14,
        fontSize: fontSize.md,
        color: colors.heading,
        fontWeight: fontWeight.semibold,
    },
    amountUnit: { flex: 1 },

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
    makesCaption: {
        fontSize: fontSize.sm,
        color: colors.textMuted,
        fontWeight: fontWeight.semibold,
    },

    // Ingredients
    list: { gap: 10 },
    ingredientRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 14,
        gap: 12,
    },
    checkCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1.5,
        borderColor: colors.controlOutline,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 1,
    },
    checkCircleOn: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    ingredientText: {
        flex: 1,
        flexShrink: 1,
        fontSize: fontSize.md,
        fontWeight: fontWeight.semibold,
        color: colors.heading,
        lineHeight: 20,
    },
    ingredientTextChecked: {
        color: colors.textMuted,
        textDecorationLine: 'line-through',
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
    stepText: {
        flex: 1,
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
    btnDisabled: { opacity: 0.5 },
    btnFilledText: {
        fontSize: fontSize.md,
        fontWeight: fontWeight.bold,
        color: colors.onPrimary,
    },
});
