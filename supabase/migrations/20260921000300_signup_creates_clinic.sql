-- New doctor accounts could not do anything tenant-scoped ("cross-clinic access denied").
--
-- Root cause: handle_new_user() (doctor signup) created the `cabinets` row and the profile but never
-- the matching `clinics` row. ensure_profile_clinic_id() only sets profiles.clinic_id when a clinics
-- row with the cabinet's id exists, so every new doctor got clinic_id = NULL. current_clinic_id()
-- (used by mm_assert_same_clinic and the RLS policies) reads profiles.clinic_id, so a NULL never
-- matched the patient's clinic and every action was refused. Older accounts only worked because their
-- clinics rows came from one-time backfill scripts.
--
-- Fix: signup now creates the clinics row (id = cabinet id, the convention of every working clinic)
-- before the profile, so the trigger fills clinic_id. Existing affected accounts are repaired.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  meta_cabinet_id uuid;
  new_cabinet_id uuid;
  user_role text;
  user_nom text;
  cabinet_nom text;
begin
  meta_cabinet_id := nullif(new.raw_user_meta_data->>'cabinet_id', '')::uuid;
  user_role := coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'docteur');
  user_nom := coalesce(nullif(new.raw_user_meta_data->>'nom_complet', ''), new.email);
  cabinet_nom := nullif(new.raw_user_meta_data->>'nom_cabinet', '');

  if meta_cabinet_id is not null then
    -- Staff invite: link to the existing cabinet (its clinics row already exists)
    insert into public.profiles (id, cabinet_id, role, nom_complet)
    values (new.id, meta_cabinet_id, user_role, user_nom)
    on conflict (id) do update
      set cabinet_id = excluded.cabinet_id,
          role = excluded.role,
          nom_complet = excluded.nom_complet;

  elsif cabinet_nom is not null then
    -- Doctor signup: cabinet + clinic (same id) + profile
    insert into public.cabinets (tenant_id, nom, ville, telephone)
    values (
      new.id,
      cabinet_nom,
      nullif(new.raw_user_meta_data->>'ville', ''),
      nullif(new.raw_user_meta_data->>'telephone', '')
    )
    returning id into new_cabinet_id;

    insert into public.clinics (id, owner_id, name)
    values (new_cabinet_id, new.id, cabinet_nom)
    on conflict (id) do nothing;

    -- ensure_profile_clinic_id() now finds the clinics row and sets clinic_id
    insert into public.profiles (id, cabinet_id, role, nom_complet)
    values (new.id, new_cabinet_id, user_role, user_nom)
    on conflict (id) do nothing;
  end if;

  return new;
end;
$function$;

-- Repair accounts created before this fix: give every cabinet its clinics row, then set clinic_id.
insert into public.clinics (id, owner_id, name)
select k.id, k.tenant_id, coalesce(nullif(k.nom, ''), 'Cabinet')
from public.cabinets k
where not exists (select 1 from public.clinics c where c.id = k.id);

update public.profiles p
set clinic_id = p.cabinet_id
where p.clinic_id is null
  and p.cabinet_id is not null
  and exists (select 1 from public.clinics c where c.id = p.cabinet_id);
