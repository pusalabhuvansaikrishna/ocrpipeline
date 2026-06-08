"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen, Briefcase, RotateCcw, X, CheckCircle, AlertCircle, Loader2, Search, ChevronDown, Download, FileText, FileSpreadsheet, FileJson, ArrowDownToLine, RefreshCw, Globe, Trash2 } from "lucide-react";
import DashboardHeader from "./components/Header";
import NewCollectionModal from "./components/NewCollectionModal";
import UpgradeModal from "./components/UpgradeModal";
import React from "react";
import { BASE_URL } from "@/config/api";

/* ═══════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════ */
type Tier = "Basic" | "Pro" | "Premium";

type User = {
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

type ActiveTab = "collections" | "jobs" | "downloadables";

type Collection = {
  c_id: number;
  title: string;
  description: string | null;
  language: string | null;
  url: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type Job = {
  job_id: number;
  status: string;
  created_at: string | null;
  collection: { collection_id: number | null; name: string | null };
  progress: { completed: number; failed: number; total: number; percentage: number };
};

type SortOption = "alpha_asc" | "alpha_desc" | "created_desc" | "created_asc" | "updated_desc" | "updated_asc";

type DownloadItem = {
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

type Toast = {
  id: number;
  type: "success" | "error" | "info";
  message: string;
};

/* ═══════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════ */
const NAV_ITEMS: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
  { id: "collections",   label: "Collections",   icon: <FolderOpen className="w-6 h-6" /> },
  { id: "jobs",          label: "Jobs",          icon: <Briefcase className="w-6 h-6" /> },
  { id: "downloadables", label: "Downloads",     icon: <Download className="w-6 h-6" /> },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "updated_desc", label: "Last Updated"   },
  { value: "updated_asc",  label: "Oldest Updated" },
  { value: "created_desc", label: "Newest Created" },
  { value: "created_asc",  label: "Oldest Created" },
  { value: "alpha_asc",    label: "A → Z"          },
  { value: "alpha_desc",   label: "Z → A"          },
];

const RESUBMIT_MAX_CHARS = 1000;

/* ═══════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════ */
const getStatusStyle = (status: string): React.CSSProperties => {
  switch (status.toLowerCase()) {
    case "queued":     return { backgroundColor: "rgba(234,179,8,0.15)",   color: "#fde047" };
    case "processing": return { backgroundColor: "rgba(59,130,246,0.15)",  color: "#93c5fd" };
    case "completed":  return { backgroundColor: "rgba(34,197,94,0.15)",   color: "#86efac" };
    case "partial":    return { backgroundColor: "rgba(249,115,22,0.15)",  color: "#fdba74" };
    case "failed":     return { backgroundColor: "rgba(239,68,68,0.15)",   color: "#fca5a5" };
    default:           return { backgroundColor: "rgba(107,114,128,0.15)", color: "#d1d5db" };
  }
};

const getJobBadgeStyle = (job: Job): React.CSSProperties => {
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

const getJobBadgeLabel = (job: Job): string => {
  const { failed, total } = job.progress;
  const status = job.status.toLowerCase();
  if (status === "completed") {
    if (total > 0 && failed === total) return "All Failed";
    if (failed > 0)                    return "Partial";
    return "Completed";
  }
  return job.status.charAt(0).toUpperCase() + job.status.slice(1);
};

const getProgressBarColor = (job: Job): string => {
  const status = job.status.toLowerCase();
  if (status === "completed") return "#4ade80";
  if (status === "processing") return "#60a5fa";
  if (status === "partial")    return "#fb923c";
  if (status === "failed")     return "#f87171";
  return "#fb923c";
};

function sortCollections(list: Collection[], sort: SortOption): Collection[] {
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

function normalizeTier(raw: string | undefined): Tier {
  if (!raw) return "Basic";
  const lower = raw.toLowerCase();
  if (lower === "pro")     return "Pro";
  if (lower === "premium") return "Premium";
  return "Basic";
}

function isDownloadActive(completedAt: string | null): boolean {
  if (!completedAt) return false;
  const diff = Date.now() - new Date(completedAt).getTime();
  return diff <= 7 * 24 * 60 * 60 * 1000;
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null) return "—";
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function triggerDownload(blobUrl: string, fileName: string) {
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = fileName;
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

const getDownloadStatusStyle = (status: DownloadItem["status"]): React.CSSProperties => {
  switch (status) {
    case "Completed":  return { backgroundColor: "rgba(34,197,94,0.12)",   color: "#86efac" };
    case "Processing": return { backgroundColor: "rgba(59,130,246,0.12)",  color: "#93c5fd" };
    case "Pending":    return { backgroundColor: "rgba(234,179,8,0.12)",   color: "#fde047" };
    case "Failed":     return { backgroundColor: "rgba(239,68,68,0.12)",   color: "#fca5a5" };
    default:           return { backgroundColor: "rgba(107,114,128,0.12)", color: "#d1d5db" };
  }
};

/* ═══════════════════════════════════════════════
   TOAST COMPONENT
═══════════════════════════════════════════════ */
const ToastContainer = ({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) => {
  if (toasts.length === 0) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 10000,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => {
        const colors = {
          success: { bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.3)",  icon: "#86efac", text: "#dcfce7" },
          error:   { bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.3)",  icon: "#fca5a5", text: "#fee2e2" },
          info:    { bg: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.3)", icon: "#93c5fd", text: "#dbeafe" },
        }[toast.type];

        return (
          <div
            key={toast.id}
            style={{
              pointerEvents: "auto",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              backgroundColor: "#0f172a",
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              padding: "12px 16px",
              maxWidth: 340,
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              animation: "toastIn 0.25s ease",
            }}
          >
            <div
              style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                backgroundColor: colors.bg,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {toast.type === "success" && (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={colors.icon} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {toast.type === "error" && (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={colors.icon} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              )}
              {toast.type === "info" && (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={colors.icon} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: colors.text, lineHeight: 1.4 }}>
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => onRemove(toast.id)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "#475569", padding: 0, display: "flex", flexShrink: 0,
              }}
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
      <style>{`@keyframes toastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
};

/* ═══════════════════════════════════════════════
   SKELETON COMPONENTS
═══════════════════════════════════════════════ */
const SkeletonCard = () => (
  <div style={{ backgroundColor: "#0F172A", border: "1px solid #1e293b", borderRadius: "16px", padding: "12px 16px", display: "flex", flexDirection: "column", gap: "12px" }}>
    <style>{`
      @keyframes shimmer { 0% { background-position: -600px 0; } 100% { background-position: 600px 0; } }
      .shimmer { background: linear-gradient(90deg, #1e293b 25%, #273548 50%, #1e293b 75%); background-size: 600px 100%; animation: shimmer 1.6s infinite linear; border-radius: 6px; }
    `}</style>
    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
      <div className="shimmer" style={{ width: "36px", height: "36px", borderRadius: "8px", flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
        <div className="shimmer" style={{ height: "12px", width: "60%" }} />
        <div className="shimmer" style={{ height: "10px", width: "40%" }} />
      </div>
    </div>
    <div className="shimmer" style={{ height: "20px", width: "70px", borderRadius: "9999px" }} />
  </div>
);

const SkeletonGrid = () => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "12px" }}>
    {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
  </div>
);

const SkeletonTable = () => (
  <div style={{ background: "#0F172A", border: "1px solid #1e293b", borderRadius: 16, overflow: "hidden" }}>
    <style>{`
      @keyframes shimmer { 0% { background-position: -600px 0; } 100% { background-position: 600px 0; } }
      .shimmer { background: linear-gradient(90deg,#1e293b 25%,#273548 50%,#1e293b 75%); background-size:600px 100%; animation:shimmer 1.6s infinite linear; border-radius:6px; }
    `}</style>
    <div style={{ padding: "14px 18px", borderBottom: "1px solid #1e293b" }}>
      <div className="shimmer" style={{ height: 14, width: 120, marginBottom: 6 }} />
      <div className="shimmer" style={{ height: 10, width: 60 }} />
    </div>
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} style={{ display: "flex", gap: 24, padding: "14px 18px", borderBottom: "1px solid #1e293b" }}>
        <div className="shimmer" style={{ height: 12, width: "25%", borderRadius: 4 }} />
        <div className="shimmer" style={{ height: 12, width: "15%", borderRadius: 4 }} />
        <div className="shimmer" style={{ height: 12, width: "20%", borderRadius: 4 }} />
        <div className="shimmer" style={{ height: 12, flex: 1, borderRadius: 4 }} />
      </div>
    ))}
  </div>
);

/* ═══════════════════════════════════════════════
   DELETE CONFIRM MODAL
═══════════════════════════════════════════════ */
const DeleteConfirmModal = ({
  isOpen,
  collection,
  onClose,
  onConfirm,
  isDeleting,
}: {
  isOpen: boolean;
  collection: Collection | null;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen || !collection) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
        padding: "16px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !isDeleting) onClose(); }}
    >
      <div
        style={{
          backgroundColor: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: 20,
          width: "100%",
          maxWidth: 440,
          boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
          overflow: "hidden",
          animation: "modalIn 0.2s ease",
        }}
      >
        <style>{`@keyframes modalIn { from { opacity: 0; transform: scale(0.96) translateY(6px); } to { opacity: 1; transform: scale(1) translateY(0); } }`}</style>

        {/* Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid #1e293b",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                backgroundColor: "rgba(239,68,68,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Trash2 size={18} style={{ color: "#f87171" }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>
                Delete Collection
              </h3>
              <p
                style={{
                  margin: "2px 0 0", fontSize: 12, color: "#64748b",
                  maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}
              >
                {collection.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            style={{
              width: 30, height: 30, borderRadius: 8, border: "none",
              background: "transparent", cursor: isDeleting ? "not-allowed" : "pointer",
              color: "#475569", display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { if (!isDeleting) (e.currentTarget as HTMLElement).style.background = "#1e293b"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px" }}>
          <p style={{ margin: 0, fontSize: 14, color: "#94a3b8", lineHeight: 1.6 }}>
            Are you sure you want to delete{" "}
            <span style={{ color: "#f1f5f9", fontWeight: 600 }}>"{collection.title}"</span>?
            This action cannot be undone and all associated data will be permanently removed.
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 24px 20px",
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            disabled={isDeleting}
            style={{
              padding: "9px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600,
              border: "1px solid #1e293b", backgroundColor: "transparent",
              color: "#64748b", cursor: isDeleting ? "not-allowed" : "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!isDeleting) {
                (e.currentTarget as HTMLElement).style.borderColor = "#334155";
                (e.currentTarget as HTMLElement).style.color = "#94a3b8";
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "#1e293b";
              (e.currentTarget as HTMLElement).style.color = "#64748b";
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            style={{
              padding: "9px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600,
              border: "none",
              backgroundColor: isDeleting ? "rgba(239,68,68,0.3)" : "rgba(239,68,68,0.85)",
              color: isDeleting ? "#7f1d1d" : "#fff1f2",
              cursor: isDeleting ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 7,
              transition: "background-color 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!isDeleting) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(239,68,68,1)";
            }}
            onMouseLeave={(e) => {
              if (!isDeleting) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(239,68,68,0.85)";
            }}
          >
            {isDeleting ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 size={13} />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════
   RESUBMIT MODAL
═══════════════════════════════════════════════ */
const ResubmitModal = ({
  isOpen,
  collection,
  onClose,
  onConfirm,
  isSubmitting,
}: {
  isOpen: boolean;
  collection: Collection | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isSubmitting: boolean;
}) => {
  const [reason, setReason] = useState("");
  const charsLeft = RESUBMIT_MAX_CHARS - reason.length;
  const isNearLimit = charsLeft <= 100;
  const isAtLimit   = charsLeft <= 0;

  useEffect(() => {
    if (isOpen) setReason("");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen || !collection) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
        padding: "16px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          backgroundColor: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: 20,
          width: "100%",
          maxWidth: 480,
          boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid #1e293b",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                backgroundColor: "rgba(168,85,247,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <RefreshCw size={18} style={{ color: "#c084fc" }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>
                Resubmit Collection
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {collection.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              width: 30, height: 30, borderRadius: 8, border: "none",
              background: "transparent", cursor: isSubmitting ? "not-allowed" : "pointer",
              color: "#475569", display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { if (!isSubmitting) (e.currentTarget as HTMLElement).style.background = "#1e293b"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px" }}>
          <div
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              backgroundColor: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)",
              borderRadius: 8, padding: "5px 10px", marginBottom: 16,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#c084fc">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
            </svg>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#c084fc", letterSpacing: "0.04em" }}>
              PREMIUM FEATURE
            </span>
          </div>

          <label
            htmlFor="resubmit-reason"
            style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#cbd5e1", marginBottom: 8 }}
          >
            Why are you resubmitting this collection?
          </label>
          <p style={{ fontSize: 12, color: "#475569", marginBottom: 12, lineHeight: 1.5 }}>
            Provide context about what you'd like re-reviewed. This helps backend models to review them more clearly.
          </p>

          <div style={{ position: "relative" }}>
            <textarea
              id="resubmit-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, RESUBMIT_MAX_CHARS))}
              placeholder="e.g. Several documents were incorrectly classified. Please re-review the flagged items with special attention to…"
              disabled={isSubmitting}
              rows={5}
              style={{
                width: "100%",
                backgroundColor: "#0a1628",
                border: `1px solid ${isAtLimit ? "rgba(239,68,68,0.5)" : isNearLimit ? "rgba(234,179,8,0.4)" : "#1e293b"}`,
                borderRadius: 10,
                padding: "12px 14px",
                fontSize: 13,
                color: "#e2e8f0",
                resize: "vertical",
                outline: "none",
                lineHeight: 1.6,
                boxSizing: "border-box",
                transition: "border-color 0.15s",
                opacity: isSubmitting ? 0.6 : 1,
                cursor: isSubmitting ? "not-allowed" : "text",
                fontFamily: "inherit",
              }}
              onFocus={(e) => {
                if (!isAtLimit && !isNearLimit) e.currentTarget.style.borderColor = "rgba(168,85,247,0.5)";
              }}
              onBlur={(e) => {
                if (!isAtLimit && !isNearLimit) e.currentTarget.style.borderColor = "#1e293b";
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 6,
                fontSize: 11,
                fontWeight: 600,
                color: isAtLimit ? "#fca5a5" : isNearLimit ? "#fde047" : "#475569",
                transition: "color 0.2s",
              }}
            >
              {charsLeft} character{charsLeft !== 1 ? "s" : ""} remaining
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 24px 20px",
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: "9px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600,
              border: "1px solid #1e293b", backgroundColor: "transparent",
              color: "#64748b", cursor: isSubmitting ? "not-allowed" : "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { if (!isSubmitting) { (e.currentTarget as HTMLElement).style.borderColor = "#334155"; (e.currentTarget as HTMLElement).style.color = "#94a3b8"; } }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#1e293b"; (e.currentTarget as HTMLElement).style.color = "#64748b"; }}
          >
            Cancel
          </button>
          <button
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={isSubmitting || !reason.trim()}
            style={{
              padding: "9px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600,
              border: "none",
              backgroundColor: isSubmitting || !reason.trim() ? "rgba(168,85,247,0.3)" : "rgba(168,85,247,0.9)",
              color: isSubmitting || !reason.trim() ? "#7c3aed" : "#f5f3ff",
              cursor: isSubmitting || !reason.trim() ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 7,
              transition: "background-color 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting && reason.trim()) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(168,85,247,1)";
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting && reason.trim()) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(168,85,247,0.9)";
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <RefreshCw size={13} />
                Resubmit
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════
   DOWNLOADABLES TAB COMPONENT
═══════════════════════════════════════════════ */
const DownloadablesTab = ({
  downloads,
  loading,
}: {
  downloads: DownloadItem[];
  loading: boolean;
}) => {
  const completedCount   = downloads.filter((d) => d.status === "Completed").length;
  const processingCount  = downloads.filter((d) => d.status === "Processing" || d.status === "Pending").length;
  const failedCount      = downloads.filter((d) => d.status === "Failed").length;

  return (
    <div className="flex flex-col h-full">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-1">Downloads</h2>
        <p className="text-gray-500 text-sm">
          Export and download processed outputs from your collections. Files are available for 7 days after completion.
        </p>
      </div>

      {loading ? (
        <SkeletonTable />
      ) : downloads.length === 0 ? (
        <div
          style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", height: "calc(100vh - 260px)", textAlign: "center",
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(249,115,22,0.1)", width: 72, height: 72, borderRadius: 16,
              display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20,
            }}
          >
            <ArrowDownToLine style={{ width: 36, height: 36, color: "#fb923c" }} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "#f1f5f9", marginBottom: 8 }}>No downloads yet</h3>
          <p style={{ fontSize: 14, color: "#6b7280", maxWidth: 280 }}>
            Once you request a download from a completed collection, it will appear here.
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {[
              { label: `${completedCount} Completed`,             color: "#86efac", bg: "rgba(34,197,94,0.1)"  },
              { label: `${processingCount} Pending / Processing`, color: "#93c5fd", bg: "rgba(59,130,246,0.1)" },
              { label: `${failedCount} Failed`,                   color: "#fca5a5", bg: "rgba(239,68,68,0.1)"  },
            ].map((chip) => (
              <span
                key={chip.label}
                style={{
                  fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 9999,
                  backgroundColor: chip.bg, color: chip.color,
                }}
              >
                {chip.label}
              </span>
            ))}
          </div>

          <div style={{ background: "#0F172A", border: "1px solid #1e293b", borderRadius: 16, overflow: "hidden" }}>
            <div
              style={{
                padding: "14px 18px", borderBottom: "1px solid #1e293b",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}
            >
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "#f1f5f9" }}>Download requests</p>
                <p style={{ fontSize: 12, color: "#475569", margin: "2px 0 0" }}>{downloads.length} total</p>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {["Collection", "Requested on", "File size", "Status", "Action"].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left", padding: "10px 16px", fontSize: 11,
                          fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase",
                          color: "#475569", borderBottom: "1px solid #1e293b", whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {downloads.map((item) => {
                    const active     = item.status === "Completed" && isDownloadActive(item.completed_at);
                    const expired    = item.status === "Completed" && !isDownloadActive(item.completed_at);
                    const statusConf = getDownloadStatusStyle(item.status);

                    return (
                      <tr
                        key={item.download_id}
                        style={{
                          borderBottom: "1px solid #1e293b",
                          opacity: expired ? 0.55 : 1,
                          transition: "background 0.1s",
                        }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#0a1020")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                      >
                        <td style={{ padding: "13px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div
                              style={{
                                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                                backgroundColor: "rgba(247,154,88,0.15)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}
                            >
                              <FolderOpen style={{ width: 15, height: 15, color: "#fb923c" }} />
                            </div>
                            <div>
                              <p
                                style={{
                                  margin: 0, fontSize: 13, fontWeight: 600, color: "#e2e8f0",
                                  maxWidth: 200, overflow: "hidden",
                                  textOverflow: "ellipsis", whiteSpace: "nowrap",
                                }}
                              >
                                {item.collection.title}
                              </p>
                              {item.collection.language && (
                                <p style={{ margin: 0, fontSize: 11, color: "#475569" }}>
                                  {item.collection.language}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: "13px 16px", color: "#64748b", fontSize: 13, whiteSpace: "nowrap" }}>
                          {new Date(item.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                          {" "}
                          <span style={{ color: "#334155" }}>
                            {new Date(item.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </td>

                        <td style={{ padding: "13px 16px", color: "#64748b", fontSize: 13, whiteSpace: "nowrap" }}>
                          {formatFileSize(item.file_size)}
                        </td>

                        <td style={{ padding: "13px 16px" }}>
                          <span
                            style={{
                              ...statusConf,
                              fontSize: 11, fontWeight: 700, padding: "3px 10px",
                              borderRadius: 9999, display: "inline-flex",
                              alignItems: "center", gap: 5,
                            }}
                          >
                            {(item.status === "Processing" || item.status === "Pending") && (
                              <span
                                style={{
                                  width: 6, height: 6, borderRadius: "50%",
                                  backgroundColor: "#93c5fd", display: "inline-block",
                                  animation: "pulse 1.2s infinite",
                                }}
                              />
                            )}
                            {item.status}
                          </span>
                        </td>

                        <td style={{ padding: "13px 16px" }}>
                          {active && item.blob_url && (
                            <button
                              onClick={() =>
                                triggerDownload(
                                  item.blob_url!,
                                  `${item.collection.title.replace(/\s+/g, "_")}_${item.download_id}.zip`
                                )
                              }
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 6,
                                padding: "6px 14px", borderRadius: 8, fontSize: 12,
                                fontWeight: 600, border: "none", cursor: "pointer",
                                backgroundColor: "rgba(249,115,22,0.12)", color: "#fb923c",
                                transition: "background 0.15s",
                              }}
                              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "rgba(249,115,22,0.22)")}
                              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "rgba(249,115,22,0.12)")}
                            >
                              <ArrowDownToLine size={12} />
                              Download
                            </button>
                          )}
                          {expired && (
                            <span
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 6,
                                padding: "6px 14px", borderRadius: 8, fontSize: 12,
                                fontWeight: 600, backgroundColor: "rgba(107,114,128,0.08)",
                                color: "#475569", cursor: "not-allowed",
                              }}
                            >
                              Expired
                            </span>
                          )}
                          {(item.status === "Pending" || item.status === "Processing") && (
                            <span style={{ color: "#475569", fontSize: 12 }}>Preparing…</span>
                          )}
                          {item.status === "Failed" && (
                            <span
                              title={item.error_message ?? "Download failed"}
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 6,
                                padding: "6px 14px", borderRadius: 8, fontSize: 12,
                                fontWeight: 600, backgroundColor: "rgba(239,68,68,0.08)",
                                color: "#fca5a5", cursor: "default",
                              }}
                            >
                              Failed
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  );
};

/* ═══════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════ */
export default function DashboardPage() {
  const [user, setUser]                             = useState<User | null>(null);
  const [collections, setCollections]               = useState<Collection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [jobs, setJobs]                             = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading]               = useState(false);
  const [downloads, setDownloads]                   = useState<DownloadItem[]>([]);
  const [downloadsLoading, setDownloadsLoading]     = useState(false);
  const [loading, setLoading]                       = useState(true);
  const [isModalOpen, setIsModalOpen]               = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [activeTab, setActiveTab]                   = useState<ActiveTab>("collections");
  const [openMenuId, setOpenMenuId]                 = useState<number | null>(null);
  const [retryingId, setRetryingId]                 = useState<number | null>(null);
  const [requestingDownloadId, setRequestingDownloadId] = useState<number | null>(null);

  // ── Delete confirm state ──
  const [deleteCollection, setDeleteCollection]     = useState<Collection | null>(null);
  const [isDeleting, setIsDeleting]                 = useState(false);

  // ── Resubmit state ──
  const [resubmitCollection, setResubmitCollection] = useState<Collection | null>(null);
  const [isResubmitting, setIsResubmitting]         = useState(false);

  const [searchQuery, setSearchQuery]               = useState("");
  const [sortBy, setSortBy]                         = useState<SortOption>("updated_desc");
  const [sortDropdownOpen, setSortDropdownOpen]     = useState(false);

  // ── Language filter state ──
  const [languageFilter, setLanguageFilter]         = useState<string>("all");
  const [langDropdownOpen, setLangDropdownOpen]     = useState(false);

  // ── Toast state ──
  const [toasts, setToasts] = useState<Toast[]>([]);
  let toastCounter = 0;

  const addToast = (type: Toast["type"], message: string) => {
    const id = ++toastCounter + Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const router   = useRouter();
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || BASE_URL;

  /* ── Auth ── */
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const fetchUser = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, { method: "GET", credentials: "include", signal: controller.signal });
        if (!res.ok) throw new Error("Not authenticated");
        const data = await res.json();
        setUser({ ...data, tier: normalizeTier(data.tier) });
      } catch (err: any) {
        if (err.name === "AbortError") return;
        router.push("/printed");
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    };
    fetchUser();
    return () => { controller.abort(); clearTimeout(timeout); };
  }, [router]);

  /* ── Tab data ── */
  useEffect(() => {
    if (activeTab === "collections"   && user) fetchCollections();
    if (activeTab === "jobs"          && user) fetchJobs();
    if (activeTab === "downloadables" && user) fetchDownloads();
  }, [activeTab, user]);

  /* ── Close menus on outside click ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest("[data-menu]") ||
        target.closest("[data-sort-dropdown]") ||
        target.closest("[data-lang-dropdown]")
      ) return;
      setOpenMenuId(null);
      setSortDropdownOpen(false);
      setLangDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Data fetchers ── */
  const fetchCollections = async () => {
    setCollectionsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/get_collections`, { method: "GET", credentials: "include" });
      if (!res.ok) throw new Error("Failed to load collections");
      const data = await res.json();
      setCollections(data.collections || []);
    } catch (err) {
      console.error("Failed to fetch collections:", err);
    } finally {
      setCollectionsLoading(false);
    }
  };

  const fetchJobs = async () => {
    setJobsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/get_jobs`, { method: "GET", credentials: "include" });
      if (!res.ok) throw new Error("Failed to load jobs");
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
    } finally {
      setJobsLoading(false);
    }
  };

  const fetchDownloads = async () => {
    setDownloadsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/downloads`, { method: "GET", credentials: "include" });
      if (!res.ok) throw new Error("Failed to load downloads");
      const data = await res.json();
      setDownloads(data.items || []);
    } catch (err) {
      console.error("Failed to fetch downloads:", err);
    } finally {
      setDownloadsLoading(false);
    }
  };

  /* ── Derived: unique languages from collections ── */
  const availableLanguages = useMemo(() => {
    const langs = collections
      .map((c) => c.language)
      .filter((l): l is string => !!l && l.trim() !== "");
    return Array.from(new Set(langs)).sort();
  }, [collections]);

  /* ── Filtered + sorted collections ── */
  const displayedCollections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let filtered = q
      ? collections.filter(
          (c) =>
            c.title.toLowerCase().includes(q) ||
            (c.description ?? "").toLowerCase().includes(q)
        )
      : [...collections];

    if (languageFilter !== "all") {
      filtered = filtered.filter(
        (c) => (c.language ?? "").toLowerCase() === languageFilter.toLowerCase()
      );
    }

    return sortCollections(filtered, sortBy);
  }, [collections, searchQuery, sortBy, languageFilter]);

  /* ── Handlers ── */
  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
      router.push("/printed");
    } catch { console.error("Logout failed"); }
  };

  const handleCollectionProcessed = () => {
    setIsModalOpen(false);
    fetchCollections();
  };

  // ── Open delete confirm modal ──
  const handleDeleteClick = (e: React.MouseEvent, col: Collection) => {
    e.stopPropagation();
    setOpenMenuId(null);
    setDeleteCollection(col);
  };

  // ── Confirm delete ──
  const handleConfirmDelete = async () => {
    if (!deleteCollection) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/collection/${deleteCollection.c_id}/delete`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Delete failed with status ${res.status}`);
      }
      const deletedTitle = deleteCollection.title;
      setDeleteCollection(null);
      fetchCollections();
      addToast("success", `"${deletedTitle}" has been deleted successfully.`);
    } catch (err: any) {
      console.error("Delete failed:", err);
      setDeleteCollection(null);
      addToast("error", err?.message || "Failed to delete collection. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRetryCollection = async (e: React.MouseEvent, col: Collection) => {
    e.stopPropagation();
    setOpenMenuId(null);
    setRetryingId(col.c_id);
    try {
      const res = await fetch(`${API_BASE}/collection/${col.c_id}/retry`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Request failed with status ${res.status}`);
      }
      fetchCollections();
    } catch (err) {
      console.error("Retry failed:", err);
    } finally {
      setRetryingId(null);
    }
  };

  // ── Request download ──
  const handleRequestDownload = async (e: React.MouseEvent, col: Collection) => {
    e.stopPropagation();
    setOpenMenuId(null);
    setRequestingDownloadId(col.c_id);
    try {
      const res = await fetch(`${API_BASE}/${col.c_id}/download`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Request failed with status ${res.status}`);
      }
      addToast("success", "Download requested! Check the Downloads tab to track its progress.");
    } catch (err: any) {
      console.error("Download request failed:", err);
      addToast("error", err?.message || "Failed to request download. Please try again.");
    } finally {
      setRequestingDownloadId(null);
    }
  };

  // ── Open resubmit modal ──
  const handleOpenResubmit = (e: React.MouseEvent, col: Collection) => {
    e.stopPropagation();
    setOpenMenuId(null);
    setResubmitCollection(col);
  };

  // ── Confirm resubmit ──
  const handleConfirmResubmit = async (reason: string) => {
    if (!resubmitCollection) return;
    setIsResubmitting(true);
    try {
      const params = new URLSearchParams({ user_reason: reason });
      const res = await fetch(
        `${API_BASE}/resubmit_collection/${resubmitCollection.c_id}?${params.toString()}`,
        { method: "POST", credentials: "include" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Request failed with status ${res.status}`);
      }
      setResubmitCollection(null);
      fetchCollections();
    } catch (err) {
      console.error("Resubmit failed:", err);
    } finally {
      setIsResubmitting(false);
    }
  };

  const TIER_RANK: Record<Tier, number> = { Basic: 1, Pro: 2, Premium: 3 };

  const handleTierSwitch = (tier: Tier) => {
    const isDowngrade = user ? TIER_RANK[tier] < TIER_RANK[user.tier] : false;
    if (isDowngrade) {
      setIsUpgradeModalOpen(false);
      handleLogout();
      return;
    }
    setUser((prev) => prev ? { ...prev, tier } : prev);
    setIsUpgradeModalOpen(false);
  };

  /* ── Guards ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-3 text-orange-500">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Loading dashboard…</span>
      </div>
    );
  }
  if (!user) return null;

  const isPremium = user.tier === "Premium";
  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? "Sort";

  // ── Language dropdown label ──
  const currentLangLabel = languageFilter === "all" ? "All Languages" : languageFilter;

  /* ══════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════ */
  return (
    <main className="min-h-screen flex flex-col bg-gray-950 text-gray-100">
      <DashboardHeader
        user={user}
        onLogout={handleLogout}
        onCreateCollection={() => setIsModalOpen(true)}
        onUpgrade={() => setIsUpgradeModalOpen(true)}
      />

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        currentTier={user.tier}
        onSwitch={handleTierSwitch}
      />

      {/* ── Delete Confirm Modal ── */}
      <DeleteConfirmModal
        isOpen={!!deleteCollection}
        collection={deleteCollection}
        onClose={() => !isDeleting && setDeleteCollection(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />

      {/* ── Resubmit Modal ── */}
      <ResubmitModal
        isOpen={!!resubmitCollection}
        collection={resubmitCollection}
        onClose={() => !isResubmitting && setResubmitCollection(null)}
        onConfirm={handleConfirmResubmit}
        isSubmitting={isResubmitting}
      />

      {/* ── Toast notifications ── */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="flex flex-1">

        {/* ── Sidebar ── */}
        <aside className="w-24 bg-gray-900 border-r border-gray-800 flex flex-col items-center pt-8">
          {NAV_ITEMS.map((item, index) => (
            <React.Fragment key={item.id}>
              <button
                onClick={() => setActiveTab(item.id)}
                className={`relative flex flex-col items-center gap-2 w-20 py-4 rounded-xl transition ${
                  activeTab === item.id ? "text-orange-400" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {item.icon}
                <span className="text-[11px]">{item.label}</span>
              </button>
              {index < NAV_ITEMS.length - 1 && (
                <div className="w-12 h-px bg-gray-700 my-3" />
              )}
            </React.Fragment>
          ))}
        </aside>

        {/* ── Main content ── */}
        <div className="flex-1 px-10 py-10">

          {/* ════════════════ COLLECTIONS TAB ════════════════ */}
          {activeTab === "collections" && (
            <div className="flex flex-col h-full">

              <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-2xl font-semibold">Collections</h2>
                  <p className="text-gray-500 text-sm">Organize and manage your document collections.</p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>

                  {/* Search */}
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <Search size={14} style={{ position: "absolute", left: 10, color: "#6b7280", pointerEvents: "none" }} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search collections…"
                      style={{
                        backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: 10,
                        padding: "8px 12px 8px 30px", fontSize: 13, color: "#e2e8f0",
                        outline: "none", width: 200, transition: "border-color 0.15s",
                      }}
                      onFocus={(e)  => (e.currentTarget.style.borderColor = "rgba(249,115,22,0.5)")}
                      onBlur={(e)   => (e.currentTarget.style.borderColor = "#1e293b")}
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        style={{ position: "absolute", right: 8, background: "none", border: "none", cursor: "pointer", color: "#6b7280", display: "flex", padding: 0 }}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {/* ── Language filter dropdown ── */}
                  {availableLanguages.length > 0 && (
                    <div style={{ position: "relative" }} data-lang-dropdown>
                      <button
                        data-lang-dropdown
                        onClick={() => setLangDropdownOpen((v) => !v)}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          backgroundColor: languageFilter !== "all" ? "rgba(56,189,248,0.1)" : "#0f172a",
                          border: `1px solid ${languageFilter !== "all" ? "rgba(56,189,248,0.4)" : "#1e293b"}`,
                          borderRadius: 10,
                          padding: "8px 12px", fontSize: 13,
                          color: languageFilter !== "all" ? "#7dd3fc" : "#e2e8f0",
                          cursor: "pointer", whiteSpace: "nowrap", transition: "border-color 0.15s",
                        }}
                        onMouseEnter={(e) => { if (languageFilter === "all") (e.currentTarget.style.borderColor = "rgba(56,189,248,0.3)"); }}
                        onMouseLeave={(e) => { if (languageFilter === "all" && !langDropdownOpen) (e.currentTarget.style.borderColor = "#1e293b"); }}
                      >
                        <Globe size={13} style={{ color: languageFilter !== "all" ? "#7dd3fc" : "#6b7280" }} />
                        {currentLangLabel}
                        {languageFilter !== "all" && (
                          <span
                            onClick={(e) => { e.stopPropagation(); setLanguageFilter("all"); }}
                            style={{
                              display: "flex", alignItems: "center", justifyContent: "center",
                              width: 14, height: 14, borderRadius: "50%",
                              backgroundColor: "rgba(56,189,248,0.2)", cursor: "pointer",
                            }}
                          >
                            <X size={9} style={{ color: "#7dd3fc" }} />
                          </span>
                        )}
                        {languageFilter === "all" && (
                          <ChevronDown size={13} style={{ color: "#6b7280", transform: langDropdownOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }} />
                        )}
                      </button>

                      {langDropdownOpen && (
                        <div
                          data-lang-dropdown
                          style={{
                            position: "absolute", top: "calc(100% + 6px)", right: 0,
                            backgroundColor: "#1e293b", border: "1px solid #334155",
                            borderRadius: 10, minWidth: 160, zIndex: 9999,
                            overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                          }}
                        >
                          <button
                            data-lang-dropdown
                            onClick={() => { setLanguageFilter("all"); setLangDropdownOpen(false); }}
                            style={{
                              width: "100%", textAlign: "left", padding: "9px 14px", fontSize: 13,
                              color: languageFilter === "all" ? "#7dd3fc" : "#e2e8f0",
                              backgroundColor: languageFilter === "all" ? "rgba(56,189,248,0.08)" : "transparent",
                              border: "none", cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                            }}
                            onMouseEnter={(e) => { if (languageFilter !== "all") (e.currentTarget as HTMLElement).style.backgroundColor = "#273548"; }}
                            onMouseLeave={(e) => { if (languageFilter !== "all") (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                          >
                            All Languages
                            {languageFilter === "all" && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7dd3fc" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </button>
                          <div style={{ height: 1, background: "#334155" }} />
                          {availableLanguages.map((lang) => (
                            <button
                              key={lang}
                              data-lang-dropdown
                              onClick={() => { setLanguageFilter(lang); setLangDropdownOpen(false); }}
                              style={{
                                width: "100%", textAlign: "left", padding: "9px 14px", fontSize: 13,
                                color: languageFilter === lang ? "#7dd3fc" : "#e2e8f0",
                                backgroundColor: languageFilter === lang ? "rgba(56,189,248,0.08)" : "transparent",
                                border: "none", cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                              }}
                              onMouseEnter={(e) => { if (languageFilter !== lang) (e.currentTarget as HTMLElement).style.backgroundColor = "#273548"; }}
                              onMouseLeave={(e) => { if (languageFilter !== lang) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                            >
                              {lang}
                              {languageFilter === lang && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7dd3fc" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sort */}
                  <div style={{ position: "relative" }} data-sort-dropdown>
                    <button
                      data-sort-dropdown
                      onClick={() => setSortDropdownOpen((v) => !v)}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: 10,
                        padding: "8px 12px", fontSize: 13, color: "#e2e8f0",
                        cursor: "pointer", whiteSpace: "nowrap", transition: "border-color 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(249,115,22,0.4)")}
                      onMouseLeave={(e) => { if (!sortDropdownOpen) (e.currentTarget.style.borderColor = "#1e293b"); }}
                    >
                      {currentSortLabel}
                      <ChevronDown size={13} style={{ color: "#6b7280", transform: sortDropdownOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }} />
                    </button>

                    {sortDropdownOpen && (
                      <div
                        data-sort-dropdown
                        style={{
                          position: "absolute", top: "calc(100% + 6px)", right: 0,
                          backgroundColor: "#1e293b", border: "1px solid #334155",
                          borderRadius: 10, minWidth: 170, zIndex: 9999,
                          overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                        }}
                      >
                        {SORT_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            data-sort-dropdown
                            onClick={() => { setSortBy(opt.value); setSortDropdownOpen(false); }}
                            style={{
                              width: "100%", textAlign: "left", padding: "9px 14px", fontSize: 13,
                              color: sortBy === opt.value ? "#fb923c" : "#e2e8f0",
                              backgroundColor: sortBy === opt.value ? "rgba(249,115,22,0.08)" : "transparent",
                              border: "none", cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                            }}
                            onMouseEnter={(e) => { if (sortBy !== opt.value) (e.currentTarget as HTMLElement).style.backgroundColor = "#273548"; }}
                            onMouseLeave={(e) => { if (sortBy !== opt.value) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                          >
                            {opt.label}
                            {sortBy === opt.value && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* Grid / states */}
              {collectionsLoading ? (
                <SkeletonGrid />
              ) : collections.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 260px)", textAlign: "center" }}>
                  <div style={{ backgroundColor: "rgba(249,115,22,0.1)", width: 72, height: 72, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                    <FolderOpen style={{ width: 36, height: 36, color: "#fb923c" }} />
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: "#f1f5f9", marginBottom: 8 }}>No collections yet</h3>
                  <p style={{ fontSize: 14, color: "#6b7280", maxWidth: 260 }}>Start creating collections to organize and manage your documents in one place.</p>
                </div>
              ) : displayedCollections.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 260px)", textAlign: "center" }}>
                  <div style={{ backgroundColor: "rgba(99,102,241,0.1)", width: 72, height: 72, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                    <Search style={{ width: 32, height: 32, color: "#818cf8" }} />
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: "#f1f5f9", marginBottom: 8 }}>No results found</h3>
                  <p style={{ fontSize: 14, color: "#6b7280", maxWidth: 260 }}>
                    {languageFilter !== "all"
                      ? <>No <span style={{ color: "#7dd3fc" }}>{languageFilter}</span> collections{searchQuery ? <> matching <span style={{ color: "#e2e8f0" }}>"{searchQuery}"</span></> : ""}.</>
                      : <>No collections match <span style={{ color: "#e2e8f0" }}>"{searchQuery}"</span>. Try a different search.</>
                    }
                  </p>
                  <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap", justifyContent: "center" }}>
                    {searchQuery && (
                      <button onClick={() => setSearchQuery("")} style={{ fontSize: 13, color: "#fb923c", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                        Clear search
                      </button>
                    )}
                    {languageFilter !== "all" && (
                      <button onClick={() => setLanguageFilter("all")} style={{ fontSize: 13, color: "#7dd3fc", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                        Clear language filter
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
                  {displayedCollections.map((col) => {
                    const isRetrying          = retryingId === col.c_id;
                    const isRequestingDl      = requestingDownloadId === col.c_id;
                    const statusLower         = col.status.toLowerCase();
                    const canRetry            = ["failed", "partial"].includes(statusLower);
                    const canDelete           = !["queued", "processing"].includes(statusLower);
                    const canRequestDownload  = ["completed", "partial"].includes(statusLower);
                    const canResubmit         = isPremium && statusLower === "completed";

                    return (
                      <div
                        key={col.c_id}
                        onClick={() => router.push(`/dashboard/collection/${col.c_id}`)}
                        className="group bg-[#0F172A] border border-gray-800 hover:border-blue-500/50 rounded-2xl px-4 py-3 transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-lg flex flex-col justify-between"
                        style={{ position: "relative", overflow: "visible" }}
                      >
                        <div className="flex gap-3">
                          <div style={{ backgroundColor: "rgba(247,154,88,0.3)", width: 36, height: 36, minWidth: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <FolderOpen className="w-5 h-5 text-orange-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold truncate">{col.title}</h3>
                            <p className="text-xs text-gray-500 truncate">{col.description || "No description"}</p>
                          </div>
                        </div>

                        {/* ── Language badge ── */}
                        {col.language && (
                          <div style={{ marginTop: 10 }}>
                            <span
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 4,
                                fontSize: 10, fontWeight: 600, letterSpacing: "0.03em",
                                padding: "3px 8px", borderRadius: 9999,
                                backgroundColor: "rgba(167,139,250,0.12)",
                                color: "#a78bfa",
                                border: "1px solid rgba(167,139,250,0.25)",
                              }}
                            >
                              <Globe size={9} />
                              {col.language}
                            </span>
                          </div>
                        )}

                        <div className="mt-3 flex items-center justify-between">
                          <span style={{ ...getStatusStyle(col.status), fontSize: 11, padding: "2px 10px", borderRadius: 9999, fontWeight: 700 }}>
                            {col.status.charAt(0).toUpperCase() + col.status.slice(1).toLowerCase()}
                          </span>

                          <div data-menu style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
                            <button
                              data-menu
                              onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === col.c_id ? null : col.c_id); }}
                              style={{
                                width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                                borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: "#6b7280",
                              }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#1e293b"; (e.currentTarget as HTMLElement).style.color = "#e2e8f0"; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#6b7280"; }}
                            >
                              {(isRetrying || isRequestingDl)
                                ? <Loader2 size={14} className="animate-spin" style={{ color: "#fdba74" }} />
                                : (
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                                    <circle cx="12" cy="5"  r="2.2" />
                                    <circle cx="12" cy="12" r="2.2" />
                                    <circle cx="12" cy="19" r="2.2" />
                                  </svg>
                                )
                              }
                            </button>

                            {openMenuId === col.c_id && (
                              <div
                                data-menu
                                style={{
                                  position: "absolute", bottom: "calc(100% + 6px)", right: 0,
                                  backgroundColor: "#1e293b", border: "1px solid #334155",
                                  borderRadius: 10, minWidth: 148, zIndex: 9999,
                                  overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                                }}
                              >
                                {canRetry && (
                                  <>
                                    <button
                                      data-menu
                                      onClick={(e) => handleRetryCollection(e, col)}
                                      style={{ width: "100%", textAlign: "left", padding: "10px 14px", fontSize: 13, color: "#fdba74", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#273548")}
                                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                                    >
                                      <RotateCcw size={13} />
                                      Retry
                                    </button>
                                    <div style={{ height: 1, background: "#334155" }} />
                                  </>
                                )}

                                {canRequestDownload && (
                                  <>
                                    <button
                                      data-menu
                                      onClick={(e) => handleRequestDownload(e, col)}
                                      style={{ width: "100%", textAlign: "left", padding: "10px 14px", fontSize: 13, color: "#fb923c", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#273548")}
                                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                                    >
                                      <ArrowDownToLine size={13} />
                                      Download
                                    </button>
                                    <div style={{ height: 1, background: "#334155" }} />
                                  </>
                                )}

                                {canResubmit ? (
                                  <>
                                    <button
                                      data-menu
                                      onClick={(e) => handleOpenResubmit(e, col)}
                                      style={{ width: "100%", textAlign: "left", padding: "10px 14px", fontSize: 13, color: "#c084fc", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#273548")}
                                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                                    >
                                      <RefreshCw size={13} />
                                      Resubmit
                                    </button>
                                    <div style={{ height: 1, background: "#334155" }} />
                                  </>
                                ) : null}

                                {canDelete && (
                                  <button
                                    data-menu
                                    onClick={(e) => handleDeleteClick(e, col)}
                                    style={{ width: "100%", textAlign: "left", padding: "10px 14px", fontSize: 13, color: "#fca5a5", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#273548")}
                                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                                  >
                                    <Trash2 size={13} />
                                    Delete
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ════════════════ JOBS TAB ════════════════ */}
          {activeTab === "jobs" && (
            <div className="flex flex-col h-full">
              <div className="mb-8">
                <h2 className="text-2xl font-semibold">Jobs</h2>
                <p className="text-gray-500 text-sm">Track your processing jobs.</p>
              </div>

              {jobsLoading ? (
                <SkeletonTable />
              ) : jobs.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 220px)", textAlign: "center" }}>
                  <div style={{ backgroundColor: "rgba(59,130,246,0.1)", width: 72, height: 72, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                    <Briefcase style={{ width: 36, height: 36, color: "#60a5fa" }} />
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: "#f1f5f9", marginBottom: 8 }}>No jobs yet</h3>
                  <p style={{ fontSize: 14, color: "#6b7280", maxWidth: 260 }}>Jobs will appear here once you start processing your collections.</p>
                </div>
              ) : (
                <div style={{ background: "#0F172A", border: "1px solid #1e293b", borderRadius: 16, overflow: "hidden" }}>
                  <div style={{ padding: "14px 18px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "#f1f5f9" }}>Processing jobs</p>
                      <p style={{ fontSize: 12, color: "#475569", margin: "2px 0 0" }}>{jobs.length} total</p>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {Object.entries(
                        jobs.reduce((acc, j) => {
                          const label = getJobBadgeLabel(j);
                          acc[label] = (acc[label] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([label, n]) => {
                        const matchJob = jobs.find((j) => getJobBadgeLabel(j) === label);
                        const style = matchJob ? getJobBadgeStyle(matchJob) : {};
                        return (
                          <span key={label} style={{ ...style, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 9999 }}>
                            {n} {label}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr>
                          {["Collection", "Status", "Created at", "Progress"].map((h) => (
                            <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#475569", borderBottom: "1px solid #1e293b", whiteSpace: "nowrap" }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {jobs.map((job) => {
                          const pct = Math.round(job.progress.percentage);
                          const collectionUrl = job.collection?.collection_id
                            ? `/dashboard/collection/${job.collection.collection_id}`
                            : null;

                          return (
                            <tr
                              key={job.job_id}
                              onClick={() => collectionUrl && router.push(collectionUrl)}
                              style={{ borderBottom: "1px solid #1e293b", cursor: collectionUrl ? "pointer" : "default", transition: "background 0.1s" }}
                              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = "#0a1020"}
                              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = "transparent"}
                            >
                              <td style={{ padding: "13px 16px", fontWeight: 600, color: collectionUrl ? "#93c5fd" : "#e2e8f0" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  {job.collection?.name || "—"}
                                  {collectionUrl && (
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, flexShrink: 0 }}>
                                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                      <polyline points="15 3 21 3 21 9" />
                                      <line x1="10" y1="14" x2="21" y2="3" />
                                    </svg>
                                  )}
                                </div>
                              </td>
                              <td style={{ padding: "13px 16px" }}>
                                <span style={{ ...getJobBadgeStyle(job), fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 9999 }}>
                                  {getJobBadgeLabel(job)}
                                </span>
                              </td>
                              <td style={{ padding: "13px 16px", color: "#64748b", whiteSpace: "nowrap" }}>
                                {job.created_at
                                  ? new Date(job.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
                                    " " + new Date(job.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
                                  : "—"}
                              </td>
                              <td style={{ padding: "13px 16px", minWidth: 180 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <div style={{ flex: 1, height: 6, borderRadius: 9999, background: "#1e293b", overflow: "hidden" }}>
                                    <div style={{ height: "100%", width: `${pct}%`, background: getProgressBarColor(job), borderRadius: 9999, transition: "width 0.4s ease" }} />
                                  </div>
                                  <span style={{ fontSize: 11, color: "#64748b", minWidth: 32 }}>{pct}%</span>
                                </div>
                                <p style={{ fontSize: 10, color: "#334155", margin: "3px 0 0" }}>
                                  {job.progress.completed}/{job.progress.total} · {job.progress.failed} failed
                                </p>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════════════════ DOWNLOADABLES TAB ════════════════ */}
          {activeTab === "downloadables" && (
            <DownloadablesTab downloads={downloads} loading={downloadsLoading} />
          )}

        </div>
      </div>

      <NewCollectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onProcess={handleCollectionProcessed}
      />
    </main>
  );
}