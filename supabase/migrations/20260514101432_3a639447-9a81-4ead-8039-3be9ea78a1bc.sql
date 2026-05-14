
-- Add 'aprovado' status
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'aprovado' BEFORE 'preparando';

-- Add payment proof columns
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_proof_path text,
  ADD COLUMN IF NOT EXISTS payment_proof_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_proof_deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- Storage bucket for payment proofs (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for payment-proofs bucket
DROP POLICY IF EXISTS "Users upload own payment proofs" ON storage.objects;
CREATE POLICY "Users upload own payment proofs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users read own payment proofs" ON storage.objects;
CREATE POLICY "Users read own payment proofs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
  )
);

DROP POLICY IF EXISTS "Users delete own payment proofs" ON storage.objects;
CREATE POLICY "Admins delete payment proofs"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow user to update own order to attach proof path
DROP POLICY IF EXISTS "Users update own order proof" ON public.orders;
CREATE POLICY "Users update own order proof"
ON public.orders FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Auto set approved_at when status becomes 'aprovado'
CREATE OR REPLACE FUNCTION public.set_order_approved_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'aprovado' AND (OLD.status IS DISTINCT FROM 'aprovado') THEN
    NEW.approved_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_order_approved_at ON public.orders;
CREATE TRIGGER trg_set_order_approved_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_order_approved_at();

-- Cron cleanup: remove proofs of approved orders older than 30 days
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.cleanup_old_payment_proofs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT id, payment_proof_path FROM public.orders
    WHERE status = 'aprovado'
      AND payment_proof_path IS NOT NULL
      AND approved_at IS NOT NULL
      AND approved_at < now() - interval '30 days'
  LOOP
    DELETE FROM storage.objects
      WHERE bucket_id = 'payment-proofs' AND name = r.payment_proof_path;
    UPDATE public.orders
      SET payment_proof_path = NULL, payment_proof_deleted_at = now()
      WHERE id = r.id;
  END LOOP;
END;
$$;

SELECT cron.unschedule('cleanup-payment-proofs')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-payment-proofs');

SELECT cron.schedule(
  'cleanup-payment-proofs',
  '0 3 * * *',
  $$ SELECT public.cleanup_old_payment_proofs(); $$
);
