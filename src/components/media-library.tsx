"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload,
  FileText,
  Image,
  File,
  Trash2,
  Download,
  Search,
  X,
  Loader2,
  FileSpreadsheet,
  FileArchive,
  Film,
  Music,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import toast from "react-hot-toast";

type MediaFile = {
  id: string;
  name: string;
  url: string;
  size: number;
  contentType: string;
  uploadedById: string;
  createdAt: string | Date;
  uploadedBy: { id: string; name: string | null; email: string };
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(contentType: string) {
  if (contentType.startsWith("image/")) return Image;
  if (contentType.startsWith("video/")) return Film;
  if (contentType.startsWith("audio/")) return Music;
  if (contentType === "application/pdf") return FileText;
  if (
    contentType.includes("spreadsheet") ||
    contentType.includes("excel") ||
    contentType === "text/csv"
  )
    return FileSpreadsheet;
  if (contentType.includes("zip") || contentType.includes("archive"))
    return FileArchive;
  return File;
}

function getFileColor(contentType: string) {
  if (contentType.startsWith("image/")) return "text-violet-500 bg-violet-50";
  if (contentType.startsWith("video/")) return "text-pink-500 bg-pink-50";
  if (contentType.startsWith("audio/")) return "text-amber-500 bg-amber-50";
  if (contentType === "application/pdf") return "text-red-500 bg-red-50";
  if (contentType.includes("spreadsheet") || contentType.includes("excel"))
    return "text-emerald-500 bg-emerald-50";
  if (contentType.includes("zip")) return "text-orange-500 bg-orange-50";
  return "text-slate-500 bg-slate-50";
}

export function MediaLibrary({
  initialFiles,
}: {
  initialFiles: MediaFile[];
}) {
  const [files, setFiles] = useState<MediaFile[]>(initialFiles);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleUpload = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    setUploading(true);
    let uploadedCount = 0;

    try {
      for (const file of Array.from(fileList)) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/media", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error || `Fehler bei "${file.name}"`);
          continue;
        }

        const newFile = await res.json();
        setFiles((prev) => [newFile, ...prev]);
        uploadedCount++;
      }

      if (uploadedCount > 0) {
        toast.success(
          uploadedCount === 1
            ? "Datei hochgeladen"
            : `${uploadedCount} Dateien hochgeladen`
        );
      }
    } catch {
      toast.error("Upload fehlgeschlagen");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, []);

  async function handleDelete(file: MediaFile) {
    if (!confirm(`"${file.name}" wirklich löschen?`)) return;

    setDeleting(file.id);
    try {
      const res = await fetch(`/api/media/${file.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();

      setFiles((prev) => prev.filter((f) => f.id !== file.id));
      toast.success("Datei gelöscht");
    } catch {
      toast.error("Löschen fehlgeschlagen");
    } finally {
      setDeleting(null);
    }
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleUpload(e.dataTransfer.files);
  }

  return (
    <div className="space-y-6">
      {/* Upload-Bereich */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          dragActive
            ? "border-primary-500 bg-primary-50"
            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            <p className="text-sm font-medium text-slate-700">
              Wird hochgeladen…
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center">
              <Upload className="w-5 h-5 text-primary-600" />
            </div>
            <p className="text-sm font-medium text-slate-700">
              Dateien hierher ziehen oder{" "}
              <span className="text-primary-600">durchsuchen</span>
            </p>
            <p className="text-xs text-slate-400">Max. 50 MB pro Datei</p>
          </div>
        )}
      </div>

      {/* Suchleiste + Info */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Dateien suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-sm text-slate-500">
          {filteredFiles.length}{" "}
          {filteredFiles.length === 1 ? "Datei" : "Dateien"}
        </p>
      </div>

      {/* Dateiliste */}
      {filteredFiles.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <File className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">
            {search ? "Keine Dateien gefunden" : "Noch keine Dateien vorhanden"}
          </p>
          {!search && (
            <p className="text-xs text-slate-400 mt-1">
              Lade deine erste Datei hoch
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                  Datei
                </th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                  Größe
                </th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                  Hochgeladen von
                </th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                  Datum
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFiles.map((file) => {
                const Icon = getFileIcon(file.contentType);
                const colorClass = getFileColor(file.contentType);
                return (
                  <tr
                    key={file.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-slate-400 sm:hidden">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 hidden sm:table-cell">
                      {formatFileSize(file.size)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 hidden md:table-cell">
                      {file.uploadedBy.name || file.uploadedBy.email}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 hidden lg:table-cell whitespace-nowrap">
                      {formatDistanceToNow(new Date(file.createdAt), {
                        addSuffix: true,
                        locale: de,
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-md text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition"
                          title="Herunterladen"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleDelete(file)}
                          disabled={deleting === file.id}
                          className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                          title="Löschen"
                        >
                          {deleting === file.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
