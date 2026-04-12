"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  Folder,
  FolderPlus,
  ChevronRight,
  Home,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import toast from "react-hot-toast";

type MediaFileT = {
  id: string;
  name: string;
  url: string;
  size: number;
  contentType: string;
  folderId: string | null;
  createdAt: string;
  uploadedBy: { id: string; name: string | null; email: string };
};

type MediaFolderT = {
  id: string;
  name: string;
  parentId: string | null;
  _count: { children: number; files: number };
};

type Breadcrumb = { id: string; name: string };

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

export function DocumentBrowser() {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<MediaFolderT[]>([]);
  const [files, setFiles] = useState<MediaFileT[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const fetchContents = useCallback(async (folderId: string | null) => {
    setLoading(true);
    try {
      const url = folderId
        ? `/api/media/folders?parentId=${folderId}`
        : "/api/media/folders";
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFolders(data.folders);
      setFiles(data.files);
      setBreadcrumbs(data.breadcrumbs);
    } catch {
      toast.error("Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContents(currentFolderId);
  }, [currentFolderId, fetchContents]);

  function navigateTo(folderId: string | null) {
    setCurrentFolderId(folderId);
    setSearch("");
  }

  const handleUpload = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      setUploading(true);
      let uploadedCount = 0;

      try {
        for (const file of Array.from(fileList)) {
          const formData = new FormData();
          formData.append("file", file);
          if (currentFolderId) formData.append("folderId", currentFolderId);

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
    },
    [currentFolderId]
  );

  async function handleDeleteFile(file: MediaFileT) {
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

  async function handleDeleteFolder(folder: MediaFolderT) {
    if (!confirm(`Ordner "${folder.name}" wirklich löschen?`)) return;
    try {
      const res = await fetch(`/api/media/folders/${folder.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Löschen fehlgeschlagen");
        return;
      }
      setFolders((prev) => prev.filter((f) => f.id !== folder.id));
      toast.success("Ordner gelöscht");
    } catch {
      toast.error("Löschen fehlgeschlagen");
    }
  }

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    try {
      const res = await fetch("/api/media/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFolderName.trim(),
          parentId: currentFolderId,
        }),
      });
      if (!res.ok) throw new Error();
      const folder = await res.json();
      setFolders((prev) => [...prev, folder]);
      setNewFolderName("");
      setShowNewFolder(false);
      toast.success("Ordner erstellt");
    } catch {
      toast.error("Ordner konnte nicht erstellt werden");
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

  const filteredFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-sm flex-wrap">
        <button
          onClick={() => navigateTo(null)}
          className={`flex items-center gap-1 px-2 py-1 rounded-md transition ${
            !currentFolderId
              ? "text-primary-700 font-medium"
              : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Home className="w-3.5 h-3.5" />
          Dokumente
        </button>
        {breadcrumbs.map((crumb) => (
          <div key={crumb.id} className="flex items-center gap-1">
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <button
              onClick={() => navigateTo(crumb.id)}
              className={`px-2 py-1 rounded-md transition ${
                crumb.id === currentFolderId
                  ? "text-primary-700 font-medium"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {crumb.name}
            </button>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Suchen…"
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
        <button
          onClick={() => {
            setShowNewFolder(true);
            setTimeout(() => folderInputRef.current?.focus(), 50);
          }}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
        >
          <FolderPlus className="w-4 h-4" />
          Neuer Ordner
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition"
        >
          <Upload className="w-4 h-4" />
          Hochladen
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
      </div>

      {/* New Folder Inline */}
      {showNewFolder && (
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <Folder className="w-4 h-4 text-amber-500" />
          <input
            ref={folderInputRef}
            type="text"
            placeholder="Ordnername…"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateFolder();
              if (e.key === "Escape") {
                setShowNewFolder(false);
                setNewFolderName("");
              }
            }}
            className="flex-1 text-sm border-none focus:outline-none focus:ring-0 p-0"
          />
          <button
            onClick={handleCreateFolder}
            disabled={!newFolderName.trim()}
            className="px-3 py-1 text-xs font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 transition"
          >
            Erstellen
          </button>
          <button
            onClick={() => {
              setShowNewFolder(false);
              setNewFolderName("");
            }}
            className="p-1 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Drop Zone Overlay */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative rounded-xl transition-all ${
          dragActive
            ? "ring-2 ring-primary-500 ring-offset-2"
            : ""
        }`}
      >
        {dragActive && (
          <div className="absolute inset-0 z-10 bg-primary-50/80 backdrop-blur-sm rounded-xl flex items-center justify-center border-2 border-dashed border-primary-400">
            <div className="text-center">
              <Upload className="w-8 h-8 text-primary-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-primary-700">
                Dateien hier ablegen
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin mx-auto" />
          </div>
        ) : filteredFolders.length === 0 && filteredFiles.length === 0 ? (
          <div
            className="bg-white rounded-xl border border-slate-200 p-12 text-center cursor-pointer hover:bg-slate-50 transition"
            onClick={() => fileInputRef.current?.click()}
          >
            <Folder className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">
              {search
                ? "Keine Ergebnisse"
                : "Dieser Ordner ist leer"}
            </p>
            {!search && (
              <p className="text-xs text-slate-400 mt-1">
                Dateien hierher ziehen oder klicken zum Hochladen
              </p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {uploading && (
              <div className="flex items-center gap-2 px-4 py-2 bg-primary-50 border-b border-primary-100">
                <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
                <p className="text-sm text-primary-700">Wird hochgeladen…</p>
              </div>
            )}
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                    Name
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                    Größe
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                    Geändert
                  </th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {/* Folders */}
                {filteredFolders.map((folder) => (
                  <tr
                    key={folder.id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                    onClick={() => navigateTo(folder.id)}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-amber-50 text-amber-500">
                          <Folder className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {folder.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {folder._count.children > 0 &&
                              `${folder._count.children} Ordner`}
                            {folder._count.children > 0 &&
                              folder._count.files > 0 &&
                              ", "}
                            {folder._count.files > 0 &&
                              `${folder._count.files} ${folder._count.files === 1 ? "Datei" : "Dateien"}`}
                            {folder._count.children === 0 &&
                              folder._count.files === 0 &&
                              "Leer"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-slate-400 hidden sm:table-cell">
                      —
                    </td>
                    <td className="px-4 py-2.5 text-sm text-slate-400 hidden md:table-cell">
                      —
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFolder(folder);
                          }}
                          className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                          title="Ordner löschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Files */}
                {filteredFiles.map((file) => {
                  const Icon = getFileIcon(file.contentType);
                  const colorClass = getFileColor(file.contentType);
                  return (
                    <tr
                      key={file.id}
                      className="hover:bg-slate-50 transition-colors group"
                    >
                      <td className="px-4 py-2.5">
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
                      <td className="px-4 py-2.5 text-sm text-slate-600 hidden sm:table-cell">
                        {formatFileSize(file.size)}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-slate-500 hidden md:table-cell whitespace-nowrap">
                        {formatDistanceToNow(new Date(file.createdAt), {
                          addSuffix: true,
                          locale: de,
                        })}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                            onClick={() => handleDeleteFile(file)}
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
    </div>
  );
}
