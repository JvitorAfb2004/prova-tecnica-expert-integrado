create table if not exists public.lead_field_definitions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  key text not null,
  label text not null,
  field_type text not null check (field_type in ('text', 'number', 'boolean')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists lead_field_definitions_workspace_key_idx
  on public.lead_field_definitions (workspace_id, key);

create index if not exists lead_field_definitions_workspace_id_idx
  on public.lead_field_definitions (workspace_id);

create trigger lead_field_definitions_set_updated_at
before update on public.lead_field_definitions
for each row execute function public.set_updated_at();

alter table public.lead_field_definitions enable row level security;

create policy lead_field_definitions_select_member on public.lead_field_definitions
  for select using (public.is_workspace_member(workspace_id));

create policy lead_field_definitions_insert_admin on public.lead_field_definitions
  for insert with check (public.is_workspace_admin(workspace_id));

create policy lead_field_definitions_update_admin on public.lead_field_definitions
  for update using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

create policy lead_field_definitions_delete_admin on public.lead_field_definitions
  for delete using (public.is_workspace_admin(workspace_id));
