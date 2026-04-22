-- Adicionar as colunas deleted_by_sender e deleted_by_receiver na tabela messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_by_sender BOOLEAN DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_by_receiver BOOLEAN DEFAULT false;

-- Atualizar as RLS
DROP POLICY IF EXISTS "Usuários podem marcar como lido" ON public.messages;
DROP POLICY IF EXISTS "Usuários podem atualizar mensagens deles" ON public.messages;
DROP POLICY IF EXISTS "Usuários podem marcar como lido ou apagar (receiver)" ON public.messages;
DROP POLICY IF EXISTS "Usuários podem atualizar suas mensagens enviadas" ON public.messages;
DROP POLICY IF EXISTS "Remetentes e destinatários podem dar update (protegido por trigger)" ON public.messages;

-- Permitir update se for o sender ou receiver
CREATE POLICY "Remetentes e destinatários podem dar update (protegido por trigger)"
  ON public.messages FOR UPDATE
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Trigger para proteger a integridade dos dados e impedir cross-deletion
CREATE OR REPLACE FUNCTION protect_message_immutables()
RETURNS TRIGGER AS $$
BEGIN
  -- Proteger dados imutáveis
  IF NEW.content IS DISTINCT FROM OLD.content THEN
    RAISE EXCEPTION 'Não é permitido alterar o conteúdo da mensagem';
  END IF;
  IF NEW.sender_id IS DISTINCT FROM OLD.sender_id THEN
    RAISE EXCEPTION 'Não é permitido alterar o remetente';
  END IF;
  IF NEW.receiver_id IS DISTINCT FROM OLD.receiver_id THEN
    RAISE EXCEPTION 'Não é permitido alterar o destinatário';
  END IF;

  -- Impedir que o remetente apague a mensagem do destinatário
  IF NEW.deleted_by_receiver IS DISTINCT FROM OLD.deleted_by_receiver AND auth.uid() != OLD.receiver_id THEN
    RAISE EXCEPTION 'Você não tem permissão para apagar a mensagem do destinatário';
  END IF;

  -- Impedir que o destinatário apague a mensagem do remetente
  IF NEW.deleted_by_sender IS DISTINCT FROM OLD.deleted_by_sender AND auth.uid() != OLD.sender_id THEN
    RAISE EXCEPTION 'Você não tem permissão para apagar a mensagem do remetente';
  END IF;

  -- (Se quisermos proteger o status lido, o destinatário marca como lido)
  IF NEW.read IS DISTINCT FROM OLD.read AND auth.uid() != OLD.receiver_id THEN
    RAISE EXCEPTION 'Apenas o destinatário pode marcar a mensagem como lida';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_protect_message_immutables ON public.messages;
CREATE TRIGGER trigger_protect_message_immutables
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION protect_message_immutables();

-- Atualizar API
NOTIFY pgrst, 'reload schema';
