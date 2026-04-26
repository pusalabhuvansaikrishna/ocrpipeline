// app/printed/components/PrintedHeader.tsx
"use client";

import Link from "next/link";

export default function PrintedHeader() {
  const handleGoogleLogin = () => {
    /*const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";*/
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://10-4-16-36.nip.io:8003";
    window.location.href = `${API_BASE}/auth/google/login`;
  };

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

        {/* Continue with Google Button - Orange Hover + Lift Effect */}
        <button
          onClick={handleGoogleLogin}
          className="
            flex items-center gap-3
            px-6 py-2.5 rounded-xl font-semibold text-sm
            bg-gray-800 border border-gray-700 text-gray-200
            transition-all duration-300
            hover:bg-orange-600 hover:border-orange-500 hover:text-white
            hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-500/30
            active:scale-95 active:shadow-lg
          "
        >
          <img
            src="https://www.google.com/favicon.ico"
            alt="Google"
            className="w-5 h-5"
          />
          Continue with Google
        </button>
      </div>
    </header>
  );
}