// Curated catalog of base/pantry ingredients for the Ingredients tab.
//
// Why curated: FatSecret can't give a clean "raw ingredients only" list — its
// `generic` type still includes prepared dishes (e.g. "Fried Rice"), and its
// categories describe food TYPE, not preparation. So we own the list of base
// items a user would actually keep in a pantry. This is also the backbone of
// the future pantry + barcode/photo-scan features.
//
// Icons come from foodIcon(name); nutrition is fetched from FatSecret later
// (on a detail / add-to-pantry action), not in this browse list.
//
// Starter set — grow it freely; keep each item a simple base ingredient.

import { matchFoodIcon } from './foodIcon';

export type BaseIngredient = { name: string; category: string };

// Fallback icon per category, used when a name has no specific icon — so e.g.
// tilapia/cod/scallops all get 🐟, mozzarella gets 🧀, celery gets 🥬.
const CATEGORY_ICONS: Record<string, string> = {
    Vegetables: '🥦',
    Fruits: '🍎',
    'Meat & Poultry': '🍖',
    Seafood: '🐟',
    'Dairy & Eggs': '🧀',
    'Grains & Starches': '🌾',
    Legumes: '🫘',
    'Nuts & Seeds': '🥜',
    'Pantry & Oils': '🫙',
    'Herbs & Spices': '🌿',
};

// Specific name icon if we have one, otherwise the category icon.
export function ingredientIcon(name: string, category: string): string {
    return matchFoodIcon(name) ?? CATEGORY_ICONS[category] ?? '🍽️';
}

// Display order for the grouped list.
export const INGREDIENT_CATEGORIES = [
    'Vegetables',
    'Fruits',
    'Meat & Poultry',
    'Seafood',
    'Dairy & Eggs',
    'Grains & Starches',
    'Legumes',
    'Nuts & Seeds',
    'Pantry & Oils',
    'Herbs & Spices',
];

