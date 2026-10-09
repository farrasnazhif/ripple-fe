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
  Download,
  ArrowRight,
} from "lucide-react";
import { GraphCanvas } from "@/components/workspace/graph-canvas";
import { BriefEditor } from "@/components/workspace/brief-editor";
import { MediaReview, MediaPreview } from "@/components/workspace/media-review";
import { ConfirmDestructiveAction } from "@/components/ui/confirm-destructive-action";
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
import type { Project, StoryboardShot, GenerationJob } from "@/types/ripple";
type PlanRow = { title: string; prompt: string; requirement_keys: string[] };
export function Workspace({
  project,
  token,
}: {
  project: Project;
  token: string;
}) {
  const cache = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
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
    queryFn: () => api.review(project.id, token),
    refetchInterval: 4 * 60 * 1000,
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
  async function refresh() {
    await Promise.all(
      ["brief", "attachments", "storyboard", "generations", "review"].map(
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
    setSelected(id);
    setPlanning(false);
    setNotice("");
    action.reset();
  }
  const state = review.data;
  const current = brief.data;
  const kind = state?.output_type === "image" ? "image" : "video";
  const planTitle = kind === "image" ? "Image Plan" : "Storyboard";
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
    const job = await api.generate(
      project.id,
      shot,
      output,
      requestKey,
      token,
      savedPrompt,
    );
    sessionStorage.removeItem(storageKey);
    sessionStorage.removeItem(`${storageKey}:prompt`);
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
    <div className="flex h-[calc(100dvh-58px)] min-h-0 flex-col overflow-hidden">
      <GraphCanvas
        projectName={project.name}
        description={project.description}
        rawText={current?.raw_text || ""}
        summary={current?.summary}
        fileCount={attachments.data?.length || 0}
        shots={shots.data}
        jobs={jobs.data}
        review={state}
        onSelect={open}
      />
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
      <Dialog
        open={!!selected}
        onOpenChange={(value) => {
          if (!value && !action.isPending) {
            setSelected(null);
            setPlanning(false);
          }
        }}
      >
        <DialogContent
          className={`max-h-[90vh] overflow-y-auto rounded-md p-6 sm:max-w-4xl ${selectedShot ? "lg:max-w-6xl" : ""}`}
        >
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
          {(!current || !state) && <p>Loading project…</p>}
          {current &&
            state &&
            (selected === "brief" || selected === "summary") &&
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
                    {shots.data?.length ? (
                      <Button onClick={() => open("storyboard")}>
                        Open {planTitle.toLowerCase()}
                      </Button>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {(["image", "video"] as const).map((output) => (
                          <Button
                            key={output}
                            variant="outline"
                            disabled={
                              action.isPending ||
                              shots.isPending ||
                              shots.isError
                            }
                            onClick={() =>
                              run(async () => {
                                await api.outputType(project.id, output, token);
                                await refresh();
                                setPlanning(true);
                              })
                            }
                          >
                            {output === "image" ? <ImageIcon /> : <Video />}
                            {output === "image"
                              ? "Images · Create image plan"
                              : "Video · Create storyboard"}
                          </Button>
                        ))}
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
                variant="outline"
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
                        variant="ghost"
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
                        variant="outline"
                        disabled={blocked(shot.id, output)}
                        onClick={() =>
                          run(() =>
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
                run(() =>
                  generate(selectedShot.id, selectedKind!, prompt, reason),
                )
              }
              onDecision={(job, decision, reason) =>
                run(() => decide(job, decision, reason))
              }
            />
          )}
          {selected === "final" && state && (
            <div className="grid gap-5">
              {state.finals.map((final) => (
                <section
                  key={final.id}
                  className="grid gap-3 rounded-md border p-4"
                >
                  <h3 className="font-semibold">
                    {final.kind === "video" ? "Final Video" : "Final Images"} ·
                    Brief v{final.brief_version}
                  </h3>
                  {current && final.brief_version < current.version && (
                    <p className="text-sm text-amber-700">
                      This output belongs to an earlier brief. Review affected
                      shots before creating a new final.
                    </p>
                  )}
                  {(final.download_url
                    ? [final.download_url]
                    : final.outputs
                  ).map((url) => (
                    <div key={url} className="grid gap-2">
                      <MediaPreview url={url} video={final.kind === "video"} />
                      <a
                        className="flex items-center gap-2 text-sm underline"
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download size={16} />
                        Open / download output
                      </a>
                    </div>
                  ))}
                  <p className="text-sm text-neutral-500">
                    {final.job_ids.length} accepted versions, in plan order.
                  </p>
                </section>
              ))}
              <Button variant="outline" onClick={() => open("storyboard")}>
                Review {planTitle.toLowerCase()}
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
    <details>
      <summary className="cursor-pointer text-sm">
        Edit requirement links
      </summary>
      <div className="mt-3 grid gap-3">
        <RequirementSelection
          shot={{ requirement_keys: keys }}
          points={points}
          onChange={setKeys}
        />
        <Button variant="outline" disabled={busy} onClick={() => onSave(keys)}>
          Save links
        </Button>
      </div>
    </details>
  );
}
