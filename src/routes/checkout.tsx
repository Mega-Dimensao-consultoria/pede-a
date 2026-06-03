import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/site-shell";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { useStoreConfig } from "@/hooks/useStoreConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BR_STATES } from "@/lib/br-states";
import { fmtBRL, isValidCPF, maskCEP, maskCPF, onlyDigits } from "@/lib/format";
import { toast } from "sonner";
import { MapPin, Store, CreditCard, QrCode, Loader2, Plus, Utensils, Banknote, Bike, ShoppingBag, Search } from "lucide-react";

export const Route = createFileRoute("/checkout")({
  component: Checkout,
});

function Checkout() {
  const { items, subtotal, clear } = useCart();
  const { user, profile } = useAuth();
  const { modoComanda } = useStoreConfig();
  const navigate = useNavigate();

  const { data: bairros = [] } = useQuery({
    queryKey: ["bairros"],
    queryFn: async () => (await supabase.from("neighborhood_delivery").select("*").eq("ativo", true).order("nome")).data ?? [],
  });
  const { data: savedAddresses = [], refetch: reloadAddresses } = useQuery({
    queryKey: ["my_addresses", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (await supabase
        .from("user_addresses" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true })).data ?? [],
  });

  const [tipo, setTipo] = useState<"entrega" | "retirada" | "consumo_local" | "viagem">(
    "entrega",
  );
  // Default to consumo_local in comanda mode if currently on a non-comanda type
  useEffect(() => {
    if (modoComanda && tipo === "retirada") setTipo("consumo_local");
    if (!modoComanda && (tipo === "consumo_local" || tipo === "viagem")) setTipo("entrega");
  }, [modoComanda]); // eslint-disable-line
  const [mesa, setMesa] = useState("");
  const [comandaNome, setComandaNome] = useState("");
  const [comandaWhatsapp, setComandaWhatsapp] = useState("");
  const [bairroId, setBairroId] = useState<string>("");
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [addingNew, setAddingNew] = useState(false);
  const [saveNew, setSaveNew] = useState(true);
  const [cep, setCep] = useState("");
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairroNome, setBairroNome] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [cepBusy, setCepBusy] = useState(false);
  const [cepSearchOpen, setCepSearchOpen] = useState(false);
  const [cepSearchUf, setCepSearchUf] = useState("");
  const [cepSearchCidade, setCepSearchCidade] = useState("");
  const [cepSearchRua, setCepSearchRua] = useState("");
  const [cepSearchBusy, setCepSearchBusy] = useState(false);
  const [cepSearchResults, setCepSearchResults] = useState<any[]>([]);
  const [emitirNF, setEmitirNF] = useState(false);
  const [cpf, setCpf] = useState(profile?.cpf || "");
  const [pagamento, setPagamento] = useState<"cartao" | "pix" | "dinheiro" | "cartao_maquina">("pix");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const bairro = bairros.find((b: any) => b.id === bairroId);
  const taxa = tipo === "entrega" ? Number(bairro?.taxa ?? 0) : 0;
  const total = subtotal + taxa;

  useEffect(() => {
    if (items.length === 0 && !submitted && !busy) navigate({ to: "/carrinho" });
  }, [items.length, navigate, submitted, busy]);

  // Auto-select default saved address
  useEffect(() => {
    if (!selectedAddressId && savedAddresses.length > 0 && !addingNew) {
      const def = (savedAddresses as any[]).find((a) => a.is_default) ?? savedAddresses[0];
      setSelectedAddressId(def.id);
    }
    if (savedAddresses.length === 0 && !addingNew) {
      setAddingNew(true);
    }
  }, [savedAddresses, selectedAddressId, addingNew]);

  const selectedAddress = (savedAddresses as any[]).find((a) => a.id === selectedAddressId);

  // When a saved address is selected, try to auto-match the delivery bairro by name
  useEffect(() => {
    if (!selectedAddress || bairroId || bairros.length === 0) return;
    const norm = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const target = norm(selectedAddress.bairro || "");
    if (!target) return;
    const match = (bairros as any[]).find((b) => norm(b.nome) === target);
    if (match) setBairroId(match.id);
    else {
      const outros = (bairros as any[]).find((b) => b.is_outros);
      if (outros) setBairroId(outros.id);
    }
  }, [selectedAddress, bairros, bairroId]);

  const buscarCep = async () => {
    const d = onlyDigits(cep);
    if (d.length !== 8) return;
    setCepBusy(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      const j = await r.json();
      if (j.erro) { toast.error("CEP não encontrado"); return; }
      setRua(j.logradouro || "");
      setBairroNome(j.bairro || "");
      setCidade(j.localidade || "");
      setUf(j.uf || "");
    } catch {
      toast.error("Erro buscando CEP");
    } finally { setCepBusy(false); }
  };

  const buscarCepPorEndereco = async () => {
    if (cepSearchUf.length !== 2) return toast.error("Informe a UF (2 letras)");
    if (cepSearchCidade.trim().length < 3) return toast.error("Cidade precisa ter ao menos 3 letras");
    if (cepSearchRua.trim().length < 3) return toast.error("Rua precisa ter ao menos 3 letras");
    setCepSearchBusy(true);
    setCepSearchResults([]);
    try {
      const url = `https://viacep.com.br/ws/${cepSearchUf}/${encodeURIComponent(cepSearchCidade.trim())}/${encodeURIComponent(cepSearchRua.trim())}/json/`;
      const r = await fetch(url);
      const j = await r.json();
      if (!Array.isArray(j) || j.length === 0) {
        toast.error("Nenhum CEP encontrado");
      } else {
        setCepSearchResults(j);
      }
    } catch {
      toast.error("Erro buscando CEPs");
    } finally { setCepSearchBusy(false); }
  };

  const selecionarCepEncontrado = (r: any) => {
    setCep(maskCEP(r.cep || ""));
    setRua(r.logradouro || cepSearchRua);
    setBairroNome(r.bairro || "");
    setCidade(r.localidade || cepSearchCidade);
    setUf(r.uf || cepSearchUf);
    setCepSearchOpen(false);
    setCepSearchResults([]);
  };

  const finalizar = async () => {
    // ----- COMANDA MODE: usa RPC sem exigir login -----
    if (modoComanda) {
      if (!comandaNome.trim()) return toast.error("Informe seu nome");
      if (tipo === "consumo_local" && !mesa.trim()) return toast.error("Informe o número da mesa");
      let comandaEndereco: any = null;
      if (tipo === "entrega") {
        if (!rua.trim() || !numero.trim()) return toast.error("Preencha rua e número para delivery");
        comandaEndereco = {
          cep: onlyDigits(cep) || null,
          rua: rua.trim(),
          numero: numero.trim(),
          complemento: complemento || null,
          bairro: bairroNome || null,
          cidade: cidade || null,
          uf: uf || null,
        };
      }
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
        const { data, error } = await (supabase as any).rpc("create_comanda_order", {
          _items: itemsSnapshot,
          _cliente_nome: comandaNome.trim(),
          _mesa: tipo === "consumo_local" ? mesa.trim() : null,
          _tipo: tipo,
          _pagamento: pagamento,
          _cpf: cpf ? onlyDigits(cpf) : null,
          _whatsapp: comandaWhatsapp ? onlyDigits(comandaWhatsapp) : null,
          _endereco: comandaEndereco,
        });
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        setSubmitted(true);
        navigate({ to: "/pedido/$numero", params: { numero: String(row.numero) } });
        clear().catch(() => {});
      } catch (e: any) {
        toast.error(e.message || "Erro ao finalizar");
      } finally { setBusy(false); }
      return;
    }

    if (!user) return;
    let enderecoPayload: any = null;
    if (tipo === "entrega") {
      if (!bairroId) return toast.error("Selecione um bairro");
      if (addingNew || !selectedAddress) {
        if (!rua || !numero) return toast.error("Preencha o endereço");
        enderecoPayload = { cep: onlyDigits(cep), rua, numero, complemento, bairro: bairroNome, cidade, uf };
        if (saveNew) {
          await supabase.from("user_addresses" as any).insert({
            user_id: user.id,
            rotulo: "Endereço",
            cep: onlyDigits(cep) || null,
            rua, numero,
            complemento: complemento || null,
            bairro: bairroNome || null,
            cidade: cidade || null,
            estado: uf || null,
            is_default: savedAddresses.length === 0,
          });
          reloadAddresses();
        }
      } else {
        enderecoPayload = {
          cep: selectedAddress.cep,
          rua: selectedAddress.rua,
          numero: selectedAddress.numero,
          complemento: selectedAddress.complemento,
          bairro: selectedAddress.bairro,
          cidade: selectedAddress.cidade,
          uf: selectedAddress.estado,
        };
      }
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
          endereco: enderecoPayload,
          pagamento,
          cpf_nota: emitirNF ? onlyDigits(cpf) : null,
        })
        .select()
        .single();

      if (error) throw error;
      setSubmitted(true);
      navigate({ to: "/sucesso/$orderId", params: { orderId: (data as any).id } });
      // limpa o carrinho depois de navegar para não acionar o redirect do useEffect
      clear().catch(() => {});
    } catch (e: any) {
      toast.error(e.message || "Erro ao finalizar");
    } finally { setBusy(false); }
  };

  return (
    <SiteShell>
      <header className="bg-card border-b p-4"><div className="max-w-2xl mx-auto"><h1 className="text-xl font-bold">{modoComanda ? "Fazer Pedido (Comanda)" : "Finalizar Pedido"}</h1></div></header>
      <div className="max-w-2xl mx-auto p-4 space-y-5">
        {/* Tipo */}
        <section>
          <h2 className="font-semibold mb-2">Como deseja receber?</h2>
          <RadioGroup value={tipo} onValueChange={(v) => setTipo(v as any)} className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {modoComanda ? (
              <>
                <Label className={`flex items-center gap-2 border rounded-lg p-3 cursor-pointer ${tipo === "consumo_local" ? "border-primary bg-accent" : ""}`}>
                  <RadioGroupItem value="consumo_local" className="sr-only" />
                  <Utensils className="h-4 w-4" /> Consumir aqui
                </Label>
                <Label className={`flex items-center gap-2 border rounded-lg p-3 cursor-pointer ${tipo === "viagem" ? "border-primary bg-accent" : ""}`}>
                  <RadioGroupItem value="viagem" className="sr-only" />
                  <ShoppingBag className="h-4 w-4" /> Para viagem
                </Label>
                <Label className={`flex items-center gap-2 border rounded-lg p-3 cursor-pointer ${tipo === "entrega" ? "border-primary bg-accent" : ""}`}>
                  <RadioGroupItem value="entrega" className="sr-only" />
                  <Bike className="h-4 w-4" /> Delivery
                </Label>
              </>
            ) : (
              <>
                <Label className={`flex items-center gap-2 border rounded-lg p-3 cursor-pointer ${tipo === "entrega" ? "border-primary bg-accent" : ""}`}>
                  <RadioGroupItem value="entrega" className="sr-only" />
                  <MapPin className="h-4 w-4" /> Entrega
                </Label>
                <Label className={`flex items-center gap-2 border rounded-lg p-3 cursor-pointer ${tipo === "retirada" ? "border-primary bg-accent" : ""}`}>
                  <RadioGroupItem value="retirada" className="sr-only" />
                  <Store className="h-4 w-4" /> Retirada
                </Label>
              </>
            )}
          </RadioGroup>
        </section>

        {modoComanda && (
          <section className="space-y-3 bg-card border rounded-lg p-4">
            <h2 className="font-semibold">Seus dados</h2>
            <div>
              <Label>Nome *</Label>
              <Input value={comandaNome} onChange={(e) => setComandaNome(e.target.value)} placeholder="Seu nome" />
            </div>
            {tipo === "consumo_local" && (
              <div>
                <Label>Número da mesa *</Label>
                <Input value={mesa} onChange={(e) => setMesa(e.target.value)} placeholder="Ex.: 12" inputMode="numeric" />
              </div>
            )}
            <div>
              <Label>WhatsApp (opcional)</Label>
              <Input value={comandaWhatsapp} onChange={(e) => setComandaWhatsapp(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div>
              <Label>CPF (opcional)</Label>
              <Input value={cpf} onChange={(e) => setCpf(maskCPF(e.target.value))} placeholder="Para nota fiscal" />
            </div>
          </section>
        )}

        {modoComanda && tipo === "entrega" && (
          <section className="space-y-3 bg-card border rounded-lg p-4">
            <h2 className="font-semibold">Endereço de entrega</h2>
            <div>
              <Label>CEP</Label>
              <div className="flex gap-2">
                <Input placeholder="00000-000" value={cep} onChange={(e) => setCep(maskCEP(e.target.value))} onBlur={buscarCep} inputMode="numeric" />
                <Button type="button" variant="outline" onClick={buscarCep} disabled={cepBusy}>
                  {cepBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
                </Button>
              </div>
              <button
                type="button"
                className="text-xs text-primary underline mt-1"
                onClick={() => setCepSearchOpen((v) => !v)}
              >
                Não sei o CEP
              </button>
            </div>

            {cepSearchOpen && (
              <div className="space-y-2 border rounded-md p-3 bg-muted/40">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label>UF</Label>
                    <Select value={cepSearchUf} onValueChange={setCepSearchUf}>
                      <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                      <SelectContent>
                        {BR_STATES.map((s) => (<SelectItem key={s.uf} value={s.uf}>{s.uf}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2"><Label>Cidade</Label><Input value={cepSearchCidade} onChange={(e) => setCepSearchCidade(e.target.value)} /></div>
                </div>
                <div><Label>Rua / Logradouro</Label><Input value={cepSearchRua} onChange={(e) => setCepSearchRua(e.target.value)} /></div>
                <Button type="button" variant="outline" size="sm" onClick={buscarCepPorEndereco} disabled={cepSearchBusy}>
                  {cepSearchBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                  Buscar CEPs
                </Button>
                {cepSearchResults.length > 0 && (
                  <div className="max-h-48 overflow-y-auto space-y-1 mt-2">
                    {cepSearchResults.map((r, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => selecionarCepEncontrado(r)}
                        className="w-full text-left text-sm border rounded-md p-2 bg-background hover:bg-accent"
                      >
                        <div className="font-medium">{r.cep}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {r.logradouro}{r.complemento ? ` - ${r.complemento}` : ""} • {r.bairro} • {r.localidade}/{r.uf}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2"><Label>Rua *</Label><Input value={rua} onChange={(e) => setRua(e.target.value)} /></div>
              <div><Label>Número *</Label><Input value={numero} onChange={(e) => setNumero(e.target.value)} /></div>
            </div>
            <div><Label>Complemento</Label><Input value={complemento} onChange={(e) => setComplemento(e.target.value)} /></div>
            <div><Label>Bairro</Label><Input value={bairroNome} onChange={(e) => setBairroNome(e.target.value)} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2"><Label>Cidade</Label><Input value={cidade} onChange={(e) => setCidade(e.target.value)} /></div>
              <div>
                <Label>UF</Label>
                <Select value={uf} onValueChange={setUf}>
                  <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent>
                    {BR_STATES.map((s) => (<SelectItem key={s.uf} value={s.uf}>{s.uf}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>
        )}

        {!modoComanda && tipo === "entrega" && (
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
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Endereço de entrega</h2>
                {savedAddresses.length > 0 && !addingNew && (
                  <Button type="button" variant="outline" size="sm" onClick={() => { setAddingNew(true); setSelectedAddressId(""); }}>
                    <Plus className="h-4 w-4 mr-1" /> Novo
                  </Button>
                )}
                {savedAddresses.length > 0 && addingNew && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setAddingNew(false)}>
                    Usar salvo
                  </Button>
                )}
              </div>

              {!addingNew && savedAddresses.length > 0 && (
                <div className="grid gap-2">
                  {(savedAddresses as any[]).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setSelectedAddressId(a.id)}
                      className={`text-left border rounded-lg p-3 ${selectedAddressId === a.id ? "border-primary bg-accent" : ""}`}
                    >
                      <div className="font-medium text-sm">{a.rotulo || "Endereço"}{a.is_default && <span className="ml-2 text-xs text-muted-foreground">(padrão)</span>}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {a.rua}, {a.numero}{a.complemento ? ` - ${a.complemento}` : ""} • {[a.bairro, a.cidade, a.estado].filter(Boolean).join(" - ")}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {addingNew && (
                <div className="space-y-3">
                  <div>
                    <Label>CEP</Label>
                    <div className="flex gap-2">
                      <Input placeholder="00000-000" value={cep} onChange={(e) => setCep(maskCEP(e.target.value))} onBlur={buscarCep} inputMode="numeric" />
                      <Button type="button" variant="outline" onClick={buscarCep} disabled={cepBusy}>
                        {cepBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2"><Label>Endereço</Label><Input value={rua} onChange={(e) => setRua(e.target.value)} /></div>
                    <div><Label>Número</Label><Input value={numero} onChange={(e) => setNumero(e.target.value)} /></div>
                  </div>
                  <div><Label>Complemento</Label><Input value={complemento} onChange={(e) => setComplemento(e.target.value)} /></div>
                  <div><Label>Bairro</Label><Input value={bairroNome} onChange={(e) => setBairroNome(e.target.value)} /></div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2"><Label>Cidade</Label><Input value={cidade} onChange={(e) => setCidade(e.target.value)} /></div>
                    <div>
                      <Label>UF</Label>
                      <Select value={uf} onValueChange={setUf}>
                        <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                        <SelectContent>
                          {BR_STATES.map((s) => (<SelectItem key={s.uf} value={s.uf}>{s.uf}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={saveNew} onChange={(e) => setSaveNew(e.target.checked)} />
                    Salvar este endereço na minha conta
                  </label>
                </div>
              )}
            </section>
          </>
        )}

        <section className="space-y-3">
          {!modoComanda && (
          <>
          <div className="flex items-center justify-between">
            <Label htmlFor="nf" className="font-semibold">Emitir Nota Fiscal</Label>
            <Switch id="nf" checked={emitirNF} onCheckedChange={setEmitirNF} />
          </div>
          {emitirNF && (
            <Input placeholder="CPF (000.000.000-00)" value={cpf} onChange={(e) => setCpf(maskCPF(e.target.value))} />
          )}
          </>
          )}
        </section>

        <section>
          <h2 className="font-semibold mb-2">Pagamento</h2>
          <RadioGroup value={pagamento} onValueChange={(v) => setPagamento(v as any)} className="grid grid-cols-2 gap-2">
            <Label className={`flex items-center gap-2 border rounded-lg p-3 cursor-pointer ${pagamento === "pix" ? "border-primary bg-accent" : ""}`}>
              <RadioGroupItem value="pix" className="sr-only" /><QrCode className="h-4 w-4" /> PIX
            </Label>
            <Label className={`flex items-center gap-2 border rounded-lg p-3 cursor-pointer ${pagamento === "cartao" ? "border-primary bg-accent" : ""}`}>
              <RadioGroupItem value="cartao" className="sr-only" /><CreditCard className="h-4 w-4" /> {modoComanda ? "Cartão" : "Cartão na entrega"}
            </Label>
            {modoComanda && (
              <>
                <Label className={`flex items-center gap-2 border rounded-lg p-3 cursor-pointer ${pagamento === "dinheiro" ? "border-primary bg-accent" : ""}`}>
                  <RadioGroupItem value="dinheiro" className="sr-only" /><Banknote className="h-4 w-4" /> Dinheiro
                </Label>
                <Label className={`flex items-center gap-2 border rounded-lg p-3 cursor-pointer ${pagamento === "cartao_maquina" ? "border-primary bg-accent" : ""}`}>
                  <RadioGroupItem value="cartao_maquina" className="sr-only" /><CreditCard className="h-4 w-4" /> Cartão (maquininha)
                </Label>
              </>
            )}
          </RadioGroup>

          {pagamento === "pix" && (
            <div className="mt-3 border rounded-lg p-4 bg-card text-center text-sm text-muted-foreground">
              O QR Code e o código PIX serão exibidos após confirmar o pedido.
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