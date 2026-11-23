begin;

-- Optional so existing pantry items remain unchanged.
alter table public.pantry_items
  add column fatsecret_serving_id text null;

-- A saved serving requires a FatSecret food reference
-- and a numeric ID other than the generated ID 0.
alter table public.pantry_items
  add constraint pantry_items_serving_reference_check
  check (
    fatsecret_serving_id is null
    or (
      fatsecret_food_id is not null
      and fatsecret_serving_id ~ '^[0-9]+$'
      and fatsecret_serving_id !~ '^0+$'
    )
  );

commit;