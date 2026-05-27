
## Objetivo

Permitir que o cliente entre/cadastre-se com **Google** ou **Apple**, mantendo os métodos atuais (e-mail e WhatsApp). Quando o e-mail do provedor social coincidir com um cadastro existente, vincular automaticamente as identidades. Na tela **Minha conta**, exibir contas sociais conectadas com opções de conectar/desconectar.

> Facebook não é suportado nativamente no Lovable Cloud — fica de fora desta entrega, conforme escolhido.

## Etapas

### 1. Habilitar provedores sociais
- Chamar `configure_social_auth` com `providers: ["google", "apple"]` (sem desabilitar e-mail).
- Lovable Cloud já fornece credenciais gerenciadas para ambos — sem necessidade de configurar OAuth manualmente.

### 2. Vinculação automática por e-mail
- Habilitar no Supabase Auth a opção **"Link accounts with same email"** (manual linking desligado, identidades agrupam por e-mail verificado).
- Resultado: se o cliente já tem conta por senha com `cliente@gmail.com` e faz login com Google usando o mesmo e-mail, o Supabase une as identidades automaticamente no mesmo `auth.users.id` — pedidos, endereços e perfil permanecem.
- O trigger `handle_new_user` continua válido (só dispara em criação real de usuário; vinculação não cria novo registro).

### 3. UI de login social no `AuthModal`
- Em `src/components/auth-modal.tsx`, adicionar dois botões — "Continuar com Google" e "Continuar com Apple" — acima das abas Entrar/Cadastrar.
- Usar `supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } })`.
- Logos via SVGs inline simples (lucide não tem ícones oficiais de Google/Apple).
- Tabs de e-mail/WhatsApp + senha permanecem inalteradas.

### 4. Retorno do OAuth
- O Supabase redireciona de volta para a origem com tokens no fragmento da URL; o `onAuthStateChange` já existente no `useAuth` captura a sessão. Não é necessária rota nova — o usuário cai em `/` autenticado.
- Em caso de erro (ex.: e-mail não verificado no provedor), capturar via query `?error=` e exibir toast.

### 5. Gerenciar contas sociais em `/conta`
- Novo card **"Contas conectadas"** em `src/routes/conta.tsx`, abaixo de "Dados de acesso".
- Carregar identidades via `supabase.auth.getUserIdentities()` → lista com provider, e-mail e data.
- Para cada provedor disponível (google, apple):
  - Se conectado → botão **"Desconectar"** chamando `supabase.auth.unlinkIdentity(identity)`. Bloquear desvincular se for a única identidade restante (evita lockout).
  - Se não conectado → botão **"Conectar"** chamando `supabase.auth.linkIdentity({ provider })` (o usuário precisa estar logado).
- Após conectar/desconectar, recarregar a lista e mostrar toast.

### 6. Atualizar `useAuth`
- Expor `identities` no contexto (opcional, para facilitar exibir no header).
- `loadExtras` passa a também buscar `auth.getUserIdentities()` e armazenar.

### 7. Configuração necessária no Supabase
- `configure_social_auth({ providers: ["google", "apple"] })` — habilita provedores.
- Confirmar nas Auth Settings: **Manual linking = OFF**, **Confirm email = ON** (já é o default; e-mails Google/Apple chegam verificados).

## Detalhes técnicos

- **Identity linking API** (Supabase JS v2):
  - `supabase.auth.getUserIdentities()` → `{ data: { identities: [...] } }`.
  - `supabase.auth.linkIdentity({ provider: 'google' })` — inicia OAuth para o usuário logado e adiciona ao mesmo `user.id`.
  - `supabase.auth.unlinkIdentity(identity)` — remove a identidade (precisa de pelo menos uma sobrando).
- **Conflito de e-mail**: com "Link accounts with same email" ligado, o Supabase une automaticamente se o e-mail do provedor for verificado e bater com `auth.users.email`. Sem essa opção, retornaria erro `email_exists`.
- **WhatsApp sintético** (e-mails `*@whatsapp.pedeai.local`): nunca colidem com Google/Apple — seguros de conviver.
- **`identifier_type`** em `profiles` permanece como está; novos cadastros via Google são salvos como `email` (default do trigger), o que já está correto.
- **Sem alterações de schema**: identidades vivem em `auth.identities` (gerenciado pelo Supabase). Nada a migrar.

## Arquivos afetados

- `src/components/auth-modal.tsx` — botões Google/Apple.
- `src/routes/conta.tsx` — card "Contas conectadas".
- `src/hooks/useAuth.tsx` — expor identidades (opcional).
- Configuração Supabase via `configure_social_auth`.

## Fora de escopo

- Facebook (não suportado nativamente).
- Login com Apple em iOS nativo (esta app é web).
- Fluxo de "merge manual" quando e-mails diferem entre conta antiga e provedor social.
