"use client";

import Image from "next/image";
import { ChevronDown, LogOut, Zap } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

type DashboardHeaderProps = {
  user: { name?: string; email: string; photo?: string; profile_picture?: string; tier?: string } | null;
  onLogout: () => void;
  onCreateCollection?: () => void;
  onUpgrade?: () => void;
};

export default function DashboardHeader({
  user,
  onLogout,
  onCreateCollection,
  onUpgrade,
}: DashboardHeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const photoSrc = user?.profile_picture ?? user?.photo ?? null;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (showDropdown && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [showDropdown]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const inTrigger  = triggerRef.current?.contains(e.target as Node);
      const inDropdown = dropdownRef.current?.contains(e.target as Node);
      if (!inTrigger && !inDropdown) setShowDropdown(false);
    };
    if (showDropdown) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDropdown]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/70 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

        {/* Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => router.push("/dashboard")}
        >
          <Image
            src="/IIIT_Hyderabad_Logo.png"
            alt="IIITH Logo"
            width={200}
            height={200}
            className="h-14 w-auto"
            quality={100}
            priority
          />
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-3">

          {/* Upgrade Button */}
          {onUpgrade && (
            <button
              onClick={onUpgrade}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 18px", backgroundColor: "transparent",
                border: "1.5px solid #f97316", borderRadius: 12,
                color: "#f97316", fontSize: 14, fontWeight: 600,
                cursor: "pointer", transition: "background-color 0.15s, box-shadow 0.15s",
                letterSpacing: "0.01em",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(249,115,22,0.08)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 3px rgba(249,115,22,0.12)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
              }}
            >
              <Zap size={14} style={{ color: "#f97316" }} />
              Switch Tiers
            </button>
          )}

          {/* Create Collection Button */}
          {onCreateCollection && (
            <button
              onClick={onCreateCollection}
              className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-orange-900/30 flex items-center gap-2"
            >
              <span>+</span> Create Collection
            </button>
          )}

          {/* User Profile Dropdown */}
          {user && (
            <div className="relative" ref={triggerRef}>
              <button
                onClick={() => setShowDropdown((prev) => !prev)}
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-full p-1 pr-3 transition-all hover:border-orange-500/50 group"
              >
                {photoSrc ? (
                  <img
                    src={photoSrc}
                    alt="Profile"
                    className="w-7 h-7 rounded-full object-cover border border-orange-400/30"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-semibold text-xs border border-orange-400/30">
                    {user.name
                      ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                      : user.email.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-orange-400 transition" />
              </button>

              {/* Portalled Dropdown */}
              {showDropdown && mounted && createPortal(
                <div
                  ref={dropdownRef}
                  style={{
                    position: "fixed",
                    top: dropdownPos.top,
                    right: dropdownPos.right,
                    zIndex: 99999,
                    width: 224,
                    backgroundColor: "#111827",
                    border: "1px solid #374151",
                    borderRadius: 16,
                    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8)",
                    overflow: "hidden",
                    animation: "ddIn 0.15s ease",
                  }}
                >
                  <style>{`
                    @keyframes ddIn {
                      from { opacity: 0; transform: translateY(-6px) scale(0.97); }
                      to   { opacity: 1; transform: translateY(0) scale(1); }
                    }
                  `}</style>

                  {/* User info */}
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid #1f2937" }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#f3f4f6" }}>
                      {user.name || "User"}
                    </p>
                    <p style={{
                      margin: "2px 0 0", fontSize: 12, color: "#6b7280",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {user.email}
                    </p>
                    {user.tier && (
                      <span style={{
                        display: "inline-block", marginTop: 6,
                        fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
                        padding: "2px 8px", borderRadius: 9999,
                        backgroundColor: user.tier === "Premium"
                          ? "rgba(249,115,22,0.15)" : "rgba(99,102,241,0.15)",
                        color: user.tier === "Premium" ? "#f97316" : "#818cf8",
                        border: `1px solid ${user.tier === "Premium"
                          ? "rgba(249,115,22,0.3)" : "rgba(99,102,241,0.3)"}`,
                      }}>
                        {user.tier}
                      </span>
                    )}
                  </div>

                  {/* Logout */}
                  <div style={{ padding: 8 }}>
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        onLogout();
                      }}
                      style={{
                        all: "unset", display: "flex", alignItems: "center", gap: 12,
                        width: "100%", boxSizing: "border-box",
                        padding: "10px 12px", borderRadius: 12,
                        fontSize: 14, fontWeight: 500,
                        color: "#f87171", cursor: "pointer",
                        transition: "background-color 0.15s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(239,68,68,0.15)"}
                      onMouseLeave={(e) =>
                        (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"}
                    >
                      <LogOut size={16} style={{ flexShrink: 0 }} />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>,
                document.body
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}