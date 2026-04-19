"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUp } from "lucide-react";

export default function Home() {
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
    <>
      {/* HERO SECTION */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden">
        {/* Background Video */}
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

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/55 z-10"></div>

        {/* Hero Content */}
        <div className="space-y-10 md:space-y-16 z-20 mt-[2rem] max-w-5xl w-full">
          <div className="space-y-6 text-center">
            <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tight drop-shadow-2xl">
              <span className="text-orange-500">Vish</span>
              <span className="text-orange-600">va</span>
              <span className="text-orange-500"> Setu</span>
            </h1>

            <p className="text-lg md:text-2xl text-gray-200 font-light tracking-wide drop-shadow-lg">
              A PRODUCT OF IIITH
            </p>

            <p className="text-lg md:text-xl text-gray-300 mt-6 max-w-2xl mx-auto">
              High-accuracy OCR for Printed
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-6 md:gap-10 lg:gap-14 mt-32">
            <Link
              href="/printed"
              className="px-10 py-5 rounded-xl text-lg font-semibold transition-all duration-300 shadow-xl
                bg-gray-800/70 text-gray-200 border border-gray-700
                hover:bg-orange-600 hover:text-white hover:border-orange-400
                hover:shadow-orange-900/50 hover:scale-105
                active:scale-95"
            >
              Printed Text
            </Link>
          </div>
        </div>
      </section>

      {/* INFO SECTION */}
      <section className="py-20 px-6 bg-gradient-to-b from-black to-gray-950 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-orange-400 mb-6">
            Select the OCR mode above to start
          </h2>
          <p className="text-lg text-gray-300">
            Coming with support for batch processing and high-accuracy models
            tuned by IIITH researchers.
          </p>
        </div>
      </section>

      {/* SCROLL TO TOP */}
      {showScrollUp && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 p-4 bg-gray-800/90 hover:bg-gray-700
            border border-gray-600 rounded-full text-orange-400 shadow-lg
            transition-all hover:scale-110"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
      )}
    </>
  );
}