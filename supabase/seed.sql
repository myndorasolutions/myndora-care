-- Demo data for local `supabase db reset` and the Supabase SQL Editor.
-- Every demo login uses the password: MyndoraDemo!2026
-- Staff roles are applied after the auth trigger, which refuses admin metadata.
-- This replaces the live trigger before any auth.users inserts. Postgres cannot
-- cast app_role directly to provider_type, so the provider type goes through text.

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

insert into public.plans (
  id,
  code,
  name,
  description,
  plan_kind,
  price_daily_ngn,
  price_monthly_ngn,
  price_one_time_ngn
) values
  (
    'aaaaaaa1-0000-4000-8000-000000000001',
    'basic_daily',
    'Basic Daily',
    'Daily subscription for one person. Blood pressure and glucose follow-up.',
    'daily_subscription',
    300,
    9000,
    null
  ),
  (
    'aaaaaaa1-0000-4000-8000-000000000002',
    'plus',
    'Plus',
    'Daily subscription with CHW remote checks and pharmacy refill requests.',
    'daily_subscription',
    500,
    15000,
    null
  ),
  (
    'aaaaaaa1-0000-4000-8000-000000000003',
    'family_care',
    'Family Care',
    'Sponsor plan covering a household, including linked relatives.',
    'family_care',
    1000,
    30000,
    null
  ),
  (
    'aaaaaaa1-0000-4000-8000-000000000004',
    'physical_visit',
    'Physical Visit Add-on',
    'One home visit by an assigned CHW. Price is set by operations before sale.',
    'physical_visit_addon',
    null,
    null,
    null
  );

do $$
declare
  demo_password text := extensions.crypt('MyndoraDemo!2026', extensions.gen_salt('bf'));
  person record;
begin
  for person in
    select *
    from (
      values
        (
          '11111111-1111-4111-8111-111111111111'::uuid,
          'grace.adeyemi@demo.myndora.care',
          jsonb_build_object(
            'full_name', 'Grace Adeyemi',
            'phone', '+2348030001101',
            'primary_role', 'patient',
            'preferred_language', 'yo',
            'is_self_sponsored', 'true',
            'city', 'Ilorin',
            'state', 'Kwara'
          )
        ),
        (
          '22222222-2222-4222-8222-222222222222'::uuid,
          'tunde.adeyemi@demo.myndora.care',
          jsonb_build_object(
            'full_name', 'Tunde Adeyemi',
            'phone', '+2348030002202',
            'primary_role', 'sponsor',
            'preferred_language', 'en',
            'city', 'Lagos',
            'state', 'Lagos'
          )
        ),
        (
          '33333333-3333-4333-8333-333333333333'::uuid,
          'amina.bello@demo.myndora.care',
          jsonb_build_object(
            'full_name', 'Amina Bello',
            'phone', '+2348030003303',
            'primary_role', 'chw',
            'preferred_language', 'ha',
            'provider_name', 'Amina Bello',
            'cadre_or_specialty', 'Community Health Extension Worker',
            'city', 'Ilorin',
            'state', 'Kwara'
          )
        ),
        (
          '44444444-4444-4444-8444-444444444444'::uuid,
          'healthplus.tanke@demo.myndora.care',
          jsonb_build_object(
            'full_name', 'HealthPlus Tanke Pharmacy',
            'phone', '+2348030004404',
            'primary_role', 'pharmacy',
            'preferred_language', 'en',
            'provider_name', 'HealthPlus Tanke Pharmacy',
            'cadre_or_specialty', 'Community pharmacy',
            'city', 'Ilorin',
            'state', 'Kwara'
          )
        ),
        (
          '55555555-5555-4555-8555-555555555555'::uuid,
          'chinedu.okafor@demo.myndora.care',
          jsonb_build_object(
            'full_name', 'Dr. Chinedu Okafor',
            'phone', '+2348030005505',
            'primary_role', 'clinician',
            'preferred_language', 'en',
            'provider_name', 'Dr. Chinedu Okafor',
            'cadre_or_specialty', 'Internal medicine',
            'city', 'Abuja',
            'state', 'FCT'
          )
        ),
        (
          '66666666-6666-4666-8666-666666666666'::uuid,
          'admin@demo.myndora.care',
          jsonb_build_object(
            'full_name', 'Myndora Admin',
            'phone', '+2348030006606',
            'primary_role', 'admin',
            'preferred_language', 'en',
            'city', 'Lagos',
            'state', 'Lagos'
          )
        ),
        (
          '77777777-7777-4777-8777-777777777777'::uuid,
          'superadmin@demo.myndora.care',
          jsonb_build_object(
            'full_name', 'Myndora Super Admin',
            'phone', '+2348030007707',
            'primary_role', 'super_admin',
            'preferred_language', 'en',
            'city', 'Lagos',
            'state', 'Lagos'
          )
        )
    ) as seed(user_id, email, meta)
  loop
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
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      person.user_id,
      'authenticated',
      'authenticated',
      person.email,
      demo_password,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      person.meta,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      gen_random_uuid(),
      person.user_id,
      jsonb_build_object('sub', person.user_id::text, 'email', person.email),
      'email',
      person.user_id::text,
      now(),
      now(),
      now()
    );
  end loop;
