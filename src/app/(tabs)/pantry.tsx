import PantryEditSheet from '@/components/pantry-edit-sheet';
import { pantryNutrition } from '@/lib/pantry-nutrition';
import { sortPantryItems, type PantrySort } from '@/lib/pantry-sort';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
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

import PantryFoodImage from '@/components/pantry-food-image';
import { type PantryType } from '@/lib/pantry';
import {
  expirationStatus,
  loadPantryDisplay,
  type PantryDisplayItem,
} from '@/lib/pantry-display';
import { colors, fontSize } from '@/theme/tokens';

const TABS: { value: PantryType; label: string }[] = [
  { value: 'ingredient', label: 'Ingredients' },
  { value: 'prepared_meal', label: 'Meals & Leftovers' },
];

export default function PantryScreen() {
  const [activeTab, setActiveTab] = useState<PantryType>('ingredient');
  const [query, setQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<PantrySort>('newest');
  const [sortOpen, setSortOpen] = useState(false);
  const [items, setItems] = useState<PantryDisplayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  const [selectedItem, setSelectedItem] =
    useState<PantryDisplayItem | null>(null);

  // Reload when returning to Pantry.
  // Ignore late results if the user has left the screen.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      setLoading(true);
      setError(null);
      setItems([]);

      async function load() {
        try {
          const result = await loadPantryDisplay();
          if (active) setItems(result);
        } catch (cause: unknown) {
          if (!active) return;

          const message =
            typeof cause === 'object' &&
            cause !== null &&
            'message' in cause &&
            typeof cause.message === 'string'
              ? cause.message
              : 'Unable to load your pantry. Please try again.';

          setError(message);
        } finally {
          if (active) setLoading(false);
        }
      }

      void load();

      return () => {
        active = false;
      };
    }, [reloadCount])
  );

  const isIngredients = activeTab === 'ingredient';
  const searchTerm = query.trim().toLowerCase();
  const tabItems = items.filter((item) => item.item_type === activeTab);

  const visibleItems = sortPantryItems(tabItems.filter(
    (item) =>
      // Keep unresolved items visible so search doesn't hide a lookup failure.
      item.detailsUnavailable ||
      item.name.toLowerCase().includes(searchTerm)
  ), sortOrder);

  const hasUnavailableDetails = items.some(
    (item) => item.detailsUnavailable
  );

  function reload() {
    setReloadCount((count) => count + 1);
  }

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

        <View style={styles.tabs}>
          {TABS.map((tab) => {
            const selected = activeTab === tab.value;

            return (
              <Pressable
                key={tab.value}
                onPress={() => { setActiveTab(tab.value); setSortOpen(false); }}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                style={[styles.tab, selected && styles.selectedTab]}
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
        <Text style={styles.subtitle}>
          {isIngredients
            ? 'Ingredients for your next meal.'
            : 'Prepared meals and saved portions.'}
        </Text>

        <View style={styles.sortSection}>
          <Pressable
            onPress={() => setSortOpen((open) => !open)}
            accessibilityRole="button"
            accessibilityLabel={`Sort by ${sortOrder === 'newest' ? 'newest added' : 'expiration date'}`}
            accessibilityState={{ expanded: sortOpen }}
            style={styles.sortControl}
          >
            <Ionicons name="swap-vertical-outline" size={16} color={colors.primary} />
            <Text style={styles.sortText}>
              Sort: {sortOrder === 'newest' ? 'Newest added' : 'Expiration date'}
            </Text>
            <Ionicons
              name={sortOpen ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.primary}
            />
          </Pressable>
          {sortOpen && (
            <View style={styles.sortMenu}>
              {([
                ['newest', 'Newest added'],
                ['expiration', 'Expiration date'],
              ] as const).map(([value, label]) => (
                <Pressable
                  key={value}
                  onPress={() => { setSortOrder(value); setSortOpen(false); }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: sortOrder === value }}
                  style={styles.sortMenuItem}
                >
                  <Text style={styles.sortMenuText}>{label}</Text>
                  {sortOrder === value && (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {loading ? (
          <View style={styles.messageBox}>
            <ActivityIndicator
              color={colors.primary}
              accessibilityLabel="Loading pantry"
            />
            <Text style={styles.messageText}>Loading your pantry...</Text>
          </View>
        ) : error ? (
          <View style={styles.messageBox}>
            <Text style={styles.messageTitle}>Could not load pantry</Text>
            <Text style={styles.messageText}>{error}</Text>
            <Pressable
              onPress={reload}
              accessibilityRole="button"
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {hasUnavailableDetails && (
              <View style={styles.notice}>
                <Text style={styles.messageText}>
                  Some food names could not be loaded. Your saved amounts
                  and dates are still shown.
                </Text>
                <Pressable
                  onPress={reload}
                  accessibilityRole="button"
                  style={styles.retryButton}
                >
                  <Text style={styles.retryText}>Retry food details</Text>
                </Pressable>
              </View>
            )}

            {visibleItems.length === 0 ? (
              <View style={styles.messageBox}>
                <Text style={styles.messageTitle}>
                  {tabItems.length === 0
                    ? isIngredients
                      ? 'No ingredients yet'
                      : 'No meals or leftovers yet'
                    : 'No matching items'}
                </Text>
                <Text style={styles.messageText}>
                  {tabItems.length === 0
                    ? 'Your saved foods will appear here.'
                    : 'Try another search or clear the search field.'}
                </Text>
              </View>
            ) : (
              <View style={styles.list}>
                {visibleItems.map((item) => {
                  const servingKnown = Boolean(item.fatsecret_serving_id &&
                    item.food?.servingId === item.fatsecret_serving_id);
                  const nutrition = servingKnown
                    ? pantryNutrition(item.food, item.quantity, item.unit)
                    : null;
                  const unitLabel = item.unit === 'portion' && servingKnown
                    ? item.food?.measurementDescription || 'portion'
                    : item.unit;
                  const status = expirationStatus(item.expiration_date);
                  const statusColor = status.warning
                    ? colors.warning
                    : colors.textMuted;

                  return (
                    <Pressable
                      key={item.pantry_item_id}
                      onPress={() => setSelectedItem(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${item.name}`}
                      style={({ pressed }) => [
                        styles.card,
                        pressed && styles.pressed,
                      ]}
                    >
                      <PantryFoodImage
                        image={item.image}
                        name={item.detailsUnavailable ? '' : item.name}
                      />
                      <View style={styles.cardContent}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.quantity}>
                          {Number(item.quantity.toPrecision(12))} {unitLabel}
                        </Text>
                        {servingKnown && item.food?.serving && (
                          <Text style={styles.quantity}>
                            1 serving = {item.food.serving} {item.name}
                          </Text>
                        )}
                        <Text style={styles.quantity}>
                          {nutrition?.calories != null
                            ? `${Math.round(nutrition.calories)} kcal in stock`
                            : item.fatsecret_food_id && !item.fatsecret_serving_id
                              ? 'Select a serving for nutrition'
                              : 'Nutrition unavailable'}
                        </Text>
                        <View style={styles.expirationRow}>
                          <View
                            style={[
                              styles.statusDot,
                              { backgroundColor: statusColor },
                            ]}
                          />
                          <Text
                            style={[
                              styles.expirationText,
                              { color: statusColor },
                            ]}
                          >
                            {status.label}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Required when displaying FatSecret-provided content. */}
            {items.some((item) => item.fatsecret_food_id !== null) && (
              <Text
                accessibilityRole="link"
                onPress={() =>
                  router.push('https://platform.fatsecret.com/')
                }
                style={styles.attribution}
              >
                Powered by fatsecret
              </Text>
            )}
          </>
        )}
      </ScrollView>
      
      <PantryEditSheet
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onChanged={(itemType) => {
          setSelectedItem(null);

          // Show the destination tab after changing an item's category.
          setActiveTab(itemType);
          setQuery('');
          reload();
        }}
      />

      {/* Browsing works now; selecting and saving comes next. */}
      <Pressable
        onPress={() =>
          router.push({
            pathname: '/FoodSearch',
            params: {
              source: 'pantry',
              pantryType: activeTab,
            },
          })
        }
        
        accessibilityRole="button"
        accessibilityLabel="Open food search"
        style={({ pressed }) => [
          styles.addButton,
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="add" size={30} color={colors.onPrimary} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
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
  selectedTab: { backgroundColor: colors.primary },
  tabText: {
    textAlign: 'center',
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.textMuted,
  },
  selectedTabText: { color: colors.onPrimary },
  sectionTitle: {
    marginTop: 24,
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.heading,
  },
  sortSection: { marginTop: 12, alignItems: 'flex-end' },
  sortControl: {
    minHeight: 44, flexDirection: 'row', flexWrap: 'wrap',
    alignItems: 'center', justifyContent: 'flex-end', gap: 6,
    paddingVertical: 8, paddingHorizontal: 2,
  },
  sortText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary },
  sortMenu: {
    minWidth: 210, maxWidth: '100%', padding: 4, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  sortMenuItem: {
    minHeight: 48, paddingHorizontal: 12, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16,
  },
  sortMenuText: { fontSize: fontSize.base, color: colors.text },
  list: { marginTop: 20, gap: 14 },
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
  foodEmoji: { fontSize: 32 },
  cardContent: { flex: 1, minWidth: 0 },
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
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  expirationText: { flex: 1, fontSize: fontSize.sm },
  messageBox: {
    paddingVertical: 36,
    alignItems: 'center',
    gap: 10,
  },
  messageTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.heading,
    textAlign: 'center',
  },
  messageText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  notice: {
    marginTop: 18,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
  },
  retryButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  retryText: { color: colors.primary, fontWeight: '700' },
  attribution: {
    marginTop: 24,
    paddingVertical: 12,
    color: colors.primary,
    textAlign: 'center',
    textDecorationLine: 'underline',
    fontSize: fontSize.sm,
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
  pressed: { opacity: 0.75 },
});