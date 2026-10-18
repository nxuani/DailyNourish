import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
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

// Brand colors + type scale — the single source of truth for styling.
import { colors, fontSize } from '@/theme/tokens';
import { searchFoods, type FoodSearchItem } from '@/lib/fatsecret';

const CATEGORIES = ['All foods', 'Recipes', 'Ingredients'];
const FILTERS = ['Meal type', 'Diet', 'Prep time'];
// Sort labels we cycle through on tap (visual only for now — no real sorting).
const SORTS = ['Relevance', 'Calories', 'Protein'];

const DEFAULT_QUERY = 'bowl';

// Round a nutrition value for display, or show a dash when it's missing.
const fmt = (n: number | null) => (n == null ? '—' : String(Math.round(n)));

// Reusable pill used for both the category chips and the filter dropdowns.
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
            >
                {label}
            </Text>
            {showChevron && <Text style={styles.chipChevron}> ▾</Text>}
        </Pressable>
    );
}

// One result card in the 2-column grid.
function FoodCard({ item }: { item: FoodSearchItem }) {
    return (
        <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            accessibilityRole="button"
        >
            {/* Real food photo when available (Premier images), else a placeholder. */}
            <View style={styles.cardImage}>
                {item.image ? (
                    <Image
                        source={{ uri: item.image }}
                        style={styles.cardImageFill}
                        contentFit="cover"
                        transition={150}
                    />
                ) : (
                    <Text style={styles.cardImageEmoji}>🍽️</Text>
                )}
            </View>

            <Text style={styles.cardTitle} numberOfLines={2}>
                {item.name}
            </Text>

            <Text style={styles.cardMeta}>
                {fmt(item.calories)} cal • {fmt(item.protein)} g protein
            </Text>

            {item.serving && (
                <Text style={styles.cardMeta}>Per {item.serving}</Text>
            )}

            <Text style={styles.cardTag} numberOfLines={1}>
                {item.brand || 'Generic'}
            </Text>
        </Pressable>
    );
}

export default function FoodSearch() {
    const [query, setQuery] = useState(DEFAULT_QUERY);
    const [submittedQuery, setSubmittedQuery] = useState(DEFAULT_QUERY);
    const [results, setResults] = useState<FoodSearchItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Visual-only state (chips/sort don't filter yet).
    const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
    const [sortIndex, setSortIndex] = useState(0);

    const runSearch = useCallback(
        async (q: string, pageToLoad: number, append: boolean) => {
            const trimmed = q.trim();
            if (!trimmed) {
                setResults([]);
                setTotal(0);
                return;
            }
            if (append) setLoadingMore(true);
            else setLoading(true);
            setError(null);

            try {
                const data = await searchFoods(trimmed, { page: pageToLoad });
                setResults((prev) =>
                    append ? [...prev, ...data.results] : data.results
                );
                setTotal(data.total);
                setPage(data.page);
                setSubmittedQuery(trimmed);
            } catch (e) {
                setError(
                    e instanceof Error ? e.message : 'Something went wrong'
                );
                if (!append) setResults([]);
            } finally {
                if (append) setLoadingMore(false);
                else setLoading(false);
            }
        },
        []
    );

    // Run an initial search so the screen isn't empty on open.
    useEffect(() => {
        runSearch(DEFAULT_QUERY, 0, false);
    }, [runSearch]);

    const canLoadMore = results.length > 0 && results.length < total;

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
                        onSubmitEditing={() => runSearch(query, 0, false)}
                        returnKeyType="search"
                        placeholder="Search foods"
                        placeholderTextColor={colors.textMuted}
                        autoCorrect={false}
                    />
                    {query.length > 0 && (
                        <Pressable
                            onPress={() => setQuery('')}
                            accessibilityLabel="Clear search"
                            hitSlop={10}
                        >
                            <Text style={styles.clearIcon}>✕</Text>
                        </Pressable>
                    )}
                </View>

                {/* Category chips */}
                <View style={styles.chipRow}>
                    {CATEGORIES.map((category) => (
                        <FilterChip
                            key={category}
                            label={category}
                            selected={selectedCategory === category}
                            onPress={() => setSelectedCategory(category)}
                        />
                    ))}
                </View>

                {/* Filter dropdowns (static visuals for now) */}
                <View style={styles.chipRow}>
                    {FILTERS.map((filter) => (
                        <FilterChip key={filter} label={filter} showChevron />
                    ))}
                </View>

                {/* Results header */}
                <View style={styles.resultsHeader}>
                    <Text style={styles.resultsCount}>
                        {total} results for &ldquo;{submittedQuery}&rdquo;
                    </Text>
                    <Pressable
                        onPress={() =>
                            setSortIndex((current) => (current + 1) % SORTS.length)
                        }
                        accessibilityRole="button"
                    >
                        <Text style={styles.sortLabel}>{SORTS[sortIndex]} ⌄</Text>
                    </Pressable>
                </View>

                {/* Results area: loading / error / empty / grid */}
                {loading ? (
                    <View style={styles.centerBox}>
                        <ActivityIndicator color={colors.primary} />
                    </View>
                ) : error ? (
                    <View style={styles.centerBox}>
                        <Text style={styles.errorText}>{error}</Text>
                        <Pressable
                            onPress={() => runSearch(submittedQuery, 0, false)}
                            style={styles.retryButton}
                        >
                            <Text style={styles.retryText}>Try again</Text>
                        </Pressable>
                    </View>
                ) : results.length === 0 ? (
                    <View style={styles.centerBox}>
                        <Text style={styles.emptyText}>
                            No foods found. Try a different search.
                        </Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.grid}>
                            {results.map((item) => (
                                <FoodCard key={item.id} item={item} />
                            ))}
                        </View>

                        {/* View more (pagination) */}
                        {canLoadMore && (
                            <Pressable
                                style={styles.viewMore}
                                onPress={() =>
                                    !loadingMore &&
                                    runSearch(submittedQuery, page + 1, true)
                                }
                                accessibilityRole="button"
                            >
                                {loadingMore ? (
                                    <ActivityIndicator color={colors.primary} />
                                ) : (
                                    <Text style={styles.viewMoreText}>
                                        View more foods ↓
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

    // Chip rows (categories + filters)
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
});
