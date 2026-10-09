export type CanvasPositions = Record<string, { x: number; y: number }>;

export function parseCanvasPositions(saved: string | null): CanvasPositions {
  try {
    const value: unknown = JSON.parse(saved || "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value).filter(([, position]) =>
        position && typeof position === "object" &&
        typeof position.x === "number" && Number.isFinite(position.x) &&
        typeof position.y === "number" && Number.isFinite(position.y),
      ).map(([id, position]) => [id, { x: position.x, y: position.y }]),
    );
  } catch {
    return {};
  }
}
