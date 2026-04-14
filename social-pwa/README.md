# SocialPWA

Uma rede social híbrida, com foco em responsividade e funcionando como um Progressive Web App (PWA) no modo fullscreen, criada com React, Vite e Tailwind CSS.

## Recursos
- Autenticação (Login simulado)
- PWA Completo (Service worker e Manifest.json)
- Feed de notícias e criação de postagens
- Perfil do usuário e rede de contatos

## Stack Tecnológico
- React 19 (com Vite)
- Tailwind CSS 3
- Lucide React (Ícones)
- React Router DOM
- vite-plugin-pwa

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
