/* ═══════════════════════════════════════════════
   SHARED TYPES
═══════════════════════════════════════════════ */

export type Tier = "Basic" | "Pro" | "Premium";

export type User = {
  user_id: number;
  name?: string;
  email: string;
  profile_picture?: string;
  tier: Tier;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ActiveTab = "collections" | "jobs" | "downloadables";

export type Collection = {
  c_id: number;
  title: string;
  description: string | null;
  language: string | null;
  url: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type Job = {
  job_id: number;
  status: string;
  created_at: string | null;
  collection: { collection_id: number | null; name: string | null };
  progress: { completed: number; failed: number; total: number; percentage: number };
};

export type SortOption =
  | "alpha_asc"
  | "alpha_desc"
  | "created_desc"
  | "created_asc"
  | "updated_desc"
  | "updated_asc";

export type DownloadItem = {
  download_id: number;
  collection_id: number;
  collection: {
    title: string;
    language: string | null;
  };
  status: "Pending" | "Processing" | "Completed" | "Failed";
  blob_url: string | null;
  file_size: number | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type Toast = {
  id: number;
  type: "success" | "error" | "info";
  message: string;
};