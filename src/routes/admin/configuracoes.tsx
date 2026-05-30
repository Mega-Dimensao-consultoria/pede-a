import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { maskCNPJ, onlyDigits, maskPhone, maskCEP } from "@/lib/format";
import { BR_STATES } from "@/lib/br-states";
import { DOW_LABELS, type Horarios } from "@/lib/store-status";
import { toast } from "sonner";
import { Search, Loader2, Info } from "lucide-react";

export const Route = createFileRoute("/admin/configuracoes")({ component: ConfigAdmin });

const defaultHor: Horarios = Object.fromEntries(
  Array.from({ length: 7 }, (_, i) => [String(i), { ativo: true, abre: "08:00", fecha: "23:00" }])
);

function ConfigAdmin() {
  const qc = useQueryClient();
  const { data: store } = useQuery({
    queryKey: ["store_config"],
    queryFn: async () => (await supabase.from("store_config").select("*").maybeSingle()).data,
  });

  const [f, setF] = useState<any>({
    nome: "", cnpj: "", telefone: "", whatsapp: "",
    cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "",
    pix_key: "", pix_qr_url: "", horarios: defaultHor, modo_comanda: false,
  });
  useEffect(() => {
    if (store) {
      setF({
        id: store.id, nome: store.nome || "", cnpj: store.cnpj || "", telefone: store.telefone || "",
        whatsapp: store.whatsapp || "",
        cep: (store as any).cep ? maskCEP((store as any).cep) : "",
        rua: (store as any).rua || "",
        numero: (store as any).numero || "",
        complemento: (store as any).complemento || "",
        bairro: (store as any).bairro || "",
        cidade: (store as any).cidade || "",
        uf: (store as any).uf || "",
        pix_key: store.pix_key || "",
        pix_qr_url: store.pix_qr_url || "", horarios: (store.horarios as any) || defaultHor,
        modo_comanda: !!(store as any).modo_comanda,
      });
    }
  }, [store]);

  const [busca, setBusca] = useState(false);
  const [cepBusy, setCepBusy] = useState(false);

  const buscarCEP = async () => {
    const d = onlyDigits(f.cep);
    if (d.length !== 8) return;
    setCepBusy(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      const j = await r.json();
      if (j.erro) { toast.error("CEP não encontrado"); return; }
      setF((p: any) => ({ ...p, rua: j.logradouro || p.rua, bairro: j.bairro || p.bairro, cidade: j.localidade || p.cidade, uf: j.uf || p.uf }));
    } catch { toast.error("Erro ao buscar CEP"); }
    finally { setCepBusy(false); }
  };

  const buscarCNPJ = async () => {
    const d = onlyDigits(f.cnpj);
    if (d.length !== 14) return toast.error("CNPJ inválido");
    setBusca(true);
    try {
      const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${d}`);
      if (!r.ok) throw new Error("CNPJ não encontrado");
      const j = await r.json();
      setF((p: any) => ({
        ...p,
        nome: j.razao_social || j.nome_fantasia || p.nome,
        cep: j.cep ? maskCEP(j.cep) : p.cep,
        rua: j.logradouro || p.rua,
        numero: j.numero || p.numero,
        complemento: j.complemento || p.complemento,
        bairro: j.bairro || p.bairro,
        cidade: j.municipio || p.cidade,
        uf: j.uf || p.uf,
        telefone: j.ddd_telefone_1 ? maskPhone(j.ddd_telefone_1) : p.telefone,
      }));
      toast.success("Dados carregados");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusca(false); }
  };

  const save = async () => {
    const enderecoTexto = [
      [f.rua, f.numero].filter(Boolean).join(", "),
      f.complemento,
      f.bairro,
      [f.cidade, f.uf].filter(Boolean).join("/"),
    ].filter(Boolean).join(" - ");
    const payload = {
      nome: f.nome, cnpj: onlyDigits(f.cnpj) || null, telefone: f.telefone || null,
      whatsapp: f.whatsapp || null,
      endereco: enderecoTexto || null,
      cep: onlyDigits(f.cep) || null,
      rua: f.rua || null,
      numero: f.numero || null,
      complemento: f.complemento || null,
      bairro: f.bairro || null,
      cidade: f.cidade || null,
      uf: f.uf || null,
      pix_key: f.pix_key || null, pix_qr_url: f.pix_qr_url || null,
      horarios: f.horarios as any,
      modo_comanda: !!f.modo_comanda,
    };
    const { error } = f.id
      ? await supabase.from("store_config").update(payload as any).eq("id", f.id)
      : await supabase.from("store_config").insert(payload as any);
    if (error) toast.error(error.message);
    else { toast.success("Configurações salvas"); qc.invalidateQueries({ queryKey: ["store_config"] }); }
  };

  const setHor = (dow: string, patch: any) => setF((p: any) => ({ ...p, horarios: { ...p.horarios, [dow]: { ...p.horarios[dow], ...patch } } }));

  return (
    <AdminShell>
      <div className="p-4 max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold">Configurações</h1>

        <section className="bg-card border rounded-xl p-4 space-y-3">
          <h2 className="font-semibold">Dados da loja</h2>
          <div>
            <Label>CNPJ</Label>
            <div className="flex gap-2">
              <Input value={f.cnpj} onChange={(e) => setF({ ...f, cnpj: maskCNPJ(e.target.value) })} placeholder="00.000.000/0000-00" />
              <Button variant="outline" onClick={buscarCNPJ} disabled={busca}><Search className="h-4 w-4 mr-1" /> {busca ? "..." : "Buscar"}</Button>
            </div>
          </div>
          <div><Label>Nome da loja</Label><Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Telefone</Label><Input value={f.telefone} onChange={(e) => setF({ ...f, telefone: maskPhone(e.target.value) })} /></div>
            <div><Label>WhatsApp</Label><Input value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: maskPhone(e.target.value) })} /></div>
          </div>
          <div className="space-y-3 pt-2 border-t">
            <h3 className="font-medium text-sm">Endereço da loja</h3>
            <div>
              <Label>CEP</Label>
              <div className="flex gap-2">
                <Input value={f.cep} onChange={(e) => setF({ ...f, cep: maskCEP(e.target.value) })} onBlur={buscarCEP} placeholder="00000-000" inputMode="numeric" />
                <Button variant="outline" type="button" onClick={buscarCEP} disabled={cepBusy}>
                  {cepBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2"><Label>Endereço</Label><Input value={f.rua} onChange={(e) => setF({ ...f, rua: e.target.value })} /></div>
              <div><Label>Número</Label><Input value={f.numero} onChange={(e) => setF({ ...f, numero: e.target.value })} /></div>
            </div>
            <div><Label>Complemento</Label><Input value={f.complemento} onChange={(e) => setF({ ...f, complemento: e.target.value })} /></div>
            <div><Label>Bairro</Label><Input value={f.bairro} onChange={(e) => setF({ ...f, bairro: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2"><Label>Cidade</Label><Input value={f.cidade} onChange={(e) => setF({ ...f, cidade: e.target.value })} /></div>
              <div>
                <Label>UF</Label>
                <Select value={f.uf} onValueChange={(v) => setF({ ...f, uf: v })}>
                  <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent>
                    {BR_STATES.map((s) => (<SelectItem key={s.uf} value={s.uf}>{s.uf}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-card border rounded-xl p-4 space-y-3">
          <h2 className="font-semibold">PIX</h2>
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-lg p-3 text-xs flex gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-900 dark:text-amber-200">Esses dados aparecem no QR Code real do PIX.</p>
              <p className="text-amber-800 dark:text-amber-300 mt-1">Use a chave PIX exata, o nome do titular e a cidade cadastrados no seu banco. Caso contrário, o pagador pode ver dados errados ou o PIX pode não ser aceito.</p>
            </div>
          </div>
          <div><Label>Chave PIX (real, da conta que vai receber)</Label><Input value={f.pix_key} onChange={(e) => setF({ ...f, pix_key: e.target.value })} placeholder="email@dominio.com / CPF / CNPJ / telefone / chave aleatória" /></div>
          <p className="text-xs text-muted-foreground">Nome do titular e cidade são puxados de "Dados da loja" e "Endereço da loja" acima.</p>
          <div><Label>URL do QR Code (opcional)</Label><Input value={f.pix_qr_url} onChange={(e) => setF({ ...f, pix_qr_url: e.target.value })} placeholder="https://..." /></div>
        </section>

        <section className="bg-card border rounded-xl p-4 space-y-3">
          <h2 className="font-semibold">Modo Comanda Digital</h2>
          <p className="text-xs text-muted-foreground">
            Ative para transformar o sistema em uma comanda de mesa: o cliente (ou garçom) faz pedidos pelo tablet/celular sem precisar cadastrar endereço,
            cada pedido recebe um número, e o pagamento é registrado pelo administrador na finalização.
          </p>
          <div className="flex items-center justify-between border rounded-lg p-3">
            <div>
              <Label htmlFor="comanda" className="font-medium">Ativar modo comanda</Label>
              <p className="text-xs text-muted-foreground">Desativa endereço/CEP/CPF obrigatório e libera mesa + consumo no local.</p>
            </div>
            <Switch id="comanda" checked={!!f.modo_comanda} onCheckedChange={(v) => setF({ ...f, modo_comanda: v })} />
          </div>
        </section>

        <section className="bg-card border rounded-xl p-4 space-y-2">
          <h2 className="font-semibold">Horário de funcionamento</h2>
          {DOW_LABELS.map((label, i) => {
            const cfg = f.horarios[String(i)] || { ativo: false, abre: "08:00", fecha: "23:00" };
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="w-24 text-sm">{label}</div>
                <Switch checked={cfg.ativo} onCheckedChange={(v) => setHor(String(i), { ativo: v })} />
                <Input type="time" className="w-32" value={cfg.abre} onChange={(e) => setHor(String(i), { abre: e.target.value })} disabled={!cfg.ativo} />
                <span>às</span>
                <Input type="time" className="w-32" value={cfg.fecha} onChange={(e) => setHor(String(i), { fecha: e.target.value })} disabled={!cfg.ativo} />
              </div>
            );
          })}
        </section>

        <Button onClick={save} className="w-full" size="lg">Salvar configurações</Button>
      </div>
    </AdminShell>
  );
}