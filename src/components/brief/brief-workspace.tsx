"use client";

import { useState } from "react";
import { ArrowRight, ArrowUpRight, FileText, Plus } from "lucide-react";
import Link from "next/link";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { Attachment, Brief } from "@/types/ripple";
import { useAuthToken } from "@/hooks/use-auth-token";

export function BriefWorkspace() {
  const token = useAuthToken();
  const [rawText, setRawText] = useState("");
  const [openID, setOpenID] = useState("");
  const [brief, setBrief] = useState<Brief | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const queryClient = useQueryClient();
  const attachmentQuery = useQuery({
    queryKey: ["attachments", token, brief?.id],
    queryFn: () => api.attachments(brief!.id, token!),
    enabled: !!brief && !!token,
  });
  const attachments = attachmentQuery.data ?? [];
  const createMutation = useMutation({
    mutationFn: ({ text, auth }: { text: string; auth: string }) =>
      api.createBrief(text, auth),
  });
  const uploadMutation = useMutation({
    mutationFn: async ({
      file,
      saved,
      auth,
    }: {
      file: File;
      saved: Brief;
      auth: string;
    }) => {
      const started = await api.startAttachment(saved.id, file, auth);
      await axios.put(started.upload_url, file, {
        headers: { "Content-Type": started.content_type },
      });
      return api.completeAttachment(saved.id, started.attachment.id, auth);
    },
  });
  const summaryMutation = useMutation({
    mutationFn: ({ saved, auth }: { saved: Brief; auth: string }) =>
      api.draftSummary(saved.id, auth),
  });
  const confirmMutation = useMutation({
    mutationFn: async ({
      saved,
      text,
      auth,
    }: {
      saved: Brief;
      text: string;
      auth: string;
    }) => {
      await api.confirmSummary(saved.id, text, auth);
      return api.getBrief(saved.id, auth);
    },
  });
  const downloadMutation = useMutation({
    mutationFn: ({
      saved,
      item,
      auth,
    }: {
      saved: Brief;
      item: Attachment;
      auth: string;
    }) => api.downloadAttachment(saved.id, item.id, auth),
  });

  async function run(label: string, action: () => Promise<void>) {
    setBusy(label);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Something went wrong.",
      );
    } finally {
      setBusy("");
    }
  }

  async function createBrief() {
    if (!token) return;
    await run("create", async () => {
      const created = await createMutation.mutateAsync({
        text: rawText,
        auth: token,
      });
      setBrief(created);
      setDraft("");
      setNotice("Brief draft saved. The original text is preserved.");
    });
  }

  async function openBrief() {
    if (!token || !openID.trim()) return;
    await run("open", async () => {
      const id = openID.trim();
      const saved = await queryClient.fetchQuery({
        queryKey: ["brief", token, id],
        queryFn: () => api.getBrief(id, token),
        staleTime: 0,
      });
      setBrief(saved);
      setRawText(saved.raw_text);
      setDraft("");
      setNotice("Brief loaded from your account.");
    });
  }

  async function upload(file: File) {
    if (!token || !brief) return;
    await run("upload", async () => {
      await uploadMutation.mutateAsync({ file, saved: brief, auth: token });
      await queryClient.invalidateQueries({
        queryKey: ["attachments", token, brief.id],
      });
      setNotice(`${file.name} uploaded and verified.`);
    });
  }

  async function draftSummary() {
    if (!token || !brief) return;
    await run("summary", async () => {
      const result = await summaryMutation.mutateAsync({
        saved: brief,
        auth: token,
      });
      setDraft(result.summary);
      setNotice("Review this draft before saving it.");
    });
  }

  async function confirmSummary() {
    if (!token || !brief || !draft.trim()) return;
    await run("confirm", async () => {
      setBrief(
        await confirmMutation.mutateAsync({
          saved: brief,
          text: draft,
          auth: token,
        }),
      );
      setNotice("Summary confirmed. The original brief is unchanged.");
    });
  }

  async function download(item: Attachment) {
    if (!token || !brief) return;
    await run("download", async () => {
      const result = await downloadMutation.mutateAsync({
        saved: brief,
        item,
        auth: token,
      });
      window.location.assign(result.download_url);
    });
  }

  return (
    <div className="min-w-0 flex-1">
      <div className="min-h-screen">
        <header className="flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-5 sm:px-9">
          <div className="text-[10px] font-extrabold tracking-[0.15em] text-slate-600">
            WORKSPACE <span className="mx-3 text-neutral-300">/</span> BRIEFS
          </div>
          <div className="flex items-center">
            <Badge className="h-auto rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-[10px] font-bold tracking-widest text-emerald-800">SOURCE MATERIAL</Badge>
          </div>
        </header>
        <div className="px-5 pt-10 pb-8 sm:px-11">
          <div className="text-[10px] font-extrabold tracking-[0.15em] text-emerald-700">START WITH THE SOURCE</div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Keep the brief intact<span className="text-orange-400">.</span>
          </h1>
          <p className="max-w-2xl leading-relaxed text-neutral-500">
            Save the original text and files, then review a short AI summary
            before it becomes part of the record.
          </p>
        </div>
        {!token ? (
          <div className="mx-auto max-w-xl rounded-md border border-neutral-200 bg-white px-6 py-16 text-center">
            <FileText className="mx-auto size-9 text-emerald-600" />
            <h2 className="text-2xl font-semibold">Sign in to work with briefs</h2>
            <p className="mx-auto my-4 max-w-sm text-neutral-500">
              Briefs and private R2 attachments require an authenticated
              account.
            </p>
            <Link href="/sign-in" className="inline-flex rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground">
              Sign in <ArrowRight className="ml-2 size-4" />
            </Link>
          </div>
        ) : (
          <div className="grid items-start gap-5 px-5 pb-9 lg:grid-cols-2 sm:px-11">
            <Card className="block rounded-md border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="text-[10px] font-extrabold tracking-[0.15em] text-emerald-700">01 / SOURCE TEXT</div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">Original brief</h2>
              <p className="mb-5 text-xs leading-relaxed text-neutral-500">
                The text is stored exactly as entered. You can also create an
                attachment-only brief.
              </p>
              <div className="mb-4 flex gap-2">
                <Input
                  className="min-w-0 flex-1"
                  aria-label="Existing brief ID"
                  placeholder="Open an existing brief by ID"
                  value={openID}
                  onChange={(event) => setOpenID(event.target.value)}
                  disabled={!!busy}
                />
                <Button
                  className="border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                  variant="outline"
                  onClick={openBrief}
                  disabled={!openID.trim() || !!busy}
                >
                  {busy === "open" ? "Opening…" : "Open"}
                </Button>
              </div>
              <Textarea
                className="w-full resize-y bg-[#fbfcfa]"
                aria-label="Original brief text"
                placeholder="Paste the creative brief here…"
                value={rawText}
                onChange={(event) => setRawText(event.target.value)}
                disabled={!!brief}
                rows={12}
              />
              <div className="mt-4 flex items-center gap-3">
                <Button
                  onClick={createBrief}
                  disabled={!!brief || !!busy}
                >
                  {busy === "create"
                    ? "Saving…"
                    : brief
                      ? "Brief saved"
                      : "Create brief"}
                  <ArrowRight />
                </Button>
                {brief && (
                  <Button
                    variant="ghost"
                    className="text-emerald-700"
                    onClick={() => {
                      setBrief(null);
                      setRawText("");
                      setDraft("");
                      setError("");
                      setNotice("");
                    }}
                  >
                    New brief
                  </Button>
                )}
              </div>
              {brief && (
                <div className="mt-4 break-all text-xs text-neutral-500">
                  Saved as {brief.id} · v{brief.version}
                </div>
              )}
            </Card>
            <div className="flex flex-col gap-5">
              <Card className="block rounded-md border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="text-[10px] font-extrabold tracking-[0.15em] text-emerald-700">02 / ATTACHMENTS</div>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight">Reference files</h2>
                <p className="mb-5 text-xs leading-relaxed text-neutral-500">
                  Originals are stored privately in Cloudflare R2. Maximum 25
                  MiB per file.
                </p>
                <label
                  className={`flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-emerald-200 bg-emerald-50 text-xl text-emerald-700 ${!brief || !!busy ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  <Plus className="size-5" /><strong className="text-xs">Choose a file</strong>
                  <small className="text-[10px] text-neutral-500">Images, documents, and other brief references</small>
                  <Input
                    className="sr-only"
                    type="file"
                    disabled={!brief || !!busy}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void upload(file);
                      event.target.value = "";
                    }}
                  />
                </label>
                {busy === "upload" && (
                  <p className="text-xs text-emerald-700">Uploading and verifying…</p>
                )}
                {attachmentQuery.error && (
                  <p className="rounded-md bg-red-50 p-3 text-xs text-red-700" role="alert">
                    {attachmentQuery.error.message}
                  </p>
                )}
                {attachments.map((item) => (
                  <Button
                    key={item.id}
                    className="flex h-auto w-full justify-between border-b border-neutral-200 bg-transparent px-0 py-3 text-left text-xs text-neutral-700 shadow-none hover:bg-neutral-50"
                    variant="ghost"
                    onClick={() => download(item)}
                  >
                    <span className="flex min-w-0 items-center gap-2"><FileText className="size-4 shrink-0" /><span className="truncate">{item.file_name}</span></span>
                    <small className="flex shrink-0 items-center gap-1 text-emerald-700">{(item.size_bytes / 1024).toFixed(0)} KB <ArrowUpRight className="size-4" /></small>
                  </Button>
                ))}
              </Card>
              <Card className="block rounded-md border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="text-[10px] font-extrabold tracking-[0.15em] text-emerald-700">03 / REVIEW</div>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight">Brief summary</h2>
                <p className="mb-5 text-xs leading-relaxed text-neutral-500">
                  ChatGPT drafts from text you enter here. Attached file
                  contents are not extracted yet.
                </p>
                {brief?.summary ? (
                  <div className="rounded-md bg-emerald-50 p-4 leading-relaxed whitespace-pre-wrap text-emerald-900">
                    <div className="mb-2 text-[10px] font-extrabold tracking-[0.15em] text-emerald-700">CONFIRMED SUMMARY</div>
                    <p>{brief.summary}</p>
                  </div>
                ) : (
                  <>
                    <Button
                      className="border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      variant="outline"
                      onClick={draftSummary}
                      disabled={!brief || !rawText.trim() || !!busy}
                    >
                      {busy === "summary"
                        ? "Drafting…"
                        : "Generate summary draft"}
                      <ArrowUpRight />
                    </Button>
                    {draft && (
                      <div className="mt-4">
                        <label className="mb-2 block text-xs font-semibold text-emerald-800" htmlFor="summary-review">
                          Review and edit draft
                        </label>
                        <Textarea
                          id="summary-review"
                          value={draft}
                          onChange={(event) => setDraft(event.target.value)}
                          rows={5}
                        />
                        <Button
                          className="mt-3"
                          disabled={!!busy || !draft.trim()}
                          onClick={confirmSummary}
                        >
                          {busy === "confirm" ? "Saving…" : "Confirm summary"}
                          <ArrowRight />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </Card>
            </div>
          </div>
        )}
        {error && (
          <p className="fixed right-6 bottom-6 z-30 max-w-sm rounded-md bg-red-700 px-5 py-3 text-white shadow-xl" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="fixed right-6 bottom-6 z-30 max-w-sm rounded-md bg-emerald-700 px-5 py-3 text-white shadow-xl" role="status">
            {notice}
          </p>
        )}
        <footer className="px-5 pb-8 text-xs text-neutral-400 sm:px-11">
          Only the brief owner can request attachment downloads. Provider
          credentials stay on the Go server.
        </footer>
      </div>
    </div>
  );
}
