import { X } from "lucide-react";
import { Toast } from "../types";

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

export default ToastContainer;