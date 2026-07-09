insert into public.expense_categories (name, slug, icon, color, is_default)
values
  ('Fuel', 'fuel', 'fuel', '#ef4444', true),
  ('Parking', 'parking', 'square-parking', '#f97316', true),
  ('Insurance', 'insurance', 'shield', '#eab308', true),
  ('Maintenance', 'maintenance', 'hammer', '#22c55e', true),
  ('Phone', 'phone', 'smartphone', '#06b6d4', true),
  ('Car Wash', 'car-wash', 'sparkles', '#3b82f6', true),
  ('Supplies', 'supplies', 'package', '#8b5cf6', true),
  ('Meals', 'meals', 'utensils-crossed', '#ec4899', true),
  ('Tolls', 'tolls', 'road', '#14b8a6', true),
  ('Other', 'other', 'receipt', '#6b7280', true)
on conflict (slug) do update
set
  name = excluded.name,
  icon = excluded.icon,
  color = excluded.color,
  is_default = excluded.is_default,
  updated_at = now();
