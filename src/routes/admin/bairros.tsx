import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/admin/bairros")({ component: BairrosAdmin });

function BairrosAdmin() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({
    queryKey: ["admin_bairros"],
    queryFn: async () => (await supabase.from("neighborhood_delivery").select("*").order("nome")).data ?? [],
  });
  const [nome, setNome] = useState("");
  const [taxa, setTaxa] = useState(0);

  const add = async () => {
    if (!nome.trim()) return;
    const { error } = await supabase.from("neighborhood_delivery").insert({ nome: nome.trim(), taxa });
    if (error) toast.error(error.message);
    else { toast.success("Bairro criado"); setNome(""); setTaxa(0); qc.invalidateQueries({ queryKey: ["admin_bairros"] }); }
  };
  const upd = async (id: string, patch: any) => {
    const { error } = await supabase.from("neighborhood_delivery").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["admin_bairros"] });
  };
  const del = async (id: string) => {
    if (!confirm("Excluir bairro?")) return;
    const { error } = await supabase.from("neighborhood_delivery").delete().eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["admin_bairros"] });
  };

  return (
    <AdminShell>
      <div className="p-4 max-w-3xl">
        <h1 className="text-2xl font-bold mb-4">Bairros e Taxas</h1>
        <div className="bg-card border rounded-xl p-4 mb-4 flex gap-2">
          <Input placeholder="Nome do bairro" value={nome} onChange={(e) => setNome(e.target.value)} />
          <Input type="number" step="0.01" className="w-32" placeholder="Taxa R$" value={taxa} onChange={(e) => setTaxa(Number(e.target.value))} />
          <Button onClick={add}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
        </div>
        <div className="bg-card border rounded-xl divide-y">
          {items.map((b: any) => (
            <div key={b.id} className="p-3 flex items-center gap-2">
              <Input defaultValue={b.nome} onBlur={(e) => e.target.value !== b.nome && upd(b.id, { nome: e.target.value })} />
              <Input type="number" step="0.01" className="w-32" defaultValue={b.taxa} onBlur={(e) => Number(e.target.value) !== b.taxa && upd(b.id, { taxa: Number(e.target.value) })} />
              <label className="text-xs flex items-center gap-1"><Switch checked={b.is_outros} onCheckedChange={(v) => upd(b.id, { is_outros: v })} /> Outros</label>
              <Switch checked={b.ativo} onCheckedChange={(v) => upd(b.id, { ativo: v })} />
              <Button size="icon" variant="ghost" onClick={() => del(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
          {items.length === 0 && <div className="p-6 text-center text-muted-foreground text-sm">Nenhum bairro cadastrado.</div>}
        </div>
      </div>
    </AdminShell>
  );
}