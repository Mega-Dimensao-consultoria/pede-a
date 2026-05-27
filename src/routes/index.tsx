import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/site-shell";
import { fmtBRL } from "@/lib/format";
import { isStoreOpen, type Horarios } from "@/lib/store-status";
import { Button } from "@/components/ui/button";
import { AlertCircle, UtensilsCrossed } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [catId, setCatId] = useState<string | null>(null);

  const { data: store } = useQuery({
    queryKey: ["store_config"],
    queryFn: async () => (await supabase.from("store_config_public").select("*").maybeSingle()).data,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () =>
      (await supabase.from("categories").select("*").eq("ativo", true).order("ordem")).data ?? [],
  });
  const { data: products = [] } = useQuery({
    queryKey: ["products", catId],
    queryFn: async () => {
      let q = supabase.from("products").select("*").eq("ativo", true);
      if (catId) q = q.eq("category_id", catId);
      return (await q.order("nome")).data ?? [];
    },
  });

  const open = isStoreOpen((store?.horarios as Horarios) || null);

  return (
    <SiteShell>
      <header className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground px-4 pt-8 pb-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <UtensilsCrossed className="h-6 w-6" />
            <h1 className="text-2xl font-bold">{store?.nome ?? "Pede Aí"}</h1>
          </div>
          <p className="text-sm opacity-90">Cardápio digital · peça pelo celular</p>
        </div>
      </header>

      {!open && (
        <div className="bg-destructive text-destructive-foreground px-4 py-4 sticky top-0 z-30 shadow-md">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <AlertCircle className="h-6 w-6 shrink-0" />
            <div>
              <div className="font-bold text-lg leading-tight">ESTAMOS FECHADOS NO MOMENTO</div>
              <div className="text-xs opacity-90">Você pode montar seu cesto, mas o pedido só será enviado quando reabrirmos.</div>
            </div>
          </div>
        </div>
      )}

      <section className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          <button
            onClick={() => setCatId(null)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition ${catId === null ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}
          >
            Todos
          </button>
          {categories.map((c: any) => (
            <button
              key={c.id}
              onClick={() => setCatId(c.id)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition ${catId === c.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}
            >
              {c.nome}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          {products.map((p: any) => (
            <Link
              key={p.id}
              to="/produto/$id"
              params={{ id: p.id }}
              className="bg-card rounded-xl overflow-hidden border hover:shadow-md transition active:scale-95"
            >
              <div className="aspect-square bg-muted overflow-hidden">
                {(p.imagens?.[0] ?? p.imagem_url) ? (
                  <img src={p.imagens?.[0] ?? p.imagem_url} alt={p.nome} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <UtensilsCrossed className="h-10 w-10" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-sm line-clamp-1">{p.nome}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 min-h-[2rem]">{p.descricao}</p>
                <div className="font-bold text-primary mt-2">{fmtBRL(p.preco_base)}</div>
              </div>
            </Link>
          ))}
        </div>
        {products.length === 0 && (
          <div className="text-center text-muted-foreground py-12">Nenhum produto encontrado.</div>
        )}
      </section>
    </SiteShell>
  );
}
