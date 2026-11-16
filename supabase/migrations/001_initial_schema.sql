-- Myndora Care initial schema.
-- NDPR: this schema intentionally has no NIN, voter ID, or selfie columns.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.app_role as enum (
  'patient',
  'sponsor',
  'chw',
  'pharmacy',
  'clinician',
  'admin',
  'super_admin'
);

create type public.profile_status as enum ('active', 'invited', 'suspended');

create type public.risk_status as enum ('green', 'yellow', 'red');

create type public.consent_status as enum ('pending', 'approved', 'revoked');

create type public.provider_type as enum ('chw', 'pharmacy', 'clinician');

create type public.verification_status as enum (
  'pending',
  'remote_approved',
  'home_visit_approved',
  'verified',
  'suspended'
);

create type public.vital_source as enum ('patient', 'chw', 'pharmacy', 'caregiver');

create type public.glucose_type as enum ('fasting', 'random', 'none');

create type public.sync_status as enum ('draft', 'pending_sync', 'synced', 'conflict');

create type public.visit_type as enum ('remote_check', 'physical_visit');

create type public.visit_status as enum (
  'scheduled',
  'in_progress',
  'completed_pending_sync',
  'completed_verified',
  'completed_unverified',
  'needs_review',
  'missed',
  'disputed'
);

create type public.visit_sync_status as enum (
  'draft',
  'pending_sync',
  'synced',
  'failed_sync'
);

create type public.refill_status as enum (
  'requested',
  'ready_for_pickup',
  'fulfilled',
  'unavailable'
);

create type public.alert_status as enum ('new', 'in_review', 'resolved');

create type public.consultation_status as enum ('open', 'in_review', 'completed');

create type public.plan_kind as enum (
  'daily_subscription',
  'family_care',
  'physical_visit_addon'
);

create type public.billing_interval as enum ('daily', 'monthly', 'one_time');

create type public.subscription_status as enum (
  'trialing',
  'active',
  'past_due',
  'cancelled'
);

create type public.dispute_status as enum (
  'open',
  'under_review',
  'upheld',
  'rejected'
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text,
  email text,
  primary_role public.app_role not null default 'patient',
  preferred_language text not null default 'en',
  status public.profile_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles (id) on delete set null,
  age integer,
  gender text,
  city text,
  state text,
  address text,
  conditions text[] not null default '{}',
  preferred_language text not null default 'en',
  emergency_contact_name text,
  emergency_contact_phone text,
  is_self_sponsored boolean not null default false,
  consent_accepted boolean not null default false,
  risk_status public.risk_status not null default 'green',
  created_at timestamptz not null default now(),
  constraint patients_age_check check (age is null or (age >= 0 and age <= 130))
);

comment on table public.patients is
  'Care recipients. National ID numbers, voter IDs, and selfies are intentionally omitted (NDPR).';

create table public.sponsors_patients (
  id uuid primary key default gen_random_uuid(),
  sponsor_user_id uuid not null references public.profiles (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  relationship text not null,
  consent_status public.consent_status not null default 'pending',
  created_at timestamptz not null default now(),
  constraint sponsors_patients_unique unique (sponsor_user_id, patient_id)
);

create table public.providers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  provider_name text not null,
  provider_type public.provider_type not null,
  cadre_or_specialty text,
  city text,
  state text,
  service_area text,
  languages_spoken text[] not null default '{}',
  verification_status public.verification_status not null default 'pending',
  verification_badges text[] not null default '{}',
  rating numeric(2, 1),
  completed_visits_count integer not null default 0,
  created_at timestamptz not null default now(),
  constraint providers_rating_check check (rating is null or (rating >= 0 and rating <= 5)),
  constraint providers_visits_check check (completed_visits_count >= 0)
);

