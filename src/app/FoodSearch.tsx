import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Brand colors + type scale — the single source of truth for styling.
import { colors, fontSize } from '@/theme/tokens';
import { matchFoodIcon } from '@/lib/foodIcon';
import {
    BASE_INGREDIENTS,
    INGREDIENT_CATEGORIES,
    ingredientIcon,
} from '@/lib/baseIngredients';
import {
    getRecipeTypes,
    searchFoods,
    searchRecipes,
    type FoodSearchItem,
    type RecipeItem,
} from '@/lib/fatsecret';

type Tab = 'All foods' | 'Recipes' | 'Ingredients';
const TABS: Tab[] = ['All foods', 'Recipes', 'Ingredients'];

// Empty = browse. Recipes browse freely with no term; FatSecret's FOOD search
// needs a term, so the food tabs fall back to this seed when the box is empty.
// (Temporary default until we have real popular-foods data.)
const DEFAULT_QUERY = '';
const FOOD_BROWSE_SEED = 'cake';

// Prep-time presets. `to` is an upper bound in minutes.
const PREP_OPTIONS: { label: string; to?: number }[] = [
    { label: 'Any' },
    { label: '≤ 15 min', to: 15 },
    { label: '≤ 30 min', to: 30 },
    { label: '≤ 60 min', to: 60 },
];

// Recipe sort options (map to recipes.search `sort_by`).
const RECIPE_SORTS: { label: string; value: string }[] = [
    { label: 'Newest', value: 'newest' },
    { label: 'Fewest cal', value: 'caloriesPerServingAscending' },
    { label: 'Most cal', value: 'caloriesPerServingDescending' },
];

// Food sort options (applied client-side to the loaded results).
const FOOD_SORTS: { label: string }[] = [
    { label: 'Relevance' },
    { label: 'Fewest cal' },
    { label: 'Most protein' },
];

// Dietary preferences — FatSecret's full list is just these two.
const DIET_OPTIONS: { label: string; value: string | null }[] = [
    { label: 'Any', value: null },
    { label: 'Vegetarian', value: 'Vegetarian' },
    { label: 'Vegan', value: 'Vegan' },
];

// Round a nutrition value for display, or show a dash when it's missing.
const fmt = (n: number | null) => (n == null ? '—' : String(Math.round(n)));

// Reusable pill used for both the category tabs and the filter dropdowns.
function FilterChip({
    label,
    selected = false,
    showChevron = false,
    onPress,
}: {
    label: string;
    selected?: boolean;
    showChevron?: boolean;
    onPress?: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
                styles.chip,
                selected ? styles.chipSelected : styles.chipUnselected,
                pressed && styles.pressed,
            ]}
        >
            <Text
                style={[
                    styles.chipText,
                    selected ? styles.chipTextSelected : styles.chipTextUnselected,
                ]}
                numberOfLines={1}
            >
                {label}
            </Text>
            {showChevron && <Text style={styles.chipChevron}> ▾</Text>}
        </Pressable>
    );
}

