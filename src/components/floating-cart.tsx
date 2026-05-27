import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, Minus, Plus, Trash2, X } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { AuthModal } from "@/components/auth-modal";
import { supabase } from "@/integrations/supabase/client";
import { isStoreOpen, type Horarios } from "@/lib/store-status";
import { Button } from "@/components/ui/button";
import { fmtBRL } from "@/lib/format";

export function FloatingCart() {
  const { items, count, subtotal, updateQty, remove } = useCart();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const navigate = useNavigate();

  const { data: store } = useQuery<any>({
    queryKey: ["store_config"],
    queryFn: async () => (await supabase.from("store_config_public").select("*").maybeSingle()).data,
  });
  const storeOpen = isStoreOpen((store?.horarios as Horarios) || null);

  if (count === 0) return null;

  const goCheckout = () => {
    setOpen(false);
    if (!user) {
      setAuthOpen(true);
      return;
    }
    navigate({ to: "/checkout" });
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir cesto"
        className="fixed bottom-24 right-4 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform animate-scale-in"
      >
        <ShoppingBag className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold flex items-center justify-center shadow">
          {count}
        </span>
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-foreground/30 animate-fade-in"
          />
          <div className="fixed bottom-20 right-4 left-4 sm:left-auto sm:w-96 z-50 bg-card rounded-2xl shadow-2xl border overflow-hidden animate-scale-in origin-bottom-right">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="font-semibold flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Meu cesto ({count})
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground p-1">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y">
              {items.map((it) => (
                <div key={it.id} className="flex gap-3 p-3">
                  <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden shrink-0">
                    {it.product?.imagem_url && (
                      <img src={it.product.imagem_url} alt={it.product.nome} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{it.product?.nome}</div>
                    {it.size && <div className="text-[11px] text-muted-foreground">{it.size.label}</div>}
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center border rounded-full">
                        <button onClick={() => updateQty(it.id, it.quantidade - 1)} className="p-1"><Minus className="h-3 w-3" /></button>
                        <span className="w-6 text-center text-xs font-semibold">{it.quantidade}</span>
                        <button onClick={() => updateQty(it.id, it.quantidade + 1)} className="p-1"><Plus className="h-3 w-3" /></button>
                      </div>
                      <div className="text-sm font-bold text-primary">{fmtBRL(it.preco_unit * it.quantidade)}</div>
                    </div>
                  </div>
                  <button onClick={() => remove(it.id)} className="text-muted-foreground hover:text-destructive self-start p-1">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="p-3 border-t bg-muted/40 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-bold text-base">{fmtBRL(subtotal)}</span>
              </div>
              <Button onClick={goCheckout} disabled={!storeOpen} className="w-full" size="lg">
                {storeOpen ? "Finalizar compra" : "Loja fechada"}
              </Button>
            </div>
          </div>
        </>
      )}
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} allowGuest={false} onSuccess={() => navigate({ to: "/checkout" })} />
    </>
  );
}