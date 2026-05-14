
-- =========================================================
-- 1. Server-side price recalculation for orders (INPUT_VALIDATION)
-- =========================================================
CREATE OR REPLACE FUNCTION public.recalculate_order_pricing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

    -- Size delta: must match a size in the catalog
    IF itm ? 'size' AND itm->'size' IS NOT NULL AND jsonb_typeof(itm->'size') = 'object' THEN
      size_label := itm->'size'->>'label';
      matched_size := NULL;
      SELECT s INTO matched_size
        FROM jsonb_array_elements(prod.sizes) s
        WHERE s->>'label' = size_label
        LIMIT 1;
      IF matched_size IS NULL THEN
        RAISE EXCEPTION 'Invalid size % for product %', size_label, prod.nome;
      END IF;
      size_delta := COALESCE((matched_size->>'price_delta')::numeric, 0);
      unit_price := unit_price + size_delta;
    END IF;

    -- Addons: each must exist in catalog
    IF itm ? 'addons' AND jsonb_typeof(itm->'addons') = 'array' THEN
      FOR addon IN SELECT * FROM jsonb_array_elements(itm->'addons')
      LOOP
        addon_name := addon->>'nome';
        matched_addon := NULL;
        SELECT a INTO matched_addon
          FROM jsonb_array_elements(prod.addons) a
          WHERE a->>'nome' = addon_name
          LIMIT 1;
        IF matched_addon IS NULL THEN
          RAISE EXCEPTION 'Invalid addon % for product %', addon_name, prod.nome;
        END IF;
        addon_price := COALESCE((matched_addon->>'preco')::numeric, 0);
        unit_price := unit_price + addon_price;
      END LOOP;
    END IF;

    -- Rebuild item with server-computed price
    new_items := new_items || jsonb_build_array(
      jsonb_set(itm, '{preco_unit}', to_jsonb(unit_price))
    );

    computed_subtotal := computed_subtotal + (unit_price * qty);
  END LOOP;

  -- Taxa de entrega from neighborhood catalog
  IF NEW.tipo = 'entrega' THEN
    IF NEW.bairro_id IS NULL THEN
      RAISE EXCEPTION 'Delivery requires a neighborhood';
    END IF;
    SELECT id, nome, taxa, ativo INTO bairro_rec
      FROM public.neighborhood_delivery
      WHERE id = NEW.bairro_id;
    IF NOT FOUND OR NOT bairro_rec.ativo THEN
      RAISE EXCEPTION 'Invalid neighborhood';
    END IF;
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

  -- Force safe defaults on insert
  NEW.status := 'pendente';
  NEW.payment_proof_path := NULL;
  NEW.payment_proof_uploaded_at := NULL;
  NEW.approved_at := NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalculate_order_pricing ON public.orders;
CREATE TRIGGER trg_recalculate_order_pricing
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_order_pricing();

-- =========================================================
-- 2. Restrict order UPDATE columns for non-admins (self-approve fix)
-- =========================================================
DROP POLICY IF EXISTS "Users update own order proof" ON public.orders;

CREATE OR REPLACE FUNCTION public.guard_order_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins may update anything
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Non-admin owners may only update payment proof fields
  IF auth.uid() = OLD.user_id THEN
    IF NEW.status        IS DISTINCT FROM OLD.status        OR
       NEW.total         IS DISTINCT FROM OLD.total         OR
       NEW.subtotal      IS DISTINCT FROM OLD.subtotal      OR
       NEW.taxa_entrega  IS DISTINCT FROM OLD.taxa_entrega  OR
       NEW.items         IS DISTINCT FROM OLD.items         OR
       NEW.pagamento     IS DISTINCT FROM OLD.pagamento     OR
       NEW.tipo          IS DISTINCT FROM OLD.tipo          OR
       NEW.bairro_id     IS DISTINCT FROM OLD.bairro_id     OR
       NEW.bairro_nome   IS DISTINCT FROM OLD.bairro_nome   OR
       NEW.endereco      IS DISTINCT FROM OLD.endereco      OR
       NEW.cliente_nome  IS DISTINCT FROM OLD.cliente_nome  OR
       NEW.cliente_whatsapp IS DISTINCT FROM OLD.cliente_whatsapp OR
       NEW.cpf_nota      IS DISTINCT FROM OLD.cpf_nota      OR
       NEW.user_id       IS DISTINCT FROM OLD.user_id       OR
       NEW.numero        IS DISTINCT FROM OLD.numero        OR
       NEW.approved_at   IS DISTINCT FROM OLD.approved_at
    THEN
      RAISE EXCEPTION 'You may only update payment proof fields on your order';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Not authorized to update this order';
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_order_update ON public.orders;
CREATE TRIGGER trg_guard_order_update
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.guard_order_update();

CREATE POLICY "Users update own order proof fields"
ON public.orders
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- 3. store_config: hide sensitive fields from public
-- =========================================================
DROP POLICY IF EXISTS "Public read store config" ON public.store_config;

CREATE POLICY "Admins read full store config"
ON public.store_config
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Public-safe view (no CNPJ, no PIX key, no private internal fields)
CREATE OR REPLACE VIEW public.store_config_public
WITH (security_invoker = true)
AS
SELECT
  id,
  nome,
  horarios,
  cidade,
  bairro,
  uf,
  rua,
  numero,
  complemento,
  cep,
  endereco,
  telefone,
  whatsapp,
  pix_qr_url,
  updated_at
FROM public.store_config;

GRANT SELECT ON public.store_config_public TO anon, authenticated;

-- Allow public read of pix_key and merchant identity ONLY in the order context
-- via a SECURITY DEFINER function that returns the data needed to generate PIX
-- for an order owned by the caller.
CREATE OR REPLACE FUNCTION public.get_pix_payment_info(_order_id uuid)
RETURNS TABLE(pix_key text, merchant_name text, merchant_city text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = _order_id
      AND (o.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT s.pix_key, s.nome, s.cidade
  FROM public.store_config s
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_pix_payment_info(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pix_payment_info(uuid) TO authenticated;

-- =========================================================
-- 4. Lock down internal SECURITY DEFINER functions
-- =========================================================
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_old_payment_proofs() FROM PUBLIC, anon, authenticated;

-- has_role must remain executable (used by RLS via auth.uid())
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;

-- =========================================================
-- 5. Pin search_path on functions missing it
-- =========================================================
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;

-- =========================================================
-- 6. Realtime: restrict subscriptions to admins
-- (orders/cart_items realtime is only used by the admin panel)
-- =========================================================
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can subscribe to realtime" ON realtime.messages;
CREATE POLICY "Admins can subscribe to realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
