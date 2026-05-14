import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtBRL } from "@/lib/format";
import { Printer, FileText, FileCheck2, ExternalLink } from "lucide-react";
import { printCupom80, printA4 } from "@/lib/print";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/pedidos")({ component: PedidosAdmin });

const COLS: { key: string; label: string }[] = [
  { key: "pendente", label: "Pendente" },
  { key: "aprovado", label: "Aprovado" },
  { key: "preparando", label: "Preparando" },
  { key: "saiu", label: "Saiu" },
  { key: "concluido", label: "Concluído" },
];

const STATUS_STYLES: Record<string, { card: string; col: string; badge: string; label: string }> = {
  pendente:   { col: "bg-amber-100/40 dark:bg-amber-950/20",   card: "border-amber-400 bg-amber-50 dark:bg-amber-950/30",  badge: "bg-amber-500 text-white", label: "Pendente" },
  aprovado:   { col: "bg-blue-100/40 dark:bg-blue-950/20",     card: "border-blue-400 bg-blue-50 dark:bg-blue-950/30",     badge: "bg-blue-500 text-white", label: "Aprovado" },
  preparando: { col: "bg-orange-100/40 dark:bg-orange-950/20", card: "border-orange-400 bg-orange-50 dark:bg-orange-950/30",badge: "bg-orange-500 text-white", label: "Preparando" },
  saiu:       { col: "bg-purple-100/40 dark:bg-purple-950/20", card: "border-purple-400 bg-purple-50 dark:bg-purple-950/30",badge: "bg-purple-500 text-white", label: "Saiu" },
  concluido:  { col: "bg-green-100/40 dark:bg-green-950/20",   card: "border-green-500 bg-green-50 dark:bg-green-950/30",   badge: "bg-green-600 text-white", label: "Concluído" },
  cancelado:  { col: "bg-red-100/40 dark:bg-red-950/20",       card: "border-red-400 bg-red-50 dark:bg-red-950/30",         badge: "bg-red-500 text-white", label: "Cancelado" },
};

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
  const [proofUrl, setProofUrl] = useState<string | null>(null);

  useEffect(() => {
    setProofUrl(null);
    if (view?.payment_proof_path) {
      supabase.storage.from("payment-proofs").createSignedUrl(view.payment_proof_path, 60 * 10).then(({ data }) => {
        if (data?.signedUrl) setProofUrl(data.signedUrl);
      });
    }
  }, [view?.id, view?.payment_proof_path]);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status: status as any }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Status atualizado"); qc.invalidateQueries({ queryKey: ["admin_orders"] }); }
  };

  return (
    <AdminShell>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Pedidos</h1>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {COLS.map((c) => {
            const cards = orders.filter((o: any) => o.status === c.key);
            const st = STATUS_STYLES[c.key];
            return (
              <div key={c.key} className={`rounded-xl p-3 min-h-[200px] ${st.col}`}>
                <div className="font-semibold mb-2 flex items-center justify-between">
                  <span>{c.label}</span><span className="text-xs bg-card px-2 py-0.5 rounded-full">{cards.length}</span>
                </div>
                <div className="space-y-2">
                  {cards.map((o: any) => {
                    const cs = STATUS_STYLES[o.status] || STATUS_STYLES.pendente;
                    return (
                      <button
                        key={o.id}
                        onClick={() => setView(o)}
                        className={`w-full text-left border-l-4 rounded-lg p-3 text-sm transition hover:shadow-md ${cs.card}`}
                      >
                        <div className="flex justify-between font-semibold">
                          <span>#{o.numero}</span><span>{fmtBRL(o.total)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{o.cliente_nome || "—"} · {o.tipo}</div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                          {o.payment_proof_path && <span className="text-[10px] inline-flex items-center gap-1 text-green-600 dark:text-green-400"><FileCheck2 className="h-3 w-3" /> comprovante</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <Dialog open={!!view} onOpenChange={(v) => !v && setView(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Pedido #{view?.numero}
              {view && <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[view.status]?.badge || ""}`}>{STATUS_STYLES[view.status]?.label || view.status}</span>}
            </DialogTitle>
          </DialogHeader>
          {view && (
            <div className="space-y-3 text-sm">
              <div className="bg-muted rounded-lg p-3 space-y-1">
                <div><strong>{view.cliente_nome || "-"}</strong></div>
                {view.cliente_whatsapp && <div className="text-xs text-muted-foreground">{view.cliente_whatsapp}</div>}
                <div className="text-xs">Tipo: <strong className="capitalize">{view.tipo}</strong></div>
                {view.endereco && (
                  <div className="text-xs text-muted-foreground">
                    📍 {view.endereco.rua}, {view.endereco.numero}
                    {view.endereco.complemento ? ` - ${view.endereco.complemento}` : ""}
                    {view.endereco.bairro ? ` • ${view.endereco.bairro}` : ` • ${view.bairro_nome ?? ""}`}
                    {view.endereco.cidade ? ` • ${view.endereco.cidade}/${view.endereco.uf || ""}` : ""}
                    {view.endereco.cep ? ` • CEP ${view.endereco.cep}` : ""}
                  </div>
                )}
              </div>
              <div className="border-t pt-2">
                {(view.items as any[]).map((i, idx) => (
                  <div key={idx} className="py-1.5 border-b last:border-0">
                    <div className="flex justify-between"><span>{i.quantidade}x {i.nome}{i.size ? ` (${i.size.label})` : ""}</span><span>{fmtBRL(i.preco_unit * i.quantidade)}</span></div>
                    {i.addons?.length > 0 && <div className="text-xs text-muted-foreground">+ {i.addons.map((a: any) => a.nome).join(", ")}</div>}
                    {i.observacoes && <div className="text-xs italic">"{i.observacoes}"</div>}
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs"><span>Subtotal</span><span>{fmtBRL(view.subtotal)}</span></div>
                <div className="flex justify-between text-xs"><span>Entrega</span><span>{fmtBRL(view.taxa_entrega || 0)}</span></div>
                <div className="font-bold flex justify-between"><span>Total</span><span>{fmtBRL(view.total)}</span></div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Pagamento: <strong className="text-foreground uppercase">{view.pagamento}</strong></span>
                {view.cpf_nota && <span>CPF: {view.cpf_nota}</span>}
              </div>

              <div className="border rounded-lg p-3 space-y-2">
                <div className="font-medium text-sm">Comprovante de pagamento</div>
                {view.payment_proof_path ? (
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="h-4 w-4 text-green-600" />
                    {proofUrl ? (
                      <a href={proofUrl} target="_blank" rel="noreferrer" className="text-sm text-primary inline-flex items-center gap-1">
                        Visualizar comprovante <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : <span className="text-xs text-muted-foreground">Carregando…</span>}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">Cliente ainda não enviou comprovante.</div>
                )}
              </div>

              <div className="space-y-2 pt-2 border-t">
                <label className="text-xs font-medium">Atualizar status</label>
                <select
                  className="w-full text-sm border rounded px-2 py-2 bg-card"
                  value={view.status}
                  onChange={(e) => { setStatus(view.id, e.target.value); setView({ ...view, status: e.target.value }); }}
                >
                  <option value="pendente">Pendente</option>
                  <option value="aprovado">Aprovado (pago)</option>
                  <option value="preparando">Preparando</option>
                  <option value="saiu">Saiu para entrega</option>
                  <option value="concluido">Concluído</option>
                  <option value="cancelado">Cancelado</option>
                </select>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => printCupom80(view, store)}><Printer className="h-3 w-3 mr-1" /> Cupom</Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => printA4(view, store)}><FileText className="h-3 w-3 mr-1" /> A4</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}