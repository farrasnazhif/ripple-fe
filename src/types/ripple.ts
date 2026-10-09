export type GraphReason = {
  point_key: string;
  source_quote?: string;
  kind: string;
  message: string;
};
export type GraphNode = {
  id: string;
  kind: "brief" | "point" | "change" | "shot";
  label: string;
  description?: string;
  status?: string;
  reason?: string;
  reasons?: GraphReason[];
};
export type GraphEdge = { from: string; to: string; kind: string };
export type Graph = {
  scenario: string;
  note: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type Brief = {
  id: string;
  raw_text: string;
  version: number;
  summary?: string;
};
export type Attachment = {
  id: string;
  brief_id: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  status: string;
};

export type Project = {
  id: string;
  brief_id: string;
  name: string;
  description: string;
  created_at: string;
};

export type StoryboardShot = {
  id: string;
  title: string;
  prompt: string;
  position: number;
  requirement_keys: string[];
};
export type GenerationJob = {
  id: string;
  shot_id: string;
  request_key: string;
  kind: "image" | "video";
  prompt: string;
  provider_id: string;
  status: string;
  outputs: string[];
  created_at: string;
  brief_version: number;
  accepted: boolean;
};

export type BriefPoint = {
  key: string;
  value: string;
  scope: "local" | "global";
};
export type ShotReview = { shot_id: string; status: string; reasons: string[] };
export type ProjectReview = {
  output_type: "" | "image" | "video" | "mixed";
  points: BriefPoint[];
  versions: {
    version: number;
    raw_text: string;
    summary: string;
    points: BriefPoint[];
    attachments: string[];
    created_at: string;
  }[];
  changes: {
    id: string;
    brief_version: number;
    note: string;
    diffs: { key: string; old: string; new: string }[];
    impacts: ShotReview[];
  }[];
  decisions: {
    id: string;
    shot_id: string;
    brief_version: number;
    action: string;
    reason: string;
    job_id?: string;
  }[];
  finals: FinalOutput[];
};
export type FinalOutput = {
  id: string;
  brief_version: number;
  kind: "image" | "video";
  job_ids: string[];
  outputs: string[];
  download_url?: string;
};
export type BriefEdit = {
  expected_version: number;
  raw_text: string;
  summary: string;
  points: BriefPoint[];
  remove_attachments: string[];
  note: string;
};