end $$;

-- The auth trigger downgrades staff metadata to patient. Restore the real roles.
delete from public.patients
where user_id in (
  '66666666-6666-4666-8666-666666666666',
  '77777777-7777-4777-8777-777777777777'
);

update public.profiles
set primary_role = 'admin'
where id = '66666666-6666-4666-8666-666666666666';

update public.profiles
set primary_role = 'super_admin'
where id = '77777777-7777-4777-8777-777777777777';

update public.patients
set
  age = 58,
  gender = 'Female',
  address = 'GRA, Ilorin',
  conditions = array['Hypertension'],
  emergency_contact_name = 'Tunde Adeyemi',
  emergency_contact_phone = '+2348030002202',
  is_self_sponsored = true,
  consent_accepted = true,
  risk_status = 'yellow'
where user_id = '11111111-1111-4111-8111-111111111111';

insert into public.patients (
  id,
  user_id,
  age,
  gender,
  city,
  state,
  address,
  conditions,
  preferred_language,
  emergency_contact_name,
  emergency_contact_phone,
  is_self_sponsored,
  consent_accepted,
  risk_status
) values (
  '88888888-8888-4888-8888-888888888888',
  null,
  74,
  'Male',
  'Ilorin',
  'Kwara',
  'Tanke, Ilorin',
  array['Hypertension', 'Type 2 diabetes'],
  'yo',
  'Tunde Adeyemi',
  '+2348030002202',
  false,
  true,
  'red'
);

insert into public.sponsors_patients (
  sponsor_user_id,
  patient_id,
  relationship,
  consent_status
) values (
  '22222222-2222-4222-8222-222222222222',
  '88888888-8888-4888-8888-888888888888',
  'Son',
  'approved'
);

update public.providers
set
  service_area = 'Tanke and GRA',
  languages_spoken = array['ha', 'yo', 'en'],
  verification_status = 'verified',
  verification_badges = array['home_visit', 'remote_check'],
  rating = 4.8,
  completed_visits_count = 42
where user_id = '33333333-3333-4333-8333-333333333333';

update public.providers
set
  service_area = 'Tanke',
  languages_spoken = array['en', 'yo'],
  verification_status = 'verified',
  verification_badges = array['refill_hub'],
  rating = 4.6,
  completed_visits_count = 0
where user_id = '44444444-4444-4444-8444-444444444444';

update public.providers
set
  service_area = 'Abuja',
  languages_spoken = array['en', 'ig'],
  verification_status = 'verified',
  verification_badges = array['clinician_review'],
  rating = 4.9,
  completed_visits_count = 18
where user_id = '55555555-5555-4555-8555-555555555555';

insert into public.patient_provider_assignments (
  patient_id,
  provider_id,
  provider_type,
  assigned_by,
  active
)
select
  patient.id,
  provider.id,
  provider.provider_type,
  '66666666-6666-4666-8666-666666666666',
  true
from (
  values
    ('11111111-1111-4111-8111-111111111111'::uuid, '33333333-3333-4333-8333-333333333333'::uuid),
    ('11111111-1111-4111-8111-111111111111'::uuid, '44444444-4444-4444-8444-444444444444'::uuid),
    ('11111111-1111-4111-8111-111111111111'::uuid, '55555555-5555-4555-8555-555555555555'::uuid),
    ('88888888-8888-4888-8888-888888888888'::uuid, '33333333-3333-4333-8333-333333333333'::uuid),
    ('88888888-8888-4888-8888-888888888888'::uuid, '44444444-4444-4444-8444-444444444444'::uuid),
    ('88888888-8888-4888-8888-888888888888'::uuid, '55555555-5555-4555-8555-555555555555'::uuid)
) as pair(patient_key, provider_user)
join public.patients patient
  on patient.user_id = pair.patient_key
  or patient.id = pair.patient_key
