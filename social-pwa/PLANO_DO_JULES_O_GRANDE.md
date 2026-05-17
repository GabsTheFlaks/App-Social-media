# Plano do Jules o Grande: Plataforma de Estudos (Edição Supabase)

Saudações! Este documento é o guia definitivo para a arquitetura e desenvolvimento deste projeto. O foco da plataforma é ser um ambiente de estudos estruturado, abandonando elementos de rede social aberta e adotando uma interface limpa, segura e profissional, baseada no ecossistema do Supabase e com inspiração direta no Google Classroom.

---

## 1. Refatoração Visual: Interface estilo Google Classroom

O objetivo principal do frontend é adotar um layout limpo, dividido e focado em turmas e cursos.

### 1.1 Estrutura Global (Layout)
*   **Container Principal:** Utilize `flex h-screen overflow-hidden bg-white`. (Layout moderno de Dashboard - ex: `ClassroomLayout.jsx`).
*   **Navbar (Topo):** Limpa. Deve conter o botão sanduíche (para abrir/fechar o menu lateral), a logo "Sala de Aula", e à direita, ícones de ação rápida (ex: "+ Adicionar Curso" se for admin) e o Avatar do usuário com dropdown para "Sair".
*   **Sidebar (Menu Lateral):** Contém a navegação principal, como os cursos em que o usuário está matriculado e o catálogo geral (se aplicável).
*   **O Mural da Turma:** Ao acessar uma turma, a interface muda para um feed *isolado* daquela turma (avisos do professor e materiais de aula).
*   **Aulas e Atividades (Comentários):** Cada aula/atividade terá uma página ou seção de foco, com uma aba de comentários inferior (estilo Google Classroom), visível apenas aos membros daquela turma.

### 1.2 Design do Card de Curso (`CourseCard.jsx`)
O visual dos cursos deve transmitir organização:
*   **Topo:** Metade superior com imagem de fundo ou cor sólida. Título e nome do professor devem ficar **sobrepostos** à imagem (texto em branco, contrastante).
*   **Avatar:** O avatar do professor deve flutuar quebrando a divisão entre o cabeçalho colorido e a área branca inferior (`absolute -bottom-6 right-4`).
*   **Centro:** Espaço em branco limpo. Remover descrições longas. Foco no título.
*   **Rodapé:** Uma linha horizontal fina separando a área de ícones (como o ícone de uma pasta para materiais) ou ações secundárias.
*   **Interação:** O card inteiro deve ser clicável para "Acessar" o curso. Ações de matrícula devem ser sutis ou feitas em modal.

---

## 2. Backend e Autenticação: 100% Supabase

O projeto abandona as abordagens antigas de backend isolado (FastAPI/SQLite/JWT) e abraça integralmente o ecossistema Serverless do Supabase para garantir segurança, escalabilidade e facilidade de manutenção.

*   **Autenticação:** Gerenciada nativamente pelo **Supabase Auth**. Perfis unificados centralizados.
*   **Banco de Dados (PostgreSQL):** Utilização do banco de dados do Supabase (`@supabase/supabase-js` no frontend).
*   **Segurança (RLS - Row Level Security):** Este é o coração da segurança profissional. Políticas de RLS estritas devem ser configuradas para garantir que:
    *   Alunos só vejam materiais e atividades das turmas nas quais estão matriculados (`class_members`).
    *   Comentários de aula só possam ser lidos/escritos por membros da mesma turma.
    *   Apenas administradores ou professores possam criar turmas e postar materiais.

### Estrutura de Tabelas Simplificada (Sugestão Inicial)
*   `profiles`: Usuários da plataforma.
*   `classes`: Cursos/Turmas.
*   `class_members`: Relacionamento Aluno-Turma (crucial para o RLS).
*   `class_activities`: Postagens/Materiais do professor para o "Mural da Turma".
*   `activity_comments`: Sistema de comentários para interação dentro de cada aula.

---

## 3. Armazenamento de Arquivos: Google Drive API (Integração Invisível)

Apesar do uso do Supabase para dados, o armazenamento de arquivos pesados (PDFs, vídeos, apostilas) **não utilizará o Supabase Storage** para evitar custos. A solução é usar o **Google Drive** como banco de arquivos gratuito, de forma totalmente transparente para o usuário.

### 3.1 Fluxo de Upload (UX do Admin/Professor)
O Admin **não** precisa ir ao Google Drive manualmente.
*   No Frontend (`Admin.jsx`), haverá um formulário com:
    1.  **Título do Material** (Obrigatório).
    2.  **Descrição** (Opcional).
    3.  **Input de Arquivo (File Upload)**.

### 3.2 A Mágica do Upload (Edge Functions ou Integração Segura)
A integração usa a **Google Drive API** autenticada via **Service Account** (`.json`).
*   Como expor chaves do Google no frontend é perigoso, o envio do arquivo será intermediado de forma segura (ex: Supabase Edge Functions ou um microserviço simples apenas para gerenciar uploads e retornar o link).
*   Ao disparar o upload para o Drive, o sistema injeta nos metadados da requisição o campo `name` igual ao **Título do Material** fornecido pelo admin, ignorando o nome ruim do arquivo original (ex: `WhatsApp Image.pdf` vira `Apostila.pdf` no Drive).
*   O Drive processa, armazena e retorna um `File ID`.

### 3.3 Persistência no Banco de Dados (Supabase)
O Supabase nunca saberá o nome original "sujo" do arquivo, e não guardará o arquivo em si. A tabela `class_activities` guardará:
*   `title`: O título amigável digitado.
*   `description`: Opcional.
*   `drive_link`: A URL gerada a partir do `File ID` para que o aluno visualize o arquivo embutido ou baixe.

Para o aluno, a experiência final é limpa: ele clica em "Apostila" e o material abre instantaneamente.

---

## 4. Estratégia de Desenvolvimento e Reaproveitamento de Código

Para acelerar o desenvolvimento e poupar esforço em funcionalidades que já foram resolvidas anteriormente:

*   **Repositório de Origem (Python/React):** O usuário possui um projeto no GitHub que serviu como base conceitual (o que explica as menções originais a FastAPI e SQLite).
*   **Diretriz para o Jules:** É altamente recomendado acessar, analisar e (se instruído pelo usuário) **clonar ou referenciar** o código desse repositório original. Isso servirá como excelente contexto para entender a lógica de negócios, reaproveitar a estrutura de componentes React já existentes (como a UI base do Classroom) e adaptar soluções pré-prontas (como a lógica exata de integração com a API do Google Drive) para a nova infraestrutura do Supabase.
*   **Foco no que falta:** Ao invés de reinventar a roda, utilize o código legado como ponte, permitindo focar a energia e o tempo nas partes que o projeto antigo não possui ou na migração/refatoração para as novas tecnologias (como as regras de RLS do Supabase e o novo layout final).
