# SocialPWA

Uma rede social híbrida, com foco em responsividade e funcionando como um Progressive Web App (PWA) no modo fullscreen, criada com React, Vite e Tailwind CSS.

## Recursos
- Autenticação (Login simulado, pronto para integração real)
- PWA Completo (Service worker e Manifest.json)
- Feed de notícias e criação de postagens
- Perfil do usuário e rede de contatos

## Stack Tecnológico
- React 19 (com Vite)
- Tailwind CSS 3
- Lucide React (Ícones)
- React Router DOM
- vite-plugin-pwa
- Supabase (SDK incluído para o próximo passo)

## Como rodar o projeto localmente

1. **Instale as dependências:**
   ```bash
   npm install --legacy-peer-deps
   ```

2. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

3. **Para testar o PWA:**
   O PWA funciona melhor no build de produção.
   ```bash
   npm run build
   npm run preview
   ```
   Acesse a URL gerada e você poderá "Instalar o aplicativo" através do menu do Chrome (ou no botão na barra de endereço) para ver o comportamento em tela cheia.

---

## Próximos Passos: Integração com Back-end (Supabase)

O pacote `@supabase/supabase-js` já está instalado e a configuração inicial foi criada em `src/lib/supabase.js`.

**Para ativar a conexão real:**
1. Crie uma conta no [Supabase](https://supabase.com/) e crie um novo projeto.
2. Na raiz do projeto (`social-pwa`), crie um arquivo chamado `.env` e adicione as suas chaves do projeto (encontradas nas configurações de API do Supabase):

   ```env
   VITE_SUPABASE_URL=sua_url_do_projeto
   VITE_SUPABASE_ANON_KEY=sua_chave_anon_publica
   ```

3. Em seguida, poderemos substituir o login simulado em `src/components/Login.jsx` usando `supabase.auth.signInWithPassword()` e puxar os dados reais para os componentes.
