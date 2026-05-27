<div align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Supabase-181818?style=for-the-badge&logo=supabase&logoColor=3ECF8E" alt="Supabase" />
  <img src="https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA" />
  <img src="https://img.shields.io/badge/Google_Drive-4285F4?style=for-the-badge&logo=googledrive&logoColor=white" alt="Google Drive" />
</div>

<h1 align="center">Academic Social Network / PWA 🎓</h1>

<p align="center">
  <b>A modern Academic Social Network engineered as a Progressive Web App (PWA).</b><br>
  <i>Uma Rede Social Acadêmica moderna desenvolvida como um PWA.</i>
</p>

---

## 🇧🇷 Português

### 📖 Sobre o Projeto
O projeto **Academic Social Network** atua como um hub centralizado para a comunidade acadêmica. Ele permite que estudantes, pesquisadores e educadores se conectem, discutam ideias e construam um networking focado na área da educação. Com um design "mobile-first" e interface limpa, o aplicativo proporciona uma experiência acadêmica fluida, livre das distrações de redes sociais comuns, podendo ser acessado via navegador ou instalado como PWA em seu dispositivo móvel.

A plataforma utiliza um backend Serverless **100% Supabase**, garantindo sincronização em tempo real, segurança via RLS (Row Level Security) e arquitetura moderna.

### 🏗 Arquitetura
- **Frontend (Cliente):**
  - **React 19 & Vite:** Performance extrema e build ultrarrápido (configurado na porta fixa 5174).
  - **Tailwind CSS v3:** Estilização utilitária para criar uma interface clean e focada na leitura (tons de azul e superfícies claras).
  - **PWA (Progressive Web App):** Suporte offline e instalação nativa em mobile e desktop via `vite-plugin-pwa`.
- **Backend (Supabase BaaS):**
  - **Autenticação:** Login e gerenciamento de sessões com segurança embutida.
  - **PostgreSQL:** Banco de dados relacional robusto (com policies rígidas de RLS).
  - **Storage:** Armazenamento direto para imagens e capas de perfil nos *buckets* `post_images` e `covers`.
  - **Realtime:** Chat 1-a-1 e rastreamento de Status Online global usando *Supabase Presence*.

### ✨ Principais Funcionalidades
- **Feed Acadêmico:** Compartilhamento de conhecimento com suporte a múltiplas imagens por publicação, texto, emojis e geração automática de pré-visualização de links (como artigos e vídeos do YouTube).
- **Networking Escolar/Universitário:** Um sistema de "Conexões" para você seguir colegas e professores.
- **Chat e Colaboração Direta:** Uma vez conectados, os usuários conversam em um **Chat em Tempo Real** equipado com status de digitação ("escrevendo...") e envio nativo de áudio (WebM).
- **Engajamento Acadêmico:** Sistema de curtidas e comentários estruturado, com Atualizações Otimistas de Interface (UI Optimistic) para percepção de ação imediata.
- **Notificações:** Alertas dedicados para novos seguidores, respostas e curtidas.
- **Controle Total de Dados:** Exclusão completa e segura do perfil via função customizada PostgreSQL (`delete_own_account()`).

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
The **Academic Social Network** operates as a centralized hub for the academic community. It allows students, researchers, and educators to connect, discuss ideas, and build a network focused entirely on education. Featuring a mobile-first design and a clean interface, the app provides a smooth, distraction-free academic experience compared to common social networks, accessible via browser or installed as a PWA on your mobile device.

The platform utilizes a **100% Serverless Supabase** backend, guaranteeing real-time synchronization, rigorous Row Level Security (RLS) policies, and a modern architecture.

### 🏗 Architecture
- **Frontend (Client):**
  - **React 19 & Vite:** Extreme performance and ultra-fast builds (configured on fixed port 5174).
  - **Tailwind CSS v3:** Utility-first styling to create a clean, reading-focused UI (blue tones, white surfaces, soft shadows).
  - **PWA:** Native installation across desktop and mobile, plus offline support via `vite-plugin-pwa`.
- **Backend (Supabase BaaS):**
  - **Authentication:** Integrated session management and secure logins.
  - **PostgreSQL:** Relational database fortified with strict RLS policies.
  - **Storage:** Dedicated buckets (`post_images` and `covers`) for handling avatar and post media.
  - **Realtime:** 1-on-1 chat routing and global online status tracking powered by *Supabase Presence*.

### ✨ Key Features
- **Academic Feed:** Knowledge sharing with multiple-image uploads, text formatting, and automatic rich link previews (such as articles or YouTube videos).
- **School/University Networking:** A "Connections" system to follow peers, professors, and researchers.
- **Chat and Direct Collaboration:** Once connected, users can engage in **Real-time Chat** outfitted with typing indicators and native WebM audio recording.
- **Academic Engagement:** Structured likes and comments system, providing instantaneous visual feedback driven by Optimistic UI updates.
- **Notifications:** Dedicated alert page to keep track of new followers, replies, and likes.
- **Full Data Control:** Secure and total account wipe enabled by a custom PostgreSQL function (`delete_own_account()`).

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
