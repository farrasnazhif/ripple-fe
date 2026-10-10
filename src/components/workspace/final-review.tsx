"use client";
import { useState } from "react";
import { Check, FileText, Video } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { outputHistory } from "@/lib/output-versions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
  const kind = (finals.find(final => final.id === id) || finals[0])?.kind;
  const versions = outputHistory(finals.filter(final => final.kind === kind));
  const selected = versions.find((final) => final.id === id) || versions[0];
  if (!selected) return <p>No saved final output yet.</p>;
  const video = selected.kind === "video";
  const source = finals.find((final) => final.id === selected.parent_id);
  const url = selected.download_url || selected.outputs[imageIndex];
  const sourceUrl = source?.download_url || source?.outputs[imageIndex];
  const active = finals.find((final) => ["submitting", "unknown", "queued", "in_progress"].includes(final.status || ""));
  const stale = selected.brief_version !== brief.version || selected.job_ids.some((jobId) => !jobs.some((job) => job.id === jobId && job.accepted));
  const completed = !selected.status || selected.status === "completed";
  async function submitRevision(regenerate = false) {
    const storageKey = `ripple:final-${regenerate ? "regeneration" : "refinement"}:${projectId}:${selected.id}:${imageIndex}`;
    const saved = sessionStorage.getItem(storageKey);
    const payload = saved ? JSON.parse(saved) as { request_key: string; image_index: number; prompt: string; reason: string }
      : { request_key: crypto.randomUUID(), image_index: imageIndex, prompt: regenerate ? selected.prompt || "" : prompt.trim(), reason: regenerate ? "" : reason.trim() };
    if (payload.prompt !== (regenerate ? selected.prompt : prompt.trim()) || payload.reason !== (regenerate ? "" : reason.trim())) {
      throw new Error("A previous submission may still be processing. Retry with its original instructions or reload to check the saved history.");
    }
    sessionStorage.setItem(storageKey, JSON.stringify(payload));
    try {
      const result = regenerate
        ? await api.regenerateFinal(projectId, selected.id, { request_key: payload.request_key, image_index: payload.image_index }, token)
        : await api.refineFinal(projectId, selected.id, payload, token);
      onGenerationSubmitted(result.id, result.status || "submitting");
      sessionStorage.removeItem(storageKey);
      setId(result.id);
      setCompare(!regenerate);
      setAdjusting(false);
    } catch (error) {
      if (error instanceof ApiError && [400, 402, 404, 409, 503].includes(error.status)) sessionStorage.removeItem(storageKey);
      throw error;
    } finally {
      await refresh();
    }
  }
  return (
    <div className="grid min-h-0 min-w-0 flex-1 grid-rows-[minmax(0,1fr)_auto] gap-6 md:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.2fr)] md:grid-rows-1">
      <div className="grid min-h-0 content-start gap-4 overflow-y-auto pr-3">
        <h3 className="font-semibold">{video ? "Final Video" : selected.outputs.length > 1 ? "Final Images" : "Final Image"} · {versions[0].id === selected.id ? "Current" : "Version 1"}</h3>
        <p className="text-sm text-neutral-500">{selected.brief_version === brief.version ? "Current brief" : "Earlier brief"} · {selected.accepted !== false ? "Accepted" : completed ? "Pending approval" : selected.status}</p>
        {stale && <p className="text-sm text-amber-700">{video || selected.job_ids.length ? "The brief or accepted source outputs have changed. Review the affected shots and rebuild the final before refining or accepting this version." : "The brief summary has changed. Generate a new final image from the updated summary before refining or accepting this version."}</p>}
        {selected.prompt && <Accordion key={selected.id}>
          <AccordionItem value="prompt">
            <AccordionTrigger>{selected.parent_id ? "Saved adjustments" : "Generation prompt"}</AccordionTrigger>
            <AccordionContent>
              <p className="whitespace-pre-wrap break-words">{selected.prompt}</p>
              {selected.reason && <p className="text-neutral-500">Reason: {selected.reason}</p>}
            </AccordionContent>
          </AccordionItem>
        </Accordion>}
        {active && <p role="status" className="text-sm text-amber-700">{active.status === "unknown" || active.status === "submitting" ? "Submission is awaiting confirmation. Reload to check its saved status before sending another request." : "A refined final is generating. Its preview will appear here when ready."}</p>}
        {!completed && !active && <p role="alert" className="text-sm text-red-600">This refinement {selected.status === "nsfw" ? "was blocked by the provider" : `ended with status ${selected.status}`}. Select a completed version to try different adjustments.</p>}
        <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy || !!active || stale || !completed || !url} onClick={() => { setAdjusting(!adjusting); setPrompt(""); setReason(""); }}>Adjust / Refine</Button>
        <Button variant="generation"
          disabled={busy || !!active || stale || !completed || !selected.prompt?.trim() || (!!selected.parent_id && imageIndex !== (selected.image_index || 0))}
          onClick={() => runGeneration(selected.parent_id ? video ? "video_refinement" : "image_refinement" : video ? "video" : "image", () => submitRevision(true))}>
          Regenerate
        </Button>
        <Button disabled={busy || stale || !completed || !url || selected.accepted !== false} onClick={() => run(async () => { await api.acceptFinal(projectId, selected.id, token); await refresh(); })}>{selected.accepted !== false ? "Accepted" : "Mark as accepted"}</Button>
        </div>
        {source && <Button variant="outline" onClick={() => setCompare(!compare)}>{compare ? "Hide source comparison" : "Compare with source"}</Button>}
        {url && <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm underline">Open / download output</a>}
        {!selected.prompt?.trim() && <p className="text-xs text-neutral-500">This combined output has no single generation prompt. Regenerate its source clips or use Adjust / Refine.</p>}
        {adjusting && <div className="grid gap-3">
          <label className="grid gap-2 text-sm"><span>What would you like to change? <span aria-hidden="true" className="text-destructive">*</span></span>
            <Textarea required value={prompt} maxLength={10000} disabled={busy} onChange={(event) => setPrompt(event.target.value)} placeholder="Make the lighting warmer while preserving the composition." className="min-h-32" />
          </label>
          <label className="grid gap-2 text-sm">Reason for this revision
            <Textarea value={reason} maxLength={2000} disabled={busy} onChange={(event) => setReason(event.target.value)} placeholder="Explain why this final output needs an adjustment." />
          </label>
          <p className="text-xs text-neutral-500">{video ? "The selected final video" : "The selected image"} is sent as the reference. {video ? "This edits the combined video." : "Other images in this collection stay unchanged."}</p>
          <Button variant="generation" disabled={busy || !!active || stale || !prompt.trim()} onClick={() => runGeneration(video ? "video_refinement" : "image_refinement", () => submitRevision())}>{busy ? "Submitting…" : "Generate refined final"}</Button>
        </div>}

        <p className="text-xs text-neutral-500">Accepting updates the Final Output node. Previous versions and the original image/clip nodes remain in history.</p>
      </div>
      <div className="flex min-h-0 min-w-0 flex-col gap-4 md:border-l md:pl-6">
        {!video && selected.outputs.length > 1 && <Select items={selected.outputs.map((_, index) => ({ value: String(index), label: `Image ${index + 1}` }))} value={String(imageIndex)} onValueChange={(value) => { if (value !== null) setImageIndex(Number(value)); }}>
          <SelectTrigger aria-label="Choose final image"><SelectValue /></SelectTrigger>
          <SelectContent>{selected.outputs.map((_, index) => <SelectItem key={index} value={String(index)}>Image {index + 1}</SelectItem>)}</SelectContent>
        </Select>}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-md border bg-neutral-100 md:flex-1">
        <div className={`grid h-[24vh] min-h-0 gap-3 md:h-auto md:flex-1 ${compare && sourceUrl ? "sm:grid-cols-2" : ""}`}>
          {compare && sourceUrl && <section className="flex min-h-0 flex-col gap-2"><p className="text-sm font-medium">Source version</p><div className="min-h-0 flex-1 overflow-hidden rounded-md bg-neutral-50"><MediaPreview url={sourceUrl} video={video} /></div></section>}
          <section className="flex min-h-0 flex-col gap-2">
            {(video || source) && <p className="text-sm font-medium">{source ? "Refined version" : "Selected version"}</p>}
            {url ? <div className="min-h-0 flex-1 overflow-hidden rounded-md bg-neutral-50"><MediaPreview url={url} video={video} /></div> : <div role="status" className="grid aspect-video place-items-center rounded-md border bg-neutral-50 text-sm text-neutral-500">{completed ? "Preview unavailable" : `Status: ${selected.status}`}</div>}
          </section>
        </div>

        </div>
        <div className="flex shrink-0 gap-3 overflow-x-auto pb-2" aria-label="Final output version history">
          {versions.map((final, index) => {
            const preview = final.download_url || final.outputs[final.image_index || 0];
            return <button key={final.id} type="button" aria-label={`View final ${index === 0 ? "Current" : "Version 1"}${final.accepted !== false ? ", accepted" : ""}`} aria-pressed={selected.id === final.id} disabled={busy}
              onClick={() => { setId(final.id); setImageIndex(final.image_index || 0); setAdjusting(false); setCompare(false); }}
              className={`relative h-24 w-28 shrink-0 overflow-hidden rounded-md border-2 bg-neutral-100 ${selected.id === final.id ? "border-emerald-500" : "border-neutral-200"}`}>
              {preview ? <MediaPreview url={preview} video={final.kind === "video"} thumbnail /> : <span className="flex h-full items-center justify-center">{final.kind === "video" ? <Video /> : <FileText />}</span>}
              <span className="absolute top-1 right-1 rounded-md bg-white px-1.5 text-xs">{index === 0 ? "Current" : "Version 1"}{final.accepted !== false && <Check className="inline size-3" />}</span>
            </button>;
          })}
        </div>
        <p className="text-xs text-neutral-500">
          Existing versions remain in your history.
        </p>
      </div>
    </div>
  );
}
