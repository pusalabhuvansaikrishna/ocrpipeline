"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen, Briefcase } from "lucide-react";
import DashboardHeader from "./components/Header";
import NewCollectionModal from "./components/NewCollectionModal";
import React from "react";

type User = {
  name?: string;
  email: string;
  photo?: string;
};

type ActiveTab = "collections" | "jobs";

const NAV_ITEMS: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
  {
    id: "collections",
    label: "Collections",
    icon: <FolderOpen className="w-6 h-6" />,
  },
  {
    id: "jobs",
    label: "Jobs",
    icon: <Briefcase className="w-6 h-6" />,
  },
];

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("collections");

  const router = useRouter();
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) throw new Error("Not authenticated");

        const data = await res.json();
        setUser(data);
      } catch (err) {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      router.push("/printed");
    } catch (err) {
      console.error("Logout failed");
    }
  };

  const handleCreateCollection = () => {
    setIsModalOpen(true);
  };

  const handleCollectionProcessed = (collectionData: any) => {
    console.log("✅ Collection created with data:", collectionData);
    setIsModalOpen(false);
    alert("Collection created successfully! 🎉");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-orange-500">
        Loading dashboard...
      </div>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen flex flex-col bg-gray-950 text-gray-100">
      {/* Header */}
      <DashboardHeader
        user={user}
        onLogout={handleLogout}
        onCreateCollection={handleCreateCollection}
      />

      {/* Layout */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-24 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col items-center pt-8">
          {NAV_ITEMS.map((item, index) => (
            <React.Fragment key={item.id}>
              <button
                onClick={() => setActiveTab(item.id)}
                className={`
                  flex flex-col items-center justify-center gap-2
                  w-20 py-4 rounded-xl cursor-pointer
                  transition-colors duration-150
                  ${
                    activeTab === item.id
                      ? "text-orange-400"
                      : "text-gray-500 hover:text-gray-300"
                  }
                `}
              >
                {item.icon}
                <span className="text-[11px] font-medium">
                  {item.label}
                </span>
              </button>

              {index < NAV_ITEMS.length - 1 && (
                <div className="w-12 h-px bg-gray-700 my-3" />
              )}
            </React.Fragment>
          ))}
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 px-10 py-10">
          {activeTab === "collections" && (
            <div>
              <h2 className="text-2xl font-semibold mb-2">Collections</h2>
              <p className="text-gray-500 text-sm mb-8">
                Organize and manage your document collections.
              </p>

              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-5">
                  <FolderOpen className="w-8 h-8 text-orange-400" />
                </div>

                <h3 className="text-lg font-medium mb-2">
                  No collections yet
                </h3>

                <p className="text-gray-500 text-sm max-w-xs">
                  Create your first collection to start organizing and processing your documents.
                </p>

                <button
                  onClick={handleCreateCollection}
                  className="mt-6 px-5 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 rounded-xl text-white text-sm font-semibold"
                >
                  + New Collection
                </button>
              </div>
            </div>
          )}

          {activeTab === "jobs" && (
            <div>
              <h2 className="text-2xl font-semibold mb-2">Jobs</h2>
              <p className="text-gray-500 text-sm mb-8">
                Track the status of your processing jobs.
              </p>
            </div>
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