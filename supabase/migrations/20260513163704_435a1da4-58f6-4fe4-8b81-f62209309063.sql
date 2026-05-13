-- Unique partial index: only one default per user
CREATE UNIQUE INDEX IF NOT EXISTS user_addresses_one_default_per_user
ON public.user_addresses (user_id)
WHERE is_default = true;

-- Trigger function: when inserting/updating an address as default, unset others
CREATE OR REPLACE FUNCTION public.ensure_single_default_address()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE public.user_addresses
    SET is_default = false, updated_at = now()
    WHERE user_id = NEW.user_id
      AND id <> NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_single_default_address ON public.user_addresses;
CREATE TRIGGER trg_ensure_single_default_address
BEFORE INSERT OR UPDATE OF is_default ON public.user_addresses
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_default_address();