"use client";

import { useRef, useState } from "react";
import { downloadFile } from "@/lib/download-file";
import { Button } from "@/components/ui/button";

export function DownloadOutputButton({ url, filename, video, disabled }: {
  url: string;
  filename: string;
  video: boolean;
  disabled?: boolean;
}) {
  const running = useRef(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  async function download() {
    if (running.current) return;
    running.current = true;
    setDownloading(true);
    setError("");
    try {
      await downloadFile(url, filename);
    } catch {
      setError("Could not download this output. Please try again.");
    } finally {
      running.current = false;
      setDownloading(false);
    }
  }

  return <div className="grid gap-1">
    <Button variant="link" className="w-fit justify-start px-0" disabled={disabled || downloading} onClick={download}>
      {downloading ? "Downloading…" : video ? "Download video" : "Download image"}
    </Button>
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
  </div>;
}
