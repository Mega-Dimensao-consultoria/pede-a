// EMV BR Code "PIX Copia e Cola" generator
// Reference: BCB - Manual de Padrões para Iniciação do PIX

function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function sanitize(s: string, max: number) {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 .,-]/g, "")
    .trim()
    .slice(0, max);
}

export type PixParams = {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amount?: number;
  txid?: string;
  description?: string;
};

export function buildPixPayload({ pixKey, merchantName, merchantCity, amount, txid, description }: PixParams): string {
  const gui = tlv("00", "br.gov.bcb.pix");
  const key = tlv("01", pixKey.trim());
  const desc = description ? tlv("02", sanitize(description, 60)) : "";
  const merchantAccountInfo = tlv("26", gui + key + desc);

  const safeTxid = sanitize(txid || "***", 25).replace(/\s/g, "") || "***";
  const additional = tlv("62", tlv("05", safeTxid));

  const payloadNoCrc =
    tlv("00", "01") +
    tlv("26", gui + key + desc).slice(0) + // merchantAccountInfo already built; replace
    "";

  // Build properly
  const parts =
    tlv("00", "01") +
    merchantAccountInfo +
    tlv("52", "0000") +
    tlv("53", "986") +
    (amount && amount > 0 ? tlv("54", amount.toFixed(2)) : "") +
    tlv("58", "BR") +
    tlv("59", sanitize(merchantName, 25) || "RECEBEDOR") +
    tlv("60", sanitize(merchantCity, 15) || "BRASIL") +
    additional +
    "6304";

  void payloadNoCrc;
  return parts + crc16(parts);
}
