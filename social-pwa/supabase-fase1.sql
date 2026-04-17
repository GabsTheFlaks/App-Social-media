-- Rode este script no SQL Editor do seu projeto Supabase para a FASE 1

-- 1. Novas colunas na tabela Posts
alter table public.posts add column visibility text default 'public'; -- 'public' ou 'connections'
alter table public.posts add column repost_id uuid references public.posts(id) on delete set null;

-- 2. Nova coluna na tabela Profiles
alter table public.profiles add column cover_url text;

-- 3. Criar Bucket para Capas de Perfil (Covers)
insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do nothing;

create policy "Qualquer um pode ver capas"
  on storage.objects for select using ( bucket_id = 'covers' );

create policy "Usuários podem subir suas próprias capas"
  on storage.objects for insert
  with check ( bucket_id = 'covers' and auth.uid()::text = (storage.foldername(name))[1] );

create policy "Usuários podem atualizar suas próprias capas"
  on storage.objects for update
  using ( bucket_id = 'covers' and auth.uid()::text = (storage.foldername(name))[1] );

-- 4. Atualizar Segurança dos Posts (RLS) para respeitar visibilidade
-- Primeiro, apagamos a regra antiga que deixava tudo público
drop policy if exists "Posts visíveis para todos" on public.posts;

-- Depois, criamos a regra nova:
-- O usuário pode ver o post SE:
-- 1. O post for público
-- 2. O post for dele mesmo
-- 3. O post for 'connections' E eles forem amigos (status = 'accepted')
create policy "Posts visibilidade e conexões" on public.posts for select
using (
  visibility = 'public'
  or auth.uid() = user_id
  or (
    visibility = 'connections'
    and exists (
      select 1 from public.connections c
      where c.status = 'accepted'
      and (
        (c.follower_id = auth.uid() and c.following_id = posts.user_id)
        or
        (c.following_id = auth.uid() and c.follower_id = posts.user_id)
      )
    )
  )
);
