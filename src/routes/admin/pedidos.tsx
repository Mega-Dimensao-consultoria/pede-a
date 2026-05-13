import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtBRL } from "@/lib/format";
import { Printer, FileText, Eye } from "lucide-react";
import { printCupom80, printA4 } from "@/lib/print";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/pedidos")({ component: PedidosAdmin });

const COLS: { key: string; label: string }[] = [
  { key: "pendente", label: "Pendente" },
  { key: "preparando", label: "Preparando" },
  { key: "saiu", label: "Saiu" },
  { key: "concluido", label: "Concluído" },
];

function PedidosAdmin() {
  const qc = useQueryClient();
  const { data: orders = [] } = useQuery({
    queryKey: ["admin_orders"],
    queryFn: async () => (await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(200)).data ?? [],
    refetchInterval: 10000,
  });
  const { data: store } = useQuery({ queryKey: ["store_config"], queryFn: async () => (await supabase.from("store_config").select("*").maybeSingle()).data });

  useEffect(() => {
    const ch = supabase.channel("orders").on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => qc.invalidateQueries({ queryKey: ["admin_orders"] })).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const [view, setView] = useState<any>(null);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status: status as any }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Status atualizado"); qc.invalidateQueries({ queryKey: ["admin_orders"] }); }
  };

  return (
    <AdminShell>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Pedidos</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {COLS.map((c) => {
            const cards = orders.filter((o: any) => o.status === c.key);
            return (
              <div key={c.key} className="bg-muted rounded-xl p-3 min-h-[200px]">
                <div className="font-semibold mb-2 flex items-center justify-between">
                  <span>{c.label}</span><span className="text-xs bg-card px-2 py-0.5 rounded-full">{cards.length}</span>
                </div>
                <div className="space-y-2">
                  {cards.map((o: any) => (
                    <div key={o.id} className="bg-card border rounded-lg p-3 text-sm">
                      <div className="flex justify-between font-semibold">
                        <span>#{o.numero}</span><span>{fmtBRL(o.total)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{o.cliente_nome || "—"} · {o.tipo}</div>
                      <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleTimeString("pt-BR")}</div>
                      <div className="flex gap-1 mt-2">
                        <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setView(o)}><Eye className="h-3 w-3" /></Button>
                        <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => printCupom80(o, store)}><Printer className="h-3 w-3" /></Button>
                        <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => printA4(o, store)}><FileText className="h-3 w-3" /></Button>
                      </div>
                      <select className="w-full mt-2 text-xs border rounded px-2 py-1 bg-card" value={o.status} onChange={(e) => setStatus(o.id, e.target.value)}>
                        <option value="pendente">Pendente</option>
                        <option value="preparando">Preparando</option>
                        <option value="saiu">Saiu</option>
                        <option value="concluido">Concluído</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <Dialog open={!!view} onOpenChange={(v) => !v && setView(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Pedido #{view?.numero}</DialogTitle></DialogHeader>
          {view && (
            <div className="space-y-2 text-sm">
              <div><strong>{view.cliente_nome || "-"}</strong> · {view.cliente_whatsapp || ""}</div>
              <div>Tipo: {view.tipo}</div>
              {view.endereco && <div className="text-xs text-muted-foreground">{view.endereco.rua}, {view.endereco.numero} — {view.bairro_nome}</div>}
              <div className="border-t pt-2">
                {(view.items as any[]).map((i, idx) => (
                  <div key={idx} className="py-1 border-b last:border-0">
                    <div className="flex justify-between"><span>{i.quantidade}x {i.nome}{i.size ? ` (${i.size.label})` : ""}</span><span>{fmtBRL(i.preco_unit * i.quantidade)}</span></div>
                    {i.addons?.length > 0 && <div className="text-xs text-muted-foreground">+ {i.addons.map((a: any) => a.nome).join(", ")}</div>}
                    {i.observacoes && <div className="text-xs italic">"{i.observacoes}"</div>}
                  </div>
                ))}
              </div>
              <div className="font-bold flex justify-between">Total <span>{fmtBRL(view.total)}</span></div>
              <div>Pagamento: {view.pagamento}</div>
              {view.cpf_nota && <div>CPF Nota: {view.cpf_nota}</div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}