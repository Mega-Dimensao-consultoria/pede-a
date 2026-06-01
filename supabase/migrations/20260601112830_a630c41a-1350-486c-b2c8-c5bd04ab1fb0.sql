DROP VIEW IF EXISTS public.store_config_public;

CREATE VIEW public.store_config_public
WITH (security_invoker = false) AS
SELECT
  id, nome, horarios, cidade, bairro, uf, rua, numero, complemento, cep,
  endereco, telefone, whatsapp, pix_qr_url, modo_comanda, updated_at
FROM public.store_config;

GRANT SELECT ON public.store_config_public TO anon, authenticated;