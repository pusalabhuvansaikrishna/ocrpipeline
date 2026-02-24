"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();

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

        {/* Navigation / CTA */}
        <nav className="flex items-center gap-6">

          <Link
            href="/printed"
            className="
              ml-4 px-6 py-2 rounded-lg font-semibold text-sm
              bg-orange-600 text-white border border-orange-500
              hover:bg-orange-700 hover:border-orange-400
              transition-all duration-300
              active:scale-95
            "
          >
            Try Now
          </Link>
        </nav>
      </div>
    </header>
  );
}