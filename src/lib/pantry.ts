import { supabase } from './supabase';

// Match the database's allowed pantry categories.
export type PantryType = 'ingredient' | 'prepared_meal';

// These are database records, not fully formatted screen cards.
// FatSecret food names and details will be loaded separately.
export type PantryItemRow = {
  pantry_item_id: number;
  pantry_id: number;
  ingredient_id: number | null;
  fatsecret_food_id: string | null;
  item_type: PantryType;
  quantity: number;
  unit: string;
  expiration_date: string | null;
  date_added: string | null;
  updated_at: string | null;
};

export type PantryItemDetails = {
  quantity: number;
  unit: string;
  itemType: PantryType;
  // Use a calendar date such as "2026-11-05", or null.
  expirationDate: string | null;
};

export type AddPantryItemInput = PantryItemDetails & {
  fatsecretFoodId: string;
};

// Explicitly request only the columns this helper needs.
const ITEM_COLUMNS =
  'pantry_item_id, pantry_id, ingredient_id, fatsecret_food_id, ' +
  'item_type, quantity, unit, expiration_date, date_added, updated_at';

// Resolve the signed-in account to the existing application profile.
// Never accept a user ID from the screen as proof of ownership.
async function getCurrentProfileId(): Promise<number> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;

  if (!user) {
    throw new Error('Please sign in to use your pantry.');
  }

  const { data, error } = await supabase
    .from('users')
    .select('user_id')
    .eq('auth_id', user.id)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error('Please complete your profile before using your pantry.');
  }

  return data.user_id as number;
}

// Return the user's existing pantry without creating anything.
async function findPantryId(userId: number): Promise<number | null> {
  const { data, error } = await supabase
    .from('pantries')
    .select('pantry_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  return data ? (data.pantry_id as number) : null;
}

// Create a pantry only when adding the user's first item.
// The unique user_id constraint prevents duplicate pantries.
// Ignore conflicts if another request creates it at the same time.
async function getOrCreatePantryId(userId: number): Promise<number> {
  const existingId = await findPantryId(userId);

  if (existingId !== null) return existingId;

  const { error } = await supabase
    .from('pantries')
    .upsert(
      { user_id: userId },
      { onConflict: 'user_id', ignoreDuplicates: true }
    );

  if (error) throw error;

  const pantryId = await findPantryId(userId);

  if (pantryId === null) {
    throw new Error('Your pantry could not be created. Please try again.');
  }

  return pantryId;
}

// Validate form values before sending a database request.
// The database constraints also enforce these rules.
function validateDetails(input: PantryItemDetails) {
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new Error('Enter a quantity greater than zero.');
  }

  const unit = input.unit.trim();

  if (!unit) {
    throw new Error('Enter a unit, such as pieces, cups, or servings.');
  }

  if (
    input.itemType !== 'ingredient' &&
    input.itemType !== 'prepared_meal'
  ) {
    throw new Error('Choose Ingredients or Meals & Leftovers.');
  }

  const expirationDate = input.expirationDate;

  if (expirationDate !== null) {
    // Validate a real calendar date without converting it to local time.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expirationDate)) {
      throw new Error('Use YYYY-MM-DD for the expiration date.');
    }

    const date = new Date(`${expirationDate}T00:00:00.000Z`);

    if (
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== expirationDate
    ) {
      throw new Error('Enter a valid expiration date.');
    }
  }

  return {
    quantity: input.quantity,
    unit,
    item_type: input.itemType,
    expiration_date: expirationDate,
  };
}

function validateItemId(itemId: number) {
  if (!Number.isSafeInteger(itemId) || itemId <= 0) {
    throw new Error('This pantry item has an invalid ID.');
  }
}

// Load the user's saved inventory.
// A user without a pantry gets an empty list, not sample items.
export async function loadPantryItems(): Promise<PantryItemRow[]> {
  const userId = await getCurrentProfileId();
  const pantryId = await findPantryId(userId);

  if (pantryId === null) return [];

  const { data, error } = await supabase
    .from('pantry_items')
    .select(ITEM_COLUMNS)
    .eq('pantry_id', pantryId)
    .order('pantry_item_id', { ascending: false })
    .returns<PantryItemRow[]>();

  if (error) throw error;

  return data ?? [];
}

// Save one selected FatSecret food.
// Duplicate foods remain separate batches, allowing different expiry dates.
// Names and nutrition are deliberately not stored here.
export async function addPantryItem(
  input: AddPantryItemInput
): Promise<PantryItemRow> {
  const details = validateDetails(input);
  const foodId = input.fatsecretFoodId.trim();

  if (!/^[0-9]+$/.test(foodId)) {
    throw new Error('Select a valid food from food search.');
  }

  const userId = await getCurrentProfileId();
  const pantryId = await getOrCreatePantryId(userId);

  const { data, error } = await supabase
    .from('pantry_items')
    .insert({
      pantry_id: pantryId,
      ingredient_id: null,
      fatsecret_food_id: foodId,
      ...details,
    })
    .select(ITEM_COLUMNS)
    .returns<PantryItemRow[]>()
    .single();

  if (error) throw error;

  return data;
}

// Edit the amount, category, or optional expiration.
// The food identity and pantry ownership are not editable through this function.
export async function updatePantryItem(
  itemId: number,
  input: PantryItemDetails
): Promise<PantryItemRow> {
  validateItemId(itemId);
  const details = validateDetails(input);
  const userId = await getCurrentProfileId();
  const pantryId = await findPantryId(userId);

  if (pantryId === null) {
    throw new Error('This pantry item is no longer available.');
  }

  const { data, error } = await supabase
    .from('pantry_items')
    .update({
      ...details,
      updated_at: new Date().toISOString(),
    })
    .eq('pantry_item_id', itemId)
    .eq('pantry_id', pantryId)
    .select(ITEM_COLUMNS)
    .returns<PantryItemRow[]>()
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new Error('This pantry item is no longer available.');
  }

  return data;
}

// Remove only the requested item in the current user's pantry.
// Supabase RLS remains the database-level ownership protection.
export async function removePantryItem(itemId: number): Promise<void> {
  validateItemId(itemId);
  const userId = await getCurrentProfileId();
  const pantryId = await findPantryId(userId);

  if (pantryId === null) {
    throw new Error('This pantry item is no longer available.');
  }

  const { data, error } = await supabase
    .from('pantry_items')
    .delete()
    .eq('pantry_item_id', itemId)
    .eq('pantry_id', pantryId)
    .select('pantry_item_id');

  if (error) throw error;

  if (!data?.length) {
    throw new Error('This pantry item is no longer available.');
  }
}