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
} from "lucide-react";
import JSZip from "jszip";

export default function PrintedOCR() {
  const uploadSectionRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [languages, setLanguages] = useState<string[]>(["English"]);
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [showScrollUp, setShowScrollUp] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [ocrResults, setOcrResults] = useState<Record<string, string>>({});
  const [copiedFileName, setCopiedFileName] = useState<string | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
  const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png"];

  // ────────────────────────────────────────────────
  //  Load languages
  // ────────────────────────────────────────────────
  useEffect(() => {
    fetch("/languages.csv")
      .then((res) => res.text())
      .then((text) => {
        const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.length > 0) {
          setLanguages(lines);
          setSelectedLanguage(lines.includes("English") ? "English" : lines[0]);
        }
      })
      .catch((err) => console.error("Failed to load languages.csv", err));
  }, []);

  // ────────────────────────────────────────────────
  //  Scroll → show ↑ button
  // ────────────────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => setShowScrollUp(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ────────────────────────────────────────────────
  //  Clean up object URLs
  // ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (previewFile) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (previewFile.type.startsWith("image/")) {
        setPreviewUrl(URL.createObjectURL(previewFile));
      } else {
        setPreviewUrl(null);
      }
    } else {
      setPreviewUrl(null);
    }
  }, [previewFile]);

  // ────────────────────────────────────────────────
  //  Handlers
  // ────────────────────────────────────────────────
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles: File[] = [];
    const errors: string[] = [];

    Array.from(e.target.files).forEach((file) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: Unsupported file type`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File too large (max 10 MB)`);
        return;
      }
      newFiles.push(file);
    });

    if (errors.length > 0) {
      setError(errors.join("; "));
      return;
    }

    setSelectedFiles((prev) => [...prev, ...newFiles]);

    if (!selectedFileName && newFiles.length > 0) {
      const first = newFiles[0];
      setPreviewFile(first);
      setSelectedFileName(first.name);
    }
  };

  const handleSelectFile = (file: File) => {
    setPreviewFile(file);
    setSelectedFileName(file.name);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => {
      const fileToRemove = prev[index];
      const updated = prev.filter((_, i) => i !== index);

      if (selectedFileName === fileToRemove.name) {
        if (updated.length > 0) {
          const newSelected = updated[0];
          setPreviewFile(newSelected);
          setSelectedFileName(newSelected.name);
        } else {
          setPreviewFile(null);
          setSelectedFileName(null);
        }
      }
      return updated;
    });
  };

  const handleProcess = useCallback(async () => {
    if (selectedFiles.length === 0) return;
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append("files", file));
      formData.append("language", selectedLanguage);

      const response = await fetch(`${API_BASE_URL}/api/ocr/handwritten`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server error ${response.status}`);
      }

      const data = await response.json();
      const newResults = (data.results || []).reduce(
        (acc: Record<string, string>, r: { filename: string; text: string }) => {
          acc[r.filename] = r.text || "";
          return acc;
        },
        {} as Record<string, string>
      );

      setOcrResults((prev) => ({ ...prev, ...newResults }));
      setSuccessMessage(`Processed ${data.count || selectedFiles.length} handwritten document(s) successfully`);

      if (!selectedFileName && selectedFiles.length > 0) {
        setSelectedFileName(selectedFiles[0].name);
        setPreviewFile(selectedFiles[0]);
      }
    } catch (err: any) {
      console.error("OCR failed:", err);
      setError(err.message || "Failed to connect to OCR service.");
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFiles, selectedLanguage, selectedFileName]);

  const copyToClipboard = (text: string, filename: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFileName(filename);
    setTimeout(() => setCopiedFileName(null), 1800);
  };

  const handleDownloadSelected = () => {
    if (!selectedFileName || !ocrResults[selectedFileName]?.trim()) return;
    const text = ocrResults[selectedFileName]!;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedFileName.replace(/\.[^/.]+$/, "") || "extracted"}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = async () => {
    if (Object.keys(ocrResults).length === 0) return;

    const zip = new JSZip();
    let hasContent = false;

    selectedFiles.forEach((file) => {
      const filename = file.name;
      const baseName = filename.replace(/\.[^/.]+$/, "") || "file";
      const safeName = baseName.replace(/[^a-zA-Z0-9-_]/g, "_") + ".txt";
      const text = ocrResults[filename]?.trim() || "[No text extracted]";
      zip.file(safeName, text);
      if (text !== "[No text extracted]") hasContent = true;
    });

    if (!hasContent) {
      alert("No meaningful extracted text to include in ZIP.");
      return;
    }

    try {
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `FASTOCR_Handwritten_Results_${new Date().toISOString().slice(0, 10)}.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("ZIP generation failed:", err);
      alert("Failed to create ZIP file.");
    }
  };

  // ────────────────────────────────────────────────
  //  Render
  // ────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black font-league-spartan">
      <section className="py-16 md:py-20 px-6 bg-gradient-to-b from-black to-gray-950">
        <div className="max-w-7xl mx-auto">

          <h1 className="text-3xl md:text-4xl font-bold text-orange-400 text-center mb-10 tracking-tight">
            Hand Written
          </h1>

          <div className="flex justify-center mb-10">
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full max-w-xs bg-gray-900 border border-gray-700 rounded-lg px-5 py-3 text-gray-200 focus:outline-none focus:border-orange-600 appearance-none cursor-pointer text-center bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iNyIgdmlld0JveD0iMCAwIDEyIDciIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMUw2IDZMNTEgNiIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+')] bg-no-repeat bg-[right_1rem_center] bg-[length:12px_7px]"
            >
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Upload + File List */}
            <div className="bg-gray-900/60 border border-gray-700 rounded-2xl p-6 flex flex-col h-[540px]">
              <h3 className="text-xl font-bold text-orange-400 mb-5">Upload Files</h3>
              <div className="flex-1 flex flex-col">
                <div className="flex-1 flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-700 rounded-xl p-8 hover:border-orange-600/60 transition-colors">
                  <Upload className="w-14 h-14 text-orange-500 mb-4" />
                  <p className="text-gray-300 mb-2">Drop files here or</p>
                  <button
                    onClick={handleBrowseClick}
                    className="px-8 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-medium transition"
                  >
                    Browse files
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <p className="text-xs text-gray-500 mt-5">jpg, jpeg, png • max 10 MB</p>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="mt-6">
                    <p className="text-sm text-gray-400 mb-3">Selected files:</p>
                    <div className="max-h-[200px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800/50">
                      <div className="space-y-2">
                        {selectedFiles.map((file, idx) => {
                          const isActive = selectedFileName === file.name;
                          return (
                            <div
                              key={idx}
                              onClick={() => handleSelectFile(file)}
                              className={`p-3 rounded-lg cursor-pointer flex items-center justify-between gap-3 transition-all flex-shrink-0 ${
                                isActive
                                  ? "bg-orange-900/50 border border-orange-600/60"
                                  : "bg-gray-800/40 hover:bg-gray-800/70"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                {file.type.startsWith("image/") ? (
                                  <ImageIcon className="w-5 h-5 text-orange-400 flex-shrink-0" />
                                ) : (
                                  <FileText className="w-5 h-5 text-orange-400 flex-shrink-0" />
                                )}
                                <span className="truncate text-sm">{file.name}</span>
                                {ocrResults[file.name]?.trim() ? (
                                  <span className="ml-auto text-xs px-2 py-0.5 bg-green-800/60 text-green-300 rounded-full flex-shrink-0">
                                    Done
                                  </span>
                                ) : isProcessing ? (
                                  <span className="ml-auto text-xs px-2 py-0.5 bg-yellow-800/60 text-yellow-300 rounded-full animate-pulse flex-shrink-0">
                                    Processing...
                                  </span>
                                ) : null}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveFile(idx);
                                }}
                                className="text-gray-400 hover:text-red-400 p-1 rounded hover:bg-gray-700/60 flex-shrink-0"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Preview */}
            <div className="bg-gray-900/60 border border-gray-700 rounded-2xl p-6 flex flex-col h-[540px]">
              <h3 className="text-xl font-bold text-orange-400 mb-5">Preview</h3>
              <div className="flex-1 flex items-center justify-center bg-black/40 rounded-xl overflow-hidden">
                {previewUrl && previewFile?.type.startsWith("image/") ? (
                  <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
                ) : previewFile ? (
                  <div className="text-center text-gray-500">
                    <FileText className="w-24 h-24 mx-auto mb-4 opacity-70" />
                    <p className="text-lg">Preview not available</p>
                    <p className="text-sm mt-2">{previewFile.name}</p>
                  </div>
                ) : (
                  <div className="text-center text-gray-600">
                    <ImageIcon className="w-28 h-28 mx-auto mb-4 opacity-40" />
                    <p className="text-lg">Select a file to preview</p>
                  </div>
                )}
              </div>
            </div>

            {/* Extracted Text */}
            <div className="bg-gray-900/60 border border-gray-700 rounded-2xl p-6 flex flex-col h-[540px]">
              <div className="flex justify-between items-center mb-5 relative">
                <h3 className="text-xl font-bold text-orange-400">Extracted Text</h3>
                {selectedFileName &&
                  ocrResults[selectedFileName] &&
                  ocrResults[selectedFileName].trim() !== "" && (
                    <div className="relative">
                      <button
                        onClick={() => copyToClipboard(ocrResults[selectedFileName]!, selectedFileName)}
                        className="text-gray-400 hover:text-orange-400 transition p-2 rounded hover:bg-gray-800/60 group"
                        title="Copy to clipboard"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                      {copiedFileName === selectedFileName && (
                        <div className="absolute -top-10 right-0 bg-orange-600 text-white text-xs px-3 py-1.5 rounded-md shadow-lg whitespace-nowrap animate-fade-in-out pointer-events-none">
                          Copied!
                        </div>
                      )}
                    </div>
                  )}
              </div>

              <div className="flex-1 bg-black/50 rounded-xl p-5 overflow-auto font-mono text-sm whitespace-pre-wrap break-words leading-relaxed border border-gray-800">
                {selectedFileName ? (
                  ocrResults[selectedFileName] ? (
                    ocrResults[selectedFileName].trim() === "" ? (
                      <div className="h-full flex items-center justify-center text-gray-500 italic">
                        No text extracted from this file
                      </div>
                    ) : (
                      ocrResults[selectedFileName]
                    )
                  ) : isProcessing ? (
                    <div className="h-full flex items-center justify-center text-gray-500">Processing...</div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500 italic">
                      Not yet processed
                    </div>
                  )
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500 italic">
                    Select a file to see extracted text
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-10 flex justify-center">
            <button
              onClick={handleProcess}
              disabled={isProcessing || selectedFiles.length === 0}
              className={`px-12 py-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 rounded-xl text-lg font-semibold shadow-xl shadow-orange-900/40 transition-all hover:scale-105 min-w-[260px] ${
                isProcessing || selectedFiles.length === 0 ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-3">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Processing...
                </span>
              ) : (
                "Extract Handwritten Text from All Files"
              )}
            </button>
          </div>

          {successMessage && Object.keys(ocrResults).length > 0 && (
            <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-6">
              <button
                onClick={handleDownloadSelected}
                disabled={!selectedFileName || !ocrResults[selectedFileName]?.trim()}
                className={`px-8 py-3 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-gray-200 rounded-xl text-base font-semibold shadow-lg shadow-gray-900/40 transition-all hover:scale-105 flex items-center gap-2 min-w-[220px] justify-center border border-gray-600 ${
                  !selectedFileName || !ocrResults[selectedFileName]?.trim() ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <ArrowDown className="w-5 h-5" />
                Download Selected (.txt)
              </button>

              <button
                onClick={handleDownloadAll}
                disabled={Object.keys(ocrResults).length === 0}
                className={`px-8 py-3 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 rounded-xl text-base font-semibold shadow-lg shadow-orange-900/40 transition-all hover:scale-105 flex items-center gap-2 min-w-[220px] justify-center text-white ${
                  Object.keys(ocrResults).length === 0 ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                <ArrowDown className="w-5 h-5" />
                Download All as ZIP
              </button>
            </div>
          )}

          {error && (
            <div className="mt-8 p-5 bg-red-950/60 border border-red-700/70 rounded-xl text-red-300 max-w-3xl mx-auto text-center">
              <strong>Error:</strong> {error}
            </div>
          )}

          {successMessage && (
            <div className="mt-8 p-5 bg-green-950/60 border border-green-700/70 rounded-xl text-green-300 max-w-3xl mx-auto text-center">
              {successMessage}
            </div>
          )}
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