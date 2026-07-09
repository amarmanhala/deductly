update public.expense_categories
set icon = case slug
  when 'fuel' then 'fuel'
  when 'parking' then 'square-parking'
  when 'insurance' then 'shield'
  when 'maintenance' then 'hammer'
  when 'phone' then 'smartphone'
  when 'car-wash' then 'sparkles'
  when 'supplies' then 'package'
  when 'meals' then 'utensils-crossed'
  when 'tolls' then 'road'
  when 'other' then 'receipt'
  else icon
end,
updated_at = now()
where slug in (
  'fuel',
  'parking',
  'insurance',
  'maintenance',
  'phone',
  'car-wash',
  'supplies',
  'meals',
  'tolls',
  'other'
);
