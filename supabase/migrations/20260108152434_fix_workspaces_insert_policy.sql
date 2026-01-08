drop policy if exists workspaces_insert_owner on public.workspaces;

create policy workspaces_insert_owner on public.workspaces
  for insert
  with check (
    auth.uid() is not null
    and (created_by = auth.uid() or created_by is null)
  );
