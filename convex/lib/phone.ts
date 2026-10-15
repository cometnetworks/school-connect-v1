/**
 * Normaliza un teléfono mexicano al formato que envía Kapso: "52" + 10 dígitos.
 * Acepta "9991234567", "+52 999 123 4567", "5219991234567" (formato móvil viejo).
 */
export function normalizeMxPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `52${digits}`;
  if (digits.length === 13 && digits.startsWith("521")) return `52${digits.slice(3)}`;
  return digits;
}

/** Variantes con las que un teléfono puede estar guardado en la tabla users */
export function phoneVariants(raw: string): string[] {
  const n = normalizeMxPhone(raw);
  const variants = [raw, n, `+${n}`];
  if (n.startsWith("52") && n.length === 12) variants.push(n.slice(2));
  return [...new Set(variants)];
}

export function samePhone(a: string, b: string): boolean {
  return normalizeMxPhone(a) === normalizeMxPhone(b);
}
