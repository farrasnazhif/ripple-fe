"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import Image from "next/image";
import { FileText, Minus, Plus, History, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  nodeHeight,
  nodeWidth,
  projectCanvasNodes,
  type CanvasItem,
} from "@/lib/graph-layout";
import { zoomCanvasAt } from "@/lib/canvas-viewport";

import type {
  StoryboardShot,
  GenerationJob,
  ProjectReview,
} from "@/types/ripple";

type Drag = {
  pointerId: number;
  id?: string;
  startX: number;
  startY: number;
  x: number;
  y: number;
  zoom: number;
  moved: boolean;
};

export function GraphCanvas({
  projectName,
  description,
  rawText,
  summary,
  fileCount,
  shots,
  jobs,
  review,
  onSelect,
}: {
  projectName: string;
  description: string;
  rawText: string;
  summary?: string;
  fileCount: number;
  shots?: StoryboardShot[];
  jobs?: GenerationJob[];
  review?: ProjectReview;
  onSelect: (id: string) => void;
}) {
  const element = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [positions, setPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [dragging, setDragging] = useState(false);
  // shortcut: node positions stay in this mounted canvas, persist them when project graphs are stored.
  const initialItems = projectCanvasNodes(
    description,
    rawText,
    fileCount,
    summary,
    shots,
    jobs,
    review,
  );
  const items = initialItems.map((item) => ({
    ...item,
    ...positions[item.id],
  }));
  const surfaceHeight = Math.max(700, ...items.map((item) => item.y + 250));
  const surfaceWidth = Math.max(
    1300,
    ...items.map((item) => item.x + nodeWidth + 100),
  );

  useEffect(() => {
    const canvas = element.current;
    if (!canvas) return;
    function wheel(event: WheelEvent) {
      event.preventDefault();
      const bounds = canvas!.getBoundingClientRect();
      const unit =
        event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? bounds.height : 1;
      setViewport((current) =>
        event.ctrlKey || event.metaKey
          ? zoomCanvasAt(
              current,
              { x: event.clientX - bounds.left, y: event.clientY - bounds.top },
              current.zoom * Math.exp(-event.deltaY * unit * 0.01),
            )
          : {
              ...current,
              x: current.x - event.deltaX * unit,
              y: current.y - event.deltaY * unit,
            },
      );
    }
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => canvas.removeEventListener("wheel", wheel);
  }, []);

  function start(event: PointerEvent<HTMLElement>, item?: CanvasItem) {
    if (event.button !== 0 || !event.isPrimary) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    suppressClick.current = false;
    drag.current = {
      pointerId: event.pointerId,
      id: item?.id,
      startX: event.clientX,
      startY: event.clientY,
      x: item?.x ?? viewport.x,
      y: item?.y ?? viewport.y,
      zoom: viewport.zoom,
      moved: false,
    };
    setDragging(true);
  }

  function move(event: PointerEvent<HTMLElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    if (Math.hypot(dx, dy) > 4) current.moved = true;
    if (!current.moved) return;
    if (current.id) {
      setPositions((saved) => ({
        ...saved,
        [current.id!]: {
          x: current.x + dx / current.zoom,
          y: current.y + dy / current.zoom,
        },
      }));
    } else {
      setViewport((saved) => ({
        ...saved,
        x: current.x + dx,
        y: current.y + dy,
      }));
    }
  }

  function stop(event: PointerEvent<HTMLElement>) {
    if (drag.current?.pointerId !== event.pointerId) return;
    suppressClick.current = drag.current.moved;
    drag.current = null;
    setDragging(false);
  }

  function zoomBy(amount: number) {
    const canvas = element.current;
    if (!canvas) return;
    setViewport((current) =>
      zoomCanvasAt(
        current,
        { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 },
        current.zoom + amount,
      ),
    );
  }

  function connection(from: CanvasItem, to: CanvasItem) {
    const x1 = from.x + nodeWidth,
      y1 = from.y + nodeHeight / 2;
    const x2 = to.x,
      y2 = to.y + nodeHeight / 2;
    const bend = Math.max(50, Math.abs(x2 - x1) / 2);
    return `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`;
  }

  return (
    <section
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
      aria-label={`${projectName} node canvas`}
    >
      <div
        ref={element}
        className={`relative min-h-0 flex-1 touch-none overflow-hidden bg-[#f2f2f2] bg-[radial-gradient(#dfe2e0_1.6px,transparent_1.6px)] ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        style={{
          backgroundPosition: `${viewport.x}px ${viewport.y}px`,
          backgroundSize: `${28 * viewport.zoom}px ${28 * viewport.zoom}px`,
        }}
        tabIndex={0}
        aria-label="Project canvas. Drag background or use arrow keys to pan, scroll with two fingers to pan, pinch to zoom, or drag a node to move it."
        onPointerDown={(event) => start(event)}
        onPointerMove={move}
        onPointerUp={stop}
        onPointerCancel={stop}
        onLostPointerCapture={stop}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          const delta = {
            ArrowLeft: [80, 0],
            ArrowRight: [-80, 0],
            ArrowUp: [0, 80],
            ArrowDown: [0, -80],
          }[event.key];
          if (!delta) return;
          event.preventDefault();
          setViewport((current) => ({
            ...current,
            x: current.x + delta[0],
            y: current.y + delta[1],
          }));
        }}
      >
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{
            width: surfaceWidth,
            height: surfaceHeight,
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          }}
        >
          <svg
            className="pointer-events-none absolute top-0 left-0 overflow-visible [&_path]:fill-none [&_path]:stroke-neutral-700 [&_path]:stroke-[2.5]"
            width={surfaceWidth}
            height={surfaceHeight}
            aria-hidden="true"
          >
            {items.flatMap((item) =>
              (item.parents || (item.parent ? [item.parent] : [])).map((id) => {
                const parent = items.find((node) => node.id === id);
                return parent ? (
                  <path
                    key={`${id}:${item.id}`}
                    d={connection(parent, item)}
                    style={{
                      stroke: ["summary", "storyboard"].includes(item.id)
                        ? "#15b995"
                        : undefined,
                    }}
                  />
                ) : null;
              }),
            )}
          </svg>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="absolute flex h-[220px] w-[246px] touch-none flex-col gap-2 rounded-md border border-neutral-200 bg-white p-3 text-left shadow-sm select-none  focus-visible:outline-emerald-500 active:cursor-grabbing"
              style={{
                left: item.x,
                top: item.y,
                borderStyle: item.id === "summary" ? "dashed" : undefined,
                borderWidth: item.id === "summary" ? 2 : 1,
              }}
              onPointerDown={(event) => start(event, item)}
              onClick={(event) => {
                if (suppressClick.current && event.detail !== 0) {
                  suppressClick.current = false;
                  return;
                }
                onSelect(item.id);
              }}
            >
              <span className="flex items-center gap-2 text-[13px] font-semibold">
                {item.video ? <Video size={17} /> : <FileText size={17} />}{" "}
                {item.title}
              </span>
              {item.preview ? (
                <span className="relative min-h-0 flex-1 overflow-hidden rounded-md border bg-neutral-100">
                  {item.video ? (
                    <video
                      src={item.preview}
                      muted
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Image
                      src={item.preview}
                      alt={item.summary}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  )}
                </span>
              ) : (
                <span className="line-clamp-5 flex-1 overflow-hidden rounded-md bg-neutral-100 p-3 text-[11px] leading-snug">
                  <small className="mb-1 block text-neutral-500">
                    {item.kind === "source" ? "Source" : "Summary"}
                  </small>
                  {item.summary}
                </span>
              )}
              <span
                className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-[11px] ${item.review || item.kind === "source" ? "bg-yellow-100 text-yellow-900" : "bg-neutral-100 text-neutral-600"}`}
              >
                <History size={14} /> {item.status}
              </span>
            </button>
          ))}
          <svg
            className="pointer-events-none absolute top-0 left-0 overflow-visible fill-neutral-700"
            width={surfaceWidth}
            height={surfaceHeight}
            aria-hidden="true"
          >
            {items.map((item) => (
              <g key={item.id}>
                {(item.parents || (item.parent ? [item.parent] : [])).some(
                  (id) => items.some((node) => node.id === id),
                ) && <circle cx={item.x} cy={item.y + nodeHeight / 2} r={5} />}
                {items.some(
                  (node) =>
                    node.parent === item.id || node.parents?.includes(item.id),
                ) && (
                  <circle
                    cx={item.x + nodeWidth}
                    cy={item.y + nodeHeight / 2}
                    r={5}
                  />
                )}
              </g>
            ))}
          </svg>
        </div>
      </div>
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs shadow-lg">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Zoom out"
          onClick={() => zoomBy(-0.1)}
        >
          <Minus size={16} />
        </Button>
        <span>{Math.round(viewport.zoom * 100)}%</span>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Zoom in"
          onClick={() => zoomBy(0.1)}
        >
          <Plus size={16} />
        </Button>
      </div>
    </section>
  );
}
