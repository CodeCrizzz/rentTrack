function formatPhoneNumber(phone) {
  if (!phone || typeof phone !== "string" || !phone.trim()) return phone;

  let digits = phone.replace(/\D/g, "");

  if (digits.startsWith("63")) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (digits.length < 10) {
    if (digits.length === 0) return phone;
    const p1 = digits.slice(0, 3);
    const p2 = digits.slice(3, 6);
    const p3 = digits.slice(6, 10);
    return `+63 ${[p1, p2, p3].filter(Boolean).join(" ")}`.trim();
  }

  const target = digits.slice(0, 10);
  const p1 = target.slice(0, 3);
  const p2 = target.slice(3, 6);
  const p3 = target.slice(6, 10);

  return `+63 ${p1} ${p2} ${p3}`;
}

module.exports = { formatPhoneNumber };
