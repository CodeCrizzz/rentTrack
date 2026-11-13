"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  Activity,
  Search,
  RefreshCw,
  Download,
  Filter,
  CreditCard,
  Users,
  Wrench,
  Megaphone,
  MessageSquare,
  LogOut,
  UserPlus,
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  FileSpreadsheet,
  Check,
  Building2,
} from "lucide-react";

interface ActivityLog {
  id: string;
  type: "payment" | "tenant" | "applicant" | "moveout" | "maintenance" | "announcement" | "message";
  title: string;
  description: string;
  details?: string;
  tenant_name?: string;
  room_number?: string;
  amount?: number;
  status?: string;
  reference_number?: string;
  date: string;
  link?: string;
}

export default function AdminActivityLogsPage() {
  const router = useRouter();

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | "payment" | "tenant" | "maintenance" | "announcement" | "message"
  >("all");
  const [timeFilter, setTimeFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const fetchLogs = async () => {
    setIsLoading(true);

    try {
      const { data } = await api.get("/admin/activity-logs");
      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch activity logs:", error);
      toast.error("Failed to load recent activity logs.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const handleRefresh = () => fetchLogs();
    window.addEventListener("renttrack_refresh_all", handleRefresh);
    window.addEventListener("renttrack-refresh-data", handleRefresh);
    return () => {
      window.removeEventListener("renttrack_refresh_all", handleRefresh);
      window.removeEventListener("renttrack-refresh-data", handleRefresh);
    };
  }, []);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Category filter
      if (selectedCategory !== "all") {
        if (selectedCategory === "tenant") {
          if (!["tenant", "applicant", "moveout"].includes(log.type)) return false;
        } else if (log.type !== selectedCategory) {
          return false;
        }
      }

      // Timeframe filter
      if (timeFilter !== "all") {
        const logDate = new Date(log.date);
        const now = new Date();
        if (timeFilter === "today") {
          if (
            logDate.getDate() !== now.getDate() ||
            logDate.getMonth() !== now.getMonth() ||
            logDate.getFullYear() !== now.getFullYear()
          ) {
            return false;
          }
        } else if (timeFilter === "week") {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          if (logDate < sevenDaysAgo) return false;
        } else if (timeFilter === "month") {
          if (
            logDate.getMonth() !== now.getMonth() ||
            logDate.getFullYear() !== now.getFullYear()
          ) {
            return false;
          }
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchTitle = (log.title || "").toLowerCase().includes(query);
        const matchDesc = (log.description || "").toLowerCase().includes(query);
        const matchDetails = (log.details || "").toLowerCase().includes(query);
        const matchTenant = (log.tenant_name || "").toLowerCase().includes(query);
        const matchRoom = (log.room_number || "").toLowerCase().includes(query);
        const matchRef = (log.reference_number || "").toLowerCase().includes(query);

        return (
          matchTitle ||
          matchDesc ||
          matchDetails ||
          matchTenant ||
          matchRoom ||
          matchRef
        );
      }

      return true;
    });
  }, [logs, selectedCategory, timeFilter, searchQuery]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, timeFilter]);

  // KPI Metrics
  const metrics = useMemo(() => {
    const totalEvents = logs.length;
    const paymentLogs = logs.filter((l) => l.type === "payment");
    const totalPaymentVolume = paymentLogs.reduce((sum, l) => sum + (l.amount || 0), 0);
    const maintenanceLogs = logs.filter((l) => l.type === "maintenance").length;
    const tenantLogs = logs.filter((l) =>
      ["tenant", "applicant", "moveout"].includes(l.type)
    ).length;

    return {
      totalEvents,
      paymentCount: paymentLogs.length,
      totalPaymentVolume,
      maintenanceLogs,
      tenantLogs,
    };
  }, [logs]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      toast.error("No activity logs to export.");
      return;
    }

    const headers = [
      "ID",
      "Timestamp",
      "Type",
      "Title",
      "Description",
      "Tenant Name",
      "Room",
      "Amount",
      "Status",
      "Reference",
      "Details",
    ];

    const rows = filteredLogs.map((l) => [
      l.id,
      new Date(l.date).toLocaleString(),
      l.type,
      `"${(l.title || "").replace(/"/g, '""')}"`,
      `"${(l.description || "").replace(/"/g, '""')}"`,
      `"${(l.tenant_name || "").replace(/"/g, '""')}"`,
      `"${(l.room_number || "").replace(/"/g, '""')}"`,
      l.amount ? l.amount.toFixed(2) : "",
      `"${(l.status || "").replace(/"/g, '""')}"`,
      `"${(l.reference_number || "").replace(/"/g, '""')}"`,
      `"${(l.details || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `renttrack_activity_logs_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Activity Logs Exported", {
      description: "CSV audit spreadsheet downloaded successfully.",
    });
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const now = new Date();
      const date = new Date(dateStr);
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case "payment":
        return <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case "maintenance":
        return <Wrench className="w-4 h-4 text-orange-600 dark:text-orange-400" />;
      case "applicant":
        return <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case "moveout":
        return <LogOut className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case "announcement":
        return <Megaphone className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />;
      case "message":
        return <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case "tenant":
      default:
        return <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getLogBadgeBg = (type: string) => {
    switch (type) {
      case "payment":
        return "text-emerald-600 dark:text-emerald-400";
      case "maintenance":
        return "text-orange-600 dark:text-orange-400";
      case "applicant":
        return "text-sky-600 dark:text-sky-400";
      case "moveout":
        return "text-purple-600 dark:text-purple-400";
      case "announcement":
        return "text-cyan-600 dark:text-cyan-400";
      case "message":
        return "text-indigo-600 dark:text-indigo-400";
      case "tenant":
      default:
        return "text-blue-600 dark:text-blue-400";
    }
  };

  return (
    <div className="w-full h-full flex-1 min-h-0 font-sans text-slate-900 dark:text-zinc-100 flex flex-col overflow-hidden gap-2 sm:gap-2.5">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-[#0055a5] dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                Activity Logs
              </h1>
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium mt-0.5">
                Comprehensive audit trail of resident transactions, maintenance tickets, and property operations.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportCSV}
            className="h-8 sm:h-8.5 px-3 sm:px-3.5 rounded-xl bg-[#0055a5] hover:bg-[#00478f] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Executive KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 shrink-0">
        {/* Card 1: Total Events */}
        <div className="relative overflow-hidden bg-card border border-slate-200/90 dark:border-zinc-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 shadow-2xs flex items-center justify-between group hover:border-blue-300 dark:hover:border-blue-800/80 transition-colors">
          {/* Chronological Audit Pulse Stream */}
          <div className="pointer-events-none select-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r from-blue-500 via-blue-400/60 to-transparent dark:from-blue-400 dark:via-blue-500/40 dark:to-transparent" />
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-blue-500/[0.04] dark:bg-blue-400/[0.03] blur-xl" />
            <svg className="absolute -bottom-1 right-2 w-32 h-14 opacity-[0.14] dark:opacity-[0.20] text-blue-600 dark:text-blue-400" viewBox="0 0 128 56" fill="none" stroke="currentColor">
              <path d="M0 40 H40 L52 16 L64 40 H128" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="40" cy="40" r="2.5" fill="currentColor" />
              <circle cx="52" cy="16" r="3" fill="currentColor" />
              <circle cx="64" cy="40" r="2.5" fill="currentColor" />
              <circle cx="96" cy="40" r="2" fill="currentColor" opacity="0.6" />
            </svg>
          </div>
          <div className="relative z-10">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Total Audit Logs
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-0.5 tracking-tight">
              {metrics.totalEvents}
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 font-medium">
              Across all operational channels
            </p>
          </div>
          <div className="relative z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#0055a5] dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center shrink-0 shadow-2xs">
            <Activity className="w-4.5 h-4.5 stroke-[2.2]" />
          </div>
        </div>

        {/* Card 2: Payment Transactions */}
        <div className="relative overflow-hidden bg-card border border-slate-200/90 dark:border-zinc-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 shadow-2xs flex items-center justify-between group hover:border-emerald-300 dark:hover:border-emerald-800/80 transition-colors">
          {/* Treasury Ascending Ledger Stream */}
          <div className="pointer-events-none select-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r from-emerald-500 via-emerald-400/60 to-transparent dark:from-emerald-400 dark:via-emerald-500/40 dark:to-transparent" />
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-emerald-500/[0.04] dark:bg-emerald-400/[0.03] blur-xl" />
            <svg className="absolute -bottom-1 right-2 w-32 h-14 opacity-[0.14] dark:opacity-[0.20] text-emerald-600 dark:text-emerald-400" viewBox="0 0 128 56" fill="none" stroke="currentColor">
              <path d="M4 46 L40 34 L76 38 L116 14" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="116" cy="14" r="3" fill="currentColor" />
              <path d="M24 50 H116 M44 48 V50 M64 48 V50 M84 48 V50 M104 48 V50" strokeWidth="1" opacity="0.6" />
            </svg>
          </div>
          <div className="relative z-10">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Payments Verified
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 tracking-tight">
              {metrics.paymentCount}
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 font-medium">
              ₱ {metrics.totalPaymentVolume.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total
            </p>
          </div>
          <div className="relative z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-center shrink-0 shadow-2xs">
            <CreditCard className="w-4.5 h-4.5 stroke-[2.2]" />
          </div>
        </div>

        {/* Card 3: Maintenance Updates */}
        <div className="relative overflow-hidden bg-card border border-slate-200/90 dark:border-zinc-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 shadow-2xs flex items-center justify-between group hover:border-orange-300 dark:hover:border-orange-800/80 transition-colors">
          {/* Service Work-Order Registration Gauge */}
          <div className="pointer-events-none select-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r from-orange-500 via-orange-400/60 to-transparent dark:from-orange-400 dark:via-orange-500/40 dark:to-transparent" />
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-orange-500/[0.04] dark:bg-orange-400/[0.03] blur-xl" />
            <svg className="absolute -bottom-1 right-2 w-32 h-14 opacity-[0.14] dark:opacity-[0.20] text-orange-600 dark:text-orange-400" viewBox="0 0 128 56" fill="none" stroke="currentColor">
              <rect x="36" y="14" width="80" height="34" rx="4" strokeWidth="1.2" strokeDasharray="4 3" />
              <path d="M52 30 H100 M52 38 H86" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="100" cy="30" r="2.5" fill="currentColor" />
            </svg>
          </div>
          <div className="relative z-10">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Maintenance Events
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-orange-600 dark:text-orange-400 mt-0.5 tracking-tight">
              {metrics.maintenanceLogs}
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 font-medium">
              Work orders & repair tickets
            </p>
          </div>
          <div className="relative z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900/40 flex items-center justify-center shrink-0 shadow-2xs">
            <Wrench className="w-4.5 h-4.5 stroke-[2.2]" />
          </div>
        </div>

        {/* Card 4: Tenancy Events */}
        <div className="relative overflow-hidden bg-card border border-slate-200/90 dark:border-zinc-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 shadow-2xs flex items-center justify-between group hover:border-purple-300 dark:hover:border-purple-800/80 transition-colors">
          {/* Resident Cohort Nodes & Network Cadence */}
          <div className="pointer-events-none select-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r from-purple-500 via-purple-400/60 to-transparent dark:from-purple-400 dark:via-purple-500/40 dark:to-transparent" />
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-purple-500/[0.04] dark:bg-purple-400/[0.03] blur-xl" />
            <svg className="absolute -bottom-1 right-2 w-32 h-14 opacity-[0.14] dark:opacity-[0.20] text-purple-600 dark:text-purple-400" viewBox="0 0 128 56" fill="none" stroke="currentColor">
              <circle cx="48" cy="36" r="9" strokeWidth="1.2" />
              <circle cx="82" cy="24" r="12" strokeWidth="1.2" />
              <circle cx="112" cy="36" r="7" strokeWidth="1.2" />
              <path d="M57 34 L70 26 M94 26 L105 34" strokeWidth="1" strokeDasharray="2.5 2.5" />
            </svg>
          </div>
          <div className="relative z-10">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Resident Activity
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-purple-600 dark:text-purple-400 mt-0.5 tracking-tight">
              {metrics.tenantLogs}
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 font-medium">
              Applications, joins & moveouts
            </p>
          </div>
          <div className="relative z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40 flex items-center justify-center shrink-0 shadow-2xs">
            <Users className="w-4.5 h-4.5 stroke-[2.2]" />
          </div>
        </div>
      </div>

      {/* 3. Toolbar: Search, Category Tabs, Timeframe */}
      <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 sm:p-3 shadow-2xs space-y-2 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by tenant, room, reference, or description..."
              className="w-full pl-8.5 pr-4 py-1.5 text-xs sm:text-[13px] rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0055a5] transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center gap-2 self-start lg:self-auto shrink-0">
            <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Timeframe:</span>
            </span>
            <div className="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
              {[
                { key: "all", label: "All Time" },
                { key: "today", label: "Today" },
                { key: "week", label: "7 Days" },
                { key: "month", label: "This Month" },
              ].map((tf) => (
                <button
                  key={tf.key}
                  onClick={() => setTimeFilter(tf.key as any)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    timeFilter === tf.key
                      ? "bg-white dark:bg-zinc-900 text-[#0055a5] dark:text-blue-400 shadow-2xs"
                      : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-0.5 pt-0.5">
          {[
            { key: "all", label: "All Logs", count: logs.length },
            {
              key: "payment",
              label: "Payments",
              count: logs.filter((l) => l.type === "payment").length,
            },
            {
              key: "tenant",
              label: "Residents & Leases",
              count: logs.filter((l) => ["tenant", "applicant", "moveout"].includes(l.type)).length,
            },
            {
              key: "maintenance",
              label: "Maintenance",
              count: logs.filter((l) => l.type === "maintenance").length,
            },
            {
              key: "announcement",
              label: "Announcements",
              count: logs.filter((l) => l.type === "announcement").length,
            },
            {
              key: "message",
              label: "Messages",
              count: logs.filter((l) => l.type === "message").length,
            },
          ].map((tab) => {
            const isActive = selectedCategory === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setSelectedCategory(tab.key as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 border ${
                  isActive
                    ? "bg-[#0055a5] text-white border-[#0055a5] shadow-xs"
                    : "bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-mono font-bold ${
                    isActive
                      ? "text-white/90"
                      : "text-slate-500 dark:text-zinc-400"
                  }`}
                >
                  ({tab.count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Activity Logs Ledger */}
      <div className="flex-1 min-h-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl sm:rounded-2xl shadow-2xs overflow-hidden flex flex-col">
        {/* Ledger Header */}
        <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50/70 dark:bg-zinc-900/60 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
              Audit Stream ({filteredLogs.length} Records)
            </span>
          </div>

          <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
            Page {currentPage} of {totalPages}
          </span>
        </div>

        {/* Ledger Content - Only this container has a scrollbar */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {isLoading ? (
            <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center py-12">
              <RefreshCw className="w-8 h-8 text-[#0055a5] animate-spin mb-3" />
              <p className="text-sm font-bold text-slate-800 dark:text-zinc-200">
                Loading activity logs...
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Synthesizing real-time audit ledger from database
              </p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center px-4 py-12">
              <Clock className="w-12 h-12 text-slate-300 dark:text-zinc-700 mb-3 stroke-[1.5]" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200">
                No activity logs found
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mt-1">
                {searchQuery
                  ? `No events match "${searchQuery}". Try adjusting your keywords or clearing filters.`
                  : "No activity recorded for the selected timeframe and category."}
              </p>
              {(searchQuery || selectedCategory !== "all" || timeFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                    setTimeFilter("all");
                  }}
                  className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-[#0055a5] text-white hover:bg-[#00478f] transition-colors cursor-pointer"
                >
                  Reset All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-zinc-800/80">
              {paginatedLogs.map((log) => {
                const icon = getLogIcon(log.type);
                const badgeBg = getLogBadgeBg(log.type);

                return (
                  <div
                    key={log.id}
                    className="p-3 sm:p-3.5 hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 sm:gap-3 group"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Icon Pill */}
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-slate-200/80 dark:border-zinc-700/60 group-hover:scale-105 transition-transform">
                        {icon}
                      </div>

                      {/* Event Info */}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xs sm:text-[13px] font-extrabold text-slate-900 dark:text-white leading-tight">
                            {log.title}
                          </h4>

                          <span
                            className={`text-[10px] font-bold ${badgeBg}`}
                          >
                            {log.type.toUpperCase()}
                          </span>

                          {log.status && (
                            <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-zinc-400">
                              {log.status}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-700 dark:text-zinc-300 font-medium leading-relaxed">
                          {log.description}
                        </p>

                        {/* Detail Chips */}
                        <div className="flex flex-wrap items-center gap-2.5 pt-0.5 text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                          {log.tenant_name && (
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-zinc-300">
                              <Users className="w-3 h-3 text-slate-400" />
                              <span>{log.tenant_name}</span>
                            </span>
                          )}

                          {log.room_number && (
                            <span className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400">
                              <Building2 className="w-3 h-3 text-blue-500" />
                              <span>{log.room_number}</span>
                            </span>
                          )}

                          {log.reference_number && (
                            <span className="font-mono font-semibold text-slate-700 dark:text-zinc-300">
                              {log.reference_number}
                            </span>
                          )}

                          {log.amount !== undefined && (
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              ₱ {log.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}

                          {log.details && (
                            <span className="text-slate-400 dark:text-zinc-500">
                              {log.details}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Timestamp & Action Link */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1 shrink-0 pt-0.5 sm:pt-0 pl-12 sm:pl-0">
                      <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 whitespace-nowrap">
                        {formatRelativeTime(log.date)}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono whitespace-nowrap">
                        {new Date(log.date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>

                      {log.link && (
                        <Link
                          href={log.link}
                          className="text-xs font-bold text-[#0055a5] dark:text-blue-400 hover:underline inline-flex items-center gap-1 mt-0.5 group-hover:translate-x-0.5 transition-transform"
                        >
                          <span>Inspect</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Ledger Pagination Footer */}
        {filteredLogs.length > 0 && totalPages > 1 && (
          <div className="px-3.5 py-2 sm:px-4 sm:py-2.5 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50/70 dark:bg-zinc-900/60 shrink-0">
            <span className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, filteredLogs.length)} of{" "}
              {filteredLogs.length} events
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (page) =>
                    page === 1 ||
                    page === totalPages ||
                    Math.abs(page - currentPage) <= 1
                )
                .map((page, idx, arr) => (
                  <span key={page} className="flex items-center">
                    {idx > 0 && arr[idx - 1] !== page - 1 && (
                      <span className="px-1 text-xs text-slate-400">...</span>
                    )}
                    <button
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-7 h-7 px-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        currentPage === page
                          ? "bg-[#0055a5] text-white"
                          : "border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
                      }`}
                    >
                      {page}
                    </button>
                  </span>
                ))}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