export const BASE_INGREDIENTS: BaseIngredient[] = [
    // Vegetables
    { name: 'Tomato', category: 'Vegetables' },
    { name: 'Onion', category: 'Vegetables' },
    { name: 'Garlic', category: 'Vegetables' },
    { name: 'Potato', category: 'Vegetables' },
    { name: 'Sweet Potato', category: 'Vegetables' },
    { name: 'Carrot', category: 'Vegetables' },
    { name: 'Broccoli', category: 'Vegetables' },
    { name: 'Spinach', category: 'Vegetables' },
    { name: 'Lettuce', category: 'Vegetables' },
    { name: 'Cucumber', category: 'Vegetables' },
    { name: 'Bell Pepper', category: 'Vegetables' },
    { name: 'Mushroom', category: 'Vegetables' },
    { name: 'Zucchini', category: 'Vegetables' },
    { name: 'Celery', category: 'Vegetables' },
    { name: 'Cauliflower', category: 'Vegetables' },
    { name: 'Cabbage', category: 'Vegetables' },
    { name: 'Kale', category: 'Vegetables' },
    { name: 'Green Beans', category: 'Vegetables' },
    { name: 'Corn', category: 'Vegetables' },
    { name: 'Asparagus', category: 'Vegetables' },
    { name: 'Avocado', category: 'Vegetables' },

    // Fruits
    { name: 'Apple', category: 'Fruits' },
    { name: 'Banana', category: 'Fruits' },
    { name: 'Orange', category: 'Fruits' },
    { name: 'Strawberry', category: 'Fruits' },
    { name: 'Blueberry', category: 'Fruits' },
    { name: 'Grapes', category: 'Fruits' },
    { name: 'Lemon', category: 'Fruits' },
    { name: 'Lime', category: 'Fruits' },
    { name: 'Mango', category: 'Fruits' },
    { name: 'Pineapple', category: 'Fruits' },
    { name: 'Watermelon', category: 'Fruits' },
    { name: 'Peach', category: 'Fruits' },
    { name: 'Pear', category: 'Fruits' },
    { name: 'Raspberry', category: 'Fruits' },
    { name: 'Kiwi', category: 'Fruits' },

    // Meat & Poultry
    { name: 'Chicken Breast', category: 'Meat & Poultry' },
    { name: 'Chicken Thigh', category: 'Meat & Poultry' },
    { name: 'Ground Beef', category: 'Meat & Poultry' },
    { name: 'Steak', category: 'Meat & Poultry' },
    { name: 'Pork Chop', category: 'Meat & Poultry' },
    { name: 'Bacon', category: 'Meat & Poultry' },
    { name: 'Ground Turkey', category: 'Meat & Poultry' },
    { name: 'Turkey Breast', category: 'Meat & Poultry' },
    { name: 'Ham', category: 'Meat & Poultry' },
    { name: 'Sausage', category: 'Meat & Poultry' },

    // Seafood
    { name: 'Salmon', category: 'Seafood' },
    { name: 'Tuna', category: 'Seafood' },
    { name: 'Shrimp', category: 'Seafood' },
    { name: 'Cod', category: 'Seafood' },
    { name: 'Tilapia', category: 'Seafood' },
    { name: 'Crab', category: 'Seafood' },
    { name: 'Scallops', category: 'Seafood' },

    // Dairy & Eggs
    { name: 'Eggs', category: 'Dairy & Eggs' },
    { name: 'Milk', category: 'Dairy & Eggs' },
    { name: 'Cheddar Cheese', category: 'Dairy & Eggs' },
    { name: 'Mozzarella', category: 'Dairy & Eggs' },
    { name: 'Greek Yogurt', category: 'Dairy & Eggs' },
    { name: 'Butter', category: 'Dairy & Eggs' },
    { name: 'Cream Cheese', category: 'Dairy & Eggs' },
    { name: 'Cottage Cheese', category: 'Dairy & Eggs' },
    { name: 'Parmesan', category: 'Dairy & Eggs' },

    // Grains & Starches
    { name: 'White Rice', category: 'Grains & Starches' },
    { name: 'Brown Rice', category: 'Grains & Starches' },
    { name: 'Quinoa', category: 'Grains & Starches' },
    { name: 'Oats', category: 'Grains & Starches' },
    { name: 'Pasta', category: 'Grains & Starches' },
    { name: 'Bread', category: 'Grains & Starches' },
    { name: 'Flour', category: 'Grains & Starches' },
    { name: 'Couscous', category: 'Grains & Starches' },
    { name: 'Tortilla', category: 'Grains & Starches' },

    // Legumes
    { name: 'Black Beans', category: 'Legumes' },
    { name: 'Chickpeas', category: 'Legumes' },
    { name: 'Lentils', category: 'Legumes' },
    { name: 'Kidney Beans', category: 'Legumes' },
    { name: 'Pinto Beans', category: 'Legumes' },
    { name: 'Edamame', category: 'Legumes' },
    { name: 'Tofu', category: 'Legumes' },

    // Nuts & Seeds
    { name: 'Almonds', category: 'Nuts & Seeds' },
    { name: 'Peanuts', category: 'Nuts & Seeds' },
    { name: 'Walnuts', category: 'Nuts & Seeds' },
    { name: 'Cashews', category: 'Nuts & Seeds' },
    { name: 'Chia Seeds', category: 'Nuts & Seeds' },
    { name: 'Peanut Butter', category: 'Nuts & Seeds' },

    // Pantry & Oils
    { name: 'Olive Oil', category: 'Pantry & Oils' },
    { name: 'Coconut Oil', category: 'Pantry & Oils' },
    { name: 'Honey', category: 'Pantry & Oils' },
    { name: 'Sugar', category: 'Pantry & Oils' },
    { name: 'Soy Sauce', category: 'Pantry & Oils' },
    { name: 'Tomato Sauce', category: 'Pantry & Oils' },
    { name: 'Vinegar', category: 'Pantry & Oils' },

    // Herbs & Spices
    { name: 'Basil', category: 'Herbs & Spices' },
    { name: 'Oregano', category: 'Herbs & Spices' },
    { name: 'Cumin', category: 'Herbs & Spices' },
    { name: 'Paprika', category: 'Herbs & Spices' },
    { name: 'Cinnamon', category: 'Herbs & Spices' },
    { name: 'Black Pepper', category: 'Herbs & Spices' },
    { name: 'Ginger', category: 'Herbs & Spices' },
    { name: 'Cilantro', category: 'Herbs & Spices' },
];
