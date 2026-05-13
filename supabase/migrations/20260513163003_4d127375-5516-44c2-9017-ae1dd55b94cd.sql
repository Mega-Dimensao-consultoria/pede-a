
CREATE TABLE public.user_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  rotulo TEXT,
  cep TEXT,
  rua TEXT NOT NULL,
  numero TEXT NOT NULL,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  referencia TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own addresses"
ON public.user_addresses
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_user_addresses_updated_at
BEFORE UPDATE ON public.user_addresses
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
