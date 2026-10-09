"use client";
import { useState } from "react";
import axios from "axios";
import { Plus, Trash2, Sparkles, Upload } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BriefAttachmentPreview } from "@/components/brief/brief-attachment-preview";
import { SelectedBriefFile } from "@/components/project/selected-brief-file";
import type {
  Brief,
  BriefPoint,
  Attachment,
  Project,
  ProjectReview,
} from "@/types/ripple";

export function BriefEditor({
  mode,
  brief,
  project,
  review,
  attachments,
  token,
  busy,
  run,
  refresh,
  onConfirmed,
}: {
  mode: "brief" | "summary";
  brief: Brief;
  project: Project;
  review: ProjectReview;
  attachments: Attachment[];
  token: string;
  busy: boolean;
  run: (action: () => Promise<void>) => void;
  refresh: () => Promise<void>;
  onConfirmed: () => void;
}) {
  const [text, setText] = useState(brief.raw_text || project.description);
  const [summary, setSummary] = useState(brief.summary || "");
  const [points, setPoints] = useState<BriefPoint[]>(review.points);
  const [removed, setRemoved] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [instructions, setInstructions] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploaded, setUploaded] = useState<number[]>([]);
  const [history, setHistory] = useState<number | null>(null);
  const previous = review.versions.find((v) => v.version === history);
  async function save() {
    for (const [index, file] of files.entries()) {
      if (uploaded.includes(index)) continue;
      if (!file.size || file.size > 25 * 1024 * 1024)
        throw new Error(`${file.name} must be between 1 byte and 25 MiB.`);
      const start = await api.startAttachment(project.brief_id, file, token);
      await axios.put(start.upload_url, file, {
        headers: { "Content-Type": start.content_type },
      });
      await api.completeAttachment(
        project.brief_id,
        start.attachment.id,
        token,
      );
      setUploaded((current) => [...current, index]);
    }
    await api.editBrief(
      project.id,
      {
        expected_version: brief.version,
        raw_text: text,
        summary,
        points,
        remove_attachments: removed,
        note:
          note ||
          `${mode === "summary" ? "Summary confirmed" : "Brief revised"}`,
      },
      token,
    );
    await refresh();
    setRemoved([]);
    setFiles([]);
    setUploaded([]);
    if (mode === "summary" && summary.trim()) onConfirmed();
  }
  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span>Current brief v{brief.version}</span>
        <label>
          History{" "}
          <select
            className="ml-2 rounded-md border p-2"
            value={history || ""}
            onChange={(e) =>
              setHistory(e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="">Current editor</option>
            {review.versions.map((v) => (
              <option key={v.version} value={v.version}>
                Brief v{v.version}
              </option>
            ))}
          </select>
        </label>
      </div>
      {previous ? (
        <section className="grid gap-3 rounded-md border bg-neutral-50 p-4">
          <h3 className="font-semibold">
            Brief v{previous.version} · Read only
          </h3>
          <p className="whitespace-pre-wrap text-sm">
            {mode === "summary" ? previous.summary : previous.raw_text}
          </p>
          {previous.points.map((p) => (
            <p key={p.key} className="text-sm">
              <strong>{p.key}</strong>: {p.value}
            </p>
          ))}
          {previous.attachments.map((id) => (
            <Button
              key={id}
              variant="outline"
              onClick={() =>
                run(async () => {
                  const file = await api.downloadAttachment(
                    project.brief_id,
                    id,
                    token,
                  );
                  window.open(
                    file.download_url,
                    "_blank",
                    "noopener,noreferrer",
                  );
                })
              }
            >
              Open archived attachment
            </Button>
          ))}
        </section>
      ) : (
        <>
          <label className="grid gap-2 text-sm">
            {mode === "brief" ? "Brief content" : "Confirmed summary"}
            <Textarea
              className="min-h-48"
              maxLength={100000}
              value={mode === "brief" ? text : summary}
              onChange={(e) =>
                mode === "brief"
                  ? setText(e.target.value)
                  : setSummary(e.target.value)
              }
            />
          </label>
          <Button
            variant="ghost"
            className="justify-self-start"
            disabled={busy}
            onClick={() => (mode === "brief" ? setText("") : setSummary(""))}
          >
            <Trash2 />
            Clear {mode === "brief" ? "content" : "summary"}
          </Button>
          {mode === "brief" && (
            <section className="grid gap-3">
              <h3 className="font-semibold">Uploaded references</h3>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {attachments
                  .filter((f) => !removed.includes(f.id))
                  .map((file) => (
                    <li key={file.id} className="grid gap-2">
                      <ul>
                        <BriefAttachmentPreview file={file} token={token} />
                      </ul>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => setRemoved((v) => [...v, file.id])}
                      >
                        <Trash2 />
                        Remove
                      </Button>
                    </li>
                  ))}
              </ul>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed p-6 text-sm">
                <Upload />
                Add files
                <input
                  type="file"
                  multiple
                  disabled={busy}
                  className="sr-only"
                  onChange={(e) => {
                    setFiles((v) => [
                      ...v,
                      ...Array.from(e.target.files || []),
                    ]);
                    e.target.value = "";
                  }}
                />
              </label>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {files.map((file, i) => (
                  <SelectedBriefFile
                    key={i}
                    file={file}
                    uploaded={uploaded.includes(i)}
                    onRemove={
                      busy || uploaded.length > 0
                        ? undefined
                        : () => setFiles((v) => v.filter((_, j) => j !== i))
                    }
                  />
                ))}
              </ul>
              <p className="text-xs text-neutral-500">
                Removed references stay accessible in saved versions. New files
                are uploaded when you save.
              </p>
            </section>
          )}
          <section className="grid gap-3">
            <h3 className="font-semibold">Confirmed brief requirements</h3>
            <p className="text-sm text-neutral-500">
              Global requirements affect every shot. Local requirements affect
              only shots you link in the plan. Confirm these before generating
              so changes can be traced.
            </p>
            {points.map((point, i) => (
              <div
                key={i}
                className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_2fr_auto_auto]"
              >
                <Input
                  aria-label={`Requirement ${i + 1} key`}
                  value={point.key}
                  maxLength={80}
                  placeholder="lighting"
                  onChange={(e) =>
                    setPoints((v) =>
                      v.map((p, j) =>
                        i === j ? { ...p, key: e.target.value } : p,
                      ),
                    )
                  }
                />
                <Input
                  aria-label={`Requirement ${i + 1} value`}
                  value={point.value}
                  maxLength={2000}
                  placeholder="Warm morning light"
                  onChange={(e) =>
                    setPoints((v) =>
                      v.map((p, j) =>
                        i === j ? { ...p, value: e.target.value } : p,
                      ),
                    )
                  }
                />
                <select
                  aria-label={`Requirement ${i + 1} scope`}
                  className="rounded-md border px-2 text-sm"
                  value={point.scope}
                  onChange={(e) =>
                    setPoints((v) =>
                      v.map((p, j) =>
                        i === j
                          ? {
                              ...p,
                              scope: e.target.value as BriefPoint["scope"],
                            }
                          : p,
                      ),
                    )
                  }
                >
                  <option value="local">Local</option>
                  <option value="global">Global</option>
                </select>
                <Button
                  aria-label={`Remove requirement ${i + 1}`}
                  variant="ghost"
                  size="icon"
                  onClick={() => setPoints((v) => v.filter((_, j) => i !== j))}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              className="justify-self-start"
              disabled={busy || points.length >= 50}
              onClick={() =>
                setPoints((v) => [...v, { key: "", value: "", scope: "local" }])
              }
            >
              <Plus />
              Add requirement
            </Button>
          </section>
          <label className="grid gap-2 text-sm">
            Change note
            <Input
              value={note}
              maxLength={2000}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Explain what changed"
            />
          </label>
          <Button
            disabled={
              busy || points.some((p) => !p.key.trim() || !p.value.trim())
            }
            onClick={() => run(save)}
          >
            {busy
              ? "Saving…"
              : mode === "summary"
                ? "Confirm new summary version"
                : "Save brief version"}
          </Button>
          {mode === "brief" && (
            <Button
              variant="outline"
              disabled={
                busy ||
                files.some((_, i) => !uploaded.includes(i)) ||
                (!text.trim() && !attachments.length)
              }
              onClick={() =>
                run(async () => {
                  if (text !== brief.raw_text || removed.length > 0) {
                    await api.editBrief(
                      project.id,
                      {
                        expected_version: brief.version,
                        raw_text: text,
                        summary: "",
                        points,
                        remove_attachments: removed,
                        note: "Source saved for summary",
                      },
                      token,
                    );
                    await refresh();
                    setRemoved([]);
                  }
                  const result = await api.draftSummary(
                    project.brief_id,
                    token,
                  );
                  setSummary(result.summary);
                })
              }
            >
              <Sparkles />
              Generate summary with ChatGPT
            </Button>
          )}
          {mode === "brief" && (
            <>
              <label className="grid gap-2 text-sm">
                Summary draft (write manually or generate above)
                <Textarea
                  className="min-h-40"
                  value={summary}
                  maxLength={100000}
                  onChange={(e) => setSummary(e.target.value)}
                />
              </label>
              <p className="text-sm text-neutral-500">
                Save this brief version to confirm the summary, then open Brief
                Summary to choose image or video.
              </p>
            </>
          )}
          {mode === "summary" && (
            <>
              <label className="grid gap-2 text-sm">
                Refinement instructions
                <Textarea
                  value={instructions}
                  maxLength={2000}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Explain what the summary should clarify"
                />
              </label>
              <Button
                variant="outline"
                disabled={busy || !summary.trim() || !instructions.trim()}
                onClick={() =>
                  run(async () => {
                    const refined = await api.refineSummary(
                      project.id,
                      summary,
                      instructions,
                      token,
                    );
                    setSummary(refined.summary);
                  })
                }
              >
                <Sparkles />
                Refine summary draft
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}
