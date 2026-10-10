"use client";
import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import type { Project } from "@/types/ripple";
export function ProjectEditDialog({
  project,
  token,
  onClose,
}: {
  project: Project;
  token: string;
  onClose: () => void;
}) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const cache = useQueryClient();
  const edit = useMutation({
    mutationFn: () => api.updateProject(project.id, name, description, token),
    onSuccess: async (updated) => {
      cache.setQueryData(["project", token, project.id], updated);
      await cache.invalidateQueries({ queryKey: ["projects", token] });
      onClose();
    },
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!edit.isPending) edit.mutate();
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !edit.isPending) onClose();
      }}
    >
      <DialogContent
        className="rounded-md sm:max-w-xl"
        showCloseButton={!edit.isPending}
      >
        <DialogHeader>
          <DialogTitle>Edit project</DialogTitle>
          <DialogDescription>
            Update the title and description for this project.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <Label className="grid gap-2">
            <span>Title <span aria-hidden="true" className="text-destructive">*</span></span>
            <Input
              required
              maxLength={100}
              value={name}
              disabled={edit.isPending}
              onChange={(e) => setName(e.target.value)}
            />
          </Label>
          <Label className="grid gap-2">
            Description
            <Textarea
              maxLength={500}
              value={description}
              disabled={edit.isPending}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Label>
          {edit.error && (
            <p role="alert" className="text-sm text-destructive">
              {edit.error.message}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={edit.isPending}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={edit.isPending || !name.trim()}>
              {edit.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
