"use client";
import React, {
  useEffect, useState, useRef, useCallback, useMemo,
} from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FileText, Clock, CheckCircle, Loader2, AlertCircle, ChevronRight,
  PanelLeftClose, PanelLeftOpen, FileSearch, FileSpreadsheet,
  FileType, Download, RotateCcw, X, Copy, Check, ChevronLeft,
  ChevronRight as ChevronRightIcon, Bell, FileJson, Trash2,
  Plus, Search, ZoomIn, ZoomOut, Hand,
} from "lucide-react";
import Header from "../../components/Header";
import { BASE_URL } from "@/config/api";

// ← Extracted component
import AddFilesModal from "./AddFilesModal";

/* ─────────────── TYPES ─────────────── */
type Doc = {
  document_id:   number;
  file_name:     string;
  file_path:     string;
  file_type:     string;
  file_size:     number;
  ocr_url:       string;
  status:        string;
  version_count: number;
  created_at:    string;
};

type BBox        = { x: number; y: number; w: number; h: number };
type OcrLine     = { text: string; bbox: BBox };
type OcrPage     = { page_number: number; width: number; height: number; layout_lines: OcrLine[] };
type OcrDocument = { [pageKey: string]: OcrPage };

type SelectionRect = { x: number; y: number; w: number; h: number };
type Tooltip       = { x: number; y: number; text: string };

type ToastType = "success" | "error" | "info";
type Toast = { id: number; type: ToastType; title: string; message: string };

/* ─────────────── CONSTANTS ─────────────── */
const SIDEBAR_W  = 280;
const IMAGE_EXTS = new Set(["jpg","jpeg","png","gif","webp","bmp","tiff","svg","avif"]);
const PDF_EXTS   = new Set(["pdf"]);
const REASON_MAX = 1000;

// ── Resubmitted badge — neon/electric blue (previous blue-500 blended into the dark UI) ──
const RESUBMIT_BLUE        = "#00c2ff";   // electric / neon cyan-blue
const RESUBMIT_BLUE_BG     = "rgba(0,194,255,0.16)";
const RESUBMIT_BLUE_BORDER = "rgba(0,194,255,0.55)";

// ── Zoom (Ctrl + scroll) constants — shared by the image and PDF viewers ──
// Linear zoom: each wheel "tick" nudges the zoom level by a small, constant
// amount rather than multiplying the current zoom (which used to cause huge
// jumps — a small scroll could rocket straight to 400%). Now the zoom level
// changes by the same fixed step regardless of current zoom, so it feels
// smooth and predictable at any zoom level.
const ZOOM_MIN         = 0.5;
const ZOOM_MAX         = 4;
const LINEAR_ZOOM_STEP = 0.0012; // zoom-level change per wheel-delta unit (linear, not multiplicative)
const ZOOM_BUTTON_STEP = 0.2;    // zoom-level change per +/- button click

/* ─────────────── HELPERS ────────────── */
function ext(doc: Doc) { return (doc.file_type ?? "").toLowerCase().trim(); }
function fmtSize(bytes: number) {
  if (!bytes) return null;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024)      return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}
function statusMeta(s: string) {
  switch (s.toLowerCase()) {
    case "queued":     return { bg:"rgba(234,179,8,0.18)",   fg:"#fde047", Icon:Clock };
    case "processing": return { bg:"rgba(59,130,246,0.18)",  fg:"#93c5fd", Icon:Loader2 };
    case "completed":  return { bg:"rgba(34,197,94,0.18)",   fg:"#86efac", Icon:CheckCircle };
    case "failed":     return { bg:"rgba(239,68,68,0.18)",   fg:"#f87171", Icon:AlertCircle };
    default:           return { bg:"rgba(107,114,128,0.18)", fg:"#d1d5db", Icon:AlertCircle };
  }
}
function buildUrl(base: string, path: string) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}
function px(url: string) {
  return url ? `/api/image-proxy?url=${encodeURIComponent(url)}` : "";
}
function clampZoom(z: number) { return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z)); }

