
-- 1. Extend public order status with payment fields (no PII)
DROP FUNCTION IF EXISTS public.get_order_public_status(integer);
CREATE FUNCTION public.get_order_public_status(_numero integer)
RETURNS TABLE(
  id uuid, numero integer, status text, tipo text, mesa text,
  pagamento text, total numeric, payment_proof_path text,
  user_id uuid, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT o.id, o.numero, o.status::text, o.tipo::text, o.mesa,
         o.pagamento::text, o.total, o.payment_proof_path,
         o.user_id, o.created_at
  FROM public.orders o
  WHERE o.numero = _numero
  ORDER BY o.created_at DESC LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_order_public_status(integer) TO anon, authenticated;

-- 2. Allow PIX info lookup for comanda (guest) orders
CREATE OR REPLACE FUNCTION public.get_pix_payment_info(_order_id uuid)
RETURNS TABLE(pix_key text, merchant_name text, merchant_city text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = _order_id
      AND (o.user_id = auth.uid()
           OR public.has_role(auth.uid(), 'admin')
           OR o.user_id IS NULL)
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY SELECT s.pix_key, s.nome, s.cidade FROM public.store_config s LIMIT 1;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_pix_payment_info(uuid) TO anon, authenticated;

-- 3. RPC for comanda guest to attach a payment proof
CREATE OR REPLACE FUNCTION public.comanda_attach_payment_proof(_order_id uuid, _path text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF _path IS NULL OR length(trim(_path)) = 0 THEN
    RAISE EXCEPTION 'Path is required';
  END IF;
  UPDATE public.orders
    SET payment_proof_path = _path,
        payment_proof_uploaded_at = now()
    WHERE id = _order_id AND user_id IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or not a comanda order';
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.comanda_attach_payment_proof(uuid, text) TO anon, authenticated;

-- 4. Relax the order update guard so the comanda RPC above can write the proof
CREATE OR REPLACE FUNCTION public.guard_order_update()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  -- Admins may update anything
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Comanda guest orders: only payment proof fields may be touched
  IF OLD.user_id IS NULL THEN
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
      RAISE EXCEPTION 'Only payment proof fields may be updated on comanda orders';
    END IF;
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

-- 5. Storage: allow anon upload of comanda payment proofs under guest/ folder
DROP POLICY IF EXISTS "comanda guest upload payment-proofs" ON storage.objects;
CREATE POLICY "comanda guest upload payment-proofs"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1] = 'guest'
);