// A small bottom-sheet dropdown of options (doesn't leave the screen).
function OptionsSheet<T>({
    visible,
    title,
    options,
    selected,
    onSelect,
    onClose,
}: {
    visible: boolean;
    title: string;
    options: { label: string; value: T }[];
    selected: T;
    onSelect: (value: T) => void;
    onClose: () => void;
}) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            {/* Tapping outside the box dismisses it. */}
            <Pressable style={styles.popoverBackdrop} onPress={onClose}>
                <Pressable style={styles.popover} onPress={() => {}}>
                    <Text style={styles.popoverTitle}>{title}</Text>
                    <ScrollView
                        style={styles.popoverScroll}
                        bounces={false}
                        showsVerticalScrollIndicator
                    >
                        {options.map((opt) => {
                            const isSelected = opt.value === selected;
                            return (
                                <Pressable
                                    key={opt.label}
                                    style={styles.popoverOption}
                                    onPress={() => {
                                        onSelect(opt.value);
                                        onClose();
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.popoverOptionText,
                                            isSelected &&
                                                styles.popoverOptionTextSelected,
                                        ]}
                                    >
                                        {opt.label}
                                    </Text>
                                    {isSelected && (
                                        <Text style={styles.popoverCheck}>
                                            ✓
                                        </Text>
                                    )}
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

// Shared card shell (API photo when available, icon fallback, + text).
function ResultCard({
    image,
    icon,
    title,
    meta,
    subMeta,
    tag,
}: {
    image: string | null;
    icon: string;
    title: string;
    meta?: string;
    subMeta?: string | null;
    tag?: string | null;
}) {
    const [imgFailed, setImgFailed] = useState(false);
    const showImage = !!image && !imgFailed;
    const metaLine = [meta, subMeta].filter(Boolean).join(' • ');
    return (
        <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            accessibilityRole="button"
        >
            <View style={styles.rowIcon}>
                {showImage ? (
                    <Image
                        source={{ uri: image }}
                        style={styles.rowIconFill}
                        contentFit="cover"
                        transition={150}
                        onError={() => setImgFailed(true)}
                    />
                ) : (
                    <Text style={styles.rowIconEmoji}>{icon}</Text>
                )}
            </View>
            <View style={styles.rowText}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                    {title}
                </Text>
                {metaLine ? (
                    <Text style={styles.rowMeta} numberOfLines={1}>
                        {metaLine}
                    </Text>
                ) : null}
                {tag ? (
                    <Text style={styles.rowTag} numberOfLines={1}>
                        {tag}
                    </Text>
                ) : null}
            </View>
        </Pressable>
    );
}

// Icon from the name, falling back to the item's FatSecret categories/types,
// then a generic icon — so branded items without a name match still get one.
function iconFor(name: string, categories: string[]): string {
    return (
        matchFoodIcon(name) ?? matchFoodIcon(categories.join(' ')) ?? '🍽️'
    );
}

function FoodCard({ item }: { item: FoodSearchItem }) {
    return (
        <ResultCard
            image={item.image}
            icon={iconFor(item.name, item.subCategories)}
            title={item.name}
            meta={`${fmt(item.calories)} cal • ${fmt(item.protein)} g protein`}
            subMeta={item.serving ? `Per ${item.serving}` : null}
            tag={item.brand || 'Generic'}
        />
    );
}

function RecipeCard({ item }: { item: RecipeItem }) {
    return (
        <ResultCard
            image={item.image}
            icon={iconFor(item.name, item.types)}
            title={item.name}
            meta={`${fmt(item.calories)} cal • ${fmt(item.protein)} g protein`}
            tag={item.types[0] || null}
        />
    );
}

export default function FoodSearch() {
    const [activeTab, setActiveTab] = useState<Tab>('All foods');
    const [query, setQuery] = useState(DEFAULT_QUERY);
    const [submittedQuery, setSubmittedQuery] = useState(DEFAULT_QUERY);

    const [foods, setFoods] = useState<FoodSearchItem[]>([]);
    const [recipes, setRecipes] = useState<RecipeItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Recipe-only filters (applied only on the Recipes tab).
    const [recipeTypes, setRecipeTypes] = useState<string[]>([]);
    const [mealType, setMealType] = useState<string | null>(null);
    const [prepIdx, setPrepIdx] = useState(0);
    const [sortIdx, setSortIdx] = useState(0);

    // Food-tab filters.
    const [diet, setDiet] = useState<string | null>(null);
    const [foodSortIdx, setFoodSortIdx] = useState(0);

    // Which filter dropdown sheet is open (null = none).
    const [openSheet, setOpenSheet] = useState<
        'mealType' | 'prepTime' | 'sort' | 'diet' | 'foodSort' | null
    >(null);

    const isRecipes = activeTab === 'Recipes';
    const isIngredients = activeTab === 'Ingredients';

    // Fetch the meal-type options once (for the Recipes filter).
    useEffect(() => {
        getRecipeTypes()
            .then(setRecipeTypes)
            .catch(() => {});
    }, []);

    const runSearch = useCallback(
        async (pageToLoad: number, append: boolean) => {
            // Ingredients tab uses the local curated catalog, not the API.
            if (activeTab === 'Ingredients') {
                setLoading(false);
                return;
            }
            const q = submittedQuery.trim(); // '' = browse (handled by the proxy)
            if (append) setLoadingMore(true);
            else setLoading(true);
            setError(null);

            try {
                if (activeTab === 'Recipes') {
                    const data = await searchRecipes(q, {
                        page: pageToLoad,
                        recipeTypes: mealType ?? undefined,
                        prepTimeTo: PREP_OPTIONS[prepIdx].to,
                        sortBy: RECIPE_SORTS[sortIdx].value,
                    });
                    setRecipes((prev) =>
                        append ? [...prev, ...data.results] : data.results
                    );
                    setTotal(data.total);
                    setPage(data.page);
                } else {
                    // All foods: food search needs a term — seed when empty.
                    const data = await searchFoods(q || FOOD_BROWSE_SEED, {
                        page: pageToLoad,
                    });
                    setFoods((prev) =>
                        append ? [...prev, ...data.results] : data.results
                    );
                    setTotal(data.total);
                    setPage(data.page);
                }
            } catch (e) {
                setError(
                    e instanceof Error ? e.message : 'Something went wrong'
                );
                if (!append) {
                    setFoods([]);
                    setRecipes([]);
                }
            } finally {
                if (append) setLoadingMore(false);
                else setLoading(false);
            }
        },
        [activeTab, submittedQuery, mealType, prepIdx, sortIdx]
    );

    // Re-run whenever the tab, query, or recipe filters change.
    useEffect(() => {
        runSearch(0, false);
    }, [runSearch]);

    // Diet filter + sort, applied client-side on the loaded food results.
    const foodsShown = (() => {
        let list =
            !isRecipes && diet
                ? foods.filter((f) => f.diets.includes(diet))
                : foods;
        if (!isRecipes && foodSortIdx > 0) {
            list = [...list].sort((a, b) =>
                foodSortIdx === 1
                    ? (a.calories ?? Infinity) - (b.calories ?? Infinity) // fewest cal
                    : (b.protein ?? -Infinity) - (a.protein ?? -Infinity) // most protein
            );
        }
        return list;
    })();
    const loadedCount = isRecipes ? recipes.length : foods.length;
    const shownCount = isRecipes ? recipes.length : foodsShown.length;
    const canLoadMore = loadedCount > 0 && loadedCount < total;

    // Ingredients tab: filter the curated catalog locally and group by category.
    const ingredientQuery = query.trim().toLowerCase();
    const filteredIngredients = ingredientQuery
        ? BASE_INGREDIENTS.filter((i) =>
              i.name.toLowerCase().includes(ingredientQuery)
          )
        : BASE_INGREDIENTS;
    const ingredientGroups = INGREDIENT_CATEGORIES.map((category) => ({
        category,
        items: filteredIngredients.filter((i) => i.category === category),
    })).filter((g) => g.items.length > 0);

    const noun = isRecipes
        ? 'recipes'
        : isIngredients
          ? 'ingredients'
          : 'foods';
    const prepLabel = prepIdx === 0 ? 'Prep time' : PREP_OPTIONS[prepIdx].label;

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <Text style={styles.title}>Search foods</Text>
                <Text style={styles.subtitle}>
                    Find something good for your day.
                </Text>

                {/* Search bar */}
                <View style={styles.searchBar}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                        style={styles.searchInput}
                        value={query}
                        onChangeText={setQuery}
                        onSubmitEditing={() => setSubmittedQuery(query)}
                        returnKeyType="search"
                        placeholder="Search foods"
                        placeholderTextColor={colors.textMuted}
                        autoCorrect={false}
                    />
                    {query.length > 0 && (
                        <Pressable
                            onPress={() => {
                                // Clearing returns to the default browse view.
                                setQuery('');
                                setSubmittedQuery('');
                            }}
                            accessibilityLabel="Clear search"
                            hitSlop={10}
                        >
                            <Text style={styles.clearIcon}>✕</Text>
                        </Pressable>
                    )}
                </View>

                {/* Tabs (each queries a different source) */}
                <View style={styles.chipRow}>
                    {TABS.map((tab) => (
                        <FilterChip
                            key={tab}
                            label={tab}
                            selected={activeTab === tab}
                            onPress={() => setActiveTab(tab)}
                        />
                    ))}
                </View>

                {/* Filters — Recipes: meal/prep; All foods: diet; Ingredients: none */}
                {!isIngredients && (
                    <View style={styles.chipRow}>
                        {isRecipes ? (
                            <>
                                <FilterChip
                                    label={mealType ?? 'Meal type'}
                                    selected={!!mealType}
                                    showChevron
                                    onPress={() => setOpenSheet('mealType')}
                                />
                                <FilterChip
                                    label={prepLabel}
                                    selected={prepIdx > 0}
                                    showChevron
                                    onPress={() => setOpenSheet('prepTime')}
                                />
                            </>
                        ) : (
                            <FilterChip
                                label={diet ?? 'Diet'}
                                selected={!!diet}
                                showChevron
                                onPress={() => setOpenSheet('diet')}
                            />
                        )}
                    </View>
                )}

                {/* Results header */}
                <View style={styles.resultsHeader}>
                    <Text style={styles.resultsCount}>
                        {isIngredients
                            ? `${filteredIngredients.length} ingredients`
                            : !isRecipes && diet
                              ? `${shownCount} ${noun} · ${diet}`
                              : submittedQuery
                                ? `${total} results for “${submittedQuery}”`
                                : `${total} ${noun}`}
                    </Text>
                    {!isIngredients && (
                        <Pressable
                            onPress={() =>
                                setOpenSheet(isRecipes ? 'sort' : 'foodSort')
                            }
                            accessibilityRole="button"
                        >
                            <Text style={styles.sortLabel}>
                                {isRecipes
                                    ? RECIPE_SORTS[sortIdx].label
                                    : FOOD_SORTS[foodSortIdx].label}{' '}
                                ⌄
                            </Text>
                        </Pressable>
                    )}
                </View>

                {/* Results area */}
                {isIngredients ? (
                    filteredIngredients.length === 0 ? (
                        <View style={styles.centerBox}>
                            <Text style={styles.emptyText}>
                                No ingredients match “{query.trim()}”.
                            </Text>
                        </View>
                    ) : (
                        ingredientGroups.map((g) => (
                            <View key={g.category}>
                                <Text style={styles.sectionHeader}>
                                    {g.category}
                                </Text>
                                <View style={styles.list}>
                                    {g.items.map((i) => (
                                        <ResultCard
                                            key={i.name}
                                            image={null}
                                            icon={ingredientIcon(
                                                i.name,
                                                i.category
                                            )}
                                            title={i.name}
                                        />
                                    ))}
                                </View>
                            </View>
                        ))
                    )
                ) : loading ? (
                    <View style={styles.centerBox}>
                        <ActivityIndicator color={colors.primary} />
                    </View>
                ) : error ? (
                    <View style={styles.centerBox}>
                        <Text style={styles.errorText}>{error}</Text>
                        <Pressable
                            onPress={() => runSearch(0, false)}
                            style={styles.retryButton}
                        >
                            <Text style={styles.retryText}>Try again</Text>
                        </Pressable>
                    </View>
                ) : shownCount === 0 ? (
                    <View style={styles.centerBox}>
                        <Text style={styles.emptyText}>
                            {!isRecipes && diet
                                ? `No ${noun} match “${diet}” on the loaded results.`
                                : `No ${noun} found. Try a different search.`}
                        </Text>
                        {!isRecipes && diet && canLoadMore && (
                            <Pressable
                                onPress={() =>
                                    !loadingMore && runSearch(page + 1, true)
                                }
                                style={styles.retryButton}
                            >
                                {loadingMore ? (
                                    <ActivityIndicator color={colors.primary} />
                                ) : (
                                    <Text style={styles.retryText}>
                                        Load more
                                    </Text>
                                )}
                            </Pressable>
                        )}
                    </View>
                ) : (
                    <>
                        <View style={styles.list}>
                            {isRecipes
                                ? recipes.map((item) => (
                                      <RecipeCard key={item.id} item={item} />
                                  ))
                                : foodsShown.map((item) => (
                                      <FoodCard key={item.id} item={item} />
                                  ))}
                        </View>

                        {canLoadMore && (
                            <Pressable
                                style={styles.viewMore}
                                onPress={() =>
                                    !loadingMore && runSearch(page + 1, true)
                                }
                                accessibilityRole="button"
                            >
                                {loadingMore ? (
                                    <ActivityIndicator color={colors.primary} />
                                ) : (
                                    <Text style={styles.viewMoreText}>
                                        Load more {noun} ↓
                                    </Text>
                                )}
                            </Pressable>
                        )}
                    </>
                )}

                {/* Pantry inspiration banner */}
                <View style={styles.banner}>
                    <Text style={styles.bannerTitle}>
                        A little pantry inspiration
                    </Text>
                    <Text style={styles.bannerText}>
                        Try searching for ingredients you already have.
                    </Text>
                </View>
            </ScrollView>

            {/* Filter dropdown sheets (Recipes tab) */}
            <OptionsSheet<string | null>
                visible={openSheet === 'mealType'}
                title="Meal type"
                options={[
                    { label: 'Any', value: null },
                    ...recipeTypes.map((t) => ({ label: t, value: t })),
                ]}
                selected={mealType}
                onSelect={setMealType}
                onClose={() => setOpenSheet(null)}
            />
            <OptionsSheet<number>
                visible={openSheet === 'prepTime'}
                title="Prep time"
                options={PREP_OPTIONS.map((o, i) => ({ label: o.label, value: i }))}
                selected={prepIdx}
                onSelect={setPrepIdx}
                onClose={() => setOpenSheet(null)}
            />
            <OptionsSheet<number>
                visible={openSheet === 'sort'}
                title="Sort by"
                options={RECIPE_SORTS.map((s, i) => ({ label: s.label, value: i }))}
                selected={sortIdx}
                onSelect={setSortIdx}
                onClose={() => setOpenSheet(null)}
            />
            <OptionsSheet<string | null>
                visible={openSheet === 'diet'}
                title="Diet"
                options={DIET_OPTIONS}
                selected={diet}
                onSelect={setDiet}
                onClose={() => setOpenSheet(null)}
            />
            <OptionsSheet<number>
                visible={openSheet === 'foodSort'}
                title="Sort by"
                options={FOOD_SORTS.map((s, i) => ({ label: s.label, value: i }))}
                selected={foodSortIdx}
                onSelect={setFoodSortIdx}
                onClose={() => setOpenSheet(null)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
    },

    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 32,
    },

    // Header
    title: {
        fontSize: fontSize.xxl,
        fontWeight: '700',
        color: colors.heading,
        marginTop: 8,
    },

    subtitle: {
        fontSize: fontSize.md,
        color: colors.textMuted,
        marginTop: 4,
        marginBottom: 16,
    },

    // Search bar
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 48,
        gap: 10,
    },

    searchIcon: {
        fontSize: fontSize.md,
    },

    searchInput: {
        flex: 1,
        fontSize: fontSize.md,
        color: colors.heading,
    },

    clearIcon: {
        fontSize: fontSize.md,
        color: colors.textMuted,
    },

    // Chip rows (tabs + filters)
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 14,
    },

    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        maxWidth: '100%',
    },

    chipSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },

    chipUnselected: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
    },

    chipText: {
        fontSize: fontSize.base,
        fontWeight: '600',
    },

    chipTextSelected: {
        color: colors.onPrimary,
    },

    chipTextUnselected: {
        color: colors.deepGreen,
    },

    chipChevron: {
        fontSize: fontSize.sm,
        color: colors.deepGreen,
    },

    // Results header
    resultsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 14,
    },

    resultsCount: {
        flex: 1,
        fontSize: fontSize.lg,
        fontWeight: '700',
        color: colors.heading,
    },

    sortLabel: {
        fontSize: fontSize.base,
        fontWeight: '600',
        color: colors.primary,
    },

    // Loading / error / empty states
    centerBox: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
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
        fontWeight: '600',
        color: colors.primary,
    },

    // Results list (compact rows)
    list: {
        gap: 10,
    },

    sectionHeader: {
        fontSize: fontSize.base,
        fontWeight: '700',
        color: colors.heading,
        marginTop: 18,
        marginBottom: 8,
    },

    row: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 10,
        gap: 12,
    },

    rowIcon: {
        width: 48,
        height: 48,
        borderRadius: 10,
        backgroundColor: colors.foodBackdrop,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },

    rowIconFill: {
        width: '100%',
        height: '100%',
    },

    rowIconEmoji: {
        fontSize: 24,
    },

    rowText: {
        flex: 1,
    },

    rowTitle: {
        fontSize: fontSize.md,
        fontWeight: '700',
        color: colors.heading,
    },

    rowMeta: {
        fontSize: fontSize.xs,
        color: colors.textMuted,
        marginTop: 2,
    },

    rowTag: {
        fontSize: fontSize.xs,
        fontWeight: '600',
        color: colors.primary,
        marginTop: 3,
    },

    // View more
    viewMore: {
        alignItems: 'center',
        marginTop: 20,
        minHeight: 24,
        justifyContent: 'center',
    },

    viewMoreText: {
        fontSize: fontSize.md,
        fontWeight: '700',
        color: colors.primary,
    },

    // Pantry banner
    banner: {
        backgroundColor: colors.surfaceSoft,
        borderRadius: 14,
        padding: 16,
        marginTop: 20,
    },

    bannerTitle: {
        fontSize: fontSize.md,
        fontWeight: '700',
        color: colors.heading,
        marginBottom: 4,
    },

    bannerText: {
        fontSize: fontSize.base,
        color: colors.textMuted,
    },

    pressed: {
        opacity: 0.85,
    },

    // Dropdown popover (small box layered over the screen)
    popoverBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },

    popover: {
        width: '100%',
        maxWidth: 300,
        maxHeight: '60%',
        backgroundColor: colors.surface,
        borderRadius: 16,
        paddingTop: 6,
        paddingBottom: 6,
        overflow: 'hidden',
    },

    popoverTitle: {
        fontSize: fontSize.md,
        fontWeight: '700',
        color: colors.heading,
        paddingHorizontal: 18,
        paddingVertical: 12,
    },

    popoverScroll: {
        flexGrow: 0,
        flexShrink: 1,
    },

    popoverOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 18,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },

    popoverOptionText: {
        fontSize: fontSize.base,
        color: colors.text,
        flexShrink: 1,
    },

    popoverOptionTextSelected: {
        color: colors.primary,
        fontWeight: '600',
    },

    popoverCheck: {
        fontSize: fontSize.base,
        color: colors.primary,
        fontWeight: '700',
        marginLeft: 8,
    },
});
