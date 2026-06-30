/* ═══════════════════════════════════════════════
   SKELETON COMPONENTS (shared across tabs)
═══════════════════════════════════════════════ */

export const SkeletonCard = () => (
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

export const SkeletonGrid = () => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "12px" }}>
    {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
  </div>
);

export const SkeletonTable = () => (
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