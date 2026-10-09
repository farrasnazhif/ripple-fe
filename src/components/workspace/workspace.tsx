"use client";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  Sparkles,
  ImageIcon,
  Video,
  Check,
  ArrowRight,
} from "lucide-react";
import { GraphCanvas } from "@/components/workspace/graph-canvas";
import { BriefDetailDialog } from "@/components/brief/brief-detail-dialog";
import { BriefEditor } from "@/components/workspace/brief-editor";
import { ProjectBudgetButton, GenerationBudgetDialog } from "@/components/project/project-budget";
import { FinalReview } from "@/components/workspace/final-review";
import { MediaReview } from "@/components/workspace/media-review";
import { GenerationProgressDialog } from "@/components/workspace/generation-progress-dialog";
import { ConfirmDestructiveAction } from "@/components/ui/confirm-destructive-action";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Project, StoryboardShot, GenerationJob, GenerationOperation } from "@/types/ripple";
type GenerationProgress = { operation: GenerationOperation; id?: string; resource?: "job" | "final"; status: string; dismissed: boolean };
type PlanRow = { title: string; prompt: string; requirement_keys: string[] };
export function Workspace({
  project,
  token,
}: {
  project: Project;
  token: string;
}) {
  const cache = useQueryClient();
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);
  const [pendingGeneration, setPendingGeneration] = useState<{ operation: GenerationOperation; fn: () => Promise<void> } | null>(null);
  function runGeneration(operation: GenerationOperation, fn: () => Promise<void>) {
    if (!running.current) setPendingGeneration({ operation, fn });
  }
  const [selected, setSelected] = useState<string | null>(null);
  const [finalId, setFinalId] = useState<string | undefined>();
  const [planning, setPlanning] = useState(false);
  const [rows, setRows] = useState<PlanRow[]>([
    { title: "", prompt: "", requirement_keys: [] },
  ]);
  const [notice, setNotice] = useState("");
  const running = useRef(false);
  const brief = useQuery({
    queryKey: ["brief", token, project.brief_id],
    queryFn: () => api.getBrief(project.brief_id, token),
  });
  const attachments = useQuery({
    queryKey: ["attachments", token, project.brief_id],
    queryFn: () => api.attachments(project.brief_id, token),
  });
  const shots = useQuery({
    queryKey: ["storyboard", token, project.id],
    queryFn: () => api.storyboard(project.id, token),
  });
  const review = useQuery({
    queryKey: ["review", token, project.id],
    queryFn: async () => {
      const saved = await api.review(project.id, token);
      const pending = saved.finals.filter((final) => ["queued", "in_progress"].includes(final.status || ""));
      if (!pending.length) return saved;
      await Promise.all(pending.map((final) => api.finalStatus(project.id, final.id, token)));
      return api.review(project.id, token);
    },
    refetchInterval: (query) => query.state.data?.finals.some((final) =>
      ["queued", "in_progress"].includes(final.status || "")) ? 10000 : 4 * 60 * 1000,
  });
  const jobs = useQuery({
    queryKey: ["generations", token, project.id],
    queryFn: async () => {
      const saved = await api.generations(project.id, token);
      return Promise.all(
        saved.map((j) =>
          ["queued", "in_progress"].includes(j.status)
            ? api.generation(project.id, j.id, token)
            : j,
        ),
      );
    },
    refetchInterval: (q) =>
      q.state.data?.some((j) =>
        ["queued", "in_progress", "submitting"].includes(j.status),
      )
        ? 10000
        : false,
  });
  const activeJobs = (jobs.data || []).filter((job) => ["submitting", "unknown", "queued", "in_progress"].includes(job.status))
    .map((job) => ({ id: job.id, resource: "job" as const, operation: job.kind as GenerationOperation, status: job.status, created_at: job.created_at }));
  const activeFinals = (review.data?.finals || []).filter((final) => ["submitting", "unknown", "queued", "in_progress"].includes(final.status || ""))
    .map((final) => ({ id: final.id, resource: "final" as const, operation: final.parent_id ? `${final.kind}_refinement` as GenerationOperation : final.kind as GenerationOperation, status: final.status || "submitting", created_at: final.created_at || "" }));
  const latestActive = [...activeJobs, ...activeFinals].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const visibleProgress = generationProgress || (latestActive ? { ...latestActive, dismissed: false } : null);
  const trackedJob = visibleProgress?.resource === "job" ? jobs.data?.find((job) => job.id === visibleProgress.id) : undefined;
  const trackedFinal = visibleProgress?.resource === "final" ? review.data?.finals.find((final) => final.id === visibleProgress.id) : undefined;
  const progressStatus = trackedJob?.status || trackedFinal?.status || visibleProgress?.status;

  async function refresh() {
    await Promise.all(
      ["brief", "attachments", "storyboard", "generations", "review", "budget"].map(
        (key) => cache.invalidateQueries({ queryKey: [key, token] }),
      ),
    );
  }
  const action = useMutation({
    mutationFn: async (fn: () => Promise<void>) => {
      setNotice("");
      await fn();
    },
    onSuccess: refresh,
    onSettled: () => {
      running.current = false;
    },
  });
  function run(fn: () => Promise<void>) {
    if (running.current) return;
    running.current = true;
    action.reset();
    action.mutate(fn);
  }
  function open(id: string) {
    setFinalId(undefined);
    setSelected(id);
    setPlanning(false);
    setNotice("");
    action.reset();
  }
  const state = review.data;
  const current = brief.data;
  const kind = state?.output_type === "image" ? "image" : "video";
  const planTitle = "Storyboard";
  const styledNodeHeader = selected === "summary" || selected === "storyboard";
  const parts = selected?.split(":");
  const selectedShot = shots.data?.find((s) => s.id === parts?.[0]);
  const selectedKind = parts?.[1] as "image" | "video" | undefined;
  const versions =
    jobs.data?.filter(
      (j) =>
        j.shot_id === selectedShot?.id &&
        j.kind === selectedKind &&
        j.status === "completed" &&
        j.outputs.length,
    ) || [];
  function blocked(shot: string, output: string) {
    return (
      jobs.isPending ||
      jobs.isError ||
      action.isPending ||
      !!jobs.data?.some(
        (j) =>
          j.shot_id === shot &&
          j.kind === output &&
          ["submitting", "unknown", "queued", "in_progress"].includes(j.status),
      )
    );
  }
  async function generate(
    shot: string,
    output: "image" | "video",
    prompt: string,
    reason?: string,
  ) {
    if (reason) await api.decide(project.id, shot, "", "refine", reason, token);
    const storageKey = `ripple-generation:${project.id}:${shot}:${output}`;
    let requestKey = sessionStorage.getItem(storageKey);
    if (!requestKey) {
      requestKey = crypto.randomUUID();
      sessionStorage.setItem(storageKey, requestKey);
      sessionStorage.setItem(`${storageKey}:prompt`, prompt);
    }
    const savedPrompt =
      sessionStorage.getItem(`${storageKey}:prompt`) || prompt;
    let job: GenerationJob;
    try {
      job = await api.generate(project.id, shot, output, requestKey, token, savedPrompt);
    } catch (error) {
      if (error instanceof ApiError && [400, 402, 404, 409, 503].includes(error.status)) {
        sessionStorage.removeItem(storageKey);
        sessionStorage.removeItem(`${storageKey}:prompt`);
      }
      throw error;
    } finally {
      await cache.invalidateQueries({ queryKey: ["budget", token, project.id] });
    }
    sessionStorage.removeItem(storageKey);
    sessionStorage.removeItem(`${storageKey}:prompt`);
    setGenerationProgress((current) => current ? { ...current, id: job.id, resource: "job", status: job.status } : current);
    setNotice(
      `Generation ${job.status.replaceAll("_", " ")}. Completed media will appear on the canvas.`,
    );
  }
  async function decide(
    job: GenerationJob,
    decision: "accept" | "keep",
    reason: string,
  ) {
    await api.decide(project.id, job.shot_id, job.id, decision, reason, token);
    setNotice(
      decision === "keep"
        ? "Version kept. Your reason was recorded."
        : "Version accepted.",
    );
  }
  const error =
    action.error ||
    brief.error ||
    attachments.error ||
    shots.error ||
    review.error ||
    jobs.error;
  return (
    <div className="relative flex h-[calc(100dvh-58px)] min-h-0 flex-col overflow-hidden">
      <GraphCanvas
        projectName={project.name}
        description={project.description}
        rawText={current?.raw_text || ""}
        summary={current?.summary}
        fileCount={attachments.data?.length || 0}
        shots={state ? shots.data : undefined}
        jobs={state ? jobs.data : undefined}
        review={state}
        onSelect={open}
      />
      <div className="absolute top-4 right-4 z-10"><ProjectBudgetButton projectId={project.id} token={token} /></div>
      {visibleProgress && <GenerationProgressDialog
        operation={visibleProgress.operation}
        status={progressStatus || "submitting"}
        dismissed={visibleProgress.dismissed}
        onDismiss={() => setGenerationProgress((current) => ({ ...(current || visibleProgress), dismissed: true }))}
        onReopen={() => setGenerationProgress((current) => ({ ...(current || visibleProgress), dismissed: false }))}
        onClose={() => setGenerationProgress(progressStatus === "unknown" ? { ...visibleProgress, status: "unknown", dismissed: true } : null)}
      />}
      {pendingGeneration && <GenerationBudgetDialog projectId={project.id} token={token} operation={pendingGeneration.operation}
        onClose={() => setPendingGeneration(null)} onConfirm={() => { const { fn, operation } = pendingGeneration; setPendingGeneration(null); setGenerationProgress({ operation, status: "submitting", dismissed: false }); run(async () => { try { await fn(); } catch (error) { setGenerationProgress(null); throw error; } }); }} />}
      {error && !selected && (
        <div
          role="alert"
          className="absolute bottom-20 left-8 rounded-md border bg-white p-3 text-sm text-red-600"
        >
          {error.message}
          <Button variant="link" onClick={() => run(refresh)}>
            Reload
          </Button>
        </div>
      )}
      {selected === "brief" && (
        <BriefDetailDialog project={project} token={token}
          onClose={() => setSelected(null)} />
      )}
      <Dialog
        open={!!selected && selected !== "brief"}
        onOpenChange={(value) => {
          if (!value && !action.isPending) {
            setSelected(null);
            setPlanning(false);
          }
        }}
      >
        <DialogContent
          className={`max-h-[90vh] rounded-md sm:max-w-4xl ${styledNodeHeader ? "flex flex-col overflow-hidden border border-neutral-200/80 p-0 shadow-2xl" : "overflow-y-auto p-6"} ${selectedShot || selected === "final" ? "lg:max-w-6xl" : ""}`}
        >
          {styledNodeHeader ? (
            <>
              <div className="flex items-center gap-2 px-6 pt-6">
                <span className="truncate text-xs font-semibold tracking-wider uppercase text-neutral-900">
                  {project.name}
                </span>
              </div>
              <div className="px-6 pt-1 pb-0">
                <div className="relative overflow-hidden rounded-md bg-neutral-100 p-6 text-neutral-900">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute right-0 top-0 h-full w-[60%] bg-neutral-400 opacity-10 [mask-image:url('/vectors/headers/spiral.svg')] [mask-position:right_center] [mask-repeat:no-repeat] [mask-size:cover]"
                  />
                  <DialogHeader className="relative z-10 text-left">
                    <DialogTitle className="text-2xl font-extrabold tracking-tight text-neutral-900">
                      {selected === "summary" ? "Brief Summary" : planTitle}
                    </DialogTitle>
                    <DialogDescription className="mt-0.5 text-sm text-neutral-600">
                      {selected === "summary"
                        ? "Review your summarized brief, confirm requirements, and track changes before generating."
                        : "Review shots, link brief requirements, and track the impact of changes before generating clips."}
                    </DialogDescription>
                  </DialogHeader>
                </div>
              </div>
            </>
          ) : (
          <DialogHeader>
            <DialogTitle>
              {selected === "brief"
                ? "Brief"
                : selected === "summary"
                  ? "Brief Summary"
                  : selected === "storyboard"
                    ? planTitle
                    : selected === "final"
                      ? "Final Output"
                      : selectedShot
                        ? `${selectedKind === "video" ? "Clip" : "Image"} ${selectedShot.position} · ${selectedShot.title}`
                        : "Project"}
            </DialogTitle>
            <DialogDescription>
              {selectedShot
                ? "Review saved versions, refine the output, and record your decision."
                : "Confirm your brief, track changes, and preserve the work that still fits."}
            </DialogDescription>
          </DialogHeader>
          )}
          <div className={styledNodeHeader ? "min-h-0 flex-1 overflow-y-auto p-6" : "contents"}>
          {(!current || !state) && <p>Loading project…</p>}
          {current &&
            state &&
            selected === "summary" &&
            !planning && (
              <>
                <BriefEditor
                  key={selected}
                  mode={selected}
                  brief={current}
                  project={project}
                  review={state}
                  attachments={attachments.data || []}
                  token={token}
                  busy={action.isPending}
                  run={run}
                  refresh={refresh}
                  onConfirmed={() =>
                    setNotice("Summary confirmed. Choose image or video below.")
                  }
                />
                {selected === "summary" && current.summary && (
                  <section className="mt-4 grid gap-3 border-t pt-5">
                    <h3 className="font-semibold">
                      What would you like to generate?
                    </h3>
                    <p className="text-sm text-neutral-500">Images generate directly from the saved summary and requirements. Save any edits above before generating.</p>
                    {state.output_type === "video" && shots.data?.length ? (
                      <Button onClick={() => open("storyboard")}>Open storyboard</Button>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        <Button variant="generation"
                          disabled={action.isPending || review.isError || state.finals.some((final) => ["submitting", "unknown", "queued", "in_progress"].includes(final.status || ""))}
                          onClick={() => runGeneration("image", async () => {
                            if (state.output_type !== "image") await api.outputType(project.id, "image", token);
                            const storageKey = `ripple:direct-image:${project.id}:${current.version}`;
                            const key = sessionStorage.getItem(storageKey) || crypto.randomUUID();
                            sessionStorage.setItem(storageKey, key);
                            try {
                              const result = await api.generateFinalImage(project.id, { request_key: key, expected_version: current.version }, token);
                              setFinalId(result.id);
                              setGenerationProgress((current) => current ? { ...current, id: result.id, resource: "final", status: result.status || "submitting" } : current);
                              sessionStorage.removeItem(storageKey);
                              setSelected("final");
                            } catch (error) {
                              if (error instanceof ApiError && [400, 402, 404, 409, 503].includes(error.status)) sessionStorage.removeItem(storageKey);
                              throw error;
                            } finally { await refresh(); }
                          })}>
                          <ImageIcon />Generate final image
                        </Button>
                        {state.finals.some((final) => final.kind === "image") && (
                          <Button variant="outline" onClick={() => open("final")}>Open final image</Button>
                        )}
                        <Button variant="outline"
                          disabled={action.isPending || shots.isPending || shots.isError || state.finals.some((final) => final.kind === "image" && !["failed", "nsfw", "canceled"].includes(final.status || "completed"))}
                          onClick={() => run(async () => {
                            await api.outputType(project.id, "video", token);
                            await refresh(); setPlanning(true);
                          })}>
                          <Video />Video · Create storyboard
                        </Button>
                      </div>
                    )}
                  </section>
                )}
              </>
            )}
          {planning && state && current && (
            <div className="grid gap-4">
              <h3 className="font-semibold">
                Create {planTitle.toLowerCase()}
              </h3>
              <p className="text-sm text-neutral-500">
                Review prompts and link local requirements before saving. Global
                requirements automatically apply to all shots.
              </p>
              <Button
                variant="generation"
                disabled={action.isPending}
                onClick={() =>
                  run(async () => {
                    const drafted = await api.draftPlan(
                      project.id,
                      current.summary || "",
                      token,
                    );
                    setRows(
                      drafted.map((s) => ({
                        title: s.title,
                        prompt: s.prompt,
                        requirement_keys: state.points
                          .filter((p) => p.scope === "local")
                          .map((p) => p.key),
                      })),
                    );
                  })
                }
              >
                <Sparkles />
                Draft {planTitle.toLowerCase()} with ChatGPT
              </Button>
              {rows.map((row, i) => (
                <fieldset key={i} className="grid gap-3 rounded-md border p-4">
                  <legend className="px-1 text-sm">
                    {kind === "image" ? "Image" : "Shot"} {i + 1}
                  </legend>
                  <label className="grid gap-1 text-sm">
                    Title
                    <Input
                      value={row.title}
                      maxLength={200}
                      onChange={(e) =>
                        setRows((v) =>
                          v.map((r, j) =>
                            i === j ? { ...r, title: e.target.value } : r,
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
                        setRows((v) =>
                          v.map((r, j) =>
                            i === j ? { ...r, prompt: e.target.value } : r,
                          ),
                        )
                      }
                    />
                  </label>
                  <RequirementSelection
                    shot={row}
                    points={state.points}
                    onChange={(keys) =>
                      setRows((v) =>
                        v.map((r, j) =>
                          i === j ? { ...r, requirement_keys: keys } : r,
                        ),
                      )
                    }
                  />
                  <ConfirmDestructiveAction
                    title={`Remove “${row.title || `Shot ${i + 1}`}”?`}
                    description="This removes the shot and its prompt from the unsaved plan. You will need to add it again if you change your mind."
                    onConfirm={() =>
                      setRows((v) => v.filter((_, j) => i !== j))
                    }
                    trigger={
                      <Button
                        variant="destructive"
                        disabled={rows.length === 1 || action.isPending}
                      >
                        <Trash2 />
                        Remove
                      </Button>
                    }
                  />
                </fieldset>
              ))}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={action.isPending || rows.length >= 50}
                  onClick={() =>
                    setRows((v) => [
                      ...v,
                      { title: "", prompt: "", requirement_keys: [] },
                    ])
                  }
                >
                  <Plus />
                  Add {kind === "image" ? "image" : "shot"}
                </Button>
                <Button
                  disabled={
                    action.isPending ||
                    rows.some((r) => !r.title.trim() || !r.prompt.trim())
                  }
                  onClick={() =>
                    run(async () => {
                      await api.saveStoryboard(
                        project.id,
                        current.summary || "",
                        rows,
                        token,
                      );
                      setPlanning(false);
                      setSelected("storyboard");
                    })
                  }
                >
                  Save {planTitle.toLowerCase()}
                </Button>
              </div>
            </div>
          )}
          {selected === "storyboard" && state && (
            <div className="grid gap-5">
              <p className="text-sm text-neutral-500">
                Generate the outputs you need. Each request is sent to
                Higgsfield. Only completed outputs become canvas nodes.
              </p>
              {state.changes.length > 0 && (
                <section className="grid gap-3 rounded-md border bg-neutral-50 p-4">
                  <h3 className="font-semibold">Change impact tracking</h3>
                  {state.changes.slice(0, 5).map((change) => (
                    <div key={change.id} className="grid gap-2 text-sm">
                      <strong>
                        Brief v{change.brief_version} · {change.note}
                      </strong>
                      {change.diffs.map((d) => (
                        <p key={d.key}>
                          {d.key}: {d.old || "Added"}{" "}
                          <ArrowRight className="inline size-3" />{" "}
                          {d.new || "Deleted"}
                        </p>
                      ))}
                      {change.impacts.map((i) => (
                        <div
                          key={i.shot_id}
                          className={`rounded-md p-2 ${i.status === "needs_review" ? "bg-amber-100" : "bg-emerald-50"}`}
                        >
                          <p>
                            {shots.data?.find((s) => s.id === i.shot_id)?.title}{" "}
                            ·{" "}
                            {i.status === "needs_review"
                              ? "Needs review"
                              : "Unchanged"}
                          </p>
                          {i.reasons.map((r) => (
                            <p key={r}>{r}</p>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </section>
              )}
              {shots.data?.map((shot) => (
                <section
                  key={shot.id}
                  className="grid gap-3 rounded-md border p-4"
                >
                  <h3 className="font-semibold">
                    {shot.position}. {shot.title}
                  </h3>
                  <p className="whitespace-pre-wrap text-sm">{shot.prompt}</p>
                  <ShotRequirements
                    key={`${shot.id}:${shot.requirement_keys.join()}`}
                    shot={shot}
                    points={state.points}
                    busy={action.isPending}
                    onSave={(keys) =>
                      run(async () => {
                        await api.linkRequirements(
                          project.id,
                          shot.id,
                          keys,
                          token,
                        );
                      })
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    {(state.output_type === "mixed"
                      ? ["image", "video"]
                      : [kind]
                    ).map((output) => (
                      <Button
                        key={output}
                        variant="generation"
                        disabled={blocked(shot.id, output)}
                        onClick={() =>
                          runGeneration(output as "image" | "video", () =>
                            generate(
                              shot.id,
                              output as "image" | "video",
                              shot.prompt,
                            ),
                          )
                        }
                      >
                        {output === "image" ? <ImageIcon /> : <Video />}Generate{" "}
                        {output}
                      </Button>
                    ))}
                  </div>
                  {jobs.data
                    ?.filter((j) => j.shot_id === shot.id)
                    .map((job, i) => (
                      <div
                        key={job.id}
                        className="flex flex-wrap items-center gap-2 text-sm"
                      >
                        <span>
                          {job.kind} · Version {i + 1} ·{" "}
                          {job.status.replaceAll("_", " ")}
                          {job.accepted ? " · Accepted" : ""}
                        </span>
                        {job.status === "completed" &&
                          job.outputs.length > 0 && (
                            <Button
                              variant="link"
                              onClick={() => open(`${shot.id}:${job.kind}`)}
                            >
                              Review versions
                            </Button>
                          )}
                        {["submitting", "unknown"].includes(job.status) && (
                          <p className="text-amber-700">
                            Check the provider dashboard before requesting
                            another generation.
                          </p>
                        )}
                      </div>
                    ))}
                </section>
              ))}
              <section className="grid gap-2 border-t pt-4">
                <h3 className="font-semibold">Final output</h3>
                <p className="text-sm text-neutral-500">
                  Accept one version per {kind === "image" ? "image" : "clip"}{" "}
                  and resolve changes first. Accepted clips are combined in
                  storyboard order.
                </p>
                <Button
                  disabled={action.isPending || jobs.isPending || jobs.isError}
                  onClick={() =>
                    run(async () => {
                      await api.final(project.id, kind, token);
                      await refresh();
                      setSelected("final");
                    })
                  }
                >
                  <Check />
                  {action.isPending
                    ? "Preparing…"
                    : kind === "image"
                      ? "Create final image collection"
                      : "Combine accepted clips"}
                </Button>
              </section>
            </div>
          )}
          {selectedShot && current && state && versions.length > 0 && (
            <MediaReview
              key={`${selectedShot.id}:${selectedKind}`}
              shot={selectedShot}
              versions={versions}
              brief={current}
              review={state}
              busy={action.isPending}
              blocked={blocked(selectedShot.id, selectedKind!)}
              onGenerate={(prompt, reason) =>
                runGeneration(selectedKind!,() =>
                  generate(selectedShot.id, selectedKind!, prompt, reason),
                )
              }
              onDecision={(job, decision, reason) =>
                run(() => decide(job, decision, reason))
              }
            />
          )}
          {selected === "final" && state && current && (
            <div className="grid gap-5">
              <FinalReview projectId={project.id} token={token} finals={state.finals} initialId={finalId}
                brief={current} jobs={jobs.data || []} busy={action.isPending || jobs.isPending || jobs.isError}
                run={run} runGeneration={runGeneration} onGenerationSubmitted={(id, status) => setGenerationProgress((current) => current ? { ...current, id, resource: "final", status } : current)} refresh={refresh} />
              <Button variant="outline" onClick={() => open(state.output_type === "image" ? "summary" : "storyboard")}>
                {state.output_type === "image" ? "Back to brief summary" : "Review storyboard"}
              </Button>
            </div>
          )}
          {notice && (
            <p role="status" className="text-sm text-emerald-700">
              {notice}
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error.message}
            </p>
          )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function RequirementSelection({
  shot,
  points,
  onChange,
}: {
  shot: { requirement_keys: string[] };
  points: NonNullable<Awaited<ReturnType<typeof api.review>>>["points"];
  onChange: (keys: string[]) => void;
}) {
  return (
    <div className="grid gap-2 text-sm">
      <span>Linked local requirements</span>
      {points
        .filter((p) => p.scope === "local")
        .map((p) => (
          <label key={p.key} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={shot.requirement_keys.includes(p.key)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...shot.requirement_keys, p.key]
                    : shot.requirement_keys.filter((k) => k !== p.key),
                )
              }
            />
            {p.key}: {p.value}
          </label>
        ))}
    </div>
  );
}
function ShotRequirements({
  shot,
  points,
  busy,
  onSave,
}: {
  shot: StoryboardShot;
  points: NonNullable<Awaited<ReturnType<typeof api.review>>>["points"];
  busy: boolean;
  onSave: (keys: string[]) => void;
}) {
  const [keys, setKeys] = useState(
    shot.requirement_keys.filter((key) =>
      points.some((point) => point.key === key),
    ),
  );
  return (
    <Accordion>
      <AccordionItem value="requirement-links">
        <AccordionTrigger>Edit requirement links</AccordionTrigger>
        <AccordionContent>
          <div className="grid gap-3">
            <RequirementSelection
              shot={{ requirement_keys: keys }}
              points={points}
              onChange={setKeys}
            />
            <Button variant="outline" disabled={busy} onClick={() => onSave(keys)}>
              Save links
            </Button>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
