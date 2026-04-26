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
  Maximize2,
} from "lucide-react";
import JSZip from "jszip";
import Header from "./components/Header";

type OcrResult =
  | {
      type: "image";
      filename: string;
      html?: string;
      htmlBase64?: string;
      regionsCount?: number;
    }
  | {
      type: "pdf";
      filename: string;
      pagesCount: number;
      html?: string;
    };

function base64ToUtf8(base64: string): string {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder("utf-8").decode(bytes);
  } catch (err) {
    console.error("Base64 → UTF-8 decode failed:", err);
    return "";
  }
}

// Wraps raw OCR HTML in a full document so the iframe renders it cleanly
function buildIframeSrcDoc(html: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  html, body {
    margin: 0; padding: 8px 12px;
    background: transparent;
    color: #e5e7eb;
    font-family: inherit;
    font-size: 13px;
    line-height: 1.6;
    width: 100%;
    box-sizing: border-box;
  }
  * {
    background: transparent !important;
    background-color: transparent !important;
    color: #e5e7eb !important;
    border-color: rgba(255,255,255,0.12) !important;
    box-sizing: border-box;
  }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid rgba(255,255,255,0.12) !important; padding: 4px 8px; }
  p { margin: 0.25rem 0; }
  hr { border-color: rgba(255,255,255,0.15) !important; }
