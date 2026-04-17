-- Rode este script no SQL Editor do seu projeto Supabase para a FASE 2

-- 1. Criar tabela de Notificações
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null, -- Quem vai RECEBER a notificação
  actor_id uuid references public.profiles(id) on delete cascade not null, -- Quem FEZ a ação (curtiu, comentou)
  type text not null, -- 'like', 'comment', 'connection_request', 'connection_accepted', 'repost'
  post_id uuid references public.posts(id) on delete cascade, -- Opcional: qual post
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.notifications enable row level security;
create policy "Usuários podem ver apenas suas próprias notificações" on notifications for select using (auth.uid() = user_id);
create policy "Usuários podem atualizar leitura de notificações" on notifications for update using (auth.uid() = user_id);
create policy "Sistema pode inserir notificações" on notifications for insert with check (true);
create policy "Usuários podem apagar suas notificações" on notifications for delete using (auth.uid() = user_id);

-- Ativar realtime para o sininho atualizar sozinho
alter publication supabase_realtime add table public.notifications;

-- 2. FUNÇÕES AUTOMÁTICAS (TRIGGERS) PARA GERAR NOTIFICAÇÕES

-- Trigger para LIKES
create or replace function public.handle_new_like()
returns trigger as $$
declare
  post_owner uuid;
begin
  select user_id into post_owner from public.posts where id = new.post_id;
  if post_owner != new.user_id then
    insert into public.notifications (user_id, actor_id, type, post_id)
    values (post_owner, new.user_id, 'like', new.post_id);
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_new_like
  after insert on public.likes
  for each row execute procedure public.handle_new_like();

-- Trigger para COMENTÁRIOS
create or replace function public.handle_new_comment()
returns trigger as $$
declare
  post_owner uuid;
begin
  select user_id into post_owner from public.posts where id = new.post_id;
  if post_owner != new.user_id then
    insert into public.notifications (user_id, actor_id, type, post_id)
    values (post_owner, new.user_id, 'comment', new.post_id);
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_new_comment
  after insert on public.comments
  for each row execute procedure public.handle_new_comment();

-- Trigger para CONEXÕES (Pedidos e Aceites)
create or replace function public.handle_connection_change()
returns trigger as $$
begin
  if (TG_OP = 'INSERT' and new.status = 'pending') then
    -- Envia notificação de pedido
    insert into public.notifications (user_id, actor_id, type)
    values (new.following_id, new.follower_id, 'connection_request');
  elsif (TG_OP = 'UPDATE' and old.status = 'pending' and new.status = 'accepted') then
    -- Envia notificação que aceitou (para quem pediu)
    insert into public.notifications (user_id, actor_id, type)
    values (new.follower_id, new.following_id, 'connection_accepted');
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_connection_change
  after insert or update on public.connections
  for each row execute procedure public.handle_connection_change();

-- Atualiza cache
NOTIFY pgrst, 'reload schema';
