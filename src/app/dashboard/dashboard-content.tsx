"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardHeader from "./components/Header";
import NewCollectionModal from "./components/NewCollectionModal";
import UpgradeModal from "./components/UpgradeModal";
import Sidebar from "./components/Sidebar";
import CollectionsTab from "./components/CollectionsTab";
import JobsTab from "./components/JobsTab";
import DownloadsTab from "./components/DownloadsTab";
import ToastContainer from "./components/ToastContainer";
import { BASE_URL } from "@/config/api";
import { ActiveTab, Tier, Toast, User } from "./types";
import { normalizeTier } from "./utils";

const VALID_TABS: ActiveTab[] = ["collections", "jobs", "downloadables"];

/* ═══════════════════════════════════════════════
   DASHBOARD CONTENT (uses useSearchParams)
═══════════════════════════════════════════════ */
export default function DashboardContent() {
  const [user, setUser]                             = useState<User | null>(null);
  const [loading, setLoading]                       = useState(true);
  const [isModalOpen, setIsModalOpen]               = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [collectionsRefreshKey, setCollectionsRefreshKey] = useState(0);

  const router        = useRouter();
  const searchParams   = useSearchParams();
  const API_BASE       = process.env.NEXT_PUBLIC_API_URL || BASE_URL;

  /* ── Active tab, derived from the URL so refresh keeps you on the same tab ── */
  const tabFromUrl   = searchParams.get("tab");
  const initialTab: ActiveTab = VALID_TABS.includes(tabFromUrl as ActiveTab)
    ? (tabFromUrl as ActiveTab)
    : "collections";
  const [activeTab, setActiveTabState] = useState<ActiveTab>(initialTab);

  // Keep state in sync if the URL changes externally (back/forward buttons)
  useEffect(() => {
    const t = searchParams.get("tab");
    if (VALID_TABS.includes(t as ActiveTab) && t !== activeTab) {
      setActiveTabState(t as ActiveTab);
    }
    // If there's no (valid) tab param yet, write the current/default one into the URL
    if (!VALID_TABS.includes(t as ActiveTab)) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", activeTab);
      router.replace(`/dashboard?${params.toString()}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const setActiveTab = (tab: ActiveTab) => {
    setActiveTabState(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`/dashboard?${params.toString()}`);
  };

  // ── Toast state (shared across tabs) ──
  const [toasts, setToasts] = useState<Toast[]>([]);
  let toastCounter = 0;

  const addToast = (type: Toast["type"], message: string) => {
    const id = ++toastCounter + Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  /* ── Auth ── */
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const fetchUser = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, { method: "GET", credentials: "include", signal: controller.signal });
        if (!res.ok) throw new Error("Not authenticated");
        const data = await res.json();
        setUser({ ...data, tier: normalizeTier(data.tier) });
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

  /* ── Handlers ── */
  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
      router.push("/printed");
    } catch { console.error("Logout failed"); }
  };

  const handleCollectionProcessed = () => {
    setIsModalOpen(false);
    setActiveTab("collections");
    setCollectionsRefreshKey((k) => k + 1);
  };

  const TIER_RANK: Record<Tier, number> = { Basic: 1, Pro: 2, Premium: 3 };

  const handleTierSwitch = (tier: Tier) => {
    const isDowngrade = user ? TIER_RANK[tier] < TIER_RANK[user.tier] : false;
    if (isDowngrade) {
      setIsUpgradeModalOpen(false);
      handleLogout();
      return;
    }
    setUser((prev) => prev ? { ...prev, tier } : prev);
    setIsUpgradeModalOpen(false);
  };

  /* ── Guards ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-3 text-orange-500">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Loading dashboard…</span>
      </div>
    );
  }
  if (!user) return null;

  const isPremium = user.tier === "Premium";

  /* ══════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════ */
  return (
    <main className="min-h-screen flex flex-col bg-gray-950 text-gray-100">
      <DashboardHeader
        user={user}
        onLogout={handleLogout}
        onCreateCollection={() => setIsModalOpen(true)}
        onUpgrade={() => setIsUpgradeModalOpen(true)}
      />

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        currentTier={user.tier}
        onSwitch={handleTierSwitch}
      />

      {/* ── Toast notifications (shared) ── */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="flex flex-1">

        {/* ── Sidebar ── */}
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* ── Main content ── */}
        <div className="flex-1 px-10 py-10">

          {activeTab === "collections" && (
            <CollectionsTab
              apiBase={API_BASE}
              isActive={activeTab === "collections"}
              isPremium={isPremium}
              addToast={addToast}
              refreshTrigger={collectionsRefreshKey}
            />
          )}

          {activeTab === "jobs" && (
            <JobsTab apiBase={API_BASE} isActive={activeTab === "jobs"} />
          )}

          {activeTab === "downloadables" && (
            <DownloadsTab apiBase={API_BASE} isActive={activeTab === "downloadables"} />
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