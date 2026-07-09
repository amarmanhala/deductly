-- supabase/migrations/001_profiles.sql

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  country text,
  currency text,
  business_type text,
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- supabase/migrations/002_expense_categories.sql

create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon text,
  color text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_expense_categories_updated_at
before update on public.expense_categories
for each row execute function public.set_updated_at();

-- supabase/migrations/003_receipts.sql

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  bucket_name text not null default 'receipts',
  original_filename text,
  mime_type text,
  file_size bigint,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- supabase/migrations/004_transactions.sql

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid references public.expense_categories(id) on delete set null,
  receipt_id uuid references public.receipts(id) on delete set null,
  type text not null default 'expense' check (type in ('expense', 'income')),
  amount numeric(10,2) not null check (amount >= 0),
  currency text not null,
  transaction_date date not null,
  merchant text,
  description text,
  payment_method text check (
    payment_method is null
    or payment_method in ('cash', 'credit_card', 'debit_card', 'apple_pay', 'google_pay', 'other')
  ),
  business_percentage integer not null default 100 check (
    business_percentage >= 0 and business_percentage <= 100
  ),
  tax_deductible boolean not null default true,
  notes text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_transactions_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

-- supabase/migrations/005_ai_receipt_extractions.sql

create table public.ai_receipt_extractions (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts(id) on delete cascade,
  merchant text,
  amount numeric(10,2),
  tax numeric(10,2),
  currency text,
  expense_date date,
  category_name text,
  confidence numeric(4,2) check (confidence is null or (confidence >= 0 and confidence <= 100)),
  raw_response jsonb,
  created_at timestamptz not null default now()
);

-- supabase/migrations/006_subscriptions.sql

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  status text,
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

-- supabase/migrations/007_user_settings.sql

create table public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  default_currency text,
  default_business_percentage integer not null default 100 check (
    default_business_percentage >= 0 and default_business_percentage <= 100
  ),
  theme text,
  language text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_user_settings_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

-- supabase/migrations/008_ai_conversations.sql

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_ai_conversations_updated_at
before update on public.ai_conversations
for each row execute function public.set_updated_at();

