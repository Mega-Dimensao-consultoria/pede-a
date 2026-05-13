import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { maskCNPJ, onlyDigits, maskPhone } from "@/lib/format";
import { DOW_LABELS, type Horarios } from "@/lib/store-status";
import { toast } from "sonner";
import { Search } from "lucide-react";

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

  const [f, setF] = useState<any>({ nome: "", cnpj: "", telefone: "", whatsapp: "", endereco: "", pix_key: "", pix_qr_url: "", horarios: defaultHor });
  useEffect(() => {
    if (store) {
      setF({
        id: store.id, nome: store.nome || "", cnpj: store.cnpj || "", telefone: store.telefone || "",
        whatsapp: store.whatsapp || "", endereco: store.endereco || "", pix_key: store.pix_key || "",
        pix_qr_url: store.pix_qr_url || "", horarios: (store.horarios as any) || defaultHor,
      });
    }
  }, [store]);

  const [busca, setBusca] = useState(false);
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
        endereco: `${j.logradouro || ""}, ${j.numero || ""} ${j.complemento ? "- " + j.complemento : ""} - ${j.bairro || ""}, ${j.municipio || ""}/${j.uf || ""}`.trim(),
        telefone: j.ddd_telefone_1 ? maskPhone(j.ddd_telefone_1) : p.telefone,
      }));
      toast.success("Dados carregados");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusca(false); }
  };

  const save = async () => {
    const payload = {
      nome: f.nome, cnpj: onlyDigits(f.cnpj) || null, telefone: f.telefone || null,
      whatsapp: f.whatsapp || null, endereco: f.endereco || null,
      pix_key: f.pix_key || null, pix_qr_url: f.pix_qr_url || null,
      horarios: f.horarios as any,
    };
    const { error } = f.id
      ? await supabase.from("store_config").update(payload).eq("id", f.id)
      : await supabase.from("store_config").insert(payload);
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
          <div><Label>Endereço</Label><Input value={f.endereco} onChange={(e) => setF({ ...f, endereco: e.target.value })} /></div>
        </section>

        <section className="bg-card border rounded-xl p-4 space-y-3">
          <h2 className="font-semibold">PIX</h2>
          <div><Label>Chave PIX</Label><Input value={f.pix_key} onChange={(e) => setF({ ...f, pix_key: e.target.value })} placeholder="email@exemplo.com / CPF / chave aleatória" /></div>
          <div><Label>URL do QR Code (opcional)</Label><Input value={f.pix_qr_url} onChange={(e) => setF({ ...f, pix_qr_url: e.target.value })} placeholder="https://..." /></div>
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