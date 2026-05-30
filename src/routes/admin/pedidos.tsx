import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtBRL } from "@/lib/format";
import { Printer, FileText, FileCheck2, ExternalLink, Eye, ArrowRightCircle, Receipt } from "lucide-react";
import { printCupom80, printA4 } from "@/lib/print";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/pedidos")({ component: PedidosAdmin });

const STATUS_STYLES: Record<string, { badge: string; label: string }> = {
  pendente:   { badge: "bg-amber-500 text-white",   label: "Pendente" },
  aprovado:   { badge: "bg-blue-500 text-white",    label: "Aprovado" },
  preparando: { badge: "bg-orange-500 text-white",  label: "Preparando" },
  pronto:     { badge: "bg-emerald-500 text-white", label: "Pronto" },
  saiu:       { badge: "bg-purple-500 text-white",  label: "Saiu" },
  concluido:  { badge: "bg-green-600 text-white",   label: "Concluído" },
  pago:       { badge: "bg-green-700 text-white",   label: "Pago" },
  cancelado:  { badge: "bg-red-500 text-white",     label: "Cancelado" },
};
const ALL_STATUSES = ["pendente","aprovado","preparando","pronto","saiu","concluido","pago","cancelado"];

function PedidosAdmin() {
  const qc = useQueryClient();
  const { data: orders = [] } = useQuery({
    queryKey: ["admin_orders"],
    queryFn: async () => (await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(200)).data ?? [],
    refetchInterval: 10000,
  });
  const { data: store } = useQuery({ queryKey: ["store_config"], queryFn: async () => (await supabase.from("store_config").select("*").maybeSingle()).data });
  const modoComanda = !!(store as any)?.modo_comanda;

  useEffect(() => {
    const ch = supabase.channel("orders").on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => qc.invalidateQueries({ queryKey: ["admin_orders"] })).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const [view, setView] = useState<any>(null);
  const [statusOpen, setStatusOpen] = useState<any>(null);
  const [payOpen, setPayOpen] = useState<any>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [search, setSearch] = useState("");

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
    if (error) toast.error(error.message);
    else { toast.success("Status atualizado"); qc.invalidateQueries({ queryKey: ["admin_orders"] }); setStatusOpen(null); }
  };

  const filtered = (orders as any[]).filter((o) => {
    if (filterStatus !== "all" && o.status !== filterStatus) return false;
    if (filterTipo !== "all" && o.tipo !== filterTipo) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!String(o.numero).includes(s) && !(o.cliente_nome || "").toLowerCase().includes(s) && !(o.mesa || "").toLowerCase().includes(s)) return false;
    }
    return true;
  });

  return (
    <AdminShell>
      <div className="p-4 space-y-4">
        <h1 className="text-2xl font-bold">Pedidos {modoComanda && <span className="text-sm font-normal text-muted-foreground">· Modo Comanda</span>}</h1>

        <div className="flex flex-wrap gap-2 items-end bg-card border rounded-lg p-3">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs">Buscar</Label>
            <Input placeholder="Nº, nome ou mesa…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {ALL_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_STYLES[s]?.label || s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Tipo</Label>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="consumo_local">Consumo local</SelectItem>
                <SelectItem value="entrega">Entrega</SelectItem>
                <SelectItem value="retirada">Retirada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase">
                <tr>
                  <th className="text-left p-3">Nº</th>
                  <th className="text-left p-3">Cliente</th>
                  <th className="text-left p-3">Tipo</th>
                  <th className="text-left p-3">Mesa/End.</th>
                  <th className="text-left p-3">Total</th>
                  <th className="text-left p-3">Pgto</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Hora</th>
                  <th className="text-right p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Nenhum pedido</td></tr>
                )}
                {filtered.map((o: any) => {
                  const st = STATUS_STYLES[o.status] || STATUS_STYLES.pendente;
                  return (
                    <tr key={o.id} className="border-t hover:bg-muted/30">
                      <td className="p-3 font-bold">#{o.numero}</td>
                      <td className="p-3">{o.cliente_nome || "—"}</td>
                      <td className="p-3 capitalize text-xs">{String(o.tipo).replace("_", " ")}</td>
                      <td className="p-3 text-xs">{o.mesa ? `Mesa ${o.mesa}` : (o.bairro_nome || (o.endereco as any)?.bairro || "—")}</td>
                      <td className="p-3 font-semibold">{fmtBRL(o.total)}</td>
                      <td className="p-3 text-xs uppercase">{o.pagamento}{o.payment_proof_path && <FileCheck2 className="h-3 w-3 inline-block ml-1 text-green-600" />}</td>
                      <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full ${st.badge}`}>{st.label}</span></td>
                      <td className="p-3 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <Button size="sm" variant="ghost" onClick={() => setView(o)} title="Ver detalhes"><Eye className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setStatusOpen(o)} title="Mudar status"><ArrowRightCircle className="h-4 w-4" /></Button>
                        {modoComanda && o.status !== "pago" && (
                          <Button size="sm" variant="ghost" onClick={() => setPayOpen(o)} title="Registrar pagamento"><Receipt className="h-4 w-4" /></Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={!!statusOpen} onOpenChange={(v) => !v && setStatusOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Mudar status do pedido #{statusOpen?.numero}</DialogTitle></DialogHeader>
          {statusOpen && (
            <div className="grid grid-cols-2 gap-2">
              {ALL_STATUSES.map((s) => {
                const st = STATUS_STYLES[s];
                const isCurrent = statusOpen.status === s;
                return (
                  <button key={s} disabled={isCurrent} onClick={() => setStatus(statusOpen.id, s)}
                    className={`p-3 border rounded-lg text-sm font-medium transition ${isCurrent ? "bg-muted opacity-50" : "hover:border-primary"}`}>
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${st.badge}`} />
                    {st.label}{isCurrent && " (atual)"}
                  </button>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <RegisterPaymentModal order={payOpen} onClose={() => setPayOpen(null)} onDone={() => { qc.invalidateQueries({ queryKey: ["admin_orders"] }); setPayOpen(null); }} />

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
                <div className="text-xs">Tipo: <strong className="capitalize">{String(view.tipo).replace("_"," ")}</strong></div>
                {view.mesa && <div className="text-xs">Mesa: <strong>{view.mesa}</strong></div>}
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

              {view.pagamento_registrado && (
                <div className="border rounded-lg p-3 bg-green-50 dark:bg-green-950/30 text-xs space-y-1">
                  <div className="font-medium text-green-800 dark:text-green-300">Pagamento registrado</div>
                  <div>Valor: <strong>{fmtBRL(view.pagamento_registrado.valor)}</strong></div>
                  <div>Método: <strong className="uppercase">{view.pagamento_registrado.metodo}</strong></div>
                  {view.pagamento_registrado.observacao && <div>Obs: {view.pagamento_registrado.observacao}</div>}
                </div>
              )}

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
                  <div className="text-xs text-muted-foreground">{modoComanda ? "Pagamento no caixa." : "Cliente ainda não enviou comprovante."}</div>
                )}
              </div>

              <div className="space-y-2 pt-2 border-t">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => { const v = view; setView(null); setStatusOpen(v); }}><ArrowRightCircle className="h-4 w-4 mr-1" /> Mudar status</Button>
                  {modoComanda && view.status !== "pago" && (
                    <Button size="sm" className="flex-1" onClick={() => { const v = view; setView(null); setPayOpen(v); }}><Receipt className="h-4 w-4 mr-1" /> Registrar pagamento</Button>
                  )}
                </div>
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

