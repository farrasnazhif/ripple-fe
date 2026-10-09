"use client";

import { FormEvent, useState } from "react";
import axios from "axios";
import { Upload, FileText, Plus } from "lucide-react";
import { SelectedBriefFile } from "@/components/project/selected-brief-file";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthToken } from "@/hooks/use-auth-token";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Project } from "@/types/ripple";

function ProjectPreview() {
  return (
    <svg className="block aspect-[360/146] h-auto w-full border-b border-neutral-200" viewBox="0 0 360 146" aria-hidden="true">
      <rect width="360" height="146" fill="#f0f1f0" />
      <path d="M99 53 H140 Q151 53 151 67 V96 H170" fill="none" stroke="#76b997" strokeWidth="2" />
      <path d="M250 105 H267" stroke="#4e5556" strokeWidth="2" />
      <rect x="12" y="14" width="88" height="92" rx="9" fill="white" />
      <rect x="170" y="75" width="80" height="55" rx="9" fill="white" />
      <rect x="267" y="75" width="80" height="55" rx="9" fill="white" />
      <rect x="141" y="26" width="90" height="19" rx="9" fill="white" />
      <rect x="254" y="26" width="90" height="19" rx="9" fill="white" />
      <FileText x="22" y="25" width="7" height="7" stroke="#303d3a" />
      <text x="32" y="32" fill="#303d3a" fontSize="8" fontWeight="700">Brief</text>
      <text x="22" y="52" fill="#7c8682" fontSize="6">Original creative direction</text>
      <text x="22" y="62" fill="#7c8682" fontSize="6">and source material</text>
      <rect x="21" y="80" width="69" height="12" rx="6" fill="#f8edab" />
      <text x="29" y="88" fill="#807747" fontSize="6">3 variations</text>
      <text x="152" y="38" fill="#6b7773" fontSize="7">Task 1</text>
      <text x="266" y="38" fill="#6b7773" fontSize="7">Task 2</text>
      <text x="179" y="91" fill="#303d3a" fontSize="7" fontWeight="700">Story Board</text>
      <text x="275" y="91" fill="#303d3a" fontSize="7" fontWeight="700">Production</text>
      <text x="179" y="105" fill="#9ba5a0" fontSize="6">Shot decisions</text>
      <text x="275" y="105" fill="#9ba5a0" fontSize="6">Output versions</text>
    </svg>
  );
}

export function ProjectList() {
  const token = useAuthToken();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
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
      const invalid = files.find((file) => !file.size || file.size > 25 * 1024 * 1024 || file.name.length > 255 || /[/\\]/.test(file.name));
      if (invalid) throw new Error(`${invalid.name} must have a valid name and be between 1 byte and 25 MiB.`);
      if (files.length) {
        const storage = await api.attachmentStorageStatus(token!);
        if (!storage.available) throw new Error("File uploads are temporarily unavailable. Please try again later.");
      }
      const project = savedProject ?? await create.mutateAsync();
      setSavedProject(project);
      void queryClient.invalidateQueries({ queryKey: ["projects", token] });
      for (const [index, file] of files.entries()) {
        if (uploaded.includes(index)) continue;
        const started = await api.startAttachment(project.brief_id, file, token!);
        await axios.put(started.upload_url, file, { headers: { "Content-Type": started.content_type } });
        await api.completeAttachment(project.brief_id, started.attachment.id, token!);
        setUploaded((current) => [...current, index]);
      }
      router.push(`/project/${project.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create project.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-58px)] bg-white text-neutral-800">
      <div className="max-w-[1290px] px-6 pt-6 pb-24 sm:px-11 sm:pt-8">

        <Dialog open={creating} onOpenChange={setDialogOpen}>
          <DialogContent className="max-h-[90vh] w-[calc(100vw-32px)] overflow-y-auto rounded-md p-7 sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>New project</DialogTitle>
              <DialogDescription>Give your project a name and add any files for its brief.</DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="grid gap-4">
              <Label className="grid gap-2 font-semibold">
                Title
                <Input value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} disabled={!!savedProject || busy} placeholder="Name your project" />
              </Label>
              <Label className="grid gap-2 font-semibold">
                Description <span className="font-normal text-neutral-500">(optional)</span>
                <Textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} disabled={!!savedProject || busy} placeholder="What is this project about?" />
              </Label>
              <label className="relative grid cursor-pointer justify-items-center gap-2 rounded-md border-2 border-dashed border-emerald-200 bg-emerald-50/60 px-4 py-7 text-center text-emerald-800 focus-within:ring-2 focus-within:ring-emerald-500" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (!busy) addFiles(event.dataTransfer.files); }}>
                <Upload size={22} />
                <strong>Drop brief files here or choose files</strong>
                <span className="text-xs text-neutral-500">Choose multiple images or documents, or add more files anytime · up to 25 MiB each</span>
                <input className="absolute inset-0 h-full w-full cursor-pointer opacity-0" type="file" multiple disabled={busy} onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = ""; }} />
              </label>
              {files.length > 0 && <div className="space-y-2"><p className="text-xs text-neutral-500">{files.length} file{files.length === 1 ? "" : "s"} selected</p><ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">{files.map((file, index) => <SelectedBriefFile key={`${file.name}-${index}`} file={file} uploaded={uploaded.includes(index)} onRemove={!savedProject && !busy ? () => setFiles((current) => current.filter((_, item) => item !== index)) : undefined} />)}</ul></div>}
              {savedProject && error && <p className="text-xs text-amber-800">Project saved. Retry to finish uploading the remaining files.</p>}
              {error && <p className="rounded-md bg-red-50 p-3 text-xs text-red-700" role="alert">{error}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} disabled={busy}>Cancel</Button>
                <Button type="submit" disabled={busy || !name.trim()}>{busy ? "Saving…" : savedProject ? "Retry upload" : "Create project"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {projects.isPending ? (
          <p className="py-10 text-neutral-500">Loading projects…</p>
        ) : projects.isError ? (
          <div className="space-y-4 py-10 text-neutral-500" role="alert">
            <p>Could not load projects: {projects.error.message}</p>
            <Button variant="outline" onClick={() => projects.refetch()}>Try again</Button>
          </div>
        ) : projects.data.length === 0 ? (
          <div className="space-y-4 py-10 text-neutral-500">
            <h2 className="text-2xl font-semibold text-neutral-800">No projects yet</h2>
            <p>Create your first project to open its canvas.</p>
            <Button onClick={() => setCreating(true)}>Create a project</Button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {projects.data.map((project) => (
              <Link className="block rounded-md focus-visible:outline-emerald-500" href={`/project/${project.id}`} key={project.id}>
                <Card className="block h-full gap-0 overflow-hidden rounded-md border-2 border-neutral-200 p-0 shadow-none transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg">
                  <ProjectPreview />
                  <div className="px-6 pt-7 pb-9">
                    <h2 className="mb-2 text-[26px] leading-tight font-semibold tracking-tight">{project.name}</h2>
                    <p className="line-clamp-2 text-[13px] leading-relaxed text-neutral-600">{project.description || "Open this project to explore its canvas."}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
      <Button
        className="fixed right-6 bottom-6 z-10 size-12 rounded-md bg-[#19b99a] text-white shadow-lg hover:bg-[#14a98d]"
        onClick={() => setCreating(true)}
        aria-label="Create a project"
      >
        <Plus className="size-6" />
      </Button>
    </div>
  );
}
