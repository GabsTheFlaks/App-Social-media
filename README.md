<div align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Supabase-181818?style=for-the-badge&logo=supabase&logoColor=3ECF8E" alt="Supabase" />
  <img src="https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA" />
  <img src="https://img.shields.io/badge/Google_Drive-4285F4?style=for-the-badge&logo=googledrive&logoColor=white" alt="Google Drive" />
</div>

<h1 align="center">Study Platform / PWA 🎓</h1>

<p align="center">
  <b>A structured Study Platform inspired by Google Classroom, built as a Progressive Web App (PWA).</b><br>
  <i>Uma Plataforma de Estudos estruturada inspirada no Google Classroom, construída como um PWA.</i>
</p>

---

## 🇧🇷 Português

### 📖 Sobre o Projeto
O **Study Platform PWA** evoluiu de uma rede social genérica para uma plataforma de aprendizado colaborativo e gerenciamento de estudos. Com um design focado na produtividade, ambiente responsivo "mobile-first" e layout de painel (dashboard) no estilo Google Classroom, o aplicativo oferece uma experiência fluida tanto no navegador quanto como um aplicativo instalado (PWA).

A arquitetura foi modernizada para utilizar um backend **100% Supabase** (substituindo FastAPI/SQLite), garantindo sincronização em tempo real e maior segurança.

### 🏗 Arquitetura
- **Frontend (Cliente):**
  - **React 19 & Vite:** Performance extrema e build ultrarrápido.
  - **Tailwind CSS v3:** Estilização utilitária focada em design corporativo/limpo (tons de azul/cinza, superfícies brancas).
  - **PWA (Progressive Web App):** Suporte offline básico e instalação nativa via `vite-plugin-pwa`.
- **Backend (BaaS):**
  - **Supabase:** Substituição completa do backend tradicional. Utilizado para Autenticação, Banco de Dados (PostgreSQL), Storage (para imagens de posts e covers) e Realtime (Chat, Presence e notificações de digitação).
- **Integração de Arquivos:**
  - **Google Drive API:** Upload invisível e otimizado usando Service Account. O backend salva apenas os metadados e o `drive_link` no Supabase para reduzir custos de armazenamento.

### ✨ Principais Funcionalidades
- **Dashboard de Estudos:** Layout limpo com barra superior (Navbar) e menu lateral para navegação.
- **Feed e Posts:** Suporte a múltiplas imagens, links (com pré-visualização) e textos.
- **Chat em Tempo Real:** Conversas 1-a-1 com indicadores de digitação (Supabase Presence) e gravação de mensagens de áudio (WebM).
- **Gerenciamento de Arquivos:** Integração fluida para envio de materiais de estudo, armazenados via Google Drive.
- **Notificações:** Alertas sobre curtidas, comentários e novas mensagens.
- **Exclusão de Conta:** Rotina segura usando função PostgreSQL (`delete_own_account()`) para limpar dados completamente e evitar erros de referência no Auth do Supabase.

### 🚀 Como Rodar o Projeto (Local)

1. **Clone o repositório e acesse a pasta:**
   ```bash
   cd social-pwa
   ```

2. **Instale as dependências (com flag legacy devido a conflitos React 19 / vite-plugin-pwa):**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Configuração de Variáveis de Ambiente:**
   Crie um arquivo `.env` na raiz do projeto contendo as chaves do seu projeto Supabase:
   ```env
   VITE_SUPABASE_URL=sua_url_do_projeto
   VITE_SUPABASE_ANON_KEY=sua_chave_anon_publica
   ```
   *(Scripts SQL localizados na raiz do repositório podem ser executados no Supabase SQL Editor para recriar as tabelas, RLS e Triggers).*

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   *O projeto rodará na porta fixa `5174` configurada no Vite.*

5. **Para testar os recursos PWA:**
   ```bash
   npm run build
   npm run preview
   ```

---

## 🇺🇸 English

### 📖 About the Project
The **Study Platform PWA** evolved from a generic social network into a collaborative learning and study management platform. Featuring a productivity-focused design, mobile-first responsiveness, and a Google Classroom-style dashboard layout, the app provides a seamless experience both in the browser and as an installed Progressive Web App (PWA).

The architecture was entirely migrated to a **100% Supabase** backend (abandoning older FastAPI/SQLite tech), ensuring real-time synchronization and robust security.

### 🏗 Architecture
- **Frontend (Client):**
  - **React 19 & Vite:** Extreme performance and ultra-fast builds.
  - **Tailwind CSS v3:** Utility-first styling for a clean, corporate UI (blue/gray tones, white surfaces, soft shadows).
  - **PWA:** Native installation and basic offline support via `vite-plugin-pwa`.
- **Backend (BaaS):**
  - **Supabase:** The sole backend solution. Handles Authentication, Database (PostgreSQL), Storage (for post images and profile covers), and Realtime features (Chat, Online Presence, and typing indicators).
- **File Storage Integration:**
  - **Google Drive API:** Invisible background uploads using a Service Account. Only metadata and the resulting `drive_link` are stored in Supabase to minimize platform costs.

### ✨ Key Features
- **Study Dashboard:** Clean workspace layout with a top Navbar and a side navigation menu.
- **Interactive Feed:** Rich posts supporting multiple images, link previews, and text.
- **Real-Time Chat:** 1-on-1 messaging complete with typing indicators, online status tracking (via Supabase Presence), and native audio recording (WebM).
- **File Management:** Seamless upload logic for study materials handled under the hood by Google Drive.
- **Notifications:** Instantly stay updated on likes, comments, and new chat messages.
- **Secure Account Deletion:** Custom secure PostgreSQL function (`delete_own_account()`) handling total data cleanup without breaking Supabase Auth constraints.

### 🚀 Getting Started (Local Development)

1. **Clone the repository and enter the directory:**
   ```bash
   cd social-pwa
   ```

2. **Install dependencies (using legacy flag due to React 19 / vite-plugin-pwa version conflicts):**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Environment Setup:**
   Create a `.env` file in the root directory and add your Supabase project keys:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
   *(You can run the SQL schema files located in the root directory inside the Supabase SQL Editor to replicate tables, RLS, and Triggers).*

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   *The app explicitly uses port `5174` (configured in Vite).*

5. **Test PWA capabilities:**
   ```bash
   npm run build
   npm run preview
   ```

---
<div align="center">
  <small>Built with ❤️ using React & Supabase</small>
</div>
