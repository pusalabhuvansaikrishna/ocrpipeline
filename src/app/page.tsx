"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowDown, RefreshCw, Upload, Image as ImageIcon, FileText, X, ArrowUp } from "lucide-react";

export default function Home() {
  const uploadSectionRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  const [languages, setLanguages] = useState<string[]>(["English"]);
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showScrollUp, setShowScrollUp] = useState(false);

  // Load languages from CSV
  useEffect(() => {
    fetch("/languages.csv")
      .then((res) => res.text())
      .then((text) => {
        const lines = text.split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        if (lines.length > 0) {
          setLanguages(lines);
          if (lines.includes("English")) {
            setSelectedLanguage("English");
          } else {
            setSelectedLanguage(lines[0]);
          }
        }
      })
      .catch((err) => console.error("Failed to load languages.csv", err));
  }, []);

  // Show/hide scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollUp(window.scrollY > 400);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToUpload = () => {
    uploadSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);

      const firstNew = newFiles[0];
      if (firstNew.type.startsWith("image/")) {
        setPreviewFile(firstNew);
      }
    }
  };

  useEffect(() => {
    if (previewFile) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);

      if (previewFile.type.startsWith("image/")) {
        const url = URL.createObjectURL(previewFile);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    } else {
      setPreviewUrl(null);
    }

    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewFile]);

  const handleFileClick = (file: File) => {
    setPreviewFile(file);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (previewFile && previewFile === prev[index]) {
        if (updated.length > 0) {
          setPreviewFile(updated[0]);
        } else {
          setPreviewFile(null);
        }
      }
      return updated;
    });
  };

  const isHandWritten = pathname === "/";
  const isPrinted = pathname === "/printed";
  const isSceneText = pathname === "/scene-text";

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black font-league-spartan">
      {/* Hero Section */}
      {isHandWritten && (
        <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center">
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
                <Link href="/signup" className="px-5 py-2 rounded-full border border-gray-700 hover:bg-gray-800 transition">
                  Sign up
                </Link>
                <Link href="/login" className="px-5 py-2 rounded-full bg-orange-600 hover:bg-orange-700 transition font-medium">
                  Login
                </Link>
              </div>
            </div>
          </header>

          <div className="space-y-6 mt-[-4rem]">
            <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tight">
              <span className="text-orange-500">FAST</span>
              <span className="text-orange-600">OC</span>
              <span className="text-orange-500">R</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 font-light tracking-wide">
              A PRODUCT OF IIITH
            </p>
          </div>

          <button
            onClick={scrollToUpload}
            className="mt-16 group relative inline-flex items-center gap-3 px-8 py-4 bg-orange-600 hover:bg-orange-700 rounded-full text-lg font-semibold transition-all shadow-xl shadow-orange-900/40 hover:shadow-orange-700/50 hover:scale-105 active:scale-95"
          >
            Try now
            <ArrowDown className="w-5 h-5 group-hover:translate-y-1 transition-transform" />
          </button>

          <div className="absolute bottom-0 right-0 w-3/5 h-3/5 bg-gradient-to-tl from-orange-600/20 via-transparent to-transparent opacity-70 pointer-events-none" />
        </section>
      )}

      <section ref={uploadSectionRef} className="min-h-screen flex items-center justify-center px-6 py-20 bg-gradient-to-b from-black to-gray-950">
        <div className="w-full max-w-6xl">
          {/* Tabs */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex bg-gray-900/80 backdrop-blur border border-gray-800 rounded-full p-1.5">
              <Link
                href="/"
                className={`px-6 py-2.5 text-sm font-medium rounded-full transition-all ${
                  isHandWritten ? "bg-orange-600 text-white shadow-md" : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                Hand Written
              </Link>
              <Link
                href="/printed"
                className={`px-6 py-2.5 text-sm font-medium rounded-full transition-all ${
                  isPrinted ? "bg-orange-600 text-white shadow-md" : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                Printed
              </Link>
              <Link
                href="/scene-text"
                className={`px-6 py-2.5 text-sm font-medium rounded-full transition-all ${
                  isSceneText ? "bg-orange-600 text-white shadow-md" : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                Scene Text
              </Link>
            </div>
          </div>

          {/* Language Dropdown */}
          <div className="flex justify-center mb-10">
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="
                w-full max-w-xs
                bg-gray-900 border border-gray-700 rounded-lg
                px-5 py-3 text-gray-200
                focus:outline-none focus:border-orange-600
                appearance-none cursor-pointer
                text-center
                bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iNyIgdmlld0JveD0iMCAwIDEyIDciIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMUw2IDZMNTEgNiIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+')]
                bg-no-repeat bg-[right_1rem_center] bg-[length:12px_7px]
              "
            >
              {languages.map((lang) => (
                <option key={lang} value={lang} className="text-center">
                  {lang}
                </option>
              ))}
            </select>
          </div>

          {isHandWritten && (
            <>
              <div className="flex flex-col md:flex-row gap-8 items-stretch">
                {/* Upload area */}
                <div className="flex-1 bg-gray-900/50 border border-gray-800 rounded-2xl p-8 flex flex-col items-center text-center min-h-[380px] relative overflow-hidden group hover:border-orange-700/50 transition-colors">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                  <div className="w-20 h-20 rounded-full bg-orange-900/30 flex items-center justify-center mb-6">
                    <Upload className="w-10 h-10 text-orange-500" />
                  </div>

                  <h3 className="text-2xl font-bold text-orange-500 mb-3">Upload Image</h3>
                  <p className="text-gray-400 mb-2">or drop file(s)</p>
                  <p className="text-sm text-gray-500 mb-8">Supports: jpg, jpeg, png, pdf</p>

                  <button
                    onClick={handleBrowseClick}
                    className="px-8 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-medium transition shadow-lg shadow-orange-900/30"
                  >
                    Browse files
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,application/pdf"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {selectedFiles.length > 0 && (
                    <div className="mt-8 w-full text-left">
                      <p className="text-sm text-gray-400 mb-3">Selected files:</p>
                      <ul className="text-sm text-gray-300 space-y-2 max-h-48 overflow-y-auto pr-2">
                        {selectedFiles.map((file, idx) => (
                          <li
                            key={idx}
                            className={`flex items-center justify-between gap-3 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                              previewFile === file ? "bg-orange-900/40 border border-orange-600/50" : "hover:bg-gray-800/50"
                            }`}
                            onClick={() => handleFileClick(file)}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {file.type.startsWith("image/") ? (
                                <ImageIcon className="w-5 h-5 text-orange-400 flex-shrink-0" />
                              ) : (
                                <FileText className="w-5 h-5 text-orange-400 flex-shrink-0" />
                              )}
                              <span className="truncate">{file.name}</span>
                              <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFile(idx);
                              }}
                              className="text-gray-400 hover:text-red-400 transition-colors p-1 rounded-full hover:bg-gray-700/50"
                              title="Remove file"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedFiles.length === 0 && (
                    <p className="mt-10 text-gray-600 italic">No Uploaded Files Yet</p>
                  )}
                </div>

                {/* Preview area */}
                <div className="flex-1 bg-gray-900/30 border border-gray-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center min-h-[380px] relative overflow-hidden">
                  {previewUrl && previewFile?.type.startsWith("image/") ? (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-w-full max-h-[320px] object-contain rounded"
                    />
                  ) : previewFile && previewFile.type === "application/pdf" ? (
                    <div className="flex flex-col items-center text-gray-500">
                      <FileText className="w-24 h-24 mb-4" />
                      <p className="text-lg">PDF selected – Preview not available</p>
                      <p className="text-sm mt-2">{previewFile.name}</p>
                    </div>
                  ) : (
                    <>
                      <div className="absolute inset-0 flex items-center justify-center opacity-40 pointer-events-none">
                        <ImageIcon className="w-32 h-32 text-gray-700" />
                      </div>
                      <p className="text-xl text-gray-500 z-10">
                        Click a file on the left to preview
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Process and Up buttons - stacked vertically */}
              <div className="mt-10 flex flex-col items-center gap-6">
                <button className="px-12 py-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 rounded-xl text-lg font-semibold shadow-xl shadow-orange-900/40 transition-all hover:scale-105 active:scale-95">
                  Process
                </button>

                <button
                  onClick={scrollToTop}
                  className={`px-6 py-4 bg-gray-800/80 hover:bg-gray-700 border border-gray-600 rounded-full text-orange-400 transition-all duration-300 shadow-lg hover:shadow-orange-900/40 hover:scale-110 active:scale-95 ${
                    showScrollUp ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
                  }`}
                  aria-label="Scroll to top"
                >
                  <ArrowUp className="w-6 h-6" />
                </button>
              </div>
            </>
          )}

          {isPrinted && (
            <div className="text-center py-16">
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-12 max-w-2xl mx-auto">
                <h2 className="text-3xl font-bold text-orange-500 mb-6">Printed Text Mode</h2>
                <p className="text-xl text-gray-300 mb-10">Please use this for Printed documents and clear scanned text.</p>
                <Link
                  href="/printed-tool"
                  className="inline-block px-10 py-5 bg-orange-600 hover:bg-orange-700 rounded-xl text-xl font-semibold shadow-xl shadow-orange-900/40 transition-all hover:scale-105"
                >
                  Start Printed OCR →
                </Link>
              </div>
            </div>
          )}

          {isSceneText && (
            <div className="text-center py-16">
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-12 max-w-2xl mx-auto">
                <h2 className="text-3xl font-bold text-orange-500 mb-6">Scene Text Mode</h2>
                <p className="text-xl text-gray-300 mb-10">Please use this for text in natural scenes, signs, posters, etc.</p>
                <Link
                  href="/scene-tool"
                  className="inline-block px-10 py-5 bg-orange-600 hover:bg-orange-700 rounded-xl text-xl font-semibold shadow-xl shadow-orange-900/40 transition-all hover:scale-105"
                >
                  Start Scene Text OCR →
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}