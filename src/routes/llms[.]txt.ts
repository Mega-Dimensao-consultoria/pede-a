import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () => {
        const body = [
          "# PedeAI",
          "",
          "> Cardápio digital e sistema de pedidos online para restaurantes, bares e lanchonetes — pedidos no balcão, mesa ou delivery com pagamento via PIX.",
          "",
          "PedeAI permite que clientes naveguem pelo cardápio, montem seus pedidos e paguem pelo PIX, com acompanhamento do status do pedido em tempo real. Suporta modo comanda digital (consumo no local com número de mesa) e modo delivery.",
          "",
          "## Pages",
          "",
          "- [Cardápio](/): Página inicial com o cardápio completo, categorias e produtos disponíveis.",
          "",
          "## Optional",
          "",
          "- [Acompanhar pedido](/pedido/): Página pública para acompanhar o status de um pedido pelo número.",
          "",
        ].join("\n");
        return new Response(body, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});