"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload, X, Loader2, AlertCircle, Check, File as FileIcon,
} from "lucide-react";

/* ─────────────── TYPES ─────────────── */
export type UploadFileEntry = {
  id: string;
  file: File;
  status: "pending" | "uploading" | "done" | "error" | "duplicate";
  error?: string;
  fromZip?: string;
};

/* ─────────────── ACCEPTED FILE TYPES ─────────────── */
const ACCEPTED_IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "avif"]);
const ACCEPTED_UPLOAD_EXTS = new Set([...ACCEPTED_IMAGE_EXTS, "pdf"]);

function isAcceptedFile(file: File): boolean {
  const parts = file.name.split(".");
  const ext = (parts.length > 1 ? parts.pop()! : "").toLowerCase();
  return ACCEPTED_UPLOAD_EXTS.has(ext);
}

function isZipFile(file: File): boolean {
  const lname = file.name.toLowerCase();
  return (
    lname.endsWith(".zip") ||
    file.type === "application/zip" ||
    file.type === "application/x-zip-compressed"
  );
}

/* ─────────────── HELPERS ─────────────── */
function fmtBytes(bytes: number) {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/* ─────────────── PROPS ─────────────── */
export type AddFilesModalProps = {
  collectionId: string;
  apiBase: string;
  onClose: () => void;
  onSuccess: (
    uploaded: string[],
    failed: { filename: string; error: string }[]
  ) => void;
};

/* ═══════════════════════════════════════
   ADD FILES MODAL
═══════════════════════════════════════ */
const AddFilesModal = React.memo(function AddFilesModal({
  collectionId,
  apiBase,
  onClose,
  onSuccess,
}: AddFilesModalProps) {
  const [entries, setEntries] = useState<UploadFileEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [unzipping, setUnzipping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep a ref that always mirrors entries state — used inside callbacks
  // to read current names without stale closure issues
  const entriesRef = useRef<UploadFileEntry[]>([]);
  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  /* ── Theme constants ── */
  const ORG_PRIMARY = "rgba(249,115,22,0.18)";
  const ORG_BORDER = "rgba(249,115,22,0.35)";
  const ORG_ICON_BG = "rgba(249,115,22,0.15)";
  const ORG_FG = "#fb923c";
  const ORG_HOVER_BG = "rgba(249,115,22,0.28)";
  const ORG_HOVER_BD = "rgba(249,115,22,0.55)";

  /* ── File colour helper ── */
  function fileIconColor(fileExt: string) {
    const e = fileExt.toLowerCase();
    if (e === "pdf") return "#f87171";
    if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "avif", "svg"].includes(e))
      return "#fb923c";
    return "#94a3b8";
  }

  /* ── Duplicate check: called immediately after files are added ── */
  const checkDuplicates = useCallback(
    async (newEntries: UploadFileEntry[]) => {
      if (!newEntries.length) return;
      setChecking(true);
      try {
        const checkRes = await fetch(
          `${apiBase}/collection/${collectionId}/check-duplicates`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ filenames: newEntries.map((e) => e.file.name) }),
          }
        );
        if (!checkRes.ok) throw new Error("Failed to check for duplicates.");

        const { duplicates }: { duplicates: string[] } = await checkRes.json();
        const dupeSet = new Set(duplicates);

        setEntries((prev) =>
          prev.map((e) => {
            // Only update entries that were just added
            if (!newEntries.some((ne) => ne.id === e.id)) return e;
            if (dupeSet.has(e.file.name)) {
              return {
                ...e,
                status: "duplicate",
                error: "File already exists in collection",
              };
            }
            return e; // remains "pending"
          })
        );
      } catch (err: any) {
        setGlobalError(err.message || "Duplicate check failed.");
      } finally {
        setChecking(false);
      }
    },
    [apiBase, collectionId]
  );

  /* ── Core add logic ── */
  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files);
      const zips = arr.filter(isZipFile);
      const directFiles = arr.filter((f) => !isZipFile(f));

      const validDirect = directFiles.filter(isAcceptedFile);
      const invalidDirect = directFiles.filter((f) => !isAcceptedFile(f));

      const invalidEntries: UploadFileEntry[] = invalidDirect.map((f) => ({
        id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
        file: f,
        status: "error",
        error: "Unsupported file type. Only images and PDFs are accepted.",
      }));

      // ── Direct files: build newPendingEntries BEFORE setEntries ──────────
      // This avoids a stale closure — newPendingEntries is reliable here
      const currentNames = new Set(entriesRef.current.map((e) => e.file.name));
      const newPendingEntries: UploadFileEntry[] = validDirect
        .filter((f) => !currentNames.has(f.name))
        .map((f) => ({
          id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
          file: f,
          status: "pending" as const,
        }));

      setEntries((prev) => {
        const existingNames = new Set(prev.map((e) => e.file.name));
        const deduped = newPendingEntries.filter(
          (e) => !existingNames.has(e.file.name)
        );
        return [...prev, ...deduped, ...invalidEntries];
      });

      // Check duplicates for direct files
      if (newPendingEntries.length > 0) {
        await checkDuplicates(newPendingEntries);
      }

      // ── ZIP extraction ────────────────────────────────────────────────────
      if (zips.length > 0) {
        setUnzipping(true);
        try {
          const JSZip = (await import("jszip")).default;

          for (const zipFile of zips) {
            try {
              const zip = await JSZip.loadAsync(zipFile);
              const extractedFiles: UploadFileEntry[] = [];

              const filePromises = Object.entries(zip.files).map(
                async ([relativePath, zipEntry]) => {
                  if (zipEntry.dir) return;
                  if (
                    relativePath.startsWith("__MACOSX") ||
                    relativePath.split("/").some((p) => p.startsWith("."))
                  )
                    return;

                  const fileName = relativePath.split("/").pop() || relativePath;
                  const parts = fileName.split(".");
                  const fileExt = (
                    parts.length > 1 ? parts.pop()! : ""
                  ).toLowerCase();
                  if (!ACCEPTED_UPLOAD_EXTS.has(fileExt)) return;

                  const blob = await zipEntry.async("blob");
                  const mimeType =
                    fileExt === "pdf"
                      ? "application/pdf"
                      : fileExt === "svg"
                      ? "image/svg+xml"
                      : `image/${fileExt === "jpg" ? "jpeg" : fileExt}`;
                  const file = new File([blob], fileName, { type: mimeType });

                  extractedFiles.push({
                    id: `${fileName}-${file.size}-${Date.now()}-${Math.random()}`,
                    file,
                    status: "pending",
                    fromZip: zipFile.name,
                  });
                }
              );

              await Promise.all(filePromises);

              // ── FIX: build newFromZip BEFORE setEntries ──────────────────
              // Read current names from ref (always up-to-date) so the
              // duplicate check is called with the correct entries, not an
              // empty array due to stale React state closure.
              const namesBeforeZip = new Set(entriesRef.current.map((e) => e.file.name));
              const newFromZip = extractedFiles.filter(
                (e) => !namesBeforeZip.has(e.file.name)
              );

              setEntries((prev) => {
                const existingNames = new Set(prev.map((e) => e.file.name));
                const deduped = extractedFiles.filter(
                  (e) => !existingNames.has(e.file.name)
                );
                return [...prev, ...deduped];
              });

              // Now safe to call — newFromZip is populated outside setEntries
              if (newFromZip.length > 0) {
                await checkDuplicates(newFromZip);
              }

            } catch (zipErr: any) {
              setEntries((prev) => [
                ...prev,
                {
                  id: `${zipFile.name}-${Date.now()}`,
                  file: zipFile,
                  status: "error",
                  error: `Failed to unzip: ${zipErr.message || "Unknown error"}`,
                },
              ]);
            }
          }
        } catch {
          setGlobalError(
            "JSZip library could not be loaded. Please install it: npm install jszip"
          );
        } finally {
          setUnzipping(false);
        }
      }
    },
    [checkDuplicates]
  );

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  /* ── Upload handler: duplicates already filtered, just upload pending ── */
  const handleUpload = useCallback(async () => {
    const nonDupes = entries.filter((e) => e.status === "pending");
    if (!nonDupes.length || uploading) return;

    setGlobalError(null);
    setUploading(true);

    setEntries((prev) =>
      prev.map((e) =>
        nonDupes.some((nd) => nd.id === e.id)
          ? { ...e, status: "uploading" }
          : e
      )
    );

    const formData = new FormData();
    nonDupes.forEach((e) => formData.append("files", e.file));

    try {
      const uploadRes = await fetch(
        `${apiBase}/collection/${collectionId}/upload`,
        { method: "POST", body: formData, credentials: "include" }
      );

      let data: any = {};
      try {
        data = await uploadRes.json();
      } catch {}

      if (!uploadRes.ok && uploadRes.status !== 201) {
        const detail = data?.detail;
        const msg =
          typeof detail === "string" ? detail : `HTTP ${uploadRes.status}`;
        throw new Error(msg);
      }

      const uploaded: string[] = data.uploaded ?? [];
      const failed: { filename: string; error: string }[] = data.failed ?? [];

      setEntries((prev) =>
        prev.map((e) => {
          if (e.status !== "uploading") return e;
          const failInfo = failed.find((f) => f.filename === e.file.name);
          if (failInfo) {
            return { ...e, status: "error", error: failInfo.error };
          }
          if (uploaded.includes(e.file.name)) return { ...e, status: "done" };
          return { ...e, status: "error", error: "Unknown error" };
        })
      );

      onSuccess(uploaded, failed);
    } catch (err: any) {
      setGlobalError(err.message || "Upload failed.");
      setEntries((prev) =>
        prev.map((e) =>
          e.status === "uploading"
            ? { ...e, status: "error", error: "Upload failed" }
            : e
        )
      );
    } finally {
      setUploading(false);
    }
  }, [entries, uploading, apiBase, collectionId, onSuccess]);

  /* ── Keyboard: Escape to close ── */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !uploading && !checking) onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, uploading, checking]);

  /* ── Derived counts ── */
  const pendingCount = entries.filter((e) => e.status === "pending").length;
  const doneCount = entries.filter((e) => e.status === "done").length;
  const errCount = entries.filter((e) => e.status === "error").length;
  const dupeCount = entries.filter((e) => e.status === "duplicate").length;
  const isBusy = uploading || checking || unzipping;

  /* ── Render ── */
  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !isBusy) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        backgroundColor: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        animation: "fadeIn 0.15s ease",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          backgroundColor: "#0d1626",
          borderRadius: 16,
          border: "1px solid #1e293b",
          boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
          overflow: "hidden",
          animation: "slideUp 0.2s ease",
          display: "flex",
          flexDirection: "column",
          maxHeight: "calc(100vh - 80px)",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid #1e293b",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                backgroundColor: ORG_ICON_BG,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Upload size={16} style={{ color: ORG_FG }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>
                Add Files
              </p>
              <p style={{ fontSize: 11, color: "#475569", margin: "2px 0 0" }}>
                Upload images or PDFs · ZIP files are auto-extracted
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isBusy}
            style={{
              all: "unset",
              width: 28,
              height: 28,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: isBusy ? "not-allowed" : "pointer",
              color: "#475569",
              opacity: isBusy ? 0.4 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isBusy) {
                const el = e.currentTarget as HTMLElement;
                el.style.backgroundColor = "rgba(239,68,68,0.1)";
                el.style.color = "#f87171";
              }
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.backgroundColor = "transparent";
              el.style.color = "#475569";
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: "18px 20px", overflowY: "auto", flex: 1 }}>

          {/* Global error banner */}
          {globalError && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                backgroundColor: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: 10,
                padding: "12px 14px",
                marginBottom: 14,
              }}
            >
              <AlertCircle
                size={15}
                style={{ color: "#f87171", flexShrink: 0, marginTop: 1 }}
              />
              <p style={{ fontSize: 12, color: "#fca5a5", margin: 0 }}>{globalError}</p>
            </div>
          )}

          {/* Checking banner */}
          {checking && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                backgroundColor: "rgba(249,115,22,0.08)",
                border: "1px solid rgba(249,115,22,0.2)",
                borderRadius: 10,
                padding: "10px 14px",
                marginBottom: 14,
              }}
            >
              <Loader2 size={14} style={{ color: ORG_FG }} className="animate-spin" />
              <p style={{ fontSize: 12, color: ORG_FG, margin: 0 }}>
                Checking for duplicates…
              </p>
            </div>
          )}

          {/* Unzipping banner */}
          {unzipping && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                backgroundColor: "rgba(249,115,22,0.08)",
                border: "1px solid rgba(249,115,22,0.2)",
                borderRadius: 10,
                padding: "10px 14px",
                marginBottom: 14,
              }}
            >
              <Loader2 size={14} style={{ color: ORG_FG }} className="animate-spin" />
              <p style={{ fontSize: 12, color: ORG_FG, margin: 0 }}>
                Extracting ZIP contents…
              </p>
            </div>
          )}

          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !isBusy && fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${
                isDragOver ? ORG_BORDER : "rgba(249,115,22,0.25)"
              }`,
              borderRadius: 12,
              backgroundColor: isDragOver
                ? "rgba(249,115,22,0.08)"
                : "rgba(249,115,22,0.03)",
              padding: "28px 20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              cursor: isBusy ? "not-allowed" : "pointer",
              transition: "all 0.15s",
              marginBottom: entries.length > 0 ? 14 : 0,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: ORG_ICON_BG,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Upload size={20} style={{ color: ORG_FG }} />
            </div>
            <div style={{ textAlign: "center" }}>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#94a3b8",
                  margin: "0 0 4px",
                }}
              >
                Drag & drop files here, or{" "}
                <span style={{ color: ORG_FG }}>browse</span>
              </p>
              <p style={{ fontSize: 11, color: "#334155", margin: 0 }}>
                Images (JPG, PNG, WEBP…) · PDF · ZIP (auto-extracted)
              </p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.zip,application/zip,application/x-zip-compressed"
            style={{ display: "none" }}
            disabled={isBusy}
            onChange={(e) => {
              if (e.target.files?.length) {
                addFiles(e.target.files);
                e.target.value = "";
              }
            }}
          />

          {/* File list */}
          {entries.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {entries.map((entry) => {
                const fileExt = entry.file.name.includes(".")
                  ? entry.file.name.split(".").pop() ?? ""
                  : "";
                const iconColor = fileIconColor(fileExt);
                const statusConfig = {
                  pending: {
                    color: "#64748b",
                    bg: "rgba(100,116,139,0.1)",
                    label: "Pending",
                  },
                  uploading: {
                    color: "#fb923c",
                    bg: "rgba(249,115,22,0.12)",
                    label: "Uploading…",
                  },
                  done: {
                    color: "#86efac",
                    bg: "rgba(34,197,94,0.12)",
                    label: "Uploaded",
                  },
                  error: {
                    color: "#f87171",
                    bg: "rgba(239,68,68,0.12)",
                    label: "Failed",
                  },
                  duplicate: {
                    color: "#fbbf24",
                    bg: "rgba(251,191,36,0.12)",
                    label: "Duplicate",
                  },
                }[entry.status];

                return (
                  <div
                    key={entry.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      backgroundColor: "rgba(255,255,255,0.02)",
                      border: `1px solid ${
                        entry.status === "done"
                          ? "rgba(34,197,94,0.2)"
                          : entry.status === "error"
                          ? "rgba(239,68,68,0.2)"
                          : entry.status === "duplicate"
                          ? "rgba(251,191,36,0.2)"
                          : "#1e293b"
                      }`,
                      borderRadius: 10,
                      padding: "9px 12px",
                      transition: "border-color 0.15s",
                    }}
                  >
                    {/* File icon */}
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 7,
                        flexShrink: 0,
                        backgroundColor: `${iconColor}18`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "column",
                        gap: 1,
                      }}
                    >
                      <FileIcon size={14} style={{ color: iconColor }} />
                      {fileExt && (
                        <span
                          style={{
                            fontSize: 7,
                            fontWeight: 800,
                            color: iconColor,
                            fontFamily: "monospace",
                            letterSpacing: "0.05em",
                            lineHeight: 1,
                          }}
                        >
                          {fileExt.toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#cbd5e1",
                          margin: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {entry.file.name}
                      </p>
                      <p style={{ fontSize: 10, color: "#334155", margin: "2px 0 0" }}>
                        {fmtBytes(entry.file.size)}
                        {entry.fromZip && (
                          <span
                            style={{ color: "rgba(249,115,22,0.7)", marginLeft: 5 }}
                          >
                            · from {entry.fromZip}
                          </span>
                        )}
                        {(entry.status === "error" ||
                          entry.status === "duplicate") &&
                          entry.error && (
                            <span
                              style={{
                                color:
                                  entry.status === "duplicate"
                                    ? "#fbbf24"
                                    : "#f87171",
                                marginLeft: 6,
                              }}
                            >
                              · {entry.error}
                            </span>
                          )}
                      </p>
                    </div>

                    {/* Status badge + remove button */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 9999,
                          backgroundColor: statusConfig.bg,
                          color: statusConfig.color,
                        }}
                      >
                        {entry.status === "uploading" ? (
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Loader2 size={9} className="animate-spin" />
                            {statusConfig.label}
                          </span>
                        ) : entry.status === "done" ? (
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Check size={9} />
                            {statusConfig.label}
                          </span>
                        ) : (
                          statusConfig.label
                        )}
                      </span>
                      {(entry.status === "pending" ||
                        entry.status === "error" ||
                        entry.status === "duplicate") &&
                        !isBusy && (
                          <button
                            onClick={() => removeEntry(entry.id)}
                            style={{
                              all: "unset",
                              width: 20,
                              height: 20,
                              borderRadius: 4,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              color: "#334155",
                            }}
                            onMouseEnter={(e) => {
                              const el = e.currentTarget as HTMLElement;
                              el.style.color = "#f87171";
                              el.style.backgroundColor = "rgba(239,68,68,0.1)";
                            }}
                            onMouseLeave={(e) => {
                              const el = e.currentTarget as HTMLElement;
                              el.style.color = "#334155";
                              el.style.backgroundColor = "transparent";
                            }}
                          >
                            <X size={11} />
                          </button>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {entries.length > 0 && (
          <div
            style={{
              padding: "14px 20px",
              borderTop: "1px solid #1e293b",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              backgroundColor: "rgba(6,11,20,0.5)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {doneCount > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    color: "#86efac",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Check size={11} /> {doneCount} uploaded
                </span>
              )}
              {errCount > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    color: "#f87171",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <AlertCircle size={11} /> {errCount} failed
                </span>
              )}
              {dupeCount > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    color: "#fbbf24",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <AlertCircle size={11} /> {dupeCount} duplicate{dupeCount !== 1 ? "s" : ""}
                </span>
              )}
              {pendingCount > 0 && !isBusy && (
                <span style={{ fontSize: 11, color: "#64748b" }}>
                  {pendingCount} ready
                </span>
              )}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              {!isBusy && (
                <button
                  onClick={onClose}
                  style={{
                    all: "unset",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(255,255,255,0.04)",
                    color: "#64748b",
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "8px 18px",
                    borderRadius: 9,
                    cursor: "pointer",
                    border: "1.5px solid #1e293b",
                    transition: "all 0.12s",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.backgroundColor =
                      "rgba(255,255,255,0.08)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.backgroundColor =
                      "rgba(255,255,255,0.04)")
                  }
                >
                  {doneCount > 0 ? "Done" : "Cancel"}
                </button>
              )}
              {pendingCount > 0 && (
                <button
                  onClick={handleUpload}
                  disabled={isBusy}
                  style={{
                    all: "unset",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                    backgroundColor: isBusy ? ORG_ICON_BG : ORG_PRIMARY,
                    color: isBusy ? "#4a2a0a" : ORG_FG,
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "8px 20px",
                    borderRadius: 9,
                    cursor: isBusy ? "not-allowed" : "pointer",
                    border: `1.5px solid ${
                      isBusy ? "rgba(249,115,22,0.1)" : ORG_BORDER
                    }`,
                    transition: "all 0.12s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isBusy) {
                      const el = e.currentTarget as HTMLElement;
                      el.style.backgroundColor = ORG_HOVER_BG;
                      el.style.borderColor = ORG_HOVER_BD;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isBusy) {
                      const el = e.currentTarget as HTMLElement;
                      el.style.backgroundColor = ORG_PRIMARY;
                      el.style.borderColor = ORG_BORDER;
                    }
                  }}
                >
                  {uploading ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> Uploading…
                    </>
                  ) : (
                    <>
                      <Upload size={13} /> Upload {pendingCount} file
                      {pendingCount !== 1 ? "s" : ""}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default AddFilesModal;