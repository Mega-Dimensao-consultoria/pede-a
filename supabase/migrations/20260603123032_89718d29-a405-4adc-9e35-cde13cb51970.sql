
-- 1) Replace SECURITY DEFINER view with a SECURITY DEFINER function exposing only safe columns
DROP VIEW IF EXISTS public.store_config_public;

CREATE OR REPLACE FUNCTION public.get_store_public()
RETURNS TABLE (
  id uuid,
  nome text,
  horarios jsonb,
  cidade text,
  bairro text,
  uf text,
  rua text,
  numero text,
  complemento text,
  cep text,
  endereco text,
  telefone text,
  whatsapp text,
  pix_qr_url text,
  modo_comanda boolean,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, nome, horarios, cidade, bairro, uf, rua, numero, complemento, cep,
         endereco, telefone, whatsapp, pix_qr_url, modo_comanda, updated_at
  FROM public.store_config
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_store_public() TO anon, authenticated;

-- 2) Remove permissive INSERT on guest_carts. Inserts must go through guest_cart_upsert (SECURITY DEFINER, validates email).
DROP POLICY IF EXISTS "Anyone can create guest cart" ON public.guest_carts;
