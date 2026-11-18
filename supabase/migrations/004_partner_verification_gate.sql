-- Care-partner applications stay pending until an admin clears them.
-- No new identity columns. NIN, voter ID, and selfies stay out of the schema.

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
      service_area,
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
      nullif(meta->>'service_area', ''),
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

create or replace function public.provider_is_cleared()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.providers
    where user_id = auth.uid()
      and verification_status in ('remote_approved', 'home_visit_approved', 'verified')
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
      and pr.verification_status in ('remote_approved', 'home_visit_approved', 'verified')
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
      and verification_status in ('remote_approved', 'home_visit_approved', 'verified')
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
      and verification_status in ('remote_approved', 'home_visit_approved', 'verified')
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
      and verification_status in ('remote_approved', 'home_visit_approved', 'verified')
  );
$$;

create or replace function public.protect_provider_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.verification_status is distinct from old.verification_status
     or new.verification_badges is distinct from old.verification_badges then
    -- Seed and service SQL run without a user JWT. Signed-in non-admins cannot self-approve.
    if auth.uid() is not null and not public.is_admin() then
      raise exception 'Only an admin can change provider verification';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists providers_protect_verification on public.providers;
create trigger providers_protect_verification
before update on public.providers
for each row execute function public.protect_provider_verification();

drop policy if exists assignments_select on public.patient_provider_assignments;
create policy assignments_select on public.patient_provider_assignments
for select to authenticated
using (
  public.is_admin()
  or public.can_access_patient(patient_id)
  or (
    public.owns_provider_row(provider_id)
    and public.provider_is_cleared()
  )
);

drop policy if exists visits_select on public.visits;
create policy visits_select on public.visits
for select to authenticated
using (
  public.can_access_patient(patient_id)
  or (
    public.owns_provider_row(chw_provider_id)
    and public.provider_is_cleared()
  )
);

drop policy if exists visits_update on public.visits;
create policy visits_update on public.visits
for update to authenticated
using (
  public.is_admin()
  or (
    public.owns_provider_row(chw_provider_id)
    and public.provider_is_cleared()
  )
)
with check (
  public.is_admin()
  or (
    public.owns_provider_row(chw_provider_id)
    and public.provider_is_cleared()
  )
);

grant execute on function public.provider_is_cleared() to authenticated;
