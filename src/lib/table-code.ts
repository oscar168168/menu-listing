const TABLE_CODE_RE = /^[a-zA-Z0-9_-]{1,24}$/;

export function sanitizeTableCode(
  raw: string | null | undefined
): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return TABLE_CODE_RE.test(trimmed) ? trimmed : undefined;
}

export function parseTableCodeFromSearch(search: string): string {
  if (!search) return "";
  const raw = new URLSearchParams(search).get("table");
  return sanitizeTableCode(raw) ?? "";
}
