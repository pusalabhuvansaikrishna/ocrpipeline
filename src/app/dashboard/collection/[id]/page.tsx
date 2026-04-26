"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  RotateCcw,
  X,
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
const REASON_MAX = 1000;

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
   RESUBMIT MODAL
═══════════════════════════════════════════════ */
function ResubmitModal({
  doc,
  apiBase,
  onClose,
}: {
  doc: Doc;
  apiBase: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const remaining = REASON_MAX - reason.length;
  const isOverLimit = remaining < 0;
  const isEmpty = reason.trim().length === 0;

  const handleResubmit = async () => {
    if (isEmpty || isOverLimit || submitting) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const params = new URLSearchParams({
        document_id: String(doc.document_id),
        user_reason: reason.trim(),
      });

      const res = await fetch(`${apiBase}/review-tasks?${params.toString()}`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Request failed with status ${res.status}`);
      }

      setSubmitSuccess(true);
      setTimeout(() => onClose(), 1500);
    } catch (err: any) {
      setSubmitError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        backgroundColor: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        animation: "fadeIn 0.15s ease",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          backgroundColor: "#0d1626",
          borderRadius: 14,
          border: "1px solid #1e293b",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.08)",
          overflow: "hidden",
          animation: "slideUp 0.18s ease",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid #1e293b",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: "rgba(234,179,8,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <RotateCcw size={15} style={{ color: "#fde047" }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>
                Resubmit for OCR
              </p>
              <p
                style={{
                  fontSize: 11,
                  color: "#475569",
                  margin: 0,
                  marginTop: 1,
                  maxWidth: 300,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {doc.file_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              all: "unset",
              width: 28,
              height: 28,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#475569",
              backgroundColor: "transparent",
              transition: "background-color 0.15s, color 0.15s",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(239,68,68,0.1)";
              (e.currentTarget as HTMLElement).style.color = "#f87171";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
              (e.currentTarget as HTMLElement).style.color = "#475569";
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "20px 20px 24px" }}>

          {submitSuccess && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                backgroundColor: "rgba(34,197,94,0.1)",
                border: "1px solid rgba(34,197,94,0.25)",
                borderRadius: 10,
                padding: "12px 14px",
                marginBottom: 16,
              }}
            >
              <CheckCircle size={16} style={{ color: "#86efac", flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: "#86efac", margin: 0, fontWeight: 600 }}>
                Resubmitted successfully!
              </p>
            </div>
          )}

          {submitError && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                backgroundColor: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: 10,
                padding: "12px 14px",
                marginBottom: 16,
              }}
            >
              <AlertCircle size={16} style={{ color: "#f87171", flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 13, color: "#fca5a5", margin: 0 }}>{submitError}</p>
            </div>
          )}

          <label
            htmlFor="resubmit-reason"
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: "#94a3b8",
              marginBottom: 8,
              letterSpacing: "0.03em",
            }}
          >
            Reason for resubmission
            <span style={{ color: "#f87171", marginLeft: 3 }}>*</span>
          </label>

          <div style={{ position: "relative" }}>
            <textarea
              id="resubmit-reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (submitError) setSubmitError(null);
              }}
              disabled={submitting || submitSuccess}
              placeholder="Describe what was wrong with the OCR output — e.g. missing text, incorrect characters, layout issues…"
              rows={5}
              style={{
                width: "100%",
                resize: "vertical",
                backgroundColor: "#060b14",
                border: `1.5px solid ${isOverLimit ? "rgba(239,68,68,0.5)" : "#1e293b"}`,
                borderRadius: 10,
                color: "#e2e8f0",
                fontSize: 13,
                lineHeight: 1.6,
                padding: "12px 14px",
                outline: "none",
                fontFamily: "'DM Sans','Segoe UI',sans-serif",
                boxSizing: "border-box",
                transition: "border-color 0.15s",
                minHeight: 120,
                opacity: submitting || submitSuccess ? 0.5 : 1,
              }}
              onFocus={(e) => {
                if (!isOverLimit)
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(99,102,241,0.5)";
              }}
              onBlur={(e) => {
                if (!isOverLimit)
                  (e.currentTarget as HTMLElement).style.borderColor = "#1e293b";
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: isOverLimit ? "#f87171" : remaining <= 100 ? "#fde047" : "#334155",
                transition: "color 0.15s",
              }}
            >
              {remaining < 0 ? `${Math.abs(remaining)} over limit` : `${remaining} characters remaining`}
            </span>
          </div>

          <button
            onClick={handleResubmit}
            disabled={isEmpty || isOverLimit || submitting || submitSuccess}
            style={{
              all: "unset",
              marginTop: 16,
              width: "100%",
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              backgroundColor:
                isEmpty || isOverLimit || submitting || submitSuccess
                  ? "rgba(234,179,8,0.05)"
                  : "rgba(234,179,8,0.14)",
              color:
                isEmpty || isOverLimit || submitting || submitSuccess
                  ? "#4b4416"
                  : "#fde047",
              fontSize: 13,
              fontWeight: 700,
              padding: "11px 20px",
              borderRadius: 10,
              cursor:
                isEmpty || isOverLimit || submitting || submitSuccess
                  ? "not-allowed"
                  : "pointer",
              border: `1.5px solid ${
                isEmpty || isOverLimit || submitting || submitSuccess
                  ? "rgba(234,179,8,0.08)"
                  : "rgba(234,179,8,0.2)"
              }`,
              transition: "background-color 0.15s, color 0.15s, border-color 0.15s",
              letterSpacing: "0.02em",
            }}
            onMouseEnter={(e) => {
              if (!isEmpty && !isOverLimit && !submitting && !submitSuccess)
                (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(234,179,8,0.22)";
            }}
            onMouseLeave={(e) => {
              if (!isEmpty && !isOverLimit && !submitting && !submitSuccess)
                (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(234,179,8,0.14)";
            }}
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <RotateCcw size={14} />
                Resubmit to OCR
              </>
            )}
          </button>

          <p style={{ fontSize: 11, color: "#334155", textAlign: "center", marginTop: 10, marginBottom: 0 }}>
            The document will be re-queued and processed again.
          </p>
        </div>
      </div>
    </div>
  );
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
        {/* Image thumbnail */}
        {isImg && !imgErr && thumbnailSrc && (
          <img
            src={thumbnailSrc}
            alt={doc.file_name}
            onError={() => setImgErr(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        )}

        {/* Icon placeholder for all non-image files (including PDFs) */}
        {(!isImg || imgErr) && (
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
function DocumentViewer({
  doc,
  apiBase,
  userTier,
}: {
  doc: Doc;
  apiBase: string;
  userTier?: string;
}) {
  const [resubmitOpen, setResubmitOpen] = useState(false);

  // ── PDF blob state (fixes download & rendering issues) ──
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const e = ext(doc);
  const isImg = IMAGE_EXTS.has(e);
  const isPdf = PDF_EXTS.has(e);

  const fullFileUrl = getFullUrl(apiBase, doc.file_path);

  // Route all file fetches through the image proxy to avoid CORS / Content-Disposition issues
  const proxyFileUrl = fullFileUrl
    ? `/api/image-proxy?url=${encodeURIComponent(fullFileUrl)}`
    : "";

  const imageSrc = isImg && proxyFileUrl ? proxyFileUrl : "";

  let ocrHtmlUrl = "";
  if (doc.ocr_url && doc.ocr_url.trim() !== "") {
    ocrHtmlUrl = getFullUrl(apiBase, doc.ocr_url);
  } else if (fullFileUrl) {
    const ocrPath = getOcrHtmlPath(doc.file_path);
    ocrHtmlUrl = getFullUrl(apiBase, ocrPath);
  }

  const downloadProxyUrl = ocrHtmlUrl
    ? `/api/image-proxy?url=${encodeURIComponent(ocrHtmlUrl)}`
    : "";

  const status = doc.status.toLowerCase();
  const { bg: stBg, fg: stFg, Icon: StatusIcon } = statusMeta(doc.status);

  // ── FIX: Fetch PDF via proxy → convert to blob URL so iframe renders inline ──
  // Previously the iframe pointed directly at fullFileUrl, which caused the server's
  // Content-Disposition: attachment header to trigger a browser download instead of
  // rendering the PDF inline. By fetching through the proxy and creating a same-origin
  // blob URL, the browser always renders it in the iframe regardless of server headers.
  useEffect(() => {
    if (!isPdf || !proxyFileUrl) return;

    let objectUrl: string | null = null;

    setPdfLoading(true);
    setPdfError(null);
    setPdfBlobUrl(null);

    fetch(proxyFileUrl, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
        return res.blob();
      })
      .then((blob) => {
        // Explicitly set MIME type so the browser treats it as PDF, not a download
        const pdfBlob = new Blob([blob], { type: "application/pdf" });
        objectUrl = URL.createObjectURL(pdfBlob);
        setPdfBlobUrl(objectUrl);
      })
      .catch((err: any) => {
        setPdfError(err.message || "Could not load PDF.");
      })
      .finally(() => {
        setPdfLoading(false);
      });

    return () => {
      // Revoke the blob URL on unmount / doc change to free memory
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [isPdf, proxyFileUrl]);

  const handleDownloadOCR = async () => {
    if (!ocrHtmlUrl || !downloadProxyUrl) return;

    const downloadBtn = document.getElementById("ocr-download-btn") as HTMLButtonElement | null;
    const originalHTML = downloadBtn?.innerHTML || "";

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
      const res = await fetch(downloadProxyUrl, { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

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
      alert(`Could not download the OCR file.\n\nError: ${err.message}`);
    } finally {
      if (downloadBtn) {
        downloadBtn.style.pointerEvents = "auto";
        downloadBtn.innerHTML = originalHTML;
      }
    }
  };

  return (
    <>
      {resubmitOpen && (
        <ResubmitModal
          doc={doc}
          apiBase={apiBase}
          onClose={() => setResubmitOpen(false)}
        />
      )}

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
          {/* ── PDF states ── */}
          {isPdf && pdfLoading && (
            <Placeholder
              icon={<Loader2 size={32} style={{ color: "#93c5fd" }} className="animate-spin" />}
              title="Loading PDF…"
              sub="Fetching document, please wait."
            />
          )}
          {isPdf && !pdfLoading && pdfError && (
            <Placeholder
              icon={<AlertCircle size={32} style={{ color: "#f87171" }} />}
              title="Could not load PDF"
              sub={pdfError}
            />
          )}
          {isPdf && !pdfLoading && !pdfError && pdfBlobUrl && (
            <iframe
              src={`${pdfBlobUrl}#toolbar=0&navpanes=0&scrollbar=1`}
              title={doc.file_name}
              style={{ flex: 1, width: "100%", border: "none", display: "block" }}
            />
          )}

          {/* ── Image preview ── */}
          {isImg && imageSrc && (
            <div style={{ flex: 1, overflow: "auto", padding: 24, display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
              <img
                src={imageSrc}
                alt={doc.file_name}
                style={{ maxWidth: "100%", borderRadius: 10, boxShadow: "0 4px 32px rgba(0,0,0,0.5)" }}
              />
            </div>
          )}

          {/* ── No preview fallback ── */}
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

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

              {/* Download button */}
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

              {/* Resubmit button — Premium only */}
              {userTier === "Premium" && status === "completed" && (
                <button
                  onClick={() => setResubmitOpen(true)}
                  title="Resubmit for OCR reprocessing"
                  style={{
                    all: "unset",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: "rgba(234,179,8,0.12)",
                    color: "#fde047",
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "4px 14px",
                    borderRadius: 9999,
                    cursor: "pointer",
                    transition: "background-color 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(234,179,8,0.22)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(234,179,8,0.12)";
                  }}
                >
                  <RotateCcw size={14} />
                  Resubmit
                </button>
              )}

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
    </>
  );
}

/* ═══════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════ */
export default function CollectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Doc | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState<{ name?: string; email: string; photo?: string; tier?: string } | null>(null);

  /*const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";*/
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://10-4-16-36.nip.io:8003";

  useEffect(() => {
    fetch(`${API_BASE}/auth/me`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Not authenticated");
        return res.json();
      })
      .then((data) => setUser(data))
      .catch(() => router.push("/printed"));
  }, [API_BASE]);

  const onLogout = async () => {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    router.push("/printed");
  };

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
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .sk {
          background: linear-gradient(90deg,#1e293b 25%,#263347 50%,#1e293b 75%);
          background-size: 500px 100%;
          animation: shimmer 1.6s infinite linear;
        }
        textarea::placeholder { color: #334155; }
        textarea:focus { outline: none; }
      `}</style>

      <Header user={user} onLogout={onLogout} />

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
              <DocumentViewer
                key={selected.document_id}
                doc={selected}
                apiBase={API_BASE}
                userTier={user?.tier}
              />
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