"use client";

import { useEffect, useRef } from "react";
import { FileText, X } from "lucide-react";

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
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${file.name}`}
          className="absolute right-2 top-2 z-10 flex size-7 items-center justify-center rounded-md bg-red-500 text-white shadow-sm transition-colors hover:bg-red-600"
        >
          <X className="size-4" strokeWidth={2.5} />
        </button>
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
            <FileText className="size-10 text-neutral-400" />
          </div>
        )}
      </div>

      <div className="flex flex-col items-start gap-2 p-3">
        <p className="w-full break-words text-xs font-medium">{file.name}</p>

        <small className="text-xs text-emerald-700">
          {uploaded ? "Uploaded" : `${(file.size / 1024).toFixed(0)} KB`}
        </small>
      </div>
    </li>
  );
}
