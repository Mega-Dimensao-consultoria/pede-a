import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/site-shell";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { fmtBRL } from "@/lib/format";
import { Trash2, Minus, Plus, ShoppingBag, AlertCircle } from "lucide-react";
import { isStoreOpen, type Horarios } from "@/lib/store-status";

export const Route = createFileRoute("/carrinho")({
  component: CartPage,
});

function CartPage() {
  const { items, subtotal, updateQty, remove } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: store } = useQuery<any>({
    queryKey: ["store_config"],
    queryFn: async () => (await supabase.from("store_config_public").select("*").maybeSingle()).data,
  });
  const open = isStoreOpen((store?.horarios as Horarios) || null);

  if (!user) {
    return (
      <SiteShell>
        <div className="max-w-2xl mx-auto p-8 text-center space-y-4">
          <ShoppingBag className="h-14 w-14 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-semibold">Faça login para ver seu cesto</h2>
          <Link to="/auth"><Button>Entrar / Cadastrar</Button></Link>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <header className="bg-card border-b px-4 py-4">
        <div className="max-w-2xl mx-auto"><h1 className="text-xl font-bold">Meu Cesto</h1></div>
      </header>
      {!open && (
        <div className="bg-destructive text-destructive-foreground px-4 py-3 sticky top-0 z-30">
          <div className="max-w-2xl mx-auto flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <div className="font-semibold text-sm">ESTAMOS FECHADOS — pedido bloqueado</div>
          </div>
        </div>
      )}
      <div className="max-w-2xl mx-auto p-4 space-y-3">
        {items.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">Seu cesto está vazio.</div>
        )}
        {items.map((it) => (
          <div key={it.id} className="bg-card border rounded-xl p-3 flex gap-3">
            <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden shrink-0">
              {it.product?.imagem_url && <img src={it.product.imagem_url} className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{it.product?.nome}</div>
              {it.size && <div className="text-xs text-muted-foreground">Tamanho: {it.size.label}</div>}
              {it.addons.length > 0 && <div className="text-xs text-muted-foreground">+ {it.addons.map((a) => a.nome).join(", ")}</div>}
              {it.observacoes && <div className="text-xs italic text-muted-foreground">"{it.observacoes}"</div>}
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center border rounded-full">
                  <button onClick={() => updateQty(it.id, it.quantidade - 1)} className="p-1.5"><Minus className="h-3 w-3" /></button>
                  <span className="w-7 text-center text-sm font-semibold">{it.quantidade}</span>
                  <button onClick={() => updateQty(it.id, it.quantidade + 1)} className="p-1.5"><Plus className="h-3 w-3" /></button>
                </div>
                <div className="font-bold text-primary">{fmtBRL(it.preco_unit * it.quantidade)}</div>
              </div>
            </div>
            <button onClick={() => remove(it.id)} className="text-muted-foreground hover:text-destructive p-1">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      {items.length > 0 && (
        <div className="fixed bottom-16 inset-x-0 bg-card border-t p-4 z-30">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">Subtotal</div>
              <div className="text-xl font-bold">{fmtBRL(subtotal)}</div>
            </div>
            <Button size="lg" disabled={!open} onClick={() => navigate({ to: "/checkout" })}>
              {open ? "Finalizar pedido" : "Loja fechada"}
            </Button>
          </div>
        </div>
      )}
    </SiteShell>
  );
}