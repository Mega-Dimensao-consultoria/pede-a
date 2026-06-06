import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://pedeai.megadimensao.com.br";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () => {
        const body = [
          "User-agent: *",
          "Allow: /",
          "",
          "Disallow: /admin/",
          "Disallow: /conta",
          "Disallow: /carrinho",
          "Disallow: /checkout",
          "Disallow: /pedido/",
          "Disallow: /sucesso/",
          "Disallow: /recuperar",
          "Disallow: /api/",
          "Disallow: /lovable/",
          "",
          `Sitemap: ${BASE_URL}/sitemap.xml`,
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