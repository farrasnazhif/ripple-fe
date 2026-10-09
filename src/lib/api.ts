import axios, { type AxiosRequestConfig } from "axios";
import type { Attachment, Brief, Graph, Project, StoryboardShot, GenerationJob } from "@/types/ripple";

const client = axios.create({
  baseURL: (
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1"
  ).replace(/\/$/, ""),
});

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  config: AxiosRequestConfig = {},
  token?: string,
): Promise<T> {
  try {
    const response = await client.request<{ data: T }>({
      ...config,
      url: path,
      headers: {
        ...config.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return response.data.data;
  } catch (cause) {
    if (axios.isAxiosError(cause)) {
      const payload = cause.response?.data as { message?: string } | undefined;
      throw new ApiError(
        payload?.message || cause.message || "Request failed.",
        cause.response?.status || 0,
      );
    }
    throw cause;
  }
}

export const api = {
  setBriefText: (id: string, raw_text: string, token: string) => request<null>(`/briefs/${id}/text`, { method: "PUT", data: { raw_text } }, token),
  storyboard: (id: string, token: string) => request<StoryboardShot[]>(`/projects/${id}/storyboard`, {}, token),
  saveStoryboard: (id: string, summary: string, shots: {title: string; prompt: string}[], token: string) => request<null>(`/projects/${id}/storyboard`, {method: "POST", data: {summary, shots}}, token),
  generations: (id: string, token: string) => request<GenerationJob[]>(`/projects/${id}/generations`, {}, token),
  generate: (id: string, shot: string, kind: "image" | "video", request_key: string, token: string) => request<GenerationJob>(`/projects/${id}/shots/${shot}/generations`, {method: "POST", data: {kind, request_key}}, token),
  generation: (id: string, job: string, token: string) => request<GenerationJob>(`/projects/${id}/generations/${job}`, {}, token),
  graph: (scenario: string, token: string) =>
    request<Graph>(
      "/demo/graph",
      { params: { scenario } },
      token,
    ),
  login: (email: string, password: string) =>
    request<{ token: string }>("/auth/login", {
      method: "POST",
      data: { email, password },
    }),
  register: (username: string, email: string, password: string) =>
    request<{ token: string }>("/auth/register", {
      method: "POST",
      data: { username, email, password },
    }),
  me: (token: string) => request<{ id: string; username: string; email: string }>("/users/me", {}, token),
  projects: (token: string) => request<Project[]>("/projects", {}, token),
  project: (id: string, token: string) =>
    request<Project>(`/projects/${id}`, {}, token),
  createProject: (name: string, description: string, token: string) =>
    request<Project>(
      "/projects",
      { method: "POST", data: { name, description } },
      token,
    ),
  createBrief: (rawText: string, token: string) =>
    request<Brief>(
      "/briefs/",
      { method: "POST", data: { raw_text: rawText } },
      token,
    ),
  getBrief: (id: string, token: string) =>
    request<Brief>(`/briefs/${id}`, {}, token),
  draftSummary: (id: string, token: string) =>
    request<{ summary: string }>(
      `/briefs/${id}/summary/draft`,
      { method: "POST" },
      token,
    ),
  confirmSummary: (id: string, summary: string, token: string) =>
    request<null>(
      `/briefs/${id}/summary`,
      { method: "PUT", data: { summary } },
      token,
    ),
  attachments: (id: string, token: string) =>
    request<Attachment[]>(`/briefs/${id}/attachments`, {}, token),
  attachmentStorageStatus: (token: string) =>
    request<{ available: boolean }>("/briefs/storage", {}, token),
  startAttachment: (id: string, file: File, token: string) =>
    request<{
      attachment: Attachment;
      upload_url: string;
      content_type: string;
    }>(
      `/briefs/${id}/attachments`,
      {
        method: "POST",
        data: {
          file_name: file.name,
          content_type: file.type || "application/octet-stream",
          size_bytes: file.size,
        },
      },
      token,
    ),
  completeAttachment: (id: string, attachmentId: string, token: string) =>
    request<Attachment>(
      `/briefs/${id}/attachments/${attachmentId}/complete`,
      { method: "POST" },
      token,
    ),
  downloadAttachment: (id: string, attachmentId: string, token: string) =>
    request<{ download_url: string }>(
      `/briefs/${id}/attachments/${attachmentId}/download`,
      {},
      token,
    ),
};
