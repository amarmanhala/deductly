create table if not exists public."business-types" (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  image_url text,
  description text,
  brand_color text
);

insert into public."business-types" (name, image_url, description, brand_color)
values
  (
    'Uber',
    null,
    'Rideshare and delivery platform for drivers and couriers.',
    '#000000'
  ),
  (
    'Lyft',
    null,
    'Rideshare platform for independent drivers.',
    '#FF00BF'
  ),
  (
    'DoorDash',
    null,
    'Food and convenience delivery platform for couriers.',
    '#EB1700'
  ),
  (
    'Uber Eats',
    null,
    'Food delivery platform for couriers.',
    '#06C167'
  ),
  (
    'Instacart',
    null,
    'Grocery shopping and delivery platform.',
    '#43B02A'
  ),
  (
    'SkipTheDishes',
    null,
    'Food delivery platform commonly used in Canada.',
    '#FF8000'
  ),
  (
    'Amazon Flex',
    null,
    'Package delivery platform for independent drivers.',
    '#FF9900'
  ),
  (
    'Turo',
    null,
    'Car sharing platform for vehicle hosts.',
    '#593CFB'
  ),
  (
    'Freelancer',
    null,
    'Independent contract, project, or client-based work.',
    '#29B2FE'
  ),
  (
    'Other',
    null,
    'Any other gig, contract, or self-employment business type.',
    '#6B7280'
  )
on conflict (name) do update
set
  image_url = excluded.image_url,
  description = excluded.description,
  brand_color = excluded.brand_color;
