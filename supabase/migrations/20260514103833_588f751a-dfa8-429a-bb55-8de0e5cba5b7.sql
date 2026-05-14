
REVOKE ALL ON FUNCTION public.guard_order_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recalculate_order_pricing() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_pix_payment_info(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_pix_payment_info(uuid) TO authenticated;
