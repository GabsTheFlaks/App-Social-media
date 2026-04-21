-- Adiciona a coluna badges (array de strings) à tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS badges text[] DEFAULT '{}'::text[];

-- Atualiza alguns usuários para testes (opcional)
-- UPDATE public.profiles SET badges = '{"admin", "pro"}' WHERE full_name = 'Nome Do Admin';
