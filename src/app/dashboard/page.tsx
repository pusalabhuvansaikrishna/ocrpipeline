"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen, Briefcase } from "lucide-react";
import DashboardHeader from "./components/Header";
import NewCollectionModal from "./components/NewCollectionModal";
import React from "react";

type User = {
  name?: string;
  email: string;
  photo?: string;
  tier: "Basic" | "Pro" | "Premium";
};

type ActiveTab = "collections" | "jobs";

type Collection = {
  c_id: number;
  title: string;
  description: string | null;
  url: string;
  status: string;
};

type Job = {
  job_id: number;
  status: string;
  created_at: string | null;
  collection: { collection_id: number | null; name: string | null };
  progress: { completed: number; failed: number; total: number; percentage: number };
};

const NAV_ITEMS: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
  { id: "collections", label: "Collections", icon: <FolderOpen className="w-6 h-6" /> },
  { id: "jobs", label: "Jobs", icon: <Briefcase className="w-6 h-6" /> },
];

const getStatusStyle = (status: string): React.CSSProperties => {
  switch (status.toLowerCase()) {
    case "queued":     return { backgroundColor: "rgba(234,179,8,0.2)", color: "#fde047" };
    case "processing": return { backgroundColor: "rgba(59,130,246,0.2)", color: "#93c5fd" };
    case "completed":  return { backgroundColor: "rgba(34,197,94,0.2)", color: "#86efac" };
    default:           return { backgroundColor: "rgba(107,114,128,0.2)", color: "#d1d5db" };
  }
};

const getJobBadgeStyle = (job: Job): React.CSSProperties => {
  const { failed, total } = job.progress;
  const status = job.status.toLowerCase();
  if (status === "queued")     return { backgroundColor: "rgba(234,179,8,0.2)", color: "#fde047" };
  if (status === "processing") return { backgroundColor: "rgba(59,130,246,0.2)", color: "#93c5fd" };
  if (status === "completed") {
    if (total > 0 && failed === total) return { backgroundColor: "rgba(239,68,68,0.2)", color: "#fca5a5" };
    if (failed > 0)                    return { backgroundColor: "rgba(249,115,22,0.2)", color: "#fdba74" };
    return { backgroundColor: "rgba(34,197,94,0.2)", color: "#86efac" };
  }
  return { backgroundColor: "rgba(107,114,128,0.2)", color: "#d1d5db" };
};

const getJobBadgeLabel = (job: Job): string => {
  const { failed, total } = job.progress;
  const status = job.status.toLowerCase();
  if (status === "completed") {
    if (total > 0 && failed === total) return "All failed";
    if (failed > 0) return "Partial";
    return "Completed";
  }
  return job.status.charAt(0).toUpperCase() + job.status.slice(1);
};

