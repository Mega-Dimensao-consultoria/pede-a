import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type CartSize = { label: string; price_delta: number } | null;
export type CartAddon = { nome: string; preco: number };

export type CartItem = {
  id: string;
  user_id: string;
  product_id: string;
  size: CartSize;
  addons: CartAddon[];
  quantidade: number;
  observacoes: string | null;
  preco_unit: number;
  product?: { nome: string; imagem_url: string | null };
};

type CartCtx = {
  items: CartItem[];
  loading: boolean;
  count: number;
  subtotal: number;
  add: (input: Omit<CartItem, "id" | "user_id" | "product">) => Promise<void>;
  updateQty: (id: string, qty: number) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
  reload: () => Promise<void>;
};

const Ctx = createContext<CartCtx | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("cart_items")
      .select("*, product:products(nome, imagem_url)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    if (!error) setItems((data as any) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  const add: CartCtx["add"] = async (input) => {
    if (!user) throw new Error("not_authenticated");
    const { error } = await supabase.from("cart_items").insert({
      user_id: user.id,
      product_id: input.product_id,
      size: input.size,
      addons: input.addons,
      quantidade: input.quantidade,
      observacoes: input.observacoes,
      preco_unit: input.preco_unit,
    });
    if (error) throw error;
    await reload();
  };

  const updateQty = async (id: string, qty: number) => {
    if (qty < 1) return remove(id);
    await supabase.from("cart_items").update({ quantidade: qty }).eq("id", id);
    await reload();
  };

  const remove = async (id: string) => {
    await supabase.from("cart_items").delete().eq("id", id);
    await reload();
  };

  const clear = async () => {
    if (!user) return;
    await supabase.from("cart_items").delete().eq("user_id", user.id);
    setItems([]);
  };

  const count = items.reduce((s, i) => s + i.quantidade, 0);
  const subtotal = items.reduce((s, i) => s + i.preco_unit * i.quantidade, 0);

  return (
    <Ctx.Provider value={{ items, loading, count, subtotal, add, updateQty, remove, clear, reload }}>
      {children}
    </Ctx.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be inside CartProvider");
  return ctx;
};