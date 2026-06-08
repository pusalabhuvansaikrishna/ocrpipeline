"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Upload,
  Image as ImageIcon,
  FileText,
  X,
  ArrowUp,
  Check,
  Download,
} from "lucide-react";
import JSZip from "jszip";
import Header from "./components/Header";
import { BASE_URL } from "@/config/api";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_GUEST_USES = 2;
const GUEST_USES_KEY = "ocr_guest_uses";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png"];

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type OcrResult = {
  type: "image";
  filename: string;
  txtBase64: string;
  txtFilename: string;
  txtSizeBytes: number;
};

type ToastState = {
  message: string;
  type: "error" | "warning" | "success" | "info";
  visible: boolean;
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function base64ToUtf8(base64: string): string {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  } catch (err) {
    console.error("Base64 → UTF-8 decode failed:", err);
    return "";
  }
}

function downloadTxtFile(txtBase64: string, txtFilename: string) {
  const text = base64ToUtf8(txtBase64);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = txtFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getGuestUses(): number {
  try {
    return parseInt(localStorage.getItem(GUEST_USES_KEY) ?? "0", 10);
  } catch {
    return 0;
  }
}

function incrementGuestUses(): void {
  try {
    const current = getGuestUses();
    localStorage.setItem(GUEST_USES_KEY, String(current + 1));
  } catch {}
}

// ─────────────────────────────────────────────
// Login Gate Modal
// ─────────────────────────────────────────────
function LoginGateModal({ onClose, onGoogleLogin }: { onClose: () => void; onGoogleLogin: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-sm bg-gray-900 border border-gray-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-8 pt-8 pb-8 text-center">
          {/* Lock icon */}
          <div className="flex items-center justify-center w-14 h-14 mx-auto mb-5 rounded-2xl bg-orange-950/50 border border-orange-800/40">
            <svg className="w-7 h-7 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V7a4.5 4.5 0 00-9 0v3.5M5 10.5h14a1 1 0 011 1V20a1 1 0 01-1 1H5a1 1 0 01-1-1v-8.5a1 1 0 011-1z" />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-white mb-2">Sign in to continue</h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-8">
            You've reached the guest limit. Log in for more extractions.
          </p>

          {/* Continue with Google */}
          <button
            onClick={onGoogleLogin}
            className="flex items-center justify-center gap-3 w-full px-5 py-3.5 bg-white hover:bg-gray-50 text-gray-800 font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-black/30 hover:shadow-xl hover:shadow-white/20 hover:-translate-y-0.5 active:scale-95 active:shadow-md active:translate-y-0"
          >
            {/* Google SVG logo */}
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>


        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function PrintedOCR() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [languages, setLanguages] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const [showScrollUp, setShowScrollUp] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [ocrResults, setOcrResults] = useState<Record<string, OcrResult>>({});
  const [showLoginGate, setShowLoginGate] = useState(false);
  const [guestUses, setGuestUses] = useState<number>(0);
  const [toast, setToast] = useState<ToastState | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || BASE_URL;

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/google/login`;
  };

  // ── Init ──
  useEffect(() => { setGuestUses(getGuestUses()); }, []);

  useEffect(() => {
    fetch("/languages.csv")
      .then((res) => res.text())
      .then((text) => {
        const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.length > 0) setLanguages(lines);
      })
      .catch((err) => console.error("Failed to load languages.csv", err));
  }, []);

  useEffect(() => {
    const handleScroll = () => setShowScrollUp(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = showLoginGate ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [showLoginGate]);

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  useEffect(() => {
    if (!previewFile) { setPreviewUrl(null); return; }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (previewFile.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(previewFile));
    } else {
      setPreviewUrl(null);
    }
  }, [previewFile]);

  // ── Helpers ──
  const showToast = (message: string, type: ToastState["type"], durationMs = 4500) => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast((prev) => (prev ? { ...prev, visible: false } : null)), durationMs);
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const handleBrowseClick = () => fileInputRef.current?.click();

  // ── File handling ──
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const incoming = Array.from(e.target.files);
    const errors: string[] = [];
    const newFiles: File[] = [];

    const slotsLeft = MAX_FILES - selectedFiles.length;

    if (slotsLeft <= 0) {
      showToast(`You can upload a maximum of ${MAX_FILES} images at a time.`, "warning");
      e.target.value = "";
      return;
    }

    incoming.forEach((file) => {
      const isAllowed = ALLOWED_TYPES.includes(file.type);
      if (!isAllowed) {
        errors.push(`${file.name}: only JPG, JPEG, PNG images allowed`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: exceeds 10 MB limit`);
        return;
      }
      newFiles.push(file);
    });

    const toAdd = newFiles.slice(0, slotsLeft);
    const skipped = newFiles.length - toAdd.length;

    if (errors.length) {
      setError(errors.join(" • "));
      setTimeout(() => setError(null), 6000);
    }

    if (skipped > 0) {
      showToast(
        `Only ${toAdd.length} file(s) added — max ${MAX_FILES} total. ${skipped} file(s) skipped.`,
        "warning"
      );
    }

    if (toAdd.length === 0) { e.target.value = ""; return; }

    setSelectedFiles((prev) => [...prev, ...toAdd]);

    if (!selectedFileName && toAdd.length > 0) {
      setPreviewFile(toAdd[0]);
      setSelectedFileName(toAdd[0].name);
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

  // ── Process ──
  const handleProcess = useCallback(async () => {
    if (!selectedFiles.length) return;

    if (!selectedLanguage) {
      showToast("Please select a recognition language", "warning");
      return;
    }

    const currentUses = getGuestUses();
    if (currentUses >= MAX_GUEST_USES) {
      setShowLoginGate(true);
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      selectedFiles.forEach((f) => formData.append("files", f));
      formData.append("language", selectedLanguage);

      const res = await fetch(`${API_BASE_URL}/api/ocr/printed`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const newResults: Record<string, OcrResult> = {};

      for (const r of data.results ?? []) {
        if (r.error) continue; // skip failed files
        if (r.type === "image" && r.txt_base64) {
          newResults[r.filename] = {
            type: "image",
            filename: r.filename,
            txtBase64: r.txt_base64,
            txtFilename: r.txt_filename,
            txtSizeBytes: r.txt_size_bytes ?? 0,
          };
        }
      }

      setOcrResults((prev) => ({ ...prev, ...newResults }));
      setSuccessMessage(
        `Processed ${data.file_count ?? data.results?.length ?? selectedFiles.length} file(s)`
      );

      incrementGuestUses();
      const newCount = getGuestUses();
      setGuestUses(newCount);

      if (newCount >= MAX_GUEST_USES) {
        showToast("You've used your last free extraction. Log in for unlimited access.", "info", 6000);
      } else if (newCount === MAX_GUEST_USES - 1) {
        showToast(`${MAX_GUEST_USES - newCount} free extraction remaining.`, "info", 5000);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Connection or server error");
      setTimeout(() => setError(null), 6000);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFiles, selectedLanguage, API_BASE_URL]);

  // ── Download all as ZIP ──
  const handleDownloadAll = async () => {
    const entries = Object.values(ocrResults);
    if (!entries.length) { alert("No results available to download."); return; }

    const zip = new JSZip();
    let hasContent = false;

    entries.forEach((result) => {
      const text = base64ToUtf8(result.txtBase64);
      if (text.trim()) {
        zip.file(result.txtFilename, text);
        hasContent = true;
      }
    });

    if (!hasContent) { alert("No valid OCR results to download."); return; }

    try {
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `OCR_Printed_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Failed to create ZIP file");
    }
  };

  // ── Derived state ──
  const processedCount = Object.keys(ocrResults).length;
  const atFileLimit = selectedFiles.length >= MAX_FILES;

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-gradient-to-b from-gray-950 via-gray-925 to-black text-gray-100 font-sans">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.4s ease both; }
      `}</style>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 bg-clip-text text-transparent">
              Vishva Setu
            </span>
          </h1>
          <p className="mt-3 text-lg text-gray-400 max-w-2xl mx-auto">
            Extract clean text from scanned documents, books and screenshots — fast &amp; accurate
          </p>
        </div>

        {/* Language selector */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-6 mb-10">
          <div className="w-full sm:w-auto">
            <label className="block text-sm text-gray-400 mb-1.5">
              Recognition Language <span className="text-red-400">*</span>
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => {
                setSelectedLanguage(e.target.value);
                if (toast?.type === "warning") setToast(null);
              }}
              className={`w-full min-w-[260px] bg-gray-800 border rounded-xl px-5 py-3 text-gray-100 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/40 outline-none transition appearance-none cursor-pointer ${!selectedLanguage ? "border-red-600/70 text-gray-400" : "border-gray-700"}`}
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='7' viewBox='0 0 12 7' fill='none'%3E%3Cpath d='M1 1L6 6L11 1' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 1rem center",
                backgroundSize: "12px",
              }}
            >
              <option value="" disabled>Select language...</option>
              {languages.map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Main grid */}
        <div className={`grid grid-cols-1 gap-6 xl:gap-8 transition-all duration-500 ${processedCount > 0 ? "lg:grid-cols-3" : "lg:grid-cols-1 max-w-xl mx-auto w-full"}`}>

          {/* ── Upload column ── */}
          <div className="lg:col-span-1 bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 flex flex-col shadow-xl shadow-black/30 h-[min(620px,90vh)] overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-orange-400">Upload Here</h2>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${atFileLimit ? "bg-red-950/60 text-red-300 border-red-700/50" : "bg-gray-800 text-gray-400 border-gray-700"}`}>
                {selectedFiles.length} / {MAX_FILES} files
              </span>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
              <div
                className={`flex-1 border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                  atFileLimit
                    ? "border-red-800/40 bg-red-950/10 opacity-60 pointer-events-none"
                    : selectedFiles.length === 0
                    ? "border-gray-700 hover:border-orange-600/50 bg-gray-950/30"
                    : "border-gray-800 bg-gray-950/20"
                }`}
              >
                <Upload className="w-16 h-16 mx-auto mb-5 text-orange-500/80" strokeWidth={1.4} />
                {atFileLimit ? (
                  <>
                    <p className="text-gray-400 mb-2 font-medium">File limit reached</p>
                    <p className="text-xs text-gray-500">Remove a file to add another</p>
                  </>
                ) : (
                  <>
                    <p className="text-gray-300 mb-2 font-medium">Drop images or click to browse</p>
                    <button
                      onClick={handleBrowseClick}
                      className="mt-4 px-8 py-3 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 rounded-xl font-semibold transition shadow-lg shadow-orange-900/30"
                    >
                      Select Images
                    </button>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  multiple
                  hidden
                  onChange={handleFileChange}
                />
                <p className="text-xs text-gray-500 mt-6">
                  JPG, JPEG, PNG • max 10 MB each • up to {MAX_FILES} images
                </p>
              </div>

              {selectedFiles.length > 0 && (
                <div className="mt-6 flex flex-col flex-1 min-h-0">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-300">Images ({selectedFiles.length})</p>
                    {processedCount > 0 && (
                      <span className="text-xs px-2.5 py-1 bg-green-800/50 text-green-300 rounded-full">
                        {processedCount}/{selectedFiles.length} done
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-h-0 rounded-xl border border-gray-800 bg-gray-950/30 overflow-hidden flex flex-col">
                    <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent scrollbar-thumb-rounded-full hover:scrollbar-thumb-gray-500">
                      {selectedFiles.map((file, i) => {
                        const result = ocrResults[file.name];
                        const hasResult = !!result;
                        return (
                          <div
                            key={i}
                            onClick={() => handleSelectFile(file)}
                            className={`group flex items-center gap-3.5 p-3.5 cursor-pointer transition-all duration-200 border-b border-gray-800/50 last:border-b-0 ${selectedFileName === file.name ? "bg-orange-950/40" : "hover:bg-gray-800/40"}`}
                          >
                            <ImageIcon className="w-5 h-5 text-orange-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="truncate text-sm font-medium block">{file.name}</span>
                            </div>
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
                  </div>
                  <div className="mt-5 flex justify-end">
                    <button
                      onClick={handleClearAll}
                      className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 active:bg-gray-900 text-gray-300 hover:text-white text-sm font-medium rounded-lg border border-gray-700 hover:border-gray-600 transition-all flex items-center gap-2 shadow-sm"
                    >
                      <X className="w-4 h-4" /> Clear All
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Preview column ── */}
          {processedCount > 0 && (
          <div className="lg:col-span-1 bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 flex flex-col shadow-xl shadow-black/30 h-[min(620px,90vh)] overflow-hidden animate-fadeIn">
            <h2 className="text-2xl font-semibold text-orange-400 mb-6">Preview</h2>
            <div className="flex-1 bg-black/60 rounded-xl overflow-auto flex items-center justify-center border border-gray-800/80">
              {previewUrl && previewFile?.type.startsWith("image/") ? (
                <img src={previewUrl} alt="Document preview" className="max-w-full max-h-full object-contain" />
              ) : previewFile ? (
                <div className="text-center text-gray-500">
                  <ImageIcon className="w-24 h-24 mx-auto mb-4 opacity-60" strokeWidth={1.2} />
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
          )}

          {/* ── Extracted Text Files column ── */}
          {processedCount > 0 && (
          <div className="lg:col-span-1 bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 flex flex-col shadow-xl shadow-black/30 h-[min(620px,90vh)] overflow-hidden animate-fadeIn">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-orange-400">Extracted Files</h2>
              {processedCount > 0 && (
                <span className="text-xs px-2.5 py-1 bg-green-800/50 text-green-300 rounded-full border border-green-700/40">
                  {processedCount} ready
                </span>
              )}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent scrollbar-thumb-rounded-full hover:scrollbar-thumb-gray-500">
              {processedCount === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-600 px-4">
                  <FileText className="w-20 h-20 mb-4 opacity-30" strokeWidth={1.2} />
                  <p className="text-base font-medium text-gray-500">No files extracted yet</p>
                  <p className="text-sm mt-1.5 text-gray-600">
                    Upload images and click Extract to generate .txt files
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 pr-1">
                  {Object.values(ocrResults).map((result) => (
                    <button
                      key={result.filename}
                      onClick={() => downloadTxtFile(result.txtBase64, result.txtFilename)}
                      className="group w-full flex items-center gap-4 px-4 py-4 bg-gray-800/60 hover:bg-orange-950/40 border border-gray-700/60 hover:border-orange-600/50 rounded-xl transition-all duration-200 text-left"
                    >
                      {/* File icon */}
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-orange-900/30 border border-orange-700/30 group-hover:bg-orange-900/50 group-hover:border-orange-600/50 flex items-center justify-center transition-all">
                        <FileText className="w-5 h-5 text-orange-400" />
                      </div>

                      {/* File info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-200 group-hover:text-white truncate transition-colors">
                          {result.txtFilename}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {result.txtSizeBytes > 0
                            ? `${(result.txtSizeBytes / 1024).toFixed(1)} KB`
                            : "Text file"}
                        </p>
                      </div>

                      {/* Download icon */}
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-700/50 group-hover:bg-orange-600 flex items-center justify-center transition-all duration-200">
                        <Download className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Download all button inside the box when results exist */}
            {processedCount > 1 && (
              <div className="mt-4 pt-4 border-t border-gray-800">
                <button
                  onClick={handleDownloadAll}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-semibold rounded-xl transition shadow-lg shadow-orange-900/20 text-sm"
                >
                  <Download className="w-4 h-4" />
                  Download All as ZIP
                </button>
              </div>
            )}
          </div>
          )}
        </div>
        <div className="mt-12 flex justify-center">
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
                <RefreshCw className="w-5 h-5 animate-spin" /> Processing...
              </span>
            ) : (
              "Process"
            )}
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mt-10 mx-auto max-w-2xl p-5 bg-red-950/60 border border-red-800/60 rounded-xl text-red-200 text-center">{error}</div>
        )}
        {successMessage && (
          <div className="mt-10 mx-auto max-w-2xl p-5 bg-green-950/60 border border-green-800/60 rounded-xl text-green-200 text-center">{successMessage}</div>
        )}
      </div>

      {/* ══ LOGIN GATE MODAL ══ */}
      {showLoginGate && <LoginGateModal onClose={() => setShowLoginGate(false)} onGoogleLogin={handleGoogleLogin} />}

      {/* ══ TOAST ══ */}
      {toast?.visible && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-fade-in">
          <div
            className={`flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border transition-all duration-300 ${
              toast.type === "error"
                ? "bg-red-950/90 border-red-700/70 text-red-200"
                : toast.type === "warning"
                ? "bg-amber-950/90 border-amber-700/70 text-amber-200"
                : toast.type === "info"
                ? "bg-sky-950/90 border-sky-700/70 text-sky-200"
                : "bg-green-950/90 border-green-700/70 text-green-200"
            }`}
          >
            <p className="font-medium flex-1">{toast.message}</p>
            <button
              onClick={() => setToast(null)}
              className="text-current opacity-70 hover:opacity-100 p-1 rounded hover:bg-black/20 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

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