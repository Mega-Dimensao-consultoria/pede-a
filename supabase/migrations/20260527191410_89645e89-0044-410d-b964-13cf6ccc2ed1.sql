
-- Guest carts table for non-registered users to keep items + receive recovery emails
CREATE TABLE public.guest_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  email text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active', -- active | recovered | abandoned
  recovery_sent_count integer NOT NULL DEFAULT 0,
  last_email_sent_at timestamptz,
  recovered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX guest_carts_token_idx ON public.guest_carts(token);
CREATE INDEX guest_carts_status_updated_idx ON public.guest_carts(status, updated_at);
CREATE INDEX guest_carts_email_idx ON public.guest_carts(lower(email));

-- Grants: anon + authenticated can call select/insert/update via RLS (filtered by token)
GRANT SELECT, INSERT, UPDATE ON public.guest_carts TO anon, authenticated;
GRANT ALL ON public.guest_carts TO service_role;

ALTER TABLE public.guest_carts ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a new guest cart (they only have their own token)
CREATE POLICY "Anyone can create guest cart"
ON public.guest_carts FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Public update/select must be scoped via token (the secret). Since RLS can't read
-- request params directly, we expose a SECURITY DEFINER function for client use.
-- For SELECT we restrict to service role only (clients use the RPC below).
CREATE POLICY "Service role full read"
ON public.guest_carts FOR SELECT
TO service_role
USING (true);

-- updated_at trigger
CREATE TRIGGER guest_carts_set_updated_at
BEFORE UPDATE ON public.guest_carts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RPCs for guest cart access by token (the token is the secret)
CREATE OR REPLACE FUNCTION public.guest_cart_upsert(
  _token uuid,
  _email text,
  _items jsonb,
  _subtotal numeric
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _email IS NULL OR length(trim(_email)) < 3 OR position('@' in _email) = 0 THEN
    RAISE EXCEPTION 'invalid email';
  END IF;

  INSERT INTO public.guest_carts (token, email, items, subtotal, status)
  VALUES (_token, lower(trim(_email)), COALESCE(_items, '[]'::jsonb), COALESCE(_subtotal, 0), 'active')
  ON CONFLICT (token) DO UPDATE
    SET email = EXCLUDED.email,
        items = EXCLUDED.items,
        subtotal = EXCLUDED.subtotal,
        status = CASE WHEN public.guest_carts.status = 'recovered' THEN 'recovered' ELSE 'active' END,
        updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.guest_cart_upsert(uuid, text, jsonb, numeric) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.guest_cart_get(_token uuid)
RETURNS TABLE(email text, items jsonb, subtotal numeric, status text)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT g.email, g.items, g.subtotal, g.status
  FROM public.guest_carts g
  WHERE g.token = _token
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.guest_cart_get(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.guest_cart_mark_recovered(_token uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.guest_carts
    SET status = 'recovered', recovered_at = now(), updated_at = now()
    WHERE token = _token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.guest_cart_mark_recovered(uuid) TO anon, authenticated;
