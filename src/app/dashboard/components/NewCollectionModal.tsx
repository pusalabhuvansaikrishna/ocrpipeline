"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, X, FileText, Image as ImageIcon, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onProcess: (data: {
    name: string;
    description: string;
    language: string;
    files: File[];
  }) => void;
};

type UploadStatus = "idle" | "uploading" | "success" | "error";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_DESC_LENGTH = 150;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function NewCollectionModal({
  isOpen,
  onClose,
  onProcess,
}: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("");
  const [languageOptions, setLanguageOptions] = useState<{ value: string; label: string }[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [btnPopped, setBtnPopped] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; language?: string }>({});

  // Upload state
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadMessage, setUploadMessage] = useState<string>("");
  const [uploadedBlobs, setUploadedBlobs] = useState<string[]>([]);
  const [failedFiles, setFailedFiles] = useState<{ filename: string; error: string }[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/languages.csv")
      .then((res) => res.text())
      .then((text) => {
        const lines = text
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        setLanguageOptions(lines.map((line) => ({ value: line, label: line })));
      })
      .catch((err) => console.error("Failed to load languages.csv:", err));
  }, []);

  // Reset upload state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setUploadStatus("idle");
      setUploadMessage("");
      setUploadedBlobs([]);
      setFailedFiles([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filterValidFiles = (fileList: FileList | File[]): File[] => {
    return Array.from(fileList).filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
        alert(`⚠️ ${file.name} is larger than 10 MB and was skipped.`);
        return false;
      }
      return true;
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const validFiles = filterValidFiles(e.target.files);
      setFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const validFiles = filterValidFiles(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSelectClick = () => {
    setBtnPopped(true);
    setTimeout(() => setBtnPopped(false), 200);
    fileInputRef.current?.click();
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= MAX_DESC_LENGTH) setDescription(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const newErrors: { name?: string; language?: string } = {};
    if (!name.trim()) newErrors.name = "Collection name is required.";
    if (!language) newErrors.language = "Please select a language.";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    // Build FormData
    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("description", description.trim());
    formData.append("language", language);
    files.forEach((file) => formData.append("files", file));

    setUploadStatus("uploading");
    setUploadMessage("Uploading files to Azure...");
    setUploadedBlobs([]);
    setFailedFiles([]);

    try {
      const response = await fetch(`${API_BASE_URL}/collection/upload`, {
        method: "POST",
        credentials: "include", // sends the access_token cookie automatically
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        // Server returned an error (4xx / 5xx)
        const detail = data?.detail;
        const message =
          typeof detail === "string"
            ? detail
            : detail?.failed?.map((f: { filename: string; error: string }) => f.filename).join(", ") ??
              "Upload failed. Please try again.";
        setUploadStatus("error");
        setUploadMessage(message);
        return;
      }

      // Partial or full success
      setUploadedBlobs(data.uploaded ?? []);
      setFailedFiles(data.failed ?? []);

      if (data.failed?.length > 0 && data.uploaded?.length === 0) {
        setUploadStatus("error");
        setUploadMessage("All files failed to upload.");
      } else if (data.failed?.length > 0) {
        setUploadStatus("error");
        setUploadMessage(`${data.uploaded.length} file(s) uploaded, ${data.failed.length} failed.`);
      } else {
        setUploadStatus("success");
        setUploadMessage(`${data.uploaded.length} file(s) uploaded successfully!`);

        // Notify parent and auto-close after a short delay
        onProcess({ name: name.trim(), description: description.trim(), language, files });
        setTimeout(() => onClose(), 1800);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setUploadStatus("error");
      setUploadMessage("Network error – could not reach the server.");
    }
  };

  const descRemaining = MAX_DESC_LENGTH - description.length;
  const isUploading = uploadStatus === "uploading";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-orange-400">
            Create New Collection
          </h2>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="text-gray-400 hover:text-orange-400 cursor-pointer transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-stretch min-h-[420px]">

          {/* LEFT – Upload zone */}
          <div className="w-[40%] p-5 border-r border-gray-700 flex">
            <div className="bg-gray-950 rounded-2xl p-5 border border-gray-700 flex flex-col w-full h-full">

              <div className="text-orange-400 text-lg font-semibold mb-4 text-center">
                Upload Here
              </div>

              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="
                  group flex-1 border-2 border-dashed border-gray-700
                  rounded-2xl flex flex-col items-center justify-center text-center
                  transition-colors duration-200 hover:border-orange-500 cursor-default
                "
              >
                <Upload className="w-10 h-10 text-orange-100 mb-4" />
                <p className="text-sm text-gray-200 mb-4">Drag &amp; drop files here</p>

                <button
                  type="button"
                  onClick={handleSelectClick}
                  disabled={isUploading}
                  style={{
                    transform: btnPopped ? "scale(0.92)" : "scale(1)",
                    boxShadow: btnPopped
                      ? "0 0 0 4px rgba(234,88,12,0.35)"
                      : "0 2px 8px rgba(0,0,0,0.3)",
                    transition: "transform 0.15s cubic-bezier(.36,.07,.19,.97), box-shadow 0.15s ease",
                  }}
                  className="
                    px-6 py-2.5
                    bg-orange-600 hover:bg-orange-500 active:bg-orange-700
                    text-white text-sm rounded-lg hover:shadow-lg cursor-pointer
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  Select Files / ZIP
                </button>

                <p className="text-[11px] text-gray-400 mt-4 px-3 text-center leading-relaxed">
                  JPG, PNG, PDF, ZIP • max 10 MB
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".png,.jpg,.jpeg,.pdf,.zip"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div className="mt-3 space-y-2 max-h-24 overflow-auto">
                  {files.map((file, i) => {
                    const blobPath = `${name.trim()}/${file.name}`;
                    const wasUploaded = uploadedBlobs.some((b) => b === blobPath);
                    const hasFailed = failedFiles.some((f) => f.filename === file.name);

                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-2 text-xs px-2 py-1 rounded transition-colors ${
                          wasUploaded
                            ? "bg-green-900/40 border border-green-700"
                            : hasFailed
                            ? "bg-red-900/40 border border-red-700"
                            : "bg-gray-800"
                        }`}
                      >
                        {file.type.includes("image") ? (
                          <ImageIcon className="w-4 h-4 text-orange-400 shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-orange-400 shrink-0" />
                        )}
                        <span className="truncate flex-1">{file.name}</span>

                        {wasUploaded && (
                          <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />
                        )}
                        {hasFailed && (
                          <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
                        )}
                        {!wasUploaded && !hasFailed && (
                          <button
                            onClick={() => removeFile(i)}
                            disabled={isUploading}
                            className="cursor-pointer disabled:cursor-not-allowed"
                          >
                            <X className="w-3 h-3 text-red-400" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT – Form */}
          <div className="w-[60%] p-6 flex flex-col">
            <form onSubmit={handleSubmit} className="flex flex-col h-full">

              {/* Collection Name */}
              <div className="mb-5">
                <label className="block text-sm text-gray-400 mb-1.5">
                  Collection Name <span className="text-orange-500">*</span>
                </label>
                <input
                  value={name}
                  disabled={isUploading}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (e.target.value.trim()) setErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  className={`w-full bg-gray-800 border rounded-xl px-6 py-2 text-gray-100 focus:outline-none transition-colors disabled:opacity-50 ${
                    errors.name
                      ? "border-red-500 focus:border-red-400"
                      : "border-gray-700 focus:border-orange-500"
                  }`}
                />
                {errors.name && <p className="text-red-400 text-xs mt-1.5">{errors.name}</p>}
              </div>

              {/* Description */}
              <div className="mb-5">
                <label className="block text-sm text-gray-400 mb-1.5">Description</label>
                <textarea
                  value={description}
                  disabled={isUploading}
                  onChange={handleDescriptionChange}
                  rows={4}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-6 py-3 text-gray-100 focus:border-orange-500 focus:outline-none resize-none disabled:opacity-50"
                />
                <p className={`text-xs mt-1 text-right ${descRemaining <= 20 ? "text-orange-400" : "text-gray-500"}`}>
                  {descRemaining} character{descRemaining !== 1 ? "s" : ""} remaining
                </p>
              </div>

              {/* Language */}
              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-1.5">
                  Language <span className="text-orange-500">*</span>
                </label>
                <select
                  value={language}
                  disabled={isUploading}
                  onChange={(e) => {
                    setLanguage(e.target.value);
                    if (e.target.value) setErrors((prev) => ({ ...prev, language: undefined }));
                  }}
                  className={`w-full bg-gray-800 border rounded-xl px-5 py-3 text-gray-100 focus:outline-none transition-colors disabled:opacity-50 ${
                    errors.language
                      ? "border-red-500 focus:border-red-400"
                      : "border-gray-700 focus:border-orange-500"
                  }`}
                >
                  <option value="" disabled>Select a language...</option>
                  {languageOptions.length === 0 ? (
                    <option disabled>Loading languages...</option>
                  ) : (
                    languageOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))
                  )}
                </select>
                {errors.language && <p className="text-red-400 text-xs mt-1.5">{errors.language}</p>}
              </div>

              {/* Upload status banner */}
              {uploadStatus !== "idle" && (
                <div
                  className={`mb-4 flex items-center gap-2 text-sm rounded-xl px-4 py-2.5 ${
                    uploadStatus === "uploading"
                      ? "bg-orange-950/60 border border-orange-700 text-orange-300"
                      : uploadStatus === "success"
                      ? "bg-green-950/60 border border-green-700 text-green-300"
                      : "bg-red-950/60 border border-red-700 text-red-300"
                  }`}
                >
                  {uploadStatus === "uploading" && (
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  )}
                  {uploadStatus === "success" && (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  )}
                  {uploadStatus === "error" && (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{uploadMessage}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isUploading || uploadStatus === "success"}
                className="mt-auto px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 rounded-xl text-white font-semibold text-sm hover:scale-[1.02] active:scale-95 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  "Process Files"
                )}
              </button>

            </form>
          </div>

        </div>
      </div>
    </div>
  );
}