join public.providers provider on provider.user_id = pair.provider_user;

insert into public.vitals_log (
  id,
  patient_id,
  entered_by,
  source,
  reading_at,
  systolic,
  diastolic,
  glucose,
  glucose_type,
  pulse,
  medication_taken,
  risk_status,
  sync_status,
  notes
)
select
  'bbbbbbb1-0000-4000-8000-000000000001',
  patient.id,
  '11111111-1111-4111-8111-111111111111',
  'patient',
  now() - interval '1 day',
  138,
  86,
  null,
  'none',
  78,
  true,
  'yellow',
  'synced',
  'Morning reading after medication.'
from public.patients patient
where patient.user_id = '11111111-1111-4111-8111-111111111111';

insert into public.vitals_log (
  id,
  patient_id,
  entered_by,
  source,
  reading_at,
  systolic,
  diastolic,
  glucose,
  glucose_type,
  pulse,
  medication_taken,
  risk_status,
  sync_status,
  notes
) values (
  'bbbbbbb1-0000-4000-8000-000000000002',
  '88888888-8888-4888-8888-888888888888',
  '33333333-3333-4333-8333-333333333333',
  'chw',
  now() - interval '6 hours',
  172,
  104,
  214,
  'random',
  92,
  false,
  'red',
  'synced',
  'Home reading during remote check. Glucose elevated.'
);

insert into public.visits (
  id,
  patient_id,
  chw_provider_id,
  visit_type,
  scheduled_at,
  started_at,
  completed_at,
  gps_lat,
  gps_lng,
  checklist_responses,
  audio_language_used,
  patient_confirmed,
  confirmation_method,
  status,
  sync_status,
  notes
)
select
  'cccccccc-0000-4000-8000-000000000001',
  patient.id,
  provider.id,
  'remote_check',
  now() - interval '2 days',
  now() - interval '2 days' + interval '5 minutes',
  now() - interval '2 days' + interval '20 minutes',
  8.479879,
  4.541841,
  '{"bp_recorded": true, "medication_reviewed": true}'::jsonb,
  'yo',
  true,
  'audio_prompt',
  'completed_verified',
  'synced',
  'Remote check completed in Yoruba.'
from public.patients patient
join public.providers provider
  on provider.user_id = '33333333-3333-4333-8333-333333333333'
where patient.user_id = '11111111-1111-4111-8111-111111111111';

insert into public.medications (
  id,
  patient_id,
  medication_name,
  dosage,
  frequency,
  refill_due_date,
  active
) values (
  'dddddddd-0000-4000-8000-000000000001',
  '88888888-8888-4888-8888-888888888888',
  'Amlodipine',
  '5 mg',
  'Once daily',
  current_date + 5,
  true
);

insert into public.pharmacy_refills (
  patient_id,
  pharmacy_provider_id,
  medication_id,
  status,
  notes,
  requested_at
)
select
  '88888888-8888-4888-8888-888888888888',
  provider.id,
  'dddddddd-0000-4000-8000-000000000001',
  'requested',
  'Sponsor asked for pickup at Tanke.',
  now() - interval '3 hours'
from public.providers provider
where provider.user_id = '44444444-4444-4444-8444-444444444444';

insert into public.alerts (
  id,
  patient_id,
  vital_id,
  severity,
  title,
  message,
  assigned_to_user_id,
  status
) values (
  'eeeeeeee-0000-4000-8000-000000000001',
  '88888888-8888-4888-8888-888888888888',
  'bbbbbbb1-0000-4000-8000-000000000002',
  'red',
  'High blood pressure and glucose',
  'Baba Adeyemi recorded 172/104 mmHg and a random glucose of 214 mg/dL. Medication was missed.',
  '55555555-5555-4555-8555-555555555555',
  'new'
);

insert into public.consultations (
  patient_id,
  clinician_provider_id,
  alert_id,
  recommendation_notes,
  follow_up_action,
  follow_up_date,
  status
)
select
  '88888888-8888-4888-8888-888888888888',
  provider.id,
  'eeeeeeee-0000-4000-8000-000000000001',
  'Repeat the blood pressure today. Do not add a new drug until the reading is confirmed.',
  'CHW to repeat vitals and confirm Amlodipine was taken.',
  current_date + 2,
  'open'
