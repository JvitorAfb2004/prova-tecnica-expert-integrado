create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'workspace_role') then
    create type public.workspace_role as enum ('admin', 'member');
  end if;
  if not exists (select 1 from pg_type where typname = 'invite_status') then
    create type public.invite_status as enum ('pending', 'accepted', 'revoked', 'expired');
  end if;
end $$;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role public.workspace_role not null default 'member',
  token uuid not null default gen_random_uuid(),
  status public.invite_status not null default 'pending',
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz
);

create unique index if not exists workspace_invites_token_key on public.workspace_invites (token);
create index if not exists workspace_invites_workspace_id_idx on public.workspace_invites (workspace_id);
create index if not exists workspace_invites_email_idx on public.workspace_invites (email);

create table if not exists public.funnel_stages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  sort_order integer not null,
  is_system boolean not null default false,
  required_fields text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists funnel_stages_workspace_sort_idx on public.funnel_stages (workspace_id, sort_order);
create unique index if not exists funnel_stages_workspace_name_idx on public.funnel_stages (workspace_id, name);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  stage_id uuid references public.funnel_stages(id) on delete set null,
  owner_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text,
  phone text,
  company text,
  job_title text,
  lead_source text,
  notes text,
  custom_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_workspace_id_idx on public.leads (workspace_id);
create index if not exists leads_stage_id_idx on public.leads (stage_id);
create index if not exists leads_owner_id_idx on public.leads (owner_id);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  context jsonb not null default '{}'::jsonb,
  prompt jsonb not null default '{}'::jsonb,
  trigger_stage_id uuid references public.funnel_stages(id) on delete set null,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists campaigns_workspace_name_idx on public.campaigns (workspace_id, name);
create index if not exists campaigns_workspace_id_idx on public.campaigns (workspace_id);

create table if not exists public.lead_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  status text not null default 'draft',
  source text not null default 'manual',
  variants jsonb not null default '[]'::jsonb,
  selected_index integer,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists lead_messages_workspace_id_idx on public.lead_messages (workspace_id);
create index if not exists lead_messages_lead_id_idx on public.lead_messages (lead_id);
create index if not exists lead_messages_campaign_id_idx on public.lead_messages (campaign_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_admin(p_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
      and wm.role = 'admin'
  );
$$;

create or replace function public.handle_workspace_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.created_by, 'admin')
  on conflict do nothing;

  insert into public.funnel_stages (workspace_id, name, sort_order, is_system)
  values
    (new.id, 'Base', 1, true),
    (new.id, 'Lead Mapeado', 2, true),
    (new.id, 'Tentando Contato', 3, true),
    (new.id, 'Conexao Iniciada', 4, true),
    (new.id, 'Desqualificado', 5, true),
    (new.id, 'Qualificado', 6, true),
    (new.id, 'Reuniao Agendada', 7, true);

  return new;
end;
$$;

create or replace function public.accept_workspace_invite(p_token uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite record;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  v_email := lower(auth.jwt() ->> 'email');

  select *
    into v_invite
  from public.workspace_invites
  where token = p_token
    and status = 'pending'
    and (expires_at is null or expires_at > now());

  if not found then
    raise exception 'invite_not_found';
  end if;

  if lower(v_invite.email) <> v_email then
    raise exception 'invite_email_mismatch';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_invite.workspace_id, auth.uid(), v_invite.role)
  on conflict do nothing;

  update public.workspace_invites
  set status = 'accepted',
      accepted_at = now()
  where id = v_invite.id;
end;
$$;

create trigger workspaces_after_insert
after insert on public.workspaces
for each row execute function public.handle_workspace_created();

create trigger funnel_stages_set_updated_at
before update on public.funnel_stages
for each row execute function public.set_updated_at();

create trigger leads_set_updated_at
before update on public.leads
for each row execute function public.set_updated_at();

create trigger campaigns_set_updated_at
before update on public.campaigns
for each row execute function public.set_updated_at();

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;
alter table public.funnel_stages enable row level security;
alter table public.leads enable row level security;
alter table public.campaigns enable row level security;
alter table public.lead_messages enable row level security;

create policy workspaces_select_member on public.workspaces
  for select using (public.is_workspace_member(id));

create policy workspaces_insert_owner on public.workspaces
  for insert with check (auth.uid() = created_by);

create policy workspaces_update_admin on public.workspaces
  for update using (public.is_workspace_admin(id))
  with check (public.is_workspace_admin(id));

create policy workspaces_delete_admin on public.workspaces
  for delete using (public.is_workspace_admin(id));

create policy workspace_members_select_member on public.workspace_members
  for select using (public.is_workspace_member(workspace_id));

create policy workspace_members_insert_admin on public.workspace_members
  for insert with check (public.is_workspace_admin(workspace_id));

create policy workspace_members_update_admin on public.workspace_members
  for update using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

create policy workspace_members_delete_admin on public.workspace_members
  for delete using (public.is_workspace_admin(workspace_id));

create policy workspace_invites_select_admin_or_email on public.workspace_invites
  for select using (
    public.is_workspace_admin(workspace_id)
    or lower(email) = lower(auth.jwt() ->> 'email')
  );

create policy workspace_invites_insert_admin on public.workspace_invites
  for insert with check (public.is_workspace_admin(workspace_id));

create policy workspace_invites_update_admin on public.workspace_invites
  for update using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

create policy workspace_invites_delete_admin on public.workspace_invites
  for delete using (public.is_workspace_admin(workspace_id));

create policy funnel_stages_select_member on public.funnel_stages
  for select using (public.is_workspace_member(workspace_id));

create policy funnel_stages_insert_admin on public.funnel_stages
  for insert with check (public.is_workspace_admin(workspace_id));

create policy funnel_stages_update_admin on public.funnel_stages
  for update using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

create policy funnel_stages_delete_admin on public.funnel_stages
  for delete using (public.is_workspace_admin(workspace_id));

create policy leads_select_member on public.leads
  for select using (public.is_workspace_member(workspace_id));

create policy leads_insert_member on public.leads
  for insert with check (public.is_workspace_member(workspace_id));

create policy leads_update_member on public.leads
  for update using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy leads_delete_member on public.leads
  for delete using (public.is_workspace_member(workspace_id));

create policy campaigns_select_member on public.campaigns
  for select using (public.is_workspace_member(workspace_id));

create policy campaigns_insert_member on public.campaigns
  for insert with check (public.is_workspace_member(workspace_id));

create policy campaigns_update_member on public.campaigns
  for update using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy campaigns_delete_member on public.campaigns
  for delete using (public.is_workspace_member(workspace_id));

create policy lead_messages_select_member on public.lead_messages
  for select using (public.is_workspace_member(workspace_id));

create policy lead_messages_insert_member on public.lead_messages
  for insert with check (public.is_workspace_member(workspace_id));

create policy lead_messages_update_member on public.lead_messages
  for update using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy lead_messages_delete_member on public.lead_messages
  for delete using (public.is_workspace_member(workspace_id));
