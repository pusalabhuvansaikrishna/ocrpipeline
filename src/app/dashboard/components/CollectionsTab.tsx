"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FolderOpen, RotateCcw, X, Loader2, Search, ChevronDown,
  ArrowDownToLine, RefreshCw, Globe, Trash2,
} from "lucide-react";
import { Collection, SortOption, Toast } from "../types";
import { SORT_OPTIONS, getStatusStyle, sortCollections } from "../utils";
import { SkeletonGrid } from "./Skeletons";
import DeleteConfirmModal from "./DeleteConfirmModal";
import ResubmitModal from "./ResubmitModal";

/* ═══════════════════════════════════════════════
   COLLECTIONS TAB
═══════════════════════════════════════════════ */
type CollectionsTabProps = {
  apiBase: string;
  isActive: boolean;
  isPremium: boolean;
  addToast: (type: Toast["type"], message: string) => void;
  refreshTrigger?: number; // bump this from the parent to force a re-fetch even if already active
};

const CollectionsTab = ({ apiBase, isActive, isPremium, addToast, refreshTrigger }: CollectionsTabProps) => {
  const router = useRouter();

  const [collections, setCollections]               = useState<Collection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
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

  /* ── Fetch when this tab becomes active, or when parent forces a refresh ── */
  useEffect(() => {
    if (isActive) fetchCollections();
  }, [isActive, refreshTrigger]);

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

  /* ── Data fetcher ── */
  const fetchCollections = async () => {
    setCollectionsLoading(true);
    try {
      const res = await fetch(`${apiBase}/get_collections`, { method: "GET", credentials: "include" });
      if (!res.ok) throw new Error("Failed to load collections");
      const data = await res.json();
      setCollections(data.collections || []);
    } catch (err) {
      console.error("Failed to fetch collections:", err);
    } finally {
      setCollectionsLoading(false);
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
  const handleDeleteClick = (e: React.MouseEvent, col: Collection) => {
    e.stopPropagation();
    setOpenMenuId(null);
    setDeleteCollection(col);
  };

  const handleConfirmDelete = async () => {
    if (!deleteCollection) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${apiBase}/collection/${deleteCollection.c_id}/delete`, {
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
      const res = await fetch(`${apiBase}/collection/${col.c_id}/retry`, {
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

  const handleRequestDownload = async (e: React.MouseEvent, col: Collection) => {
    e.stopPropagation();
    setOpenMenuId(null);
    setRequestingDownloadId(col.c_id);
    try {
      const res = await fetch(`${apiBase}/${col.c_id}/download`, {
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

  const handleOpenResubmit = (e: React.MouseEvent, col: Collection) => {
    e.stopPropagation();
    setOpenMenuId(null);
    setResubmitCollection(col);
  };

  const handleConfirmResubmit = async (reason: string) => {
    if (!resubmitCollection) return;
    setIsResubmitting(true);
    try {
      const params = new URLSearchParams({ user_reason: reason });
      const res = await fetch(
        `${apiBase}/resubmit_collection/${resubmitCollection.c_id}?${params.toString()}`,
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

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? "Sort";
  const currentLangLabel = languageFilter === "all" ? "All Languages" : languageFilter;

  return (
    <div className="flex flex-col h-full">
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
  );
};

export default CollectionsTab;