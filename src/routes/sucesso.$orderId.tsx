import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/site-shell";
import { fmtBRL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { CheckCircle2, MessageCircle, Copy, Eye } from "lucide-react";
import { toast } from "sonner";
import { PixPayment } from "@/components/pix-payment";

export const Route = createFileRoute("/sucesso/$orderId")({ component: Sucesso });

function Sucesso() {
  const { orderId } = Route.useParams();
  const { data: order, isLoading, refetch } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => (await supabase.from("orders").select("*").eq("id", orderId).maybeSingle()).data,
  });
  const { data: store } = useQuery({
    queryKey: ["store_config"],
    queryFn: async () => (await supabase.from("store_config").select("*").maybeSingle()).data,
  });

  if (isLoading) return <SiteShell><div className="p-8 text-center">Carregando...</div></SiteShell>;
  if (!order) return <SiteShell><div className="p-8 text-center">Pedido não encontrado.</div></SiteShell>;

  const items = (order.items as any[]) || [];
  const resumo = [
    `*Pedido #${order.numero} — ${store?.nome || "Pede Aí"}*`,
    `Cliente: ${order.cliente_nome || "-"}`,
    `Tipo: ${order.tipo}`,
    order.endereco ? `Endereço: ${(order.endereco as any).rua}, ${(order.endereco as any).numero} — ${order.bairro_nome}` : "",
    "",
    ...items.map((i) => `• ${i.quantidade}x ${i.nome}${i.size ? ` (${i.size.label})` : ""} — ${fmtBRL(i.preco_unit * i.quantidade)}${i.addons?.length ? `\n   + ${i.addons.map((a: any) => a.nome).join(", ")}` : ""}${i.observacoes ? `\n   obs: ${i.observacoes}` : ""}`),
    "",
    `Subtotal: ${fmtBRL(order.subtotal)}`,
    `Entrega: ${fmtBRL(order.taxa_entrega || 0)}`,
    `*Total: ${fmtBRL(order.total)}*`,
    `Pagamento: ${order.pagamento}`,
  ].filter(Boolean).join("\n");

  const waNumber = (store?.whatsapp || "").replace(/\D/g, "");
  const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(resumo)}`;

  const copyResumo = () => { navigator.clipboard.writeText(resumo); toast.success("Resumo copiado"); };

  return (
    <SiteShell>
      <div className="max-w-xl mx-auto p-4 space-y-4">
        <div className="bg-card border rounded-xl p-6 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto text-primary mb-2" />
          <h1 className="text-2xl font-bold">Pedido confirmado!</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mt-3">Seu número de pedido</p>
          <div className="text-6xl font-bold text-primary my-1">#{order.numero}</div>
          {(order as any).mesa && <p className="text-sm">Mesa <strong>{(order as any).mesa}</strong></p>}
          <Link to="/pedido/$numero" params={{ numero: String(order.numero) }} className="inline-flex items-center gap-1 text-sm text-primary underline mt-2">
            <Eye className="h-3 w-3" /> Acompanhar status
          </Link>
        </div>

        {order.pagamento === "pix" && (
          <PixPayment order={order} store={store} onUploaded={() => refetch()} />
        )}

        <div className="bg-card border rounded-xl p-4 space-y-2">
          <h2 className="font-semibold">Resumo</h2>
          <pre className="whitespace-pre-wrap text-xs text-muted-foreground font-sans">{resumo}</pre>
          <div className="flex gap-2 pt-2">
            <Button onClick={copyResumo} variant="outline" className="flex-1"><Copy className="h-4 w-4 mr-2" /> Copiar</Button>
            {waNumber && <a href={waUrl} target="_blank" rel="noreferrer" className="flex-1"><Button className="w-full"><MessageCircle className="h-4 w-4 mr-2" /> Enviar no WhatsApp</Button></a>}
          </div>
        </div>

        <Link to="/"><Button variant="outline" className="w-full">Voltar ao cardápio</Button></Link>
      </div>
    </SiteShell>
  );
}