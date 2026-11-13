"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  Database,
  CalendarClock,
  FolderArchive,
  HardDrive,
  Download,
  Upload,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  Trash2,
  RotateCcw,
  Search,
  Check,
  ShieldAlert,
  ShieldCheck,
  ChevronRight,
  FolderOpen,
  Calendar,
  Layers,
  HelpCircle,
  FileText,
  X,
  Server,
  ExternalLink,
} from "lucide-react";

interface BackupMetadata {
  filename: string;
  sizeBytes: number;
  createdAt: string;
  totalRecords: number | null;
  backupType: string;
  trigger: "manual" | "auto_schedule" | "export";
  version: string | null;
  counts?: {
    rooms?: number;
    users?: number;
    bills?: number;
    payments?: number;
    requests?: number;
    announcements?: number;
    messages?: number;
    notifications?: number;
  } | null;
}

interface BackupStatusResponse {
  success: boolean;
  config: {
    backupPath: string;
    defaultPath: string;
    schedule: "everyday" | "every_3_days" | "1_week" | "per_month" | "manual";
    autoRetentionCount: number;
    lastBackupAt: string | null;
    lastBackupStatus: "success" | "failed" | "never" | null;
    lastBackupFilename: string | null;
    lastBackupSize: number | null;
    nextScheduledBackupAt: string | null;
  };
  database: {
    engine: string;
    schema: string;
    totalRecords: number;
    counts: {
      rooms: number;
      users: number;
      bills: number;
      payments: number;
      requests: number;
      announcements: number;
      messages: number;
      notifications: number;
    };
    status: string;
  };
  storage: {
    totalBackupsCount: number;
    totalStorageBytes: number;
  };
  backups: BackupMetadata[];
}

const SCHEDULE_OPTIONS = [
  {
    key: "everyday",
    title: "Everyday",
    tagline: "Daily at 2:00 AM",
    description: "Nightly automated snapshot for high activity properties.",
  },
  {
    key: "every_3_days",
    title: "Every 3 Days",
    tagline: "Every 72 Hours at 2:00 AM",
    description: "Balanced frequency ideal for typical property management.",
  },
  {
    key: "1_week",
    title: "1 Week",
    tagline: "Weekly at 2:00 AM",
    description: "Weekly automated snapshot to save storage overhead.",
  },
  {
    key: "per_month",
    title: "Per Month",
    tagline: "1st of Every Month at 2:00 AM",
    description: "Monthly milestone backup for long-term historical records.",
  },
  {
    key: "manual",
    title: "Manual Only",
    tagline: "Automations Paused",
    description: "No automatic timer. Backups occur only on admin command.",
  },
] as const;

