-- Update live subscription prices without resetting the database.
-- Safe to run in the Supabase SQL Editor. Does not change the Physical Visit Add-on.

update public.plans
set price_daily_ngn = 300, price_monthly_ngn = 9000
where code = 'basic_daily';

update public.plans
set price_daily_ngn = 500, price_monthly_ngn = 15000
where code = 'plus';

update public.plans
set price_daily_ngn = 1000, price_monthly_ngn = 30000
where code = 'family_care';
