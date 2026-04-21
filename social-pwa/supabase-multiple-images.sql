-- Adiciona a coluna para suportar um array (lista) de URLs de imagens
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS image_urls text[];

-- (Opcional) Migração de Dados:
-- Se você quiser transformar as postagens antigas (que só tinham 1 imagem na coluna image_url)
-- em arrays para o novo sistema funcionar igual para todos, descomente e rode o comando abaixo:

-- UPDATE public.posts
-- SET image_urls = ARRAY[image_url]
-- WHERE image_url IS NOT NULL AND image_urls IS NULL;

-- NOTIFY pgrst, 'reload schema';
