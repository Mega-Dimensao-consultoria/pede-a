
-- 1. Enum additions
ALTER TYPE public.order_type ADD VALUE IF NOT EXISTS 'consumo_local';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'pronto';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'pago';
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'dinheiro';
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'cartao_maquina';

-- 2. store_config flag
ALTER TABLE public.store_config
  ADD COLUMN IF NOT EXISTS modo_comanda boolean NOT NULL DEFAULT false;

-- 3. orders new cols + nullable user_id (para pedidos comanda sem login)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS mesa text,
  ADD COLUMN IF NOT EXISTS pagamento_registrado jsonb,
  ALTER COLUMN user_id DROP NOT NULL;

-- 4. Permitir leitura pública (apenas pelos campos não sensíveis) via RPC abaixo.
--    Aqui só ampliamos os GRANTs já existentes - SELECT já é coberto pelas RLS atuais.

-- 5. Atualizar trigger recalculate_order_pricing para aceitar consumo_local
CREATE OR REPLACE FUNCTION public.recalculate_order_pricing()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  itm jsonb;
  new_items jsonb := '[]'::jsonb;
  prod RECORD;
  size_label text;
  size_delta numeric;
  addon jsonb;
  addon_name text;
  addon_price numeric;
  matched_size jsonb;
  matched_addon jsonb;
  qty integer;
  unit_price numeric;
  computed_subtotal numeric := 0;
  computed_taxa numeric := 0;
  bairro_rec RECORD;
