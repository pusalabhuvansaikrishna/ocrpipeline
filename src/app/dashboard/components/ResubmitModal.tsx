import { useEffect, useState } from "react";
import { X, Loader2, RefreshCw } from "lucide-react";
import { Collection } from "../types";
import { RESUBMIT_MAX_CHARS } from "../utils";

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

export default ResubmitModal;