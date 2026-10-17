import { useState } from 'react';
import {
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

// Shape of one search result. Deliberately simple and UI-focused so it can
// later be produced from a FatSecret API response without changing the cards.
type FoodItem = {
    id: string;
    name: string;
    calories: number;
    protein: number; // grams
    minutes: number;
    servings: number;
    tag: string;
    emoji: string; // stand-in for the food photo until the API provides images
};

// Mock results (the four from the design + two extra) so we can see the
// layout before any real search/API is wired up.
const MOCK_FOODS: FoodItem[] = [
    {
        id: '1',
        name: 'Chicken, Rice &\nSpinach Bowl',
        calories: 520,
        protein: 42,
        minutes: 25,
        servings: 1,
        tag: 'Pantry-friendly',
        emoji: '🍲',
    },
    {
        id: '2',
        name: 'Salmon &\nQuinoa Bowl',
        calories: 485,
        protein: 34,
        minutes: 30,
        servings: 1,
        tag: 'Omega-3 rich',
        emoji: '🍣',
    },
    {
        id: '3',
        name: 'Chickpea &\nVeggie Bowl',
        calories: 410,
        protein: 19,
        minutes: 15,
        servings: 1,
        tag: 'Vegetarian',
        emoji: '🥗',
    },
    {
        id: '4',
        name: 'Tofu &\nBrown Rice Bowl',
        calories: 450,
        protein: 26,
        minutes: 20,
        servings: 1,
        tag: 'Plant-based',
        emoji: '🍚',
    },
    {
        id: '5',
        name: 'Shrimp &\nAvocado Bowl',
        calories: 390,
        protein: 28,
        minutes: 18,
        servings: 1,
        tag: 'Low-carb',
        emoji: '🥑',
    },
    {
        id: '6',
        name: 'Lentil & Sweet\nPotato Bowl',
        calories: 430,
        protein: 21,
        minutes: 35,
        servings: 1,
        tag: 'High-fiber',
        emoji: '🍠',
    },
];

const CATEGORIES = ['All foods', 'Recipes', 'Ingredients'];
const FILTERS = ['Meal type', 'Diet', 'Prep time'];
// Sort labels we cycle through on tap (visual only for now — no real sorting).
const SORTS = ['Relevance', 'Calories', 'Protein'];

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
            {showChevron && (
                <Text style={styles.chipChevron}> ▾</Text>
            )}
        </Pressable>
    );
}

// One result card in the 2-column grid.
function FoodCard({ item }: { item: FoodItem }) {
    return (
        <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            accessibilityRole="button"
        >
            {/* Placeholder "photo": colored backdrop with a food emoji centered. */}
            <View style={styles.cardImage}>
                <Text style={styles.cardImageEmoji}>{item.emoji}</Text>
            </View>

            <Text style={styles.cardTitle}>{item.name}</Text>

            <Text style={styles.cardMeta}>
                {item.calories} cal • {item.protein} g protein
            </Text>

            <Text style={styles.cardMeta}>
                🕐 {item.minutes} min • {item.servings} serving
            </Text>

            <Text style={styles.cardTag}>{item.tag}</Text>
        </Pressable>
    );
}

export default function FoodSearch() {
    // Light local state: enough to feel interactive, no real filtering yet.
    const [query, setQuery] = useState('bowl');
    const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
    const [sortIndex, setSortIndex] = useState(0);

    const results = MOCK_FOODS;

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
                        placeholder="Search foods"
                        placeholderTextColor={colors.textMuted}
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
                        {results.length} results for &ldquo;{query}&rdquo;
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

                {/* 2-column results grid */}
                <View style={styles.grid}>
                    {results.map((item) => (
                        <FoodCard key={item.id} item={item} />
                    ))}
                </View>

                {/* View more */}
                <Pressable
                    style={styles.viewMore}
                    accessibilityRole="button"
                >
                    <Text style={styles.viewMoreText}>View more foods ↓</Text>
                </Pressable>

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
        fontSize: fontSize.lg,
        fontWeight: '700',
        color: colors.heading,
    },

    sortLabel: {
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
