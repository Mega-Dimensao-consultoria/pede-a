
-- 1) Realtime: restrict subscriptions to admins only.
-- Add a RESTRICTIVE policy so the permissive "Admins can subscribe to realtime" policy
-- becomes effectively admin-only (non-admin authenticated users cannot subscribe).
DROP POLICY IF EXISTS "Only admins may subscribe to realtime" ON realtime.messages;
CREATE POLICY "Only admins may subscribe to realtime"
ON realtime.messages
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2) Tighten guest payment-proof uploads.
-- Helper: validate that a guest upload path matches an existing pending comanda order.
CREATE OR REPLACE FUNCTION public.guest_payment_proof_path_ok(_path text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _segments text[];
  _filename text;
  _order_id uuid;
BEGIN
  IF _path IS NULL THEN RETURN false; END IF;
  _segments := string_to_array(_path, '/');
  IF array_length(_segments, 1) <> 2 THEN RETURN false; END IF;
  IF _segments[1] <> 'guest' THEN RETURN false; END IF;
  _filename := _segments[2];
  -- Filename shape: "<order-uuid>-<timestamp>.<ext>"
  BEGIN
    _order_id := substring(_filename from '^([0-9a-fA-F-]{36})')::uuid;
  EXCEPTION WHEN others THEN
    RETURN false;
  END;
  IF _order_id IS NULL THEN RETURN false; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = _order_id
      AND user_id IS NULL
      AND status = 'pendente'
      AND created_at > now() - interval '24 hours'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.guest_payment_proof_path_ok(text) FROM public;
GRANT EXECUTE ON FUNCTION public.guest_payment_proof_path_ok(text) TO anon, authenticated;

-- Replace the unscoped policy with a scoped, validated one (with MIME + size checks)
DROP POLICY IF EXISTS "comanda guest upload payment-proofs" ON storage.objects;
CREATE POLICY "comanda guest upload payment-proofs"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1] = 'guest'
  AND public.guest_payment_proof_path_ok(name)
  AND COALESCE((metadata->>'size')::bigint, 0) <= 8 * 1024 * 1024
  AND COALESCE(metadata->>'mimetype', '') IN ('image/png','image/jpeg','image/jpg','image/webp','image/heic','application/pdf')
);
