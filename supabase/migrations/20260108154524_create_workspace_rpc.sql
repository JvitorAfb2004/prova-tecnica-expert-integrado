create or replace function public.create_workspace(p_name text)
returns public.workspaces
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace public.workspaces;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.workspaces (name, created_by)
  values (p_name, auth.uid())
  returning * into v_workspace;

  return v_workspace;
end;
$$;

grant execute on function public.create_workspace(text) to authenticated;
