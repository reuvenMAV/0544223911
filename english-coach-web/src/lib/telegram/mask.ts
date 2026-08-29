/** Mask identifiers for logs — never log full Telegram IDs in plain text. */
export function maskId(value: number | string | null | undefined): string {
  if (value == null) return "—";
  const raw = String(value);
  if (raw.length <= 4) return "****";
  return `${"*".repeat(Math.min(raw.length - 4, 8))}${raw.slice(-4)}`;
}

export function maskLearnerId(learnerId: string | null | undefined): string {
  if (!learnerId) return "—";
  return `${learnerId.slice(0, 4)}…${learnerId.slice(-4)}`;
}
