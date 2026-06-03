
DROP FUNCTION IF EXISTS public.get_order_public_status(integer);

CREATE FUNCTION public.get_order_public_status(_numero integer)
RETURNS TABLE(numero integer, status text, tipo text, mesa text, created_at timestamp with time zone)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT o.numero, o.status::text, o.tipo::text, o.mesa, o.created_at
  FROM public.orders o
  WHERE o.numero = _numero
  ORDER BY o.created_at DESC
  LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.get_order_public_status(integer) TO anon, authenticated;
