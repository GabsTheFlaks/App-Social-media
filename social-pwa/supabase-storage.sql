-- 1. Criar o Bucket de imagens (se não existir, tem que ser rodado como superuser ou via painel)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('post_images', 'post_images', true)
on conflict (id) do nothing;

-- 2. Políticas de segurança do Storage para AVATARES
create policy "Qualquer um pode ver avatares"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

create policy "Usuários podem subir seus próprios avatares"
  on storage.objects for insert
  with check ( bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1] );

create policy "Usuários podem atualizar seus próprios avatares"
  on storage.objects for update
  using ( bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1] );

create policy "Usuários podem deletar seus próprios avatares"
  on storage.objects for delete
  using ( bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1] );

-- 3. Políticas de segurança do Storage para IMAGENS DE POSTS
create policy "Qualquer um pode ver imagens de posts"
  on storage.objects for select
  using ( bucket_id = 'post_images' );

create policy "Usuários podem subir imagens de posts"
  on storage.objects for insert
  with check ( bucket_id = 'post_images' and auth.role() = 'authenticated' );

-- 4. Alterar tabela de posts para aceitar URL de imagem (se já não existir, ignore erro)
alter table public.posts add column image_url text;
