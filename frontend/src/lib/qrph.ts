export interface EmvTlvTag {
  tag: string;
  value: string;
}

export interface DynamicQrPhOptions {
  amount: number;
  invoiceNumber?: string;
  billingPeriod?: string;
  merchantName?: string;
  merchantCity?: string;
  baseEmvString?: string;
}

export const DEFAULT_QRPH_EMV_STRING =
  "00020101021127830012com.p2pqrpay0111GXCHPHM2XXX02089996440303152170200000006560417DWQM4TK3JDO2JZLCF5204601653036085802PH5912CH******N N.6007Sicayab610412346304F4E8";

/**
 * Formats an EMVCo Tag-Length-Value segment.
 */
export function formatTlv(tag: string, value: string): string {
  const safeValue = value.length > 99 ? value.slice(0, 99) : value;
  const length = String(safeValue.length).padStart(2, "0");
  return `${tag}${length}${safeValue}`;
}

/**
 * Computes the EMVCo CRC-16/CCITT-FALSE checksum (polynomial 0x1021, initial 0xFFFF)
 * over the payload up to and including the `"6304"` CRC header.
 */
export function computeEmvCrc16(payloadWithoutCrcValue: string): string {
  const bytes = new TextEncoder().encode(payloadWithoutCrcValue);
  let crc = 0xffff;

  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i] << 8;
    for (let bit = 0; bit < 8; bit++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function parseEmvTlvTags(emv: string): EmvTlvTag[] {
  const tags: EmvTlvTag[] = [];
  let cursor = 0;

  while (cursor + 4 <= emv.length) {
    const tag = emv.slice(cursor, cursor + 2);
    const len = parseInt(emv.slice(cursor + 2, cursor + 4), 10);
    if (Number.isNaN(len) || len < 0 || cursor + 4 + len > emv.length) {
      break;
    }
    const value = emv.slice(cursor + 4, cursor + 4 + len);
    tags.push({ tag, value });
    cursor += 4 + len;
  }

  return tags;
}

function upsertTagAfter(
  tags: EmvTlvTag[],
  tag: string,
  value: string,
  afterTag?: string,
): void {
  const existing = tags.find((entry) => entry.tag === tag);
  if (existing) {
    existing.value = value;
    return;
  }

  if (afterTag) {
    const idx = tags.findIndex((entry) => entry.tag === afterTag);
    if (idx !== -1) {
      tags.splice(idx + 1, 0, { tag, value });
      return;
    }
  }

  tags.push({ tag, value });
}

function serializeWithCrc(tags: EmvTlvTag[]): string {
  const body = tags
    .filter((entry) => entry.tag !== "63")
    .map((entry) => formatTlv(entry.tag, entry.value))
    .join("");
  const payloadWithCrcHeader = `${body}6304`;
  return `${payloadWithCrcHeader}${computeEmvCrc16(payloadWithCrcHeader)}`;
}

/**
 * Converts a static or pre-existing EMVCo QR Ph string into a dynamic-amount QR Ph
 * string by setting Point of Initiation (`01`) to `12`, currency (`53`) to PHP (`608`),
 * injecting amount (`54`), optional bill number (`62.01`), and recomputing CRC-16 (`63`).
 */
export function injectDynamicAmountIntoEmvQrPh(
  rawEmv: string,
  amount: number,
  invoiceNumber?: string,
): string {
  const cleaned = rawEmv.trim();
  const isP2pQr = cleaned.includes("com.p2pqrpay");
  const tags = parseEmvTlvTags(cleaned).filter((entry) => entry.tag !== "63");

  // Preserve Point of Initiation "11" on GCash P2P QR Ph codes so P2P validation succeeds
  upsertTagAfter(tags, "01", isP2pQr ? "11" : "12", "00");
  upsertTagAfter(tags, "53", "608", "52");

  const numericAmount = Number(amount);
  const amountIdx = tags.findIndex((entry) => entry.tag === "54");
  if (Number.isFinite(numericAmount) && numericAmount > 0) {
    upsertTagAfter(tags, "54", numericAmount.toFixed(2), "53");
  } else if (amountIdx !== -1) {
    tags.splice(amountIdx, 1);
  }

  const cleanInvoice = invoiceNumber?.trim().slice(0, 25);
  if (cleanInvoice && !isP2pQr) {
    const tag62 = tags.find((entry) => entry.tag === "62");
    const subTags = tag62 ? parseEmvTlvTags(tag62.value) : [];
    const hasBillNumber = subTags.some((sub) => sub.tag === "01");
    if (!hasBillNumber) {
      subTags.unshift({ tag: "01", value: cleanInvoice });
      const encoded62 = subTags
        .map((sub) => formatTlv(sub.tag, sub.value))
        .join("");
      if (tag62) {
        tag62.value = encoded62;
      } else {
        tags.push({ tag: "62", value: encoded62 });
      }
    }
  }

  return serializeWithCrc(tags);
}

/**
 * Builds an EMVCo-compliant dynamic QR Ph payload string for RentTrack billing.
 * When `baseEmvString` (or `NEXT_PUBLIC_QRPH_EMV_STRING`) is provided, injects the
 * dynamic bill amount and invoice reference into that merchant QR Ph payload.
 */
export function buildDynamicQrPhPayload({
  amount,
  invoiceNumber,
  billingPeriod,
  merchantName = "RentTrack",
  merchantCity = "Manila",
  baseEmvString,
}: DynamicQrPhOptions): string {
  const candidateBase = (
    baseEmvString ||
    process.env.NEXT_PUBLIC_QRPH_EMV_STRING ||
    DEFAULT_QRPH_EMV_STRING
  ).trim();

  if (candidateBase.startsWith("000201")) {
    return injectDynamicAmountIntoEmvQrPh(
      candidateBase,
      amount,
      invoiceNumber,
    );
  }

  const merchantAccountInfo = [
    formatTlv("00", "ph.ppmi.p2m"),
    formatTlv("01", "RENTTRACK"),
  ].join("");

  const tags: EmvTlvTag[] = [
    { tag: "00", value: "01" },
    { tag: "01", value: "12" },
    { tag: "26", value: merchantAccountInfo },
    { tag: "52", value: "6513" },
    { tag: "53", value: "608" },
  ];

  const numericAmount = Number(amount);
  if (Number.isFinite(numericAmount) && numericAmount > 0) {
    tags.push({ tag: "54", value: numericAmount.toFixed(2) });
  }

  tags.push(
    { tag: "58", value: "PH" },
    { tag: "59", value: (merchantName || "RentTrack").trim().slice(0, 25) },
    { tag: "60", value: (merchantCity || "Manila").trim().slice(0, 15) },
  );

  const additionalSubTags: EmvTlvTag[] = [];
  if (invoiceNumber?.trim()) {
    additionalSubTags.push({
      tag: "01",
      value: invoiceNumber.trim().slice(0, 25),
    });
  }
  if (billingPeriod?.trim()) {
    additionalSubTags.push({
      tag: "08",
      value: billingPeriod.trim().slice(0, 25),
    });
  }

  if (additionalSubTags.length > 0) {
    tags.push({
      tag: "62",
      value: additionalSubTags
        .map((sub) => formatTlv(sub.tag, sub.value))
        .join(""),
    });
  }

  return serializeWithCrc(tags);
}
