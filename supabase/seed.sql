-- Mock data for local Supabase development.
-- Run after migrations with `supabase db reset` or `supabase db seed`.

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'maya.driver@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Maya Driver"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'leo.courier@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Leo Courier"}'::jsonb,
    now(),
    now()
  )
on conflict (id) do update
set
  email = excluded.email,
  updated_at = now();

insert into public.profiles (
  id,
  full_name,
  email,
  avatar_url,
  country,
  currency,
  business_type,
  timezone
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'Maya Driver',
    'maya.driver@example.com',
    'avatars/11111111-1111-1111-1111-111111111111/profile.jpg',
    'US',
    'USD',
    'uber',
    'America/New_York'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Leo Courier',
    'leo.courier@example.com',
    'avatars/22222222-2222-2222-2222-222222222222/profile.jpg',
    'CA',
    'CAD',
    'doordash',
    'America/Toronto'
  )
on conflict (id) do update
set
  full_name = excluded.full_name,
  email = excluded.email,
  avatar_url = excluded.avatar_url,
  country = excluded.country,
  currency = excluded.currency,
  business_type = excluded.business_type,
  timezone = excluded.timezone,
  updated_at = now();

insert into public.user_settings (
  user_id,
  default_currency,
  default_business_percentage,
  theme,
  language
)
values
  ('11111111-1111-1111-1111-111111111111', 'USD', 90, 'system', 'en'),
  ('22222222-2222-2222-2222-222222222222', 'CAD', 85, 'dark', 'en')
on conflict (user_id) do update
set
  default_currency = excluded.default_currency,
  default_business_percentage = excluded.default_business_percentage,
  theme = excluded.theme,
  language = excluded.language,
  updated_at = now();

insert into public."business-types" (name, image_url, description)
values
  (
    'Uber',
    null,
    'Rideshare and delivery platform for drivers and couriers.'
  ),
  (
    'Lyft',
    null,
    'Rideshare platform for independent drivers.'
  ),
  (
    'DoorDash',
    null,
    'Food and convenience delivery platform for couriers.'
  ),
  (
    'Uber Eats',
    null,
    'Food delivery platform for couriers.'
  ),
  (
    'Instacart',
    null,
    'Grocery shopping and delivery platform.'
  ),
  (
    'SkipTheDishes',
    null,
    'Food delivery platform commonly used in Canada.'
  ),
  (
    'Amazon Flex',
    null,
    'Package delivery platform for independent drivers.'
  ),
  (
    'Turo',
    null,
    'Car sharing platform for vehicle hosts.'
  ),
  (
    'Freelancer',
    null,
    'Independent contract, project, or client-based work.'
  ),
  (
    'Other',
    null,
    'Any other gig, contract, or self-employment business type.'
  )
on conflict (name) do update
set
  image_url = excluded.image_url,
  description = excluded.description;

insert into public.expense_categories (
  name,
  slug,
  icon,
  color,
  is_default
)
values
  ('Vehicle Lease', 'vehicle-lease', 'car-front', '#0f766e', false)
on conflict (slug) do update
set
  name = excluded.name,
  icon = excluded.icon,
  color = excluded.color,
  is_default = excluded.is_default,
  updated_at = now();

insert into public.receipts (
  id,
  user_id,
  storage_path,
  bucket_name,
  original_filename,
  mime_type,
  file_size,
  uploaded_at
)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111/receipts/shell-fuel.jpg',
    'receipts',
    'shell-fuel.jpg',
    'image/jpeg',
    248391,
    '2026-06-10 14:20:00+00'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111/receipts/parking.pdf',
    'receipts',
    'parking.pdf',
    'application/pdf',
    93218,
    '2026-06-12 18:45:00+00'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222/receipts/oil-change.jpg',
    'receipts',
    'oil-change.jpg',
    'image/jpeg',
    318004,
    '2026-06-15 16:10:00+00'
  )
on conflict (id) do update
set
  storage_path = excluded.storage_path,
  bucket_name = excluded.bucket_name,
  original_filename = excluded.original_filename,
  mime_type = excluded.mime_type,
  file_size = excluded.file_size,
  uploaded_at = excluded.uploaded_at;

