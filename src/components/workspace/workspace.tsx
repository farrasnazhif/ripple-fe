"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Sparkles, ImageIcon, Video } from "lucide-react";
import { GraphCanvas } from "@/components/workspace/graph-canvas";
import { BriefAttachmentPreview } from "@/components/brief/brief-attachment-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Project, GenerationJob } from "@/types/ripple";

export function Workspace({
  project,
  token,
}: {
  project: Project;
  token: string;
}) {
  const cache = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [source, setSource] = useState(project.description);
  const [draft, setDraft] = useState("");
  const [reviewingSummary, setReviewingSummary] = useState(false);
  const [rows, setRows] = useState([{ title: "", prompt: "" }]);
  const [creatingStoryboard, setCreatingStoryboard] = useState(false);
  const submitting = useRef(false);
  const briefKey = ["brief", token, project.brief_id];
  const shotKey = ["storyboard", token, project.id];
  const jobKey = ["generations", token, project.id];
  const brief = useQuery({
    queryKey: briefKey,
    queryFn: () => api.getBrief(project.brief_id, token),
  });
  const attachments = useQuery({
    queryKey: ["attachments", token, project.brief_id],
    queryFn: () => api.attachments(project.brief_id, token),
  });
  const shots = useQuery({
    queryKey: shotKey,
    queryFn: () => api.storyboard(project.id, token),
  });
  const jobs = useQuery({
    queryKey: jobKey,
    queryFn: async () => {
      const saved = await api.generations(project.id, token);
      // Status reads resume after refresh; submission is only triggered by an explicit click.
      return Promise.all(
        saved.map((job) =>
          ["queued", "in_progress"].includes(job.status)
            ? api.generation(project.id, job.id, token)
            : job,
        ),
      );
    },
    refetchInterval: (query) =>
      query.state.data?.some((j) =>
        ["queued", "in_progress", "submitting"].includes(j.status),
      )
        ? 10000
        : false,
  });
  const summary = useMutation({
    mutationFn: async () => {
      if (!brief.data?.raw_text && source.trim())
        await api.setBriefText(project.brief_id, source, token);
      await cache.invalidateQueries({ queryKey: briefKey });
      const result = await api.draftSummary(project.brief_id, token);
      setDraft(result.summary);
      setReviewingSummary(true);
    },
  });
  const confirm = useMutation({
    mutationFn: async () => {
      if (!brief.data?.raw_text && source.trim())
        await api.setBriefText(project.brief_id, source, token);
      return api.confirmSummary(project.brief_id, draft, token);
    },
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: briefKey });
      setDraft("");
      setReviewingSummary(false);
      setSelected("summary");
    },
  });
  const save = useMutation({
    mutationFn: () =>
      api.saveStoryboard(project.id, brief.data?.summary || "", rows, token),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: shotKey });
      setCreatingStoryboard(false);
      setSelected("storyboard");
    },
  });
  const generation = useMutation({
    mutationFn: async ({
      shot,
      kind,
    }: {
      shot: string;
      kind: "image" | "video";
    }) => {
      const storageKey = `ripple-generation:${project.id}:${shot}:${kind}`;
      const requestKey =
        sessionStorage.getItem(storageKey) || crypto.randomUUID();
      sessionStorage.setItem(storageKey, requestKey);
      const job = await api.generate(project.id, shot, kind, requestKey, token);
      sessionStorage.removeItem(storageKey);
      return job;
    },
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: jobKey });
    },
    onSettled: () => {
      submitting.current = false;
    },
  });
  const selectedJob = jobs.data?.find((j) => j.id === selected);
  const title = creatingStoryboard
    ? "Create storyboard"
    : selected === "brief"
      ? "Raw Brief"
      : selected === "summary"
        ? "Brief Summary"
        : selected === "storyboard"
          ? "Storyboard"
          : selectedJob
            ? `${selectedJob.kind === "video" ? "Video" : "Image"} output`
            : "Project output";
  const error =
    summary.error || confirm.error || save.error || generation.error;
  function open(id: string) {
    setSelected(id);
    setCreatingStoryboard(false);
    summary.reset();
    confirm.reset();
    save.reset();
    generation.reset();
  }
  function generate(shot: string, kind: "image" | "video") {
    if (submitting.current) return;
    submitting.current = true;
    generation.mutate({ shot, kind });
  }
  function blocked(shot: string, kind: string) {
    return (
      jobs.isPending ||
      jobs.isError ||
      generation.isPending ||
      jobs.data?.some(
        (j) =>
          j.shot_id === shot &&
          j.kind === kind &&
          ["submitting", "unknown", "queued", "in_progress"].includes(j.status),
      )
    );
  }
  return (
    <div className="flex h-[calc(100dvh-58px)] min-h-0 flex-col overflow-hidden">
      <GraphCanvas
        projectName={project.name}
        description={project.description}
        rawText={brief.data?.raw_text || ""}
        summary={brief.data?.summary}
        fileCount={attachments.data?.length || 0}
        shots={shots.data}
        jobs={jobs.data}
        onSelect={open}
      />
      <Dialog
        open={!!selected}
        onOpenChange={(value) => {
          if (!value) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-md p-7 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {selected === "brief"
                ? "Review the original source and confirm a summary to continue."
                : "Review this stage before continuing your project."}
            </DialogDescription>
          </DialogHeader>
          {selected === "brief" && (
            <div className="grid gap-4">
              <h3 className="font-semibold">Content</h3>
              {brief.isPending ? (
                <p>Loading content…</p>
              ) : brief.isError ? (
                <p role="alert">{brief.error.message}</p>
              ) : brief.data.raw_text ? (
                <p className="rounded-md border bg-neutral-50 p-4 whitespace-pre-wrap">
                  {brief.data.raw_text}
                </p>
              ) : (
                <label className="grid gap-2 text-sm">
                  Brief text
                  <Textarea
                    value={source}
                    maxLength={100000}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="Paste the brief content here"
                    className="min-h-36"
                  />
                  <span className="text-xs text-neutral-500">
                    The original text is saved when you generate a summary.
                    Summary uses saved text and attached PNG, JPEG, WEBP, GIF or
                    PDF files. Other formats remain downloadable references.
                  </span>
                </label>
              )}
              <h3 className="font-semibold">Uploaded files</h3>
              {attachments.isPending ? (
                <p>Loading files…</p>
              ) : attachments.isError ? (
                <p role="alert">{attachments.error.message}</p>
              ) : attachments.data.length ? (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {attachments.data.map((file) => (
                    <BriefAttachmentPreview
                      key={file.id}
                      file={file}
                      token={token}
                    />
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-neutral-500">No files uploaded.</p>
              )}
              {!shots.data?.length && (
                <Button
                  disabled={
                    brief.isPending ||
                    brief.isError ||
                    summary.isPending ||
                    confirm.isPending ||
                    !(
                      brief.data?.raw_text ||
                      source.trim() ||
                      attachments.data?.some((f) =>
                        [
                          "image/png",
                          "image/jpeg",
                          "image/webp",
                          "image/gif",
                          "application/pdf",
                        ].includes(f.content_type),
                      )
                    )
                  }
                  onClick={() => summary.mutate()}
                >
                  <Sparkles />
                  {summary.isPending
                    ? "Generating summary…"
                    : "Generate summary"}
                </Button>
              )}
              {!shots.data?.length && (
                <Button
                  variant="outline"
                  disabled={
                    brief.isPending ||
                    brief.isError ||
                    summary.isPending ||
                    confirm.isPending
                  }
                  onClick={() => {
                    setDraft(brief.data?.summary || "");
                    setReviewingSummary(true);
                  }}
                >
                  Write summary manually
                </Button>
              )}
              {reviewingSummary && (
                <label className="grid gap-2 text-sm">
                  Review summary
                  <Textarea
                    className="min-h-48"
                    value={draft}
                    maxLength={100000}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                  <Button
                    disabled={confirm.isPending || !draft.trim()}
                    onClick={() => confirm.mutate()}
                  >
                    {confirm.isPending ? "Saving…" : "Confirm summary"}
                  </Button>
                </label>
              )}
            </div>
          )}
          {selected === "summary" && !creatingStoryboard && (
            <div className="grid gap-4">
              <p className="whitespace-pre-wrap">{brief.data?.summary}</p>
              {shots.isPending ? (
                <p>Loading storyboard…</p>
              ) : shots.isError ? (
                <p role="alert">{shots.error.message}</p>
              ) : (
                <Button
                  onClick={() =>
                    shots.data.length
                      ? setSelected("storyboard")
                      : setCreatingStoryboard(true)
                  }
                >
                  {shots.data.length ? "Open storyboard" : "Create storyboard"}
                </Button>
              )}
            </div>
          )}
          {creatingStoryboard && (
            <div className="grid gap-4">
              <p className="text-sm text-neutral-500">
                Add the shots from your storyboard. Each prompt is sent to
                Higgsfield when you choose to generate it. Saved shots preserve
                this version of the storyboard.
              </p>
              {rows.map((row, index) => (
                <fieldset
                  key={index}
                  className="grid gap-3 rounded-md border p-4"
                >
                  <legend className="px-1 text-sm">Shot {index + 1}</legend>
                  <label className="grid gap-1 text-sm">
                    Title
                    <Input
                      value={row.title}
                      maxLength={200}
                      onChange={(e) =>
                        setRows((current) =>
                          current.map((r, i) =>
                            i === index ? { ...r, title: e.target.value } : r,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Generation prompt
                    <Textarea
                      value={row.prompt}
                      maxLength={10000}
                      onChange={(e) =>
                        setRows((current) =>
                          current.map((r, i) =>
                            i === index ? { ...r, prompt: e.target.value } : r,
                          ),
                        )
                      }
                    />
                  </label>
                  <Button
                    variant="ghost"
                    disabled={rows.length === 1 || save.isPending}
                    onClick={() =>
                      setRows((current) =>
                        current.filter((_, i) => i !== index),
                      )
                    }
                  >
                    <Trash2 />
                    Remove shot
                  </Button>
                </fieldset>
              ))}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={rows.length >= 50 || save.isPending}
                  onClick={() =>
                    setRows((current) => [
                      ...current,
                      { title: "", prompt: "" },
                    ])
                  }
                >
                  <Plus />
                  Add shot
                </Button>
                <Button
                  disabled={
                    save.isPending ||
                    rows.some((r) => !r.title.trim() || !r.prompt.trim())
                  }
                  onClick={() => save.mutate()}
                >
                  {save.isPending ? "Saving…" : "Save storyboard"}
                </Button>
              </div>
            </div>
          )}
          {selected === "storyboard" && (
            <div className="grid gap-4">
              <p className="text-sm text-neutral-500">
                Generating an image or video submits a paid request to
                Higgsfield.
              </p>
              {jobs.isError && (
                <p role="alert">
                  Could not load generation history: {jobs.error.message}
                  <Button variant="outline" onClick={() => jobs.refetch()}>
                    Retry
                  </Button>
                </p>
              )}
              {shots.data?.map((shot) => (
                <section
                  key={shot.id}
                  className="grid gap-3 rounded-md border p-4"
                >
                  <h3 className="font-semibold">
                    {shot.position}. {shot.title}
                  </h3>
                  <p className="text-sm whitespace-pre-wrap">{shot.prompt}</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      disabled={blocked(shot.id, "image")}
                      onClick={() => generate(shot.id, "image")}
                    >
                      <ImageIcon />
                      Generate image
                    </Button>
                    <Button
                      variant="outline"
                      disabled={blocked(shot.id, "video")}
                      onClick={() => generate(shot.id, "video")}
                    >
                      <Video />
                      Generate video
                    </Button>
                  </div>
                  {jobs.data
                    ?.filter((j) => j.shot_id === shot.id)
                    .map((job) => (
                      <div key={job.id} className="grid gap-1 text-sm">
                        <span className="capitalize">
                          {job.kind}: {job.status.replaceAll("_", " ")}
                        </span>
                        {["submitting", "unknown"].includes(job.status) && (
                          <p className="text-amber-700">
                            Submission needs reconciliation. Check the provider
                            dashboard before requesting another generation.
                          </p>
                        )}
                        {job.status === "completed" && (
                          <Button
                            variant="link"
                            onClick={() => setSelected(job.id)}
                          >
                            View output
                          </Button>
                        )}
                      </div>
                    ))}
                </section>
              ))}
            </div>
          )}
          {selectedJob && <GenerationOutput job={selectedJob} />}
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error.message}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
function GenerationOutput({ job }: { job: GenerationJob }) {
  return (
    <div className="grid gap-4">
      <p className="text-sm whitespace-pre-wrap">{job.prompt}</p>
      {job.outputs.map((url) => (
        <div key={url} className="grid gap-2">
          {job.kind === "video" ? (
            <video src={url} controls className="w-full rounded-md" />
          ) : (
            <Image
              src={url}
              alt="Generated shot"
              width={1280}
              height={720}
              unoptimized
              className="w-full rounded-md object-contain"
            />
          )}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline"
          >
            Open original output
          </a>
        </div>
      ))}
    </div>
  );
}
