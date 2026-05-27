import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";
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

export type CartAddInput = Omit<CartItem, "id" | "user_id" | "product"> & {
  product?: { nome: string; imagem_url: string | null };
};

type Guest = { token: string; email: string };

type CartCtx = {
  items: CartItem[];
  loading: boolean;
  count: number;
  subtotal: number;
  isGuest: boolean;
  guestEmail: string | null;
  setGuest: (email: string) => Promise<void>;
  add: (input: CartAddInput) => Promise<void>;
  updateQty: (id: string, qty: number) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
  reload: () => Promise<void>;
  hydrateFromItems: (items: CartItem[], email: string) => Promise<void>;
};

const Ctx = createContext<CartCtx | undefined>(undefined);

const LS_ITEMS = "pedeai.guest.items";
const LS_GUEST = "pedeai.guest";

function readGuest(): Guest | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(LS_GUEST) || "null"); } catch { return null; }
}
function writeGuest(g: Guest | null) {
  if (typeof window === "undefined") return;
  if (g) localStorage.setItem(LS_GUEST, JSON.stringify(g));
  else localStorage.removeItem(LS_GUEST);
}
function readLocalItems(): CartItem[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(LS_ITEMS) || "[]"); } catch { return []; }
}
function writeLocalItems(items: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_ITEMS, JSON.stringify(items));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [guest, setGuestState] = useState<Guest | null>(() => readGuest());
  const mergedRef = useRef(false);

  const isGuest = !user && !!guest;

  const syncGuestServer = useCallback(async (current: CartItem[], g: Guest) => {
    const subtotal = current.reduce((s, i) => s + i.preco_unit * i.quantidade, 0);
    try {
      await (supabase as any).rpc("guest_cart_upsert", {
        _token: g.token,
        _email: g.email,
        _items: current,
        _subtotal: subtotal,
      });
    } catch { /* offline tolerant */ }
  }, []);

  const reload = useCallback(async () => {
    if (user) {
      setLoading(true);
      const { data, error } = await supabase
        .from("cart_items")
        .select("*, product:products(nome, imagem_url)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (!error) setItems((data as any) ?? []);
      setLoading(false);
    } else {
      setItems(readLocalItems());
    }
  }, [user]);

  // Merge guest cart into user cart on login
  useEffect(() => {
    if (!user) { mergedRef.current = false; reload(); return; }
    if (mergedRef.current) return;
    mergedRef.current = true;
    (async () => {
      const local = readLocalItems();
      const g = readGuest();
      if (local.length > 0) {
        const rows = local.map((it) => ({
          user_id: user.id,
          product_id: it.product_id,
          size: it.size,
          addons: it.addons,
          quantidade: it.quantidade,
          observacoes: it.observacoes,
          preco_unit: it.preco_unit,
        }));
        await supabase.from("cart_items").insert(rows as any);
      }
      if (g) {
        try { await (supabase as any).rpc("guest_cart_mark_recovered", { _token: g.token }); } catch {}
      }
      writeLocalItems([]);
      writeGuest(null);
      setGuestState(null);
      await reload();
    })();
  }, [user, reload]);

  const setGuest = useCallback(async (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) throw new Error("E-mail inválido");
    let g = readGuest();
    if (!g) {
      g = { token: crypto.randomUUID(), email: trimmed };
    } else {
      g = { ...g, email: trimmed };
    }
    writeGuest(g);
    setGuestState(g);
    await syncGuestServer(readLocalItems(), g);
  }, [syncGuestServer]);

  const add: CartCtx["add"] = async (input) => {
    if (user) {
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
      return;
    }
    const g = readGuest();
    if (!g) throw new Error("guest_email_required");
    const newItem: CartItem = {
      id: crypto.randomUUID(),
      user_id: "guest",
      product_id: input.product_id,
      size: input.size,
      addons: input.addons,
      quantidade: input.quantidade,
      observacoes: input.observacoes,
      preco_unit: input.preco_unit,
      product: input.product,
    };
    const next = [...readLocalItems(), newItem];
    writeLocalItems(next);
    setItems(next);
    await syncGuestServer(next, g);
  };

  const updateQty = async (id: string, qty: number) => {
    if (qty < 1) return remove(id);
    if (user) {
      await supabase.from("cart_items").update({ quantidade: qty }).eq("id", id);
      await reload();
      return;
    }
    const g = readGuest();
    const next = readLocalItems().map((it) => (it.id === id ? { ...it, quantidade: qty } : it));
    writeLocalItems(next);
    setItems(next);
    if (g) await syncGuestServer(next, g);
  };

  const remove = async (id: string) => {
    if (user) {
      await supabase.from("cart_items").delete().eq("id", id);
      await reload();
      return;
    }
    const g = readGuest();
    const next = readLocalItems().filter((it) => it.id !== id);
    writeLocalItems(next);
    setItems(next);
    if (g) await syncGuestServer(next, g);
  };

  const clear = async () => {
    if (user) {
      await supabase.from("cart_items").delete().eq("user_id", user.id);
      setItems([]);
      return;
    }
    const g = readGuest();
    writeLocalItems([]);
    setItems([]);
    if (g) await syncGuestServer([], g);
  };

  const hydrateFromItems = async (newItems: CartItem[], email: string) => {
    writeLocalItems(newItems);
    setItems(newItems);
    let g = readGuest();
    if (!g) g = { token: crypto.randomUUID(), email };
    else g = { ...g, email };
    writeGuest(g);
    setGuestState(g);
    await syncGuestServer(newItems, g);
  };

  const count = items.reduce((s, i) => s + i.quantidade, 0);
  const subtotal = items.reduce((s, i) => s + i.preco_unit * i.quantidade, 0);

  return (
    <Ctx.Provider value={{
      items, loading, count, subtotal,
      isGuest, guestEmail: guest?.email ?? null,
      setGuest, add, updateQty, remove, clear, reload, hydrateFromItems,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be inside CartProvider");
  return ctx;
};