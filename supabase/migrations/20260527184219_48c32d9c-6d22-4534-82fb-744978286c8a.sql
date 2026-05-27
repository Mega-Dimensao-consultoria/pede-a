
-- 1) Tighten orders UPDATE policy: only allow when non-proof fields are unchanged
DROP POLICY IF EXISTS "Users update own order proof fields" ON public.orders;

CREATE POLICY "Users update own order proof fields"
ON public.orders
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND status            = (SELECT o.status            FROM public.orders o WHERE o.id = orders.id)
  AND total             = (SELECT o.total             FROM public.orders o WHERE o.id = orders.id)
  AND subtotal          = (SELECT o.subtotal          FROM public.orders o WHERE o.id = orders.id)
  AND taxa_entrega      = (SELECT o.taxa_entrega      FROM public.orders o WHERE o.id = orders.id)
  AND items             = (SELECT o.items             FROM public.orders o WHERE o.id = orders.id)
  AND pagamento         = (SELECT o.pagamento         FROM public.orders o WHERE o.id = orders.id)
  AND tipo              = (SELECT o.tipo              FROM public.orders o WHERE o.id = orders.id)
  AND user_id           = (SELECT o.user_id           FROM public.orders o WHERE o.id = orders.id)
  AND numero            = (SELECT o.numero            FROM public.orders o WHERE o.id = orders.id)
  AND COALESCE(bairro_id::text,'')    = COALESCE((SELECT o.bairro_id::text    FROM public.orders o WHERE o.id = orders.id),'')
  AND COALESCE(bairro_nome,'')        = COALESCE((SELECT o.bairro_nome        FROM public.orders o WHERE o.id = orders.id),'')
  AND COALESCE(endereco::text,'')     = COALESCE((SELECT o.endereco::text     FROM public.orders o WHERE o.id = orders.id),'')
  AND COALESCE(cliente_nome,'')       = COALESCE((SELECT o.cliente_nome       FROM public.orders o WHERE o.id = orders.id),'')
  AND COALESCE(cliente_whatsapp,'')   = COALESCE((SELECT o.cliente_whatsapp   FROM public.orders o WHERE o.id = orders.id),'')
  AND COALESCE(cpf_nota,'')           = COALESCE((SELECT o.cpf_nota           FROM public.orders o WHERE o.id = orders.id),'')
  AND COALESCE(approved_at::text,'')  = COALESCE((SELECT o.approved_at::text  FROM public.orders o WHERE o.id = orders.id),'')
);

-- 2) Storage policies for payment-proofs: restrict UPDATE and allow DELETE in own folder
DROP POLICY IF EXISTS "Users update own payment proofs" ON storage.objects;
CREATE POLICY "Users update own payment proofs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users delete own payment proofs" ON storage.objects;
CREATE POLICY "Users delete own payment proofs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
