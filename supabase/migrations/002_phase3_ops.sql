-- Phase 3 operational settings that the initial schema cannot store.
-- Checklist keys stay in providers.verification_badges.
-- Dispute outcomes stay in disputes.status and resolution_notes.
-- Every statement is safe to run again in the Supabase SQL Editor.

alter table public.plans
  add column if not exists included_service_count integer not null default 0;

create table if not exists public.clinical_thresholds (
  id integer primary key default 1,
  yellow_systolic integer not null default 140,
  red_systolic integer not null default 180,
  yellow_diastolic integer not null default 90,
  red_diastolic integer not null default 120,
  yellow_fasting_glucose numeric(6, 1) not null default 126,
  red_fasting_glucose numeric(6, 1) not null default 300,
  yellow_random_glucose numeric(6, 1) not null default 200,
  red_random_glucose numeric(6, 1) not null default 300,
  updated_at timestamptz not null default now(),
  constraint clinical_thresholds_singleton check (id = 1)
);

insert into public.clinical_thresholds (id) values (1)
on conflict (id) do nothing;

create table if not exists public.feature_flags (
  key text primary key,
  label text not null,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.feature_flags (key, label, enabled) values
  ('yoruba_audio_prompts', 'Yoruba Audio Prompts', true),
  ('self_sponsored_signup', 'Self-Sponsored Signup', true),
  ('offline_sync_queue', 'Offline Sync Queue', true),
  ('sms_whatsapp_dispatch', 'SMS/WhatsApp Dispatch', false)
on conflict (key) do nothing;

create table if not exists public.city_visit_caps (
  city text primary key,
  cap_ngn numeric(12, 2),
  updated_at timestamptz not null default now()
);

insert into public.city_visit_caps (city, cap_ngn) values
  ('Ilorin', null),
  ('Lagos', null),
  ('Abuja', null)
on conflict (city) do nothing;

alter table public.clinical_thresholds enable row level security;
alter table public.feature_flags enable row level security;
alter table public.city_visit_caps enable row level security;

drop policy if exists thresholds_select on public.clinical_thresholds;
create policy thresholds_select on public.clinical_thresholds
for select to authenticated
using (true);

drop policy if exists thresholds_write on public.clinical_thresholds;
create policy thresholds_write on public.clinical_thresholds
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists flags_select on public.feature_flags;
create policy flags_select on public.feature_flags
for select to anon, authenticated
using (true);

drop policy if exists flags_write on public.feature_flags;
create policy flags_write on public.feature_flags
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists caps_select on public.city_visit_caps;
create policy caps_select on public.city_visit_caps
for select to authenticated
using (true);

drop policy if exists caps_write on public.city_visit_caps;
create policy caps_write on public.city_visit_caps
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select on public.clinical_thresholds to authenticated;
grant select, insert, update, delete on public.clinical_thresholds to authenticated;

grant select on public.feature_flags to anon, authenticated;
grant select, insert, update, delete on public.feature_flags to authenticated;

grant select on public.city_visit_caps to authenticated;
grant select, insert, update, delete on public.city_visit_caps to authenticated;
