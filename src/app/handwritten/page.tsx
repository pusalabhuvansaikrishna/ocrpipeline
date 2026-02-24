"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import {
  ArrowDown,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  FileText,
  X,
  ArrowUp,
  Copy,
  Check,
} from "lucide-react";
import JSZip from "jszip";

export default function HandwrittenOCR() {
  const uploadSectionRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [languages, setLanguages] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(""); // empty by default
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const [showScrollUp, setShowScrollUp] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showLanguageWarning, setShowLanguageWarning] = useState(false);

  const [ocrResults, setOcrResults] = useState<Record<string, string>>({});
  const [copiedFileName, setCopiedFileName] = useState<string | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
  const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png"];

  // Load languages – no default selection
  useEffect(() => {
    fetch("/languages.csv")
      .then((res) => res.text())
      .then((text) => {
        const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.length > 0) {
          setLanguages(lines);
        }
      })
      .catch((err) => console.error("Failed to load languages.csv", err));
  }, []);

  // Scroll → show ↑ button
  useEffect(() => {
    const handleScroll = () => setShowScrollUp(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!previewFile) {
      setPreviewUrl(null);
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(previewFile.type.startsWith("image/") ? URL.createObjectURL(previewFile) : null);
  }, [previewFile]);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const handleBrowseClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const newFiles: File[] = [];
    const errors: string[] = [];

    Array.from(e.target.files).forEach((file) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: only jpg/png allowed`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: too large (max 10 MB)`);
        return;
      }
      newFiles.push(file);
    });

    if (errors.length) {
      setError(errors.join(" • "));
      setTimeout(() => setError(null), 5000);
      return;
    }

    setSelectedFiles((prev) => [...prev, ...newFiles]);

    if (!selectedFileName && newFiles.length > 0) {
      const first = newFiles[0];
      setPreviewFile(first);
      setSelectedFileName(first.name);
    }

    e.target.value = "";
  };

  const handleSelectFile = (file: File) => {
    setPreviewFile(file);
    setSelectedFileName(file.name);
  };

  const handleRemoveFile = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const fileToRemove = selectedFiles[index];

    setSelectedFiles((prev) => {
      const updated = prev.filter((_, i) => i !== index);

      if (selectedFileName === fileToRemove.name) {
        if (updated.length > 0) {
          const next = updated[Math.max(0, index - 1)] ?? updated[0];
          setPreviewFile(next);
          setSelectedFileName(next.name);
        } else {
          setPreviewFile(null);
          setSelectedFileName(null);
        }
      }
      return updated;
    });
  };

  const handleClearAll = () => {
    setSelectedFiles([]);
    setPreviewFile(null);
    setSelectedFileName(null);
    setOcrResults({});
    setSuccessMessage(null);
  };

  const handleProcess = useCallback(async () => {
    if (!selectedFiles.length) return;

    if (!selectedLanguage) {
      setShowLanguageWarning(true);
      setTimeout(() => setShowLanguageWarning(false), 4000);
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);
    setShowLanguageWarning(false);

    try {
      const formData = new FormData();
      selectedFiles.forEach((f) => formData.append("files", f));
      formData.append("language", selectedLanguage);

      const res = await fetch(`${API_BASE_URL}/api/ocr/handwritten`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const newResults = (data.results ?? []).reduce(
        (acc: Record<string, string>, r: { filename: string; text: string }) => {
          acc[r.filename] = r.text ?? "";
          return acc;
        },
        {}
      );

      setOcrResults((prev) => ({ ...prev, ...newResults }));
      setSuccessMessage(`Processed ${data.count ?? selectedFiles.length} file(s)`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Connection or server error");
      setTimeout(() => setError(null), 6000);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFiles, selectedLanguage, API_BASE_URL]);

  const copyToClipboard = (text: string, filename: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedFileName(filename);
      setTimeout(() => setCopiedFileName(null), 1800);
    });
  };

  const handleDownloadSelected = () => {
    if (!selectedFileName || !ocrResults[selectedFileName]?.trim()) return;
    const text = ocrResults[selectedFileName]!;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedFileName.replace(/\.[^/.]+$/, "") || "text"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = async () => {
    if (!Object.keys(ocrResults).length) return;

    const zip = new JSZip();
    let hasContent = false;

    selectedFiles.forEach((file) => {
      const name = file.name;
      const base = name.replace(/\.[^/.]+$/, "") || "file";
      const safeName = base.replace(/[^a-zA-Z0-9-_]/g, "_") + ".txt";
      const text = ocrResults[name]?.trim() || "";
      if (text) {
        zip.file(safeName, text);
        hasContent = true;
      }
    });

    if (!hasContent) {
      alert("No extracted text available to download.");
      return;
    }

    try {
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FAST_OCR_Handwritten_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("ZIP creation failed");
    }
  };

  const processedCount = Object.keys(ocrResults).length;

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-925 to-black text-gray-100 font-sans">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-10 md:py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 bg-clip-text text-transparent">
              Handwritten Text OCR
            </span>
          </h1>
          <p className="mt-3 text-lg text-gray-400 max-w-2xl mx-auto">
            Extract text from notes, letters, forms, cursive writing, diaries — handwritten content
          </p>
        </div>

        {/* Language selector + warning */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-6 mb-10 relative">
          <div className="w-full sm:w-auto">
            <label className="block text-sm text-gray-400 mb-1.5">
              Recognition Language <span className="text-red-400">*</span>
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => {
                setSelectedLanguage(e.target.value);
                setShowLanguageWarning(false);
              }}
              className={`w-full min-w-[260px] bg-gray-800 border rounded-xl px-5 py-3 text-gray-100 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/40 outline-none transition appearance-none cursor-pointer ${
                !selectedLanguage ? "border-red-600/70 text-gray-400" : "border-gray-700"
              }`}
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='7' viewBox='0 0 12 7' fill='none'%3E%3Cpath d='M1 1L6 6L11 1' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 1rem center",
                backgroundSize: "12px",
              }}
            >
              <option value="" disabled>
                Select language...
              </option>
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>

          {showLanguageWarning && (
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 bg-red-900/80 border border-red-700/70 text-red-200 px-6 py-3 rounded-xl text-sm font-medium shadow-lg animate-fade-in-out pointer-events-none">
              Please select a language before processing
            </div>
          )}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 xl:gap-8">
          {/* Upload column */}
          <div className="lg:col-span-1 bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 flex flex-col shadow-xl shadow-black/30 h-[min(620px,90vh)]">
            <h2 className="text-2xl font-semibold text-orange-400 mb-6">Upload Images</h2>

            <div className="flex-1 flex flex-col">
              <div
                className={`flex-1 border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                  selectedFiles.length === 0
                    ? "border-gray-700 hover:border-orange-600/50 bg-gray-950/30"
                    : "border-gray-800 bg-gray-950/20"
                }`}
              >
                <Upload className="w-16 h-16 mx-auto mb-5 text-orange-500/80" strokeWidth={1.4} />
                <p className="text-gray-300 mb-2 font-medium">Drop files or click to browse</p>
                <button
                  onClick={handleBrowseClick}
                  className="mt-4 px-8 py-3 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 rounded-xl font-semibold transition shadow-lg shadow-orange-900/30"
                >
                  Select Files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  multiple
                  hidden
                  onChange={handleFileChange}
                />
                <p className="text-xs text-gray-500 mt-6">JPEG, JPG, PNG • max 10 MB per file</p>
              </div>

              {selectedFiles.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-300">Files ({selectedFiles.length})</p>
                    {processedCount > 0 && (
                      <span className="text-xs px-2.5 py-1 bg-green-800/50 text-green-300 rounded-full">
                        {processedCount}/{selectedFiles.length} done
                      </span>
                    )}
                  </div>

                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900/40">
                    {selectedFiles.map((file, i) => {
                      const active = selectedFileName === file.name;
                      const hasResult = !!ocrResults[file.name]?.trim();

                      return (
                        <div
                          key={i}
                          onClick={() => handleSelectFile(file)}
                          className={`group flex items-center gap-3.5 p-3.5 rounded-xl cursor-pointer transition-all duration-200 border ${
                            active
                              ? "bg-orange-950/40 border-orange-600/60 shadow-sm"
                              : "bg-gray-800/40 border-gray-800 hover:bg-gray-800/70 hover:border-gray-700"
                          }`}
                        >
                          {file.type.startsWith("image/") ? (
                            <ImageIcon className="w-5 h-5 text-orange-400 flex-shrink-0" />
                          ) : (
                            <FileText className="w-5 h-5 text-orange-400 flex-shrink-0" />
                          )}
                          <span className="truncate flex-1 text-sm font-medium">{file.name}</span>

                          {hasResult ? (
                            <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                          ) : isProcessing ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-yellow-400 flex-shrink-0" />
                          ) : null}

                          <button
                            onClick={(e) => handleRemoveFile(i, e)}
                            className="opacity-70 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition p-1 rounded hover:bg-gray-900/60"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-5 flex justify-end">
                    <button
                      onClick={handleClearAll}
                      className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 active:bg-gray-900 text-gray-300 hover:text-white text-sm font-medium rounded-lg border border-gray-700 hover:border-gray-600 transition-all flex items-center gap-2 shadow-sm"
                    >
                      <X className="w-4 h-4" />
                      Clear All
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="lg:col-span-1 bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 flex flex-col shadow-xl shadow-black/30 h-[min(620px,90vh)]">
            <h2 className="text-2xl font-semibold text-orange-400 mb-6">Preview</h2>
            <div className="flex-1 bg-black/60 rounded-xl overflow-hidden flex items-center justify-center border border-gray-800/80 relative">
              {previewUrl && previewFile?.type.startsWith("image/") ? (
                <img
                  src={previewUrl}
                  alt="Handwritten document preview"
                  className="max-w-full max-h-full object-contain"
                />
              ) : previewFile ? (
                <div className="text-center text-gray-500">
                  <FileText className="w-24 h-24 mx-auto mb-4 opacity-60" strokeWidth={1.2} />
                  <p className="text-lg font-medium">No preview available</p>
                  <p className="text-sm mt-1.5 opacity-80">{previewFile.name}</p>
                </div>
              ) : (
                <div className="text-center text-gray-600">
                  <ImageIcon className="w-28 h-28 mx-auto mb-5 opacity-40" strokeWidth={1.2} />
                  <p className="text-lg font-medium">Select an image to preview</p>
                </div>
              )}
            </div>
          </div>

          {/* Extracted Text */}
          <div className="lg:col-span-1 bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 flex flex-col shadow-xl shadow-black/30 h-[min(620px,90vh)]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-orange-400">Recognized Text</h2>

              {selectedFileName && ocrResults[selectedFileName]?.trim() && (
                <div className="relative">
                  <button
                    onClick={() => copyToClipboard(ocrResults[selectedFileName]!, selectedFileName)}
                    className="p-2.5 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-orange-400 transition"
                    title="Copy to clipboard"
                  >
                    {copiedFileName === selectedFileName ? (
                      <Check className="w-5 h-5 text-green-400" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 bg-gray-950/70 rounded-xl p-5 overflow-auto font-mono text-sm leading-relaxed border border-gray-800/70 whitespace-pre-wrap break-words">
              {selectedFileName ? (
                ocrResults[selectedFileName] ? (
                  ocrResults[selectedFileName].trim() ? (
                    ocrResults[selectedFileName]
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500 italic">
                      No text was recognized in this image
                    </div>
                  )
                ) : isProcessing ? (
                  <div className="h-full flex items-center justify-center gap-3 text-gray-400">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Recognizing text...</span>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500 italic">
                    Not processed yet
                  </div>
                )
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 italic">
                  Select an image to view extracted text
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Process Button */}
        <div className="mt-12 flex flex-col sm:flex-row justify-center items-center gap-5">
          <button
            onClick={handleProcess}
            disabled={isProcessing || selectedFiles.length === 0}
            className={`min-w-[280px] px-10 py-4 rounded-xl font-semibold text-lg shadow-xl transition-all duration-200 ${
              isProcessing || !selectedFiles.length
                ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 hover:shadow-orange-900/40 hover:scale-[1.02] active:scale-100"
            }`}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-3">
                <RefreshCw className="w-5 h-5 animate-spin" />
                Processing...
              </span>
            ) : (
              "Extract Text from All Images"
            )}
          </button>
        </div>

        {/* Results Actions */}
        {processedCount > 0 && (
          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-5">
            <button
              onClick={handleDownloadSelected}
              disabled={!selectedFileName || !ocrResults[selectedFileName]?.trim()}
              className={`min-w-[240px] px-8 py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 border transition-all ${
                !selectedFileName || !ocrResults[selectedFileName]?.trim()
                  ? "bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-100 hover:border-gray-500"
              }`}
            >
              <ArrowDown className="w-4 h-4" />
              Download Selected (.txt)
            </button>

            <button
              onClick={handleDownloadAll}
              disabled={processedCount === 0}
              className={`min-w-[240px] px-8 py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg ${
                processedCount === 0
                  ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 hover:shadow-orange-900/40"
              }`}
            >
              <ArrowDown className="w-4 h-4" />
              Download All Results (ZIP)
            </button>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="mt-10 mx-auto max-w-2xl p-5 bg-red-950/60 border border-red-800/60 rounded-xl text-red-200 text-center">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mt-10 mx-auto max-w-2xl p-5 bg-green-950/60 border border-green-800/60 rounded-xl text-green-200 text-center">
            {successMessage}
          </div>
        )}
      </div>

      {showScrollUp && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-6 z-50 p-4 bg-gray-900/90 backdrop-blur border border-gray-700 rounded-full text-orange-400 hover:bg-gray-800 hover:text-orange-300 transition shadow-2xl"
          aria-label="Back to top"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
      )}
    </main>
  );
}