</style>
</head>
<body>${html}</body>
</html>`;
}

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
  const [copiedFileName, setCopiedFileName] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    type: "error" | "warning" | "success";
    visible: boolean;
  } | null>(null);

  /*const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";*/
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://10-4-16-36.nip.io:8003";
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  const ALLOWED_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/pdf",
    "application/zip",
    "application/x-zip-compressed",
  ];

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

  // Close modal on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setIsModalOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = isModalOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isModalOpen]);

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  useEffect(() => {
    if (!previewFile) { setPreviewUrl(null); return; }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (previewFile.type.startsWith("image/") || previewFile.type === "application/pdf") {
      setPreviewUrl(URL.createObjectURL(previewFile));
    } else {
      setPreviewUrl(null);
    }
  }, [previewFile]);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const handleBrowseClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const newFiles: File[] = [];
    const errors: string[] = [];

    Array.from(e.target.files).forEach((file) => {
      const isAllowed = ALLOWED_TYPES.includes(file.type) || file.name.toLowerCase().endsWith(".zip");
      if (!isAllowed) { errors.push(`${file.name}: only JPG, PNG, PDF or ZIP allowed`); return; }
      if (file.size > MAX_FILE_SIZE) { errors.push(`${file.name}: file too large (max 10 MB)`); return; }
      newFiles.push(file);
    });

    if (errors.length) { setError(errors.join(" • ")); setTimeout(() => setError(null), 6000); }
    if (newFiles.length === 0) return;

    setSelectedFiles((prev) => [...prev, ...newFiles]);
    if (!selectedFileName && newFiles.length > 0) {
      const first = newFiles[0];
      setPreviewFile(first);
      setSelectedFileName(first.name);
    }
    e.target.value = "";
  };

  const handleSelectFile = (file: File) => { setPreviewFile(file); setSelectedFileName(file.name); };

  const handleRemoveFile = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const fileToRemove = selectedFiles[index];
    setSelectedFiles((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (selectedFileName === fileToRemove.name) {
        if (updated.length > 0) {
          const next = updated[Math.max(0, index - 1)] ?? updated[0];
          setPreviewFile(next); setSelectedFileName(next.name);
        } else { setPreviewFile(null); setSelectedFileName(null); }
      }
      return updated;
    });
  };

  const handleClearAll = () => {
    setSelectedFiles([]); setPreviewFile(null); setSelectedFileName(null);
    setOcrResults({}); setSuccessMessage(null);
  };

  const handleProcess = useCallback(async () => {
    if (!selectedFiles.length) return;

    if (!selectedLanguage) {
      setToast({ message: "Please select a recognition language", type: "warning", visible: true });
      setTimeout(() => setToast((prev) => (prev?.visible ? { ...prev, visible: false } : null)), 4500);
      return;
    }

    setIsProcessing(true); setError(null); setSuccessMessage(null);

    try {
      const formData = new FormData();
      selectedFiles.forEach((f) => formData.append("files", f));
      formData.append("language", selectedLanguage);

      const res = await fetch(`${API_BASE_URL}/api/ocr/printed`, { method: "POST", body: formData });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const newResults: Record<string, OcrResult> = {};

      for (const r of (data.results ?? [])) {
        const key = r.filename;
        if (r.type === "pdf") {
          let combinedHtml = "";
          if (r.pages && Array.isArray(r.pages)) {
            const htmlParts: string[] = [];
            r.pages.forEach((page: any) => {
              if (page.html_base64) {
                const decoded = base64ToUtf8(page.html_base64);
                if (decoded) htmlParts.push(`<div class="ocr-page" data-page="${page.page || '?'}">\n${decoded}\n</div>`);
              }
            });
            if (htmlParts.length > 0) combinedHtml = htmlParts.join('\n<hr style="margin:2rem 0;opacity:0.3"/>\n');
          }
          newResults[key] = { type: "pdf", filename: key, pagesCount: r.total_pages ?? r.pages?.length ?? 0, html: combinedHtml || undefined };
        } else {
          let decodedHtml = "";
          if (r.html_base64) decodedHtml = base64ToUtf8(r.html_base64);
          newResults[key] = { type: "image", filename: key, html: decodedHtml || undefined, htmlBase64: r.html_base64, regionsCount: r.regions_count };
        }
      }

      setOcrResults((prev) => ({ ...prev, ...newResults }));
      setSuccessMessage(`Processed ${data.file_count ?? data.results?.length ?? selectedFiles.length} file(s)`);
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
    if (!selectedFileName) return;
    const result = ocrResults[selectedFileName];
    if (!result || !result.html) return;
    const filename = `${selectedFileName.replace(/\.[^/.]+$/, "") || "ocr"}.html`;
    const blob = new Blob([result.html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const handleDownloadAll = async () => {
    if (!Object.keys(ocrResults).length) { alert("No results available to download."); return; }
    const zip = new JSZip();
    let hasContent = false;
    Object.entries(ocrResults).forEach(([filename, result]) => {
      const base = filename.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, "_") || "file";
      const safeName = result.type === "pdf" ? base + "_all-pages.html" : base + ".html";
      if (result.html?.trim()) { zip.file(safeName, result.html.trim()); hasContent = true; }
    });
    if (!hasContent) { alert("No valid OCR results to download."); return; }
    try {
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `OCR_Printed_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (err) { console.error(err); alert("Failed to create ZIP file"); }
  };

  const processedCount = Object.keys(ocrResults).length;
  const selectedResult = selectedFileName ? ocrResults[selectedFileName] : null;
  const hasHtml = !!selectedResult?.html?.trim();

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-gradient-to-b from-gray-950 via-gray-925 to-black text-gray-100 font-sans">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 bg-clip-text text-transparent">
              Vishva Setu
            </span>
          </h1>
          <p className="mt-3 text-lg text-gray-400 max-w-2xl mx-auto">
            Extract clean text from scanned documents, books, screenshots, ZIP archives — fast & accurate
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
              onChange={(e) => { setSelectedLanguage(e.target.value); if (toast?.type === "warning") setToast(null); }}
              className={`w-full min-w-[260px] bg-gray-800 border rounded-xl px-5 py-3 text-gray-100 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/40 outline-none transition appearance-none cursor-pointer ${!selectedLanguage ? "border-red-600/70 text-gray-400" : "border-gray-700"}`}
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='7' viewBox='0 0 12 7' fill='none'%3E%3Cpath d='M1 1L6 6L11 1' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 1rem center",
                backgroundSize: "12px",
              }}
            >
              <option value="" disabled>Select language...</option>
              {languages.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
            </select>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 xl:gap-8">

          {/* ── Upload column ── */}
          <div className="lg:col-span-1 bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 flex flex-col shadow-xl shadow-black/30 h-[min(620px,90vh)] overflow-hidden">
            <h2 className="text-2xl font-semibold text-orange-400 mb-6">Upload Here</h2>
            <div className="flex-1 flex flex-col min-h-0">
              <div className={`flex-1 border-2 border-dashed rounded-xl p-8 text-center transition-all ${selectedFiles.length === 0 ? "border-gray-700 hover:border-orange-600/50 bg-gray-950/30" : "border-gray-800 bg-gray-950/20"}`}>
                <Upload className="w-16 h-16 mx-auto mb-5 text-orange-500/80" strokeWidth={1.4} />
                <p className="text-gray-300 mb-2 font-medium">Drop files, ZIPs or click to browse</p>
                <button onClick={handleBrowseClick} className="mt-4 px-8 py-3 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 rounded-xl font-semibold transition shadow-lg shadow-orange-900/30">
                  Select Files / ZIP
                </button>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,application/pdf,.zip,application/zip,application/x-zip-compressed" multiple hidden onChange={handleFileChange} />
                <p className="text-xs text-gray-500 mt-6">JPEG, JPG, PNG, PDF, ZIP archives • max 10 MB per file</p>
              </div>

              {selectedFiles.length > 0 && (
                <div className="mt-6 flex flex-col flex-1 min-h-0">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-300">Files ({selectedFiles.length})</p>
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
                        const hasResult = !!result && !!result.html?.trim();
                        const isZip = file.name.toLowerCase().endsWith(".zip");
                        let icon = <ImageIcon className="w-5 h-5 text-orange-400 flex-shrink-0" />;
                        if (file.type === "application/pdf") icon = <FileText className="w-5 h-5 text-orange-400 flex-shrink-0" />;
                        else if (isZip) icon = <FileText className="w-5 h-5 text-purple-400 flex-shrink-0" />;
                        return (
                          <div key={i} onClick={() => handleSelectFile(file)} className={`group flex items-center gap-3.5 p-3.5 cursor-pointer transition-all duration-200 border-b border-gray-800/50 last:border-b-0 ${selectedFileName === file.name ? "bg-orange-950/40" : "hover:bg-gray-800/40"}`}>
                            {icon}
                            <div className="flex-1 min-w-0">
                              <span className="truncate text-sm font-medium block">{file.name}</span>
                              {isZip && processedCount > 0 && <span className="text-xs text-gray-500">(processed contents available)</span>}
                            </div>
                            {hasResult ? <Check className="w-4 h-4 text-green-400 flex-shrink-0" /> : isProcessing ? <RefreshCw className="w-4 h-4 animate-spin text-yellow-400 flex-shrink-0" /> : null}
                            <button onClick={(e) => handleRemoveFile(i, e)} className="opacity-70 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition p-1 rounded hover:bg-gray-900/60">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="mt-5 flex justify-end">
                    <button onClick={handleClearAll} className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 active:bg-gray-900 text-gray-300 hover:text-white text-sm font-medium rounded-lg border border-gray-700 hover:border-gray-600 transition-all flex items-center gap-2 shadow-sm">
                      <X className="w-4 h-4" /> Clear All
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Preview column ── */}
          <div className="lg:col-span-1 bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 flex flex-col shadow-xl shadow-black/30 h-[min(620px,90vh)] overflow-hidden">
            <h2 className="text-2xl font-semibold text-orange-400 mb-6">Preview</h2>
            <div className="flex-1 bg-black/60 rounded-xl overflow-auto flex items-center justify-center border border-gray-800/80 relative">
              {previewUrl && previewFile?.type.startsWith("image/") ? (
                <img src={previewUrl} alt="Document preview" className="max-w-full max-h-full object-contain" />
              ) : previewUrl && previewFile?.type === "application/pdf" ? (
                <iframe src={previewUrl} title="PDF preview" className="w-full h-full" />
              ) : previewFile && previewFile.name.toLowerCase().endsWith(".zip") ? (
                <div className="text-center text-gray-500">
                  <FileText className="w-24 h-24 mx-auto mb-4 opacity-60" strokeWidth={1.2} />
                  <p className="text-lg font-medium">ZIP file — preview not available</p>
                  <p className="text-sm mt-1.5 opacity-80">{previewFile.name}</p>
                </div>
              ) : previewFile ? (
                <div className="text-center text-gray-500">
                  <FileText className="w-24 h-24 mx-auto mb-4 opacity-60" strokeWidth={1.2} />
                  <p className="text-lg font-medium">No preview available</p>
                  <p className="text-sm mt-1.5 opacity-80">{previewFile.name}</p>
                </div>
              ) : (
                <div className="text-center text-gray-600">
                  <ImageIcon className="w-28 h-28 mx-auto mb-5 opacity-40" strokeWidth={1.2} />
                  <p className="text-lg font-medium">Select a file to preview</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Recognized Content column ── */}
          <div className="lg:col-span-1 bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 flex flex-col shadow-xl shadow-black/30 h-[min(620px,90vh)] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-orange-400">Recognized Content</h2>

              <div className="flex items-center gap-1">
                {/* Copy button */}
                {hasHtml && (
                  <button
                    onClick={() => copyToClipboard(selectedResult!.html!, selectedFileName!)}
                    className="p-2.5 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-orange-400 transition"
                    title="Copy HTML to clipboard"
                  >
                    {copiedFileName === selectedFileName
                      ? <Check className="w-5 h-5 text-green-400" />
                      : <Copy className="w-5 h-5" />}
                  </button>
                )}

                {/* Expand button */}
                <button
                  onClick={() => hasHtml && setIsModalOpen(true)}
                  disabled={!hasHtml}
                  className={`p-2.5 rounded-lg transition ${hasHtml ? "hover:bg-gray-800 text-gray-300 hover:text-orange-400 cursor-pointer" : "text-gray-700 cursor-not-allowed"}`}
                  title={hasHtml ? "Expand to full view" : "No content to expand"}
                >
                  <Maximize2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content box — iframe fills the box, no page scroll bleed-out */}
            <div className="flex-1 bg-gray-950 rounded-xl border border-gray-800/50 overflow-hidden">
              {selectedFileName ? (
                selectedResult ? (
                  hasHtml ? (
                    <iframe
                      srcDoc={buildIframeSrcDoc(selectedResult.html!)}
                      title="OCR output"
                      className="w-full h-full border-0 block"
                      sandbox="allow-same-origin"
                    />
                  ) : selectedResult.type === "pdf" ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-300 px-6">
                      <FileText className="w-16 h-16 mb-6 text-orange-400" />
                      <p className="text-xl font-medium mb-2">PDF Processed</p>
                      <p className="text-sm mb-4 opacity-90">{selectedResult.pagesCount} page(s)</p>
                      <p className="text-xs text-gray-500">HTML layout available — download to view</p>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500 italic text-sm">No content recognized</div>
                  )
                ) : isProcessing ? (
                  <div className="h-full flex items-center justify-center gap-3 text-gray-400">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Recognizing text...</span>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500 italic text-sm">Not processed yet</div>
                )
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 italic text-sm">Select a file to view extracted content</div>
              )}
            </div>
          </div>
        </div>

        {/* Process Button */}
        <div className="mt-12 flex flex-col sm:flex-row justify-center items-center gap-5">
          <button
            onClick={handleProcess}
            disabled={isProcessing || selectedFiles.length === 0}
            className={`min-w-[280px] px-10 py-4 rounded-xl font-semibold text-lg shadow-xl transition-all duration-200 ${isProcessing || !selectedFiles.length ? "bg-gray-800 text-gray-500 cursor-not-allowed" : "bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 hover:shadow-orange-900/40 hover:scale-[1.02] active:scale-100"}`}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-3">
                <RefreshCw className="w-5 h-5 animate-spin" /> Processing...
              </span>
            ) : "Extract Text from All Files"}
          </button>
        </div>

        {/* Results Actions */}
        {processedCount > 0 && (
          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-5 flex-wrap">
            <button
              onClick={handleDownloadSelected}
              disabled={!selectedFileName || !selectedResult?.html}
              className={`min-w-[240px] px-8 py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 border transition-all ${!selectedFileName || !selectedResult?.html ? "bg-gray-700 border-gray-600 text-gray-400 cursor-not-allowed" : "bg-gray-700 border-gray-600 text-gray-100 hover:bg-gray-600 hover:border-gray-500"}`}
            >
              <ArrowDown className="w-4 h-4" />
              Download {selectedResult?.type === "pdf" ? "HTML (all pages)" : "HTML"}
            </button>
            <button
              onClick={handleDownloadAll}
              disabled={processedCount === 0}
              className={`min-w-[240px] px-8 py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg ${processedCount === 0 ? "bg-gray-700 text-gray-400 cursor-not-allowed" : "bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 hover:shadow-orange-900/40 text-white"}`}
            >
              <ArrowDown className="w-4 h-4" /> Download All Results (ZIP)
            </button>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="mt-10 mx-auto max-w-2xl p-5 bg-red-950/60 border border-red-800/60 rounded-xl text-red-200 text-center">{error}</div>
        )}
        {successMessage && (
          <div className="mt-10 mx-auto max-w-2xl p-5 bg-green-950/60 border border-green-800/60 rounded-xl text-green-200 text-center">{successMessage}</div>
        )}
      </div>

      {/* ══════════════════════════════════════════
          EXPAND MODAL — full-page readable view
      ══════════════════════════════════════════ */}
      {isModalOpen && hasHtml && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
          style={{ backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
        >
          <div className="relative w-full max-w-4xl h-[90vh] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-5 h-5 text-orange-400 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-200 truncate">{selectedFileName}</span>
                {selectedResult?.type === "pdf" && (
                  <span className="text-xs px-2 py-0.5 bg-orange-900/50 text-orange-300 rounded-full flex-shrink-0">
                    {(selectedResult as any).pagesCount} pages
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                <button
                  onClick={() => copyToClipboard(selectedResult!.html!, selectedFileName!)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-orange-400 text-xs font-medium transition"
                >
                  {copiedFileName === selectedFileName
                    ? <><Check className="w-4 h-4 text-green-400" /> Copied!</>
                    : <><Copy className="w-4 h-4" /> Copy</>}
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition"
                  title="Close (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal body — scrollable inside the modal, not the page */}
            <div className="flex-1 min-h-0 bg-gray-950 overflow-hidden">
              <iframe
                srcDoc={buildIframeSrcDoc(selectedResult!.html!)}
                title="OCR expanded view"
                className="w-full h-full border-0 block"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast?.visible && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-fade-in">
          <div className={`flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border transition-all duration-300 ${toast.type === "error" ? "bg-red-950/90 border-red-700/70 text-red-200" : toast.type === "warning" ? "bg-amber-950/90 border-amber-700/70 text-amber-200" : "bg-green-950/90 border-green-700/70 text-green-200"}`}>
            <p className="font-medium flex-1">{toast.message}</p>
            <button onClick={() => setToast(null)} className="text-current opacity-70 hover:opacity-100 p-1 rounded hover:bg-black/20 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {showScrollUp && (
        <button onClick={scrollToTop} className="fixed bottom-8 right-6 z-50 p-4 bg-gray-900/90 backdrop-blur border border-gray-700 rounded-full text-orange-400 hover:bg-gray-800 hover:text-orange-300 transition shadow-2xl" aria-label="Back to top">
          <ArrowUp className="w-6 h-6" />
        </button>
      )}
    </main>
  );
}