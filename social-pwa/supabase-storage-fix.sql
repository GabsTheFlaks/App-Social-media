-- Create missing covers bucket
insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do nothing;

create policy "Qualquer um pode ver capas"
  on storage.objects for select
  using ( bucket_id = 'covers' );

create policy "Usuários podem subir suas próprias capas"
  on storage.objects for insert
  with check ( bucket_id = 'covers' and auth.uid()::text = (storage.foldername(name))[1] );

create policy "Usuários podem atualizar suas próprias capas"
  on storage.objects for update
  using ( bucket_id = 'covers' and auth.uid()::text = (storage.foldername(name))[1] );

create policy "Usuários podem deletar suas próprias capas"
  on storage.objects for delete
  using ( bucket_id = 'covers' and auth.uid()::text = (storage.foldername(name))[1] );
