"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUp, BrainCircuit, Languages, FileSearch, Linkedin, Globe, Phone, Mail } from "lucide-react";

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

  const features = [
    {
      icon: <BrainCircuit className="w-8 h-8 text-orange-400" />,
      title: "Indic ML Models",
      description: "Purpose-built machine learning models trained specifically on Indic scripts for unmatched recognition accuracy.",
    },
    {
      icon: <Languages className="w-8 h-8 text-orange-400" />,
      title: "Supports 22 Indian Languages",
      description: "Full coverage across all 22 officially recognized Indian languages, from Devanagari to Tamil and beyond.",
    },
    {
      icon: <FileSearch className="w-8 h-8 text-orange-400" />,
      title: "Powerful OCR for Your Documents",
      description: "Extract text from scanned documents, images, and PDFs with high precision powered by IIITH research.",
    },
  ];

  const contacts = [
    {
      icon: <Globe className="w-5 h-5" />,
      href: "https://cvit.iiit.ac.in/",
      label: "Website",
      display: "cvit.iiit.ac.in",
    },
    {
      icon: <Phone className="w-5 h-5" />,
      href: "tel:+914066531255",
      label: "Phone",
      display: "+91-40-6653 1255",
    },
    {
      icon: <Mail className="w-5 h-5" />,
      href: "mailto:cvit@iiit.ac.in",
      label: "Email",
      display: "cvit@iiit.ac.in",
    },
    {
      icon: <Linkedin className="w-5 h-5" />,
      href: "https://www.linkedin.com/company/cvitiiit/",
      label: "LinkedIn",
      display: "linkedin.com/company/cvitiiit",
    },
  ];

  return (
    <>
      {/* HERO SECTION */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden">
        <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" poster="/video/hero-poster.jpg">
          <source src="/video/background.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        <div className="absolute inset-0 bg-black/55 z-10"></div>

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
              Unlock printed documents in any Indian language with AI-powered OCR.
            </p>
          </div>
        </div>
      </section>

      {/* FEATURE CARDS SECTION */}
      <section className="py-16 px-6 bg-black">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            return (
              <div key={index} className="group flex flex-col items-center text-center gap-4 p-8 rounded-2xl bg-gray-900/60 border border-gray-800 hover:border-orange-500/50 hover:bg-gray-900 transition-all duration-300 hover:shadow-lg hover:shadow-orange-900/20 hover:-translate-y-1">
                <div className="p-3 rounded-xl bg-gray-800 group-hover:bg-orange-950 transition-colors duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-950 border-t border-gray-800 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">

          {/* Address - Left */}
          <div className="flex items-center gap-3">
            <img
              src="/lab-icon.jpg"
              alt="Lab icon"
              style={{ width: "50px", height: "50px", objectFit: "contain", flexShrink: 0 }}
            />
            <div className="text-left">
              <p className="text-orange-400 font-semibold text-sm tracking-wide uppercase mb-1">Lab Address</p>
              <p className="text-gray-300 text-sm leading-relaxed">
                CVIT Lab, Kohli Research Block
                <br />
                IIIT Hyderabad
              </p>
            </div>
          </div>

          {/* Contact Links - Right */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3">
            {contacts.map((contact) => (
              <a
                key={contact.label}
                href={contact.href}
                target={contact.href.startsWith("http") ? "_blank" : undefined}
                rel={contact.href.startsWith("http") ? "noopener noreferrer" : undefined}
                aria-label={contact.label}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 border border-gray-700 hover:text-orange-400 hover:border-orange-500/50 hover:bg-gray-800 transition-all duration-200 text-sm"
              >
                {contact.icon}
                <span className="hidden lg:inline">{contact.display}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Bottom line */}
        <div className="max-w-6xl mx-auto mt-6 pt-6 border-t border-gray-800/60 text-center">
          <p className="text-gray-600 text-xs">
            © {new Date().getFullYear()} Vishva Setu · CVIT, IIIT Hyderabad. All rights reserved.
          </p>
        </div>
      </footer>

      {/* SCROLL TO TOP */}
      {showScrollUp && (
        <button onClick={scrollToTop} className="fixed bottom-8 right-8 z-50 p-4 bg-gray-800/90 hover:bg-gray-700 border border-gray-600 rounded-full text-orange-400 shadow-lg transition-all hover:scale-110" aria-label="Scroll to top">
          <ArrowUp className="w-6 h-6" />
        </button>
      )}
    </>
  );
}