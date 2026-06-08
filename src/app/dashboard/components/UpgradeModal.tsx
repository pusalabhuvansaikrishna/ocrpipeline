"use client";

import { X, Zap, Globe, Brain, Eye, RefreshCw, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { BASE_URL } from "@/config/api";

type Tier = "Basic" | "Pro" | "Premium";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  currentTier?: string | null;
  onSwitch?: (tier: Tier) => void;
};

const PLANS: {
  id: Tier;
  label: string;
  features: { icon: React.ElementType; text: string }[];
}[] = [
  {
    id: "Basic",
    label: "Basic",
    features: [
      { icon: Globe, text: "Supports 22 Indian Languages" },
      { icon: Brain, text: "Deep Learning Models" },
    ],
  },
  {
    id: "Pro",
    label: "Pro",
    features: [
      { icon: Globe, text: "Supports 22 Indian Languages" },
      { icon: Eye, text: "VLM Models" },
    ],
  },
  {
    id: "Premium",
    label: "Premium",
    features: [
      { icon: Globe,     text: "Supports 22 Indian Languages" },
      { icon: Eye,       text: "VLM Models" },
      { icon: RefreshCw, text: "Resubmit documents for higher quality output" },
    ],
  },
];

const ORANGE = "#f97316";
const MAX_REASON_LENGTH = 500;

const TIER_RANK: Record<Tier, number> = { Basic: 1, Pro: 2, Premium: 3 };

function normalizeTier(raw?: string | null): Tier {
  const s = (raw ?? "").toLowerCase().trim();
  if (s === "pro")     return "Pro";
  if (s === "premium") return "Premium";
  return "Basic";
}

type ModalStep = "select" | "reason" | "loading" | "success" | "error";

