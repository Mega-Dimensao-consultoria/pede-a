import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isStoreOpen, type Horarios } from "@/lib/store-status";

export function useStoreConfig() {
  const q = useQuery({
    queryKey: ["store_config_public_row"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_store_public" as any);
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] ?? null : (data as any);
      return row;
    },
    staleTime: 60_000,
  });
  return {
    store: q.data,
    modoComanda: !!(q.data as any)?.modo_comanda,
    storeOpen:
      !!(q.data as any)?.modo_comanda
        ? true
        : isStoreOpen(((q.data as any)?.horarios as Horarios) || null),
    isLoading: q.isLoading,
  };
}