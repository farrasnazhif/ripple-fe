import type {
  StoryboardShot,
  GenerationJob,
  ProjectReview,
} from "@/types/ripple";
export const nodeWidth = 246;
export const nodeHeight = 220;
export function nodePosition(kind: "brief" | "summary") {
  return { x: kind === "brief" ? 40 : 370, y: 180 };
}
export type CanvasItem = {
  id: string;
  parent?: string;
  parents?: string[];
  title: string;
  summary: string;
  status: string;
  x: number;
  y: number;
  kind: "source" | "stage";
  preview?: string;
  video?: boolean;
  review?: boolean;
};
export function projectCanvasNodes(
  description: string,
  rawText: string,
  fileCount: number,
  summary?: string,
  shots: StoryboardShot[] = [],
  jobs: GenerationJob[] = [],
  review?: ProjectReview,
): CanvasItem[] {
  const version = review?.versions[0]?.version;
  const nodes: CanvasItem[] = [
    {
      id: "brief",
      title: "Brief",
      summary:
        rawText || description || "Add your source material and references",
      status: `${fileCount} files · Current`,
      ...nodePosition("brief"),
      kind: "source",
    },
  ];
  if (!summary?.trim()) return nodes;
  nodes.push({
    id: "summary",
    parent: "brief",
    title: "Brief Summary",
    summary,
    status: `${review?.points.length || 0} confirmed requirements`,
    ...nodePosition("summary"),
    kind: "stage",
  });
  if (review?.output_type === "image") {
    const completed = review.finals.filter((output) => output.kind === "image" &&
      (!output.status || output.status === "completed") && output.outputs.length);
    const final = completed.find((output) => output.accepted !== false) || completed[0];
    const inputsChanged = final?.job_ids.some((id) => !jobs.some((job) => job.id === id && job.accepted));
    if (final) nodes.push({
      id: "final", parent: "summary",
      title: final.outputs.length > 1 ? "Final Images" : "Final Image",
      summary: final.prompt || summary,
      status: `Brief v${final.brief_version} · ${(version && final.brief_version < version) || inputsChanged ? "Earlier version" : final.accepted === false ? "Pending approval" : "Ready"}`,
      x: 700, y: 180, kind: "stage", preview: final.outputs[0],
    });
    return nodes;
  }
  if (!shots.length) return nodes;
  nodes.push({
    id: "storyboard",
    parent: "summary",
    title: "Storyboard",
    summary: shots.map((s) => s.title).join(" · "),
    status: `${shots.length} shots`,
    x: 700,
    y: 180,
    kind: "stage",
  });
  const groups = new Map<string, GenerationJob[]>();
  for (const job of jobs.filter(
    (j) =>
      j.status === "completed" &&
      j.outputs.length &&
      (!review?.output_type ||
        review.output_type === "mixed" ||
        j.kind === review.output_type),
  )) {
    const key = `${job.shot_id}:${job.kind}`;
    groups.set(key, [...(groups.get(key) || []), job]);
  }
  for (const [key, versions] of groups) {
    const job = versions.find((j) => j.accepted) || versions.at(-1)!;
    const impact = review?.changes
      .filter((c) => c.brief_version > job.brief_version)
      .flatMap((c) => c.impacts)
      .filter((i) => i.shot_id === job.shot_id && i.status === "needs_review");
    const resolved = review?.decisions.some(
      (d) =>
        d.shot_id === job.shot_id &&
        d.job_id === job.id &&
        d.brief_version === version &&
        ["keep", "accept"].includes(d.action),
    );
    const needsReview = !!impact?.length && !resolved;
    nodes.push({
      id: key,
      parent: "storyboard",
      title: `${job.kind === "video" ? "Clip" : "Image"} ${shots.find((s) => s.id === job.shot_id)?.position || 1}`,
      summary: shots.find((s) => s.id === job.shot_id)?.title || job.prompt,
      status: `Brief v${job.brief_version} · ${needsReview ? "Needs review" : job.accepted ? "Accepted" : "Pending approval"} · ${versions.length} versions`,
      x: 1030,
      y:
        80 +
        (groups.size > 1 ? nodes.filter((n) => n.preview).length * 270 : 100),
      kind: "stage",
      preview: job.outputs[0],
      video: job.kind === "video",
      review: needsReview,
    });
  }
  const final = review?.finals.find((output) => output.accepted !== false && (!output.status || output.status === "completed"));
  const finalSelectionChanged = final?.job_ids.some(
    (id) => !jobs.some((job) => job.id === id && job.accepted),
  );
  if (final) {
    nodes.push({
      id: "final",
      parents: final.job_ids
        .map((id) => {
          const job = jobs.find((j) => j.id === id);
          return job ? `${job.shot_id}:${job.kind}` : "";
        })
        .filter(Boolean),
      title: final.kind === "video" ? "Final Video" : "Final Images",
      summary: final.parent_id ? final.prompt || "Refined final output" : "Accepted outputs in plan order",
      status: `Brief v${final.brief_version}${(version && final.brief_version < version) || finalSelectionChanged ? " · Earlier version" : " · Ready"}`,
      x: 1360,
      y: 180,
      kind: "stage",
      preview: final.download_url || final.outputs[0],
      video: final.kind === "video",
    });
  }
  return nodes;
}
