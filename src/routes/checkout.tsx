import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/site-shell";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { fmtBRL, isValidCPF, maskCEP, maskCPF, onlyDigits } from "@/lib/format";
import { toast } from "sonner";
import { Copy, MapPin, Store, CreditCard, QrCode, Loader2 } from "lucide-react";

export const Route = createFileRoute("/checkout")({
  component: Checkout,
});

function Checkout() {
  const { items, subtotal, clear } = useCart();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const { data: bairros = [] } = useQuery({
    queryKey: ["bairros"],
    queryFn: async () => (await supabase.from("neighborhood_delivery").select("*").eq("ativo", true).order("nome")).data ?? [],
  });
  const { data: store } = useQuery({
    queryKey: ["store_config"],
    queryFn: async () => (await supabase.from("store_config").select("*").maybeSingle()).data,
  });

  const [tipo, setTipo] = useState<"entrega" | "retirada">("entrega");
  const [bairroId, setBairroId] = useState<string>("");
  const [cep, setCep] = useState("");
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [cepBusy, setCepBusy] = useState(false);
  const [emitirNF, setEmitirNF] = useState(false);
  const [cpf, setCpf] = useState(profile?.cpf || "");
  const [pagamento, setPagamento] = useState<"cartao" | "pix">("pix");
  const [busy, setBusy] = useState(false);

  const bairro = bairros.find((b: any) => b.id === bairroId);
  const taxa = tipo === "entrega" ? Number(bairro?.taxa ?? 0) : 0;
  const total = subtotal + taxa;

  useEffect(() => {
    if (items.length === 0) navigate({ to: "/carrinho" });
  }, [items.length, navigate]);

  const buscarCep = async () => {
    const d = onlyDigits(cep);
    if (d.length !== 8) return;
    setCepBusy(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      const j = await r.json();
      if (j.erro) { toast.error("CEP não encontrado"); return; }
      setRua(j.logradouro || "");
      setCidade(j.localidade || "");
      setUf(j.uf || "");
    } catch {
      toast.error("Erro buscando CEP");
    } finally { setCepBusy(false); }
  };

  const finalizar = async () => {
    if (!user) return;
    if (tipo === "entrega") {
      if (!bairroId) return toast.error("Selecione um bairro");
      if (!rua || !numero) return toast.error("Preencha o endereço");
    }
    if (emitirNF && !isValidCPF(cpf)) return toast.error("CPF inválido");

    setBusy(true);
    try {
      const itemsSnapshot = items.map((it) => ({
        product_id: it.product_id,
        nome: it.product?.nome,
        size: it.size,
        addons: it.addons,
        quantidade: it.quantidade,
        preco_unit: it.preco_unit,
        observacoes: it.observacoes,
      }));

      const { data, error } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          cliente_nome: profile?.nome,
          cliente_whatsapp: profile?.whatsapp,
          items: itemsSnapshot,
          subtotal,
          taxa_entrega: taxa,
          total,
          tipo,
          bairro_id: tipo === "entrega" ? bairroId : null,
          bairro_nome: tipo === "entrega" ? bairro?.nome : null,
          endereco: tipo === "entrega" ? { cep, rua, numero, complemento, cidade, uf } : null,
          pagamento,
          cpf_nota: emitirNF ? onlyDigits(cpf) : null,
        })
        .select()
        .single();

      if (error) throw error;
      await clear();
      navigate({ to: "/sucesso/$orderId", params: { orderId: (data as any).id } });
    } catch (e: any) {
      toast.error(e.message || "Erro ao finalizar");
    } finally { setBusy(false); }
  };

  const copyPix = () => {
    if (store?.pix_key) {
      navigator.clipboard.writeText(store.pix_key);
      toast.success("Chave PIX copiada");
    }
  };

  return (
    <SiteShell>
      <header className="bg-card border-b p-4"><div className="max-w-2xl mx-auto"><h1 className="text-xl font-bold">Finalizar Pedido</h1></div></header>
      <div className="max-w-2xl mx-auto p-4 space-y-5">
        {/* Tipo */}
        <section>
          <h2 className="font-semibold mb-2">Como deseja receber?</h2>
          <RadioGroup value={tipo} onValueChange={(v) => setTipo(v as any)} className="grid grid-cols-2 gap-2">
            <Label className={`flex items-center gap-2 border rounded-lg p-3 cursor-pointer ${tipo === "entrega" ? "border-primary bg-accent" : ""}`}>
              <RadioGroupItem value="entrega" className="sr-only" />
              <MapPin className="h-4 w-4" /> Entrega
            </Label>
            <Label className={`flex items-center gap-2 border rounded-lg p-3 cursor-pointer ${tipo === "retirada" ? "border-primary bg-accent" : ""}`}>
              <RadioGroupItem value="retirada" className="sr-only" />
              <Store className="h-4 w-4" /> Retirada
            </Label>
          </RadioGroup>
        </section>

        {tipo === "entrega" && (
          <>
            <section>
              <h2 className="font-semibold mb-2">Bairro</h2>
              <div className="grid gap-2">
                {bairros.map((b: any) => (
                  <button
                    key={b.id}
                    onClick={() => setBairroId(b.id)}
                    className={`flex justify-between items-center border rounded-lg p-3 text-left ${bairroId === b.id ? "border-primary bg-accent" : ""}`}
                  >
                    <span>{b.nome}{b.is_outros && <span className="ml-2 text-xs text-muted-foreground">(valor padrão)</span>}</span>
                    <span className="font-semibold">{fmtBRL(b.taxa)}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="font-semibold">Endereço</h2>
              <div className="flex gap-2">
                <Input placeholder="CEP" value={cep} onChange={(e) => setCep(maskCEP(e.target.value))} onBlur={buscarCep} />
                <Button type="button" variant="outline" onClick={buscarCep} disabled={cepBusy}>
                  {cepBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
                </Button>
              </div>
              <Input placeholder="Rua" value={rua} onChange={(e) => setRua(e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Número" value={numero} onChange={(e) => setNumero(e.target.value)} />
                <Input placeholder="Complemento" value={complemento} onChange={(e) => setComplemento(e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input className="col-span-2" placeholder="Cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
                <Input placeholder="UF" value={uf} maxLength={2} onChange={(e) => setUf(e.target.value.toUpperCase())} />
              </div>
            </section>
          </>
        )}

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="nf" className="font-semibold">Emitir Nota Fiscal</Label>
            <Switch id="nf" checked={emitirNF} onCheckedChange={setEmitirNF} />
          </div>
          {emitirNF && (
            <Input placeholder="CPF (000.000.000-00)" value={cpf} onChange={(e) => setCpf(maskCPF(e.target.value))} />
          )}
        </section>

        <section>
          <h2 className="font-semibold mb-2">Pagamento</h2>
          <RadioGroup value={pagamento} onValueChange={(v) => setPagamento(v as any)} className="grid grid-cols-2 gap-2">
            <Label className={`flex items-center gap-2 border rounded-lg p-3 cursor-pointer ${pagamento === "pix" ? "border-primary bg-accent" : ""}`}>
              <RadioGroupItem value="pix" className="sr-only" /><QrCode className="h-4 w-4" /> PIX
            </Label>
            <Label className={`flex items-center gap-2 border rounded-lg p-3 cursor-pointer ${pagamento === "cartao" ? "border-primary bg-accent" : ""}`}>
              <RadioGroupItem value="cartao" className="sr-only" /><CreditCard className="h-4 w-4" /> Cartão na entrega
            </Label>
          </RadioGroup>

          {pagamento === "pix" && (
            <div className="mt-3 border rounded-lg p-4 bg-card text-center space-y-3">
              {store?.pix_qr_url ? (
                <img src={store.pix_qr_url} alt="QR PIX" className="mx-auto h-44 w-44 object-contain" />
              ) : (
                <div className="h-44 w-44 mx-auto bg-muted rounded-lg flex items-center justify-center text-muted-foreground"><QrCode className="h-16 w-16" /></div>
              )}
              <div className="text-sm">Chave PIX</div>
              <div className="flex items-center gap-2 justify-center">
                <code className="text-xs bg-muted px-2 py-1 rounded">{store?.pix_key || "—"}</code>
                <Button size="sm" variant="outline" onClick={copyPix}><Copy className="h-3 w-3" /></Button>
              </div>
            </div>
          )}
        </section>

        <section className="border rounded-lg p-4 bg-card space-y-1">
          <div className="flex justify-between text-sm"><span>Subtotal</span><span>{fmtBRL(subtotal)}</span></div>
          <div className="flex justify-between text-sm"><span>Taxa de entrega</span><span>{fmtBRL(taxa)}</span></div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2"><span>Total</span><span className="text-primary">{fmtBRL(total)}</span></div>
        </section>

        <Button className="w-full h-12 text-base" disabled={busy} onClick={finalizar}>
          {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Confirmar Pedido
        </Button>
      </div>
    </SiteShell>
  );
}