// app/printed/page.tsx
"use client";

import Link from "next/link";
import { ArrowRight, RefreshCw } from "lucide-react";

export default function PrintedPage() {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black font-league-spartan">
      {/* Header – same style as handwritten page */}
      <header className="absolute top-0 left-0 right-0 z-20 bg-gray-900/70 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
            aria-label="Refresh page"
          >
            <img src="/IIITH.png" alt="IIITH Logo" className="h-8 w-auto" />
          </button>
          <div className="flex gap-4">
            <Link
              href="/signup"
              className="px-5 py-2 rounded-full border border-gray-700 hover:bg-gray-800 transition"
            >
              Sign up
            </Link>
            <Link
              href="/login"
              className="px-5 py-2 rounded-full bg-orange-600 hover:bg-orange-700 transition font-medium"
            >
              Login
            </Link>
          </div>
        </div>
      </header>

      {/* Main content – centered placeholder */}
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-3xl w-full text-center space-y-10">
          {/* Tabs – same as main page for consistency */}
          <div className="inline-flex bg-gray-900/80 backdrop-blur border border-gray-800 rounded-full p-1.5 mx-auto">
            <Link
              href="/"
              className="px-6 py-2.5 text-sm font-medium rounded-full text-gray-300 hover:bg-gray-800 transition-all"
            >
              Hand Written
            </Link>
            <Link
              href="/printed"
              className="px-6 py-2.5 text-sm font-medium rounded-full bg-orange-600 text-white shadow-md transition-all"
            >
              Printed
            </Link>
            <Link
              href="/scene-text"
              className="px-6 py-2.5 text-sm font-medium rounded-full text-gray-300 hover:bg-gray-800 transition-all"
            >
              Scene Text
            </Link>
          </div>

          {/* Main message box */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-10 md:p-16 backdrop-blur-sm">
            <h1 className="text-4xl md:text-5xl font-black text-orange-500 mb-6">
              Printed Text OCR
            </h1>

            <p className="text-xl md:text-2xl text-gray-300 mb-4 font-light">
              This is the Printed page
            </p>

            <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
              Use this mode for clean scanned documents, books, printouts, invoices,
              and other high-quality printed text.
            </p>

            {/* Call to action */}
            <Link
              href="/printed-tool" // ← change to your actual processing page
              className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 rounded-xl text-xl font-semibold shadow-xl shadow-orange-900/40 transition-all hover:scale-105 active:scale-95"
            >
              Start Printed OCR
              <ArrowRight className="w-6 h-6" />
            </Link>
          </div>

          <p className="text-sm text-gray-600 mt-16">
            A product of IIITH • Coming soon: full printed text processing
          </p>
        </div>
      </div>
    </main>
  );
}