BEGIN
  IF NEW.items IS NULL OR jsonb_array_length(NEW.items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  FOR itm IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    qty := COALESCE((itm->>'quantidade')::int, 0);
    IF qty <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity in order item';
    END IF;

    SELECT id, nome, preco_base, sizes, addons, ativo
      INTO prod
      FROM public.products
      WHERE id = (itm->>'product_id')::uuid;

    IF NOT FOUND OR NOT prod.ativo THEN
      RAISE EXCEPTION 'Invalid or inactive product %', itm->>'product_id';
    END IF;

    unit_price := prod.preco_base;

    IF itm ? 'size' AND itm->'size' IS NOT NULL AND jsonb_typeof(itm->'size') = 'object' THEN
      size_label := itm->'size'->>'label';
      matched_size := NULL;
      SELECT s INTO matched_size FROM jsonb_array_elements(prod.sizes) s WHERE s->>'label' = size_label LIMIT 1;
      IF matched_size IS NULL THEN RAISE EXCEPTION 'Invalid size % for product %', size_label, prod.nome; END IF;
      size_delta := COALESCE((matched_size->>'price_delta')::numeric, 0);
      unit_price := unit_price + size_delta;
    END IF;

    IF itm ? 'addons' AND jsonb_typeof(itm->'addons') = 'array' THEN
      FOR addon IN SELECT * FROM jsonb_array_elements(itm->'addons')
      LOOP
        addon_name := addon->>'nome';
        matched_addon := NULL;
        SELECT a INTO matched_addon FROM jsonb_array_elements(prod.addons) a WHERE a->>'nome' = addon_name LIMIT 1;
        IF matched_addon IS NULL THEN RAISE EXCEPTION 'Invalid addon % for product %', addon_name, prod.nome; END IF;
        addon_price := COALESCE((matched_addon->>'preco')::numeric, 0);
        unit_price := unit_price + addon_price;
      END LOOP;
    END IF;

    new_items := new_items || jsonb_build_array(jsonb_set(itm, '{preco_unit}', to_jsonb(unit_price)));
    computed_subtotal := computed_subtotal + (unit_price * qty);
  END LOOP;

  -- Taxa de entrega aplicada SÓ no tipo 'entrega'
  IF NEW.tipo = 'entrega' THEN
    IF NEW.bairro_id IS NULL THEN RAISE EXCEPTION 'Delivery requires a neighborhood'; END IF;
    SELECT id, nome, taxa, ativo INTO bairro_rec FROM public.neighborhood_delivery WHERE id = NEW.bairro_id;
    IF NOT FOUND OR NOT bairro_rec.ativo THEN RAISE EXCEPTION 'Invalid neighborhood'; END IF;
    computed_taxa := bairro_rec.taxa;
    NEW.bairro_nome := bairro_rec.nome;
  ELSE
    computed_taxa := 0;
    NEW.bairro_id := NULL;
    NEW.bairro_nome := NULL;
  END IF;

  NEW.items := new_items;
  NEW.subtotal := computed_subtotal;
  NEW.taxa_entrega := computed_taxa;
  NEW.total := computed_subtotal + computed_taxa;

  NEW.status := 'pendente';
  NEW.payment_proof_path := NULL;
  NEW.payment_proof_uploaded_at := NULL;
  NEW.approved_at := NULL;

  RETURN NEW;
END;
$function$;

-- 6. RPC para criar pedido em modo comanda (SECURITY DEFINER, anon permitido)
CREATE OR REPLACE FUNCTION public.create_comanda_order(
  _items jsonb,
  _cliente_nome text,
  _mesa text,
  _tipo text,
  _pagamento text,
  _cpf text DEFAULT NULL,
  _whatsapp text DEFAULT NULL
) RETURNS TABLE(id uuid, numero integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _modo boolean;
  _new_id uuid;
  _numero integer;
BEGIN
  SELECT modo_comanda INTO _modo FROM public.store_config LIMIT 1;
  IF NOT COALESCE(_modo, false) THEN
    RAISE EXCEPTION 'Modo comanda não está ativo';
  END IF;

  IF _cliente_nome IS NULL OR length(trim(_cliente_nome)) < 2 THEN
    RAISE EXCEPTION 'Nome do cliente é obrigatório';
  END IF;
  IF _tipo NOT IN ('consumo_local', 'retirada', 'entrega') THEN
    RAISE EXCEPTION 'Tipo inválido';
  END IF;
  IF _tipo = 'consumo_local' AND (_mesa IS NULL OR length(trim(_mesa)) = 0) THEN
    RAISE EXCEPTION 'Número da mesa é obrigatório para consumo no local';
  END IF;

  INSERT INTO public.orders (
    user_id, cliente_nome, cliente_whatsapp, mesa,
    items, subtotal, taxa_entrega, total,
    tipo, pagamento, cpf_nota
  ) VALUES (
    NULL,
    trim(_cliente_nome),
    NULLIF(trim(COALESCE(_whatsapp,'')), ''),
    NULLIF(trim(COALESCE(_mesa,'')), ''),
    _items,
    0, 0, 0,
    _tipo::public.order_type,
    _pagamento::public.payment_method,
    NULLIF(regexp_replace(COALESCE(_cpf,''), '\D', '', 'g'), '')
  )
  RETURNING orders.id, orders.numero INTO _new_id, _numero;

  RETURN QUERY SELECT _new_id, _numero;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_comanda_order(jsonb, text, text, text, text, text, text) TO anon, authenticated;

-- 7. Permitir admin registrar pagamento
CREATE OR REPLACE FUNCTION public.register_order_payment(
  _order_id uuid,
  _valor numeric,
  _metodo text,
  _observacao text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem registrar pagamentos';
  END IF;
  UPDATE public.orders
    SET pagamento_registrado = jsonb_build_object(
          'valor', _valor,
          'metodo', _metodo,
          'observacao', _observacao,
          'registrado_por', auth.uid(),
          'registrado_em', now()
        ),
        status = 'pago',
        approved_at = COALESCE(approved_at, now())
    WHERE id = _order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_order_payment(uuid, numeric, text, text) TO authenticated;

-- 8. RPC pública para acompanhamento por número de pedido
CREATE OR REPLACE FUNCTION public.get_order_public_status(_numero integer)
RETURNS TABLE(numero integer, status text, tipo text, mesa text, cliente_nome text, total numeric, created_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.numero, o.status::text, o.tipo::text, o.mesa, o.cliente_nome, o.total, o.created_at
  FROM public.orders o
  WHERE o.numero = _numero
  ORDER BY o.created_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_order_public_status(integer) TO anon, authenticated;

-- 9. Ajustar guard_order_update para permitir admin alterar pagamento_registrado e mesa
--    (admin já tem bypass total, então sem mudança)

-- 10. Permitir INSERT anon em orders só via RPC (nada muda nas policies).
