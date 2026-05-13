
# Pede Aí — Plano de Implementação

Sistema completo de cardápio digital com loja para o cliente (mobile-first) e painel administrativo para o lojista, usando React + TanStack Start, Tailwind, shadcn/ui, Lucide e Lovable Cloud (Supabase).

## 1. Backend (Lovable Cloud)

Ativar Lovable Cloud e criar as tabelas:

- `profiles` — id (FK auth.users), nome, identifier_type ('email'|'whatsapp'), whatsapp, email, cpf, created_at
- `user_roles` — user_id, role enum ('admin','customer') + função `has_role()` SECURITY DEFINER (evita escalada de privilégio)
- `categories` — id, nome, ordem, ativo
- `products` — id, category_id, nome, descrição, preço_base, imagem_url, ativo, sizes (jsonb: [{label:'P',price_delta}]), addons (jsonb: [{nome,preço,obrigatório}])
- `cart_items` — id, user_id, product_id, size, addons (jsonb), quantidade, observações
- `neighborhood_delivery` — id, nome, taxa, ativo + linha especial "Outros Bairros"
- `store_config` — singleton: nome, cnpj, endereço, telefone, pix_key, pix_qr_url, horários (jsonb por dia: {abre, fecha, ativo})
- `orders` — id, user_id, items (jsonb snapshot), subtotal, taxa_entrega, total, tipo ('retirada'|'entrega'), endereço (jsonb), bairro_id, pagamento ('cartao'|'pix'), cpf_nota, status ('pendente'|'preparando'|'saiu'|'concluido'), created_at

RLS:
- profiles/cart_items/orders: usuário acessa apenas o próprio
- products/categories/neighborhood_delivery/store_config: leitura pública, escrita só admin
- orders: admin pode ler/atualizar todos via `has_role(auth.uid(),'admin')`

Storage: bucket público `products` para imagens.

Trigger: criar profile + role 'customer' automaticamente no signup.

## 2. Autenticação

- Página `/auth` com toggle E-mail / WhatsApp + senha
- WhatsApp: usar como "fake email" (`{numero}@whatsapp.pedeai.local`) salvando o número em profiles.whatsapp
- Carrinho convidado fica em estado local; ao tentar adicionar o primeiro item sem login, abre modal de auth e depois persiste no Supabase
- Sessão persistida (localStorage) → carrinho sincroniza entre dispositivos via `cart_items`

## 3. Frontend Cliente (mobile-first)

Rotas:
- `/` Home — banner de status (fechado/aberto via `store_config.horarios` + horário atual), chips de categorias horizontais com scroll, grid de produtos
- `/produto/$id` — seleção de tamanho (radio P/M/G), checklist de adicionais, observações, qty, botão "Adicionar"
- `/carrinho` — itens, subtotal, botão checkout (desabilitado se loja fechada com aviso fixo grande "ESTAMOS FECHADOS NO MOMENTO")
- `/checkout` — passos: Retirada/Entrega → se entrega: seletor de bairros (cards com preço) + ViaCEP autopreenche rua/cidade/UF → CPF opcional com máscara/validação → pagamento (Cartão na entrega ou PIX com QR + chave copiável)
- `/sucesso/$orderId` — resumo + botão "Enviar pedido via WhatsApp" (gera mensagem formatada e abre `https://wa.me/{telefone_loja}?text=...`)

## 4. Painel Admin `/admin/*`

Protegido por `_authenticated` + check de role admin:
- `/admin/pedidos` — Kanban com 4 colunas (drag entre status), card mostra nº, cliente, total, tipo
  - Botão "Imprimir Cupom" → nova janela com CSS @page 80mm (cupom térmico)
  - Botão "Imprimir A4" → layout de relatório com cabeçalho da loja
- `/admin/produtos` — tabela CRUD, modal com upload (Supabase Storage), edição de tamanhos e adicionais (jsonb editor)
- `/admin/categorias` — CRUD simples
- `/admin/bairros` — CRUD de bairros + taxas, garantir linha "Outros Bairros"
- `/admin/configuracoes` — formulário com:
  - Busca CNPJ (BrasilAPI `/cnpj/v1/{cnpj}`) para autopreencher dados
  - Horários por dia da semana
  - Chave PIX + upload de QR Code

## 5. Requisitos Técnicos

- shadcn/ui em todos os componentes (Dialog, Sheet, Tabs, Card, Badge, Form, Input, Select, RadioGroup, Checkbox)
- Validação com zod (CPF, CNPJ, telefone, CEP)
- TanStack Query + server functions com `requireSupabaseAuth` para operações sensíveis
- Persistência: carrinho recarrega do Supabase no boot quando autenticado; estado local até login
- Mobile-first: bottom nav no cliente (Home/Carrinho/Conta), sidebar no admin
- Lucide para ícones; design system definido em `src/styles.css` com tokens semânticos (paleta quente — laranja/vermelho food)

## Ordem de Build

1. Ativar Lovable Cloud + migrations (tabelas, RLS, trigger, bucket, seed admin role)
2. Design system (tokens, tema food)
3. Auth (email + whatsapp)
4. Estrutura de rotas + layout cliente/admin
5. CRUDs admin (categorias, produtos, bairros, config)
6. Storefront (home, produto, carrinho persistente)
7. Checkout (ViaCEP, CPF, PIX, criação de pedido)
8. Painel de pedidos (Kanban + impressão)
9. Sucesso + integração WhatsApp
10. Polimento e QA

## Pergunta antes de começar

Para o primeiro acesso admin: criar manualmente o usuário admin via SQL após o primeiro signup, ou prefere que eu hardcode um e-mail específico que vira admin automaticamente no trigger? Diga o e-mail se for o caso.
