-- 1. Criar tabela de Mensagens (Chat)
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  receiver_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Ativar RLS (Row Level Security)
alter table public.messages enable row level security;

create policy "Usuários podem ver mensagens enviadas ou recebidas por eles"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Usuários podem enviar mensagens"
  on public.messages for insert
  with check (auth.uid() = sender_id);

create policy "Usuários podem marcar como lido"
  on public.messages for update
  using (auth.uid() = receiver_id);

-- 3. Ativar realtime para o Chat funcionar instantaneamente
alter publication supabase_realtime add table public.messages;

-- Atualizar API
NOTIFY pgrst, 'reload schema';
