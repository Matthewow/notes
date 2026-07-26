const ITEM_ID_PATTERN = /^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/

export function slugifyExpression(expression: string): string {
  const normalized = expression
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
  return normalized || "item"
}

export function isStructurallyValidItemId(id: string): boolean {
  return ITEM_ID_PATTERN.test(id)
}

export function nextItemId(
  date: string,
  expression: string,
  existingIds: Iterable<string>,
): string {
  const used = new Set(existingIds)
  const base = `${date}-${slugifyExpression(expression)}`
  if (!used.has(base)) {
    return base
  }

  let suffix = 2
  while (used.has(`${base}-${suffix}`)) {
    suffix += 1
  }
  return `${base}-${suffix}`
}
