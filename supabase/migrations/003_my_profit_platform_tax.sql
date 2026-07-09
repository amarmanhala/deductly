create table if not exists public.business_platforms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  work_kind text not null default 'other' check (
    work_kind in ('rideshare', 'delivery', 'shopping', 'freelance', 'other')
  ),
  country text not null default 'CA',
  region text,
  default_currency text not null default 'CAD',
  tax_name text not null default 'HST',
  default_tax_rate numeric(6,5) not null default 0.13 check (
    default_tax_rate >= 0
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_business_platforms_updated_at
before update on public.business_platforms
for each row execute function public.set_updated_at();

insert into public.business_platforms (
  name,
  slug,
  work_kind,
  country,
  region,
  default_currency,
  tax_name,
  default_tax_rate
)
values
  ('Uber', 'uber', 'rideshare', 'CA', 'ON', 'CAD', 'HST', 0.13),
  ('Lyft', 'lyft', 'rideshare', 'CA', 'ON', 'CAD', 'HST', 0.13),
  ('Uber Eats', 'uber-eats', 'delivery', 'CA', 'ON', 'CAD', 'HST', 0.13),
  ('DoorDash', 'doordash', 'delivery', 'CA', 'ON', 'CAD', 'HST', 0.13),
  ('Instacart', 'instacart', 'shopping', 'CA', 'ON', 'CAD', 'HST', 0.13),
  ('SkipTheDishes', 'skip-the-dishes', 'delivery', 'CA', 'ON', 'CAD', 'HST', 0.13),
  ('Amazon Flex', 'amazon-flex', 'delivery', 'CA', 'ON', 'CAD', 'HST', 0.13),
  ('Turo', 'turo', 'other', 'CA', 'ON', 'CAD', 'HST', 0.13),
  ('Freelancer', 'freelancer', 'freelance', 'CA', 'ON', 'CAD', 'HST', 0.13),
  ('Other', 'other', 'other', 'CA', 'ON', 'CAD', 'HST', 0.13)
on conflict (slug) do update
set
  name = excluded.name,
  work_kind = excluded.work_kind,
  country = excluded.country,
  region = excluded.region,
  default_currency = excluded.default_currency,
  tax_name = excluded.tax_name,
  default_tax_rate = excluded.default_tax_rate,
  updated_at = now();

alter table public.transactions
add column if not exists platform_id uuid references public.business_platforms(id) on delete set null,
add column if not exists source_type text,
add column if not exists amount_before_tax numeric(10,2),
add column if not exists tax_amount numeric(10,2),
add column if not exists amount_after_tax numeric(10,2),
add column if not exists platform_fee numeric(10,2) not null default 0,
add column if not exists net_amount numeric(10,2),
add column if not exists expense_tax_recoverable boolean not null default true,
add column if not exists deductible_amount numeric(10,2),
add column if not exists tax_credit_amount numeric(10,2);

create table if not exists public.user_tax_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  country text not null default 'CA',
  region text not null default 'ON',
  tax_name text not null default 'HST',
  tax_rate numeric(6,5) not null default 0.13 check (tax_rate >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_user_tax_settings_updated_at
before update on public.user_tax_settings
for each row execute function public.set_updated_at();

create table if not exists public.platform_statements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform_id uuid references public.business_platforms(id) on delete set null,
  receipt_id uuid references public.receipts(id) on delete set null,
  statement_type text not null default 'annual_tax_summary' check (
    statement_type in ('daily', 'weekly', 'monthly', 'annual_tax_summary')
  ),
  period_start date,
  period_end date,
  gross_income numeric(10,2),
  tax_collected numeric(10,2),
  platform_fees numeric(10,2),
  tips numeric(10,2),
  bonuses numeric(10,2),
  net_payout numeric(10,2),
  currency text not null default 'CAD',
  raw_data jsonb,
  created_at timestamptz not null default now()
);

insert into public.user_tax_settings (user_id, country, region, tax_name, tax_rate)
select id, coalesce(country, 'CA'), 'ON', 'HST', 0.13
from public.profiles
on conflict (user_id) do nothing;

update public.transactions
set source_type = case
    when type = 'income' then 'fare'
    else null
  end
where source_type is null;

update public.transactions as transactions
set platform_id = business_platforms.id
from public.profiles as profiles
join public.business_platforms as business_platforms
  on lower(regexp_replace(coalesce(profiles.business_type, ''), '[^a-z0-9]', '', 'g'))
   = lower(regexp_replace(business_platforms.name, '[^a-z0-9]', '', 'g'))
where transactions.user_id = profiles.id
and transactions.platform_id is null;

update public.transactions
set
  amount_before_tax = case
    when type = 'income' then amount
    else round(amount / 1.13, 2)
  end,
  tax_amount = case
    when type = 'income' then round(amount * 0.13, 2)
    else amount - round(amount / 1.13, 2)
  end,
  amount_after_tax = case
    when type = 'income' then amount + round(amount * 0.13, 2)
    else amount
  end,
  net_amount = case
    when type = 'income' then amount + round(amount * 0.13, 2) - platform_fee
    else amount
  end,
  deductible_amount = case
    when type = 'expense' and tax_deductible
      then round(amount * (business_percentage::numeric / 100), 2)
    else deductible_amount
  end,
  tax_credit_amount = case
    when type = 'expense' and tax_deductible and expense_tax_recoverable
      then round(amount * 0.13 * (business_percentage::numeric / 100), 2)
    else tax_credit_amount
  end
where amount_before_tax is null
or tax_amount is null
or amount_after_tax is null
or net_amount is null
or (type = 'expense' and deductible_amount is null)
or (type = 'expense' and tax_credit_amount is null);

create index if not exists business_platforms_slug_idx
on public.business_platforms(slug);

create index if not exists transactions_platform_id_idx
on public.transactions(platform_id);

create index if not exists transactions_source_type_idx
on public.transactions(source_type);

create index if not exists platform_statements_user_id_idx
on public.platform_statements(user_id);

create index if not exists platform_statements_platform_id_idx
on public.platform_statements(platform_id);

create index if not exists platform_statements_period_idx
on public.platform_statements(period_start, period_end);

alter table public.business_platforms enable row level security;
alter table public.user_tax_settings enable row level security;
alter table public.platform_statements enable row level security;

create policy "Users can read business platforms"
on public.business_platforms for select
to authenticated
using (true);

create policy "Users can read own tax settings"
on public.user_tax_settings for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own tax settings"
on public.user_tax_settings for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own tax settings"
on public.user_tax_settings for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own tax settings"
on public.user_tax_settings for delete
to authenticated
using (auth.uid() = user_id);

create policy "Users can read own platform statements"
on public.platform_statements for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own platform statements"
on public.platform_statements for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own platform statements"
on public.platform_statements for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own platform statements"
on public.platform_statements for delete
to authenticated
using (auth.uid() = user_id);
