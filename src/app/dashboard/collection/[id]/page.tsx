"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  FileText,
  Clock,
  CheckCircle,
  Loader2,
  AlertCircle,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  FileSearch,
  FileSpreadsheet,
  FileJson,
  FileType,
  Download,
} from "lucide-react";
import Header from "../../components/Header";

/* ═══════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════ */
type Doc = {
  document_id: number;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  ocr_url: string;
  status: string;
  created_at: string;
};

/* ═══════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════ */
const SIDEBAR_W = 300;
const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "svg", "avif"]);
const PDF_EXTS = new Set(["pdf"]);

/* ═══════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════ */
function ext(doc: Doc) {
  return (doc.file_type ?? "").toLowerCase().trim();
}
function fmtSize(bytes: number) {
  if (!bytes) return null;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}
function statusMeta(status: string) {
  switch (status.toLowerCase()) {
    case "queued":     return { bg: "rgba(234,179,8,0.18)",   fg: "#fde047", Icon: Clock };
    case "processing": return { bg: "rgba(59,130,246,0.18)",  fg: "#93c5fd", Icon: Loader2 };
    case "completed":  return { bg: "rgba(34,197,94,0.18)",   fg: "#86efac", Icon: CheckCircle };
    default:           return { bg: "rgba(107,114,128,0.18)", fg: "#d1d5db", Icon: AlertCircle };
  }
}

function getFullUrl(base: string, path: string): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const cleanBase = base.replace(/\/$/, "");
  const cleanPath = path.replace(/^\//, "");
  return `${cleanBase}/${cleanPath}`;
}

function getOcrHtmlPath(filePath: string): string {
  if (!filePath) return "";
  return filePath.replace(/\.[^/.]+$/, "") + ".html";
}

/* ═══════════════════════════════════════════════
   SIDEBAR TILE
═══════════════════════════════════════════════ */
function FileTile({ doc, isActive, onClick, apiBase }: {
  doc: Doc;
  isActive: boolean;
  onClick: () => void;
  apiBase: string;
}) {
  const [imgErr, setImgErr] = useState(false);
  const e = ext(doc);
  const isImg = IMAGE_EXTS.has(e) && !!doc.file_path;
  const isPdf = PDF_EXTS.has(e) && !!doc.file_path;
  const { bg: stBg, fg: stFg, Icon: StatusIcon } = statusMeta(doc.status);

  const fullFileUrl = getFullUrl(apiBase, doc.file_path);
  const thumbnailSrc = isImg && fullFileUrl
    ? `/api/image-proxy?url=${encodeURIComponent(fullFileUrl)}`
    : "";

  const typeTheme: Record<string, { bg: string; accent: string; Icon: React.ElementType }> = {
    pdf:  { bg: "rgba(239,68,68,0.1)",   accent: "#f87171", Icon: FileText },
    docx: { bg: "rgba(59,130,246,0.1)",  accent: "#60a5fa", Icon: FileText },
    doc:  { bg: "rgba(59,130,246,0.1)",  accent: "#60a5fa", Icon: FileText },
    xlsx: { bg: "rgba(34,197,94,0.1)",   accent: "#4ade80", Icon: FileSpreadsheet },
    xls:  { bg: "rgba(34,197,94,0.1)",   accent: "#4ade80", Icon: FileSpreadsheet },
    csv:  { bg: "rgba(34,197,94,0.1)",   accent: "#4ade80", Icon: FileSpreadsheet },
    txt:  { bg: "rgba(148,163,184,0.08)",accent: "#94a3b8", Icon: FileType },
    json: { bg: "rgba(251,191,36,0.1)",  accent: "#fbbf24", Icon: FileJson },
    xml:  { bg: "rgba(251,191,36,0.1)",  accent: "#fbbf24", Icon: FileJson },
  };
  const theme = typeTheme[e] ?? { bg: "rgba(99,102,241,0.1)", accent: "#818cf8", Icon: FileText };

  return (
    <button
      onClick={onClick}
      style={{
        all: "unset",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        borderRadius: 10,
        overflow: "hidden",
        border: `1.5px solid ${isActive ? "rgba(99,102,241,0.6)" : "#1e293b"}`,
        cursor: "pointer",
        marginBottom: 10,
        boxShadow: isActive ? "0 0 0 3px rgba(99,102,241,0.12)" : "none",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = "rgba(99,102,241,0.35)"; }}
      onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = "#1e293b"; }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: 110,
          overflow: "hidden",
          flexShrink: 0,
          backgroundColor: isImg ? "#000" : theme.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isImg && !imgErr && thumbnailSrc && (
          <img
            src={thumbnailSrc}
            alt={doc.file_name}
            onError={() => setImgErr(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        )}

        {isPdf && fullFileUrl && (
          <>
            <div style={{ position: "absolute", inset: 0, overflow: "hidden", backgroundColor: "#fff" }}>
              <iframe
                src={`${fullFileUrl}#toolbar=0&navpanes=0&scrollbar=0&page=1`}
                style={{
                  width: "600px",
                  height: "800px",
                  border: "none",
                  transformOrigin: "top left",
                  transform: "scale(0.5)",
                  pointerEvents: "none",
                }}
              />
            </div>
            <div style={{ position: "absolute", inset: 0, zIndex: 1 }} />
          </>
        )}

        {(!isImg || imgErr) && !isPdf && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <theme.Icon size={32} style={{ color: theme.accent, opacity: 0.9 }} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: theme.accent,
                fontFamily: "monospace",
                opacity: 0.8,
              }}
            >
              {e ? `.${e.toUpperCase()}` : "FILE"}
            </span>
          </div>
        )}

        {isActive && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(99,102,241,0.18)",
              zIndex: 2,
              pointerEvents: "none",
            }}
          />
        )}

        <span
          title={doc.status}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 3,
            backgroundColor: stBg,
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            width: 22,
            height: 22,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `1px solid ${stFg}33`,
          }}
        >
          <StatusIcon
            size={11}
            style={{ color: stFg }}
            className={doc.status.toLowerCase() === "processing" ? "animate-spin" : ""}
          />
        </span>
      </div>

      <div
        style={{
          padding: "9px 11px 9px",
          backgroundColor: isActive ? "rgba(99,102,241,0.1)" : "#0c1424",
          borderTop: `1px solid ${isActive ? "rgba(99,102,241,0.25)" : "#1e293b"}`,
        }}
      >
        <p
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: isActive ? "#e2e8f0" : "#94a3b8",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            margin: 0,
          }}
        >
          {doc.file_name}
        </p>
        <p style={{ fontSize: 10, color: "#334155", marginTop: 2 }}>
          {e ? e.toUpperCase() : "—"}
          {fmtSize(doc.file_size) ? ` · ${fmtSize(doc.file_size)}` : ""}
        </p>
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════════
   SKELETON + PLACEHOLDER
