-- Rode este script no SQL Editor do seu projeto Supabase

-- Criar tabela de Comentários
create table public.comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ativar RLS
alter table public.comments enable row level security;

-- Políticas de Segurança
create policy "Comentários visíveis para todos" on comments for select using (true);
create policy "Usuários autenticados podem comentar" on comments for insert with check (auth.uid() = user_id);
create policy "Usuário pode deletar próprio comentário" on comments for delete using (auth.uid() = user_id);

-- Ativar realtime para comentários
alter publication supabase_realtime add table public.comments;
