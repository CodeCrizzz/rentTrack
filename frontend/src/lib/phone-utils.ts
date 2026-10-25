/**
 * Universal Philippine Phone Number Formatter
 * Strict Target Format: +63 999 123 7654
 */

export function formatPhoneNumber(phone?: string | null, fallback = "—"): string {
  if (!phone || typeof phone !== "string" || !phone.trim()) return fallback;

  // Extract all digits
  let digits = phone.replace(/\D/g, "");

  // If starts with country code 63, strip it
  if (digits.startsWith("63")) {
    digits = digits.slice(2);
  }

  // If starts with leading zero (e.g. 0915...), strip it
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (digits.length === 0) return fallback;

  if (digits.length < 10) {
    const p1 = digits.slice(0, 3);
    const p2 = digits.slice(3, 6);
    const p3 = digits.slice(6, 10);
    return `+63 ${[p1, p2, p3].filter(Boolean).join(" ")}`.trim();
  }

  // Take exactly 10 digits
  const target = digits.slice(0, 10);
  const p1 = target.slice(0, 3);
  const p2 = target.slice(3, 6);
  const p3 = target.slice(6, 10);

  return `+63 ${p1} ${p2} ${p3}`;
}

/**
 * Interactive Input Mask / Formatter
 * Formats user input as: +63 999 123 7654
 */
export function formatPhoneInput(value: string): string {
  if (!value) return "";

  // Strip non-digits
  let digits = value.replace(/\D/g, "");

  // If user pasted/typed country code 63 at start, strip it
  if (digits.startsWith("63")) {
    digits = digits.slice(2);
  }

  // If user typed leading 0 (e.g. 09...), strip it
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  // Max 10 digits (Philippine mobile numbers are 10 digits without country code)
  digits = digits.slice(0, 10);

  if (digits.length === 0) return "";

  const p1 = digits.slice(0, 3);
  const p2 = digits.slice(3, 6);
  const p3 = digits.slice(6, 10);

  let formatted = `+63 ${p1}`;
  if (p2) formatted += ` ${p2}`;
  if (p3) formatted += ` ${p3}`;

  return formatted;
}
