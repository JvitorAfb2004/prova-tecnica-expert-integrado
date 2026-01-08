alter table public.workspaces
  alter column created_by set default auth.uid();
