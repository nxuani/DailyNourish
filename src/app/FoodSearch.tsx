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
const DEFAULT_QUERY = '';
const FOOD_BROWSE_SEED = 'chicken';

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

// Shared card shell (image + title + meta + tag).
function ResultCard({
    image,
    placeholder,
    title,
    meta,
    subMeta,
    tag,
}: {
    image: string | null;
    placeholder: string;
    title: string;
    meta: string;
    subMeta?: string | null;
    tag?: string | null;
}) {
    // Fall back to the placeholder if the image URL fails to load (dead/blocked).
    const [imgFailed, setImgFailed] = useState(false);
    const showImage = !!image && !imgFailed;
    return (
        <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            accessibilityRole="button"
        >
            <View style={styles.cardImage}>
                {showImage ? (
                    <Image
                        source={{ uri: image }}
                        style={styles.cardImageFill}
                        contentFit="cover"
                        transition={150}
                        onError={() => setImgFailed(true)}
                    />
                ) : (
                    <Text style={styles.cardImageEmoji}>{placeholder}</Text>
                )}
            </View>

            <Text style={styles.cardTitle} numberOfLines={2}>
                {title}
            </Text>

            <Text style={styles.cardMeta}>{meta}</Text>
            {subMeta ? <Text style={styles.cardMeta}>{subMeta}</Text> : null}
            {tag ? (
                <Text style={styles.cardTag} numberOfLines={1}>
                    {tag}
                </Text>
            ) : null}
        </Pressable>
    );
}

function FoodCard({ item }: { item: FoodSearchItem }) {
    return (
        <ResultCard
            image={item.image}
            placeholder="🍽️"
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
            placeholder="🍲"
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

    // Food-tab filter.
    const [diet, setDiet] = useState<string | null>(null);

    // Which filter dropdown sheet is open (null = none).
    const [openSheet, setOpenSheet] = useState<
        'mealType' | 'prepTime' | 'sort' | 'diet' | null
    >(null);

    const isRecipes = activeTab === 'Recipes';

    // Fetch the meal-type options once (for the Recipes filter).
    useEffect(() => {
        getRecipeTypes()
            .then(setRecipeTypes)
            .catch(() => {});
    }, []);

    const runSearch = useCallback(
        async (pageToLoad: number, append: boolean) => {
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
                    // Food search needs a term — seed it when browsing empty.
                    // Ingredients tab = generic (non-branded) foods only.
                    const data = await searchFoods(q || FOOD_BROWSE_SEED, {
                        page: pageToLoad,
                        foodType:
                            activeTab === 'Ingredients' ? 'generic' : undefined,
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

    const count = isRecipes ? recipes.length : foods.length;
    const canLoadMore = count > 0 && count < total;

    const noun = isRecipes
        ? 'recipes'
        : activeTab === 'Ingredients'
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

                {/* Filters — tab-contextual (recipe filters vs food filters) */}
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

                {/* Results header */}
                <View style={styles.resultsHeader}>
                    <Text style={styles.resultsCount}>
                        {submittedQuery
                            ? `${total} results for “${submittedQuery}”`
                            : `${total} ${noun}`}
                    </Text>
                    {isRecipes && (
                        <Pressable
                            onPress={() => setOpenSheet('sort')}
                            accessibilityRole="button"
                        >
                            <Text style={styles.sortLabel}>
                                {RECIPE_SORTS[sortIdx].label} ⌄
                            </Text>
                        </Pressable>
                    )}
                </View>

                {/* Results area */}
                {loading ? (
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
                ) : count === 0 ? (
                    <View style={styles.centerBox}>
                        <Text style={styles.emptyText}>
                            No {noun} found. Try a different search.
                        </Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.grid}>
                            {isRecipes
                                ? recipes.map((item) => (
                                      <RecipeCard key={item.id} item={item} />
                                  ))
                                : foods.map((item) => (
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
                                        View more {noun} ↓
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

    // Results grid
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 16,
    },

    card: {
        width: '48%',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
        padding: 10,
    },

    cardImage: {
        height: 92,
        borderRadius: 10,
        backgroundColor: colors.foodBackdrop,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        overflow: 'hidden',
    },

    cardImageFill: {
        width: '100%',
        height: '100%',
    },

    cardImageEmoji: {
        fontSize: 40,
    },

    cardTitle: {
        fontSize: fontSize.md,
        fontWeight: '700',
        color: colors.heading,
        lineHeight: 18,
        marginBottom: 6,
    },

    cardMeta: {
        fontSize: fontSize.xs,
        color: colors.textMuted,
        marginTop: 2,
    },

    cardTag: {
        fontSize: fontSize.xs,
        fontWeight: '600',
        color: colors.primary,
        marginTop: 8,
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