-- supabase/migrations/009_ai_messages.sql

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('system', 'user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- supabase/migrations/010_indexes.sql

create index receipts_user_id_idx on public.receipts(user_id);
create index receipts_uploaded_at_idx on public.receipts(uploaded_at desc);

create index transactions_user_id_idx on public.transactions(user_id);
create index transactions_category_id_idx on public.transactions(category_id);
create index transactions_receipt_id_idx on public.transactions(receipt_id);
create index transactions_date_idx on public.transactions(transaction_date desc);
create index transactions_type_idx on public.transactions(type);
create index transactions_active_idx on public.transactions(user_id, transaction_date desc)
where is_deleted = false;

create index ai_receipt_extractions_receipt_id_idx on public.ai_receipt_extractions(receipt_id);

create index subscriptions_user_id_idx on public.subscriptions(user_id);
create unique index subscriptions_stripe_customer_id_idx
on public.subscriptions(stripe_customer_id)
where stripe_customer_id is not null;
create unique index subscriptions_stripe_subscription_id_idx
on public.subscriptions(stripe_subscription_id)
where stripe_subscription_id is not null;

create index ai_conversations_user_id_idx on public.ai_conversations(user_id);
create index ai_messages_conversation_id_idx on public.ai_messages(conversation_id);

-- supabase/migrations/011_rls.sql

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('receipts', 'receipts', false)
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.receipts enable row level security;
alter table public.transactions enable row level security;
alter table public.ai_receipt_extractions enable row level security;
alter table public.subscriptions enable row level security;
alter table public.user_settings enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;

create policy "Users can read own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

create policy "Users can insert own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users can delete own profile"
on public.profiles for delete
to authenticated
using (auth.uid() = id);

create policy "Users can read own receipts"
on public.receipts for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own receipts"
on public.receipts for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own receipts"
on public.receipts for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own receipts"
on public.receipts for delete
to authenticated
using (auth.uid() = user_id);

create policy "Users can read own transactions"
on public.transactions for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own transactions"
on public.transactions for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own transactions"
on public.transactions for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own transactions"
on public.transactions for delete
to authenticated
using (auth.uid() = user_id);

create policy "Users can read own receipt extractions"
on public.ai_receipt_extractions for select
to authenticated
using (
  exists (
    select 1 from public.receipts
    where receipts.id = ai_receipt_extractions.receipt_id
    and receipts.user_id = auth.uid()
  )
);

create policy "Users can insert own receipt extractions"
on public.ai_receipt_extractions for insert
to authenticated
with check (
  exists (
    select 1 from public.receipts
    where receipts.id = ai_receipt_extractions.receipt_id
    and receipts.user_id = auth.uid()
  )
);

create policy "Users can update own receipt extractions"
on public.ai_receipt_extractions for update
to authenticated
using (
  exists (
    select 1 from public.receipts
    where receipts.id = ai_receipt_extractions.receipt_id
    and receipts.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.receipts
    where receipts.id = ai_receipt_extractions.receipt_id
    and receipts.user_id = auth.uid()
  )
);

create policy "Users can delete own receipt extractions"
on public.ai_receipt_extractions for delete
to authenticated
using (
  exists (
    select 1 from public.receipts
    where receipts.id = ai_receipt_extractions.receipt_id
    and receipts.user_id = auth.uid()
  )
);

create policy "Users can read own subscriptions"
on public.subscriptions for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own subscriptions"
on public.subscriptions for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own subscriptions"
on public.subscriptions for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own subscriptions"
on public.subscriptions for delete
to authenticated
using (auth.uid() = user_id);

create policy "Users can read own settings"
on public.user_settings for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own settings"
on public.user_settings for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own settings"
on public.user_settings for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own settings"
on public.user_settings for delete
to authenticated
using (auth.uid() = user_id);

create policy "Users can read own conversations"
on public.ai_conversations for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own conversations"
on public.ai_conversations for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own conversations"
on public.ai_conversations for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own conversations"
on public.ai_conversations for delete
to authenticated
using (auth.uid() = user_id);

create policy "Users can read messages in own conversations"
on public.ai_messages for select
to authenticated
using (
  exists (
    select 1 from public.ai_conversations
    where ai_conversations.id = ai_messages.conversation_id
    and ai_conversations.user_id = auth.uid()
  )
);

create policy "Users can insert messages in own conversations"
on public.ai_messages for insert
to authenticated
with check (
  exists (
    select 1 from public.ai_conversations
    where ai_conversations.id = ai_messages.conversation_id
    and ai_conversations.user_id = auth.uid()
  )
);

create policy "Users can update messages in own conversations"
on public.ai_messages for update
to authenticated
using (
  exists (
    select 1 from public.ai_conversations
    where ai_conversations.id = ai_messages.conversation_id
    and ai_conversations.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.ai_conversations
    where ai_conversations.id = ai_messages.conversation_id
    and ai_conversations.user_id = auth.uid()
  )
);

create policy "Users can delete messages in own conversations"
on public.ai_messages for delete
to authenticated
using (
  exists (
    select 1 from public.ai_conversations
    where ai_conversations.id = ai_messages.conversation_id
    and ai_conversations.user_id = auth.uid()
  )
);

create policy "Users can upload own avatars"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can update own avatars"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can read avatars"
on storage.objects for select
to authenticated
using (bucket_id = 'avatars');

create policy "Users can delete own avatars"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can manage own receipts storage"
on storage.objects for all
to authenticated
using (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- supabase/migrations/012_seed_categories.sql

insert into public.expense_categories (name, slug, icon, color, is_default)
values
  ('Fuel', 'fuel', 'fuel', '#ef4444', true),
  ('Parking', 'parking', 'square-parking', '#f97316', true),
  ('Insurance', 'insurance', 'shield', '#eab308', true),
  ('Maintenance', 'maintenance', 'wrench', '#22c55e', true),
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
