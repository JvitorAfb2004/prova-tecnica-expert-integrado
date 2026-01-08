create or replace function public.list_workspace_members(p_workspace_id uuid)
returns table (user_id uuid, email text, role public.workspace_role)
language sql
security definer
set search_path = public
as $$
  select wm.user_id,
         u.email,
         wm.role
  from public.workspace_members wm
  join auth.users u on u.id = wm.user_id
  where wm.workspace_id = p_workspace_id
    and public.is_workspace_member(p_workspace_id);
$$;
