"use client";

import { FormEvent, useState } from "react";
import axios from "axios";
import { Upload, Plus, Pencil, Trash2 } from "lucide-react";
import { SelectedBriefFile } from "@/components/project/selected-brief-file";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthToken } from "@/hooks/use-auth-token";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { ConfirmDestructiveAction } from "@/components/ui/confirm-destructive-action";
import { ProjectBudgetButton } from "@/components/project/project-budget";
import { ProjectEditDialog } from "@/components/project/project-edit-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Project } from "@/types/ripple";

export function ProjectList() {
  const token = useAuthToken();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [briefText, setBriefText] = useState("");
  const [briefSaved, setBriefSaved] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploaded, setUploaded] = useState<number[]>([]);
  const [savedProject, setSavedProject] = useState<Project | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const projects = useQuery({
    queryKey: ["projects", token],
    queryFn: () => api.projects(token!),
    enabled: !!token,
  });
  const create = useMutation({
    mutationFn: () => api.createProject(name, description, token!),
  });

  function addFiles(next: FileList | File[]) {
    const selectedFiles = Array.from(next);
    setFiles((current) => [...current, ...selectedFiles]);
  }

  function setDialogOpen(open: boolean) {
    if (!open && !busy) {
      setName("");
      setDescription("");
      setBriefText("");
      setBriefSaved(false);
      setFiles([]);
      setUploaded([]);
      setSavedProject(null);
      setError("");
    }
    setCreating(open);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const invalid = files.find(
        (file) =>
          !file.size ||
          file.size > 25 * 1024 * 1024 ||
          file.name.length > 255 ||
          /[/\\]/.test(file.name),
      );
      if (invalid)
        throw new Error(
          `${invalid.name} must have a valid name and be between 1 byte and 25 MiB.`,
        );
      if (files.length) {
        const storage = await api.attachmentStorageStatus(token!);
        if (!storage.available)
          throw new Error(
            "File uploads are temporarily unavailable. Please try again later.",
          );
      }
      const project = savedProject ?? (await create.mutateAsync());
      setSavedProject(project);
      if (!briefSaved) {
        await api.setBriefText(project.brief_id, briefText.trim(), token!);
        setBriefSaved(true);
      }
      void queryClient.invalidateQueries({ queryKey: ["projects", token] });
      for (const [index, file] of files.entries()) {
        if (uploaded.includes(index)) continue;
        const started = await api.startAttachment(
          project.brief_id,
          file,
          token!,
        );
        await axios.put(started.upload_url, file, {
          headers: { "Content-Type": started.content_type },
        });
        await api.completeAttachment(
          project.brief_id,
          started.attachment.id,
          token!,
        );
        setUploaded((current) => [...current, index]);
      }
      router.push(`/project/${project.id}`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not create project.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-58px)] bg-white text-neutral-800">
      <div className="max-w-[1290px] px-6 pt-6 pb-24 sm:px-6 sm:pt-8">
        <Dialog open={creating} onOpenChange={setDialogOpen}>
          <DialogContent className="max-h-[90vh] w-[calc(100vw-32px)] overflow-y-auto rounded-md p-7 sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>New project</DialogTitle>
              <DialogDescription>
                Add a project name, a text brief, and any reference files.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="grid gap-4">
              <Label className="grid gap-2 font-normal">
                Title
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  maxLength={100}
                  disabled={!!savedProject || busy}
                  placeholder="Name your project"
                />
              </Label>
              <Label className="grid gap-2 font-normal">
                Description
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={500}
                  disabled={!!savedProject || busy}
                  placeholder="What is this project about?"
                />
              </Label>
              <Label className="grid gap-2 font-normal">
                Brief
                <Textarea
                  value={briefText}
                  onChange={(event) => setBriefText(event.target.value)}
                  required
                  maxLength={100000}
                  disabled={!!savedProject || busy}
                  className="min-h-52 font-normal"
                  placeholder="Enter the brief for your project."
                />
              </Label>
              <label
                className="relative grid cursor-pointer justify-items-center gap-2 rounded-md border-2 border-dashed border-emerald-200 bg-emerald-50/60 px-4 py-7 text-center text-emerald-800 focus-within:ring-2 focus-within:ring-emerald-500"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (!busy) addFiles(event.dataTransfer.files);
                }}
              >
                <Upload size={22} />
                <strong>Drop brief files here or choose files</strong>
                <span className="text-xs text-neutral-500">
                  Choose multiple images or documents, or add more files anytime
                  · up to 25 MiB each
                </span>
                <input
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  type="file"
                  multiple
                  disabled={busy}
                  onChange={(event) => {
                    if (event.target.files) addFiles(event.target.files);
                    event.target.value = "";
                  }}
                />
              </label>
              {files.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-neutral-500">
                    {files.length} file{files.length === 1 ? "" : "s"} selected
                  </p>
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {files.map((file, index) => (
                      <SelectedBriefFile
                        key={`${file.name}-${index}`}
                        file={file}
                        uploaded={uploaded.includes(index)}
                        onRemove={
                          !savedProject && !busy
                            ? () =>
                                setFiles((current) =>
                                  current.filter((_, item) => item !== index),
                                )
                            : undefined
                        }
                      />
                    ))}
                  </ul>
                </div>
              )}
              {savedProject && error && (
                <p className="text-xs text-amber-800">
                  Project saved. Retry to finish uploading the remaining files.
                </p>
              )}
              {error && (
                <p
                  className="rounded-md bg-red-50 p-3 text-xs text-red-700"
                  role="alert"
                >
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDialogOpen(false)}
                  disabled={busy}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={busy || !name.trim() || !briefText.trim()}>
                  {busy
                    ? "Saving…"
                    : savedProject
                      ? "Retry upload"
                      : "Create project"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {projects.isPending ? (
          <p className="py-10 text-neutral-500">Loading projects…</p>
        ) : projects.isError ? (
          <div className="space-y-4 py-10 text-neutral-500" role="alert">
            <p>Could not load projects: {projects.error.message}</p>
            <Button variant="outline" onClick={() => projects.refetch()}>
              Try again
            </Button>
          </div>
        ) : projects.data.length === 0 ? (
          <div className="space-y-4 py-10 text-neutral-500">
            <h2 className="text-2xl font-semibold text-neutral-800">
              No projects yet
            </h2>
            <p>Create your first project to open its canvas.</p>
            <Button onClick={() => setCreating(true)}>Create a project</Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <Table aria-label="Projects">
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created by</TableHead>
                  <TableHead>Created at</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.data.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/project/${project.id}`}
                        title={project.name}
                        className="block max-w-64 truncate text-primary hover:underline"
                      >
                        {project.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <p
                        className="line-clamp-2 max-w-96 min-w-40 whitespace-normal text-muted-foreground"
                        title={project.description}
                      >
                        {project.description || "No description"}
                      </p>
                    </TableCell>
                    <TableCell>{project.created_by}</TableCell>
                    <TableCell>
                      <time
                        dateTime={project.created_at}
                        title={new Date(project.created_at).toLocaleString(
                          "en-US",
                        )}
                      >
                        {new Date(project.created_at).toLocaleDateString(
                          "en-US",
                          { year: "numeric", month: "short", day: "numeric" },
                        )}
                      </time>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <ProjectBudgetButton projectId={project.id} token={token!} />
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label={`Edit ${project.name}`}
                          onClick={() => setEditing(project)}
                        >
                          <Pencil />
                          Edit
                        </Button>
                        <ConfirmDestructiveAction
                          title={`Delete “${project.name}”?`}
                          description="This permanently deletes the project, its brief history, storyboard, generations, decisions, and final outputs. This cannot be undone."
                          confirmLabel="Delete project"
                          trigger={
                            <Button
                              size="sm"
                              variant="destructive"
                              aria-label={`Delete ${project.name}`}
                            >
                              <Trash2 />
                              Delete
                            </Button>
                          }
                          onConfirm={async () => {
                            await api.deleteProject(project.id, token!);
                            queryClient.removeQueries({
                              predicate: (query) =>
                                query.queryKey.includes(project.id) ||
                                query.queryKey.includes(project.brief_id),
                            });
                            await queryClient.invalidateQueries({
                              queryKey: ["projects", token],
                            });
                          }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      {editing && token && (
        <ProjectEditDialog
          key={editing.id}
          project={editing}
          token={token}
          onClose={() => setEditing(null)}
        />
      )}
      <Button
        className="fixed right-6 bottom-6 z-10 size-12 rounded-md shadow-lg"
        onClick={() => setCreating(true)}
        aria-label="Create a project"
      >
        <Plus className="size-6" />
      </Button>
    </div>
  );
}
