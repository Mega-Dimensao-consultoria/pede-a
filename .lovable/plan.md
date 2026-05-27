## Objetivo

Permitir que o cliente continue comprando sem cadastro (informando apenas e-mail), exigir login apenas na finalização e enviar 3 e-mails de recuperação caso o carrinho seja abandonado, com link que restaura o carrinho.

## Comportamento

1. Ao adicionar um produto sem estar logado, o modal de auth atual passa a oferecer 3 caminhos:
   - Entrar
   - Cadastrar
   - **Continuar sem cadastrar** (somente e-mail)
2. Escolhendo guest: salvamos `guest_id` + `email` no `localStorage`. A partir daí o cliente adiciona quantos itens quiser livremente — o carrinho fica em `localStorage` (não exige login).
3. O carrinho flutuante e a página `/carrinho` mostram esses itens normalmente.
4. Ao clicar em **Finalizar compra** (no flutuante ou no checkout), se não estiver logado, abrimos o modal de auth completo (Google/Apple/e-mail+senha). Após login, os itens guest são migrados para a `cart_items` do usuário e o checkout segue.
5. Cada `add/update/remove` do guest faz um upsert no servidor em `guest_carts` (e-mail + itens + `updated_at`). É isso que alimenta o disparo dos e-mails de recuperação.
6. Um cron a cada 5 min consulta carrinhos abandonados e enfileira até 3 e-mails por carrinho:
   - 1º após **1 hora** parado
   - 2º após **6 horas**
   - 3º após **24 horas**
   Cada e-mail leva um link `/recuperar?token=...`.
7. Ao abrir o link:
   - Restauramos os itens no `localStorage` do navegador.
   - Se já logado → redireciona para `/checkout`.
   - Se não logado → vai para `/auth` com aviso "entre para finalizar seu pedido".
8. Quando o pedido é criado, marcamos o `guest_cart` como `recovered` (não envia mais e-mail).

## Mudanças

### Banco (migration)
- Tabela `guest_carts`: `id`, `token` (uuid, indexado), `email`, `items jsonb`, `subtotal numeric`, `status` (`active|recovered|abandoned`), `recovery_sent_count int default 0`, `last_email_sent_at`, `updated_at`, `created_at`.
- RLS: leitura/escrita anônima permitida **somente** filtrando por `token` (o token é o segredo). Service role total.
- Cron pg_cron a cada 5 min chamando uma rota interna `/api/public/abandoned-carts/dispatch` (protegida por header secreto).

### Frontend
- `src/hooks/useGuestCart.tsx`: nova store em `localStorage` espelhando a API de `useCart`.
- `useCart` atualizado: se houver `user` usa Supabase; senão delega ao guest cart. API pública (`add`, `updateQty`, `remove`, `items`, `subtotal`, `count`) não muda.
- `auth-modal.tsx`: novo botão "Continuar sem cadastro" + campo único de e-mail quando ativado. Salva guest e fecha modal.
- `floating-cart.tsx` + `carrinho.tsx`: botão "Finalizar compra" abre o `AuthModal` se não logado.
- `checkout.tsx`: guard idêntico (redireciona ao auth se guest).
- Nova rota `src/routes/recuperar.tsx`: busca por `token`, restaura itens no localStorage, redireciona conforme estado de login.
- Após login: hook que faz merge do guest cart no `cart_items` do usuário e marca `guest_cart.status = 'recovered'`.

### E-mails
- Template React Email `cart-recovery.tsx` (assunto varia por tentativa: "Você esqueceu algo no seu cesto", "Seus itens ainda estão te esperando", "Última chance — seu cesto será apagado em breve").
- Registro no `registry.ts`.
- A rota de dispatch enfileira via `sendTransactionalEmail` com `idempotencyKey` = `cart-recovery-{token}-{attempt}`.
- Pré-requisito: domínio de e-mail + infra de e-mails transacionais (escaffold via tool). Se ainda não houver domínio, mostro o botão de setup.

## Pontos para o usuário decidir

- Intervalos (1h / 6h / 24h) — pode ser ajustado.
- Texto/tom dos 3 e-mails — uso versões enxutas em pt-BR a menos que você queira escrever.
- O guest dá apenas e-mail; nome/whatsapp serão pedidos só na hora de finalizar.
