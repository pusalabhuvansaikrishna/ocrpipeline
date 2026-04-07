"use client";

import Image from "next/image";
import { ChevronDown, LogOut } from "lucide-react";
import { useState } from "react";

type DashboardHeaderProps = {
  user: { name?: string; email: string; photo?: string } | null;
  onLogout: () => void;
  onCreateCollection?: () => void;
};

export default function DashboardHeader({
  user,
  onLogout,
  onCreateCollection,
}: DashboardHeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  const hasPhoto = !!user?.photo;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/70 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo + Brand */}
        <div className="flex items-center gap-3">
          <Image
            src="/IIIT_Hyderabad_Logo.png"
            alt="IIITH Logo"
            width={56}
            height={56}
            className="h-14 w-auto"
          />
          <span className="text-xl font-semibold text-orange-400 tracking-tight">
            Vishva Setu
          </span>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-4">
          {/* Create Collection Button - Unchanged */}
          <button
            onClick={onCreateCollection}
            className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-orange-900/30 flex items-center gap-2"
          >
            <span>+</span> Create Collection
          </button>

          {/* User Profile Dropdown */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-full p-1 pr-3 transition-all hover:border-orange-500/50 group"
              >
                {/* Profile Picture - Strongly Reduced Size */}
                {hasPhoto ? (
                  <img
                    src={user.photo}
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

              {/* Dropdown Menu */}
              {showDropdown && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl py-2 z-50"
                  onMouseLeave={() => setShowDropdown(false)}
                >
                  <div className="px-4 py-3 border-b border-gray-800">
                    <p className="font-medium">{user.name || "User"}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>

                  <button
                    onClick={onLogout}
                    className="w-full mx-1 mt-1 flex items-center gap-3 px-4 py-3.5 text-red-400 hover:text-red-300 hover:bg-red-900/70 hover:scale-[1.03] active:scale-95 transition-all duration-200 font-medium rounded-xl"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}