/* ─────────────── ZOOM HUD ─────────────── */
// Small floating control shown bottom-right of a viewer, displays current
// zoom % and offers +/- and reset buttons. Purely visual — actual zoom
// state lives in the parent renderer.
const ZoomHud = React.memo(function ZoomHud({
  zoom, onZoomIn, onZoomOut, onReset,
}: { zoom: number; onZoomIn: () => void; onZoomOut: () => void; onReset: () => void }) {
  const pct = Math.round(zoom * 100);
  const btnStyle: React.CSSProperties = {
    all:"unset", display:"flex", alignItems:"center", justifyContent:"center",
    width:24, height:24, borderRadius:6, cursor:"pointer", color:"#94a3b8",
    transition:"all 0.12s",
  };
  return (
    <div style={{
      position:"sticky", bottom:14, alignSelf:"flex-end", marginRight:14, marginTop:-40,
      zIndex:20, display:"flex", alignItems:"center", gap:2,
      backgroundColor:"rgba(13,22,38,0.92)", border:"1px solid #1e293b", borderRadius:9999,
      padding:"4px 6px", boxShadow:"0 8px 24px rgba(0,0,0,0.5)", backdropFilter:"blur(10px)",
    }}>
      <button onClick={onZoomOut} title="Zoom out" style={btnStyle}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(99,102,241,0.15)"; (e.currentTarget as HTMLElement).style.color = "#818cf8"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLElement).style.color = "#94a3b8"; }}
      ><ZoomOut size={13}/></button>
      <button onClick={onReset} title="Reset zoom" style={{
        all:"unset", fontSize:11, fontWeight:700, color:"#94a3b8", padding:"0 6px",
        cursor:"pointer", minWidth:38, textAlign:"center" }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#e2e8f0"}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#94a3b8"}
      >{pct}%</button>
      <button onClick={onZoomIn} title="Zoom in" style={btnStyle}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(99,102,241,0.15)"; (e.currentTarget as HTMLElement).style.color = "#818cf8"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLElement).style.color = "#94a3b8"; }}
      ><ZoomIn size={13}/></button>
    </div>
  );
});

/* ─────────────── HAND TOOL HUD ─────────────── */
// Tiny pill indicator shown when hand/pan mode is active, so the user knows
// why their cursor turned into a hand and how to get back to normal.
const HandModeHud = React.memo(function HandModeHud() {
  return (
    <div style={{
      position:"absolute", top:14, left:14, zIndex:20,
      display:"flex", alignItems:"center", gap:6,
      backgroundColor:"rgba(13,22,38,0.92)", border:"1px solid rgba(99,102,241,0.35)",
      borderRadius:9999, padding:"6px 12px", boxShadow:"0 8px 24px rgba(0,0,0,0.5)",
      backdropFilter:"blur(10px)", pointerEvents:"none",
    }}>
      <Hand size={12} style={{ color:"#818cf8" }}/>
      <span style={{ fontSize:11, fontWeight:600, color:"#a5b4fc" }}>
        Hand tool — drag to pan, click to exit
      </span>
    </div>
  );
});

/* ─────────────── TOAST SYSTEM ─────────── */
let toastIdCounter = 0;

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  const toastMeta: Record<ToastType, { bg:string; border:string; icon:string; iconEl:React.ReactNode }> = {
    success: { bg:"rgba(6,11,20,0.97)", border:"rgba(34,197,94,0.35)",  icon:"rgba(34,197,94,0.15)",  iconEl:<CheckCircle size={16} style={{ color:"#86efac" }}/> },
    error:   { bg:"rgba(6,11,20,0.97)", border:"rgba(239,68,68,0.35)",  icon:"rgba(239,68,68,0.15)",  iconEl:<AlertCircle size={16} style={{ color:"#f87171" }}/> },
    info:    { bg:"rgba(6,11,20,0.97)", border:"rgba(99,102,241,0.35)", icon:"rgba(99,102,241,0.15)", iconEl:<Bell size={16} style={{ color:"#a5b4fc" }}/> },
  };
  return (
    <div style={{ position:"fixed", bottom:24, right:24, zIndex:9999, display:"flex",
      flexDirection:"column", gap:10, pointerEvents:"none" }}>
      {toasts.map(toast => {
        const m = toastMeta[toast.type];
        return (
          <div key={toast.id} style={{ pointerEvents:"all", display:"flex", alignItems:"flex-start",
            gap:12, backgroundColor:m.bg, border:`1px solid ${m.border}`, borderRadius:12,
            padding:"14px 16px", minWidth:320, maxWidth:420,
            boxShadow:"0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)",
            backdropFilter:"blur(16px)", animation:"toastIn 0.22s cubic-bezier(0.34,1.56,0.64,1)" }}>
            <div style={{ width:32, height:32, borderRadius:8, backgroundColor:m.icon,
              display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{m.iconEl}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:13, fontWeight:700, color:"#e2e8f0", margin:"0 0 3px", lineHeight:1.3 }}>{toast.title}</p>
              <p style={{ fontSize:12, color:"#64748b", margin:0, lineHeight:1.5 }}>{toast.message}</p>
            </div>
            <button onClick={() => onDismiss(toast.id)} style={{ all:"unset", width:22, height:22,
              borderRadius:5, display:"flex", alignItems:"center", justifyContent:"center",
              cursor:"pointer", color:"#64748b", flexShrink:0, transition:"all 0.12s" }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.backgroundColor="rgba(239,68,68,0.1)"; el.style.color="#f87171"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.backgroundColor="transparent"; el.style.color="#64748b"; }}
            ><X size={12}/></button>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────── DELETE CONFIRM MODAL ─────────── */
const DeleteConfirmModal = React.memo(function DeleteConfirmModal({
  doc, apiBase, collectionId, onClose, onSuccess, onError,
}: {
  doc: Doc;
  apiBase: string;
  collectionId: string;
  onClose: () => void;
  onSuccess: (docId: number, fileName: string) => void;
  onError: (message: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(
        `${apiBase}/collection/${collectionId}/document/${doc.document_id}`,
        { method: "DELETE", credentials: "include" }
      );
      if (res.status === 204) {
        onSuccess(doc.document_id, doc.file_name);
        return;
      }
      const d = await res.json().catch(() => ({}));
      throw new Error(d.detail || `HTTP ${res.status}`);
    } catch (err: any) {
      const msg = err.message || "Failed to delete document.";
      setDeleteError(msg);
      onError(msg);
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{
      position:"fixed", inset:0, zIndex:1000, backgroundColor:"rgba(0,0,0,0.65)",
      backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center",
      padding:20, animation:"fadeIn 0.15s ease" }}>
      <div style={{ width:"100%", maxWidth:440, backgroundColor:"#0d1626", borderRadius:14,
        border:"1px solid #1e293b", boxShadow:"0 24px 64px rgba(0,0,0,0.6)",
        overflow:"hidden", animation:"slideUp 0.18s ease" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"16px 20px", borderBottom:"1px solid #1e293b" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:8, backgroundColor:"rgba(239,68,68,0.12)",
              display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Trash2 size={15} style={{ color:"#f87171" }}/>
            </div>
            <div>
              <p style={{ fontSize:13, fontWeight:700, color:"#e2e8f0", margin:0 }}>Delete Document</p>
              <p style={{ fontSize:11, color:"#94a3b8", margin:"2px 0 0", maxWidth:280,
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{doc.file_name}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ all:"unset", width:28, height:28, borderRadius:6,
            display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#94a3b8" }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.backgroundColor="rgba(239,68,68,0.1)"; el.style.color="#f87171"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.backgroundColor="transparent"; el.style.color="#94a3b8"; }}
          ><X size={15}/></button>
        </div>
        <div style={{ padding:"20px 20px 24px" }}>
          {deleteError && (
            <div style={{ display:"flex", alignItems:"flex-start", gap:10,
              backgroundColor:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)",
              borderRadius:10, padding:"12px 14px", marginBottom:16 }}>
              <AlertCircle size={16} style={{ color:"#f87171", flexShrink:0, marginTop:1 }}/>
              <p style={{ fontSize:13, color:"#fca5a5", margin:0 }}>{deleteError}</p>
            </div>
          )}
          <div style={{ display:"flex", alignItems:"flex-start", gap:12,
            backgroundColor:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.18)",
            borderRadius:10, padding:"14px 16px", marginBottom:20 }}>
            <AlertCircle size={16} style={{ color:"#f87171", flexShrink:0, marginTop:1 }}/>
            <div>
              <p style={{ fontSize:13, fontWeight:600, color:"#fca5a5", margin:"0 0 4px" }}>
                This action cannot be undone
              </p>
              <p style={{ fontSize:12, color:"#64748b", margin:0, lineHeight:1.6 }}>
                The document and all its associated OCR data will be permanently removed from this collection.
              </p>
            </div>
          </div>
          <p style={{ fontSize:13, color:"#94a3b8", margin:"0 0 20px", lineHeight:1.6 }}>
            Are you sure you want to delete{" "}
            <span style={{ color:"#e2e8f0", fontWeight:600 }}>{doc.file_name}</span>?
          </p>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={onClose} disabled={deleting} style={{
              all:"unset", flex:1, display:"flex", alignItems:"center", justifyContent:"center",
              backgroundColor:"rgba(255,255,255,0.04)", color:"#94a3b8",
              fontSize:13, fontWeight:600, padding:"10px 20px", borderRadius:10,
              cursor: deleting ? "not-allowed" : "pointer",
              border:"1.5px solid #1e293b", transition:"all 0.12s",
              opacity: deleting ? 0.5 : 1 }}
              onMouseEnter={e => { if (!deleting) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.08)"; }}
              onMouseLeave={e => { if (!deleting) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.04)"; }}
            >Cancel</button>
            <button onClick={handleDelete} disabled={deleting} style={{
              all:"unset", flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8,
              backgroundColor: deleting ? "rgba(239,68,68,0.05)" : "rgba(239,68,68,0.16)",
              color: deleting ? "#4b1c1c" : "#f87171",
              fontSize:13, fontWeight:700, padding:"10px 20px", borderRadius:10,
              cursor: deleting ? "not-allowed" : "pointer",
              border:`1.5px solid ${deleting ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.3)"}`,
              transition:"all 0.12s" }}
              onMouseEnter={e => { if (!deleting) { const el = e.currentTarget as HTMLElement; el.style.backgroundColor = "rgba(239,68,68,0.26)"; el.style.borderColor = "rgba(239,68,68,0.5)"; } }}
              onMouseLeave={e => { if (!deleting) { const el = e.currentTarget as HTMLElement; el.style.backgroundColor = "rgba(239,68,68,0.16)"; el.style.borderColor = "rgba(239,68,68,0.3)"; } }}
            >
              {deleting
                ? <><Loader2 size={14} className="animate-spin"/> Deleting…</>
                : <><Trash2 size={14}/> Delete Document</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

/* ─────────────── RESUBMIT MODAL ────── */
const ResubmitModal = React.memo(function ResubmitModal({
  doc, apiBase, onClose, onSuccess,
}: { doc: Doc; apiBase: string; onClose: () => void; onSuccess: () => void }) {
  const [reason,        setReason]        = useState("");
  const [submitting,    setSubmitting]    = useState(false);
  const [submitError,   setSubmitError]   = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const remaining   = REASON_MAX - reason.length;
  const isOverLimit = remaining < 0;
  const isEmpty     = reason.trim().length === 0;

  async function handleResubmit() {
    if (isEmpty || isOverLimit || submitting) return;
    setSubmitting(true); setSubmitError(null);
    try {
      const p = new URLSearchParams({ document_id: String(doc.document_id), user_reason: reason.trim() });
      const res = await fetch(`${apiBase}/review-tasks?${p}`, { method:"POST", credentials:"include" });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || `HTTP ${res.status}`); }
      setSubmitSuccess(true);
      setTimeout(onSuccess, 1500);
    } catch (err: any) { setSubmitError(err.message || "Something went wrong."); }
    finally             { setSubmitting(false); }
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{
      position:"fixed", inset:0, zIndex:1000, backgroundColor:"rgba(0,0,0,0.65)",
      backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center",
      padding:20, animation:"fadeIn 0.15s ease" }}>
      <div style={{ width:"100%", maxWidth:480, backgroundColor:"#0d1626", borderRadius:14,
        border:"1px solid #1e293b", boxShadow:"0 24px 64px rgba(0,0,0,0.6)",
        overflow:"hidden", animation:"slideUp 0.18s ease" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"16px 20px", borderBottom:"1px solid #1e293b" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:8, backgroundColor:"rgba(234,179,8,0.12)",
              display:"flex", alignItems:"center", justifyContent:"center" }}>
              <RotateCcw size={15} style={{ color:"#fde047" }}/>
            </div>
            <div>
              <p style={{ fontSize:13, fontWeight:700, color:"#e2e8f0", margin:0 }}>Resubmit for OCR</p>
              <p style={{ fontSize:11, color:"#94a3b8", margin:"2px 0 0", maxWidth:300,
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{doc.file_name}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ all:"unset", width:28, height:28, borderRadius:6,
            display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#94a3b8" }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.backgroundColor="rgba(239,68,68,0.1)"; el.style.color="#f87171"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.backgroundColor="transparent"; el.style.color="#94a3b8"; }}
          ><X size={15}/></button>
        </div>
        <div style={{ padding:"20px 20px 24px" }}>
          {submitSuccess && (
            <div style={{ display:"flex", alignItems:"center", gap:10, backgroundColor:"rgba(34,197,94,0.1)",
              border:"1px solid rgba(34,197,94,0.25)", borderRadius:10, padding:"12px 14px", marginBottom:16 }}>
              <CheckCircle size={16} style={{ color:"#86efac" }}/>
              <p style={{ fontSize:13, color:"#86efac", margin:0, fontWeight:600 }}>Resubmitted successfully!</p>
            </div>
          )}
          {submitError && (
            <div style={{ display:"flex", alignItems:"flex-start", gap:10, backgroundColor:"rgba(239,68,68,0.1)",
              border:"1px solid rgba(239,68,68,0.25)", borderRadius:10, padding:"12px 14px", marginBottom:16 }}>
              <AlertCircle size={16} style={{ color:"#f87171", flexShrink:0, marginTop:1 }}/>
              <p style={{ fontSize:13, color:"#fca5a5", margin:0 }}>{submitError}</p>
            </div>
          )}
          <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#94a3b8", marginBottom:8 }}>
            Reason for resubmission <span style={{ color:"#f87171" }}>*</span>
          </label>
          <textarea value={reason}
            onChange={e => { setReason(e.target.value); if (submitError) setSubmitError(null); }}
            disabled={submitting || submitSuccess}
            placeholder="Describe what was wrong with the OCR output…" rows={5}
            style={{ width:"100%", resize:"vertical", backgroundColor:"#060b14",
              border:`1.5px solid ${isOverLimit ? "rgba(239,68,68,0.5)" : "#1e293b"}`,
              borderRadius:10, color:"#e2e8f0", fontSize:13, lineHeight:1.6,
              padding:"12px 14px", outline:"none", fontFamily:"'DM Sans','Segoe UI',sans-serif",
              boxSizing:"border-box", minHeight:120, opacity:submitting || submitSuccess ? 0.5 : 1 }}
          />
          <div style={{ display:"flex", justifyContent:"flex-end", marginTop:6 }}>
            <span style={{ fontSize:11, fontWeight:500,
              color: isOverLimit ? "#f87171" : remaining <= 100 ? "#fde047" : "#64748b" }}>
              {remaining < 0 ? `${Math.abs(remaining)} over limit` : `${remaining} characters remaining`}
            </span>
          </div>
          <button onClick={handleResubmit} disabled={isEmpty || isOverLimit || submitting || submitSuccess}
            style={{ all:"unset", marginTop:16, width:"100%", boxSizing:"border-box",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
              backgroundColor: isEmpty || isOverLimit || submitting || submitSuccess ? "rgba(234,179,8,0.05)" : "rgba(234,179,8,0.14)",
              color:           isEmpty || isOverLimit || submitting || submitSuccess ? "#4b4416" : "#fde047",
              fontSize:13, fontWeight:700, padding:"11px 20px", borderRadius:10,
              cursor: isEmpty || isOverLimit || submitting || submitSuccess ? "not-allowed" : "pointer",
              border:`1.5px solid ${isEmpty || isOverLimit || submitting || submitSuccess ? "rgba(234,179,8,0.08)" : "rgba(234,179,8,0.2)"}` }}>
            {submitting
              ? <><Loader2 size={14} className="animate-spin"/>Submitting…</>
              : <><RotateCcw size={14}/>Resubmit to OCR</>}
          </button>
          <p style={{ fontSize:11, color:"#64748b", textAlign:"center", marginTop:10, marginBottom:0 }}>
            The document will be re-queued and processed again.
          </p>
        </div>
      </div>
    </div>
  );
});

/* ─────────────── RESUBMITTED — circular icon badge with hover tooltip ─────────────── */
const ResubmittedBadge = React.memo(function ResubmittedBadge({
  size = 20, iconSize = 11,
}: { size?: number; iconSize?: number }) {
  const [hovered, setHovered]   = useState(false);
  const [coords, setCoords]     = useState<{ x: number; y: number } | null>(null);
  const iconRef = useRef<HTMLDivElement>(null);

  const handleEnter = useCallback(() => {
    const r = iconRef.current?.getBoundingClientRect();
    if (r) setCoords({ x: r.left + r.width / 2, y: r.top });
    setHovered(true);
  }, []);
  const handleLeave = useCallback(() => setHovered(false), []);

  return (
    <>
      <div
        ref={iconRef}
        role="img"
        aria-label="Resubmitted for OCR"
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        style={{
          width:size, height:size, borderRadius:"50%",
          display:"flex", alignItems:"center", justifyContent:"center",
          backgroundColor: RESUBMIT_BLUE_BG,
          border:`1px solid ${RESUBMIT_BLUE_BORDER}`,
          flexShrink:0, cursor:"default",
          animation:"resubmittedIn 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        <RotateCcw size={iconSize} style={{ color:RESUBMIT_BLUE }}/>
      </div>

      {hovered && coords && (
        <div style={{
          position:"fixed", left:coords.x, top:coords.y - 10,
          transform:"translate(-50%, -100%)", zIndex:9999, pointerEvents:"none",
          backgroundColor:"#0d1626", border:`1px solid ${RESUBMIT_BLUE_BORDER}`, borderRadius:8,
          padding:"7px 11px", whiteSpace:"nowrap",
          boxShadow:"0 8px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
          animation:"slideUp 0.12s ease",
        }}>
          <span style={{ fontSize:11, fontWeight:600, color:"#e2e8f0" }}>
            Submitted for reprocessing, update will be available soon.
          </span>
          <div style={{
            position:"absolute", top:"100%", left:"50%", transform:"translateX(-50%)",
            width:0, height:0, borderLeft:"5px solid transparent", borderRight:"5px solid transparent",
            borderTop:`5px solid ${RESUBMIT_BLUE_BORDER}`,
          }}/>
        </div>
      )}
    </>
  );
});

/* ─────────────── SIDEBAR FILE TILE ─── */
const FileTile = React.memo(function FileTile({ doc, isActive, onClick, apiBase, isResubmitted }: {
  doc: Doc; isActive: boolean; onClick: () => void; apiBase: string; isResubmitted?: boolean;
}) {
  const [imgErr, setImgErr] = useState(false);
  const e     = ext(doc);
  const isImg = IMAGE_EXTS.has(e) && !!doc.file_path;
  const { bg:stBg, fg:stFg, Icon:StatusIcon } = statusMeta(doc.status);
  const thumbSrc = isImg ? px(buildUrl(apiBase, doc.file_path)) : "";

  const typeTheme: Record<string, { bg:string; accent:string; Icon:React.ElementType }> = {
    pdf:  { bg:"rgba(239,68,68,0.1)",    accent:"#f87171", Icon:FileText },
    docx: { bg:"rgba(59,130,246,0.1)",   accent:"#60a5fa", Icon:FileText },
    doc:  { bg:"rgba(59,130,246,0.1)",   accent:"#60a5fa", Icon:FileText },
    xlsx: { bg:"rgba(34,197,94,0.1)",    accent:"#4ade80", Icon:FileSpreadsheet },
    xls:  { bg:"rgba(34,197,94,0.1)",    accent:"#4ade80", Icon:FileSpreadsheet },
    csv:  { bg:"rgba(34,197,94,0.1)",    accent:"#4ade80", Icon:FileSpreadsheet },
    txt:  { bg:"rgba(148,163,184,0.08)", accent:"#94a3b8", Icon:FileType },
    json: { bg:"rgba(251,191,36,0.1)",   accent:"#fbbf24", Icon:FileJson },
    xml:  { bg:"rgba(251,191,36,0.1)",   accent:"#fbbf24", Icon:FileJson },
  };
  const theme = typeTheme[e] ?? { bg:"rgba(99,102,241,0.1)", accent:"#818cf8", Icon:FileText };

  return (
    <button onClick={onClick} style={{
      all:"unset", display:"flex", flexDirection:"column", width:"100%", borderRadius:10,
      overflow:"hidden", border:`1.5px solid ${isActive ? "rgba(99,102,241,0.6)" : "#1e293b"}`,
      cursor:"pointer", marginBottom:10,
      boxShadow: isActive ? "0 0 0 3px rgba(99,102,241,0.12)" : "none",
      transition:"border-color 0.15s, box-shadow 0.15s" }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = "rgba(99,102,241,0.35)"; }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = "#1e293b"; }}
    >
      {/* Thumbnail */}
      <div style={{ position:"relative", width:"100%", height:100, overflow:"hidden", flexShrink:0,
        backgroundColor: isImg ? "#000" : theme.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
        {isImg && !imgErr && thumbSrc
          ? <img src={thumbSrc} alt={doc.file_name} onError={() => setImgErr(true)}
              style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
          : <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
              <theme.Icon size={28} style={{ color:theme.accent, opacity:0.9 }}/>
              <span style={{ fontSize:10, fontWeight:700, letterSpacing:"0.1em",
                color:theme.accent, fontFamily:"monospace", opacity:0.8 }}>
                {e ? `.${e.toUpperCase()}` : "FILE"}
              </span>
            </div>
        }
        {isActive && <div style={{ position:"absolute", inset:0, background:"rgba(99,102,241,0.18)", zIndex:2, pointerEvents:"none" }}/>}
      </div>

      {/* Footer */}
      <div style={{ padding:"8px 10px",
        backgroundColor: isActive ? "rgba(99,102,241,0.1)" : "#0c1424",
        borderTop:`1px solid ${isActive ? "rgba(99,102,241,0.25)" : "#1e293b"}` }}>
        <p style={{ fontSize:12, fontWeight:600, color: isActive ? "#e2e8f0" : "#94a3b8",
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", margin:0 }}>{doc.file_name}</p>
        <p style={{ fontSize:10, color:"#64748b", margin:"3px 0 6px" }}>
          {e ? e.toUpperCase() : "—"}{fmtSize(doc.file_size) ? ` · ${fmtSize(doc.file_size)}` : ""}
        </p>

        {/* Status row: status pill + (resubmitted badge OR recomputed tag) sit side by side, as separate elements */}
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{
            display:"flex", alignItems:"center", gap:5,
            backgroundColor: stBg,
            borderRadius:6,
            padding:"4px 8px",
            border:`1px solid ${stFg}33`,
          }}>
            <StatusIcon
              size={11}
              style={{ color:stFg, flexShrink:0 }}
              className={doc.status.toLowerCase() === "processing" ? "animate-spin" : ""}
            />
            <span style={{ fontSize:11, fontWeight:700, color:stFg, letterSpacing:"0.03em" }}>
              {doc.status.charAt(0).toUpperCase() + doc.status.slice(1).toLowerCase()}
            </span>
          </div>

          {/* ── Resubmitted circular icon badge — sits OUTSIDE the status pill, to its right ── */}
          {isResubmitted && (
            <div style={{ marginLeft:"auto" }}>
              <ResubmittedBadge size={20} iconSize={11}/>
            </div>
          )}
          {!isResubmitted && doc.version_count > 0 && (
            <span style={{
              marginLeft:"auto", display:"inline-flex", alignItems:"center", gap:3,
              backgroundColor:"rgba(168,85,247,0.18)", color:"#c084fc",
              fontSize:9, fontWeight:700, padding:"1px 6px", borderRadius:9999,
              border:"1px solid rgba(168,85,247,0.3)", letterSpacing:"0.04em",
            }}>
              <RotateCcw size={8}/> ×{doc.version_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
});

/* ─────────────── SKELETON ───────────── */
function SkeletonTile() {
  return (
    <div style={{ borderRadius:10, border:"1px solid #1e293b", overflow:"hidden", marginBottom:10 }}>
      <div className="sk" style={{ width:"100%", height:100 }}/>
      <div style={{ padding:"8px 10px", backgroundColor:"#0c1424", borderTop:"1px solid #1e293b",
        display:"flex", flexDirection:"column", gap:5 }}>
        <div className="sk" style={{ height:10, width:"70%" }}/>
        <div className="sk" style={{ height:8,  width:"40%" }}/>
        <div className="sk" style={{ height:22, width:"100%", borderRadius:6, marginTop:2 }}/>
      </div>
    </div>
  );
}

/* ─────────────── PLACEHOLDER ─────────── */
function Placeholder({ icon, title, sub }: { icon:React.ReactNode; title:string; sub:string }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      height:"100%", padding:40, textAlign:"center", gap:12 }}>
      {icon}
      <p style={{ fontSize:15, fontWeight:600, color:"#94a3b8", margin:0 }}>{title}</p>
      <p style={{ fontSize:13, color:"#64748b", margin:0, maxWidth:300 }}>{sub}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CANVAS-BASED OCR OVERLAY
═══════════════════════════════════════════════════════════════ */
function OcrOverlay({
  ocrPage, imageScale, canvasWidth, canvasHeight, panMode,
}: {
  ocrPage: OcrPage; imageScale: number; canvasWidth: number; canvasHeight: number; panMode?: boolean;
}) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const rafRef     = useRef<number>(0);

  const isDraggingRef   = useRef(false);
  const dragStartRef    = useRef<{ x: number; y: number } | null>(null);
  const selRectRef      = useRef<SelectionRect | null>(null);
  const selectedRef     = useRef<Set<number>>(new Set());
  const hoveredRef      = useRef<number | null>(null);
  const anchorRef       = useRef<number | null>(null);
  const selectedTextRef = useRef("");

  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const [copied,  setCopied]  = useState(false);

  const spatialIndex = useMemo(() => {
    const BUCKET = 40;
    const map    = new Map<number, number[]>();
    ocrPage.layout_lines.forEach((line, idx) => {
      const b0 = Math.floor(line.bbox.y / BUCKET);
      const b1 = Math.floor((line.bbox.y + line.bbox.h) / BUCKET);
      for (let b = b0; b <= b1; b++) {
        if (!map.has(b)) map.set(b, []);
        map.get(b)!.push(idx);
      }
    });
    return { map, BUCKET };
  }, [ocrPage.layout_lines]);

  const hitTest = useCallback((x: number, y: number): number => {
    const { map, BUCKET } = spatialIndex;
    const candidates = map.get(Math.floor(y / BUCKET)) ?? [];
    for (const idx of candidates) {
      const b = ocrPage.layout_lines[idx].bbox;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return idx;
    }
    return -1;
  }, [spatialIndex, ocrPage.layout_lines]);

  const intersects = useCallback((sel: SelectionRect, idx: number): boolean => {
    const b = ocrPage.layout_lines[idx].bbox;
    return !(sel.x + sel.w < b.x || b.x + b.w < sel.x ||
             sel.y + sel.h < b.y || b.y + b.h < sel.y);
  }, [ocrPage.layout_lines]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    const s     = imageScale;
    const lines = ocrPage.layout_lines;
    selectedRef.current.forEach(idx => {
      const b = lines[idx].bbox;
      ctx.fillStyle   = "rgba(99,102,241,0.28)";
      ctx.strokeStyle = "#818cf8";
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.roundRect(b.x * s, b.y * s, b.w * s, b.h * s, 3);
      ctx.fill(); ctx.stroke();
    });
    const hi = hoveredRef.current;
    if (hi !== null && !selectedRef.current.has(hi)) {
      const b = lines[hi].bbox;
      ctx.fillStyle   = "rgba(99,102,241,0.14)";
      ctx.strokeStyle = "rgba(99,102,241,0.6)";
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.roundRect(b.x * s, b.y * s, b.w * s, b.h * s, 3);
      ctx.fill(); ctx.stroke();
    }
    const sel = selRectRef.current;
    if (isDraggingRef.current && sel && sel.w > 2 && sel.h > 2) {
      ctx.fillStyle   = "rgba(99,102,241,0.18)";
      ctx.strokeStyle = "rgba(99,102,241,0.85)";
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.roundRect(sel.x * s, sel.y * s, sel.w * s, sel.h * s, 4);
      ctx.fill(); ctx.stroke();
    }
  }, [canvasWidth, canvasHeight, imageScale, ocrPage.layout_lines]);

  const scheduleDraw = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
  }, [draw]);

  useEffect(() => { scheduleDraw(); }, [imageScale, canvasWidth, canvasHeight, scheduleDraw]);
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const toImg = useCallback((clientX: number, clientY: number) => {
    if (!overlayRef.current) return { x: 0, y: 0 };
    const r = overlayRef.current.getBoundingClientRect();
    return { x: (clientX - r.left) / imageScale, y: (clientY - r.top) / imageScale };
  }, [imageScale]);

  const showTooltip = useCallback((indices: Set<number>) => {
    if (!overlayRef.current || indices.size === 0) return;
    const sorted = Array.from(indices).sort((a, b) => a - b);
    const text   = sorted.map(i => ocrPage.layout_lines[i].text).join("\n");
    selectedTextRef.current = text;
    selectedRef.current     = indices;
    scheduleDraw();
    const r    = overlayRef.current.getBoundingClientRect();
    const minY = Math.min(...sorted.map(i => ocrPage.layout_lines[i].bbox.y));
    setTooltip({ x: r.left + r.width / 2, y: r.top + minY * imageScale - 56, text });
  }, [ocrPage.layout_lines, imageScale, scheduleDraw]);

  const clearAll = useCallback(() => {
    selectedRef.current     = new Set();
    selRectRef.current      = null;
    anchorRef.current       = null;
    selectedTextRef.current = "";
    setTooltip(null);
    scheduleDraw();
  }, [scheduleDraw]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (panMode) return; // hand tool active — let the click bubble up to the pan handler
    if (e.button !== 0) return;
    e.preventDefault();
    const pos = toImg(e.clientX, e.clientY);
    dragStartRef.current  = pos;
    isDraggingRef.current = true;
    selRectRef.current    = null;
    selectedRef.current   = new Set();
    setTooltip(null);
    setCopied(false);
    scheduleDraw();
  }, [toImg, scheduleDraw, panMode]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (panMode) return;
    const pos = toImg(e.clientX, e.clientY);
    if (isDraggingRef.current && dragStartRef.current) {
      const start = dragStartRef.current;
      selRectRef.current = {
        x: Math.min(start.x, pos.x), y: Math.min(start.y, pos.y),
        w: Math.abs(pos.x - start.x), h: Math.abs(pos.y - start.y),
      };
      const hit = new Set<number>();
      ocrPage.layout_lines.forEach((_, idx) => {
        if (intersects(selRectRef.current!, idx)) hit.add(idx);
      });
      selectedRef.current = hit;
    } else {
      const hi = hitTest(pos.x, pos.y);
      if (hi !== hoveredRef.current) {
        hoveredRef.current = hi >= 0 ? hi : null;
        scheduleDraw();
        return;
      }
    }
    scheduleDraw();
  }, [toImg, ocrPage.layout_lines, hitTest, intersects, scheduleDraw, panMode]);

  const onMouseUp = useCallback((e: React.MouseEvent) => {
    if (panMode) return;
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const sel     = selRectRef.current;
    const isClick = !sel || (sel.w < 4 && sel.h < 4);
    if (isClick) {
      selRectRef.current = null;
      const pos        = toImg(e.clientX, e.clientY);
      const clickedIdx = hitTest(pos.x, pos.y);
      if (clickedIdx < 0) { clearAll(); return; }
      if (e.shiftKey && anchorRef.current !== null) {
        const from = Math.min(anchorRef.current, clickedIdx);
        const to   = Math.max(anchorRef.current, clickedIdx);
        showTooltip(new Set(Array.from({ length: to - from + 1 }, (_, k) => from + k)));
      } else {
        anchorRef.current       = clickedIdx;
        const b                 = ocrPage.layout_lines[clickedIdx].bbox;
        const text              = ocrPage.layout_lines[clickedIdx].text;
        selectedTextRef.current = text;
        selectedRef.current     = new Set([clickedIdx]);
        scheduleDraw();
        if (overlayRef.current) {
          const r = overlayRef.current.getBoundingClientRect();
          setTooltip({ x: r.left + (b.x + b.w / 2) * imageScale, y: r.top + b.y * imageScale - 56, text });
        }
      }
      return;
    }
    selRectRef.current = null;
    if (selectedRef.current.size > 0) { anchorRef.current = null; showTooltip(selectedRef.current); }
    scheduleDraw();
  }, [toImg, hitTest, clearAll, showTooltip, ocrPage.layout_lines, imageScale, scheduleDraw, panMode]);

  const doCopy = useCallback((text: string) => {
    if (!text) return;
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch(() => fbCopy(text, done));
    } else { fbCopy(text, done); }
  }, []);

  function fbCopy(text: string, done: () => void) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
    document.body.appendChild(ta); ta.focus(); ta.select();
    document.execCommand("copy"); document.body.removeChild(ta); done();
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === "c" && selectedTextRef.current) {
        e.preventDefault(); doCopy(selectedTextRef.current);
      }
      if (e.key === "a") {
        e.preventDefault();
        const all  = new Set(ocrPage.layout_lines.map((_, i) => i));
        const text = ocrPage.layout_lines.map(l => l.text).join("\n");
        selectedRef.current     = all;
        selectedTextRef.current = text;
        anchorRef.current       = null;
        scheduleDraw();
        if (overlayRef.current) {
          const r = overlayRef.current.getBoundingClientRect();
          setTooltip({ x: r.left + r.width / 2, y: r.top - 56, text });
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [doCopy, ocrPage.layout_lines, scheduleDraw]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const inOverlay = overlayRef.current?.contains(e.target as Node);
      const inTooltip = tooltipRef.current?.contains(e.target as Node);
      if (!inOverlay && !inTooltip) clearAll();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [clearAll]);

  return (
    <>
      <canvas ref={canvasRef} width={canvasWidth} height={canvasHeight} style={{
        position:"absolute", inset:0, width:canvasWidth, height:canvasHeight, pointerEvents:"none" }}/>
      <div ref={overlayRef} style={{
        position:"absolute", inset:0,
        cursor: panMode ? "inherit" : (hoveredRef.current !== null && !isDraggingRef.current ? "pointer" : "crosshair"),
        pointerEvents: panMode ? "none" : "auto",
        userSelect:"none" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={() => {
          if (isDraggingRef.current) isDraggingRef.current = false;
          if (hoveredRef.current !== null) { hoveredRef.current = null; scheduleDraw(); }
        }}
      />
      {tooltip && (
        <div ref={tooltipRef} style={{
          position:"fixed", zIndex:9999, left:tooltip.x, top:tooltip.y,
          transform:"translateX(-50%)", backgroundColor:"#0d1626",
          border:"1px solid #1e293b", borderRadius:10, padding:"6px 6px",
          display:"flex", alignItems:"center", gap:6,
          boxShadow:"0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
          backdropFilter:"blur(12px)", animation:"slideUp 0.15s ease", maxWidth:320 }}>
          <span style={{ fontSize:12, color:"#64748b", maxWidth:200, whiteSpace:"nowrap",
            overflow:"hidden", textOverflow:"ellipsis", padding:"0 4px" }}>{tooltip.text}</span>
          <button onClick={() => doCopy(selectedTextRef.current)} style={{
            all:"unset", display:"flex", alignItems:"center", gap:5,
            padding:"5px 12px", borderRadius:7,
            backgroundColor: copied ? "rgba(34,197,94,0.15)" : "rgba(99,102,241,0.2)",
            color: copied ? "#86efac" : "#a5b4fc",
            fontSize:12, fontWeight:600, cursor:"pointer", flexShrink:0,
            border:`1px solid ${copied ? "rgba(34,197,94,0.3)" : "rgba(99,102,241,0.35)"}`,
            transition:"all 0.12s" }}>
            {copied ? <><Check size={12}/> Copied</> : <><Copy size={12}/> Copy</>}
          </button>
          <button onClick={clearAll} style={{
            all:"unset", width:24, height:24, borderRadius:5,
            display:"flex", alignItems:"center", justifyContent:"center",
            cursor:"pointer", color:"#94a3b8", flexShrink:0 }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(239,68,68,0.1)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}
          ><X size={13}/></button>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ZOOM HOOK — shared ctrl+scroll zoom behavior (LINEAR)
   Attaches a non-passive wheel listener to `targetRef` so we can
   preventDefault() on ctrl+wheel (otherwise the browser would zoom
   the whole page). Only ctrl/cmd+wheel changes zoom; plain wheel
   scrolling is left completely untouched for normal scrolling.

   IMPORTANT: the zoom level changes by a fixed, linear amount per
   wheel tick (zoom = zoom ± step), NOT a multiplier of the current
   zoom. Multiplicative zoom is what caused a small scroll to rocket
   straight to 400% — this keeps every tick feeling the same size
   regardless of how zoomed in you already are.

   NOTE: targetRef is typed as React.RefObject<HTMLElement | null>
   because useRef<HTMLDivElement>(null) produces a RefObject whose
   `.current` can be null — TypeScript (Next.js 16 / React 19 types)
   will not allow narrowing that to RefObject<HTMLElement> implicitly.
═══════════════════════════════════════════════════════════════ */
function useCtrlWheelZoom(targetRef: React.RefObject<HTMLElement | null>) {
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return; // let normal scroll pass through untouched
      e.preventDefault();
      // Linear step: same size change per wheel tick at any zoom level.
      const delta = -e.deltaY * LINEAR_ZOOM_STEP;
      const next  = clampZoom(zoomRef.current + delta);
      zoomRef.current = next;
      setZoom(next);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetRef.current]);

  const zoomIn  = useCallback(() => setZoom(z => { const n = clampZoom(z + ZOOM_BUTTON_STEP); zoomRef.current = n; return n; }), []);
  const zoomOut = useCallback(() => setZoom(z => { const n = clampZoom(z - ZOOM_BUTTON_STEP); zoomRef.current = n; return n; }), []);
  const reset   = useCallback(() => { zoomRef.current = 1; setZoom(1); }, []);

  return { zoom, zoomIn, zoomOut, reset };
}

/* ═══════════════════════════════════════════════════════════════
   HAND TOOL HOOK — press "H" to enter pan/grab mode.
   While active, dragging inside `targetRef` pans the scrollable
   container by directly updating scrollLeft/scrollTop. A plain
   click (mousedown+mouseup with no real movement) exits hand mode
   and returns to the normal cursor/selection behavior.

   NOTE: targetRef is typed as React.RefObject<HTMLElement | null>
   for the same reason as useCtrlWheelZoom above.
═══════════════════════════════════════════════════════════════ */
function useHandTool(targetRef: React.RefObject<HTMLElement | null>) {
  const [handMode, setHandMode] = useState(false);
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);
  const movedRef    = useRef(false);
  const startRef    = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  // "H" toggles hand mode on. (Typing in an input/textarea is ignored.)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key.toLowerCase() === "h" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setHandMode(true);
      }
      if (e.key === "Escape") setHandMode(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!handMode || e.button !== 0) return;
    const el = targetRef.current;
    if (!el) return;
    e.preventDefault();
    draggingRef.current = true;
    movedRef.current    = false;
    startRef.current = { x: e.clientX, y: e.clientY, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop };
    setDragging(true);
  }, [handMode, targetRef]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!handMode || !draggingRef.current) return;
    const el = targetRef.current;
    if (!el) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) movedRef.current = true;
    el.scrollLeft = startRef.current.scrollLeft - dx;
    el.scrollTop  = startRef.current.scrollTop  - dy;
  }, [handMode, targetRef]);

  const onMouseUp = useCallback(() => {
    if (!handMode) return;
    // A plain click (no real drag) exits hand mode back to the normal cursor.
    if (draggingRef.current && !movedRef.current) setHandMode(false);
    draggingRef.current = false;
    setDragging(false);
  }, [handMode]);

  const onMouseLeave = useCallback(() => {
    draggingRef.current = false;
    setDragging(false);
  }, []);

  return { handMode, dragging, onMouseDown, onMouseMove, onMouseUp, onMouseLeave };
}

/* ═══════════════════════════════════════════════════════════════
   IMAGE RENDERER
═══════════════════════════════════════════════════════════════ */
function ImageRenderer({ src, ocrPage, fileName }: {
  src: string; ocrPage: OcrPage | null; fileName: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageScale, setImageScale] = useState(1);
  const [canvasDims, setCanvasDims] = useState({ w: 0, h: 0 });

  // ── Ctrl + scroll zoom (linear) ──
  const { zoom, zoomIn, zoomOut, reset } = useCtrlWheelZoom(containerRef);
  // ── "H" hand/pan tool ──
  const { handMode, dragging, onMouseDown, onMouseMove, onMouseUp, onMouseLeave } = useHandTool(containerRef);

  const computeScale = useCallback(() => {
    if (!containerRef.current) return;
    const imgEl   = containerRef.current.querySelector("img") as HTMLImageElement | null;
    const nativeW = ocrPage?.width  ?? imgEl?.naturalWidth  ?? 0;
    const nativeH = ocrPage?.height ?? imgEl?.naturalHeight ?? 0;
    if (!nativeW || !nativeH) return;
    const containerW = containerRef.current.clientWidth  - 48;
    const containerH = containerRef.current.clientHeight - 48;
    const scale = Math.min(containerW / nativeW, containerH / nativeH);
    setImageScale(scale);
    setCanvasDims({ w: Math.round(nativeW * scale), h: Math.round(nativeH * scale) });
  }, [ocrPage]);

  useEffect(() => {
    computeScale();
    const ro = new ResizeObserver(computeScale);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [computeScale]);

  const scaledW = ocrPage ? ocrPage.width  * imageScale : undefined;
  const scaledH = ocrPage ? ocrPage.height * imageScale : undefined;

  return (
    <div ref={containerRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      style={{ flex:1, overflow:"auto", backgroundColor:"#060b14",
      display:"flex", flexDirection:"column", alignItems:"center",
      padding:24, boxSizing:"border-box", position:"relative",
      cursor: handMode ? (dragging ? "grabbing" : "grab") : "default" }}>
      {handMode && <HandModeHud/>}
      <div style={{ flex:1, width:"100%", display:"flex", alignItems:"flex-start", justifyContent:"center" }}>
        {/* ── Zoom wrapper: scaling this scales the image + OCR overlay together,
             so hit-testing / selection coordinates stay perfectly aligned ── */}
        <div style={{
          position:"relative", width: scaledW ?? "auto", height: scaledH ?? "auto",
          flexShrink:0, borderRadius:8, overflow:"hidden", boxShadow:"0 4px 40px rgba(0,0,0,0.6)",
          transform:`scale(${zoom})`, transformOrigin:"top center",
          transition: zoom === 1 ? "transform 0.15s ease" : "none",
        }}>
          <img src={src} alt={fileName} onLoad={computeScale}
            style={{ display:"block", width:"100%", height:"100%", objectFit:"contain", userSelect:"none" } as React.CSSProperties}
            draggable={false}/>
          {ocrPage && canvasDims.w > 0 && (
            <OcrOverlay ocrPage={ocrPage} imageScale={imageScale} canvasWidth={canvasDims.w} canvasHeight={canvasDims.h} panMode={handMode}/>
          )}
        </div>
      </div>
      <ZoomHud zoom={zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={reset}/>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PDF RENDERER
═══════════════════════════════════════════════════════════════ */
let pdfjsInstance: any = null;
async function getPdfjs() {
  if (pdfjsInstance) return pdfjsInstance;
  const lib = await import("pdfjs-dist");
  lib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  pdfjsInstance = lib;
  return lib;
}

const MAX_PIXELS  = 800_000;
const MAX_SCALE   = 1.5;
const CACHE_LIMIT = 4;

type LRUNode = {
  key: number; bitmap: ImageBitmap; cssW: number; cssH: number; ocrScale: number;
  prev: LRUNode | null; next: LRUNode | null;
};

class LRUBitmapCache {
  private map  = new Map<number, LRUNode>();
  private head: LRUNode | null = null;
  private tail: LRUNode | null = null;
  constructor(private limit: number) {}
  get(key: number): LRUNode | undefined {
    const node = this.map.get(key);
    if (!node) return undefined;
    this._moveToHead(node);
    return node;
  }
  set(key: number, bitmap: ImageBitmap, cssW: number, cssH: number, ocrScale: number) {
    const existing = this.map.get(key);
    if (existing) {
      try { existing.bitmap.close(); } catch {}
      existing.bitmap = bitmap; existing.cssW = cssW; existing.cssH = cssH; existing.ocrScale = ocrScale;
      this._moveToHead(existing); return;
    }
    const node: LRUNode = { key, bitmap, cssW, cssH, ocrScale, prev: null, next: this.head };
    if (this.head) this.head.prev = node;
    this.head = node;
    if (!this.tail) this.tail = node;
    this.map.set(key, node);
    if (this.map.size > this.limit) this._evict();
  }
  delete(key: number) {
    const node = this.map.get(key);
    if (!node) return;
    try { node.bitmap.close(); } catch {}
    this._unlink(node); this.map.delete(key);
  }
  clear() {
    this.map.forEach(n => { try { n.bitmap.close(); } catch {} });
    this.map.clear(); this.head = this.tail = null;
  }
  has(key: number) { return this.map.has(key); }
  private _evict() {
    if (!this.tail) return;
    const old = this.tail;
    try { old.bitmap.close(); } catch {}
    this._unlink(old); this.map.delete(old.key);
  }
  private _unlink(node: LRUNode) {
    if (node.prev) node.prev.next = node.next; else this.head = node.next;
    if (node.next) node.next.prev = node.prev; else this.tail = node.prev;
    node.prev = node.next = null;
  }
  private _moveToHead(node: LRUNode) {
    if (node === this.head) return;
    this._unlink(node);
    node.next = this.head;
    if (this.head) this.head.prev = node;
    this.head = node;
    if (!this.tail) this.tail = node;
  }
}

async function fetchPdfWithProgress(
  url: string, onProgress: (pct: number) => void, signal: AbortSignal,
): Promise<ArrayBuffer> {
  const res = await fetch(url, { credentials:"include", signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const contentLength = Number(res.headers.get("content-length") ?? "0");
  const reader = res.body!.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value); received += value.byteLength;
    if (contentLength > 0) onProgress(Math.min(99, (received / contentLength) * 100));
  }
  const total  = chunks.reduce((s, c) => s + c.byteLength, 0);
  const result = new Uint8Array(total);
  let offset   = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  onProgress(100);
  return result.buffer;
}

function PdfRenderer({
  blobUrl, ocrPages, onPageChange,
}: { blobUrl: string; ocrPages: OcrPage[]; onPageChange?: (page: number) => void }) {
  const containerRef    = useRef<HTMLDivElement>(null);
  const canvasRef       = useRef<HTMLCanvasElement>(null);
  const offscreenRef    = useRef<HTMLCanvasElement | null>(null);
  const lruCache        = useRef<LRUBitmapCache>(new LRUBitmapCache(CACHE_LIMIT));
  const pdfDocRef       = useRef<any>(null);
  const ocrPagesRef     = useRef(ocrPages);
  const genRef          = useRef(0);
  const activeTaskRef   = useRef<any>(null);
  const pageNumRef      = useRef(1);
  const prevPageRef     = useRef(1);
  const resizeTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ocrPageIndex    = useRef<Map<number, OcrPage>>(new Map());

  const [pageNum,      setPageNum]      = useState(1);
  const [totalPages,   setTotalPages]   = useState(0);
  const [initLoading,  setInitLoading]  = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [rendering,    setRendering]    = useState(false);
  const [renderError,  setRenderError]  = useState<string | null>(null);
  const [overlayInfo,  setOverlayInfo]  = useState<{ scale: number; w: number; h: number } | null>(null);

  // ── Ctrl + scroll zoom (linear) ──
  const { zoom, zoomIn, zoomOut, reset } = useCtrlWheelZoom(containerRef);
  // ── "H" hand/pan tool ──
  const { handMode, dragging, onMouseDown, onMouseMove, onMouseUp, onMouseLeave } = useHandTool(containerRef);

  useEffect(() => {
    ocrPagesRef.current = ocrPages;
    const idx = new Map<number, OcrPage>();
    ocrPages.forEach(p => idx.set(p.page_number, p));
    ocrPageIndex.current = idx;
  }, [ocrPages]);

  const paintBitmap = useCallback((bitmap: ImageBitmap, cssW: number, cssH: number, ocrScale: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = cssW; canvas.height = cssH;
    canvas.style.width = `${cssW}px`; canvas.style.height = `${cssH}px`;
    const ctx = canvas.getContext("2d", { alpha: false })!;
    ctx.drawImage(bitmap, 0, 0, cssW, cssH);
    setOverlayInfo({ scale: ocrScale, w: cssW, h: cssH });
  }, []);

  const cancelActiveTask = useCallback(() => {
    if (activeTaskRef.current) {
      try { activeTaskRef.current.cancel(); } catch {}
      activeTaskRef.current = null;
    }
  }, []);

  const doRender = useCallback(async (num: number) => {
    const doc = pdfDocRef.current;
    if (!doc) return;
    cancelActiveTask();
    genRef.current += 1;
    const myGen = genRef.current;
    setRendering(true); setRenderError(null);

    const cached = lruCache.current.get(num);
    if (cached) {
      paintBitmap(cached.bitmap, cached.cssW, cached.cssH, cached.ocrScale);
      setRendering(false); return;
    }

    try {
      const page = await doc.getPage(num);
      if (myGen !== genRef.current) return;
      const el  = containerRef.current;
      const W   = el && el.clientWidth  > 96 ? el.clientWidth  - 48 : Math.floor(window.innerWidth  * 0.48);
      const H   = el && el.clientHeight > 96 ? el.clientHeight - 48 : Math.floor(window.innerHeight * 0.82);
      const vp0 = page.getViewport({ scale: 1 });
      let scale = Math.min(W / vp0.width, H / vp0.height, MAX_SCALE);
      const rawPx = vp0.width * scale * vp0.height * scale;
      if (rawPx > MAX_PIXELS) scale *= Math.sqrt(MAX_PIXELS / rawPx);
      const cssW = Math.round(vp0.width  * scale);
      const cssH = Math.round(vp0.height * scale);
      const vp   = page.getViewport({ scale });
      if (!offscreenRef.current) offscreenRef.current = document.createElement("canvas");
      const off = offscreenRef.current;
      off.width = cssW; off.height = cssH;
      const ctx = off.getContext("2d", { alpha: false })!;
      ctx.clearRect(0, 0, cssW, cssH);
      await new Promise<void>(resolve => setTimeout(resolve, 0));
      if (myGen !== genRef.current) return;
      const renderTask = page.render({ canvasContext: ctx, viewport: vp, intent: "display" });
      activeTaskRef.current = renderTask;
      await renderTask.promise;
      activeTaskRef.current = null;
      if (myGen !== genRef.current) return;
      const bitmap = await createImageBitmap(off);
      if (myGen !== genRef.current) { try { bitmap.close(); } catch {} return; }
      const pages    = ocrPagesRef.current;
      const idx      = ocrPageIndex.current;
      const ocrPg    = idx.get(num) ?? idx.get(num - 1) ?? pages[0];
      const ocrScale = ocrPg ? cssW / ocrPg.width : scale;
      lruCache.current.set(num, bitmap, cssW, cssH, ocrScale);
      paintBitmap(bitmap, cssW, cssH, ocrScale);
    } catch (err: any) {
      if (myGen === genRef.current &&
          err?.name !== "RenderingCancelledException" &&
          err?.message !== "Rendering cancelled") {
        setRenderError(err?.message ?? "Page render failed");
      }
    } finally {
      if (myGen === genRef.current) setRendering(false);
    }
  }, [paintBitmap, cancelActiveTask]);

  useEffect(() => {
    const controller = new AbortController();
    setInitLoading(true); setLoadProgress(0); setRenderError(null); setOverlayInfo(null);
    cancelActiveTask();
    lruCache.current.clear();
    pdfDocRef.current = null; prevPageRef.current = 1; pageNumRef.current = 1; setPageNum(1);
    reset();

    (async () => {
      try {
        const lib    = await getPdfjs();
        const buffer = await fetchPdfWithProgress(blobUrl, pct => setLoadProgress(pct), controller.signal);
        if (controller.signal.aborted) return;
        const doc = await lib.getDocument({ data: buffer }).promise;
        if (controller.signal.aborted) return;
        pdfDocRef.current = doc; setTotalPages(doc.numPages); setInitLoading(false); doRender(1);
      } catch (err: any) {
        if (!controller.signal.aborted) { setRenderError(err?.message ?? "Failed to load PDF"); setInitLoading(false); }
      }
    })();

    return () => { controller.abort(); cancelActiveTask(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blobUrl]);

  useEffect(() => {
    pageNumRef.current = pageNum;
    onPageChange?.(pageNum);
    if (pageNum === prevPageRef.current) return;
    prevPageRef.current = pageNum;
    doRender(pageNum);
  }, [pageNum, doRender, onPageChange]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
      resizeTimerRef.current = setTimeout(() => {
        const num = pageNumRef.current;
        lruCache.current.delete(num); doRender(num);
      }, 400);
    });
    ro.observe(containerRef.current);
    return () => { ro.disconnect(); if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current); };
  }, [doRender]);

  useEffect(() => {
    return () => { cancelActiveTask(); offscreenRef.current = null; lruCache.current.clear(); };
  }, [cancelActiveTask]);

  const ocrPage = overlayInfo
    ? (ocrPageIndex.current.get(pageNum) ?? ocrPageIndex.current.get(pageNum - 1) ?? ocrPages[0] ?? null)
    : null;

  if (initLoading) return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", gap:16, padding:40 }}>
      <Loader2 size={32} style={{ color:"#818cf8" }} className="animate-spin"/>
      <div style={{ width:240, display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ height:4, borderRadius:9999, backgroundColor:"#1e293b", overflow:"hidden" }}>
          <div style={{ height:"100%", borderRadius:9999, background:"linear-gradient(90deg,#6366f1,#818cf8)",
            width:`${loadProgress}%`, transition:"width 0.2s ease" }}/>
        </div>
        <p style={{ fontSize:12, color:"#94a3b8", margin:0, textAlign:"center" }}>
          {loadProgress < 100 ? `Loading PDF… ${Math.round(loadProgress)}%` : "Rendering…"}
        </p>
      </div>
    </div>
  );

  if (renderError && !rendering) return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12 }}>
      <AlertCircle size={32} style={{ color:"#f87171" }}/>
      <p style={{ fontSize:13, color:"#f87171", margin:0, maxWidth:340, textAlign:"center" }}>{renderError}</p>
    </div>
  );

  return (
    <div ref={containerRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      style={{ flex:1, minHeight:0, overflow:"auto", backgroundColor:"#060b14",
      display:"flex", alignItems:"flex-start", justifyContent:"center",
      padding:24, boxSizing:"border-box", flexDirection:"column", gap:12, position:"relative",
      cursor: handMode ? (dragging ? "grabbing" : "grab") : "default" }}>
      {handMode && <HandModeHud/>}
      {totalPages > 1 && (
        <div style={{ display:"flex", alignItems:"center", gap:8, alignSelf:"center" }}>
          <button disabled={pageNum <= 1} onClick={() => setPageNum(p => p - 1)} style={{
            all:"unset", display:"flex", alignItems:"center", padding:"4px 10px", borderRadius:6,
            cursor: pageNum <= 1 ? "not-allowed" : "pointer",
            backgroundColor:"rgba(99,102,241,0.1)",
            color: pageNum <= 1 ? "#64748b" : "#818cf8",
            border:"1px solid rgba(99,102,241,0.2)", fontSize:12, fontWeight:600 }}>
            <ChevronLeft size={14}/> Prev
          </button>
          <span style={{ fontSize:12, color:"#94a3b8" }}>Page {pageNum} / {totalPages}</span>
          <button disabled={pageNum >= totalPages} onClick={() => setPageNum(p => p + 1)} style={{
            all:"unset", display:"flex", alignItems:"center", padding:"4px 10px", borderRadius:6,
            cursor: pageNum >= totalPages ? "not-allowed" : "pointer",
            backgroundColor:"rgba(99,102,241,0.1)",
            color: pageNum >= totalPages ? "#64748b" : "#818cf8",
            border:"1px solid rgba(99,102,241,0.2)", fontSize:12, fontWeight:600 }}>
            Next <ChevronRightIcon size={14}/>
          </button>
        </div>
      )}
      <div style={{ flex:1, width:"100%", display:"flex", alignItems:"flex-start", justifyContent:"center" }}>
        {/* ── Zoom wrapper: scaling this scales the canvas + OCR overlay together ── */}
        <div style={{
          position:"relative", flexShrink:0, borderRadius:8, overflow:"hidden",
          boxShadow:"0 4px 40px rgba(0,0,0,0.6)",
          width: overlayInfo ? overlayInfo.w : undefined, height: overlayInfo ? overlayInfo.h : undefined,
          minWidth: overlayInfo ? overlayInfo.w : 200, minHeight: overlayInfo ? overlayInfo.h : 200,
          transform:`scale(${zoom})`, transformOrigin:"top center",
          transition: zoom === 1 ? "transform 0.15s ease" : "none",
        }}>
          {rendering && (
            <div style={{ position:"absolute", inset:0, zIndex:10, display:"flex", alignItems:"center",
              justifyContent:"center", backgroundColor:"rgba(6,11,20,0.75)", backdropFilter:"blur(2px)" }}>
              <Loader2 size={28} style={{ color:"#818cf8" }} className="animate-spin"/>
            </div>
          )}
          <canvas ref={canvasRef} style={{ display:"block" }}/>
          {ocrPage && !rendering && overlayInfo && overlayInfo.w > 0 && (
            <OcrOverlay ocrPage={ocrPage} imageScale={overlayInfo.scale} canvasWidth={overlayInfo.w} canvasHeight={overlayInfo.h} panMode={handMode}/>
          )}
        </div>
      </div>
      <ZoomHud zoom={zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={reset}/>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DOCUMENT VIEWER
═══════════════════════════════════════════════════════════════ */
function DocumentViewer({
  doc, apiBase, userTier, collectionId, onRetry, onDelete, onResubmit, isResubmitted,
}: {
  doc: Doc; apiBase: string; userTier?: string; collectionId: string;
  onRetry: (updatedDoc: Doc) => void;
  onDelete: (docId: number, fileName: string) => void;
  onResubmit?: (docId: number) => void;
  isResubmitted?: boolean;
}) {
  const [resubmitOpen,    setResubmitOpen]    = useState(false);
  const [deleteOpen,      setDeleteOpen]      = useState(false);
  const [retrying,        setRetrying]        = useState(false);
  const [retryError,      setRetryError]      = useState<string | null>(null);
  const [retrySuccess,    setRetrySuccess]    = useState(false);

  // ── track whether a resubmit has been submitted this session ──
  // Combined with the `isResubmitted` prop (sourced from the page-level
  // in-review fetch) via OR below, so the tag shows instantly after the
  // modal closes AND correctly persists across a page refresh.
  const [resubmittedThisSession, setResubmittedThisSession] = useState(false);
  const resubmitted = resubmittedThisSession || !!isResubmitted;

  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfError,   setPdfError]   = useState<string | null>(null);

  const [ocrJson,    setOcrJson]    = useState<OcrDocument | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError,   setOcrError]   = useState<string | null>(null);

  const [ocrVersion, setOcrVersion] = useState(0);

  const [copied,         setCopied]         = useState(false);
  const [txtDownloading, setTxtDownloading] = useState(false);
  const [activePdfPage,  setActivePdfPage]  = useState(1);

  // ── NEW: generated-PDF download state ──
  const [pdfDownloading, setPdfDownloading] = useState(false);

  const [deleteErrorMsg, setDeleteErrorMsg] = useState<string | null>(null);

  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const e      = ext(doc);
  const isImg  = IMAGE_EXTS.has(e);
  const isPdf  = PDF_EXTS.has(e);
  const status = doc.status.toLowerCase();
  const { bg:stBg, fg:stFg, Icon:StatusIcon } = statusMeta(doc.status);

  const isDeletable = status !== "queued" && status !== "processing";

  const fileUrl  = buildUrl(apiBase, doc.file_path);
  const filePx   = px(fileUrl);
  const imageSrc = isImg && filePx ? filePx : "";

  const ocrPages: OcrPage[] = useMemo(() =>
    ocrJson ? Object.values(ocrJson).sort((a, b) => a.page_number - b.page_number) : [],
    [ocrJson]
  );

  const ocrPageIndex = useMemo(() => {
    const m = new Map<number, OcrPage>();
    ocrPages.forEach(p => m.set(p.page_number, p));
    return m;
  }, [ocrPages]);

  const ocrPage = ocrPages[0] ?? null;

  // Reset resubmitted state when a different document is selected
  useEffect(() => { setActivePdfPage(1); setResubmittedThisSession(false); }, [doc.document_id]);

  useEffect(() => {
    if (!isPdf || !fileUrl) return;
    setPdfError(null);
    setPdfBlobUrl(`/api/pdf-proxy?url=${encodeURIComponent(fileUrl)}`);
  }, [isPdf, fileUrl]);

  useEffect(() => {
    setOcrJson(null); setOcrError(null);
    if (doc.status.toLowerCase() !== "completed" || !doc.ocr_url) return;
    const ocrPx = px(buildUrl(apiBase, doc.ocr_url));
    let cancelled = false;
    setOcrLoading(true);
    const cacheBuster = ocrVersion > 0 ? ocrVersion : Date.now();
    const fetchUrl = `${ocrPx}&_cb=${cacheBuster}`;
    fetch(fetchUrl, {
      credentials: "include",
      headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" },
    })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(json => { if (!cancelled) setOcrJson(json as OcrDocument); })
      .catch((err: any) => { if (!cancelled) setOcrError(err.message); })
      .finally(() => { if (!cancelled) setOcrLoading(false); });
    return () => { cancelled = true; };
  }, [doc.ocr_url, doc.status, apiBase, ocrVersion]);

  const handleCloseResubmit  = useCallback(() => setResubmitOpen(false), []);
  const handleCloseDelete    = useCallback(() => { setDeleteOpen(false); setDeleteErrorMsg(null); }, []);

  const handleResubmitSuccess = useCallback(() => {
    setResubmitOpen(false);
    setResubmittedThisSession(true); // ← mark as submitted instantly
    setOcrVersion(v => v + 1);
    onResubmit?.(doc.document_id);   // ← notify parent so sidebar updates
  }, [onResubmit, doc.document_id]);

  const handleDeleteSuccess = useCallback((docId: number, fileName: string) => {
    setDeleteOpen(false);
    onDelete(docId, fileName);
  }, [onDelete]);

  const handleDeleteError = useCallback((message: string) => {
    setDeleteErrorMsg(message);
  }, []);

  async function handleRetry() {
    if (retrying) return;
    setRetrying(true); setRetryError(null); setRetrySuccess(false);
    try {
      const res = await fetch(
        `${apiBase}/collection/${collectionId}/document/${doc.document_id}/retry`,
        { method:"POST", credentials:"include" }
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || `HTTP ${res.status}`);
      }
      setRetrySuccess(true);
      onRetry({ ...doc, status:"Queued" });
    } catch (err: any) {
      setRetryError(err.message || "Retry failed. Please try again.");
    } finally { setRetrying(false); }
  }

  function getActivePages(): OcrPage[] {
    if (!ocrPages.length) return [];
    if (isPdf) {
      const active = ocrPageIndex.get(activePdfPage) ?? ocrPageIndex.get(activePdfPage - 1) ?? ocrPages[0];
      return active ? [active] : [ocrPages[0]];
    }
    return ocrPages;
  }

  function copyAllText() {
    const pages = getActivePages();
    if (!pages.length) return;
    const text = pages.flatMap(p => p.layout_lines.map(l => l.text)).join("\n");
    const done = () => {
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch(() => fbCopyAll(text, done));
    } else { fbCopyAll(text, done); }
  }

  function fbCopyAll(text: string, done: () => void) {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
    document.body.appendChild(ta); ta.focus(); ta.select();
    document.execCommand("copy"); document.body.removeChild(ta); done();
  }

  function downloadTxt() {
    const pages = getActivePages();
    if (!pages.length || txtDownloading) return;
    setTxtDownloading(true);
    try {
      const text = pages
        .sort((a, b) => a.page_number - b.page_number)
        .flatMap(p => p.layout_lines.map(l => l.text))
        .join("\n");
      const blob = new Blob([text], { type:"text/plain;charset=utf-8" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      const baseName   = (doc.file_name || "document").replace(/\.[^/.]+$/, "");
      const pageSuffix = isPdf && ocrPages.length > 1 ? `_page${activePdfPage}` : "";
      a.download = `${baseName}${pageSuffix}.txt`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally { setTxtDownloading(false); }
  }

  async function downloadJson() {
    if (!doc.ocr_url) return;
    const cacheBuster = Date.now();
    const ocrPx = `${px(buildUrl(apiBase, doc.ocr_url))}&_cb=${cacheBuster}`;
    try {
      const res  = await fetch(ocrPx, {
        credentials: "include",
        headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `${(doc.file_name || "document").replace(/\.[^/.]+$/, "")}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) { alert(`Download failed: ${err.message}`); }
  }

  // ── NEW: download the generated, layout-preserving PDF from the backend ──
  // Calls GET /collection/{collectionId}/document/{document_id}/download-pdf,
  // which generates the PDF synchronously server-side (nothing persisted),
  // and triggers a native browser download with the returned bytes.
  async function downloadGeneratedPdf() {
    if (pdfDownloading || status !== "completed") return;
    setPdfDownloading(true);
    try {
      const res = await fetch(
        `${apiBase}/collection/${collectionId}/document/${doc.document_id}/download-pdf`,
        { credentials: "include" }
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || `HTTP ${res.status}`);
      }
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition && disposition.match(/filename="(.+)"/);
      const filename = match
        ? match[1]
        : `${(doc.file_name || "document").replace(/\.[^/.]+$/, "")}.pdf`;

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`PDF download failed: ${err.message || "Something went wrong."}`);
    } finally {
      setPdfDownloading(false);
    }
  }

  const pageLabel = isPdf && ocrPages.length > 1 ? ` (p.${activePdfPage})` : "";

  return (
    <>
      {resubmitOpen && (
        <ResubmitModal
          doc={doc}
          apiBase={apiBase}
          onClose={handleCloseResubmit}
          onSuccess={handleResubmitSuccess}
        />
      )}

      {deleteOpen && (
        <DeleteConfirmModal
          doc={doc}
          apiBase={apiBase}
          collectionId={collectionId}
          onClose={handleCloseDelete}
          onSuccess={handleDeleteSuccess}
          onError={handleDeleteError}
        />
      )}

      {/* ── Top toolbar ── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"0 16px", height:44, borderBottom:"1px solid #1e293b",
        flexShrink:0, backgroundColor:"#0a1020" }}>

        {/* ── LEFT side: file name, status badges, and resubmitted tag ── */}
        <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0 }}>
          <p style={{ fontSize:12, fontWeight:600, color:"#94a3b8", margin:0,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{doc.file_name}</p>
          <span style={{ backgroundColor:stBg, color:stFg, fontSize:10, fontWeight:700,
            padding:"2px 8px", borderRadius:9999, display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
            <StatusIcon size={10} className={status === "processing" ? "animate-spin" : ""}/>
            {doc.status}
          </span>
          {doc.version_count > 0 && (
            <span style={{ display:"inline-flex", alignItems:"center", gap:4, flexShrink:0,
              backgroundColor:"rgba(168,85,247,0.12)", color:"#c084fc",
              fontSize:10, fontWeight:700, padding:"2px 9px", borderRadius:9999,
              border:"1px solid rgba(168,85,247,0.28)", letterSpacing:"0.03em" }}>
              <RotateCcw size={10}/> Recomputed ({doc.version_count})
            </span>
          )}

          {/* ── RESUBMITTED TAG — true blue, appears instantly after modal submit ── */}
          {resubmitted && (
            <span style={{
              display:"inline-flex", alignItems:"center", gap:5, flexShrink:0,
              backgroundColor:RESUBMIT_BLUE_BG,
              color:RESUBMIT_BLUE,
              fontSize:10, fontWeight:700,
              padding:"2px 10px", borderRadius:9999,
              border:`1px solid ${RESUBMIT_BLUE_BORDER}`,
              letterSpacing:"0.04em",
              animation:"resubmittedIn 0.25s cubic-bezier(0.34,1.56,0.64,1)",
            }}>
              <RotateCcw size={10}/>
              Resubmitted
            </span>
          )}

          {ocrLoading && (
            <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:10, color:"#64748b" }}>
              <Loader2 size={11} className="animate-spin"/> Loading OCR…
            </span>
          )}
          {(isImg || isPdf) && ocrPage && (
            <span style={{ fontSize:10, color:"#64748b" }}>· Click or drag to select text · Ctrl+Scroll to zoom · H to pan</span>
          )}
        </div>

        {/* ── RIGHT side: action buttons ── */}
        <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
          {status === "failed" && (
            <button onClick={handleRetry} disabled={retrying} style={{
              all:"unset", display:"flex", alignItems:"center", gap:5,
              backgroundColor: retrying ? "rgba(239,68,68,0.05)" : "rgba(239,68,68,0.12)",
              color: retrying ? "#4b1c1c" : "#f87171",
              fontSize:11, fontWeight:600, padding:"4px 12px", borderRadius:9999,
              cursor: retrying ? "not-allowed" : "pointer",
              border:`1px solid ${retrying ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.3)"}`,
              transition:"all 0.15s" }}
              onMouseEnter={e => { if (!retrying) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(239,68,68,0.22)"; }}
              onMouseLeave={e => { if (!retrying) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(239,68,68,0.12)"; }}
            >
              {retrying ? <><Loader2 size={12} className="animate-spin"/> Retrying…</> : <><RotateCcw size={12}/> Retry</>}
            </button>
          )}
          {ocrPage && (
            <button onClick={copyAllText} style={{
              all:"unset", display:"flex", alignItems:"center", gap:5,
              backgroundColor: copied ? "rgba(34,197,94,0.12)" : "rgba(99,102,241,0.1)",
              color: copied ? "#86efac" : "#818cf8",
              fontSize:11, fontWeight:600, padding:"4px 12px", borderRadius:9999, cursor:"pointer",
              border:`1px solid ${copied ? "rgba(34,197,94,0.3)" : "rgba(99,102,241,0.25)"}`,
              transition:"all 0.15s" }}
              onMouseEnter={e => { if (!copied) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(99,102,241,0.2)"; }}
              onMouseLeave={e => { if (!copied) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(99,102,241,0.1)"; }}
            >
              {copied ? <><Check size={12}/> Copied</> : <><Copy size={12}/> Copy Text{pageLabel}</>}
            </button>
          )}
          {ocrPages.length > 0 && (
            <button onClick={downloadTxt} disabled={txtDownloading} style={{
              all:"unset", display:"flex", alignItems:"center", gap:5,
              backgroundColor: txtDownloading ? "rgba(99,102,241,0.05)" : "rgba(99,102,241,0.1)",
              color: txtDownloading ? "#64748b" : "#818cf8",
              fontSize:11, fontWeight:600, padding:"4px 12px", borderRadius:9999,
              cursor: txtDownloading ? "not-allowed" : "pointer",
              border:"1px solid rgba(99,102,241,0.25)", transition:"all 0.15s" }}
              onMouseEnter={e => { if (!txtDownloading) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(99,102,241,0.2)"; }}
              onMouseLeave={e => { if (!txtDownloading) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(99,102,241,0.1)"; }}
            ><Download size={12}/> Download TXT{pageLabel}</button>
          )}
          {status === "completed" && doc.ocr_url && (
            <button onClick={downloadJson} style={{
              all:"unset", display:"flex", alignItems:"center", gap:5,
              backgroundColor:"rgba(99,102,241,0.1)", color:"#818cf8",
              fontSize:11, fontWeight:600, padding:"4px 12px", borderRadius:9999, cursor:"pointer",
              border:"1px solid rgba(99,102,241,0.25)", transition:"all 0.15s" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(99,102,241,0.2)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(99,102,241,0.1)"}
            ><Download size={12}/> Download JSON</button>
          )}

          {/* ── NEW: Download generated PDF ── */}
          {status === "completed" && doc.ocr_url && (
            <button onClick={downloadGeneratedPdf} disabled={pdfDownloading} style={{
              all:"unset", display:"flex", alignItems:"center", gap:5,
              backgroundColor: pdfDownloading ? "rgba(239,68,68,0.05)" : "rgba(239,68,68,0.1)",
              color: pdfDownloading ? "#64748b" : "#f87171",
              fontSize:11, fontWeight:600, padding:"4px 12px", borderRadius:9999,
              cursor: pdfDownloading ? "not-allowed" : "pointer",
              border:`1px solid ${pdfDownloading ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.3)"}`,
              transition:"all 0.15s" }}
              onMouseEnter={e => { if (!pdfDownloading) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(239,68,68,0.22)"; }}
              onMouseLeave={e => { if (!pdfDownloading) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(239,68,68,0.1)"; }}
            >
              {pdfDownloading
                ? <><Loader2 size={12} className="animate-spin"/> Generating…</>
                : <><Download size={12}/> Download PDF</>}
            </button>
          )}

          {userTier === "Premium" && status === "completed" && (
            <button onClick={() => setResubmitOpen(true)} style={{
              all:"unset", display:"flex", alignItems:"center", gap:5,
              backgroundColor:"rgba(234,179,8,0.12)", color:"#fde047",
              fontSize:11, fontWeight:600, padding:"4px 12px", borderRadius:9999, cursor:"pointer",
              border:"1px solid rgba(234,179,8,0.25)", transition:"all 0.15s" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(234,179,8,0.22)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(234,179,8,0.12)"}
            ><RotateCcw size={12}/> Resubmit</button>
          )}

          <div style={{ width:1, height:20, backgroundColor:"#1e293b", flexShrink:0 }}/>

          <button
            onClick={() => { if (isDeletable) setDeleteOpen(true); }}
            disabled={!isDeletable}
            title={!isDeletable ? `Cannot delete while document is ${doc.status}` : "Delete document"}
            style={{
              all:"unset", display:"flex", alignItems:"center", gap:5,
              backgroundColor: !isDeletable ? "rgba(239,68,68,0.04)" : "rgba(239,68,68,0.1)",
              color: !isDeletable ? "#2d1515" : "#f87171",
              fontSize:11, fontWeight:600, padding:"4px 12px", borderRadius:9999,
              cursor: !isDeletable ? "not-allowed" : "pointer",
              border:`1px solid ${!isDeletable ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.25)"}`,
              transition:"all 0.15s",
              opacity: !isDeletable ? 0.45 : 1,
            }}
            onMouseEnter={e => { if (isDeletable) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(239,68,68,0.22)"; }}
            onMouseLeave={e => { if (isDeletable) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(239,68,68,0.1)"; }}
          >
            <Trash2 size={12}/> Delete
          </button>
        </div>
      </div>

      {retryError && (
        <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0,
          backgroundColor:"rgba(239,68,68,0.08)", borderBottom:"1px solid rgba(239,68,68,0.2)",
          padding:"8px 16px" }}>
          <AlertCircle size={14} style={{ color:"#f87171", flexShrink:0 }}/>
          <p style={{ fontSize:12, color:"#fca5a5", margin:0, flex:1 }}>{retryError}</p>
          <button onClick={() => setRetryError(null)}
            style={{ all:"unset", cursor:"pointer", color:"#94a3b8", display:"flex", padding:4, borderRadius:4 }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#94a3b8"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#94a3b8"}
          ><X size={13}/></button>
        </div>
      )}

      {retrySuccess && (
        <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0,
          backgroundColor:"rgba(34,197,94,0.08)", borderBottom:"1px solid rgba(34,197,94,0.2)",
          padding:"8px 16px" }}>
          <CheckCircle size={14} style={{ color:"#86efac", flexShrink:0 }}/>
          <p style={{ fontSize:12, color:"#86efac", margin:0 }}>Document queued for retry — status will update shortly.</p>
        </div>
      )}

      <div style={{ flex:1, display:"flex", overflow:"hidden", minHeight:0 }}>
        {isImg && imageSrc && (
          <ImageRenderer src={imageSrc} ocrPage={ocrPage} fileName={doc.file_name}/>
        )}
        {isPdf && (
          <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
            {pdfError && (
              <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12 }}>
                <AlertCircle size={32} style={{ color:"#f87171" }}/>
                <p style={{ fontSize:13, color:"#f87171", margin:0 }}>{pdfError}</p>
              </div>
            )}
            {!pdfError && pdfBlobUrl && (
              <PdfRenderer blobUrl={pdfBlobUrl} ocrPages={ocrPages} onPageChange={setActivePdfPage}/>
            )}
          </div>
        )}
        {!isPdf && !isImg && (
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
            {status === "failed" ? (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
                justifyContent:"center", gap:16, padding:40, textAlign:"center" }}>
                <div style={{ width:56, height:56, borderRadius:"50%",
                  backgroundColor:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)",
                  display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <AlertCircle size={24} style={{ color:"#f87171" }}/>
                </div>
                <div>
                  <p style={{ fontSize:14, fontWeight:600, color:"#f87171", margin:"0 0 6px" }}>OCR Processing Failed</p>
                  <p style={{ fontSize:12, color:"#94a3b8", margin:0, maxWidth:280 }}>
                    Something went wrong while processing this document. Use the Retry button above to try again.
                  </p>
                </div>
              </div>
            ) : (
              <Placeholder
                icon={<FileSearch size={40} style={{ color:"#64748b" }}/>}
                title="No preview available"
                sub="This file type cannot be previewed."
              />
            )}
          </div>
        )}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */
export default function CollectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id     = params?.id as string;

  const [documents,      setDocuments]      = useState<Doc[]>([]);
  const [collectionName, setCollectionName] = useState<string>("");
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [selected,       setSelected]       = useState<Doc | null>(null);
  const [sidebarOpen,    setSidebarOpen]    = useState(true);
  const [dlAllLoading,   setDlAllLoading]   = useState(false);
  const [addFilesOpen,   setAddFilesOpen]   = useState(false);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [user, setUser] = useState<{ name?:string; email:string; photo?:string; tier?:string } | null>(null);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const [resubmittedDocIds, setResubmittedDocIds] = useState<Set<number>>(new Set());

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || BASE_URL;

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = toastTimersRef.current.get(id);
    if (timer) { clearTimeout(timer); toastTimersRef.current.delete(id); }
  }, []);

  const addToast = useCallback((type: ToastType, title: string, message: string, duration = 6000) => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, type, title, message }]);
    const timer = setTimeout(() => dismissToast(id), duration);
    toastTimersRef.current.set(id, timer);
  }, [dismissToast]);

  useEffect(() => { return () => { toastTimersRef.current.forEach(t => clearTimeout(t)); }; }, []);

  useEffect(() => {
    fetch(`${API_BASE}/auth/me`, { credentials:"include" })
      .then(r => { if (!r.ok) throw new Error("Not authenticated"); return r.json(); })
      .then(d => setUser(d))
      .catch(() => router.push("/printed"));
  }, [API_BASE]);

  const onLogout = useCallback(async () => {
    await fetch(`${API_BASE}/auth/logout`, { method:"POST", credentials:"include" });
    router.push("/printed");
  }, [API_BASE, router]);

  const fetchDocuments = useCallback(() => {
    if (!id) return;
    setError(null); setLoading(true);
    fetch(`${API_BASE}/collection/${id}/documents`, { credentials:"include" })
      .then(async r => {
        if (!r.ok) {
          let msg = `HTTP ${r.status}`;
          try { const d = await r.json(); msg += `: ${d.detail || d.message || d.error || ""}`; } catch {}
          throw new Error(msg);
        }
        return r.json();
      })
      .then(data => {
        const docs: Doc[] = data.documents ?? [];
        setDocuments(docs);
        setCollectionName(data.collection_title ?? `collection_${id}`);
        if (docs.length > 0) setSelected(prev => prev ?? docs[0]);
      })
      .catch(e => { setError(e.message); setDocuments([]); })
      .finally(() => setLoading(false));
  }, [id, API_BASE]);

  // ── Fetch documents currently in review for this collection ──
  const fetchInReviewDocuments = useCallback(() => {
    if (!id) return;
    fetch(`${API_BASE}/collection/${id}/documents/in-review`, { credentials:"include" })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        const ids: number[] = (data.documents ?? []).map((d: any) => d.document_id);
        setResubmittedDocIds(new Set(ids));
      })
      .catch(() => {
        // Non-critical: if this fails, the badge simply won't show until next refresh.
      });
  }, [id, API_BASE]);

  useEffect(() => {
    setSelected(null);
    fetchDocuments();
    fetchInReviewDocuments();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDocRetry = useCallback((updatedDoc: Doc) => {
    setDocuments(prev => prev.map(d => d.document_id === updatedDoc.document_id ? updatedDoc : d));
    setSelected(updatedDoc);
  }, []);

  const handleDocDelete = useCallback((docId: number, fileName: string) => {
    setDocuments(prev => {
      const remaining = prev.filter(d => d.document_id !== docId);
      setSelected(cur => {
        if (cur?.document_id !== docId) return cur;
        const idx = prev.findIndex(d => d.document_id === docId);
        return remaining[idx] ?? remaining[idx - 1] ?? remaining[0] ?? null;
      });
      return remaining;
    });
    addToast("success", "Document deleted", `"${fileName}" has been permanently removed.`);
  }, [addToast]);

  const handleAddFilesSuccess = useCallback((
    uploaded: string[],
    failed: { filename: string; error: string }[]
  ) => {
    if (uploaded.length > 0) {
      addToast(
        "success",
        `${uploaded.length} file${uploaded.length !== 1 ? "s" : ""} uploaded`,
        `Successfully queued for OCR processing.`
      );
      fetchDocuments();
    }
    if (failed.length > 0) {
      const dupes = failed.filter(f => f.error.toLowerCase().includes("already exists"));
      const errs  = failed.filter(f => !f.error.toLowerCase().includes("already exists"));
      if (dupes.length > 0) {
        addToast("info", `${dupes.length} duplicate${dupes.length !== 1 ? "s" : ""} skipped`,
          dupes.map(f => f.filename).join(", "));
      }
      if (errs.length > 0) {
        addToast("error", `${errs.length} file${errs.length !== 1 ? "s" : ""} failed`,
          errs.map(f => `${f.filename}: ${f.error}`).join("; "));
      }
    }
    if (failed.length === 0) {
      setAddFilesOpen(false);
    }
  }, [addToast, fetchDocuments]);

  async function downloadAll() {
    if (dlAllLoading) return;
    setDlAllLoading(true);
    try {
      const res = await fetch(`${API_BASE}/${id}/download`, { method:"POST", credentials:"include" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        addToast("error", "Download failed", d.detail || `HTTP ${res.status}`);
        return;
      }
      addToast("info", "Download requested", "Files will be available for download soon, check the downloadables section.", 8000);
    } catch (err: any) {
      addToast("error", "Download failed", err.message || "Something went wrong. Please try again.");
    } finally { setDlAllLoading(false); }
  }

  const hasAnyCompleted = useMemo(
    () => documents.some(d => d.status.toLowerCase() === "completed" && !!d.ocr_url),
    [documents]
  );

  // ── Filtered documents based on search query ──
  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents;
    const q = searchQuery.toLowerCase().trim();
    return documents.filter(doc =>
      doc.file_name.toLowerCase().includes(q) ||
      doc.file_type.toLowerCase().includes(q) ||
      doc.status.toLowerCase().includes(q)
    );
  }, [documents, searchQuery]);

  const handleSelectDoc = useCallback((doc: Doc) => setSelected(doc), []);
  const openSidebar     = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar    = useCallback(() => setSidebarOpen(false), []);

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 99px; }
        ::-webkit-scrollbar-thumb:hover { background: #64748b; }
        @keyframes shimmer {
          0%   { background-position: -500px 0; }
          100% { background-position:  500px 0; }
        }
        @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
        @keyframes slideUp {
          from { opacity:0; transform:translateY(12px) scale(0.98); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes toastIn {
          from { opacity:0; transform:translateX(24px) scale(0.96); }
          to   { opacity:1; transform:translateX(0) scale(1); }
        }
        @keyframes resubmittedIn {
          from { opacity:0; transform:scale(0.8) translateY(2px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }
        .sk {
          background: linear-gradient(90deg,#1e293b 25%,#263347 50%,#1e293b 75%);
          background-size: 500px 100%;
          animation: shimmer 1.6s infinite linear;
          border-radius: 4px;
        }
        textarea::placeholder { color: #64748b; }
        textarea:focus { outline: none; }
        .sidebar-search-input::placeholder { color: #64748b; }
        .sidebar-search-input:focus { outline: none; }
      `}</style>

      <Header user={user} onLogout={onLogout}/>
      <ToastContainer toasts={toasts} onDismiss={dismissToast}/>

      {addFilesOpen && (
        <AddFilesModal
          collectionId={id}
          apiBase={API_BASE}
          onClose={() => setAddFilesOpen(false)}
          onSuccess={handleAddFilesSuccess}
        />
      )}

      <div style={{ display:"flex", height:"calc(100vh - 60px)", backgroundColor:"#060b14",
        color:"#e2e8f0", overflow:"hidden", fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>

        {/* ── SIDEBAR ── */}
        <aside style={{
          width: sidebarOpen ? SIDEBAR_W : 0, minWidth: sidebarOpen ? SIDEBAR_W : 0,
          overflow:"hidden", borderRight:"1px solid #1e293b",
          display:"flex", flexDirection:"column", backgroundColor:"#0a1020",
          transition:"width 0.25s ease, min-width 0.25s ease", flexShrink:0 }}>

          {/* Sidebar header */}
          <div style={{ padding:"13px 14px 10px", borderBottom:"1px solid #1e293b",
            display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
            <div>
              <p style={{ fontSize:10, fontWeight:700, color:"#94a3b8",
                letterSpacing:"0.1em", textTransform:"uppercase", margin:0 }}>Documents</p>
              {!loading && (
                <p style={{ fontSize:10, color:"#64748b", margin:"3px 0 0" }}>
                  {searchQuery.trim()
                    ? `${filteredDocuments.length} of ${documents.length} file${documents.length !== 1 ? "s" : ""}`
                    : `${documents.length} file${documents.length !== 1 ? "s" : ""}`}
                </p>
              )}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <button
                onClick={() => setAddFilesOpen(true)}
                title="Add files to this collection"
                style={{
                  all:"unset", display:"flex", alignItems:"center", gap:5,
                  backgroundColor:"rgba(249,115,22,0.15)", color:"#fb923c",
                  fontSize:12, fontWeight:700, padding:"6px 13px", borderRadius:8,
                  cursor:"pointer", border:"1px solid rgba(249,115,22,0.35)",
                  transition:"all 0.12s", letterSpacing:"0.02em",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.backgroundColor = "rgba(249,115,22,0.26)";
                  el.style.borderColor = "rgba(249,115,22,0.6)";
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.backgroundColor = "rgba(249,115,22,0.15)";
                  el.style.borderColor = "rgba(249,115,22,0.35)";
                }}
              >
                <Plus size={13}/> Add Files
              </button>
              <button onClick={closeSidebar} style={{ background:"transparent", border:"none",
                cursor:"pointer", color:"#64748b", display:"flex", padding:4, borderRadius:6 }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#64748b"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#64748b"}
                title="Collapse sidebar"
              ><PanelLeftClose size={15}/></button>
            </div>
          </div>

          {/* Search bar */}
          <div style={{ padding:"8px 10px", borderBottom:"1px solid #1e293b", flexShrink:0 }}>
            <div style={{ position:"relative", display:"flex", alignItems:"center" }}>
              <Search size={13} style={{
                position:"absolute", left:9, color:"#64748b", pointerEvents:"none", flexShrink:0,
              }}/>
              <input
                className="sidebar-search-input"
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search files…"
                style={{
                  all:"unset", width:"100%", boxSizing:"border-box",
                  backgroundColor:"rgba(255,255,255,0.03)",
                  border:"1px solid #1e293b",
                  borderRadius:8,
                  padding:"7px 28px 7px 28px",
                  fontSize:12, color:"#94a3b8",
                  transition:"border-color 0.15s, background-color 0.15s",
                }}
                onFocus={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(99,102,241,0.5)";
                  (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(99,102,241,0.05)";
                }}
                onBlur={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = "#1e293b";
                  (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.03)";
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{
                    all:"unset", position:"absolute", right:8, cursor:"pointer",
                    color:"#64748b", display:"flex", alignItems:"center", padding:2, borderRadius:4,
                    transition:"color 0.12s",
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#94a3b8"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#64748b"}
                ><X size={11}/></button>
              )}
            </div>
          </div>

          {/* Document list */}
          <div style={{ flex:1, overflowY:"auto", padding:"10px 10px 16px" }}>
            {error && (
              <div style={{ backgroundColor:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)",
                borderRadius:8, padding:"10px 12px", color:"#fca5a5", fontSize:12, marginBottom:10 }}>
                {error}
              </div>
            )}
            {loading
              ? Array.from({ length:4 }).map((_, i) => <SkeletonTile key={i}/>)
              : filteredDocuments.length === 0
                ? <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
                    padding:"32px 16px", gap:12 }}>
                    {searchQuery.trim() ? (
                      <>
                        <Search size={24} style={{ color:"#1e293b" }}/>
                        <p style={{ fontSize:12, color:"#64748b", textAlign:"center", margin:0 }}>
                          No files match <span style={{ color:"#94a3b8", fontWeight:600 }}>"{searchQuery}"</span>
                        </p>
                        <button
                          onClick={() => setSearchQuery("")}
                          style={{
                            all:"unset", fontSize:11, color:"#6366f1", cursor:"pointer",
                            textDecoration:"underline", textUnderlineOffset:3,
                          }}
                        >Clear search</button>
                      </>
                    ) : (
                      <>
                        <FileText size={28} style={{ color:"#1e293b" }}/>
                        <p style={{ fontSize:12, color:"#64748b", textAlign:"center", margin:0 }}>
                          No documents yet
                        </p>
                        <button
                          onClick={() => setAddFilesOpen(true)}
                          style={{
                            all:"unset", display:"flex", alignItems:"center", gap:6,
                            backgroundColor:"rgba(249,115,22,0.12)", color:"#fb923c",
                            fontSize:11, fontWeight:600, padding:"7px 14px", borderRadius:8,
                            cursor:"pointer", border:"1px solid rgba(249,115,22,0.25)",
                            transition:"all 0.12s",
                          }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(249,115,22,0.22)"}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(249,115,22,0.12)"}
                        >
                          <Plus size={12}/> Add files
                        </button>
                      </>
                    )}
                  </div>
                : filteredDocuments.map(doc => (
                    <FileTile
                      key={doc.document_id}
                      doc={doc}
                      isActive={selected?.document_id === doc.document_id}
                      onClick={() => handleSelectDoc(doc)}
                      apiBase={API_BASE}
                      isResubmitted={resubmittedDocIds.has(doc.document_id)}
                    />
                  ))
            }
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>
          <div style={{ height:40, borderBottom:"1px solid #1e293b", display:"flex",
            alignItems:"center", padding:"0 14px", gap:8, flexShrink:0, backgroundColor:"#0a1020" }}>
            {!sidebarOpen && (
              <button onClick={openSidebar} style={{ background:"transparent", border:"none",
                cursor:"pointer", color:"#94a3b8", display:"flex", padding:"4px 6px", borderRadius:6 }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#94a3b8"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#94a3b8"}
                title="Expand sidebar"
              ><PanelLeftOpen size={15}/></button>
            )}
            {selected && (
              <div style={{ display:"flex", alignItems:"center", gap:5, minWidth:0, overflow:"hidden" }}>
                <span style={{ fontSize:11, color:"#64748b", flexShrink:0 }}>Collection</span>
                <ChevronRight size={12} style={{ color:"#1e293b", flexShrink:0 }}/>
                <span style={{ fontSize:11, color:"#64748b", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {selected.file_name}
                </span>
              </div>
            )}
            <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
              {!loading && hasAnyCompleted && (
                <button onClick={downloadAll} disabled={dlAllLoading} style={{
                  all:"unset", display:"flex", alignItems:"center", gap:5,
                  backgroundColor: dlAllLoading ? "rgba(99,102,241,0.05)" : "rgba(99,102,241,0.1)",
                  color: dlAllLoading ? "#64748b" : "#818cf8",
                  fontSize:11, fontWeight:600, padding:"4px 14px", borderRadius:9999,
                  cursor: dlAllLoading ? "not-allowed" : "pointer",
                  border:"1px solid rgba(99,102,241,0.25)", transition:"all 0.15s", flexShrink:0 }}
                  onMouseEnter={e => { if (!dlAllLoading) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(99,102,241,0.2)"; }}
                  onMouseLeave={e => { if (!dlAllLoading) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(99,102,241,0.1)"; }}
                >
                  {dlAllLoading
                    ? <><Loader2 size={12} className="animate-spin"/> Requesting…</>
                    : <><Download size={12}/> Download All TXT</>}
                </button>
              )}
            </div>
          </div>

          <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
            {selected ? (
              <DocumentViewer
                key={selected.document_id}
                doc={selected}
                apiBase={API_BASE}
                userTier={user?.tier}
                collectionId={id}
                onRetry={handleDocRetry}
                onDelete={handleDocDelete}
                onResubmit={docId => setResubmittedDocIds(prev => new Set(prev).add(docId))}
                isResubmitted={resubmittedDocIds.has(selected.document_id)}
              />
            ) : (
              <Placeholder
                icon={<FileSearch size={44} style={{ color:"#1e293b" }}/>}
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