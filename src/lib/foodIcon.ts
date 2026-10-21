// Maps a food or recipe name to a representative emoji "icon".
//
// The team chose cartoony icons over real photos, reused consistently. This is a
// pure keyword lookup, so the same name always yields the same icon, and it needs
// no network/image data.
//
// Order matters: more specific/compound keywords come first so they win over
// generic ones (e.g. "ice cream" before "cream", "sweet potato" before "potato").

const ICON_MAP: [string, string][] = [
    // Compound / specific first
    ['ice cream', '🍦'],
    ['peanut butter', '🥜'],
    ['sweet potato', '🍠'],
    ['hot dog', '🌭'],
    ['french fries', '🍟'],
    ['green bean', '🫛'],

    // Proteins
    ['chicken', '🍗'],
    ['turkey', '🦃'],
    ['steak', '🥩'],
    ['beef', '🥩'],
    ['pork', '🥓'],
    ['bacon', '🥓'],
    ['ham', '🍖'],
    ['lamb', '🍖'],
    ['salmon', '🍣'],
    ['tuna', '🐟'],
    ['fish', '🐟'],
    ['shrimp', '🦐'],
    ['prawn', '🦐'],
    ['crab', '🦀'],
    ['lobster', '🦞'],
    ['tilapia', '🐟'],
    ['cod', '🐟'],
    ['haddock', '🐟'],
    ['trout', '🐟'],
    ['sardine', '🐟'],
    ['mackerel', '🐟'],
    ['anchovy', '🐟'],
    ['scallop', '🦪'],
    ['oyster', '🦪'],
    ['clam', '🦪'],
    ['mussel', '🦪'],
    ['squid', '🦑'],
    ['octopus', '🐙'],
    ['egg', '🥚'],
    ['tofu', '🧈'],

    // Grains / carbs
    ['pizza', '🍕'],
    ['spaghetti', '🍝'],
    ['pasta', '🍝'],
    ['noodle', '🍜'],
    ['ramen', '🍜'],
    ['rice', '🍚'],
    ['bagel', '🥯'],
    ['croissant', '🥐'],
    ['pancake', '🥞'],
    ['waffle', '🧇'],
    ['bread', '🍞'],
    ['toast', '🍞'],
    ['cereal', '🥣'],
    ['oat', '🥣'],
    ['potato', '🥔'],
    ['fries', '🍟'],
    ['corn', '🌽'],
    ['taco', '🌮'],
    ['burrito', '🌯'],
    ['sandwich', '🥪'],
    ['burger', '🍔'],
    ['pretzel', '🥨'],

    // Fruits
    ['apple', '🍎'],
    ['banana', '🍌'],
    ['orange', '🍊'],
    ['grape', '🍇'],
    ['strawberry', '🍓'],
    ['blueberry', '🫐'],
    ['berry', '🫐'],
    ['watermelon', '🍉'],
    ['melon', '🍈'],
    ['peach', '🍑'],
    ['pear', '🍐'],
    ['pineapple', '🍍'],
    ['mango', '🥭'],
    ['lemon', '🍋'],
    ['lime', '🍋'],
    ['cherry', '🍒'],
    ['avocado', '🥑'],
    ['coconut', '🥥'],
    ['kiwi', '🥝'],

    // Vegetables
    ['salad', '🥗'],
    ['lettuce', '🥬'],
    ['broccoli', '🥦'],
    ['cauliflower', '🥦'],
    ['asparagus', '🥬'],
    ['celery', '🥬'],
    ['kale', '🥬'],
    ['cabbage', '🥬'],
    ['spinach', '🥬'],
    ['zucchini', '🥒'],
    ['carrot', '🥕'],
    ['tomato', '🍅'],
    ['pepper', '🫑'],
    ['cucumber', '🥒'],
    ['mushroom', '🍄'],
    ['onion', '🧅'],
    ['garlic', '🧄'],
    ['eggplant', '🍆'],
    ['bean', '🫘'],
    ['pea', '🫛'],

    // Dairy / sweets
    ['milk', '🥛'],
    ['mozzarella', '🧀'],
    ['parmesan', '🧀'],
    ['cheddar', '🧀'],
    ['feta', '🧀'],
    ['ricotta', '🧀'],
    ['cheese', '🧀'],
    ['yogurt', '🥛'],
    ['yoghurt', '🥛'],
    ['butter', '🧈'],
    ['cake', '🍰'],
    ['cupcake', '🧁'],
    ['cookie', '🍪'],
    ['chocolate', '🍫'],
    ['candy', '🍬'],
    ['donut', '🍩'],
    ['doughnut', '🍩'],
    ['pie', '🥧'],
    ['honey', '🍯'],

    // Nuts / snacks
    ['almond', '🥜'],
    ['peanut', '🥜'],
    ['cashew', '🥜'],
    ['nut', '🥜'],
    ['popcorn', '🍿'],
    ['chip', '🍘'],
    ['cracker', '🍘'],

    // Drinks
    ['coffee', '☕'],
    ['tea', '🍵'],
    ['juice', '🧃'],
    ['smoothie', '🥤'],
    ['soda', '🥤'],
    ['cola', '🥤'],
    ['water', '💧'],

    // Dishes / bowls
    ['sushi', '🍣'],
    ['dumpling', '🥟'],
    ['curry', '🍛'],
    ['soup', '🍲'],
    ['stew', '🍲'],
    ['bowl', '🥣'],
];

const FALLBACK = '🍽️';

// Specific keyword match only — returns null when nothing matches, so callers
// can fall back to a category icon (see baseIngredients.ingredientIcon).
export function matchFoodIcon(name: string | null | undefined): string | null {
    if (!name) return null;
    const lower = name.toLowerCase();
    for (const [keyword, emoji] of ICON_MAP) {
        if (lower.includes(keyword)) return emoji;
    }
    return null;
}

export function foodIcon(name: string | null | undefined): string {
    return matchFoodIcon(name) ?? FALLBACK;
}
