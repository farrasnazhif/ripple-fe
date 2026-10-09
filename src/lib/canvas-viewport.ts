export type CanvasViewport = { x: number; y: number; zoom: number };

export function zoomCanvasAt(viewport: CanvasViewport, point: { x: number; y: number }, requestedZoom: number): CanvasViewport {
  const zoom = Math.min(2, Math.max(0.25, requestedZoom));
  return {
    x: point.x - ((point.x - viewport.x) / viewport.zoom) * zoom,
    y: point.y - ((point.y - viewport.y) / viewport.zoom) * zoom,
    zoom,
  };
}
