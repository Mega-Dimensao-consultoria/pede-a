## 1. PIX — de onde vem `pedeai@exemplo.com`

O QR Code é gerado **dinamicamente** pelo arquivo `src/lib/pix.ts` (padrão EMV/BR Code do Banco Central) a partir de 3 campos guardados na tabela `store_config`:

- `pix_key` → atualmente `pedeai@exemplo.com` (placeholder de seed)
- `nome` → `54.419.963 THADEU HENRIQUE DOS ANJOS`
- `cidade` → `Pouso Alegre`

Esses valores foram inseridos na migration inicial como exemplo. **Não há nada hardcoded no código** — basta atualizar para os dados reais da conta bancária que possui a chave PIX.

O `txid` e a descrição já são preenchidos com o número do pedido (`PEDIDO{numero}` e `Pedido {numero}`), então quando aparecer no extrato do banco já virá identificado. Vou confirmar isso e melhorar a tela de configurações para deixar claro que esses campos viram parte do QR Code real.

**Ação:**
- Trocar o valor da `pix_key` no admin → Configurações (campo já existe, vou só destacá-lo na UI com instruções: "esta chave deve ser a chave PIX real da conta que vai receber").
- Adicionar validação básica do formato da chave (e-mail / CPF / CNPJ / telefone / chave aleatória).
- Garantir que `nome` (titular da conta) e `cidade` estão corretos — esses campos vão no QR e o banco do pagador valida.

---

## 2. Modo Comanda Digital

### Toggle global
- Novo campo `store_config.modo_comanda boolean default false`.
- Em **Admin → Configurações** um switch "Modo Comanda Digital" com explicação.
- Quando ativo, o site inteiro muda de comportamento.

### Mudanças no fluxo do cliente (quando modo comanda ON)
- Tela inicial e produto: igual (cardápio + carrinho).
- Checkout simplificado — pede apenas:
  - Nome do cliente (obrigatório)
  - Número da mesa (obrigatório) **OU** marcador "Delivery" (opcional, configurável)
  - Tipo: `consumo no local` ou `delivery` (radio)
  - Forma de pagamento (PIX, dinheiro, cartão na entrega/máquina)
  - CPF (opcional, não obrigatório)
  - **Sem** endereço, **sem** bairro, **sem** taxa de entrega quando consumo local.
- Login/cadastro **não obrigatório** — pode pedir só com nome + mesa (igual fluxo guest atual, mas sem exigir e-mail).
- Após confirmar, mostra tela com **número do pedido** grande e link "Acompanhar status do pedido nº X".

### Mudanças no admin (modo comanda)
- Painel de Pedidos mostra: nº do pedido, mesa, cliente, itens, total, forma de pagamento, status.
- Status do pedido ganha fluxo de comanda: `pendente → preparando → pronto → entregue → pago`.
- Ao marcar como pago, abre modal pedindo: valor recebido e método (já vem pré-preenchido com o do pedido, mas editável → permite registrar troco e mudança de método).
- Registro vai para um novo campo `orders.pagamento_registrado jsonb` (valor, método, registrado_por, registrado_em).

### Mudanças no banco
- `store_config.modo_comanda boolean`
- `orders.mesa text` (nullable)
- `orders.pagamento_registrado jsonb` (nullable)
- Novo status `pronto` no enum `order_status` (se ainda não existe).
- Ajustar trigger `recalculate_order_pricing` para aceitar `tipo='consumo_local'` sem bairro/endereço (adicionar valor ao enum `order_type`).
- Ajustar RLS/policies para permitir pedidos guest sem `user_id` real OU manter o fluxo guest atual usando guest_id sintético.

### Página pública de acompanhamento
- Nova rota `/pedido/$numero` (sem login) que mostra status atual em tempo realtime (Supabase realtime no `orders`).

---

## 3. Edição de pedidos por modal (substitui drag-and-drop)

- Em `src/routes/admin/pedidos.tsx` substituir kanban/drag-and-drop por **lista/tabela** com colunas: nº, cliente, mesa/endereço, total, status (badge), ações.
- Cada linha tem botões: **Ver detalhes**, **Mudar status**, **Registrar pagamento** (modo comanda), **Imprimir**.
- Modal "Mudar status": mostra status atual e botões para cada próximo estado válido (ex.: `pendente → preparando`, `preparando → pronto`, etc.).
- Modal "Detalhes do pedido": mostra todos os itens, observações, endereço/mesa, comprovante PIX (se houver), e botões de ação.
- Filtros no topo: status, tipo (entrega/local), data.

---

## Arquivos que vou mexer (resumo técnico)

**Banco (1 migration):**
- `store_config.modo_comanda`
- `orders.mesa`, `orders.pagamento_registrado`
- enum `order_type` += `consumo_local`; enum `order_status` += `pronto` (se faltar)
- ajustar trigger `recalculate_order_pricing` para `consumo_local`

**Backend/RPC:**
- nova RPC `register_order_payment(_order_id, _valor, _metodo)` (admin only)

**Frontend:**
- `src/hooks/useStoreConfig.tsx` (novo) — expõe `modoComanda` global
- `src/routes/admin/configuracoes.tsx` — switch modo comanda + destaque da chave PIX
- `src/routes/checkout.tsx` — branch de UI por modo
- `src/routes/admin/pedidos.tsx` — reescrita como lista + modais
- `src/routes/sucesso.$orderId.tsx` — mostra nº grande no modo comanda
- nova rota `src/routes/pedido.$numero.tsx` — acompanhamento público
- `src/components/order-status-modal.tsx`, `order-detail-modal.tsx`, `register-payment-modal.tsx` (novos)

---

## Perguntas antes de eu codar

1. **Modo comanda permite delivery ao mesmo tempo?** Pelo que descreveu, parece que **NÃO** (só consumo no local + mesa). Confirma?
2. **Login no modo comanda:** deixo 100% sem login (só nome + mesa), ou mantenho a opção de login para o cliente acompanhar pedidos depois?
3. **Status no modo comanda:** `pendente → preparando → pronto → entregue → pago` está bom, ou prefere outro fluxo?
4. **Chave PIX real:** quer que eu já deixe um campo de teste / botão "Validar chave gerando QR de R$ 0,01" no admin?
