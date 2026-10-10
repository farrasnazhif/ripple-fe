import axios, { type AxiosRequestConfig } from "axios";
import type {
  Attachment,
  Brief,
  Graph,
  Project,
  StoryboardShot,
  GenerationJob,
  ProjectReview,
  BriefEdit,
  FinalOutput,
  ProjectBudget,
} from "@/types/ripple";

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
  budget: (id: string, token: string) => request<ProjectBudget>(`/projects/${id}/budget`, {}, token),
  setBudget: (id: string, limit_cents: number, token: string) => request<ProjectBudget>(`/projects/${id}/budget`, { method: "PUT", data: { limit_cents } }, token),
  updateProject: (
    id: string,
    name: string,
    description: string,
    token: string,
  ) =>
    request<Project>(
      `/projects/${id}`,
      { method: "PATCH", data: { name, description } },
      token,
    ),
  deleteProject: (id: string, token: string) =>
    request<null>(`/projects/${id}`, { method: "DELETE" }, token),
  review: (id: string, token: string) =>
    request<ProjectReview>(`/projects/${id}/review`, {}, token),
  editBrief: (id: string, data: BriefEdit, token: string) =>
    request<null>(`/projects/${id}/brief`, { method: "PUT", data }, token),
  outputType: (id: string, kind: "image" | "video", token: string) =>
    request<null>(
      `/projects/${id}/output-type`,
      { method: "PUT", data: { kind } },
      token,
    ),
  draftPlan: (id: string, summary: string, token: string) =>
    request<StoryboardShot[]>(
      `/projects/${id}/plan/draft`,
      { method: "POST", data: { summary } },
      token,
    ),
  refineSummary: (
    id: string,
    summary: string,
    instructions: string,
    token: string,
  ) =>
    request<{ summary: string }>(
      `/projects/${id}/summary/refine`,
      { method: "POST", data: { summary, instructions } },
      token,
    ),
  linkRequirements: (id: string, shot: string, keys: string[], token: string) =>
    request<null>(
      `/projects/${id}/shots/${shot}/requirements`,
      { method: "PUT", data: { keys } },
      token,
    ),
  decide: (
    id: string,
    shot: string,
    job_id: string,
    action: "accept" | "keep" | "refine",
    reason: string,
    token: string,
  ) =>
    request<null>(
      `/projects/${id}/shots/${shot}/decisions`,
      { method: "POST", data: { job_id, action, reason } },
      token,
    ),
  generateFinalImage: (project: string, data: { request_key: string; expected_version: number }, token: string) =>
    request<FinalOutput>(`/projects/${project}/images`, { method: "POST", data }, token),
  refineFinal: (project: string, source: string, data: { request_key: string; image_index: number; prompt: string; reason: string }, token: string) =>
    request<FinalOutput>(`/projects/${project}/finals/${source}/refinements`, { method: "POST", data }, token),
  regenerateFinal: (project: string, source: string, data: { request_key: string; image_index: number }, token: string) =>
    request<FinalOutput>(`/projects/${project}/finals/${source}/regenerations`, { method: "POST", data }, token),
  finalStatus: (project: string, id: string, token: string) =>
    request<FinalOutput>(`/projects/${project}/finals/${id}`, {}, token),
  acceptFinal: (project: string, id: string, token: string) =>
    request<FinalOutput>(`/projects/${project}/finals/${id}/accept`, { method: "POST" }, token),
  final: (id: string, kind: "image" | "video", token: string) =>
    request<FinalOutput>(
      `/projects/${id}/final`,
      { method: "POST", data: { kind } },
      token,
    ),
  setBriefText: (id: string, raw_text: string, token: string) =>
    request<null>(
      `/briefs/${id}/text`,
      { method: "PUT", data: { raw_text } },
      token,
    ),
  storyboard: (id: string, token: string) =>
    request<StoryboardShot[]>(`/projects/${id}/storyboard`, {}, token),
  saveStoryboard: (
    id: string,
    summary: string,
    shots: { title: string; prompt: string }[],
    token: string,
  ) =>
    request<null>(
      `/projects/${id}/storyboard`,
      { method: "POST", data: { summary, shots } },
      token,
    ),
  generations: (id: string, token: string) =>
    request<GenerationJob[]>(`/projects/${id}/generations`, {}, token),
  generate: (
    id: string,
    shot: string,
    kind: "image" | "video",
    request_key: string,
    token: string,
    prompt?: string,
  ) =>
    request<GenerationJob>(
      `/projects/${id}/shots/${shot}/generations`,
      { method: "POST", data: { kind, request_key, prompt } },
      token,
    ),
  generation: (id: string, job: string, token: string) =>
    request<GenerationJob>(`/projects/${id}/generations/${job}`, {}, token),
  graph: (scenario: string, token: string) =>
    request<Graph>("/demo/graph", { params: { scenario } }, token),
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
  me: (token: string) =>
    request<{ id: string; username: string; email: string }>(
      "/users/me",
      {},
      token,
    ),
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
