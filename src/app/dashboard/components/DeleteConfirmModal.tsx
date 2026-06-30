import { useEffect } from "react";
import { X, Loader2, Trash2 } from "lucide-react";
import { Collection } from "../types";

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

export default DeleteConfirmModal;