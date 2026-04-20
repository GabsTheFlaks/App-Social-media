# Plano de Migração: React PWA para React Native (Mobile App)

Este documento detalha o plano de ação para converter o projeto Social PWA atual (React web) em um aplicativo mobile nativo utilizando **React Native**. O plano foca nas tecnologias mais modernas, fáceis e seguras de implementar no ecossistema atual.

## 🛠 Escolha do Stack Tecnológico (Recomendado)

1. **Framework:** **Expo** (Managed Workflow)
   - *Por quê:* O Expo simplifica enormemente a configuração do projeto, build para iOS/Android e acesso a APIs nativas (câmera, notificações, sistema de arquivos). Elimina muita "dor de cabeça" associada à configuração nativa manual.
2. **Navegação:** **Expo Router**
   - *Por quê:* Traz o conceito de roteamento baseado em arquivos (similar ao Next.js) e substitui o React Router DOM usado na web. É o padrão oficial atual do Expo e muito intuitivo.
3. **Estilização:** **NativeWind**
   - *Por quê:* Como o projeto web já utiliza Tailwind CSS com sucesso, o NativeWind permite reaproveitar grande parte do conhecimento de classes utilitárias (e até mesmo algum código) mapeando classes do Tailwind para o `StyleSheet` do React Native.
4. **Backend:** **Supabase**
   - *Por quê:* O código de backend (queries, auth) já usa o `@supabase/supabase-js`, que é 100% compatível com React Native, necessitando apenas de um leve ajuste na parte de armazenamento de sessão (usando `AsyncStorage`).

---

## 🗺 Passo a Passo da Migração (Para um Novo Repositório)

### Fase 1: Setup e Configuração Inicial
1. **Inicializar o Projeto Expo:**
   - Rodar `npx create-expo-app@latest meu-app-mobile` no novo repositório.
   - Isso já configurará o Expo com o **Expo Router** por padrão.
2. **Instalar Dependências Core:**
   - Instalar Supabase: `npm install @supabase/supabase-js @react-native-async-storage/async-storage`
   - Instalar e configurar o NativeWind: Seguir a [documentação oficial do NativeWind](https://www.nativewind.dev/quick-starts/expo) para Expo.
   - Instalar ícones: Usar `@expo/vector-icons` (ou `lucide-react-native` para bater com os ícones da web).
   - Instalar Day.js: `npm install dayjs`

### Fase 2: Adaptação de Infraestrutura e Estado
1. **Configurar o Supabase para Mobile:**
   - Criar o arquivo `supabase.js`.
   - **Diferença crucial:** No mobile, o React Native precisa de um mecanismo para salvar o token do usuário. O Supabase deve ser configurado para usar o `AsyncStorage`:
     ```javascript
     import AsyncStorage from '@react-native-async-storage/async-storage';
     import { createClient } from '@supabase/supabase-js';

     export const supabase = createClient(URL, KEY, {
       auth: {
         storage: AsyncStorage,
         autoRefreshToken: true,
         persistSession: true,
         detectSessionInUrl: false,
       },
     });
     ```
2. **Offline e Cache (Armazenamento Local):**
   - Como estamos num app, não teremos o Service Worker (PWA).
   - O armazenamento de dados offline (ex: feed em cache) pode ser feito de forma simples com `AsyncStorage` ou de forma mais robusta usando o `sqlite` do Expo.

### Fase 3: Roteamento (Migrando o React Router para Expo Router)
- Substituir o React Router DOM pelo Expo Router. A estrutura de pastas em `app/` ditará as rotas.
- **Mapeamento de Rotas sugerido:**
  - `app/index.tsx` (Tela de Login ou redirecionamento se logado)
  - `app/(tabs)/_layout.tsx` (Configuração do menu de navegação inferior - Tab Bar)
  - `app/(tabs)/feed.tsx` (Feed de Posts)
  - `app/(tabs)/network.tsx` (Busca e Conexões)
  - `app/(tabs)/notifications.tsx` (Notificações)
  - `app/(tabs)/profile.tsx` (Meu Perfil)
  - `app/chat/[id].tsx` (Chat individual fora das tabs)
  - `app/post/[id].tsx` (Post individual fora das tabs)

### Fase 4: Migração e Adaptação dos Componentes de UI
- Os componentes precisarão ser traduzidos da web para o mobile.
- **De / Para:**
  - `<div>`, `<section>`, `<main>` ➡️ `<View>`, `<SafeAreaView>`, `<KeyboardAvoidingView>`
  - `<span>`, `<p>`, `<h1>` ➡️ `<Text>`
  - `<img>` ➡️ `<Image>` (importado do `expo-image` para melhor performance e cache)
  - `<button>` ➡️ `<TouchableOpacity>` ou `<Pressable>`
  - `<input>` ➡️ `<TextInput>`
- **NativeWind:** A maioria das classes do Tailwind como `flex`, `flex-row`, `p-4`, `bg-white`, `rounded-lg` funcionará imediatamente.
- **Listas (Infinito Scroll):**
  - O Feed e listas longas devem obrigatoriamente usar `<FlatList>` do React Native para performance, migrando a lógica de `onScroll` que você tem na web para as propriedades `onEndReached` e `onEndReachedThreshold` da `FlatList`.

### Fase 5: Implementação de Recursos Nativos
1. **Câmera e Galeria (Upload de Fotos):**
   - Substituir o `<input type="file">` pelo **`expo-image-picker`**.
   - Fluxo: Usuário clica no botão -> Expo abre a galeria nativa do celular -> App pega a URI da imagem -> Converte/comprime (se necessário) -> Envia para o Supabase Storage.
2. **Notificações Push Nativas:**
   - O sistema atual depende de notificações no banco ou web push. No mobile, usaremos o **`expo-notifications`**.
   - Fluxo: O app solicita permissão ao usuário -> Obtém o Push Token do Expo -> Salva esse token no banco de dados (tabela `profiles`) -> O backend (ou Edge Functions do Supabase) envia as pushes via API do Expo quando há mensagens, curtidas, etc.
3. **Indicadores de Carregamento e UI Nativa:**
   - Usar `<ActivityIndicator>` para loadings.
   - Usar o pull-to-refresh nativo da `<FlatList>` (propriedade `refreshControl`).

### Fase 6: Testes, Ajustes e Lançamento
1. **Testes:**
   - Utilizar o aplicativo `Expo Go` no seu próprio celular (iOS ou Android) para testar durante o desenvolvimento.
   - Validar comportamentos de teclado nativo (usar `KeyboardAvoidingView` no chat para que o teclado não cubra as mensagens).
2. **Build para Lojas:**
   - Usar o **EAS Build** (Expo Application Services) para gerar o `.apk` (Android) / `.aab` (Google Play) e `.ipa` (App Store) diretamente da nuvem, sem precisar configurar Android Studio ou Xcode na sua máquina.

---

## 🎯 Resumo de Esforço

A lógica de negócios (queries Supabase, controle de estado do React, useEffects) poderá ser **100% reaproveitada**. O trabalho principal será:
1. Traduzir as tags HTML (`div`, `span`) para componentes React Native (`View`, `Text`).
2. Trocar a navegação do React Router pelo Expo Router.
3. Substituir inputs de arquivo por APIs nativas do Expo (Câmera/Imagem).
