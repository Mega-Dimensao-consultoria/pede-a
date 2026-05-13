export type Horarios = Record<string, { ativo: boolean; abre: string; fecha: string }>;

export function isStoreOpen(horarios: Horarios | null | undefined, now = new Date()): boolean {
  if (!horarios) return true;
  const dow = String(now.getDay());
  const cfg = horarios[dow];
  if (!cfg || !cfg.ativo) return false;
  const [aH, aM] = cfg.abre.split(":").map(Number);
  const [fH, fM] = cfg.fecha.split(":").map(Number);
  const cur = now.getHours() * 60 + now.getMinutes();
  const open = aH * 60 + aM;
  const close = fH * 60 + fM;
  return cur >= open && cur < close;
}

export const DOW_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];