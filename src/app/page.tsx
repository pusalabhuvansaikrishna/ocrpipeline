"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUp, ArrowRight } from "lucide-react";

export default function Home() {
  const pathname = usePathname();
  const [showScrollUp, setShowScrollUp] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowScrollUp(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black font-league-spartan">
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          poster="/video/hero-poster.jpg"
        >
          <source src="/video/background.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <div className="absolute inset-0 bg-black/55 z-10"></div>

        <header className="absolute top-0 left-0 right-0 z-30 bg-gray-900/70 backdrop-blur-md border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            {/* Logo - clicking reloads home */}
            <Link href="/" aria-label="Go to homepage">
              <img
                src="/IIIT_Hyderabad_Logo.png"
                alt="IIITH Logo"
                className="h-14 w-auto cursor-pointer"
              />
            </Link>

            {/* Try Now button - right side */}
            <Link
              href="/printed" // ← change this to your preferred starting page
              className={`
                group flex items-center gap-2 px-7 py-3 rounded-lg font-semibold text-base
                bg-orange-600 text-white border border-orange-500
                hover:bg-orange-700 hover:border-orange-400
                transition-all duration-300 shadow-md hover:shadow-orange-900/40
                active:scale-95
              `}
            >
              Try Now
            </Link>
          </div>
        </header>

        <div className="space-y-10 md:space-y-16 z-20 mt-[5rem] md:mt-[5rem] max-w-5xl w-full">
          <div className="space-y-6 text-center">
            <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tight drop-shadow-2xl">
              <span className="text-orange-500">FAST</span>
              <span className="text-orange-600">OC</span>
              <span className="text-orange-500">R</span>
            </h1>
            <p className="text-lg md:text-2xl lg:text-2.5xl text-gray-200 font-light tracking-wide drop-shadow-lg">
              A PRODUCT OF IIITH
            </p>
            <p className="text-lg md:text-xl text-gray-300 mt-6 max-w-2xl mx-auto">
              High-accuracy OCR for Handwritten, Printed, and Scene text
            </p>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-6 md:gap-10 lg:gap-14 mt-32 md:mt-32 lg:mt-48">
            <Link
              href="/handwritten"
              className={`
                px-10 py-5 rounded-xl text-lg font-semibold transition-all duration-300 shadow-xl transform
                bg-gray-800/70 text-gray-200 border border-gray-700
                hover:bg-orange-600 hover:text-white hover:border-orange-400
                hover:shadow-orange-900/50 hover:scale-105
                active:scale-95
              `}
            >
              Handwritten Text
            </Link>

            <Link
              href="/printed"
              className={`
                px-10 py-5 rounded-xl text-lg font-semibold transition-all duration-300 shadow-xl transform
                bg-gray-800/70 text-gray-200 border border-gray-700
                hover:bg-orange-600 hover:text-white hover:border-orange-400
                hover:shadow-orange-900/50 hover:scale-105
                active:scale-95
              `}
            >
              Printed Text
            </Link>

            <Link
              href="/scene"
              className={`
                px-10 py-5 rounded-xl text-lg font-semibold transition-all duration-300 shadow-xl transform
                bg-gray-800/70 text-gray-200 border border-gray-700
                hover:bg-orange-600 hover:text-white hover:border-orange-400
                hover:shadow-orange-900/50 hover:scale-105
                active:scale-95
              `}
            >
              Scene Text
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-gradient-to-b from-black to-gray-950 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-orange-400 mb-6">
            Select the OCR mode above to start
          </h2>
          <p className="text-lg text-gray-300">
            Coming with support for batch processing, and high-accuracy models tuned by IIITH Researchers.
          </p>
        </div>
      </section>

      {showScrollUp && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 p-4 bg-gray-800/90 hover:bg-gray-700 border border-gray-600 rounded-full text-orange-400 shadow-lg transition-all hover:scale-110"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
      )}
    </main>
  );
}