create table public.patient_provider_assignments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  provider_id uuid not null references public.providers (id) on delete cascade,
  provider_type public.provider_type not null,
  assigned_by uuid references public.profiles (id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.vitals_log (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  entered_by uuid references public.profiles (id) on delete set null,
  source public.vital_source not null,
  reading_at timestamptz not null default now(),
  systolic integer,
  diastolic integer,
  glucose numeric(6, 1),
  glucose_type public.glucose_type not null default 'none',
  pulse integer,
  temperature numeric(4, 1),
  weight numeric(5, 1),
  symptoms text[] not null default '{}',
  medication_taken boolean,
  risk_status public.risk_status,
  sync_status public.sync_status not null default 'synced',
  notes text,
  created_at timestamptz not null default now(),
  constraint vitals_systolic_check check (systolic is null or systolic between 40 and 300),
  constraint vitals_diastolic_check check (diastolic is null or diastolic between 20 and 200),
  constraint vitals_pulse_check check (pulse is null or pulse between 20 and 250)
);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  chw_provider_id uuid references public.providers (id) on delete set null,
  visit_type public.visit_type not null,
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  gps_lat numeric(9, 6),
  gps_lng numeric(9, 6),
  checklist_responses jsonb not null default '{}'::jsonb,
  audio_language_used text,
  patient_confirmed boolean not null default false,
  confirmation_method text,
  proof_r2_url text,
  status public.visit_status not null default 'scheduled',
  sync_status public.visit_sync_status not null default 'synced',
  notes text,
  created_at timestamptz not null default now()
);

create table public.medications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  medication_name text not null,
  dosage text,
  frequency text,
  refill_due_date date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.pharmacy_refills (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  pharmacy_provider_id uuid references public.providers (id) on delete set null,
  medication_id uuid not null references public.medications (id) on delete cascade,
  status public.refill_status not null default 'requested',
  notes text,
  requested_at timestamptz not null default now(),
  fulfilled_at timestamptz
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  vital_id uuid references public.vitals_log (id) on delete set null,
  visit_id uuid references public.visits (id) on delete set null,
  severity public.risk_status not null,
  title text not null,
  message text not null,
  assigned_to_user_id uuid references public.profiles (id) on delete set null,
  status public.alert_status not null default 'new',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.consultations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  clinician_provider_id uuid references public.providers (id) on delete set null,
  alert_id uuid references public.alerts (id) on delete set null,
  recommendation_notes text,
  follow_up_action text,
  follow_up_date date,
  status public.consultation_status not null default 'open',
  created_at timestamptz not null default now()
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  plan_kind public.plan_kind not null,
  price_daily_ngn numeric(12, 2),
  price_monthly_ngn numeric(12, 2),
  price_one_time_ngn numeric(12, 2),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id),
  patient_id uuid not null references public.patients (id) on delete cascade,
  payer_user_id uuid not null references public.profiles (id),
  billing_interval public.billing_interval not null,
  status public.subscription_status not null default 'active',
  started_at timestamptz not null default now(),
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits (id) on delete cascade,
  raised_by_user_id uuid not null references public.profiles (id),
  reason text not null,
  status public.dispute_status not null default 'open',
  resolution_notes text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (primary_role);
create index patients_user_idx on public.patients (user_id);
create index patients_risk_idx on public.patients (risk_status);
create index sponsors_patients_sponsor_idx on public.sponsors_patients (sponsor_user_id);
create index sponsors_patients_patient_idx on public.sponsors_patients (patient_id);
create index providers_type_idx on public.providers (provider_type);
create index assignments_patient_idx on public.patient_provider_assignments (patient_id);
create index assignments_provider_idx on public.patient_provider_assignments (provider_id);
create index vitals_patient_idx on public.vitals_log (patient_id, reading_at desc);
create index visits_patient_idx on public.visits (patient_id, created_at desc);
create index visits_chw_idx on public.visits (chw_provider_id);
create index medications_patient_idx on public.medications (patient_id);
create index refills_patient_idx on public.pharmacy_refills (patient_id);
create index refills_pharmacy_idx on public.pharmacy_refills (pharmacy_provider_id);
create index alerts_patient_idx on public.alerts (patient_id, status);
create index alerts_assignee_idx on public.alerts (assigned_to_user_id);
create index consultations_patient_idx on public.consultations (patient_id);
create index subscriptions_patient_idx on public.subscriptions (patient_id);
create index subscriptions_payer_idx on public.subscriptions (payer_user_id);
create index disputes_visit_idx on public.disputes (visit_id);
create index audit_logs_actor_idx on public.audit_logs (actor_user_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Auth helpers. security definer so policies do not recurse through RLS.
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and primary_role in ('admin', 'super_admin')
      and status = 'active'
  );
