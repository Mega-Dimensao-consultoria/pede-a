import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/site-shell";
import { fmtBRL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Minus, Plus, ChevronLeft, UtensilsCrossed } from "lucide-react";
import { useCart, type CartAddon, type CartSize } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { AuthModal } from "@/components/auth-modal";
import { toast } from "sonner";

export const Route = createFileRoute("/produto/$id")({
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { add } = useCart();
  const [authOpen, setAuthOpen] = useState(false);

  const { data: p } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => (await supabase.from("products").select("*").eq("id", id).maybeSingle()).data,
  });

  const sizes = (p?.sizes as Array<{ label: string; price_delta: number }>) ?? [];
  const addons = (p?.addons as Array<{ nome: string; preco: number; imagem_url?: string | null }>) ?? [];
  const imagens: string[] = (Array.isArray((p as any)?.imagens) && (p as any).imagens.length)
    ? (p as any).imagens
    : p?.imagem_url ? [p.imagem_url] : [];
  const [size, setSize] = useState<string>("");
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [qty, setQty] = useState(1);
  const [obs, setObs] = useState("");

  const sizeObj = sizes.find((s) => s.label === size);
  const addonsList: CartAddon[] = useMemo(() => addons.filter((a) => picked[a.nome]).map((a) => ({ nome: a.nome, preco: a.preco })), [picked, addons]);
  const unit = (p?.preco_base ?? 0) + (sizeObj?.price_delta ?? 0) + addonsList.reduce((s, a) => s + a.preco, 0);

  const handleAdd = async () => {
    if (sizes.length > 0 && !size) {
      toast.error("Escolha um tamanho");
      return;
    }
    // Se não estiver logado nem cadastrado como guest, abrimos o modal
    // (que permite continuar só com e-mail). Após o e-mail, o onSuccess
    // chama reAdd() para concluir a adição.
    const { useCart } = await import("@/hooks/useCart");
    void useCart;
    try {
      await add({
        product_id: id,
        size: (sizeObj as CartSize) ?? null,
        addons: addonsList,
        quantidade: qty,
        observacoes: obs || null,
        preco_unit: unit,
        product: { nome: p?.nome ?? "", imagem_url: (imagens[0] ?? p?.imagem_url) ?? null },
      });
      toast.success("Adicionado ao cesto");
      navigate({ to: "/" });
    } catch (e: any) {
      if (e?.message === "guest_email_required") {
        setAuthOpen(true);
        return;
      }
      toast.error(e.message || "Erro");
    }
  };

  const reAdd = async () => {
    await handleAdd();
  };

  if (!p) return <SiteShell><div className="p-8 text-center">Carregando...</div></SiteShell>;

  return (
    <SiteShell>
      <div className="relative">
        <button onClick={() => navigate({ to: "/" })} className="absolute top-3 left-3 z-10 bg-card/90 backdrop-blur rounded-full p-2 shadow">
          <ChevronLeft className="h-5 w-5" />
        </button>
        {imagens.length > 0 ? (
          <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none">
            {imagens.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`${p.nome} ${i + 1}`}
                className="w-full shrink-0 snap-center aspect-video object-cover bg-muted"
              />
            ))}
          </div>
        ) : (
          <div className="aspect-video bg-muted flex items-center justify-center text-muted-foreground">
            <UtensilsCrossed className="h-16 w-16" />
          </div>
        )}
        {imagens.length > 1 && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
            {imagens.map((_, i) => (
              <span key={i} className="h-1.5 w-1.5 rounded-full bg-card/80 shadow" />
            ))}
          </div>
        )}
      </div>
      <div className="max-w-2xl mx-auto p-4 space-y-5">
        <div>
          <h1 className="text-2xl font-bold">{p.nome}</h1>
          <p className="text-muted-foreground mt-1">{p.descricao}</p>
          <div className="text-xl font-bold text-primary mt-2">{fmtBRL(p.preco_base)}</div>
        </div>

        {sizes.length > 0 && (
          <div>
            <h2 className="font-semibold mb-2">Tamanho</h2>
            <RadioGroup value={size} onValueChange={setSize} className="grid grid-cols-3 gap-2">
              {sizes.map((s) => (
                <Label key={s.label} htmlFor={`s-${s.label}`} className={`border rounded-lg p-3 cursor-pointer flex flex-col items-center ${size === s.label ? "border-primary bg-accent" : ""}`}>
                  <RadioGroupItem id={`s-${s.label}`} value={s.label} className="sr-only" />
                  <div className="font-bold">{s.label}</div>
                  <div className="text-xs text-muted-foreground">{s.price_delta > 0 ? `+${fmtBRL(s.price_delta)}` : "—"}</div>
                </Label>
              ))}
            </RadioGroup>
          </div>
        )}

        {addons.length > 0 && (
          <div>
            <h2 className="font-semibold mb-2">Adicionais</h2>
            <div className="space-y-2">
              {addons.map((a) => (
                <Label key={a.nome} className="flex items-center justify-between border rounded-lg p-3 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={!!picked[a.nome]} onCheckedChange={(v) => setPicked({ ...picked, [a.nome]: !!v })} />
                    {a.imagem_url && (
                      <img src={a.imagem_url} alt={a.nome} className="w-10 h-10 rounded object-cover" />
                    )}
                    <span>{a.nome}</span>
                  </div>
                  <span className="text-sm font-medium">+ {fmtBRL(a.preco)}</span>
                </Label>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="font-semibold mb-2">Observações</h2>
          <Textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex: sem cebola" />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center border rounded-full">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-2"><Minus className="h-4 w-4" /></button>
            <span className="w-8 text-center font-semibold">{qty}</span>
            <button onClick={() => setQty(qty + 1)} className="p-2"><Plus className="h-4 w-4" /></button>
          </div>
          <Button onClick={handleAdd} className="flex-1 h-12 text-base">
            Adicionar · {fmtBRL(unit * qty)}
          </Button>
        </div>
      </div>
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} onSuccess={reAdd} />
    </SiteShell>
  );
}