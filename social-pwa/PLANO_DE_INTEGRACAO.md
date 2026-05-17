# Plano de Integração: Plataforma de Social Learning

Este documento descreve o plano arquitetural e as decisões de UX/UI para transformar a aplicação em uma Plataforma de Aprendizado Social (Social Learning Platform), unindo recursos de rede social (networking) e de plataforma de estudos (EAD/Classroom).

## 1. Visão Geral

A plataforma será um ambiente "Tudo-em-Um" (um pouco de cada), onde o aluno terá acesso tanto a uma comunidade aberta para networking quanto a ambientes isolados de foco (Turmas/Cursos), sem que as informações de um ambiente poluam o outro.

## 2. Decisão de Arquitetura

**Abordagem Escolhida (Sugerida): App Único (Monolito com React)**
Para atingir o objetivo de ser "um pouco de cada" e manter uma experiência fluida, os dois projetos serão mesclados em uma única aplicação frontend (React/Vite) que consome o mesmo backend (Supabase).

*   O usuário faz apenas um login.
*   A navegação ocorre através de abas ou menu lateral (ex: "Feed", "Minhas Turmas", "Perfil").

## 3. Estrutura de UX / UI

A interface será claramente dividida para manter o foco do usuário na tarefa correta:

### 3.1. Ambiente Social (Networking)
*   **Feed Global:** Similar a um feed de rede social corporativa/estudantil. Aqui, os usuários podem criar postagens abertas, procurar grupos de estudo, fazer networking e tirar dúvidas da comunidade.
*   **Isolamento:** Postagens e avisos feitos dentro de "Turmas" **NÃO** aparecerão aqui.

### 3.2. Ambiente de Estudos (Classroom)
*   **Dashboard de Turmas:** Uma seção onde o usuário vê os cursos e turmas nos quais está matriculado.
*   **Mural da Turma:** Ao entrar em uma turma, o usuário vê um feed *isolado* apenas com conteúdo daquela turma (avisos do professor, novas atividades).
*   **Aulas e Atividades:** Páginas dedicadas (foco total) para assistir vídeos ou ler materiais.
*   **Comentários de Aula:** Cada aula/atividade terá uma aba de comentários inferior (estilo Google Classroom). Esses comentários pertencem apenas àquela aula e são visíveis somente aos membros da turma.

## 4. Modelagem do Banco de Dados (Supabase)

Para suportar essa divisão, o banco de dados atual será expandido da seguinte forma:

*   **Tabela `profiles` (Existente):** Será a única tabela de usuários. A mesma foto e nome são usados em toda a plataforma.
*   **Tabela `posts` (Existente - para o Social):** Será mantida para o feed social público.
*   **Tabela `classes` (Nova):** Armazenará os cursos/turmas.
*   **Tabela `class_members` (Nova):** Relação N:N para gerenciar os alunos de cada turma e controlar o acesso (RLS).
*   **Tabela `class_activities` (Nova):** Postagens do professor que alimentam o "Mural da Turma".
*   **Tabela `activity_comments` (Nova):** Para o sistema de comentários restrito a aulas/atividades específicas. Não se mistura com os comentários de posts sociais.

## 5. Próximos Passos
1. Criar o modelo de dados no Supabase e configurar as políticas de RLS.
2. Construir o layout do "Mural da Turma" e o roteamento no React.
3. Implementar a aba de comentários por atividade.
