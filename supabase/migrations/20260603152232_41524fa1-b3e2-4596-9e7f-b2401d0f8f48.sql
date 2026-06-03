
-- Add 'viagem' to order_type enum
ALTER TYPE public.order_type ADD VALUE IF NOT EXISTS 'viagem';

-- Update pricing trigger: comanda orders (user_id null) can use 'entrega' without bairro_id (free delivery)
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

  IF NEW.tipo = 'entrega' THEN
    IF NEW.bairro_id IS NULL THEN
      IF NEW.user_id IS NULL THEN
        -- Comanda delivery: free, no bairro required (address captured in endereco)
        computed_taxa := 0;
        NEW.bairro_nome := NULL;
      ELSE
        RAISE EXCEPTION 'Delivery requires a neighborhood';
      END IF;
    ELSE
      SELECT id, nome, taxa, ativo INTO bairro_rec FROM public.neighborhood_delivery WHERE id = NEW.bairro_id;
      IF NOT FOUND OR NOT bairro_rec.ativo THEN RAISE EXCEPTION 'Invalid neighborhood'; END IF;
      computed_taxa := bairro_rec.taxa;
      NEW.bairro_nome := bairro_rec.nome;
    END IF;
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

-- Recreate create_comanda_order to accept endereco and support viagem/entrega/consumo_local
DROP FUNCTION IF EXISTS public.create_comanda_order(jsonb, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.create_comanda_order(
  _items jsonb,
  _cliente_nome text,
  _mesa text,
  _tipo text,
  _pagamento text,
  _cpf text DEFAULT NULL,
  _whatsapp text DEFAULT NULL,
  _endereco jsonb DEFAULT NULL
)
 RETURNS TABLE(id uuid, numero integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  IF _tipo NOT IN ('consumo_local', 'viagem', 'entrega') THEN
    RAISE EXCEPTION 'Tipo inválido';
  END IF;
  IF _tipo = 'consumo_local' AND (_mesa IS NULL OR length(trim(_mesa)) = 0) THEN
    RAISE EXCEPTION 'Número da mesa é obrigatório para consumo no local';
  END IF;
  IF _tipo = 'entrega' THEN
    IF _endereco IS NULL
       OR COALESCE(_endereco->>'rua','') = ''
       OR COALESCE(_endereco->>'numero','') = '' THEN
      RAISE EXCEPTION 'Endereço (rua e número) é obrigatório para delivery';
    END IF;
  END IF;

  INSERT INTO public.orders (
    user_id, cliente_nome, cliente_whatsapp, mesa,
    items, subtotal, taxa_entrega, total,
    tipo, pagamento, cpf_nota, endereco
  ) VALUES (
    NULL,
    trim(_cliente_nome),
    NULLIF(trim(COALESCE(_whatsapp,'')), ''),
    NULLIF(trim(COALESCE(_mesa,'')), ''),
    _items,
    0, 0, 0,
    _tipo::public.order_type,
    _pagamento::public.payment_method,
    NULLIF(regexp_replace(COALESCE(_cpf,''), '\D', '', 'g'), ''),
    CASE WHEN _tipo = 'entrega' THEN _endereco ELSE NULL END
  )
  RETURNING orders.id, orders.numero INTO _new_id, _numero;

  RETURN QUERY SELECT _new_id, _numero;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_comanda_order(jsonb, text, text, text, text, text, text, jsonb) TO anon, authenticated;
