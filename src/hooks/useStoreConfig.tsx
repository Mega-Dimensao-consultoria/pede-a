import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useStoreConfig() {
  const q = useQuery({
    queryKey: ["store_config_public_row"],
    queryFn: async () => {
      const { data, error } = await supabase.from("store_config_public").select("*").limit(1);
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] ?? null : (data as any);
      return row;
    },
    staleTime: 60_000,
  });
  return {
    store: q.data,
    modoComanda: !!(q.data as any)?.modo_comanda,
    isLoading: q.isLoading,
  };
}