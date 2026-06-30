import React from "react";
import { Collection, Job, SortOption, Tier, DownloadItem } from "./types";
import { FolderOpen, Briefcase, Download } from "lucide-react";

/* ═══════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════ */
export const NAV_ITEMS: { id: "collections" | "jobs" | "downloadables"; label: string; icon: React.ReactNode }[] = [
  { id: "collections",   label: "Collections",   icon: <FolderOpen className="w-6 h-6" /> },
  { id: "jobs",          label: "Jobs",          icon: <Briefcase className="w-6 h-6" /> },
  { id: "downloadables", label: "Downloads",     icon: <Download className="w-6 h-6" /> },
];

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "updated_desc", label: "Last Updated"   },
  { value: "updated_asc",  label: "Oldest Updated" },
  { value: "created_desc", label: "Newest Created" },
  { value: "created_asc",  label: "Oldest Created" },
  { value: "alpha_asc",    label: "A → Z"          },
  { value: "alpha_desc",   label: "Z → A"          },
];

export const RESUBMIT_MAX_CHARS = 1000;

/* ═══════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════ */
export const getStatusStyle = (status: string): React.CSSProperties => {
  switch (status.toLowerCase()) {
    case "queued":     return { backgroundColor: "rgba(234,179,8,0.15)",   color: "#fde047" };
    case "processing": return { backgroundColor: "rgba(59,130,246,0.15)",  color: "#93c5fd" };
    case "completed":  return { backgroundColor: "rgba(34,197,94,0.15)",   color: "#86efac" };
    case "partial":    return { backgroundColor: "rgba(249,115,22,0.15)",  color: "#fdba74" };
    case "failed":     return { backgroundColor: "rgba(239,68,68,0.15)",   color: "#fca5a5" };
    default:           return { backgroundColor: "rgba(107,114,128,0.15)", color: "#d1d5db" };
  }
};

export const getJobBadgeStyle = (job: Job): React.CSSProperties => {
  const { failed, total } = job.progress;
  const status = job.status.toLowerCase();
  if (status === "queued")     return { backgroundColor: "rgba(234,179,8,0.15)",   color: "#fde047" };
  if (status === "processing") return { backgroundColor: "rgba(59,130,246,0.15)",  color: "#93c5fd" };
  if (status === "completed") {
    if (total > 0 && failed === total) return { backgroundColor: "rgba(239,68,68,0.15)",   color: "#fca5a5" };
    if (failed > 0)                    return { backgroundColor: "rgba(249,115,22,0.15)",  color: "#fdba74" };
    return                                    { backgroundColor: "rgba(34,197,94,0.15)",   color: "#86efac" };
  }
  if (status === "partial") return { backgroundColor: "rgba(249,115,22,0.15)", color: "#fdba74" };
  if (status === "failed")  return { backgroundColor: "rgba(239,68,68,0.15)",  color: "#fca5a5" };
  return { backgroundColor: "rgba(107,114,128,0.15)", color: "#d1d5db" };
};

export const getJobBadgeLabel = (job: Job): string => {
  const { failed, total } = job.progress;
  const status = job.status.toLowerCase();
  if (status === "completed") {
    if (total > 0 && failed === total) return "All Failed";
    if (failed > 0)                    return "Partial";
    return "Completed";
  }
  return job.status.charAt(0).toUpperCase() + job.status.slice(1);
};

export const getProgressBarColor = (job: Job): string => {
  const status = job.status.toLowerCase();
  if (status === "completed") return "#4ade80";
  if (status === "processing") return "#60a5fa";
  if (status === "partial")    return "#fb923c";
  if (status === "failed")     return "#f87171";
  return "#fb923c";
};

export function sortCollections(list: Collection[], sort: SortOption): Collection[] {
  return [...list].sort((a, b) => {
    switch (sort) {
      case "alpha_asc":    return a.title.localeCompare(b.title);
      case "alpha_desc":   return b.title.localeCompare(a.title);
      case "created_asc":  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "created_desc": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "updated_asc":  return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      case "updated_desc": return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      default:             return 0;
    }
  });
}

export function normalizeTier(raw: string | undefined): Tier {
  if (!raw) return "Basic";
  const lower = raw.toLowerCase();
  if (lower === "pro")     return "Pro";
  if (lower === "premium") return "Premium";
  return "Basic";
}

export function isDownloadActive(completedAt: string | null): boolean {
  if (!completedAt) return false;
  const diff = Date.now() - new Date(completedAt).getTime();
  return diff <= 7 * 24 * 60 * 60 * 1000;
}

export function formatFileSize(bytes: number | null): string {
  if (bytes === null) return "—";
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function triggerDownload(blobUrl: string, fileName: string) {
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = fileName;
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export const getDownloadStatusStyle = (status: DownloadItem["status"]): React.CSSProperties => {
  switch (status) {
    case "Completed":  return { backgroundColor: "rgba(34,197,94,0.12)",   color: "#86efac" };
    case "Processing": return { backgroundColor: "rgba(59,130,246,0.12)",  color: "#93c5fd" };
    case "Pending":    return { backgroundColor: "rgba(234,179,8,0.12)",   color: "#fde047" };
    case "Failed":     return { backgroundColor: "rgba(239,68,68,0.12)",   color: "#fca5a5" };
    default:           return { backgroundColor: "rgba(107,114,128,0.12)", color: "#d1d5db" };
  }
};