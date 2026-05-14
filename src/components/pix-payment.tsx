import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Copy, QrCode, Upload, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { buildPixPayload } from "@/lib/pix";
import { fmtBRL } from "@/lib/format";

type Props = {
  order: any;
  store: any;
  onUploaded?: () => void;
};

export function PixPayment({ order, store, onUploaded }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [payload, setPayload] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploaded, setUploaded] = useState<boolean>(!!order?.payment_proof_path);

  useEffect(() => {
    if (!store?.pix_key) return;
    const p = buildPixPayload({
      pixKey: store.pix_key,
      merchantName: store.nome || "RECEBEDOR",
      merchantCity: store.cidade || "BRASIL",
      amount: Number(order.total),
      txid: `PEDIDO${order.numero}`,
      description: `Pedido ${order.numero}`,
    });
    setPayload(p);
    QRCode.toDataURL(p, { width: 280, margin: 1 }).then(setQrDataUrl).catch(() => setQrDataUrl(null));
  }, [order, store]);

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
      const path = `${order.user_id}/${order.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { error: updErr } = await supabase
        .from("orders")
        .update({ payment_proof_path: path, payment_proof_uploaded_at: new Date().toISOString() })
        .eq("id", order.id);
      if (updErr) throw updErr;
      setUploaded(true);
      toast.success("Comprovante enviado");
      onUploaded?.();
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar");
    } finally {
      setBusy(false);
    }
  };

  if (!store?.pix_key) {
    return <div className="text-sm text-muted-foreground">Chave PIX não configurada pela loja.</div>;
  }

  return (
    <div className="border rounded-xl p-4 bg-card space-y-3">
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
            <CheckCircle2 className="h-4 w-4" /> Comprovante enviado. Aguarde aprovação do restaurante.
          </div>
        ) : (
          <>
            <div className="text-sm font-medium">Enviar comprovante de pagamento</div>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-muted file:text-foreground"
            />
            <Button onClick={upload} disabled={!file || busy} className="w-full">
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />} Enviar
            </Button>
          </>
        )}
      </div>
    </div>
  );
}