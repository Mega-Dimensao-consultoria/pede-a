import { fmtBRL } from "./format";

function openPrint(html: string) {
  const w = window.open("", "_blank", "width=400,height=600");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); w.close(); }, 300);
}

export function printCupom80(order: any, store: any) {
  const items = (order.items || []) as any[];
  const rows = items.map((i) => `
    <div style="margin:4px 0">
      <div style="display:flex;justify-content:space-between"><span>${i.quantidade}x ${escapeHtml(i.nome)}${i.size ? ` (${escapeHtml(i.size.label)})` : ""}</span><span>${fmtBRL(i.preco_unit * i.quantidade)}</span></div>
      ${i.addons?.length ? `<div style="font-size:10px">+ ${i.addons.map((a: any) => escapeHtml(a.nome)).join(", ")}</div>` : ""}
      ${i.observacoes ? `<div style="font-size:10px;font-style:italic">"${escapeHtml(i.observacoes)}"</div>` : ""}
    </div>`).join("");
  const end = order.endereco ? `${escapeHtml(order.endereco.rua || "")}, ${escapeHtml(order.endereco.numero || "")} ${order.endereco.complemento ? "- " + escapeHtml(order.endereco.complemento) : ""}<br/>${escapeHtml(order.bairro_nome || "")}` : "Retirada na loja";
  openPrint(`<!doctype html><html><head><meta charset="utf-8"><title>Cupom #${order.numero}</title>
    <style>@page{size:80mm auto;margin:4mm}body{font-family:monospace;font-size:12px;width:72mm;margin:0}hr{border:none;border-top:1px dashed #000;margin:6px 0}.center{text-align:center}.b{font-weight:bold}</style>
    </head><body>
    <div class="center b">${escapeHtml(store?.nome || "Pede Aí")}</div>
    <div class="center" style="font-size:10px">${escapeHtml(store?.endereco || "")}</div>
    <hr/>
    <div class="b">PEDIDO #${order.numero}</div>
    <div>${new Date(order.created_at).toLocaleString("pt-BR")}</div>
    <div>Cliente: ${escapeHtml(order.cliente_nome || "-")}</div>
    <div>WhatsApp: ${escapeHtml(order.cliente_whatsapp || "-")}</div>
    <div>Tipo: ${escapeHtml(order.tipo)}</div>
    <div>${end}</div>
    <hr/>
    ${rows}
    <hr/>
    <div style="display:flex;justify-content:space-between"><span>Subtotal</span><span>${fmtBRL(order.subtotal)}</span></div>
    <div style="display:flex;justify-content:space-between"><span>Entrega</span><span>${fmtBRL(order.taxa_entrega || 0)}</span></div>
    <div style="display:flex;justify-content:space-between" class="b"><span>TOTAL</span><span>${fmtBRL(order.total)}</span></div>
    <hr/>
    <div>Pagamento: ${escapeHtml(order.pagamento)}</div>
    ${order.cpf_nota ? `<div>CPF: ${escapeHtml(order.cpf_nota)}</div>` : ""}
    <div class="center" style="margin-top:8px">Obrigado!</div>
    </body></html>`);
}

export function printA4(order: any, store: any) {
  const items = (order.items || []) as any[];
  const rows = items.map((i) => `<tr><td>${i.quantidade}</td><td>${escapeHtml(i.nome)}${i.size ? ` (${escapeHtml(i.size.label)})` : ""}${i.addons?.length ? `<br/><small>+ ${i.addons.map((a: any) => escapeHtml(a.nome)).join(", ")}</small>` : ""}${i.observacoes ? `<br/><small><em>"${escapeHtml(i.observacoes)}"</em></small>` : ""}</td><td style="text-align:right">${fmtBRL(i.preco_unit)}</td><td style="text-align:right">${fmtBRL(i.preco_unit * i.quantidade)}</td></tr>`).join("");
  openPrint(`<!doctype html><html><head><meta charset="utf-8"><title>Pedido #${order.numero}</title>
    <style>body{font-family:Arial,sans-serif;padding:24px;font-size:13px}h1{margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border-bottom:1px solid #ddd;padding:6px;text-align:left}.tot{font-weight:bold;font-size:16px;text-align:right;margin-top:12px}</style>
    </head><body>
    <h1>${escapeHtml(store?.nome || "Pede Aí")} — Pedido #${order.numero}</h1>
    <div>${new Date(order.created_at).toLocaleString("pt-BR")}</div>
    <hr/>
    <p><b>Cliente:</b> ${escapeHtml(order.cliente_nome || "-")} — ${escapeHtml(order.cliente_whatsapp || "-")}<br/>
    <b>Tipo:</b> ${escapeHtml(order.tipo)}<br/>
    ${order.endereco ? `<b>Endereço:</b> ${escapeHtml(order.endereco.rua || "")}, ${escapeHtml(order.endereco.numero || "")} ${order.endereco.complemento ? "- " + escapeHtml(order.endereco.complemento) : ""} — ${escapeHtml(order.bairro_nome || "")}` : ""}</p>
    <table><thead><tr><th>Qtd</th><th>Item</th><th style="text-align:right">Unit.</th><th style="text-align:right">Total</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="tot">Subtotal: ${fmtBRL(order.subtotal)}<br/>Entrega: ${fmtBRL(order.taxa_entrega || 0)}<br/>TOTAL: ${fmtBRL(order.total)}</div>
    <p><b>Pagamento:</b> ${escapeHtml(order.pagamento)}${order.cpf_nota ? ` — CPF: ${escapeHtml(order.cpf_nota)}` : ""}</p>
    </body></html>`);
}

function escapeHtml(s: any) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}