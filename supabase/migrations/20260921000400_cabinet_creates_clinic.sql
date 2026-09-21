-- Guarantee: every cabinet has its matching clinics row, whichever code path creates it.
--
-- 20260921000300 made doctor signup create the clinics row. Cabinets can also be created by the
-- signup screen's browser-side fallback, by edge functions, or by hand; any of those would leave a
-- doctor with profiles.clinic_id = NULL again ("cross-clinic access denied" on everything).
-- Doing it in the database, on cabinet creation, removes the dependency on the caller: the clinics
-- row (same id as the cabinet, the convention of every working clinic) exists before any profile
-- is linked to the cabinet, so ensure_profile_clinic_id() always finds it and sets clinic_id.

create or replace function public.mm_cabinet_creates_clinic()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  -- owner_id is a foreign key to auth.users and nullable: never let a cabinet insert fail because of it
  insert into public.clinics (id, owner_id, name)
  values (
    new.id,
    (select u.id from auth.users u where u.id = new.tenant_id),
    coalesce(nullif(new.nom, ''), 'Cabinet')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_cabinet_creates_clinic on public.cabinets;
create trigger trg_cabinet_creates_clinic
  after insert on public.cabinets
  for each row execute function public.mm_cabinet_creates_clinic();
