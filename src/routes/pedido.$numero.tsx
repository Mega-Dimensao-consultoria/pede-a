import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Clock, ChefHat, CheckCircle2, Truck, PackageCheck, XCircle, Receipt } from "lucide-react";
import { useEffect } from "react";

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
        <Link to="/"><Button variant="ghost" className="w-full">Voltar ao cardápio</Button></Link>
      </div>
    </SiteShell>
  );
}