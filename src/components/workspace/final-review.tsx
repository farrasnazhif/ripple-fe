"use client";
import { useState } from "react";
import { Check, Download, FileText, SlidersHorizontal, Sparkles, Video } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MediaPreview } from "@/components/workspace/media-review";
import type { Brief, FinalOutput, GenerationJob, GenerationOperation } from "@/types/ripple";

export function FinalReview({ projectId, token, finals, brief, jobs, busy, run, runGeneration, onGenerationSubmitted, refresh, initialId }: {
  initialId?: string;
  projectId: string;
  token: string;
  finals: FinalOutput[];
  brief: Brief;
  jobs: GenerationJob[];
  busy: boolean;
  run: (fn: () => Promise<void>) => void;
  runGeneration: (operation: GenerationOperation, fn: () => Promise<void>) => void;
  onGenerationSubmitted: (id: string, status: string) => void;
  refresh: () => Promise<void>;
}) {
  const [id, setId] = useState(() => initialId || finals.find((final) => final.accepted !== false)?.id);
  const [imageIndex, setImageIndex] = useState(0);
  const [adjusting, setAdjusting] = useState(false);
  const [compare, setCompare] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [reason, setReason] = useState("");
  const selected = finals.find((final) => final.id === id) || finals[0];
  if (!selected) return <p>No saved final output yet.</p>;
  const video = selected.kind === "video";
  const source = finals.find((final) => final.id === selected.parent_id);
  const url = selected.download_url || selected.outputs[imageIndex];
  const sourceUrl = source?.download_url || source?.outputs[imageIndex];
  const active = finals.find((final) => ["submitting", "unknown", "queued", "in_progress"].includes(final.status || ""));
  const stale = selected.brief_version !== brief.version || selected.job_ids.some((jobId) => !jobs.some((job) => job.id === jobId && job.accepted));
  const completed = !selected.status || selected.status === "completed";
  const versions = [...finals].reverse();
  async function refine() {
    const storageKey = `ripple:final-refinement:${projectId}:${selected.id}:${imageIndex}`;
    const saved = sessionStorage.getItem(storageKey);
    const payload = saved ? JSON.parse(saved) as { request_key: string; image_index: number; prompt: string; reason: string }
      : { request_key: crypto.randomUUID(), image_index: imageIndex, prompt: prompt.trim(), reason: reason.trim() };
    if (payload.prompt !== prompt.trim() || payload.reason !== reason.trim()) {
      throw new Error("A previous submission may still be processing. Retry with its original instructions or reload to check the saved history.");
    }
    sessionStorage.setItem(storageKey, JSON.stringify(payload));
    try {
      const result = await api.refineFinal(projectId, selected.id, payload, token);
      onGenerationSubmitted(result.id, result.status || "submitting");
      sessionStorage.removeItem(storageKey);
      setId(result.id);
      setCompare(true);
      setAdjusting(false);
    } catch (error) {
      if (error instanceof ApiError && [400, 402, 404, 409, 503].includes(error.status)) sessionStorage.removeItem(storageKey);
      throw error;
    } finally {
      await refresh();
    }
  }
  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="grid content-start gap-4">
        <h3 className="font-semibold">{video ? "Final Video" : selected.outputs.length > 1 ? "Final Images" : "Final Image"} · Version {versions.findIndex((final) => final.id === selected.id) + 1}</h3>
        <p className="text-sm text-neutral-500">Brief v{selected.brief_version} · {selected.accepted !== false ? "Accepted" : completed ? "Pending approval" : selected.status}</p>
        {stale && <p className="text-sm text-amber-700">{video || selected.job_ids.length ? "The brief or accepted source outputs have changed. Review the affected shots and rebuild the final before refining or accepting this version." : "The brief summary has changed. Generate a new final image from the updated summary before refining or accepting this version."}</p>}
        {brief.summary && <p className="whitespace-pre-wrap text-sm">{brief.summary}</p>}
        {selected.prompt && <section className="grid gap-2 rounded-md border p-3 text-sm"><h4 className="font-medium">{selected.parent_id ? "Saved adjustments" : "Generation prompt"}</h4><p className="whitespace-pre-wrap">{selected.prompt}</p><p className="text-neutral-500">Reason: {selected.reason}</p></section>}
        {active && <p role="status" className="text-sm text-amber-700">{active.status === "unknown" || active.status === "submitting" ? "Submission is awaiting confirmation. Reload to check its saved status before sending another request." : "A refined final is generating. Its preview will appear here when ready."}</p>}
        {!completed && !active && <p role="alert" className="text-sm text-red-600">This refinement {selected.status === "nsfw" ? "was blocked by the provider" : `ended with status ${selected.status}`}. Select a completed version to try different adjustments.</p>}
        <Button variant="outline" disabled={busy || !!active || stale || !completed || !url} onClick={() => { setAdjusting(!adjusting); setPrompt(""); setReason(""); }}><SlidersHorizontal />Adjust / Refine</Button>
        {adjusting && <div className="grid gap-3">
          <label className="grid gap-2 text-sm">What would you like to change?
            <Textarea value={prompt} maxLength={10000} disabled={busy} onChange={(event) => setPrompt(event.target.value)} placeholder="Make the lighting warmer while preserving the composition." className="min-h-32" />
          </label>
          <label className="grid gap-2 text-sm">Reason for this revision
            <Textarea value={reason} maxLength={2000} disabled={busy} onChange={(event) => setReason(event.target.value)} placeholder="Explain why this final output needs an adjustment." />
          </label>
          <p className="text-xs text-neutral-500">{video ? "The selected final video" : "The selected image"} is sent as the reference. {video ? "This edits the combined video." : "Other images in this collection stay unchanged."}</p>
          <Button variant="generation" disabled={busy || !!active || stale || !prompt.trim() || !reason.trim()} onClick={() => runGeneration(video ? "video_refinement" : "image_refinement", refine)}><Sparkles />{busy ? "Submitting…" : "Generate refined final"}</Button>
        </div>}
        <Button disabled={busy || stale || !completed || !url || selected.accepted !== false} onClick={() => run(async () => { await api.acceptFinal(projectId, selected.id, token); await refresh(); })}><Check />{selected.accepted !== false ? "Accepted" : "Mark as accepted"}</Button>
        <p className="text-xs text-neutral-500">Accepting updates the Final Output node. Previous versions and the original image/clip nodes remain in history.</p>
      </div>
      <div className="grid min-w-0 content-start gap-4 lg:border-l lg:pl-6">
        {!video && selected.outputs.length > 1 && <Select items={selected.outputs.map((_, index) => ({ value: String(index), label: `Image ${index + 1}` }))} value={String(imageIndex)} onValueChange={(value) => { if (value !== null) setImageIndex(Number(value)); }}>
          <SelectTrigger aria-label="Choose final image"><SelectValue /></SelectTrigger>
          <SelectContent>{selected.outputs.map((_, index) => <SelectItem key={index} value={String(index)}>Image {index + 1}</SelectItem>)}</SelectContent>
        </Select>}
        {source && <Button variant="outline" onClick={() => setCompare(!compare)}>{compare ? "Hide source comparison" : "Compare with source"}</Button>}
        <div className={`grid gap-3 ${compare && sourceUrl ? "sm:grid-cols-2" : ""}`}>
          {compare && sourceUrl && <section className="grid content-start gap-2"><p className="text-sm font-medium">Source version</p><MediaPreview url={sourceUrl} video={video} /></section>}
          <section className="grid content-start gap-2">
            <p className="text-sm font-medium">{source ? "Refined version" : "Selected version"}</p>
            {url ? <MediaPreview url={url} video={video} /> : <div role="status" className="grid aspect-video place-items-center rounded-md border bg-neutral-50 text-sm text-neutral-500">{completed ? "Preview unavailable" : `Status: ${selected.status}`}</div>}
          </section>
        </div>
        {url && <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm underline"><Download size={16} />Open / download output</a>}
        <div className="flex gap-3 overflow-x-auto pb-2" aria-label="Final output version history">
          {versions.map((final, index) => {
            const preview = final.download_url || final.outputs[final.image_index || 0];
            return <button key={final.id} type="button" aria-label={`View final version ${index + 1}${final.accepted !== false ? ", accepted" : ""}`} aria-pressed={selected.id === final.id} disabled={busy}
              onClick={() => { setId(final.id); setImageIndex(final.image_index || 0); setAdjusting(false); setCompare(false); }}
              className={`relative h-24 w-28 shrink-0 overflow-hidden rounded-md border-2 bg-neutral-100 ${selected.id === final.id ? "border-emerald-500" : "border-neutral-200"}`}>
              {preview ? <MediaPreview url={preview} video={final.kind === "video"} thumbnail /> : <span className="flex h-full items-center justify-center">{final.kind === "video" ? <Video /> : <FileText />}</span>}
              <span className="absolute top-1 right-1 rounded-md bg-white px-1.5 text-xs">{index + 1}{final.accepted !== false && <Check className="inline size-3" />}</span>
            </button>;
          })}
        </div>
      </div>
    </div>
  );
}
