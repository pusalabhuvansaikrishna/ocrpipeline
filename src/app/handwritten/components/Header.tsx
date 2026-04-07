// app/printed/components/PrintedHeader.tsx
"use client";

import Link from "next/link";
// import { usePathname } from "next/navigation";   ← you can remove if not used anymore

export default function PrintedHeader() {
  // const pathname = usePathname();   ← remove if unused

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/70 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" aria-label="Go to homepage">
          <img
            src="/IIIT_Hyderabad_Logo.png"
            alt="IIITH Logo"
            className="h-14 w-auto cursor-pointer"
          />
        </Link>

        {/* Auth buttons – only for printed section */}
        <nav className="flex items-center gap-4">
          <Link
            href="/login"
            className="
              px-6 py-2 rounded-lg font-semibold text-sm
              text-orange-500 border border-orange-500
              hover:bg-orange-500/10 hover:border-orange-400
              transition-all duration-300
              active:scale-95
            "
          >
            Sign In
          </Link>

          <Link
            href="/signup"
            className="
              px-6 py-2 rounded-lg font-semibold text-sm
              bg-orange-600 text-white border border-orange-500
              hover:bg-orange-700 hover:border-orange-400
              transition-all duration-300
              active:scale-95
            "
          >
            Sign Up
          </Link>
        </nav>
      </div>
    </header>
  );
}