export default function UpgradeModal({
  isOpen,
  onClose,
  currentTier,
  onSwitch,
}: Props) {
  const [step, setStep]                 = useState<ModalStep>("select");
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [reason, setReason]             = useState("");
  const [errorMsg, setErrorMsg]         = useState("");
  const [successMsg, setSuccessMsg]     = useState("");

  const activeTier = normalizeTier(currentTier);
  const isUpgrade  = selectedTier ? TIER_RANK[selectedTier] > TIER_RANK[activeTier] : false;
  const charsLeft  = MAX_REASON_LENGTH - reason.length;
  const charsColor =
    charsLeft <= 20 ? "#ef4444" :
    charsLeft <= 50 ? "#f97316" :
    "#475569";

  function handleTierClick(tier: Tier) {
    setSelectedTier(tier);
    setReason("");
    setStep("reason");
  }

  function handleBack() {
    setStep("select");
    setSelectedTier(null);
    setReason("");
  }

  async function handleSubmit() {
    if (!selectedTier || !reason.trim()) return;

    setStep("loading");
    setErrorMsg("");

    try {
      const res = await fetch(`${BASE_URL}/user/tier-switch`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requested_tier: selectedTier,
          reason:         reason.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data?.detail ?? "Something went wrong. Please try again.");
        setStep("error");
        return;
      }

      setSuccessMsg(data.message);
      setStep("success");
      // ✅ Removed: onSwitch?.(selectedTier)
      // The tier change is pending admin approval — we must NOT update
      // the local user state here, or it will show the wrong tier until refresh.
    } catch {
      setErrorMsg("Network error. Please check your connection.");
      setStep("error");
    }
  }

  function handleClose() {
    onClose();
    // reset after close animation
    setTimeout(() => {
      setStep("select");
      setSelectedTier(null);
      setReason("");
      setErrorMsg("");
      setSuccessMsg("");
    }, 200);
  }

  if (!isOpen) return null;

  return (
    <div
      onClick={handleClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        backgroundColor: "rgba(0,0,0,0.78)",
        backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, animation: "umFadeIn 0.15s ease",
      }}
    >
      <style>{`
        @keyframes umFadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes umSlideUp { from { opacity:0; transform:translateY(16px) scale(0.97) } to { opacity:1; transform:translateY(0) scale(1) } }
        .um-card {
          border: 1.5px solid rgba(100,116,139,0.3) !important;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .um-card:hover {
          border-color: rgba(249,115,22,0.65) !important;
          box-shadow: 0 8px 32px rgba(249,115,22,0.08);
          background: rgba(249,115,22,0.04) !important;
        }
        .um-card.um-active {
          border-color: #f97316 !important;
          background: rgba(249,115,22,0.03) !important;
          box-shadow: 0 0 0 1px rgba(249,115,22,0.15), 0 8px 32px rgba(249,115,22,0.08);
        }
        .um-switch-btn { transition: opacity 0.15s, transform 0.12s; }
        .um-switch-btn:hover { opacity:0.85 !important; transform:translateY(-1px); }
        .um-switch-btn:active { transform:translateY(0); }
        .um-close-btn:hover { background-color:rgba(239,68,68,0.12) !important; color:#f87171 !important; }
        .um-back-btn:hover { background-color:rgba(255,255,255,0.06) !important; }
        .um-reason-textarea {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(100,116,139,0.3);
          border-radius: 10px;
          color: #f1f5f9;
          font-size: 13.5px;
          line-height: 1.6;
          padding: 12px 14px;
          resize: none;
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
          font-family: inherit;
        }
        .um-reason-textarea::placeholder { color: #475569; }
        .um-reason-textarea:focus { border-color: rgba(249,115,22,0.6); }
        .um-submit-btn {
          width: 100%; padding: 11px 0;
          background: linear-gradient(to right,#ea580c,#f97316);
          border: none; border-radius: 9px;
          color: #fff; font-size: 13px; font-weight: 700;
          cursor: pointer; letter-spacing: 0.02em;
          transition: opacity 0.15s, transform 0.12s;
        }
        .um-submit-btn:hover:not(:disabled) { opacity: 0.85; transform: translateY(-1px); }
        .um-submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: step === "select" ? 680 : 460,
          backgroundColor: "#0b1322",
          borderRadius: 18,
          border: "1px solid #1a2640",
          boxShadow: "0 28px 72px rgba(0,0,0,0.65)",
          overflow: "hidden",
          animation: "umSlideUp 0.22s ease",
          transition: "max-width 0.2s ease",
        }}
      >
        {/* ── Header ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: "1px solid #1a2640",
          background: "linear-gradient(135deg,rgba(234,88,12,0.08) 0%,rgba(249,115,22,0.04) 100%)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {step === "reason" && (
              <button
                onClick={handleBack}
                className="um-back-btn"
                style={{
                  all: "unset", width: 28, height: 28, borderRadius: 7,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "#475569",
                  transition: "background-color 0.15s",
                  marginRight: 2,
                }}
              >
                <ArrowLeft size={15} />
              </button>
            )}
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: "linear-gradient(135deg,#ea580c,#f97316)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Zap size={15} fill="white" style={{ color: "white" }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>
                {step === "reason" ? `Switch to ${selectedTier}` : "Switch Your Tier"}
              </p>
              <p style={{ fontSize: 11, color: "#475569", margin: "1px 0 0" }}>
                Currently on <span style={{ color: ORANGE, fontWeight: 600 }}>{activeTier}</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="um-close-btn"
            style={{
              all: "unset", width: 28, height: 28, borderRadius: 7,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#475569",
              transition: "background-color 0.15s, color 0.15s",
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Step: Select tier ── */}
        {step === "select" && (
          <div style={{ padding: "24px 20px 28px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, alignItems: "stretch" }}>
              {PLANS.map((plan) => {
                const isCurrent = activeTier === plan.id;
                return (
                  <div
                    key={plan.id}
                    className={`um-card${isCurrent ? " um-active" : ""}`}
                    style={{
                      borderRadius: 14, padding: "22px 18px 20px",
                      background: "rgba(255,255,255,0.015)",
                      position: "relative", display: "flex",
                      flexDirection: "column", minHeight: 220,
                    }}
                  >
                    {isCurrent && (
                      <span style={{
                        position: "absolute", top: 12, right: 12,
                        fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
                        color: ORANGE, backgroundColor: "rgba(249,115,22,0.12)",
                        border: "1px solid rgba(249,115,22,0.25)",
                        padding: "2px 8px", borderRadius: 9999,
                      }}>ACTIVE</span>
                    )}
                    <p style={{ fontSize: 16, fontWeight: 700, color: ORANGE, margin: "0 0 16px" }}>
                      {plan.label}
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 9, flexGrow: 1, marginBottom: isCurrent ? 0 : 18 }}>
                      {plan.features.map((feat) => (
                        <div key={feat.text} style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
                          <feat.icon size={12} style={{ color: ORANGE, flexShrink: 0, marginTop: 2 }} />
                          <span style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.45 }}>{feat.text}</span>
                        </div>
                      ))}
                    </div>
                    {!isCurrent && (
                      <button
                        className="um-switch-btn"
                        onClick={() => handleTierClick(plan.id)}
                        style={{
                          width: "100%", padding: "10px 0",
                          background: "linear-gradient(to right,#ea580c,#f97316)",
                          border: "none", borderRadius: 9,
                          color: "#fff", fontSize: 12.5, fontWeight: 700,
                          cursor: "pointer", letterSpacing: "0.02em",
                          marginTop: "auto",
                        }}
                      >
                        Switch to {plan.label}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Step: Reason ── */}
        {step === "reason" && (
          <div style={{ padding: "24px 20px 28px" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              backgroundColor: "rgba(249,115,22,0.08)",
              border: "1px solid rgba(249,115,22,0.2)",
              borderRadius: 9999, padding: "4px 12px",
              marginBottom: 18,
            }}>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>{activeTier}</span>
              <span style={{ fontSize: 11, color: "#475569" }}>→</span>
              <span style={{ fontSize: 11, color: ORANGE, fontWeight: 600 }}>{selectedTier}</span>
              {isUpgrade
                ? <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 600, marginLeft: 2 }}>UPGRADE</span>
                : <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, marginLeft: 2 }}>DOWNGRADE</span>
              }
            </div>

            {isUpgrade && (
              <div style={{
                backgroundColor: "rgba(249,115,22,0.06)",
                border: "1px solid rgba(249,115,22,0.18)",
                borderRadius: 10, padding: "10px 14px",
                marginBottom: 18,
              }}>
                <p style={{ fontSize: 12, color: "#94a3b8", margin: 0, lineHeight: 1.5 }}>
                  Your request will be reviewed by an admin before being approved.
                </p>
              </div>
            )}

            <label style={{ fontSize: 12.5, color: "#94a3b8", display: "block", marginBottom: 8 }}>
              Why do you want to switch to <span style={{ color: ORANGE }}>{selectedTier}</span>?
            </label>

            <textarea
              className="um-reason-textarea"
              rows={5}
              maxLength={MAX_REASON_LENGTH}
              placeholder="Tell us your reason..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6, marginBottom: 20 }}>
              <span style={{ fontSize: 11.5, color: charsColor, transition: "color 0.2s" }}>
                {charsLeft} character{charsLeft !== 1 ? "s" : ""} remaining
              </span>
            </div>

            <button
              className="um-submit-btn"
              onClick={handleSubmit}
              disabled={!reason.trim()}
            >
              Confirm Switch to {selectedTier}
            </button>
          </div>
        )}

        {/* ── Step: Loading ── */}
        {step === "loading" && (
          <div style={{ padding: "48px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              border: "3px solid rgba(249,115,22,0.2)",
              borderTopColor: ORANGE,
              animation: "spin 0.75s linear infinite",
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            <p style={{ fontSize: 13, color: "#475569", margin: 0 }}>Processing your request...</p>
          </div>
        )}

        {/* ── Step: Success ── */}
        {step === "success" && (
          <div style={{ padding: "40px 24px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              backgroundColor: "rgba(34,197,94,0.12)",
              border: "1.5px solid rgba(34,197,94,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 10l4 4 8-8" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>Done!</p>
            <p style={{ fontSize: 12.5, color: "#94a3b8", margin: 0, lineHeight: 1.6, maxWidth: 300 }}>{successMsg}</p>
            <button
              className="um-switch-btn"
              onClick={handleClose}
              style={{
                marginTop: 8, padding: "10px 32px",
                background: "linear-gradient(to right,#ea580c,#f97316)",
                border: "none", borderRadius: 9,
                color: "#fff", fontSize: 13, fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        )}

        {/* ── Step: Error ── */}
        {step === "error" && (
          <div style={{ padding: "40px 24px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              backgroundColor: "rgba(239,68,68,0.12)",
              border: "1.5px solid rgba(239,68,68,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <X size={20} color="#ef4444" />
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>Request Failed</p>
            <p style={{ fontSize: 12.5, color: "#94a3b8", margin: 0, lineHeight: 1.6, maxWidth: 300 }}>{errorMsg}</p>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button
                className="um-switch-btn"
                onClick={() => setStep("reason")}
                style={{
                  padding: "10px 24px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1.5px solid rgba(100,116,139,0.3)", borderRadius: 9,
                  color: "#94a3b8", fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}
              >
                Try Again
              </button>
              <button
                className="um-switch-btn"
                onClick={handleClose}
                style={{
                  padding: "10px 24px",
                  background: "linear-gradient(to right,#ea580c,#f97316)",
                  border: "none", borderRadius: 9,
                  color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}