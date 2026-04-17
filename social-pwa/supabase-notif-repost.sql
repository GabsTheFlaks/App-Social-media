-- Trigger para Notificar Compartilhamentos (Reposts)
create or replace function public.handle_new_repost()
returns trigger as $$
declare
  original_owner uuid;
begin
  -- Verifica se é um repost
  if new.is_repost = true and new.original_post_id is not null then
    -- Pega o dono do post original
    select user_id into original_owner from public.posts where id = new.original_post_id;

    -- Não notifica se o usuário repostar seu próprio post (opcional, mas recomendado)
    if original_owner != new.user_id then
      insert into public.notifications (user_id, actor_id, type, post_id)
      values (original_owner, new.user_id, 'repost', new.original_post_id);
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Remove a trigger se ela já existir para evitar erros
drop trigger if exists on_new_repost on public.posts;

create trigger on_new_repost
  after insert on public.posts
  for each row execute procedure public.handle_new_repost();