export default function AdminBackupPage() {
  const [data, setData] = useState<BackupStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isBrowsingFolder, setIsBrowsingFolder] = useState(false);
  const [isOpeningFolder, setIsOpeningFolder] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Settings form state
  const [selectedSchedule, setSelectedSchedule] = useState<string>("everyday");
  const [customPath, setCustomPath] = useState<string>("");

  // Modals
  const [restoreModalData, setRestoreModalData] = useState<{
    type: "local" | "upload";
    filename: string;
    file?: File;
    sizeBytes?: number;
    records?: number | null;
  } | null>(null);
  const [confirmInput, setConfirmInput] = useState("");

  const [deleteModalFilename, setDeleteModalFilename] = useState<string | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  // File upload input ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch status
  const fetchBackupStatus = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await api.get("/admin/backup/status");
      if (res.data && res.data.success) {
        setData(res.data);
        setSelectedSchedule(res.data.config.schedule || "everyday");
        setCustomPath(res.data.config.backupPath || "");
      }
    } catch (err: any) {
      console.error("Failed to fetch backup status:", err);
      toast.error("Failed to load backup status");
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBackupStatus();

    const handleGlobalRefresh = () => {
      fetchBackupStatus(true);
    };

    window.addEventListener("renttrack_refresh_all", handleGlobalRefresh);
    return () => {
      window.removeEventListener("renttrack_refresh_all", handleGlobalRefresh);
    };
  }, []);

  // Format bytes helper
  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Format date helper
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "Never";
    try {
      const d = new Date(dateString);
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return dateString;
    }
  };

  // Filtered backups list
  const filteredBackups = useMemo(() => {
    if (!data?.backups) return [];
    if (!searchQuery.trim()) return data.backups;
    const q = searchQuery.toLowerCase();
    return data.backups.filter(
      (b) =>
        b.filename.toLowerCase().includes(q) ||
        b.trigger.toLowerCase().includes(q) ||
        (b.createdAt && b.createdAt.toLowerCase().includes(q)),
    );
  }, [data?.backups, searchQuery]);

  // Handle Save Settings
  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const res = await api.post("/admin/backup/settings", {
        schedule: selectedSchedule,
        backupPath: customPath.trim(),
      });
      if (res.data && res.data.success) {
        toast.success("Backup Settings Saved", {
          description: `Schedule set to ${selectedSchedule}. Folder path validated successfully.`,
        });
        await fetchBackupStatus(true);
      }
    } catch (err: any) {
      console.error("Failed to save backup settings:", err);
      const msg =
        err.response?.data?.message || "Failed to update backup settings";
      toast.error("Settings Update Failed", { description: msg });
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Reset path to server default
  const handleResetToDefaultPath = () => {
    if (data?.config.defaultPath) {
      setCustomPath(data.config.defaultPath);
      toast.info(
        "Folder path reset to server default. Remember to click 'Save Settings' to apply.",
      );
    }
  };

  // Browse Folder Window (Opens native Windows folder picker dialog)
  const handleBrowseFolder = async () => {
    setIsBrowsingFolder(true);
    const toastId = toast.loading("Opening Folder Window...", {
      description:
        "Please select your backup storage folder in the dialog window.",
    });

    try {
      const res = await api.post("/admin/backup/browse-folder", {
        currentPath: customPath || "",
      });

      toast.dismiss(toastId);

      if (res.data && res.data.success && res.data.selectedPath) {
        const newPath = res.data.selectedPath;
        setCustomPath(newPath);
        toast.success("Folder Window Selected", {
          description: `Folder set to: ${newPath}`,
        });

        // Auto-save the validated path to backend
        try {
          await api.post("/admin/backup/settings", {
            schedule: selectedSchedule,
            backupPath: newPath,
          });
          await fetchBackupStatus(true);
        } catch {}
      } else if (res.data && res.data.cancelled) {
        toast.info("Folder selection cancelled");
      } else {
        // Fallback to browser directory picker if supported
        if (typeof window !== "undefined" && "showDirectoryPicker" in window) {
          try {
            const dirHandle = await (window as any).showDirectoryPicker();
            if (dirHandle && dirHandle.name) {
              setCustomPath(dirHandle.name);
              toast.success(`Selected folder: ${dirHandle.name}`);
            }
          } catch (e: any) {
            if (e.name !== "AbortError") {
              toast.error("Could not access directory picker");
            }
          }
        }
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      console.error("Browse folder error:", err);
      // Try browser directory picker fallback
      if (typeof window !== "undefined" && "showDirectoryPicker" in window) {
        try {
          const dirHandle = await (window as any).showDirectoryPicker();
          if (dirHandle && dirHandle.name) {
            setCustomPath(dirHandle.name);
            toast.success(`Selected folder: ${dirHandle.name}`);
            return;
          }
        } catch (e: any) {
          if (e.name === "AbortError") return;
        }
      }
      toast.error("Could not open folder window", {
        description: err.response?.data?.message || err.message,
      });
    } finally {
      setIsBrowsingFolder(false);
    }
  };

  // Open active folder in Windows File Explorer
  const handleOpenInFileExplorer = async (folderPath?: string) => {
    setIsOpeningFolder(true);
    try {
      const res = await api.post("/admin/backup/open-folder", {
        folderPath: folderPath || customPath || "",
      });
      if (res.data && res.data.success) {
        toast.success("Folder Window Opened", {
          description:
            res.data.message || "Windows File Explorer window opened.",
        });
      }
    } catch (err: any) {
      console.error("Open in explorer error:", err);
      toast.error("Could not open File Explorer window", {
        description: err.response?.data?.message || err.message,
      });
    } finally {
      setIsOpeningFolder(false);
    }
  };

  // Handle Manual Backup Creation
  const handleCreateManualBackup = async () => {
    setIsCreatingBackup(true);
    try {
      const res = await api.post("/admin/backup/create");
      if (res.data && res.data.success) {
        toast.success("Backup Created Successfully", {
          description: `Archive "${res.data.backup.filename}" with ${res.data.backup.totalRecords} records stored on disk.`,
        });
        await fetchBackupStatus(true);
      }
    } catch (err: any) {
      console.error("Failed to create manual backup:", err);
      const msg =
        err.response?.data?.message || "Could not generate database snapshot";
      toast.error("Backup Failed", { description: msg });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // Handle Direct Export (Browser File Download)
  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      toast.info("Generating Database Snapshot...", {
        description: "Compiling all 8 tables and schemas into JSON format.",
      });

      const res = await api.get("/admin/backup/export", {
        responseType: "blob",
      });

      // Extract filename from response header or generate default
      let filename = `RentTrack_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      const disposition = res.headers["content-disposition"];
      if (disposition && disposition.indexOf("filename=") !== -1) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(
          disposition,
        );
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, "");
        }
      }

      const blob = new Blob([res.data], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      toast.success("Snapshot Exported Successfully", {
        description: `Downloaded "${filename}" to your computer.`,
      });
      await fetchBackupStatus(true);
    } catch (err: any) {
      console.error("Failed to export backup file:", err);
      toast.error("Export Failed", {
        description: "Unable to stream backup archive from server.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Download from Server Archive Table
  const handleDownloadArchive = async (filename: string) => {
    try {
      const res = await api.get(
        `/admin/backup/download/${encodeURIComponent(filename)}`,
        {
          responseType: "blob",
        },
      );

      const blob = new Blob([res.data], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      toast.success("File Downloaded", {
        description: `Saved "${filename}" to your local device.`,
      });
    } catch (err: any) {
      console.error("Failed to download archive:", err);
      toast.error("Download Failed", {
        description: "Could not retrieve the backup file from server disk.",
      });
    }
  };

  // Handle Trigger File Upload Dialog
  const handleSelectFileToRestore = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      toast.error("Invalid File Type", {
        description:
          "Please select a valid .json RentTrack backup snapshot file.",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setRestoreModalData({
      type: "upload",
      filename: file.name,
      file,
      sizeBytes: file.size,
    });
    setConfirmInput("");

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Handle Select Archive from Table for Restoration
  const handleSelectArchiveToRestore = (backup: BackupMetadata) => {
    setRestoreModalData({
      type: "local",
      filename: backup.filename,
      sizeBytes: backup.sizeBytes,
      records: backup.totalRecords,
    });
    setConfirmInput("");
  };

  // Perform Restore (Local or Uploaded File)
  const handleExecuteRestore = async () => {
    if (!restoreModalData) return;
    if (confirmInput.trim().toUpperCase() !== "RESTORE") {
      toast.error("Confirmation Required", {
        description:
          "Please type RESTORE exactly to proceed with database replacement.",
      });
      return;
    }

    setIsRestoring(true);
    const toastId = toast.loading("Restoring Database...", {
      description:
        "Safely clearing tables and repopulating records within a protected transaction.",
    });

    try {
      let res;
      if (restoreModalData.type === "local") {
        res = await api.post(
          `/admin/backup/restore-local/${encodeURIComponent(restoreModalData.filename)}`,
        );
      } else if (restoreModalData.type === "upload" && restoreModalData.file) {
        const formData = new FormData();
        formData.append("backupFile", restoreModalData.file);
        res = await api.post("/admin/backup/restore", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      }

      toast.dismiss(toastId);
      if (res && res.data && res.data.success) {
        toast.success("Database Restoration Successful!", {
          description:
            res.data.message ||
            "All records and tables have been restored successfully.",
        });
        setRestoreModalData(null);
        setConfirmInput("");
        await fetchBackupStatus(true);
        // Inform other pages to refresh
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("renttrack_refresh_all"));
        }
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      console.error("Restoration failed:", err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Failed to restore database state.";
      toast.error("Restoration Failed", {
        description: msg,
      });
    } finally {
      setIsRestoring(false);
    }
  };

  // Handle Delete Archive
  const handleExecuteDelete = async () => {
    if (!deleteModalFilename) return;
    setIsDeleting(true);
    try {
      const res = await api.delete(
        `/admin/backup/${encodeURIComponent(deleteModalFilename)}`,
      );
      if (res.data && res.data.success) {
        toast.success("Archive Deleted", {
          description: `Removed "${deleteModalFilename}" from server storage.`,
        });
        setDeleteModalFilename(null);
        await fetchBackupStatus(true);
      }
    } catch (err: any) {
      console.error("Failed to delete archive:", err);
      const msg = err.response?.data?.message || "Failed to delete backup file";
      toast.error("Delete Failed", { description: msg });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 w-full p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* Hidden File Input for Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleSelectFileToRestore}
      />

      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#0055a5] dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/40">
              <Database className="w-5 h-5 stroke-[2.2]" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              System Backup & Disaster Recovery
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1 font-medium">
            Automate scheduled snapshots, import/export database files, and
            protect property records against system malfunctions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => fetchBackupStatus(false)}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            title="Refresh Status"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportBackup}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/40 text-[#0055a5] dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <Download
              className={`w-4 h-4 ${isExporting ? "animate-bounce" : ""}`}
            />
            <span>Export Snapshot</span>
          </button>

          <button
            onClick={handleCreateManualBackup}
            disabled={isCreatingBackup}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#0055a5] hover:bg-[#004182] text-white transition-all cursor-pointer shadow-sm hover:shadow-md disabled:opacity-50"
          >
            <Server
              className={`w-4 h-4 ${isCreatingBackup ? "animate-spin" : ""}`}
            />
            <span>
              {isCreatingBackup ? "Creating Snapshot..." : "Create Backup Now"}
            </span>
          </button>
        </div>
      </div>

      {/* 2. Top Telemetry KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Database Status */}
        <div className="relative overflow-hidden bg-card border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-5 shadow-2xs group hover:border-blue-300 dark:hover:border-blue-800/80 transition-colors">
          {/* Data Partition & Disk Platter Orbit */}
          <div
            className="pointer-events-none select-none absolute inset-0 overflow-hidden"
            aria-hidden="true"
          >
            <div className="absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r from-blue-500 via-blue-400/60 to-transparent dark:from-blue-400 dark:via-blue-500/40 dark:to-transparent" />
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-blue-500/[0.04] dark:bg-blue-400/[0.03] blur-xl" />
            <svg
              className="absolute -bottom-1 right-2 w-32 h-14 opacity-[0.14] dark:opacity-[0.20] text-blue-600 dark:text-blue-400"
              viewBox="0 0 128 56"
              fill="none"
              stroke="currentColor"
            >
              <ellipse cx="64" cy="18" rx="48" ry="10" strokeWidth="1.2" />
              <path
                d="M16 18 V34 C16 39.5 37.5 44 64 44 C90.5 44 112 39.5 112 34 V18"
                strokeWidth="1.2"
              />
              <path
                d="M16 26 C16 31.5 37.5 36 64 36 C90.5 36 112 31.5 112 26"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.6"
              />
            </svg>
          </div>
          <div className="relative z-10 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Database Records
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#0055a5] dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center shrink-0">
              <Database className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <div className="relative z-10 mt-2">
            <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
              {isLoading
                ? "..."
                : (data?.database.totalRecords ?? 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 flex items-center gap-1.5 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              <span>PostgreSQL 16 • 8 Core Tables</span>
            </p>
          </div>
        </div>

        {/* Card 2: Backup Schedule */}
        <div className="relative overflow-hidden bg-card border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-5 shadow-2xs group hover:border-emerald-300 dark:hover:border-emerald-800/80 transition-colors">
          {/* Recurrence Chronometer Wheel */}
          <div
            className="pointer-events-none select-none absolute inset-0 overflow-hidden"
            aria-hidden="true"
          >
            <div className="absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r from-emerald-500 via-emerald-400/60 to-transparent dark:from-emerald-400 dark:via-emerald-500/40 dark:to-transparent" />
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-emerald-500/[0.04] dark:bg-emerald-400/[0.03] blur-xl" />
            <svg
              className="absolute -bottom-2 right-2 w-28 h-16 opacity-[0.14] dark:opacity-[0.20] text-emerald-600 dark:text-emerald-400"
              viewBox="0 0 112 64"
              fill="none"
              stroke="currentColor"
            >
              <circle
                cx="56"
                cy="32"
                r="24"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
              <path
                d="M56 18 V32 L66 38"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <circle cx="56" cy="32" r="2.5" fill="currentColor" />
            </svg>
          </div>
          <div className="relative z-10 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Backup Schedule
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-center shrink-0">
              <CalendarClock className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <div className="relative z-10 mt-2">
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 capitalize">
              {isLoading
                ? "..."
                : SCHEDULE_OPTIONS.find((s) => s.key === data?.config.schedule)
                    ?.title || "Everyday"}
            </div>
            <p
              className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 truncate font-medium"
              title={data?.config.nextScheduledBackupAt || "Manual Only"}
            >
              Next:{" "}
              {data?.config.schedule === "manual"
                ? "Manual triggers only"
                : formatDate(data?.config.nextScheduledBackupAt)}
            </p>
          </div>
        </div>

        {/* Card 3: Storage Folder */}
        <div className="relative overflow-hidden bg-card border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-5 shadow-2xs group hover:border-amber-300 dark:hover:border-amber-800/80 transition-colors">
          {/* Filesystem Hierarchy Bracket */}
          <div
            className="pointer-events-none select-none absolute inset-0 overflow-hidden"
            aria-hidden="true"
          >
            <div className="absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r from-amber-500 via-amber-400/60 to-transparent dark:from-amber-400 dark:via-amber-500/40 dark:to-transparent" />
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-amber-500/[0.04] dark:bg-amber-400/[0.03] blur-xl" />
            <svg
              className="absolute -bottom-1 right-2 w-32 h-14 opacity-[0.14] dark:opacity-[0.20] text-amber-600 dark:text-amber-400"
              viewBox="0 0 128 56"
              fill="none"
              stroke="currentColor"
            >
              <path d="M20 16 H44 L52 24 H108 V48 H20 Z" strokeWidth="1.2" />
              <path
                d="M40 28 H88 M40 36 H72"
                strokeWidth="1"
                opacity="0.6"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="relative z-10 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Storage Path
            </span>
            <button
              type="button"
              onClick={() => handleOpenInFileExplorer(data?.config.backupPath)}
              disabled={isOpeningFolder}
              title="Click to open this folder in Windows File Explorer"
              className="w-9 h-9 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40 flex items-center justify-center shrink-0 cursor-pointer transition-colors shadow-2xs"
            >
              <FolderArchive className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>
          <div className="relative z-10 mt-2">
            <div
              className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate font-mono"
              title={data?.config.backupPath}
            >
              {isLoading
                ? "..."
                : data?.config.backupPath
                  ? data.config.backupPath.split(/[\\/]/).pop() || "backups"
                  : "backups"}
            </div>
            <button
              type="button"
              onClick={() => handleOpenInFileExplorer(data?.config.backupPath)}
              disabled={isOpeningFolder}
              className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline mt-1 truncate block text-left font-medium cursor-pointer"
              title="Click to open folder in File Explorer"
            >
              {data?.config.backupPath || "Server storage directory"} ↗
            </button>
          </div>
        </div>

        {/* Card 4: Archive Library */}
        <div className="relative overflow-hidden bg-card border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-5 shadow-2xs group hover:border-purple-300 dark:hover:border-purple-800/80 transition-colors">
          {/* Archive Vault Cassette Plates */}
          <div
            className="pointer-events-none select-none absolute inset-0 overflow-hidden"
            aria-hidden="true"
          >
            <div className="absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r from-purple-500 via-purple-400/60 to-transparent dark:from-purple-400 dark:via-purple-500/40 dark:to-transparent" />
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-purple-500/[0.04] dark:bg-purple-400/[0.03] blur-xl" />
            <svg
              className="absolute -bottom-1 right-2 w-32 h-14 opacity-[0.14] dark:opacity-[0.20] text-purple-600 dark:text-purple-400"
              viewBox="0 0 128 56"
              fill="none"
              stroke="currentColor"
            >
              <rect
                x="28"
                y="14"
                width="80"
                height="18"
                rx="3"
                strokeWidth="1.2"
              />
              <rect
                x="24"
                y="24"
                width="88"
                height="18"
                rx="3"
                strokeWidth="1.2"
              />
              <rect
                x="20"
                y="34"
                width="96"
                height="18"
                rx="3"
                strokeWidth="1.2"
              />
              <circle cx="96" cy="43" r="2" fill="currentColor" />
            </svg>
          </div>
          <div className="relative z-10 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Stored Archives
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40 flex items-center justify-center shrink-0">
              <HardDrive className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
          <div className="relative z-10 mt-2">
            <div className="text-2xl sm:text-3xl font-black font-mono text-purple-600 dark:text-purple-400">
              {isLoading ? "..." : (data?.storage.totalBackupsCount ?? 0)}{" "}
              <span className="text-xs font-semibold text-slate-500">
                files
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 font-medium">
              {isLoading
                ? "..."
                : formatBytes(data?.storage.totalStorageBytes || 0)}{" "}
              total disk usage
            </p>
          </div>
        </div>
      </div>

      {/* 3. Settings & Configuration Panel */}
      <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-zinc-800/80">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-[#0055a5] dark:text-blue-400" />
              <span>Automated Schedule & Storage Destination</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 font-medium">
              Choose how frequently the system captures automatic point-in-time
              snapshots and designate where files are stored on disk.
            </p>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={isSavingSettings}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#0055a5] hover:bg-[#004182] text-white transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>
              {isSavingSettings ? "Saving Settings..." : "Save Settings"}
            </span>
          </button>
        </div>

        {/* Schedule Selector Grid */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 flex items-center justify-between">
            <span>Automated Backup Frequency:</span>
            <span className="text-[11px] font-normal text-slate-500">
              Active: {selectedSchedule.replace(/_/g, " ")}
            </span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {SCHEDULE_OPTIONS.map((opt) => {
              const isSelected = selectedSchedule === opt.key;
              return (
                <div
                  key={opt.key}
                  onClick={() => setSelectedSchedule(opt.key)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "border-[#0055a5] dark:border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 ring-1 ring-[#0055a5]/30 shadow-2xs"
                      : "border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-slate-300 dark:hover:border-zinc-700 hover:bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      {opt.title}
                    </span>
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center border text-[10px] ${
                        isSelected
                          ? "bg-[#0055a5] border-[#0055a5] text-white"
                          : "border-slate-300 dark:border-zinc-700 bg-transparent text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                  </div>
                  <div className="mt-2">
                    <span className="inline-block text-[10px] font-bold text-[#0055a5] dark:text-blue-400 bg-blue-100/60 dark:bg-blue-900/40 px-1.5 py-0.5 rounded-md">
                      {opt.tagline}
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1.5 leading-snug">
                      {opt.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Storage Path Input */}
        <div className="space-y-2 pt-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 flex items-center justify-between">
            <span>Backup Folder Storage Path:</span>
            <span className="text-[11px] font-normal text-slate-500">
              Click folder icon or &quot;Browse Folder&quot; to pick directly
            </span>
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <button
                type="button"
                onClick={handleBrowseFolder}
                disabled={isBrowsingFolder}
                title="Click folder icon to open your folder window and pick a folder"
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 text-[#0055a5] dark:text-blue-400 transition-colors cursor-pointer group"
              >
                <FolderOpen
                  className={`w-4 h-4 group-hover:scale-110 transition-transform ${isBrowsingFolder ? "animate-spin" : ""}`}
                />
              </button>
              <input
                type="text"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                placeholder="Click the folder icon or Browse Folder to choose directory..."
                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm font-mono rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0055a5] transition-all font-medium"
              />
            </div>

            <button
              type="button"
              onClick={handleBrowseFolder}
              disabled={isBrowsingFolder}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#0055a5] hover:bg-[#004182] text-white transition-all cursor-pointer shadow-xs disabled:opacity-50 whitespace-nowrap"
              title="Open folder window to choose backup directory"
            >
              <FolderOpen
                className={`w-4 h-4 ${isBrowsingFolder ? "animate-spin" : ""}`}
              />
              <span>
                {isBrowsingFolder ? "Opening Window..." : "Browse Folder"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenInFileExplorer()}
              disabled={isOpeningFolder}
              title="Open active backup folder in Windows File Explorer"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all cursor-pointer whitespace-nowrap shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Explorer</span>
            </button>

            <button
              type="button"
              onClick={handleResetToDefaultPath}
              className="px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all cursor-pointer whitespace-nowrap"
            >
              Reset
            </button>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              Clicking the folder icon opens your folder window directly so you
              don&apos;t have to manually type the path.
            </span>
          </p>
        </div>
      </div>

      {/* 4. Import & Export Action Hub Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Export Card */}
        <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#0055a5] dark:text-blue-400 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Export System Backup (.JSON)
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 font-medium leading-relaxed">
                Generates a live snapshot of all 8 core tables (rooms, tenants,
                billing, payments, maintenance tickets, announcements, messages,
                and notifications) and saves it directly to your computer.
              </p>
            </div>

            <div className="rounded-xl p-3 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 space-y-1.5 text-xs text-slate-600 dark:text-zinc-400">
              <div className="flex items-center justify-between">
                <span>Rooms & Tenants:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
                  {data?.database.counts.rooms ?? 0} rooms •{" "}
                  {data?.database.counts.users ?? 0} users
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Bills & Payments:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
                  {data?.database.counts.bills ?? 0} bills •{" "}
                  {data?.database.counts.payments ?? 0} payments
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Requests & Logs:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
                  {data?.database.counts.requests ?? 0} tickets •{" "}
                  {data?.database.counts.messages ?? 0} messages
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleExportBackup}
            disabled={isExporting}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#0055a5] hover:bg-[#004182] text-white transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>
              {isExporting ? "Compiling Snapshot..." : "Export & Download File"}
            </span>
          </button>
        </div>

        {/* Import & Restore Card */}
        <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Import & Restore from File
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 font-medium leading-relaxed">
                Upload a previous RentTrack .JSON backup file to restore
                complete operational data if the server malfunctions, loses
                power, or suffers data corruption.
              </p>
            </div>

            <div className="rounded-xl p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Transactional Safety Guarantee</span>
              </div>
              <p className="text-[11px] text-amber-700/90 dark:text-amber-400/80 leading-snug">
                Restorations execute inside an atomic transaction (
                <code className="font-mono">BEGIN...COMMIT</code>). If anything
                fails, all tables automatically rollback with zero data loss.
              </p>
            </div>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold border-2 border-dashed border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:border-[#0055a5] hover:text-[#0055a5] dark:hover:border-blue-500 dark:hover:text-blue-400 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Select .JSON Backup File to Restore</span>
          </button>
        </div>
      </div>

      {/* 5. Server Archive Library Table */}
      <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FolderArchive className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span>Server Backup Archives Library</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 font-medium">
              Archives currently stored in the configured storage folder on the
              server.
            </p>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search archives..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0055a5] transition-all font-medium"
            />
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800">
          <table className="w-full text-left text-xs text-slate-600 dark:text-zinc-400 border-collapse">
            <thead className="bg-slate-50 dark:bg-zinc-900/80 text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-zinc-400 border-b border-slate-200 dark:border-zinc-800">
              <tr>
                <th className="px-4 py-3">Archive Filename</th>
                <th className="px-4 py-3">Trigger Type</th>
                <th className="px-4 py-3">Timestamp Created</th>
                <th className="px-4 py-3">Records Inside</th>
                <th className="px-4 py-3">File Size</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 font-medium">
              {filteredBackups.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-8 text-slate-400 dark:text-zinc-500"
                  >
                    {searchQuery
                      ? "No backup archives matched your search."
                      : "No backup files found in this folder yet."}
                  </td>
                </tr>
              ) : (
                filteredBackups.map((b) => (
                  <tr
                    key={b.filename}
                    className="hover:bg-slate-50/80 dark:hover:bg-zinc-900/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileJson className="w-4 h-4 text-blue-500 shrink-0" />
                        <span
                          className="font-mono font-bold text-slate-900 dark:text-zinc-200 truncate max-w-xs"
                          title={b.filename}
                        >
                          {b.filename}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          b.trigger === "auto_schedule"
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40"
                            : b.trigger === "export"
                              ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-900/40"
                              : "bg-blue-50 dark:bg-blue-950/40 text-[#0055a5] dark:text-blue-400 border border-blue-200 dark:border-blue-900/40"
                        }`}
                      >
                        {b.trigger === "auto_schedule"
                          ? "Scheduled"
                          : b.trigger === "export"
                            ? "Exported"
                            : "Manual"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-zinc-300">
                      {formatDate(b.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800 dark:text-zinc-200">
                      {b.totalRecords !== null
                        ? `${b.totalRecords.toLocaleString()} records`
                        : "Full Snapshot"}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-zinc-400 whitespace-nowrap">
                      {formatBytes(b.sizeBytes)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleDownloadArchive(b.filename)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 transition-colors cursor-pointer"
                          title="Download File to Computer"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleSelectArchiveToRestore(b)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors text-[11px] font-bold cursor-pointer"
                          title="Restore Database from this file"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restore</span>
                        </button>
                        <button
                          onClick={() => setDeleteModalFilename(b.filename)}
                          className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 transition-colors cursor-pointer"
                          title="Delete Archive from Disk"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Restore Confirmation Modal */}
      <AnimatePresence>
        {restoreModalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden p-6 space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      Confirm Database Restoration
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                      High-impact operational procedure
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setRestoreModalData(null);
                    setConfirmInput("");
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-xs text-red-800 dark:text-red-300 space-y-1.5 leading-relaxed">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>Warning: This will replace current live records!</span>
                </p>
                <p>
                  Restoring will clear existing rows in all 8 tables and
                  repopulate them from this snapshot file. Sequence counters
                  will be automatically reset to ensure ongoing primary key
                  continuity.
                </p>
              </div>

              {/* Target Archive Details */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Source:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
                    {restoreModalData.type === "upload"
                      ? "Uploaded File"
                      : "Server Storage"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Filename:</span>
                  <span
                    className="font-mono font-bold text-slate-800 dark:text-zinc-200 truncate max-w-xs"
                    title={restoreModalData.filename}
                  >
                    {restoreModalData.filename}
                  </span>
                </div>
                {restoreModalData.sizeBytes && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">File Size:</span>
                    <span className="font-mono text-slate-800 dark:text-zinc-200">
                      {formatBytes(restoreModalData.sizeBytes)}
                    </span>
                  </div>
                )}
              </div>

              {/* Security confirmation prompt */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Type{" "}
                  <span className="font-mono text-red-600 dark:text-red-400 font-black">
                    RESTORE
                  </span>{" "}
                  below to proceed:
                </label>
                <input
                  type="text"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder="Type RESTORE"
                  className="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all font-bold"
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRestoreModalData(null);
                    setConfirmInput("");
                  }}
                  disabled={isRestoring}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteRestore}
                  disabled={
                    confirmInput.trim().toUpperCase() !== "RESTORE" ||
                    isRestoring
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-red-600 hover:bg-red-700 text-white transition-all cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <RotateCcw
                    className={`w-4 h-4 ${isRestoring ? "animate-spin" : ""}`}
                  />
                  <span>
                    {isRestoring
                      ? "Restoring Database..."
                      : "Proceed with Restoration"}
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModalFilename && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Delete Backup Archive
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                    Permanent file deletion
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Are you sure you want to permanently delete{" "}
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  &quot;{deleteModalFilename}&quot;
                </span>{" "}
                from the server disk? This file cannot be recovered once
                removed.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalFilename(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDelete}
                  disabled={isDeleting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-red-600 hover:bg-red-700 text-white transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <Trash2
                    className={`w-4 h-4 ${isDeleting ? "animate-spin" : ""}`}
                  />
                  <span>
                    {isDeleting ? "Deleting..." : "Delete Permanently"}
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
