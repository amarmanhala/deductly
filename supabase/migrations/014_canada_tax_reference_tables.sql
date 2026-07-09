create table if not exists public.tax_jurisdictions (
  id uuid primary key default gen_random_uuid(),
  country_code text not null,
  region_code text not null,
  region_name text not null,
  tax_year integer not null check (tax_year >= 2000),
  tax_kind text not null check (
    tax_kind in ('income_federal', 'income_provincial', 'gst_hst', 'cpp_qpp')
  ),
  effective_from date not null,
  effective_to date,
  source_url text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (country_code, region_code, tax_year, tax_kind)
);

create trigger set_tax_jurisdictions_updated_at
before update on public.tax_jurisdictions
for each row execute function public.set_updated_at();

create table if not exists public.tax_brackets (
  id uuid primary key default gen_random_uuid(),
  tax_jurisdiction_id uuid not null references public.tax_jurisdictions(id) on delete cascade,
  bracket_type text not null check (
    bracket_type in ('income_federal', 'income_provincial', 'gst_hst', 'cpp_qpp')
  ),
  lower_bound numeric(12,2) not null default 0 check (lower_bound >= 0),
  upper_bound numeric(12,2) check (upper_bound is null or upper_bound > lower_bound),
  rate numeric(8,6) not null check (rate >= 0),
  base_tax_amount numeric(12,2) not null default 0 check (base_tax_amount >= 0),
  sort_order integer not null,
  created_at timestamptz not null default now(),
  unique (tax_jurisdiction_id, bracket_type, sort_order)
);