const getProgressBarColor = (job: Job): string => {
  const status = job.status.toLowerCase();
  if (status === "completed") return "#4ade80";
  if (status === "processing") return "#60a5fa";
  return "#fb923c";
};

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

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("collections");
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const router = useRouter();
  /*const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";*/
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://10.4.16.36:8003";

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const fetchUser = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Not authenticated");
        const data = await res.json();
        setUser(data);
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

  useEffect(() => {
    if (activeTab === "collections" && user) fetchCollections();
    if (activeTab === "jobs" && user) fetchJobs();
  }, [activeTab, user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-menu]")) return;
      setOpenMenuId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
      router.push("/printed");
    } catch (err) {
      console.error("Logout failed");
    }
  };

  const handleCreateCollection = () => setIsModalOpen(true);

  const handleCollectionProcessed = () => {
    setIsModalOpen(false);
    fetchCollections();
  };

  const handleDelete = async (e: React.MouseEvent, colId: number) => {
    e.stopPropagation();
    setOpenMenuId(null);
    try {
      await fetch(`${API_BASE}/delete_collection/${colId}`, {
        method: "DELETE",
        credentials: "include",
      });
      fetchCollections();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleResubmit = async (e: React.MouseEvent, colId: number) => {
    e.stopPropagation();
    setOpenMenuId(null);
    try {
      await fetch(`${API_BASE}/resubmit_collection/${colId}`, {
        method: "POST",
        credentials: "include",
      });
      fetchCollections();
    } catch (err) {
      console.error("Resubmit failed:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-3 text-orange-500">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Loading dashboard...</span>
      </div>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen flex flex-col bg-gray-950 text-gray-100">
      <DashboardHeader user={user} onLogout={handleLogout} onCreateCollection={handleCreateCollection} />

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-24 bg-gray-900 border-r border-gray-800 flex flex-col items-center pt-8">
          {NAV_ITEMS.map((item, index) => (
            <React.Fragment key={item.id}>
              <button
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center gap-2 w-20 py-4 rounded-xl transition ${
                  activeTab === item.id ? "text-orange-400" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {item.icon}
                <span className="text-[11px]">{item.label}</span>
              </button>
              {index < NAV_ITEMS.length - 1 && <div className="w-12 h-px bg-gray-700 my-3" />}
            </React.Fragment>
          ))}
        </aside>

        {/* Main */}
        <div className="flex-1 px-10 py-10">

          {/* ── COLLECTIONS TAB ── */}
          {activeTab === "collections" && (
            <div className="flex flex-col h-full">
              <div className="mb-8">
                <h2 className="text-2xl font-semibold">Collections</h2>
                <p className="text-gray-500 text-sm">Organize and manage your document collections.</p>
              </div>

              {collectionsLoading ? (
                <SkeletonGrid />
              ) : collections.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 220px)", textAlign: "center" }}>
                  <div style={{ backgroundColor: "rgba(249,115,22,0.1)", width: 72, height: 72, minHeight: 72, flexShrink: 0, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                    <FolderOpen style={{ width: 36, height: 36, color: "#fb923c" }} />
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: "#f1f5f9", marginBottom: 8 }}>No collections yet</h3>
                  <p style={{ fontSize: 14, color: "#6b7280", maxWidth: 260 }}>Start creating collections to organize and manage your documents in one place.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
                  {collections.map((col) => (
                    <div
                      key={col.c_id}
                      onClick={() => router.push(`/dashboard/collection/${col.c_id}`)}
                      className="group bg-[#0F172A] border border-gray-800 hover:border-blue-500/50 rounded-2xl px-4 py-3 transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-lg flex flex-col justify-between"
                      style={{ position: "relative", overflow: "visible" }}
                    >
                      {/* Top: icon + title */}
                      <div className="flex gap-3">
                        <div style={{ backgroundColor: "rgba(247,154,88,0.3)", width: 36, height: 36, minWidth: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <FolderOpen className="w-5 h-5 text-orange-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold truncate">{col.title}</h3>
                          <p className="text-xs text-gray-500 truncate">{col.description || "No description"}</p>
                        </div>
                      </div>

                      {/* Bottom: status + three-dot menu */}
                      <div className="mt-4 flex items-center justify-between">
                        <span style={{ ...getStatusStyle(col.status), fontSize: 11, padding: "2px 10px", borderRadius: 9999, fontWeight: 700 }}>
                          {col.status}
                        </span>

                        <div
                          data-menu
                          style={{ position: "relative" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Three-dot button */}
                          <button
                            data-menu
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === col.c_id ? null : col.c_id);
                            }}
                            style={{
                              width: 28,
                              height: 28,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: 8,
                              border: "none",
                              background: "transparent",
                              cursor: "pointer",
                              color: "#6b7280",
                              transition: "background 0.15s, color 0.15s",
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.background = "#1e293b";
                              (e.currentTarget as HTMLElement).style.color = "#e2e8f0";
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.background = "transparent";
                              (e.currentTarget as HTMLElement).style.color = "#6b7280";
                            }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                              <circle cx="12" cy="5"  r="2.2" />
                              <circle cx="12" cy="12" r="2.2" />
                              <circle cx="12" cy="19" r="2.2" />
                            </svg>
                          </button>

                          {/* Dropdown */}
                          {openMenuId === col.c_id && (
                            <div
                              data-menu
                              style={{
                                position: "absolute",
                                bottom: "calc(100% + 6px)",
                                right: 0,
                                backgroundColor: "#1e293b",
                                border: "1px solid #334155",
                                borderRadius: 10,
                                minWidth: 140,
                                zIndex: 9999,
                                overflow: "hidden",
                                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                              }}
                            >
                              {/* Resubmit — Premium users only */}
                              {user.tier === "Premium" && (
                                <>
                                  <button
                                    data-menu
                                    onClick={(e) => handleResubmit(e, col.c_id)}
                                    style={{
                                      width: "100%",
                                      textAlign: "left",
                                      padding: "10px 14px",
                                      fontSize: 13,
                                      color: "#93c5fd",
                                      background: "transparent",
                                      border: "none",
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 8,
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = "#273548"}
                                    onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = "transparent"}
                                  >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M23 4v6h-6" />
                                      <path d="M1 20v-6h6" />
                                      <path d="M3.51 9a9 9 0 0 1 14.13-3.36L23 10M1 14l5.36 4.36A9 9 0 0 0 20.49 15" />
                                    </svg>
                                    Resubmit
                                  </button>
                                  <div style={{ height: 1, background: "#334155" }} />
                                </>
                              )}

                              {/* Delete — all users */}
                              <button
                                data-menu
                                onClick={(e) => handleDelete(e, col.c_id)}
                                style={{
                                  width: "100%",
                                  textAlign: "left",
                                  padding: "10px 14px",
                                  fontSize: 13,
                                  color: "#fca5a5",
                                  background: "transparent",
                                  border: "none",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                }}
                                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = "#273548"}
                                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = "transparent"}
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                  <path d="M10 11v6" /><path d="M14 11v6" />
                                  <path d="M9 6V4h6v2" />
                                </svg>
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── JOBS TAB ── */}
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
                  <div style={{ backgroundColor: "rgba(59,130,246,0.1)", width: 72, height: 72, minHeight: 72, flexShrink: 0, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                    <Briefcase style={{ width: 36, height: 36, color: "#60a5fa" }} />
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: "#f1f5f9", marginBottom: 8 }}>No jobs yet</h3>
                  <p style={{ fontSize: 14, color: "#6b7280", maxWidth: 260 }}>Jobs will appear here once you start processing your collections.</p>
                </div>
              ) : (
                <div style={{ background: "#0F172A", border: "1px solid #1e293b", borderRadius: 16, overflow: "hidden" }}>
                  {/* Table header */}
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

                  {/* Table */}
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
                          const barColor = getProgressBarColor(job);
                          return (
                            <tr
                              key={job.job_id}
                              style={{ borderBottom: "1px solid #1e293b" }}
                              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = "#0a1020"}
                              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = "transparent"}
                            >
                              <td style={{ padding: "13px 16px", fontWeight: 600, color: "#e2e8f0" }}>{job.collection?.name || "—"}</td>
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
                                    <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 9999, transition: "width 0.4s ease" }} />
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