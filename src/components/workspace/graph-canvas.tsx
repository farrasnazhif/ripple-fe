"use client";

import { useState } from "react";
import { FileText, Film, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GraphNode } from "@/types/ripple";
import { nodeHeight, nodePosition, nodeWidth, shotHeight } from "@/lib/graph-layout";

type CanvasItem = { id: string; title: string; summary: string; status?: string; x: number; y: number; kind: "source" | "stage" | "shot" };

export function GraphCanvas({ projectName, description, summary, fileCount, shots, onSelect }: {
  projectName: string;
  description: string;
  summary?: string;
  fileCount: number;
  shots: GraphNode[];
  onSelect: (id: string) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const items: CanvasItem[] = [
    { id: "brief", title: "Brief", summary: description || "Project source material and references", status: `${fileCount} attachment${fileCount === 1 ? "" : "s"}`, ...nodePosition("brief"), kind: "source" },
    { id: "summary", title: "Brief Summary", summary: summary || "No confirmed summary yet", status: summary ? "Confirmed" : "Pending", ...nodePosition("summary"), kind: "stage" },
    { id: "storyboard", title: "Story Board", summary: "Explore brief points and the sample shot plan", status: `${shots.length} sample shots`, ...nodePosition("storyboard"), kind: "stage" },
    ...shots.map((shot, index) => ({ id: shot.id, title: `Clip ${index + 1}`, summary: shot.description || shot.label, status: shot.status || "Sample", ...nodePosition("shot", index), kind: "shot" as const })),
  ];
  const surfaceHeight = Math.max(700, 180 + shots.length * 215);
  const stages = items.slice(0, 3);
  const shotItems = items.slice(3);

  return <section className="relative flex min-h-[700px] flex-1 flex-col overflow-hidden rounded-[22px] border border-neutral-300 bg-white" aria-label={`${projectName} node canvas`}>
    <div className="border-b border-neutral-300 px-4 py-4 sm:px-8"><h1 className="text-3xl font-semibold tracking-tight">{projectName}</h1></div>
    <div className="border-b border-neutral-300 px-4 py-3 text-lg text-neutral-500 sm:px-8">Projects / {projectName}</div>
    <div className="min-h-[550px] flex-1 overflow-auto bg-[#f2f2f2] bg-[radial-gradient(#dfe2e0_1.6px,transparent_1.6px)] bg-size-[28px_28px]" tabIndex={0} aria-label="Scrollable project node canvas">
      <div style={{ width: 1300 * zoom, height: surfaceHeight * zoom }}>
        <div className="relative w-[1300px] origin-top-left" style={{ height: surfaceHeight, transform: `scale(${zoom})` }}>
          <svg className="pointer-events-none absolute top-0 left-0 overflow-visible [&_path]:fill-none [&_path]:stroke-neutral-700 [&_path]:stroke-[2.5]" width="1300" height={surfaceHeight} aria-hidden="true">
            {stages.slice(0, 2).map((item, index) => <path key={item.id} d={`M ${item.x + nodeWidth} ${item.y + nodeHeight / 2} H ${stages[index + 1].x}`} />)}
            {shotItems.map((item) => <path key={item.id} d={`M ${stages[2].x + nodeWidth} ${stages[2].y + nodeHeight / 2} C 958 ${stages[2].y + nodeHeight / 2}, 958 ${item.y + shotHeight / 2}, ${item.x} ${item.y + shotHeight / 2}`} />)}
          </svg>
          {items.map((item) => <button key={item.id} type="button" className={`absolute flex w-[226px] flex-col gap-2 rounded-[18px] border border-neutral-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline-emerald-500 ${item.kind === "shot" ? "h-[195px]" : "h-[178px]"}`} style={{ left: item.x, top: item.y }} onClick={() => onSelect(item.id)}>
            <span className="flex items-center gap-2 text-[13px] font-semibold">{item.kind === "shot" ? <Film size={17} /> : <FileText size={17} />} {item.title}</span>
            {item.kind === "shot" && <span className="flex-1 rounded-xl border border-neutral-300 bg-neutral-200" />}
            {item.kind !== "shot" && <span className="line-clamp-4 flex-1 overflow-hidden rounded-xl bg-neutral-100 p-2.5 text-[11px] leading-snug"><small className="block text-[10px] text-neutral-500">Summary</small>{item.summary}</span>}
            <span className={`rounded-lg px-2.5 py-1.5 text-[11px] ${item.kind === "stage" ? "bg-neutral-100 text-neutral-600" : "bg-yellow-100 text-yellow-900"}`}>{item.status}</span>
          </button>)}
        </div>
      </div>
    </div>
    <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-neutral-300 bg-white px-3 py-2 text-xs shadow-lg">
      <Button type="button" variant="outline" size="icon-sm" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(0.6, +(value - 0.1).toFixed(1)))}><Minus size={16} /></Button>
      <span>{Math.round(zoom * 100)}%</span>
      <Button type="button" variant="outline" size="icon-sm" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(1.4, +(value + 0.1).toFixed(1)))}><Plus size={16} /></Button>
    </div>
  </section>;
}