from public.providers provider
where provider.user_id = '55555555-5555-4555-8555-555555555555';

insert into public.subscriptions (
  plan_id,
  patient_id,
  payer_user_id,
  billing_interval,
  status,
  started_at,
  current_period_end
)
select
  plan.id,
  patient.id,
  '11111111-1111-4111-8111-111111111111',
  'monthly',
  'active',
  now() - interval '10 days',
  now() + interval '20 days'
from public.plans plan
join public.patients patient
  on patient.user_id = '11111111-1111-4111-8111-111111111111'
where plan.code = 'plus';

insert into public.disputes (
  id,
  visit_id,
  raised_by_user_id,
  reason,
  status
) values (
  'ffffffff-0000-4000-8000-000000000001',
  'cccccccc-0000-4000-8000-000000000001',
  '11111111-1111-4111-8111-111111111111',
  'I was at the market when this remote check was marked complete.',
  'open'
);

insert into public.medications (
  id,
  patient_id,
  medication_name,
  dosage,
  frequency,
  refill_due_date,
  active
)
select
  medication.id,
  patient.id,
  medication.medication_name,
  medication.dosage,
  medication.frequency,
  current_date + 5,
  true
from public.patients patient
join (
  values
    ('dddddddd-0000-4000-8000-000000000002'::uuid, 'Amlodipine', '5 mg', 'Once daily'),
    ('dddddddd-0000-4000-8000-000000000003'::uuid, 'Metformin', '500 mg', 'Twice daily')
) as medication(id, medication_name, dosage, frequency) on true
where patient.user_id = '11111111-1111-4111-8111-111111111111';

insert into public.pharmacy_refills (
  id,
  patient_id,
  pharmacy_provider_id,
  medication_id,
  status,
  notes,
  requested_at
)
select
  refill.id,
  patient.id,
  provider.id,
  refill.medication_id,
  'requested',
  'Requested for pickup at HealthPlus Tanke Pharmacy.',
  now() - interval '5 hours'
from public.patients patient
join public.providers provider
  on provider.user_id = '44444444-4444-4444-8444-444444444444'
join (
  values
    ('dddddddd-0000-4000-8000-000000000011'::uuid, 'dddddddd-0000-4000-8000-000000000002'::uuid),
    ('dddddddd-0000-4000-8000-000000000012'::uuid, 'dddddddd-0000-4000-8000-000000000003'::uuid)
) as refill(id, medication_id) on true
where patient.user_id = '11111111-1111-4111-8111-111111111111';

insert into public.alerts (
  id,
  patient_id,
  severity,
  title,
  message,
  assigned_to_user_id,
  status
)
select
  'eeeeeeee-0000-4000-8000-000000000002',
  patient.id,
  'yellow',
  'Blood pressure needs a closer look',
  'Grace Adeyemi recorded 138/86 mmHg. The reading is in the caution range.',
  '55555555-5555-4555-8555-555555555555',
  'new'
from public.patients patient
where patient.user_id = '11111111-1111-4111-8111-111111111111';

insert into public.visits (
  id,
  patient_id,
  chw_provider_id,
  visit_type,
  started_at,
  completed_at,
  gps_lat,
  gps_lng,
  patient_confirmed,
  confirmation_method,
  audio_language_used,
  status,
  sync_status,
  notes
)
select
  'cccccccc-0000-4000-8000-000000000002',
  '88888888-8888-4888-8888-888888888888',
  provider.id,
  'physical_visit',
  now() - interval '12 hours',
  now() - interval '11 hours',
  8.479879,
  4.541841,
  false,
  'pending',
  'yo',
  'needs_review',
  'failed_sync',
  'Offline reading still needs a coordinator check.'
from public.providers provider
where provider.user_id = '33333333-3333-4333-8333-333333333333';

update public.plans
set included_service_count = case code
  when 'basic_daily' then 0
  when 'plus' then 4
  when 'family_care' then 8
  when 'physical_visit' then 1
  else included_service_count
end;

insert into public.audit_logs (
  actor_user_id,
  action,
  entity_type,
  entity_id,
  metadata
) values (
  '11111111-1111-4111-8111-111111111111',
  'dispute.opened',
  'disputes',
  'ffffffff-0000-4000-8000-000000000001',
  '{"source":"seed","city":"Ilorin"}'::jsonb
);