function RegisterPaymentModal({ order, onClose, onDone }: { order: any; onClose: () => void; onDone: () => void }) {
  const [valor, setValor] = useState("");
  const [metodo, setMetodo] = useState("dinheiro");
  const [obs, setObs] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (order) {
      setValor(String(order.total ?? ""));
      setMetodo(order.pagamento || "dinheiro");
      setObs("");
    }
  }, [order?.id]);

  const save = async () => {
    const v = parseFloat(String(valor).replace(",", "."));
    if (!isFinite(v) || v <= 0) return toast.error("Valor inválido");
    setBusy(true);
    try {
      const { error } = await (supabase as any).rpc("register_order_payment", {
        _order_id: order.id, _valor: v, _metodo: metodo, _observacao: obs || null,
      });
      if (error) throw error;
      toast.success("Pagamento registrado");
      onDone();
    } catch (e: any) {
      toast.error(e.message || "Erro");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={!!order} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Registrar pagamento — Pedido #{order?.numero}</DialogTitle></DialogHeader>
        {order && (
          <div className="space-y-3">
            <div className="bg-muted rounded-lg p-3 text-sm">Total do pedido: <strong>{fmtBRL(order.total)}</strong></div>
            <div><Label>Valor recebido</Label><Input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" /></div>
            <div>
              <Label>Método</Label>
              <Select value={metodo} onValueChange={setMetodo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao_maquina">Cartão (maquininha)</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Observação (opcional)</Label><Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: Troco R$ 5,00" /></div>
            <Button onClick={save} disabled={busy} className="w-full">Marcar como pago</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