create table if not exists public.tax_thresholds (
  id uuid primary key default gen_random_uuid(),
  tax_jurisdiction_id uuid not null references public.tax_jurisdictions(id) on delete cascade,
  threshold_type text not null check (
    threshold_type in (
      'small_supplier',
      'mandatory_registration',
      'basic_personal_amount'
    )
  ),
  amount numeric(12,2) check (amount is null or amount >= 0),
  period_type text not null,
  applies_to text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.tax_credits (
  id uuid primary key default gen_random_uuid(),
  tax_jurisdiction_id uuid not null references public.tax_jurisdictions(id) on delete cascade,
  credit_type text not null,
  amount numeric(12,2) check (amount is null or amount >= 0),
  rate numeric(8,6) check (rate is null or rate >= 0),
  notes text,
  created_at timestamptz not null default now(),
  unique (tax_jurisdiction_id, credit_type)
);

alter table public.user_tax_settings
add column if not exists tax_year integer not null default 2026 check (tax_year >= 2000),
add column if not exists federal_income_tax_jurisdiction_id uuid references public.tax_jurisdictions(id) on delete set null,
add column if not exists provincial_income_tax_jurisdiction_id uuid references public.tax_jurisdictions(id) on delete set null,
add column if not exists gst_hst_jurisdiction_id uuid references public.tax_jurisdictions(id) on delete set null;

create index if not exists tax_jurisdictions_lookup_idx
on public.tax_jurisdictions(country_code, region_code, tax_year, tax_kind);

create index if not exists tax_brackets_jurisdiction_idx
on public.tax_brackets(tax_jurisdiction_id, bracket_type, sort_order);

create index if not exists tax_thresholds_jurisdiction_idx
on public.tax_thresholds(tax_jurisdiction_id, threshold_type);

create index if not exists tax_credits_jurisdiction_idx
on public.tax_credits(tax_jurisdiction_id, credit_type);

alter table public.tax_jurisdictions enable row level security;
alter table public.tax_brackets enable row level security;
alter table public.tax_thresholds enable row level security;
alter table public.tax_credits enable row level security;

create policy "Authenticated users can read tax jurisdictions"
on public.tax_jurisdictions for select
to authenticated
using (true);

create policy "Authenticated users can read tax brackets"
on public.tax_brackets for select
to authenticated
using (true);

create policy "Authenticated users can read tax thresholds"
on public.tax_thresholds for select
to authenticated
using (true);

create policy "Authenticated users can read tax credits"
on public.tax_credits for select
to authenticated
using (true);

insert into public.tax_jurisdictions (
  country_code,
  region_code,
  region_name,
  tax_year,
  tax_kind,
  effective_from,
  effective_to,
  source_url,
  notes
)
values
  (
    'CA',
    'FED',
    'Canada',
    2026,
    'income_federal',
    '2026-01-01',
    '2026-12-31',
    'https://www.canada.ca/en/revenue-agency/services/tax/individuals/tax-rates-brackets/current-year.html',
    'Federal personal income tax brackets for income earned in 2026. Rates are progressive; there is no universal no-tax income floor.'
  ),
  (
    'CA',
    'ON',
    'Ontario',
    2026,
    'income_provincial',
    '2026-01-01',
    '2026-12-31',
    'https://www.canada.ca/en/revenue-agency/services/tax/individuals/tax-rates-brackets/current-year.html',
    'Ontario personal income tax brackets for income earned in 2026. Provincial tax applies in addition to federal tax.'
  ),
  (
    'CA',
    'ON',
    'Ontario',
    2026,
    'gst_hst',
    '2026-01-01',
    '2026-12-31',
    'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/charge-collect-which-rate/calculator.html',
    'Ontario HST rate for taxable supplies. Registration thresholds are stored separately because ride-sharing has a special rule.'
  )
on conflict (country_code, region_code, tax_year, tax_kind) do update
set
  region_name = excluded.region_name,
  effective_from = excluded.effective_from,
  effective_to = excluded.effective_to,
  source_url = excluded.source_url,
  notes = excluded.notes,
  updated_at = now();

insert into public.tax_brackets (
  tax_jurisdiction_id,
  bracket_type,
  lower_bound,
  upper_bound,
  rate,
  base_tax_amount,
  sort_order
)
select
  tax_jurisdictions.id,
  bracket.bracket_type,
  bracket.lower_bound,
  bracket.upper_bound,
  bracket.rate,
  bracket.base_tax_amount,
  bracket.sort_order
from public.tax_jurisdictions
join (
  values
    ('FED', 'income_federal', 'income_federal', 0.00, 58523.00, 0.140000, 0.00, 1),
    ('FED', 'income_federal', 'income_federal', 58523.01, 117045.00, 0.205000, 8193.22, 2),
    ('FED', 'income_federal', 'income_federal', 117045.01, 181440.00, 0.260000, 20190.23, 3),
    ('FED', 'income_federal', 'income_federal', 181440.01, 258482.00, 0.290000, 36933.15, 4),
    ('FED', 'income_federal', 'income_federal', 258482.01, null, 0.330000, 59275.33, 5),
    ('ON', 'income_provincial', 'income_provincial', 0.00, 53891.00, 0.050500, 0.00, 1),
    ('ON', 'income_provincial', 'income_provincial', 53891.01, 107785.00, 0.091500, 2721.50, 2),
    ('ON', 'income_provincial', 'income_provincial', 107785.01, 150000.00, 0.111600, 7653.80, 3),
    ('ON', 'income_provincial', 'income_provincial', 150000.01, 220000.00, 0.121600, 12364.99, 4),
    ('ON', 'income_provincial', 'income_provincial', 220000.01, null, 0.131600, 20876.99, 5),
    ('ON', 'gst_hst', 'gst_hst', 0.00, null, 0.130000, 0.00, 1)
) as bracket(region_code, tax_kind, bracket_type, lower_bound, upper_bound, rate, base_tax_amount, sort_order)
  on tax_jurisdictions.region_code = bracket.region_code
  and tax_jurisdictions.tax_kind = bracket.tax_kind
  and tax_jurisdictions.tax_year = 2026
  and tax_jurisdictions.country_code = 'CA'
on conflict (tax_jurisdiction_id, bracket_type, sort_order) do update
set
  lower_bound = excluded.lower_bound,
  upper_bound = excluded.upper_bound,
  rate = excluded.rate,
  base_tax_amount = excluded.base_tax_amount;

insert into public.tax_thresholds (
  tax_jurisdiction_id,
  threshold_type,
  amount,
  period_type,
  applies_to,
  notes
)
select
  tax_jurisdictions.id,
  threshold.threshold_type,
  threshold.amount,
  threshold.period_type,
  threshold.applies_to,
  threshold.notes
from public.tax_jurisdictions
join (
  values
    (
      'FED',
      'income_federal',
      'basic_personal_amount',
      16452.00,
      'annual',
      'federal_personal_income_tax_maximum',
      '2026 maximum federal basic personal amount for individuals below the phase-out threshold.'
    ),
    (
      'FED',
      'income_federal',
      'basic_personal_amount',
      14829.00,
      'annual',
      'federal_personal_income_tax_minimum',
      '2026 minimum federal basic personal amount for individuals in the top federal bracket.'
    ),
    (
      'ON',
      'gst_hst',
      'small_supplier',
      30000.00,
      'four_consecutive_calendar_quarters',
      'general_taxable_supplies',
      'General GST/HST small supplier threshold. This is not an income-tax no-tax floor.'
    ),
    (
      'ON',
      'gst_hst',
      'mandatory_registration',
      null,
      'first_taxable_supply',
      'taxi_or_commercial_ride_sharing_passenger_transportation',
      'Taxi operators and commercial ride-sharing drivers must register even if they are small suppliers.'
    )
) as threshold(region_code, tax_kind, threshold_type, amount, period_type, applies_to, notes)
  on tax_jurisdictions.region_code = threshold.region_code
  and tax_jurisdictions.tax_kind = threshold.tax_kind
  and tax_jurisdictions.tax_year = 2026
  and tax_jurisdictions.country_code = 'CA';

insert into public.tax_credits (
  tax_jurisdiction_id,
  credit_type,
  amount,
  rate,
  notes
)
select
  tax_jurisdictions.id,
  credit.credit_type,
  credit.amount,
  credit.rate,
  credit.notes
from public.tax_jurisdictions
join (
  values
    (
      'FED',
      'income_federal',
      'federal_basic_personal_amount_maximum',
      16452.00,
      0.140000,
      'Federal non-refundable credit data for the 2026 maximum basic personal amount.'
    ),
    (
      'FED',
      'income_federal',
      'federal_basic_personal_amount_minimum',
      14829.00,
      0.140000,
      'Federal non-refundable credit data for the 2026 minimum basic personal amount.'
    )
) as credit(region_code, tax_kind, credit_type, amount, rate, notes)
  on tax_jurisdictions.region_code = credit.region_code
  and tax_jurisdictions.tax_kind = credit.tax_kind
  and tax_jurisdictions.tax_year = 2026
  and tax_jurisdictions.country_code = 'CA'
on conflict (tax_jurisdiction_id, credit_type) do update
set
  amount = excluded.amount,
  rate = excluded.rate,
  notes = excluded.notes;

update public.user_tax_settings
set
  tax_year = 2026,
  tax_name = 'HST',
  tax_rate = 0.13,
  federal_income_tax_jurisdiction_id = federal_tax.id,
  provincial_income_tax_jurisdiction_id = provincial_tax.id,
  gst_hst_jurisdiction_id = gst_hst.id
from public.tax_jurisdictions as federal_tax
join public.tax_jurisdictions as provincial_tax
  on provincial_tax.country_code = federal_tax.country_code
  and provincial_tax.region_code = 'ON'
  and provincial_tax.tax_year = federal_tax.tax_year
  and provincial_tax.tax_kind = 'income_provincial'
join public.tax_jurisdictions as gst_hst
  on gst_hst.country_code = federal_tax.country_code
  and gst_hst.region_code = 'ON'
  and gst_hst.tax_year = federal_tax.tax_year
  and gst_hst.tax_kind = 'gst_hst'
where country = 'CA'
and region = 'ON'
and federal_tax.country_code = 'CA'
and federal_tax.region_code = 'FED'
and federal_tax.tax_year = 2026
and federal_tax.tax_kind = 'income_federal';
