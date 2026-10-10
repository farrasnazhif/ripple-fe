export function outputHistory<T extends { id: string; created_at?: string }>(versions: T[]) {
  return [...versions].sort((a, b) => Date.parse(b.created_at || "") - Date.parse(a.created_at || "")).slice(0, 2);
}
