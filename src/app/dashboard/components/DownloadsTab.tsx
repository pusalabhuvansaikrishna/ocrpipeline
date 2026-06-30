"use client";

import { useEffect, useState } from "react";
import { ArrowDownToLine, FolderOpen, Search, X } from "lucide-react";
import { DownloadItem } from "../types";
import { isDownloadActive, formatFileSize, triggerDownload, getDownloadStatusStyle } from "../utils";
import { SkeletonTable } from "./Skeletons";

/* ═══════════════════════════════════════════════
   DOWNLOADS TAB
═══════════════════════════════════════════════ */
type DownloadsTabProps = {
  apiBase: string;
  isActive: boolean;
};

type FilterOption = "all" | "active" | "expired";

const ROW_LIMIT_OPTIONS = [15, 25, 50, 75, 100] as const;
type RowLimitOption = (typeof ROW_LIMIT_OPTIONS)[number] | "all";

const DownloadsTab = ({ apiBase, isActive }: DownloadsTabProps) => {
  const [downloads, setDownloads]               = useState<DownloadItem[]>([]);
  const [downloadsLoading, setDownloadsLoading] = useState(false);
  const [filter, setFilter]                     = useState<FilterOption>("active");
  const [searchQuery, setSearchQuery]           = useState("");
  const [rowLimit, setRowLimit]                 = useState<RowLimitOption>(15);

  /* ── Fetch when this tab becomes active ── */
  useEffect(() => {
    if (isActive) fetchDownloads();
  }, [isActive]);

  const fetchDownloads = async () => {
    setDownloadsLoading(true);
    try {
      const res = await fetch(`${apiBase}/downloads`, { method: "GET", credentials: "include" });
      if (!res.ok) throw new Error("Failed to load downloads");
      const data = await res.json();
      setDownloads(data.items || []);
      setFilter("active");
      setSearchQuery("");
      setRowLimit(15);
    } catch (err) {
      console.error("Failed to fetch downloads:", err);
    } finally {
      setDownloadsLoading(false);
    }
  };

  const completedCount   = downloads.filter((d) => d.status === "Completed").length;
  const processingCount  = downloads.filter((d) => d.status === "Processing" || d.status === "Pending").length;
  const failedCount      = downloads.filter((d) => d.status === "Failed").length;

  /* ── A download is "active" only if it's Completed AND still within the
        download window; anything Completed past that window is "expired".
        Non-completed items (Pending/Processing/Failed) fall outside both
        buckets and are only shown under "all". ── */
  const isExpired = (item: DownloadItem) =>
    item.status === "Completed" && !isDownloadActive(item.completed_at);
  const isActiveDownload = (item: DownloadItem) =>
    item.status === "Completed" && isDownloadActive(item.completed_at);

  const filteredByStatus = downloads.filter((item) => {
    if (filter === "active") return isActiveDownload(item);
    if (filter === "expired") return isExpired(item);
    return true;
  });

  const filteredDownloads = (() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return filteredByStatus;
    return filteredByStatus.filter((item) => {
      const title    = (item.collection?.title || "").toLowerCase();
      const language = (item.collection?.language || "").toLowerCase();
      const status   = (item.status || "").toLowerCase();
      return title.includes(q) || language.includes(q) || status.includes(q);
    });
  })();

  const activeTotal  = downloads.filter(isActiveDownload).length;
  const expiredTotal = downloads.filter(isExpired).length;

  const displayedDownloads = rowLimit === "all" ? filteredDownloads : filteredDownloads.slice(0, rowLimit);

  return (
    <div className="flex flex-col h-full">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-1">Downloads</h2>
        <p className="text-gray-500 text-sm">
          Export and download processed outputs from your collections. Files are available for 7 days after completion.
        </p>
      </div>

      {downloadsLoading ? (
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
                display: "flex", flexDirection: "column", gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "#f1f5f9" }}>Download requests</p>
                  <p style={{ fontSize: 12, color: "#475569", margin: "2px 0 0" }}>{downloads.length} total</p>
                </div>

                {/* ── Active / Expired filter ── */}
                <div
                  style={{
                    display: "flex", alignItems: "center", gap: 2,
                    backgroundColor: "#0a1020", border: "1px solid #1e293b",
                    borderRadius: 9999, padding: 3,
                  }}
                >
                  {([
                    { key: "all" as const,     label: "All" },
                    { key: "active" as const,  label: `Active (${activeTotal})` },
                    { key: "expired" as const, label: `Expired (${expiredTotal})` },
                  ]).map((opt) => {
                    const isActiveOpt = filter === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => { setFilter(opt.key); setRowLimit(15); }}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 9999,
                          fontSize: 11,
                          fontWeight: 700,
                          border: "none",
                          cursor: "pointer",
                          backgroundColor: isActiveOpt ? "rgba(251,146,60,0.18)" : "transparent",
                          color: isActiveOpt ? "#fdba74" : "#64748b",
                          transition: "all 0.15s",
                          whiteSpace: "nowrap",
                        }}
                        onMouseEnter={(e) => { if (!isActiveOpt) (e.currentTarget as HTMLElement).style.color = "#cbd5e1"; }}
                        onMouseLeave={(e) => { if (!isActiveOpt) (e.currentTarget as HTMLElement).style.color = "#64748b"; }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Search bar (top-left of table) + row limit control ── */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <Search size={14} style={{ position: "absolute", left: 10, color: "#6b7280", pointerEvents: "none" }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search downloads by collection, language, or status…"
                    style={{
                      backgroundColor: "#0a1020", border: "1px solid #1e293b", borderRadius: 10,
                      padding: "8px 12px 8px 30px", fontSize: 13, color: "#e2e8f0",
                      outline: "none", width: 280, transition: "border-color 0.15s",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(251,146,60,0.5)")}
                    onBlur={(e)  => (e.currentTarget.style.borderColor = "#1e293b")}
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

                <div
                  style={{
                    display: "flex", alignItems: "center", gap: 2,
                    backgroundColor: "#0a1020", border: "1px solid #1e293b",
                    borderRadius: 9999, padding: 3,
                  }}
                >
                  {[...ROW_LIMIT_OPTIONS, "all" as const].map((opt) => {
                    const isActiveOpt = rowLimit === opt;
                    return (
                      <button
                        key={opt}
                        onClick={() => setRowLimit(opt)}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 9999,
                          fontSize: 11,
                          fontWeight: 700,
                          border: "none",
                          cursor: "pointer",
                          backgroundColor: isActiveOpt ? "rgba(251,146,60,0.18)" : "transparent",
                          color: isActiveOpt ? "#fdba74" : "#64748b",
                          transition: "all 0.15s",
                          textTransform: opt === "all" ? "capitalize" : "none",
                        }}
                        onMouseEnter={(e) => { if (!isActiveOpt) (e.currentTarget as HTMLElement).style.color = "#cbd5e1"; }}
                        onMouseLeave={(e) => { if (!isActiveOpt) (e.currentTarget as HTMLElement).style.color = "#64748b"; }}
                      >
                        {opt === "all" ? "All" : opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {filteredDownloads.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", textAlign: "center" }}>
                <div style={{ backgroundColor: "rgba(99,102,241,0.1)", width: 56, height: 56, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <Search style={{ width: 26, height: 26, color: "#818cf8" }} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9", marginBottom: 6 }}>No matching downloads</h3>
                <p style={{ fontSize: 13, color: "#6b7280", maxWidth: 280, marginBottom: 14 }}>
                  {searchQuery
                    ? <>No downloads match <span style={{ color: "#e2e8f0" }}>"{searchQuery}"</span> in this filter.</>
                    : "No downloads in this filter yet."}
                </p>
                {(searchQuery || filter !== "all") && (
                  <button
                    onClick={() => { setSearchQuery(""); setFilter("all"); }}
                    style={{ fontSize: 13, color: "#fb923c", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <>
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
                    {displayedDownloads.map((item) => {
                      const active     = isActiveDownload(item);
                      const expired    = isExpired(item);
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

              {/* ── Footer: showing X of Y, quick link to view all ── */}
              {rowLimit !== "all" && filteredDownloads.length > rowLimit && (
                <div
                  style={{
                    padding: "12px 18px",
                    borderTop: "1px solid #1e293b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 12,
                    color: "#64748b",
                  }}
                >
                  <span>
                    Showing {displayedDownloads.length} of {filteredDownloads.length}{searchQuery ? " matching" : ""} downloads
                  </span>
                  <button
                    onClick={() => setRowLimit("all")}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: "#fb923c", fontSize: 12, fontWeight: 600,
                      textDecoration: "underline", padding: 0,
                    }}
                  >
                    Show all
                  </button>
                </div>
              )}
              </>
            )}
          </div>
        </>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  );
};

export default DownloadsTab;