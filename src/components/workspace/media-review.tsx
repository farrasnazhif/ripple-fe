"use client";
import { useState } from "react";
import Image from "next/image";
import { Check, RefreshCw, SlidersHorizontal, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type {
  Brief,
  StoryboardShot,
  GenerationJob,
  ProjectReview,
} from "@/types/ripple";
export function MediaPreview({
  url,
  video,
  thumbnail = false,
}: {
  url: string;
  video: boolean;
  thumbnail?: boolean;
}) {
  return video ? (
    <video
      src={url}
      controls={!thumbnail}
      muted={thumbnail}
      preload="metadata"
      className="h-full max-h-[52vh] w-full rounded-md object-contain"
    />
  ) : (
    <Image
      src={url}
      alt="Saved generation output"
      width={1280}
      height={720}
      unoptimized
      className="h-full max-h-[52vh] w-full rounded-md object-contain"
    />
  );
}
export function MediaReview({
  shot,
  versions,
  brief,
  review,
  busy,
  blocked,
  onGenerate,
  onDecision,
}: {
  shot: StoryboardShot;
  versions: GenerationJob[];
  brief: Brief;
  review: ProjectReview;
  busy: boolean;
  blocked: boolean;
  onGenerate: (prompt: string, reason?: string) => void;
  onDecision: (
    job: GenerationJob,
    action: "accept" | "keep",
    reason: string,
  ) => void;
}) {
  const [id, setId] = useState(
    (versions.find((j) => j.accepted) || versions.at(-1))?.id,
  );
  const job = versions.find((j) => j.id === id) || versions.at(-1)!;
  const [adjusting, setAdjusting] = useState(false);
  const [prompt, setPrompt] = useState(job.prompt);
  const [reason, setReason] = useState("");
  const impacts = review.changes
    .filter((c) => c.brief_version > job.brief_version)
    .flatMap((c) =>
      c.impacts
        .filter((i) => i.shot_id === shot.id && i.status === "needs_review")
        .map((i) => ({ ...i, brief_version: c.brief_version, note: c.note })),
    );
  const resolved = review.decisions.some(
    (d) =>
      d.job_id === job.id &&
      d.brief_version === brief.version &&
      ["keep", "accept"].includes(d.action),
  );
  const requiresReview = impacts.length > 0 && !resolved;
  const snapshot = review.versions.find((v) => v.version === job.brief_version);
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.2fr)]">
      <div className="grid content-start gap-5 md:max-h-[70vh] md:overflow-y-auto md:pr-3">
        <div>
          <p className="text-xs text-neutral-500">
            {shot.title} · Brief v{job.brief_version} · Version{" "}
            {versions.findIndex((j) => j.id === job.id) + 1}
          </p>
          <h3 className="mt-4 text-sm text-neutral-500">
            Summary at generation
          </h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
            {snapshot?.summary || brief.summary || "No saved summary"}
          </p>
        </div>
        <section className="grid gap-2">
          <h3 className="font-semibold">Linked requirements</h3>
          {review.points
            .filter(
              (p) =>
                p.scope === "global" || shot.requirement_keys?.includes(p.key),
            )
            .map((p) => (
              <p key={p.key} className="rounded-md bg-neutral-50 p-3 text-sm">
                <strong>{p.key}</strong>: {p.value}
              </p>
            ))}
        </section>
        <section
          className={`grid gap-2 rounded-md border p-4 ${requiresReview ? "border-amber-200 bg-amber-50" : "bg-neutral-50"}`}
        >
          <h3 className="font-semibold">Change impact</h3>
          {impacts.length ? (
            impacts.map((i, index) => (
              <div key={index} className="text-sm">
                <p className="font-medium">
                  Brief v{i.brief_version} · {i.note}
                </p>
                <ul className="ml-4 list-disc">
                  {i.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <p className="text-sm">
              No confirmed requirement change affects this version.
            </p>
          )}
          {resolved && (
            <p className="text-sm text-emerald-700">
              Reviewed against the current brief.
            </p>
          )}
        </section>
        <label className="grid gap-2 text-sm">
          Decision or refinement reason
          <Textarea
            value={reason}
            maxLength={2000}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why you refine or keep this output"
          />
        </label>
        <Button
          variant="outline"
          disabled={busy || !reason.trim()}
          onClick={() => onDecision(job, "keep", reason)}
        >
          Keep this version with reason
        </Button>
        {adjusting && (
          <div className="grid gap-3">
            <label className="grid gap-2 text-sm">
              Refined generation prompt
              <Textarea
                value={prompt}
                maxLength={10000}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-40"
              />
            </label>
            <Button
              disabled={busy || blocked || !prompt.trim() || !reason.trim()}
              onClick={() => onGenerate(prompt, reason)}
            >
              Generate refined version
            </Button>
          </div>
        )}
        <details className="text-sm">
          <summary className="cursor-pointer font-medium">
            Generation prompt
          </summary>
          <p className="mt-2 whitespace-pre-wrap">{job.prompt}</p>
        </details>
        <details className="text-sm">
          <summary className="flex cursor-pointer items-center gap-2 font-medium">
            <History size={16} />
            Decision log
          </summary>
          {review.decisions
            .filter((d) => d.shot_id === shot.id)
            .map((d) => (
              <p key={d.id} className="mt-2 rounded-md border p-2">
                Brief v{d.brief_version} · {d.action}:{" "}
                {d.reason || "Output accepted"}
              </p>
            ))}
        </details>
      </div>
      <div className="grid min-w-0 content-start gap-4 md:border-l md:pl-6">
        <div className="overflow-hidden rounded-md border bg-neutral-100">
          <MediaPreview url={job.outputs[0]} video={job.kind === "video"} />
          <div className="flex flex-wrap gap-2 border-t bg-white p-3">
            <Button
              variant="outline"
              disabled={busy || blocked}
              onClick={() => onGenerate(job.prompt)}
            >
              <RefreshCw />
              Generate again
            </Button>
            <Button
              variant="outline"
              disabled={busy || blocked}
              onClick={() => {
                setAdjusting(!adjusting);
                setPrompt(job.prompt);
              }}
            >
              <SlidersHorizontal />
              Adjust / Refine
            </Button>
            <Button
              disabled={busy || requiresReview || job.accepted}
              onClick={() => onDecision(job, "accept", "")}
            >
              <Check />
              {job.accepted ? "Accepted" : "Mark as accepted"}
            </Button>
          </div>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {versions.map((v, i) => (
            <button
              key={v.id}
              type="button"
              aria-label={`View version ${i + 1}${v.accepted ? ", accepted" : ""}`}
              aria-pressed={job.id === v.id}
              onClick={() => {
                setId(v.id);
                setPrompt(v.prompt);
                setAdjusting(false);
              }}
              className={`relative h-24 w-28 shrink-0 overflow-hidden rounded-md border-2 bg-neutral-100 ${job.id === v.id ? "border-emerald-500" : "border-neutral-200"}`}
            >
              <MediaPreview
                url={v.outputs[0]}
                video={v.kind === "video"}
                thumbnail
              />
              <span className="absolute top-1 right-1 rounded-md bg-white px-1.5 text-xs">
                {i + 1}
                {v.accepted && <Check className="inline size-3" />}
              </span>
            </button>
          ))}
        </div>
        <p className="text-xs text-neutral-500">
          New generations use Higgsfield. Existing versions remain in your
          history.
        </p>
        <a
          className="text-sm underline"
          href={job.outputs[0]}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open original output
        </a>
      </div>
    </div>
  );
}