insert into public.transactions (
  id,
  user_id,
  category_id,
  receipt_id,
  type,
  amount,
  currency,
  transaction_date,
  merchant,
  description,
  payment_method,
  business_percentage,
  tax_deductible,
  notes
)
values
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
    '11111111-1111-1111-1111-111111111111',
    (select id from public.expense_categories where slug = 'fuel'),
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'expense',
    54.23,
    'USD',
    '2026-06-10',
    'Shell',
    'Fuel before airport shift',
    'credit_card',
    90,
    true,
    'Mostly business miles'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
    '11111111-1111-1111-1111-111111111111',
    (select id from public.expense_categories where slug = 'parking'),
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    'expense',
    18.00,
    'USD',
    '2026-06-12',
    'Downtown Garage',
    'Parking while waiting for rides',
    'apple_pay',
    100,
    true,
    null
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3',
    '11111111-1111-1111-1111-111111111111',
    null,
    null,
    'income',
    438.75,
    'USD',
    '2026-06-14',
    'Uber',
    'Weekly payout',
    'other',
    100,
    false,
    'Imported payout sample'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4',
    '22222222-2222-2222-2222-222222222222',
    (select id from public.expense_categories where slug = 'maintenance'),
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    'expense',
    126.49,
    'CAD',
    '2026-06-15',
    'Quick Lube',
    'Oil change',
    'debit_card',
    85,
    true,
    'Shared vehicle'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb5',
    '22222222-2222-2222-2222-222222222222',
    null,
    null,
    'income',
    312.60,
    'CAD',
    '2026-06-16',
    'DoorDash',
    'Delivery payout',
    'other',
    100,
    false,
    null
  )
on conflict (id) do update
set
  category_id = excluded.category_id,
  receipt_id = excluded.receipt_id,
  type = excluded.type,
  amount = excluded.amount,
  currency = excluded.currency,
  transaction_date = excluded.transaction_date,
  merchant = excluded.merchant,
  description = excluded.description,
  payment_method = excluded.payment_method,
  business_percentage = excluded.business_percentage,
  tax_deductible = excluded.tax_deductible,
  notes = excluded.notes,
  updated_at = now();

insert into public.ai_receipt_extractions (
  id,
  receipt_id,
  merchant,
  amount,
  tax,
  currency,
  expense_date,
  category_name,
  confidence,
  raw_response
)
values
  (
    'cccccccc-cccc-cccc-cccc-ccccccccccc1',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'Shell',
    54.23,
    3.12,
    'USD',
    '2026-06-10',
    'Fuel',
    94.50,
    '{"model":"mock","fields":{"merchant":"Shell","amount":54.23}}'::jsonb
  ),
  (
    'cccccccc-cccc-cccc-cccc-ccccccccccc2',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    'Quick Lube',
    126.49,
    14.55,
    'CAD',
    '2026-06-15',
    'Maintenance',
    91.20,
    '{"model":"mock","fields":{"merchant":"Quick Lube","amount":126.49}}'::jsonb
  )
on conflict (id) do update
set
  merchant = excluded.merchant,
  amount = excluded.amount,
  tax = excluded.tax,
  currency = excluded.currency,
  expense_date = excluded.expense_date,
  category_name = excluded.category_name,
  confidence = excluded.confidence,
  raw_response = excluded.raw_response;

insert into public.subscriptions (
  id,
  user_id,
  plan,
  status,
  stripe_customer_id,
  stripe_subscription_id,
  current_period_end
)
values
  (
    'dddddddd-dddd-dddd-dddd-ddddddddddd1',
    '11111111-1111-1111-1111-111111111111',
    'pro',
    'active',
    'cus_mock_maya',
    'sub_mock_maya',
    '2026-07-30 00:00:00+00'
  ),
  (
    'dddddddd-dddd-dddd-dddd-ddddddddddd2',
    '22222222-2222-2222-2222-222222222222',
    'free',
    'active',
    null,
    null,
    null
  )
on conflict (id) do update
set
  plan = excluded.plan,
  status = excluded.status,
  stripe_customer_id = excluded.stripe_customer_id,
  stripe_subscription_id = excluded.stripe_subscription_id,
  current_period_end = excluded.current_period_end,
  updated_at = now();

insert into public.ai_conversations (
  id,
  user_id,
  title
)
values
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1',
    '11111111-1111-1111-1111-111111111111',
    'June deduction review'
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2',
    '22222222-2222-2222-2222-222222222222',
    'Delivery income summary'
  )
on conflict (id) do update
set
  title = excluded.title,
  updated_at = now();

insert into public.ai_messages (
  id,
  conversation_id,
  role,
  content
)
values
  (
    'ffffffff-ffff-ffff-ffff-fffffffffff1',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1',
    'user',
    'What can I deduct from this week?'
  ),
  (
    'ffffffff-ffff-ffff-ffff-fffffffffff2',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1',
    'assistant',
    'Fuel and parking look deductible based on the mock transaction data.'
  ),
  (
    'ffffffff-ffff-ffff-ffff-fffffffffff3',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2',
    'user',
    'How much did I earn from deliveries?'
  ),
  (
    'ffffffff-ffff-ffff-ffff-fffffffffff4',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2',
    'assistant',
    'The mock DoorDash payout is CAD 312.60.'
  )
on conflict (id) do update
set
  role = excluded.role,
  content = excluded.content;
