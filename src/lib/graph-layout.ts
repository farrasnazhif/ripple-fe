import type { StoryboardShot, GenerationJob } from "@/types/ripple";
export const nodeWidth = 226;
export const nodeHeight = 178;

export function nodePosition(kind: "brief" | "summary") {
  if (kind === "brief") return { x: 60, y: 255 };
  return { x: 370, y: 255 };
}

export type CanvasItem = { id: string; parent?: string; title: string; summary: string; status: string; x: number; y: number; kind: "source" | "stage" };

export function projectCanvasNodes(description: string, rawText: string, fileCount: number, summary?: string, shots: StoryboardShot[] = [], jobs: GenerationJob[] = []): CanvasItem[] {
  const nodes: CanvasItem[] = [{ id: "brief", title: "Raw Brief", summary: rawText || description || "Project source material and references", status: `${fileCount} attachment${fileCount === 1 ? "" : "s"}`, ...nodePosition("brief"), kind: "source" }];
  if (summary?.trim()) nodes.push({ id: "summary", parent: "brief", title: "Brief Summary", summary, status: "Confirmed", ...nodePosition("summary"), kind: "stage" });
  if (summary?.trim() && shots.length) {
    nodes.push({ id: "storyboard", parent: "summary", title: "Storyboard", summary: shots.map((s) => s.title).join(" · "), status: `${shots.length} shots`, x: 680, y: 255, kind: "stage" });
    const completed = jobs.filter((job) => job.status === "completed" && job.outputs.length);
    completed.forEach((job, index) => nodes.push({ id: job.id, parent: "storyboard", title: `${shots.find((s) => s.id === job.shot_id)?.title || "Shot"} · ${job.kind}`, summary: job.prompt, status: "Completed", x: 990, y: 60 + index * 210, kind: "stage" }));
  }
  return nodes;
}
