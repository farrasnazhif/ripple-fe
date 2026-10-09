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
