"use client";

import { useState } from "react";
import axios from "axios";
import { Trash2, Upload, History, Info, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { briefHistory } from "@/lib/brief-versions";
import { ConfirmDestructiveAction } from "@/components/ui/confirm-destructive-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GenerationModelSelect } from "@/components/workspace/generation-model-select";
import { BriefAssetGallery } from "@/components/brief/brief-asset-gallery";
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

  const archivedVersions = briefHistory(review.versions, brief.version);
  const previous = archivedVersions.find((v) => v.version === history);

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
    <div className="flex flex-col gap-6 text-neutral-900">
      {/* Version Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-neutral-100/70 p-3.5 px-4">
        <div className="flex items-center gap-3">
          <span className="flex h-7 items-center gap-2 rounded-md bg-white px-3 text-xs font-semibold text-neutral-800 shadow-2xs">
            <span className="h-2 w-2 rounded-md bg-emerald-500" />
            Current
          </span>
          <span className="text-xs font-medium text-neutral-500 capitalize">
            {mode === "brief" ? "Full Brief Mode" : "Summary Mode"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-neutral-400" />
          <span className="text-xs font-medium text-neutral-500">
            View History:
          </span>
          <Select
            items={[
              { value: "current", label: "Current" },
              ...archivedVersions.map((v) => ({
                value: String(v.version),
                label: `Version ${v.archiveNumber}`,
              })),
            ]}
            value={history === null ? "current" : String(history)}
            onValueChange={(value) => {
              if (value !== null)
                setHistory(value === "current" ? null : Number(value));
            }}
            disabled={busy}
          >
            <SelectTrigger
              aria-label="Brief version history"
              className="h-8 min-w-36 rounded-md bg-white text-xs font-medium shadow-2xs"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current</SelectItem>
              {archivedVersions.map((v) => (
                <SelectItem key={v.version} value={String(v.version)}>
                  Version {v.archiveNumber}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Read Only History Mode */}
      {previous ? (
        <section className="flex flex-col gap-4 rounded-md bg-amber-50/60 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-amber-900 text-sm">
              <History className="h-4 w-4 text-amber-600" />
              Version {previous.archiveNumber} Archive
            </div>
            <span className="rounded-md bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
              Read Only
            </span>
          </div>
          <p className="whitespace-pre-wrap rounded-md bg-white/80 p-4 text-xs leading-relaxed text-amber-950 shadow-2xs">
            {mode === "summary" ? previous.summary : previous.raw_text}
          </p>

          {previous.points.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-amber-900">
                Requirements in this version
              </span>
              {previous.points.map((p) => (
                <div
                  key={p.key}
                  className="rounded-md bg-white/60 p-2.5 text-xs"
                >
                  <strong className="font-semibold text-amber-900">
                    {p.key}:
                  </strong>{" "}
                  {p.value}
                </div>
              ))}
            </div>
          )}

          {previous.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
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
            </div>
          )}
        </section>
      ) : (
        <>
          {/* STEP 1: Main Content */}
          <div className="flex flex-col gap-3 rounded-md bg-neutral-50/80 p-5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-bold uppercase text-neutral-600 tracking-wider">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-100 text-[10px] text-emerald-800">
                  1
                </span>
                {mode === "brief" ? "Brief Description" : "Confirmed Summary"}
              </label>


            </div>

            <Textarea
              className="min-h-44 rounded-md bg-white p-3.5 text-sm leading-relaxed text-neutral-900 shadow-2xs focus:ring-2 focus:ring-emerald-500/20"
              maxLength={100000}
              value={mode === "brief" ? text : summary}
              onChange={(e) =>
                mode === "brief"
                  ? setText(e.target.value)
                  : setSummary(e.target.value)
              }
              placeholder={
                mode === "brief"
                  ? "Type your detailed project goals, visual style, background, or requirements here..."
                  : "Type or generate your confirmed brief summary..."
              }
            />
          </div>

          {/* STEP 2: Attachments */}
          {mode === "brief" && (
            <div className="flex flex-col gap-4 rounded-md bg-neutral-50/80 p-5">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase text-neutral-600 tracking-wider">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-100 text-[10px] text-emerald-800">
                    2
                  </span>
                  Reference Files & Images
                </h3>
              </div>

              <BriefAssetGallery
                files={attachments.filter((file) => !removed.includes(file.id))}
                token={token}
                busy={busy}
                onRemove={(id) => setRemoved((current) => [...current, id])}
              />

              <label className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-neutral-200 bg-white p-6 text-center transition-all hover:bg-emerald-50/30">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-neutral-100 text-neutral-600 transition-transform group-hover:scale-105">
                  <Upload className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-800">
                    Upload new reference files
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-400">
                    Drag files here or click to browse (up to 25MB each)
                  </p>
                </div>
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

              {files.length > 0 && (
                <ul className="grid max-h-80 grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2 overflow-y-auto overscroll-contain">
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
              )}

              <p className="flex items-center gap-1.5 text-xs text-neutral-400">
                <Info className="h-3.5 w-3.5 shrink-0" />
                Removed files remain preserved in earlier saved history
                versions.
              </p>
            </div>
          )}

          {/* STEP 3: Requirements */}
          <div className="flex flex-col gap-4 rounded-md bg-neutral-50/80 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase text-neutral-600 tracking-wider">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-100 text-[10px] text-emerald-800">
                    {mode === "brief" ? "3" : "2"}
                  </span>
                  Key Requirements
                </h3>
              </div>
              <span className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-neutral-600 shadow-2xs">
                {points.length} {points.length === 1 ? "rule" : "rules"}
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {points.map((point, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-2 sm:flex-row sm:items-center"
                >
                  {/* Category Name */}
                  <label className="grid gap-1 sm:w-1/3">
                    <span className="text-xs text-neutral-500">Key <span aria-hidden="true" className="text-destructive">*</span></span>
                    <Input
                      aria-label={`Requirement ${i + 1} key`}
                      value={point.key}
                      maxLength={80}
                      placeholder="Category (e.g. Lighting)"
                      required
                      className="h-8 text-xs md:text-xs"
                      onChange={(e) =>
                        setPoints((v) =>
                          v.map((p, j) =>
                            i === j ? { ...p, key: e.target.value } : p,
                          ),
                        )
                      }
                    />
                  </label>

                  {/* Guideline Description */}
                  <label className="grid flex-1 gap-1">
                    <span className="text-xs text-neutral-500">Requirement <span aria-hidden="true" className="text-destructive">*</span></span>
                    <Input
                      aria-label={`Requirement ${i + 1} value`}
                      value={point.value}
                      maxLength={2000}
                      placeholder="Guideline (e.g. Warm sunlight through blinds)"
                      required
                      className="h-8 text-xs md:text-xs"
                      onChange={(e) =>
                        setPoints((v) =>
                          v.map((p, j) =>
                            i === j ? { ...p, value: e.target.value } : p,
                          ),
                        )
                      }
                    />
                  </label>

                  {/* Scope Selector & Actions */}
                  <div className="flex items-center justify-end gap-2 sm:self-end">
                    <Select
                      items={[
                        { value: "local", label: "Local" },
                        { value: "global", label: "Global" },
                      ]}
                      value={point.scope}
                      onValueChange={(value) => {
                        if (value === "local" || value === "global")
                          setPoints((v) =>
                            v.map((p, j) =>
                              i === j ? { ...p, scope: value } : p,
                            ),
                          );
                      }}
                      disabled={busy}
                    >
                      <SelectTrigger
                        aria-label={`Requirement ${i + 1} scope`}
                        className="w-full text-xs sm:w-24"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local">Local</SelectItem>
                        <SelectItem value="global">Global</SelectItem>
                      </SelectContent>
                    </Select>

                    <ConfirmDestructiveAction
                      title={`Remove requirement “${point.key || i + 1}”?`}
                      description="Removing a requirement may affect linked shots when you save the brief. Previous saved versions remain in history."
                      onConfirm={() =>
                        setPoints((v) => v.filter((_, j) => i !== j))
                      }
                      trigger={
                        <Button
                          aria-label={`Remove requirement ${i + 1}`}
                          variant="destructive"
                          size="icon"
                          disabled={busy}
                        >
                          <Trash2 />
                        </Button>
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              className="self-start"
              disabled={busy || points.length >= 50}
              onClick={() =>
                setPoints((v) => [...v, { key: "", value: "", scope: "local" }])
              }
            >
              Add requirement rule
            </Button>
          </div>

          {/* STEP 4: AI Tools */}
          {mode === "brief" && (
            <div className="flex flex-col gap-4 rounded-md bg-emerald-50/40 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-200 text-[10px] font-bold text-emerald-900">
                    4
                  </span>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                      AI Summary Assistant
                    </h4>
                  </div>
                </div>

                <div className="flex w-full max-w-[440px] flex-row items-end gap-2">
                  <GenerationModelSelect kind="text" disabled={busy} />
                  <Button
                    variant="generation"
                  className="h-auto min-h-8 min-w-0 flex-[2] py-1 whitespace-normal"
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
                    Generate summary with ChatGPT
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-neutral-700">
                  Summary Draft
                </label>
                <Textarea
                  className="min-h-28 rounded-md bg-white p-3 text-xs leading-relaxed text-neutral-900 shadow-2xs"
                  value={summary}
                  maxLength={100000}
                  placeholder="Your generated or manual summary will appear here..."
                  onChange={(e) => setSummary(e.target.value)}
                />
                <p className="text-xs text-neutral-400 text-center mt-1">
                  Save this brief version to confirm your draft, then switch to
                  Summary Mode to refine options.
                </p>
              </div>
            </div>
          )}

          {mode === "summary" && (
            <div className="flex flex-col gap-4 rounded-md bg-emerald-50/40 p-5">
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-900">
                  <span>Refinement Instructions <span aria-hidden="true" className="text-destructive">*</span></span>
                </label>
                <Textarea
                  required
                  value={instructions}
                  maxLength={2000}
                  className="min-h-24 rounded-md bg-white p-3 text-xs shadow-2xs"
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Explain what the AI should refine or rewrite..."
                />
              </div>

              <div className="ml-auto flex w-full max-w-[440px] flex-row items-end gap-2">
                <GenerationModelSelect kind="text" disabled={busy} />
                <Button
                  variant="generation"
                  className="h-auto min-h-8 min-w-0 flex-[2] py-1 whitespace-normal"
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
                  Refine summary draft
                </Button>
              </div>
            </div>
          )}

          {/* STEP 5: Save Actions Bar */}
          <div className="flex flex-col gap-3 rounded-md bg-neutral-100/80 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <Input
                value={note}
                maxLength={2000}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a revision note (e.g. Updated visual reference links)"
                className="h-10 rounded-md bg-white text-xs placeholder:text-neutral-400 shadow-2xs"
              />
            </div>

            <Button
              disabled={
                busy || points.some((p) => !p.key.trim() || !p.value.trim())
              }
              onClick={() => run(save)}
            >
              {busy
                ? "Saving..."
                : mode === "summary"
                  ? "Confirm & Save Summary"
                  : "Save Brief Version"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
