import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useStoreConfig() {
  const q = useQuery({
    queryKey: ["store_config"],
    queryFn: async () => (await supabase.from("store_config_public").select("*").maybeSingle()).data,
    staleTime: 60_000,
  });
  return {
    store: q.data,
    modoComanda: !!(q.data as any)?.modo_comanda,
    isLoading: q.isLoading,
  };
}