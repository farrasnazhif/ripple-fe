"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GraphCanvas } from "@/components/workspace/graph-canvas";
import { scenarios } from "@/constants/scenarios";
import { useGraph } from "@/hooks/use-graph";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Project } from "@/types/ripple";

export function Workspace({ project, token }: { project: Project; token: string }) {
  const [scenario, setScenario] = useState("s1");
  const [selected, setSelected] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState("");
  const { graph, error, loading } = useGraph(scenario, token);
  const brief = useQuery({ queryKey: ["brief", token, project.brief_id], queryFn: () => api.getBrief(project.brief_id, token) });
  const attachments = useQuery({ queryKey: ["attachments", token, project.brief_id], queryFn: () => api.attachments(project.brief_id, token) });
  const shots = graph?.nodes.filter((node) => node.kind === "shot") || [];
  const node = graph?.nodes.find((item) => item.id === selected);
  const title = selected === "brief" ? "Brief" : selected === "summary" ? "Brief Summary" : selected === "storyboard" ? "Story Board" : node ? `Clip ${shots.findIndex((shot) => shot.id === node.id) + 1}` : "";

  async function download(id: string) {
    setDownloadError("");
    try {
      const result = await api.downloadAttachment(project.brief_id, id, token);
      window.location.assign(result.download_url);
    } catch (cause) {
      setDownloadError(cause instanceof Error ? cause.message : "Could not download file.");
    }
  }

  return <main className="flex min-h-[calc(100vh-58px)] flex-col bg-white p-2.5 sm:p-5">
    <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-neutral-500">
      <span className="font-bold text-neutral-800">Node canvas</span>
      <label className="sm:ml-auto">Sample scenario <select className="ml-2 rounded-lg border border-neutral-300 bg-white px-3 py-1.5" value={scenario} onChange={(event) => setScenario(event.target.value)}>{scenarios.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <span className="rounded-full bg-yellow-100 px-2.5 py-1 text-yellow-900">Synthetic shot examples</span>
    </div>
    {loading && !graph ? <div className="p-10 text-neutral-500">Loading canvas…</div> : error || !graph ? <div className="p-10 text-red-700" role="alert">{error || "Canvas unavailable."}</div> : <GraphCanvas projectName={project.name} description={project.description} summary={brief.data?.summary} fileCount={attachments.data?.length || 0} shots={shots} onSelect={setSelected} />}
    <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
      <DialogContent className="max-h-[85vh] w-[min(600px,calc(100vw-32px))] max-w-[600px] overflow-y-auto rounded-2xl p-7">
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{selected === "brief" ? "Project source material" : selected === "summary" ? "Confirmed brief summary" : selected === "storyboard" ? "Sample graph context" : "Sample clip details"}</DialogDescription></DialogHeader>
        {selected === "brief" && <div className="grid gap-3 text-neutral-700"><p>{project.description || "No project description yet."}</p><h3 className="font-semibold text-neutral-900">Brief files</h3>{attachments.isPending ? <p>Loading files…</p> : attachments.isError ? <p role="alert">Could not load files: {attachments.error.message}</p> : attachments.data.length ? <ul className="grid gap-2">{attachments.data.map((file) => <li className="flex items-center gap-2" key={file.id}><Button type="button" variant="outline" onClick={() => void download(file.id)}>{file.file_name} ↗</Button><span className="text-xs text-neutral-500">{(file.size_bytes / 1024).toFixed(0)} KB</span></li>)}</ul> : <p>No files uploaded yet.</p>}{downloadError && <p role="alert">{downloadError}</p>}</div>}
        {selected === "summary" && <div className="grid gap-3 text-neutral-700">{brief.isPending ? <p>Loading summary…</p> : brief.isError ? <p role="alert">Could not load summary: {brief.error.message}</p> : <p>{brief.data.summary || "No summary has been confirmed for this project yet."}</p>}</div>}
        {selected === "storyboard" && <div className="grid gap-3 text-neutral-700"><p>The storyboard and clips below are sample graph data for exploring dependencies.</p><h3 className="font-semibold text-neutral-900">Brief points</h3><ul className="grid list-disc gap-2 pl-5">{graph?.nodes.filter((item) => item.kind === "point").map((item) => <li key={item.id}>{item.label}: {item.description}</li>)}</ul><h3 className="font-semibold text-neutral-900">Director note</h3><p>{graph?.note}</p></div>}
        {node?.kind === "shot" && <div className="grid gap-3 text-neutral-700"><p>{node.description}</p><p><strong>Status:</strong> {node.status || "Sample"}</p>{node.reasons?.length ? <><h3 className="font-semibold text-neutral-900">Why it matters</h3><ul className="grid list-disc gap-2 pl-5">{node.reasons.map((reason, index) => <li key={`${reason.point_key}-${index}`}>{reason.message}</li>)}</ul></> : null}</div>}
      </DialogContent>
    </Dialog>
  </main>;
}
