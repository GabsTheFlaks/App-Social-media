-- Rode este script no SQL Editor do seu projeto Supabase

-- 1. Criar a tabela de Perfis
create table public.profiles (
  id uuid references auth.users not null primary key,
  full_name text,
  role text default 'Membro',
  avatar_url text default 'https://i.pravatar.cc/150',
  bio text,
  location text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ativar RLS (Row Level Security)
alter table public.profiles enable row level security;
create policy "Perfis visíveis para todos" on profiles for select using (true);
create policy "Usuário pode atualizar o próprio perfil" on profiles for update using (auth.uid() = id);

-- Trigger para criar perfil automaticamente quando usuário se cadastra
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', 'https://i.pravatar.cc/150?u=' || new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger para impedir a atualização de colunas não autorizadas (ex: badges)
-- Lança exceção se o usuário tentar alterar qualquer coluna além de:
-- full_name, role, location, bio, avatar_url, cover_url
create or replace function public.check_profile_update()
returns trigger as $$
declare
  _new_json jsonb;
  _old_json jsonb;
  _key text;
  _allowed_keys text[] := array['full_name', 'role', 'location', 'bio', 'avatar_url', 'cover_url'];
begin
  -- Verifica se alguma coluna não permitida foi alterada comparando com a versão antiga (OLD)

  -- Se a coluna ID mudou:
  if new.id is distinct from old.id then
    raise exception 'Not allowed to update id';
  end if;

  -- Se a coluna created_at mudou:
  if new.created_at is distinct from old.created_at then
    raise exception 'Not allowed to update created_at';
  end if;

  -- A instrução exige que APENAS full_name, role, location, bio, avatar_url e cover_url possam ser alteradas.
  -- Se as outras colunas mudaram, lançamos exceção.
  -- Vamos converter NEW e OLD para JSONB e comparar chaves que não estão na "whitelist"

  _new_json := to_jsonb(new);
  _old_json := to_jsonb(old);

  for _key in select jsonb_object_keys(_new_json) loop
    -- Se a chave não estiver nas permitidas e o valor mudou
    if not (_key = any(_allowed_keys)) and _new_json->>_key is distinct from _old_json->>_key then
      raise exception 'Não é permitido alterar a coluna: %', _key;
    end if;
  end loop;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_update
  before update on public.profiles
  for each row execute procedure public.check_profile_update();

-- 2. Criar tabela de Posts
create table public.posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.posts enable row level security;
create policy "Posts visíveis para todos" on posts for select using (true);
create policy "Usuários autenticados podem postar" on posts for insert with check (auth.uid() = user_id);
create policy "Usuário pode deletar próprio post" on posts for delete using (auth.uid() = user_id);

-- Ativar realtime para posts
alter publication supabase_realtime add table public.posts;

-- 3. Criar tabela de Curtidas (Likes)
create table public.likes (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(post_id, user_id)
);

alter table public.likes enable row level security;
create policy "Likes visíveis para todos" on likes for select using (true);
create policy "Autenticados podem curtir" on likes for insert with check (auth.uid() = user_id);
create policy "Usuário pode descurtir" on likes for delete using (auth.uid() = user_id);

-- Ativar realtime para likes
alter publication supabase_realtime add table public.likes;

-- 4. Criar tabela de Conexões (Follow/Connect)
create table public.connections (
  id uuid default gen_random_uuid() primary key,
  follower_id uuid references public.profiles(id) not null,
  following_id uuid references public.profiles(id) not null,
  status text default 'pending', -- 'pending' ou 'accepted'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(follower_id, following_id)
);

alter table public.connections enable row level security;
create policy "Conexões visíveis para todos" on connections for select using (true);
create policy "Autenticado pode enviar convite" on connections for insert with check (auth.uid() = follower_id);
create policy "Usuário pode aceitar/recusar convite recebido" on connections for update using (auth.uid() = following_id);
create policy "Usuário pode deletar sua conexão" on connections for delete using (auth.uid() = follower_id or auth.uid() = following_id);
