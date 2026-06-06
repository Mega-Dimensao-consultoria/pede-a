import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Clock, ChefHat, CheckCircle2, Truck, PackageCheck, XCircle, Receipt, QrCode, Copy, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { buildPixPayload } from "@/lib/pix";
import { fmtBRL } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/pedido/$numero")({ component: PedidoPublico });

const STATUS_INFO: Record<string, { label: string; desc: string; icon: any; color: string }> = {
  pendente:   { label: "Pendente",   desc: "Aguardando confirmação do restaurante", icon: Clock,         color: "text-amber-600" },
  aprovado:   { label: "Confirmado", desc: "Pagamento aprovado / pedido confirmado", icon: CheckCircle2,  color: "text-blue-600" },
  preparando: { label: "Preparando", desc: "Seu pedido está sendo preparado",        icon: ChefHat,       color: "text-orange-600" },
  pronto:     { label: "Pronto",     desc: "Pode retirar / vai sair para entrega",   icon: PackageCheck,  color: "text-emerald-600" },
  saiu:       { label: "Saiu para entrega", desc: "A caminho do endereço",           icon: Truck,         color: "text-purple-600" },
  concluido:  { label: "Concluído",  desc: "Pedido entregue",                        icon: CheckCircle2,  color: "text-green-600" },
  pago:       { label: "Pago",       desc: "Pagamento registrado pelo restaurante",  icon: Receipt,       color: "text-green-700" },
  cancelado:  { label: "Cancelado",  desc: "Pedido cancelado",                       icon: XCircle,       color: "text-red-600" },
};

function PedidoPublico() {
  const { numero } = Route.useParams();
  const num = parseInt(numero, 10);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["public_order", num],
    queryFn: async () => {
      const { data } = await (supabase as any).rpc("get_order_public_status", { _numero: num });
      return Array.isArray(data) ? data[0] : data;
    },
    refetchInterval: 15_000,
    enabled: !isNaN(num),
  });

  useEffect(() => {
    const ch = supabase.channel(`order-public-${num}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `numero=eq.${num}` }, () => refetch()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [num, refetch]);

  if (isLoading) return <SiteShell><div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div></SiteShell>;
  if (!data) return <SiteShell><div className="max-w-md mx-auto p-8 text-center space-y-3"><h1 className="text-xl font-bold">Pedido não encontrado</h1><Link to="/"><Button variant="outline">Voltar ao cardápio</Button></Link></div></SiteShell>;

  const info = STATUS_INFO[data.status] || STATUS_INFO.pendente;
  const Icon = info.icon;
  return (
    <SiteShell>
      <div className="max-w-md mx-auto p-4 space-y-4">
        <div className="bg-card border rounded-2xl p-6 text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Pedido</div>
          <div className="text-6xl font-bold text-primary my-2">#{data.numero}</div>
          {data.mesa && <div className="text-sm">Mesa <strong>{data.mesa}</strong></div>}
        </div>
        <div className={`bg-card border rounded-2xl p-6 text-center space-y-2`}>
          <Icon className={`h-12 w-12 mx-auto ${info.color}`} />
          <div className="text-xl font-bold">{info.label}</div>
          <div className="text-sm text-muted-foreground">{info.desc}</div>
        </div>
        <Button variant="outline" onClick={() => refetch()} className="w-full">
          <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
        </Button>
        {data.pagamento === "pix" && data.status === "pendente" && (
          <ComandaPix order={data} onUploaded={() => refetch()} />
        )}
        <Link to="/"><Button variant="ghost" className="w-full">Voltar ao cardápio</Button></Link>
      </div>
    </SiteShell>
  );
}

function ComandaPix({ order, onUploaded }: { order: any; onUploaded: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [payload, setPayload] = useState<string>("");
  const [pixInfo, setPixInfo] = useState<{ pix_key: string; merchant_name: string; merchant_city: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const uploaded = !!order.payment_proof_path;

  useEffect(() => {
    let cancelled = false;
    (supabase as any).rpc("get_pix_payment_info", { _order_id: order.id }).then(({ data, error }: any) => {
      if (cancelled) return;
      setLoading(false);
      if (error || !data) return;
      const row = Array.isArray(data) ? data[0] : data;
      setPixInfo(row);
    });
    return () => { cancelled = true; };
  }, [order.id]);

  useEffect(() => {
    if (!pixInfo?.pix_key) return;
    const p = buildPixPayload({
      pixKey: pixInfo.pix_key,
      merchantName: pixInfo.merchant_name || "RECEBEDOR",
      merchantCity: pixInfo.merchant_city || "BRASIL",
      amount: Number(order.total),
      txid: `PEDIDO${order.numero}`,
      description: `Pedido ${order.numero}`,
    });
    setPayload(p);
    QRCode.toDataURL(p, { width: 280, margin: 1 }).then(setQrDataUrl).catch(() => setQrDataUrl(null));
  }, [order, pixInfo]);

  const copy = () => {
    if (!payload) return;
    navigator.clipboard.writeText(payload);
    toast.success("Código PIX copiado");
  };

  const upload = async () => {
    if (!file) return toast.error("Selecione um arquivo");
    if (file.size > 8 * 1024 * 1024) return toast.error("Arquivo até 8MB");
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const path = `guest/${order.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { error: rpcErr } = await (supabase as any).rpc("comanda_attach_payment_proof", { _order_id: order.id, _path: path });
      if (rpcErr) throw rpcErr;
      toast.success("Comprovante enviado");
      onUploaded();
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="border rounded-2xl p-4 bg-card text-sm flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Carregando PIX…</div>;
  if (!pixInfo?.pix_key) return <div className="border rounded-2xl p-4 bg-card text-sm text-muted-foreground">Chave PIX não configurada. Pague no balcão.</div>;

  return (
    <div className="border rounded-2xl p-4 bg-card space-y-3">
      <div className="text-center">
        <h3 className="font-semibold flex items-center justify-center gap-2"><QrCode className="h-4 w-4" /> Pague com PIX</h3>
        <div className="text-sm text-muted-foreground">Total <strong className="text-foreground">{fmtBRL(order.total)}</strong></div>
      </div>
      {qrDataUrl ? (
        <img src={qrDataUrl} alt="QR Code PIX" className="mx-auto h-56 w-56" />
      ) : (
        <div className="h-56 w-56 mx-auto bg-muted rounded-lg flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
      )}
      <div>
        <div className="text-xs text-muted-foreground mb-1">PIX Copia e Cola</div>
        <div className="flex gap-2">
          <code className="flex-1 bg-muted px-2 py-2 rounded text-[10px] break-all max-h-20 overflow-auto">{payload}</code>
          <Button size="sm" variant="outline" onClick={copy}><Copy className="h-3 w-3" /></Button>
        </div>
      </div>
      <div className="border-t pt-3 space-y-2">
        {uploaded ? (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" /> Comprovante enviado. Aguarde aprovação.
          </div>
        ) : (
          <>
            <div className="text-sm font-medium">Enviar comprovante (ou pague direto no balcão)</div>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-muted file:text-foreground"
            />
            <Button onClick={upload} disabled={!file || busy} className="w-full">
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />} Enviar comprovante
            </Button>
          </>
        )}
      </div>
    </div>
  );
}