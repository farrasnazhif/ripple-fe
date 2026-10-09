"use client";

import { useEffect, useRef } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDestructiveAction } from "@/components/ui/confirm-destructive-action";

export function SelectedBriefFile({
  file,
  uploaded,
  onRemove,
}: {
  file: File;
  uploaded: boolean;
  onRemove?: () => void;
}) {
  const image = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!image.current || !file.type.startsWith("image/")) return;

    const url = URL.createObjectURL(file);
    image.current.src = url;

    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <li className="relative flex min-w-0 flex-col overflow-hidden rounded-md border border-neutral-200">
      {onRemove && (
        <ConfirmDestructiveAction
          title={`Remove “${file.name}”?`}
          description="Remove this file from the selected uploads. You can choose it again before saving."
          trigger={
            <Button
              type="button"
              variant="destructive"
              aria-label={`Remove ${file.name}`}
              className="absolute right-2 top-2 z-10 shadow-sm"
            >
              Remove
            </Button>
          }
          onConfirm={onRemove}
        />
      )}

      <div className="relative aspect-square w-full overflow-hidden bg-neutral-50">
        {file.type.startsWith("image/") ? (
          // local blob previews use the browser directly
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={image}
            alt={file.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <FileText className="size-6 text-neutral-400" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-col items-start gap-1 p-2">
        <p title={file.name} className="w-full truncate text-xs font-medium">{file.name}</p>

        <small className="text-xs text-emerald-700">
          {uploaded ? "Uploaded" : `${(file.size / 1024).toFixed(0)} KB`}
        </small>
      </div>
    </li>
  );
}
