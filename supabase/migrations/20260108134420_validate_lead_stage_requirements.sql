create or replace function public.validate_lead_stage_requirements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  required_fields text[];
  missing text[] := '{}'::text[];
  field_key text;
  stage_workspace_id uuid;
begin
  if new.stage_id is null then
    return new;
  end if;

  select workspace_id, required_fields
    into stage_workspace_id, required_fields
  from public.funnel_stages
  where id = new.stage_id;

  if stage_workspace_id is null then
    raise exception 'stage_not_found';
  end if;

  if stage_workspace_id <> new.workspace_id then
    raise exception 'stage_workspace_mismatch';
  end if;

  if required_fields is null or array_length(required_fields, 1) is null then
    return new;
  end if;

  foreach field_key in array required_fields loop
    case field_key
      when 'name' then
        if new.name is null or length(trim(new.name)) = 0 then
          missing := array_append(missing, field_key);
        end if;
      when 'email' then
        if new.email is null or length(trim(new.email)) = 0 then
          missing := array_append(missing, field_key);
        end if;
      when 'phone' then
        if new.phone is null or length(trim(new.phone)) = 0 then
          missing := array_append(missing, field_key);
        end if;
      when 'company' then
        if new.company is null or length(trim(new.company)) = 0 then
          missing := array_append(missing, field_key);
        end if;
      when 'job_title' then
        if new.job_title is null or length(trim(new.job_title)) = 0 then
          missing := array_append(missing, field_key);
        end if;
      when 'lead_source' then
        if new.lead_source is null or length(trim(new.lead_source)) = 0 then
          missing := array_append(missing, field_key);
        end if;
      when 'notes' then
        if new.notes is null or length(trim(new.notes)) = 0 then
          missing := array_append(missing, field_key);
        end if;
      else
        if new.custom_fields is null
          or (new.custom_fields ->> field_key) is null
          or length(trim(new.custom_fields ->> field_key)) = 0
        then
          missing := array_append(missing, field_key);
        end if;
    end case;
  end loop;

  if array_length(missing, 1) is not null then
    raise exception 'missing_required_fields:%', array_to_string(missing, ',');
  end if;

  return new;
end;
$$;

drop trigger if exists leads_validate_stage_requirements on public.leads;

create trigger leads_validate_stage_requirements
before insert or update of stage_id, name, email, phone, company, job_title, lead_source, notes, custom_fields
on public.leads
for each row execute function public.validate_lead_stage_requirements();