$$;

create or replace function public.is_patient_owner(target_patient uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.patients
    where id = target_patient
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_self_sponsored_owner(target_patient uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.patients
    where id = target_patient
      and user_id = auth.uid()
      and is_self_sponsored
  );
$$;

create or replace function public.is_approved_sponsor(target_patient uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.sponsors_patients
    where patient_id = target_patient
      and sponsor_user_id = auth.uid()
      and consent_status = 'approved'
  );
$$;

create or replace function public.is_assigned_provider(target_patient uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.patient_provider_assignments a
    join public.providers pr on pr.id = a.provider_id
    where a.patient_id = target_patient
      and pr.user_id = auth.uid()
      and a.active
  );
$$;

create or replace function public.is_alert_assignee(target_patient uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.alerts
    where patient_id = target_patient
      and assigned_to_user_id = auth.uid()
  );
$$;

create or replace function public.can_access_patient(target_patient uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or public.is_patient_owner(target_patient)
    or public.is_approved_sponsor(target_patient)
    or public.is_assigned_provider(target_patient)
    or public.is_alert_assignee(target_patient);
$$;

create or replace function public.can_manage_sponsor_view(target_patient uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or public.is_approved_sponsor(target_patient)
    or public.is_self_sponsored_owner(target_patient);
$$;

create or replace function public.can_read_profile(target_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_profile = auth.uid()
    or public.is_admin()
    or exists (
      select 1
      from public.patients p
      where p.user_id = target_profile
        and public.can_access_patient(p.id)
    )
    or exists (
      select 1
      from public.providers pr
      join public.patient_provider_assignments a on a.provider_id = pr.id and a.active
      where pr.user_id = target_profile
        and public.can_access_patient(a.patient_id)
    )
    or exists (
      select 1
      from public.sponsors_patients sp
      where sp.sponsor_user_id = target_profile
        and sp.consent_status = 'approved'
        and public.can_access_patient(sp.patient_id)
    );
$$;

create or replace function public.owns_provider_row(target_provider uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.providers
    where id = target_provider
      and user_id = auth.uid()
  );
$$;

create or replace function public.provider_visible(target_provider uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.owns_provider_row(target_provider)
    or public.is_admin()
    or exists (
      select 1
      from public.patient_provider_assignments a
      where a.provider_id = target_provider
        and a.active
        and public.can_access_patient(a.patient_id)
    );
$$;

create or replace function public.is_my_chw(target_provider uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.providers
    where id = target_provider
      and user_id = auth.uid()
      and provider_type = 'chw'
  );
$$;

create or replace function public.is_my_pharmacy(target_provider uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.providers
    where id = target_provider
      and user_id = auth.uid()
      and provider_type = 'pharmacy'
  );
$$;

create or replace function public.is_my_clinician(target_provider uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.providers
    where id = target_provider
      and user_id = auth.uid()
      and provider_type = 'clinician'
  );
$$;

create or replace function public.visit_is_accessible(target_visit uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.visits v
    where v.id = target_visit
      and public.can_access_patient(v.patient_id)
  );
$$;

create or replace function public.can_raise_dispute(target_visit uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.visits v
    where v.id = target_visit
      and (
        public.is_patient_owner(v.patient_id)
        or public.is_approved_sponsor(v.patient_id)
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- Profile protection and new-user provisioning
-- ---------------------------------------------------------------------------

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.primary_role is distinct from old.primary_role then
      if auth.uid() is not null and not public.is_admin() then
        new.primary_role := old.primary_role;
      end if;
    end if;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
before update on public.profiles
for each row execute function public.protect_profile_role();

create or replace function public.prevent_audit_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_logs are immutable';
end;
$$;

create trigger audit_logs_immutable
before update or delete on public.audit_logs
for each row execute function public.prevent_audit_mutation();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
  resolved_role public.app_role;
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  full_name text := coalesce(meta->>'full_name', '');
  phone text := nullif(meta->>'phone', '');
  language text := coalesce(nullif(meta->>'preferred_language', ''), 'en');
  city text := nullif(meta->>'city', '');
  state text := nullif(meta->>'state', '');
  self_sponsored boolean := coalesce((meta->>'is_self_sponsored')::boolean, false);
begin
  requested_role := coalesce(meta->>'primary_role', 'patient');
  -- Signup metadata is caller-controlled. Staff roles are assigned in seed SQL,
  -- which runs without an end-user JWT and then updates profiles directly.
  if requested_role in ('admin', 'super_admin') then
    requested_role := 'patient';
  end if;
  if requested_role not in ('patient', 'sponsor', 'chw', 'pharmacy', 'clinician') then
    requested_role := 'patient';
  end if;
  resolved_role := requested_role::public.app_role;

  insert into public.profiles (
    id,
    full_name,
    phone,
    email,
    primary_role,
    preferred_language,
    status
  ) values (
    new.id,
    coalesce(full_name, ''),
    phone,
    new.email,
    coalesce(resolved_role, 'patient'::public.app_role),
    coalesce(language, 'en'),
    coalesce('active'::public.profile_status, 'active'::public.profile_status)
  );

  if resolved_role = 'patient' then
    insert into public.patients (
      user_id,
      city,
      state,
      preferred_language,
      conditions,
      is_self_sponsored,
      consent_accepted,
      risk_status
    ) values (
      new.id,
      city,
      state,
      coalesce(language, 'en'),
      coalesce('{}'::text[], '{}'::text[]),
      coalesce(self_sponsored, false),
      coalesce(false, false),
      coalesce('green'::public.risk_status, 'green'::public.risk_status)
    );
  elsif resolved_role in ('chw', 'pharmacy', 'clinician') then
    insert into public.providers (
      user_id,
      provider_name,
      provider_type,
      cadre_or_specialty,
      city,
      state,
      languages_spoken,
      verification_status,
      verification_badges,
      completed_visits_count
    ) values (
      new.id,
      coalesce(nullif(meta->>'provider_name', ''), nullif(full_name, ''), 'New provider'),
      coalesce(resolved_role::text::public.provider_type, 'chw'::public.provider_type),
      nullif(meta->>'cadre_or_specialty', ''),
      city,
      state,
      coalesce(
        case when language = '' then '{}'::text[] else array[language] end,
        '{}'::text[]
      ),
      coalesce('pending'::public.verification_status, 'pending'::public.verification_status),
      coalesce('{}'::text[], '{}'::text[]),
      coalesce(0, 0)
    );
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.sponsors_patients enable row level security;
alter table public.providers enable row level security;
alter table public.patient_provider_assignments enable row level security;
alter table public.vitals_log enable row level security;
alter table public.visits enable row level security;
alter table public.medications enable row level security;
alter table public.pharmacy_refills enable row level security;
alter table public.alerts enable row level security;
alter table public.consultations enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.disputes enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_select on public.profiles
for select to authenticated
using (public.can_read_profile(id));

create policy profiles_update_own on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy profiles_update_admin on public.profiles
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy patients_select on public.patients
for select to authenticated
using (public.can_access_patient(id));

create policy patients_insert on public.patients
for insert to authenticated
with check (
  public.is_admin()
  or user_id = auth.uid()
);

create policy patients_update on public.patients
for update to authenticated
using (
  public.is_admin()
  or public.is_patient_owner(id)
  or public.is_approved_sponsor(id)
)
with check (
  public.is_admin()
  or public.is_patient_owner(id)
  or public.is_approved_sponsor(id)
);

create policy patients_delete on public.patients
for delete to authenticated
using (public.is_admin());

create policy sponsors_patients_select on public.sponsors_patients
for select to authenticated
using (
  public.is_admin()
  or sponsor_user_id = auth.uid()
  or public.can_access_patient(patient_id)
);

create policy sponsors_patients_insert on public.sponsors_patients
for insert to authenticated
with check (
  consent_status = 'pending'
  and (
    public.is_admin()
    or sponsor_user_id = auth.uid()
    or public.is_patient_owner(patient_id)
  )
);

create policy sponsors_patients_update on public.sponsors_patients
for update to authenticated
using (
  public.is_admin()
  or public.is_patient_owner(patient_id)
  or sponsor_user_id = auth.uid()
)
with check (
  public.is_admin()
  or public.is_patient_owner(patient_id)
  or (
    sponsor_user_id = auth.uid()
    and consent_status in ('pending', 'revoked')
  )
);

create policy providers_select on public.providers
for select to authenticated
using (public.provider_visible(id));

create policy providers_update on public.providers
for update to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy assignments_select on public.patient_provider_assignments
for select to authenticated
using (
  public.is_admin()
  or public.can_access_patient(patient_id)
  or public.owns_provider_row(provider_id)
);

create policy assignments_write on public.patient_provider_assignments
for all to authenticated
using (
  public.is_admin()
  or public.is_approved_sponsor(patient_id)
  or public.is_self_sponsored_owner(patient_id)
)
with check (
  public.is_admin()
  or public.is_approved_sponsor(patient_id)
  or public.is_self_sponsored_owner(patient_id)
);

create policy vitals_select on public.vitals_log
for select to authenticated
using (public.can_access_patient(patient_id));

create policy vitals_insert on public.vitals_log
for insert to authenticated
with check (
  entered_by = auth.uid()
  and public.can_access_patient(patient_id)
);

create policy vitals_update on public.vitals_log
for update to authenticated
using (public.is_admin() or entered_by = auth.uid())
with check (public.is_admin() or entered_by = auth.uid());

create policy visits_select on public.visits
for select to authenticated
using (
  public.can_access_patient(patient_id)
  or public.owns_provider_row(chw_provider_id)
);

create policy visits_insert on public.visits
for insert to authenticated
with check (
  public.is_admin()
  or (
    public.is_assigned_provider(patient_id)
    and public.is_my_chw(chw_provider_id)
  )
);

create policy visits_update on public.visits
for update to authenticated
using (public.is_admin() or public.owns_provider_row(chw_provider_id))
with check (public.is_admin() or public.owns_provider_row(chw_provider_id));

create policy medications_select on public.medications
for select to authenticated
using (public.can_access_patient(patient_id));

create policy medications_write on public.medications
for all to authenticated
using (
  public.is_admin()
  or public.is_patient_owner(patient_id)
  or public.is_approved_sponsor(patient_id)
  or public.is_self_sponsored_owner(patient_id)
  or public.is_assigned_provider(patient_id)
)
with check (
  public.is_admin()
  or public.is_patient_owner(patient_id)
  or public.is_approved_sponsor(patient_id)
  or public.is_self_sponsored_owner(patient_id)
  or public.is_assigned_provider(patient_id)
);

create policy refills_select on public.pharmacy_refills
for select to authenticated
using (
  public.can_access_patient(patient_id)
  or public.is_my_pharmacy(pharmacy_provider_id)
);

create policy refills_insert on public.pharmacy_refills
for insert to authenticated
with check (
  public.is_admin()
  or public.is_patient_owner(patient_id)
  or public.is_approved_sponsor(patient_id)
  or public.is_self_sponsored_owner(patient_id)
);

create policy refills_update on public.pharmacy_refills
for update to authenticated
using (public.is_admin() or public.is_my_pharmacy(pharmacy_provider_id))
with check (public.is_admin() or public.is_my_pharmacy(pharmacy_provider_id));

create policy alerts_select on public.alerts
for select to authenticated
using (
  public.can_access_patient(patient_id)
  or assigned_to_user_id = auth.uid()
);

create policy alerts_insert on public.alerts
for insert to authenticated
with check (
  public.is_admin()
  or public.is_assigned_provider(patient_id)
  or public.is_patient_owner(patient_id)
  or public.is_approved_sponsor(patient_id)
);

create policy alerts_update on public.alerts
for update to authenticated
using (public.is_admin() or assigned_to_user_id = auth.uid())
with check (public.is_admin() or assigned_to_user_id = auth.uid());

create policy consultations_select on public.consultations
for select to authenticated
using (
  public.can_access_patient(patient_id)
  or public.is_my_clinician(clinician_provider_id)
);

create policy consultations_write on public.consultations
for all to authenticated
using (public.is_admin() or public.is_my_clinician(clinician_provider_id))
with check (public.is_admin() or public.is_my_clinician(clinician_provider_id));

create policy plans_select on public.plans
for select to anon, authenticated
using (true);

create policy plans_write on public.plans
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy subscriptions_select on public.subscriptions
for select to authenticated
using (
  public.is_admin()
  or payer_user_id = auth.uid()
  or public.can_access_patient(patient_id)
);

create policy subscriptions_insert on public.subscriptions
for insert to authenticated
with check (
  payer_user_id = auth.uid()
  and (
    public.is_admin()
    or public.is_approved_sponsor(patient_id)
    or public.is_self_sponsored_owner(patient_id)
  )
);

create policy subscriptions_update on public.subscriptions
for update to authenticated
using (public.is_admin() or payer_user_id = auth.uid())
with check (
  public.is_admin()
  or (
    payer_user_id = auth.uid()
    and (
      public.is_approved_sponsor(patient_id)
      or public.is_self_sponsored_owner(patient_id)
    )
  )
);

create policy disputes_select on public.disputes
for select to authenticated
using (
  public.is_admin()
  or raised_by_user_id = auth.uid()
  or public.visit_is_accessible(visit_id)
);

create policy disputes_insert on public.disputes
for insert to authenticated
with check (
  raised_by_user_id = auth.uid()
  and public.can_raise_dispute(visit_id)
);

create policy disputes_update on public.disputes
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy audit_logs_select on public.audit_logs
for select to authenticated
using (public.is_admin());

create policy audit_logs_insert on public.audit_logs
for insert to authenticated
with check (actor_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Grants. RLS still filters every row.
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;

grant select on public.plans to anon, authenticated;

grant select, insert, update, delete on
  public.profiles,
  public.patients,
  public.sponsors_patients,
  public.providers,
  public.patient_provider_assignments,
  public.vitals_log,
  public.visits,
  public.medications,
  public.pharmacy_refills,
  public.alerts,
  public.consultations,
  public.plans,
  public.subscriptions,
  public.disputes,
  public.audit_logs
to authenticated;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.prevent_audit_mutation() from public, anon, authenticated;
revoke all on function public.protect_profile_role() from public, anon, authenticated;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_patient_owner(uuid) to authenticated;
grant execute on function public.is_self_sponsored_owner(uuid) to authenticated;
grant execute on function public.is_approved_sponsor(uuid) to authenticated;
grant execute on function public.is_assigned_provider(uuid) to authenticated;
grant execute on function public.is_alert_assignee(uuid) to authenticated;
grant execute on function public.can_access_patient(uuid) to authenticated;
grant execute on function public.can_manage_sponsor_view(uuid) to authenticated;
grant execute on function public.can_read_profile(uuid) to authenticated;
grant execute on function public.owns_provider_row(uuid) to authenticated;
grant execute on function public.provider_visible(uuid) to authenticated;
grant execute on function public.is_my_chw(uuid) to authenticated;
grant execute on function public.is_my_pharmacy(uuid) to authenticated;
grant execute on function public.is_my_clinician(uuid) to authenticated;
grant execute on function public.visit_is_accessible(uuid) to authenticated;
grant execute on function public.can_raise_dispute(uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant execute on function public.handle_new_user() to supabase_auth_admin;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.handle_new_user() to service_role;
  end if;
end $$;
