import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
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

import { foodIcon } from '@/lib/foodIcon';
import { colors, fontSize } from '@/theme/tokens';

// Match the item_type values added to Supabase.
type PantryType = 'ingredient' | 'prepared_meal';

type PreviewItem = {
  id: string;
  name: string;
  quantity: string;
  itemType: PantryType;
  expirationLabel: string;
  expiresSoon?: boolean;
};

const TABS: { value: PantryType; label: string }[] = [
  { value: 'ingredient', label: 'Ingredients' },
  { value: 'prepared_meal', label: 'Meals & Leftovers' },
];

// Temporary display examples only.
// Nothing here is fetched from or written to Supabase.
// Real expiration labels will be calculated from saved dates later.
const SAMPLE_ITEMS: PreviewItem[] = [
  {
    id: 'sample-eggs',
    name: 'Eggs',
    quantity: '6 pieces',
    itemType: 'ingredient',
    expirationLabel: 'Expires in 7 days',
  },
  {
    id: 'sample-bread',
    name: 'Whole Wheat Bread',
    quantity: '8 slices',
    itemType: 'ingredient',
    expirationLabel: 'Expires in 4 days',
  },
  {
    id: 'sample-spinach',
    name: 'Spinach',
    quantity: '1 bag',
    itemType: 'ingredient',
    expirationLabel: 'Expires in 3 days',
    expiresSoon: true,
  },
  {
    id: 'sample-chicken',
    name: 'Chicken Breast',
    quantity: '2 pieces',
    itemType: 'ingredient',
    expirationLabel: 'No expiration set',
  },
  {
    id: 'sample-pasta',
    name: 'Cooked Pasta',
    quantity: '2 servings',
    itemType: 'prepared_meal',
    expirationLabel: 'Expires in 2 days',
    expiresSoon: true,
  },
  {
    id: 'sample-soup',
    name: 'Vegetable Soup',
    quantity: '3 cups',
    itemType: 'prepared_meal',
    expirationLabel: 'Expires tomorrow',
    expiresSoon: true,
  },
  {
    id: 'sample-rice',
    name: 'Cooked Brown Rice',
    quantity: '1 serving',
    itemType: 'prepared_meal',
    expirationLabel: 'No expiration set',
  },
];

export default function PantryScreen() {
  const [activeTab, setActiveTab] = useState<PantryType>('ingredient');
  const [query, setQuery] = useState('');

  const isIngredients = activeTab === 'ingredient';
  const searchTerm = query.trim().toLowerCase();

  // Search only the items belonging to the selected pantry tab.
  const visibleItems = SAMPLE_ITEMS.filter(
    (item) =>
      item.itemType === activeTab &&
      item.name.toLowerCase().includes(searchTerm)
  );

  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text accessibilityRole="header" style={styles.title}>
          My Pantry
        </Text>
        <Text style={styles.subtitle}>
          Keep track of what you have on hand.
        </Text>

        {/* This searches the saved pantry list, not FatSecret. */}
        <View style={styles.searchBar}>
          <Ionicons
            name="search-outline"
            size={19}
            color={colors.textMuted}
            accessible={false}
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search your pantry..."
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Search your pantry"
            style={styles.searchInput}
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery('')}
              accessibilityRole="button"
              accessibilityLabel="Clear pantry search"
              style={styles.clearButton}
            >
              <Ionicons
                name="close"
                size={20}
                color={colors.textMuted}
              />
            </Pressable>
          )}
        </View>

        {/* Wrapping text accommodates larger accessibility font sizes. */}
        <View style={styles.tabs}>
          {TABS.map((tab) => {
            const selected = activeTab === tab.value;

            return (
              <Pressable
                key={tab.value}
                onPress={() => setActiveTab(tab.value)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                style={[
                  styles.tab,
                  selected && styles.selectedTab,
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    selected && styles.selectedTabText,
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {isIngredients ? 'Ready to cook' : 'Ready to eat'}
        </Text>
        <Text style={styles.sectionDescription}>
          {isIngredients
            ? 'Ingredients for your next meal.'
            : 'Prepared meals and saved portions.'}
        </Text>

        {/* Keep preview data clearly distinguishable from real inventory. */}
        <View style={styles.previewBanner}>
          <Text style={styles.previewText}>
            Preview: sample items only. Adding and saving are not connected yet.
          </Text>
        </View>

        <View style={styles.list}>
          {visibleItems.map((item) => {
            const expirationColor = item.expiresSoon
              ? colors.warning
              : colors.textMuted;

            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.iconBox}>
                  <Text
                    style={styles.foodEmoji}
                    accessible={false}
                  >
                    {foodIcon(item.name)}
                  </Text>
                </View>

                <View style={styles.cardContent}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.quantity}>{item.quantity}</Text>

                  <View style={styles.expirationRow}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: expirationColor },
                      ]}
                    />
                    <Text
                      style={[
                        styles.expirationText,
                        { color: expirationColor },
                      ]}
                    >
                      {item.expirationLabel}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}

          {visibleItems.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No matching items</Text>
              <Text style={styles.emptyDescription}>
                Try another search or check the other pantry tab.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Open the existing search page for now.
          Pantry selection and saving will be connected in a later step. */}
      <Pressable
        onPress={() => router.push('/FoodSearch')}
        accessibilityRole="button"
        accessibilityLabel="Open food search"
        style={({ pressed }) => [
          styles.addButton,
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="add" size={30} color={colors.onPrimary} />
      </Pressable>

      {/* The existing tabs layout already provides bottom navigation. */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
    // Keep the last card clear of the floating add button.
    paddingBottom: 110,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.heading,
  },
  subtitle: {
    marginTop: 6,
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 22,
    minHeight: 50,
    paddingLeft: 14,
    paddingRight: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 14,
    fontSize: fontSize.md,
    color: colors.text,
  },
  clearButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    marginTop: 18,
    borderRadius: 16,
    backgroundColor: colors.surfaceSoft,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    textAlign: 'center',
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.textMuted,
  },
  selectedTabText: {
    color: colors.onPrimary,
  },
  sectionTitle: {
    marginTop: 24,
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.heading,
  },
  sectionDescription: {
    marginTop: 5,
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  previewBanner: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.surfaceSoft,
  },
  previewText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 18,
  },
  list: {
    marginTop: 16,
    gap: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 92,
    padding: 13,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  iconBox: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: colors.surfaceSoftAlt,
  },
  foodEmoji: {
    fontSize: 32,
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.heading,
  },
  quantity: {
    marginTop: 5,
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  expirationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  expirationText: {
    flex: 1,
    fontSize: fontSize.sm,
  },
  emptyState: {
    paddingVertical: 36,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.heading,
  },
  emptyDescription: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  addButton: {
    position: 'absolute',
    right: 24,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  pressed: {
    opacity: 0.75,
  },
});