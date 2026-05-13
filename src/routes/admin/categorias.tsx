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

export const Route = createFileRoute("/admin/categorias")({ component: CategoriasAdmin });

function CategoriasAdmin() {
  const qc = useQueryClient();
  const { data: cats = [] } = useQuery({
    queryKey: ["admin_categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("ordem")).data ?? [],
  });
  const [nome, setNome] = useState("");
  const [ordem, setOrdem] = useState(0);

  const add = async () => {
    if (!nome.trim()) return;
    const { error } = await supabase.from("categories").insert({ nome: nome.trim(), ordem });
    if (error) toast.error(error.message);
    else { toast.success("Categoria criada"); setNome(""); setOrdem(0); qc.invalidateQueries({ queryKey: ["admin_categories"] }); }
  };
  const upd = async (id: string, patch: any) => {
    const { error } = await supabase.from("categories").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["admin_categories"] });
  };
  const del = async (id: string) => {
    if (!confirm("Excluir categoria?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["admin_categories"] });
  };

  return (
    <AdminShell>
      <div className="p-4 max-w-3xl">
        <h1 className="text-2xl font-bold mb-4">Categorias</h1>
        <div className="bg-card border rounded-xl p-4 mb-4 flex gap-2">
          <Input placeholder="Nome da categoria" value={nome} onChange={(e) => setNome(e.target.value)} />
          <Input type="number" className="w-24" placeholder="Ordem" value={ordem} onChange={(e) => setOrdem(Number(e.target.value))} />
          <Button onClick={add}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
        </div>
        <div className="bg-card border rounded-xl divide-y">
          {cats.map((c: any) => (
            <div key={c.id} className="p-3 flex items-center gap-2">
              <Input defaultValue={c.nome} onBlur={(e) => e.target.value !== c.nome && upd(c.id, { nome: e.target.value })} />
              <Input type="number" className="w-20" defaultValue={c.ordem} onBlur={(e) => Number(e.target.value) !== c.ordem && upd(c.id, { ordem: Number(e.target.value) })} />
              <Switch checked={c.ativo} onCheckedChange={(v) => upd(c.id, { ativo: v })} />
              <Button size="icon" variant="ghost" onClick={() => del(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
          {cats.length === 0 && <div className="p-6 text-center text-muted-foreground text-sm">Nenhuma categoria cadastrada.</div>}
        </div>
      </div>
    </AdminShell>
  );
}