═══════════════════════════════════════════════ */
function SkeletonTile() {
  return (
    <div style={{ borderRadius: 10, border: "1px solid #1e293b", overflow: "hidden", marginBottom: 10 }}>
      <div className="sk" style={{ width: "100%", height: 110 }} />
      <div style={{ padding: "9px 11px", backgroundColor: "#0c1424", borderTop: "1px solid #1e293b", display: "flex", flexDirection: "column", gap: 6 }}>
        <div className="sk" style={{ height: 10, width: "72%" }} />
        <div className="sk" style={{ height: 8, width: "42%" }} />
      </div>
    </div>
  );
}

function Placeholder({
  icon,
  title,
  sub,
  accent = "#475569",
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        padding: 40,
        textAlign: "center",
        gap: 12,
      }}
    >
      {icon}
      <p style={{ fontSize: 15, fontWeight: 600, color: accent, margin: 0 }}>{title}</p>
      <p style={{ fontSize: 13, color: "#475569", margin: 0, maxWidth: 320 }}>{sub}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   DOCUMENT VIEWER
═══════════════════════════════════════════════ */
function DocumentViewer({ doc, apiBase }: { doc: Doc; apiBase: string }) {
  const e = ext(doc);
  const isImg = IMAGE_EXTS.has(e);
  const isPdf = PDF_EXTS.has(e);

  const fullFileUrl = getFullUrl(apiBase, doc.file_path);

  const imageSrc = isImg && fullFileUrl
    ? `/api/image-proxy?url=${encodeURIComponent(fullFileUrl)}`
    : "";

  // OCR URL
  let ocrHtmlUrl = "";
  if (doc.ocr_url && doc.ocr_url.trim() !== "") {
    ocrHtmlUrl = getFullUrl(apiBase, doc.ocr_url);
  } else if (fullFileUrl) {
    const ocrPath = getOcrHtmlPath(doc.file_path);
    ocrHtmlUrl = getFullUrl(apiBase, ocrPath);
  }

  // Use the SAME proxy that already works for images → this fixes CORS issues
  const downloadProxyUrl = ocrHtmlUrl
    ? `/api/image-proxy?url=${encodeURIComponent(ocrHtmlUrl)}`
    : "";

  const status = doc.status.toLowerCase();
  const { bg: stBg, fg: stFg, Icon: StatusIcon } = statusMeta(doc.status);

  /* FIXED + IMPROVED DOWNLOAD HANDLER */
  const handleDownloadOCR = async () => {
    if (!ocrHtmlUrl || !downloadProxyUrl) return;

    const downloadBtn = document.getElementById("ocr-download-btn") as HTMLButtonElement | null;
    const originalHTML = downloadBtn?.innerHTML || "";

    // Show loading state
    if (downloadBtn) {
      downloadBtn.style.pointerEvents = "none";
      downloadBtn.innerHTML = `
        <span style="display:flex;align-items:center;gap:6px">
          <svg class="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"></path>
            <path d="M12 3v6"></path>
          </svg>
          Downloading...
        </span>`;
    }

    try {
      const res = await fetch(downloadProxyUrl, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;

      const baseName = (doc.file_name || "document").replace(/\.[^/.]+$/, "");
      link.download = `${baseName}.html`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      console.error("Download failed:", err);
      alert(`Could not download the OCR file.\n\nError: ${err.message}\n\nPlease check the browser console (F12) for full details.`);
    } finally {
      // Restore button
      if (downloadBtn) {
        downloadBtn.style.pointerEvents = "auto";
        downloadBtn.innerHTML = originalHTML;
      }
    }
  };

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

      {/* LEFT — file preview */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          borderRight: "1px solid #1e293b",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {isPdf && fullFileUrl && (
          <iframe
            src={`${fullFileUrl}#toolbar=0&navpanes=0&scrollbar=1`}
            title={doc.file_name}
            style={{ flex: 1, width: "100%", border: "none", display: "block" }}
          />
        )}
        {isImg && imageSrc && (
          <div style={{ flex: 1, overflow: "auto", padding: 24, display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
            <img
              src={imageSrc}
              alt={doc.file_name}
              style={{ maxWidth: "100%", borderRadius: 10, boxShadow: "0 4px 32px rgba(0,0,0,0.5)" }}
            />
          </div>
        )}
        {!isPdf && !isImg && (
          <Placeholder
            icon={<FileSearch size={36} style={{ color: "#475569" }} />}
            title="No preview available"
            sub="This document type cannot be previewed directly."
          />
        )}
      </div>

      {/* RIGHT — OCR output */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          backgroundColor: "#080e1c",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            height: 44,
            borderBottom: "1px solid #1e293b",
            flexShrink: 0,
          }}
        >
          {/* Left side */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                backgroundColor: "rgba(99,102,241,0.12)",
                width: 28,
                height: 28,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileSearch size={13} style={{ color: "#818cf8" }} />
            </div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#475569",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              OCR Output
            </p>
          </div>

          {/* Right side: Download button + Status */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Download button – appears only when completed */}
            {status === "completed" && ocrHtmlUrl && (
              <button
                id="ocr-download-btn"
                onClick={handleDownloadOCR}
                title="Download OCR HTML file"
                style={{
                  all: "unset",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: "rgba(99,102,241,0.12)",
                  color: "#818cf8",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "4px 14px",
                  borderRadius: 9999,
                  cursor: "pointer",
                  transition: "background-color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(99,102,241,0.22)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(99,102,241,0.12)";
                }}
              >
                <Download size={14} />
                Download
              </button>
            )}

            {/* Status badge */}
            <span
              style={{
                backgroundColor: stBg,
                color: stFg,
                fontSize: 10,
                fontWeight: 700,
                padding: "3px 9px",
                borderRadius: 9999,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <StatusIcon size={10} className={status === "processing" ? "animate-spin" : ""} />
              {doc.status}
            </span>
          </div>
        </div>

        {/* OCR body */}
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          {status === "queued" && (
            <Placeholder
              icon={<Clock size={32} style={{ color: "#fde047" }} />}
              title="Queued for processing"
              sub="OCR hasn't started yet. Check back shortly."
            />
          )}

          {status === "processing" && (
            <Placeholder
              icon={<Loader2 size={32} style={{ color: "#93c5fd" }} className="animate-spin" />}
              title="Processing…"
              sub="OCR is running. Text will appear here when complete."
            />
          )}

          {status === "completed" && ocrHtmlUrl && (
            <iframe
              key={ocrHtmlUrl}
              src={ocrHtmlUrl}
              title={`OCR — ${doc.file_name}`}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                display: "block",
                backgroundColor: "#fff",
              }}
              allowFullScreen
            />
          )}

          {status === "completed" && !ocrHtmlUrl && (
            <Placeholder
              icon={<FileSearch size={32} style={{ color: "#475569" }} />}
              title="No OCR output found"
              sub="The HTML output file could not be located for this document."
            />
          )}

          {status !== "queued" && status !== "processing" && status !== "completed" && (
            <Placeholder
              icon={<AlertCircle size={32} style={{ color: "#f87171" }} />}
              title="Processing failed"
              sub="OCR could not be completed for this document."
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════ */
export default function CollectionDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Doc | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    if (!id) return;
    setError(null);
    setLoading(true);
    fetch(`${API_BASE}/collection/${id}/documents`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          let msg = `HTTP ${res.status}`;
          try {
            const d = await res.json();
            msg += `: ${d.detail || d.message || d.error || ""}`;
          } catch {}
          throw new Error(msg);
        }
        return res.json();
      })
      .then((data) => {
        const docs: Doc[] = data.documents ?? [];
        setDocuments(docs);
        if (docs.length > 0) setSelected(docs[0]);
      })
      .catch((e) => {
        setError(e.message);
        setDocuments([]);
      })
      .finally(() => setLoading(false));
  }, [id, API_BASE]);

  return (
    <>
      {/* global styles */}
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 99px; }
        ::-webkit-scrollbar-thumb:hover { background: #334155; }
        @keyframes shimmer {
          0% { background-position: -500px 0; }
          100% { background-position: 500px 0; }
        }
        .sk {
          background: linear-gradient(90deg,#1e293b 25%,#263347 50%,#1e293b 75%);
          background-size: 500px 100%;
          animation: shimmer 1.6s infinite linear;
        }
      `}</style>

      <Header />

      <div
        style={{
          display: "flex",
          height: "calc(100vh - 60px)",
          backgroundColor: "#060b14",
          color: "#e2e8f0",
          overflow: "hidden",
          fontFamily: "'DM Sans','Segoe UI',sans-serif",
        }}
      >
        {/* SIDEBAR */}
        <aside
          style={{
            width: sidebarOpen ? SIDEBAR_W : 0,
            minWidth: sidebarOpen ? SIDEBAR_W : 0,
            overflow: "hidden",
            borderRight: "1px solid #1e293b",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#0a1020",
            transition: "width 0.25s ease, min-width 0.25s ease",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              padding: "13px 14px 10px",
              borderBottom: "1px solid #1e293b",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Documents
              </p>
              {!loading && (
                <p style={{ fontSize: 10, color: "#334155", marginTop: 2 }}>
                  {documents.length} file{documents.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#334155",
                display: "flex",
                padding: 4,
                borderRadius: 6,
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#64748b")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#334155")}
              title="Collapse sidebar"
            >
              <PanelLeftClose size={15} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px 16px" }}>
            {error && (
              <div
                style={{
                  backgroundColor: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  color: "#fca5a5",
                  fontSize: 12,
                  marginBottom: 10,
                }}
              >
                {error}
              </div>
            )}
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <SkeletonTile key={i} />)
              : documents.length === 0
                ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 16px", gap: 8 }}>
                    <FileText size={30} style={{ color: "#1e293b" }} />
                    <p style={{ fontSize: 12, color: "#334155", textAlign: "center" }}>No documents in this collection</p>
                  </div>
                )
                : documents.map((doc) => (
                  <FileTile
                    key={doc.document_id}
                    doc={doc}
                    isActive={selected?.document_id === doc.document_id}
                    onClick={() => setSelected(doc)}
                    apiBase={API_BASE}
                  />
                ))}
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          <div
            style={{
              height: 40,
              borderBottom: "1px solid #1e293b",
              display: "flex",
              alignItems: "center",
              padding: "0 14px",
              gap: 8,
              flexShrink: 0,
              backgroundColor: "#0a1020",
            }}
          >
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#475569",
                  display: "flex",
                  padding: "4px 6px",
                  borderRadius: 6,
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#94a3b8")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#475569")}
                title="Expand sidebar"
              >
                <PanelLeftOpen size={15} />
              </button>
            )}
            {selected && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0, overflow: "hidden" }}>
                <span style={{ fontSize: 11, color: "#334155", flexShrink: 0 }}>Collection</span>
                <ChevronRight size={12} style={{ color: "#1e293b", flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selected.file_name}
                </span>
              </div>
            )}
          </div>

          <div style={{ flex: 1, overflow: "hidden" }}>
            {selected ? (
              <DocumentViewer key={selected.document_id} doc={selected} apiBase={API_BASE} />
            ) : (
              <Placeholder
                icon={<FileSearch size={44} strokeWidth={1.2} style={{ color: "#1e293b" }} />}
                title="No document selected"
                sub="Pick a file from the sidebar to preview it here."
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}