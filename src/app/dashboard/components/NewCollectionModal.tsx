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
/*const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";*/
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://10-4-16-36.nip.io:8003";

// Dynamically import JSZip only when needed
async function extractZip(zipFile: File): Promise<File[]> {
  // @ts-ignore – jszip is a peer dep; add "jszip" to your package.json
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(zipFile);
  const extracted: File[] = [];

  await Promise.all(
    Object.entries(zip.files).map(async ([relativePath, zipEntry]) => {
      // Skip directories and macOS metadata files
      if (zipEntry.dir) return;
      if (relativePath.startsWith("__MACOSX/") || relativePath.includes("/.")) return;

      const blob = await zipEntry.async("blob");
      const fileName = relativePath.split("/").pop() ?? relativePath;

      // Infer MIME type from extension
      const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
      const mimeMap: Record<string, string> = {
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
        webp: "image/webp",
        pdf: "application/pdf",
        txt: "text/plain",
        csv: "text/csv",
      };
      const mime = mimeMap[ext] ?? "application/octet-stream";

      const file = new File([blob], fileName, { type: mime });
      if (file.size <= MAX_FILE_SIZE) {
        extracted.push(file);
      } else {
        alert(`⚠️ ${fileName} (inside ZIP) is larger than 10 MB and was skipped.`);
      }
    })
  );

  return extracted;
}

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
  const [extracting, setExtracting] = useState(false);

  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadMessage, setUploadMessage] = useState<string>("");
  const [uploadedBlobs, setUploadedBlobs] = useState<string[]>([]);
  const [failedFiles, setFailedFiles] = useState<{ filename: string; error: string }[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/languages.csv")
      .then((res) => res.text())
      .then((text) => {
        const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
        setLanguageOptions(lines.map((line) => ({ value: line, label: line })));
      })
      .catch((err) => console.error("Failed to load languages.csv:", err));
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setDescription("");
      setLanguage("");
      setFiles([]);
      setErrors({});
      setUploadStatus("idle");
      setUploadMessage("");
      setUploadedBlobs([]);
      setFailedFiles([]);
      setExtracting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // ─── Process a raw FileList/array: extract ZIPs, filter oversized files ───
  const processIncomingFiles = async (incoming: FileList | File[]) => {
    setExtracting(true);
    const result: File[] = [];

    for (const file of Array.from(incoming)) {
      if (file.name.toLowerCase().endsWith(".zip") || file.type === "application/zip" || file.type === "application/x-zip-compressed") {
        try {
          const extracted = await extractZip(file);
          result.push(...extracted);
        } catch (err) {
          console.error(`Failed to extract ${file.name}:`, err);
          alert(`⚠️ Could not extract ${file.name}. Is it a valid ZIP?`);
        }
      } else {
        if (file.size > MAX_FILE_SIZE) {
          alert(`⚠️ ${file.name} is larger than 10 MB and was skipped.`);
        } else {
          result.push(file);
        }
      }
    }

    setFiles((prev) => [...prev, ...result]);
    setExtracting(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processIncomingFiles(e.target.files);
      // Reset input so the same file can be re-selected
      e.target.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    processIncomingFiles(e.dataTransfer.files);
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

    const newErrors: { name?: string; language?: string } = {};
    if (!name.trim()) newErrors.name = "Collection name is required.";
    if (!language) newErrors.language = "Please select a language.";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("description", description.trim());
    formData.append("language", language);
    files.forEach((file) => formData.append("files", file));

    setUploadStatus("uploading");
    setUploadMessage("Processing Files...");
    setUploadedBlobs([]);
    setFailedFiles([]);

    try {
      const response = await fetch(`${API_BASE_URL}/collection/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
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
  const isBusy = isUploading || extracting;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.80)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "672px",
          height: "90vh",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#111827",
          border: "1px solid #374151",
          borderRadius: "1rem",
          boxShadow: "0 25px 50px rgba(0,0,0,0.6)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 20px",
            borderBottom: "1px solid #374151",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600, color: "#fb923c" }}>
            Create New Collection
          </h2>
          <button
            onClick={onClose}
            disabled={isBusy}
            style={{
              background: "none",
              border: "none",
              cursor: isBusy ? "not-allowed" : "pointer",
              opacity: isBusy ? 0.4 : 1,
              color: "#9ca3af",
              padding: 0,
              display: "flex",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>

          {/* LEFT: upload zone + file list */}
          <div
            style={{
              width: "40%",
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              padding: "20px",
              borderRight: "1px solid #374151",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                minHeight: 0,
                backgroundColor: "#030712",
                border: "1px solid #374151",
                borderRadius: "1rem",
                padding: "20px",
                overflow: "hidden",
              }}
            >
              <p
                style={{
                  flexShrink: 0,
                  textAlign: "center",
                  fontWeight: 600,
                  color: "#fb923c",
                  margin: "0 0 16px",
                }}
              >
                Upload Here
              </p>

              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                style={{
                  flexShrink: 0,
                  border: "2px dashed #374151",
                  borderRadius: "1rem",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "24px 16px",
                  textAlign: "center",
                }}
              >
                {extracting ? (
                  <>
                    <Loader2
                      size={40}
                      style={{
                        color: "#fb923c",
                        marginBottom: "16px",
                        animation: "spin 1s linear infinite",
                      }}
                    />
                    <p style={{ margin: 0, fontSize: "0.875rem", color: "#e5e7eb" }}>
                      Extracting ZIP…
                    </p>
                  </>
                ) : (
                  <>
                    <Upload size={40} style={{ color: "#fef3c7", marginBottom: "16px" }} />
                    <p style={{ margin: "0 0 16px", fontSize: "0.875rem", color: "#e5e7eb" }}>
                      Drag &amp; drop files here
                    </p>

                    <button
                      type="button"
                      onClick={handleSelectClick}
                      disabled={isBusy}
                      style={{
                        padding: "10px 24px",
                        backgroundColor: "#ea580c",
                        color: "#fff",
                        border: "none",
                        borderRadius: "0.5rem",
                        fontSize: "0.875rem",
                        cursor: isBusy ? "not-allowed" : "pointer",
                        opacity: isBusy ? 0.5 : 1,
                        transform: btnPopped ? "scale(0.92)" : "scale(1)",
                        boxShadow: btnPopped
                          ? "0 0 0 4px rgba(234,88,12,0.35)"
                          : "0 2px 8px rgba(0,0,0,0.3)",
                        transition:
                          "transform 0.15s cubic-bezier(.36,.07,.19,.97), box-shadow 0.15s ease",
                      }}
                    >
                      Select Files / ZIP
                    </button>

                    <p
                      style={{
                        margin: "16px 0 0",
                        fontSize: "11px",
                        color: "#6b7280",
                        lineHeight: 1.5,
                      }}
                    >
                      JPG, PNG, PDF, ZIP • max 10 MB
                      <br />
                      <span style={{ color: "#4b5563" }}>ZIPs are extracted automatically</span>
                    </p>
                  </>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".png,.jpg,.jpeg,.pdf,.zip"
                  onChange={handleFileSelect}
                  style={{ display: "none" }}
                />
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    minHeight: 0,
                    marginTop: "12px",
                    overflow: "hidden",
                  }}
                >
                  <p
                    style={{
                      flexShrink: 0,
                      margin: "0 0 6px",
                      fontSize: "12px",
                      color: "#9ca3af",
                    }}
                  >
                    {files.length} file{files.length !== 1 ? "s" : ""} selected
                  </p>

                  <div
                    style={{
                      flex: 1,
                      minHeight: 0,
                      overflowY: "auto",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      paddingRight: "4px",
                    }}
                  >
                    {files.map((file, i) => {
                      const blobPath = `${name.trim()}/${file.name}`;
                      const wasUploaded = uploadedBlobs.some((b) => b === blobPath);
                      const hasFailed = failedFiles.some((f) => f.filename === file.name);

                      return (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            fontSize: "12px",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            flexShrink: 0,
                            backgroundColor: wasUploaded
                              ? "rgba(20,83,45,0.4)"
                              : hasFailed
                              ? "rgba(127,29,29,0.4)"
                              : "#1f2937",
                            border: wasUploaded
                              ? "1px solid #15803d"
                              : hasFailed
                              ? "1px solid #b91c1c"
                              : "1px solid transparent",
                          }}
                        >
                          {file.type.includes("image") ? (
                            <ImageIcon size={14} style={{ color: "#fb923c", flexShrink: 0 }} />
                          ) : (
                            <FileText size={14} style={{ color: "#fb923c", flexShrink: 0 }} />
                          )}
                          <span
                            style={{
                              flex: 1,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              color: "#f3f4f6",
                            }}
                          >
                            {file.name}
                          </span>

                          {wasUploaded && (
                            <CheckCircle2 size={12} style={{ color: "#4ade80", flexShrink: 0 }} />
                          )}
                          {hasFailed && (
                            <AlertCircle size={12} style={{ color: "#f87171", flexShrink: 0 }} />
                          )}
                          {!wasUploaded && !hasFailed && (
                            <button
                              onClick={() => removeFile(i)}
                              disabled={isBusy}
                              style={{
                                background: "none",
                                border: "none",
                                padding: 0,
                                cursor: isBusy ? "not-allowed" : "pointer",
                                display: "flex",
                              }}
                            >
                              <X size={12} style={{ color: "#f87171" }} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: form */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", flex: 1 }}
            >
              {/* Collection Name */}
              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    color: "#9ca3af",
                    marginBottom: "6px",
                  }}
                >
                  Collection Name <span style={{ color: "#f97316" }}>*</span>
                </label>
                <input
                  value={name}
                  disabled={isBusy}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (e.target.value.trim())
                      setErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  style={{
                    width: "100%",
                    backgroundColor: "#1f2937",
                    border: `1px solid ${errors.name ? "#ef4444" : "#374151"}`,
                    borderRadius: "0.75rem",
                    padding: "8px 24px",
                    color: "#f3f4f6",
                    fontSize: "0.875rem",
                    outline: "none",
                    opacity: isBusy ? 0.5 : 1,
                    boxSizing: "border-box",
                  }}
                />
                {errors.name && (
                  <p style={{ color: "#f87171", fontSize: "12px", marginTop: "6px" }}>
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Description */}
              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    color: "#9ca3af",
                    marginBottom: "6px",
                  }}
                >
                  Description
                </label>
                <textarea
                  value={description}
                  disabled={isBusy}
                  onChange={handleDescriptionChange}
                  rows={4}
                  style={{
                    width: "100%",
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "0.75rem",
                    padding: "12px 24px",
                    color: "#f3f4f6",
                    fontSize: "0.875rem",
                    outline: "none",
                    resize: "none",
                    opacity: isBusy ? 0.5 : 1,
                    boxSizing: "border-box",
                  }}
                />
                <p
                  style={{
                    fontSize: "12px",
                    textAlign: "right",
                    marginTop: "4px",
                    color: descRemaining <= 20 ? "#fb923c" : "#6b7280",
                  }}
                >
                  {descRemaining} character{descRemaining !== 1 ? "s" : ""} remaining
                </p>
              </div>

              {/* Language */}
              <div style={{ marginBottom: "24px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    color: "#9ca3af",
                    marginBottom: "6px",
                  }}
                >
                  Language <span style={{ color: "#f97316" }}>*</span>
                </label>
                <select
                  value={language}
                  disabled={isBusy}
                  onChange={(e) => {
                    setLanguage(e.target.value);
                    if (e.target.value)
                      setErrors((prev) => ({ ...prev, language: undefined }));
                  }}
                  style={{
                    width: "100%",
                    backgroundColor: "#1f2937",
                    border: `1px solid ${errors.language ? "#ef4444" : "#374151"}`,
                    borderRadius: "0.75rem",
                    padding: "12px 20px",
                    color: "#f3f4f6",
                    fontSize: "0.875rem",
                    outline: "none",
                    opacity: isBusy ? 0.5 : 1,
                    boxSizing: "border-box",
                  }}
                >
                  <option value="" disabled>
                    Select a language...
                  </option>
                  {languageOptions.length === 0 ? (
                    <option disabled>Loading languages...</option>
                  ) : (
                    languageOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))
                  )}
                </select>
                {errors.language && (
                  <p style={{ color: "#f87171", fontSize: "12px", marginTop: "6px" }}>
                    {errors.language}
                  </p>
                )}
              </div>

              {/* Upload status banner */}
              {uploadStatus !== "idle" && (
                <div
                  style={{
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "0.875rem",
                    borderRadius: "0.75rem",
                    padding: "10px 16px",
                    backgroundColor:
                      uploadStatus === "uploading"
                        ? "rgba(67,20,7,0.6)"
                        : uploadStatus === "success"
                        ? "rgba(2,44,34,0.6)"
                        : "rgba(69,10,10,0.6)",
                    border:
                      uploadStatus === "uploading"
                        ? "1px solid #c2410c"
                        : uploadStatus === "success"
                        ? "1px solid #15803d"
                        : "1px solid #b91c1c",
                    color:
                      uploadStatus === "uploading"
                        ? "#fdba74"
                        : uploadStatus === "success"
                        ? "#86efac"
                        : "#fca5a5",
                  }}
                >
                  {uploadStatus === "uploading" && (
                    <Loader2
                      size={16}
                      style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}
                    />
                  )}
                  {uploadStatus === "success" && (
                    <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                  )}
                  {uploadStatus === "error" && (
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  )}
                  <span>{uploadMessage}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isBusy || uploadStatus === "success"}
                style={{
                  marginTop: "auto",
                  padding: "12px 24px",
                  background: "linear-gradient(to right, #ea580c, #d97706)",
                  border: "none",
                  borderRadius: "0.75rem",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  cursor:
                    isBusy || uploadStatus === "success" ? "not-allowed" : "pointer",
                  opacity: isBusy || uploadStatus === "success" ? 0.6 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                {isUploading ? (
                  <>
                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                    Uploading…
                  </>
                ) : extracting ? (
                  <>
                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                    Extracting…
                  </>
                ) : (
                  "Process Files"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}