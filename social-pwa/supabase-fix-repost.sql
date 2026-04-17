-- Adiciona a coluna is_repost e original_post_id caso ainda não existam
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_repost BOOLEAN DEFAULT false;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS original_post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL;

-- Notifica o PostgREST para recarregar o schema
NOTIFY pgrst, 'reload schema';
