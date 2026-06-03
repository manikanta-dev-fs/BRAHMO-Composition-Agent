const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface User {
  id: string;
  name: string;
  role: string;
  department: string;
  ceiling_level: number;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  conditions: string[];
}

export interface TokenStats {
  system_prompt_tokens: number;
  context_tokens: number;
  actual_context_tokens: number;
  estimated_context_tokens: number;
  user_reserve_tokens: number;
  total: number;
  budget: number;
  remaining: number;
  over_budget: boolean;
  context_budget: number;
}

export interface BlockInfo {
  label: string;
  node_count: number;
  tokens: number;
}

export interface NodeDetail {
  id: string;
  title: string;
  type: string;
  zone: number | null;
  status: string | null;
  retrieval_weight: number;
  injection_weight: number;
  distance: number;
  initial_compression: string;
  final_compression: string;
  was_compressed: boolean;
  block: number | null;
  block_label: string;
  tokens_used: number;
  tokens_full: number;
  tokens_compressed: number;
  tokens_constraint_only: number;
  is_constraint_protected: boolean;
  include_reason: string;
  decision_trace: string[];
  content_used: string;
}

export interface CompressionLogEntry {
  pass: number;
  action: string;
  total_tokens: number;
  context_tokens: number;
  over_budget: boolean;
  node_id: string | null;
  node_title: string | null;
  node_type?: string;
  from_level: string | null;
  to_level: string | null;
  tokens_saved: number;
  injection_weight?: number;
  distance?: number;
}

export interface ComposeResult {
  user: User;
  patient: Patient;
  context_string: string;
  token_stats: TokenStats;
  block_breakdown: Record<string, BlockInfo>;
  node_details: NodeDetail[];
  compression_summary: Record<string, number>;
  compression_log: CompressionLogEntry[];
  iterations: number;
  total_nodes: number;
  nodes_included: number;
  nodes_omitted: number;
  constraints_protected: number;
  budget_warning: string | null;
  safety_status: "FIT" | "COMPRESSED_TO_FIT" | "UNSAFE_TO_FIT";
}

export async function fetchUsers(): Promise<User[]> {
  const res = await fetch(`${API_BASE}/users`);
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

export async function fetchPatients(): Promise<Patient[]> {
  const res = await fetch(`${API_BASE}/patients`);
  if (!res.ok) throw new Error("Failed to fetch patients");
  return res.json();
}

export async function compose(
  userId: string,
  patientId: string,
  budget: number
): Promise<ComposeResult> {
  const res = await fetch(`${API_BASE}/compose`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, patient_id: patientId, budget }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Composition failed");
  }
  return res.json();
}
