"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Search, X } from "lucide-react";
import { Job } from "../types";
import { getJobBadgeStyle, getJobBadgeLabel, getProgressBarColor } from "../utils";
import { SkeletonTable } from "./Skeletons";

/* ═══════════════════════════════════════════════
   JOBS TAB
═══════════════════════════════════════════════ */
type JobsTabProps = {
  apiBase: string;
  isActive: boolean;
};

const LIMIT_OPTIONS = [10, 25, 50] as const;
type LimitOption = (typeof LIMIT_OPTIONS)[number] | "all";

const JobsTab = ({ apiBase, isActive }: JobsTabProps) => {
  const router = useRouter();
  const [jobs, setJobs]               = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [rowLimit, setRowLimit]       = useState<LimitOption>(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  /* ── Fetch when this tab becomes active ── */
  useEffect(() => {
    if (isActive) fetchJobs();
  }, [isActive]);

  const fetchJobs = async () => {
    setJobsLoading(true);
    try {
      const res = await fetch(`${apiBase}/get_jobs`, { method: "GET", credentials: "include" });
      if (!res.ok) throw new Error("Failed to load jobs");
      const data = await res.json();
      setJobs(data.jobs || []);
      setRowLimit(10); // reset to default page size on every fresh load
      setSearchQuery("");
      setStatusFilter(null);
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
    } finally {
      setJobsLoading(false);
    }
  };

  const filteredJobs = (() => {
    const q = searchQuery.trim().toLowerCase();
    return jobs.filter((j) => {
      const name   = (j.collection?.name || "").toLowerCase();
      const status = getJobBadgeLabel(j);
      const matchesQuery  = !q || name.includes(q) || status.toLowerCase().includes(q);
      const matchesStatus = !statusFilter || status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  })();

  const displayedJobs = rowLimit === "all" ? filteredJobs : filteredJobs.slice(0, rowLimit);

  const toggleStatusFilter = (label: string) => {
    setStatusFilter((prev) => (prev === label ? null : label));
    setRowLimit(10);
  };

  return (
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
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #1e293b", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "#f1f5f9" }}>Processing jobs</p>
                <p style={{ fontSize: 12, color: "#475569", margin: "2px 0 0" }}>{jobs.length} total</p>
              </div>

              {/* ── Row limit control ── */}
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 2,
                  backgroundColor: "#0a1020", border: "1px solid #1e293b",
                  borderRadius: 9999, padding: 3,
                }}
              >
                {[...LIMIT_OPTIONS, "all" as const].map((opt) => {
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
                        backgroundColor: isActiveOpt ? "rgba(96,165,250,0.18)" : "transparent",
                        color: isActiveOpt ? "#93c5fd" : "#64748b",
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

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              {/* ── Search ── */}
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <Search size={14} style={{ position: "absolute", left: 10, color: "#6b7280", pointerEvents: "none" }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search jobs by collection or status…"
                  style={{
                    backgroundColor: "#0a1020", border: "1px solid #1e293b", borderRadius: 10,
                    padding: "8px 12px 8px 30px", fontSize: 13, color: "#e2e8f0",
                    outline: "none", width: 260, transition: "border-color 0.15s",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(96,165,250,0.5)")}
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

              {/* ── Status summary badges (clickable filters) ── */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {statusFilter && (
                  <button
                    onClick={() => setStatusFilter(null)}
                    style={{
                      fontSize: 11, fontWeight: 600, color: "#60a5fa", background: "none",
                      border: "none", cursor: "pointer", textDecoration: "underline", padding: 0,
                      display: "flex", alignItems: "center", gap: 4,
                    }}
                  >
                    <X size={11} /> Clear filter
                  </button>
                )}
                {Object.entries(
                  jobs.reduce((acc, j) => {
                    const label = getJobBadgeLabel(j);
                    acc[label] = (acc[label] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([label, n]) => {
                  const matchJob = jobs.find((j) => getJobBadgeLabel(j) === label);
                  const style = matchJob ? getJobBadgeStyle(matchJob) : {};
                  const isSelected = statusFilter === label;
                  return (
                    <button
                      key={label}
                      onClick={() => toggleStatusFilter(label)}
                      style={{
                        ...style,
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "3px 10px",
                        borderRadius: 9999,
                        cursor: "pointer",
                        border: isSelected ? "1px solid currentColor" : "1px solid transparent",
                        opacity: statusFilter && !isSelected ? 0.45 : 1,
                        transition: "opacity 0.15s, border-color 0.15s",
                        outline: "none",
                      }}
                      title={`Filter by ${label}`}
                    >
                      {n} {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {filteredJobs.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", textAlign: "center" }}>
              <div style={{ backgroundColor: "rgba(99,102,241,0.1)", width: 56, height: 56, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Search style={{ width: 26, height: 26, color: "#818cf8" }} />
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9", marginBottom: 6 }}>No matching jobs</h3>
              <p style={{ fontSize: 13, color: "#6b7280", maxWidth: 260, marginBottom: 14 }}>
                {searchQuery && statusFilter
                  ? <>No jobs match <span style={{ color: "#e2e8f0" }}>"{searchQuery}"</span> with status <span style={{ color: "#e2e8f0" }}>{statusFilter}</span>.</>
                  : searchQuery
                  ? <>No jobs match <span style={{ color: "#e2e8f0" }}>"{searchQuery}"</span>. Try a different search.</>
                  : <>No jobs with status <span style={{ color: "#e2e8f0" }}>{statusFilter}</span>.</>}
              </p>
              <button
                onClick={() => { setSearchQuery(""); setStatusFilter(null); }}
                style={{ fontSize: 13, color: "#60a5fa", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
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
                    {displayedJobs.map((job) => {
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

              {/* ── Footer: showing X of Y, quick link to view all ── */}
              {rowLimit !== "all" && filteredJobs.length > rowLimit && (
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
                    Showing {displayedJobs.length} of {filteredJobs.length}{searchQuery || statusFilter ? " matching" : ""} jobs
                  </span>
                  <button
                    onClick={() => setRowLimit("all")}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: "#60a5fa", fontSize: 12, fontWeight: 600,
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
      )}
    </div>
  );
};

export default JobsTab;