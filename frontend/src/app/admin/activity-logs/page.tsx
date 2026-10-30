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

  useEffect(() => {
    router.replace("/admin/settings#activity-logs");
  }, [router]);

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | "payment" | "tenant" | "maintenance" | "announcement" | "message"
  >("all");
  const [timeFilter, setTimeFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const fetchLogs = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const { data } = await api.get("/admin/activity-logs");
      setLogs(Array.isArray(data) ? data : []);
      if (isManualRefresh) {
        toast.success("Activity Logs Synchronized", {
          description: "Latest administrative event entries loaded.",
        });
      }
    } catch (error) {
      console.error("Failed to fetch activity logs:", error);
      toast.error("Sync Failed", {
        description: "Failed to load recent activity logs.",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
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
    <div className="space-y-6 pb-12">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-[#0055a5] dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Activity Logs
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 font-medium">
                Comprehensive audit trail of resident transactions, maintenance tickets, and property operations.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchLogs(true)}
            disabled={isRefreshing}
            className="h-9 px-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-xs font-bold shadow-2xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#0055a5]" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="h-9 px-4 rounded-xl bg-[#0055a5] hover:bg-[#00478f] text-white text-xs sm:text-[13px] font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 stroke-[2.2]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Events */}
        <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Total Audit Logs
            </span>
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
              {metrics.totalEvents}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
              Across all operational channels
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#0055a5] dark:text-blue-400 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>

        {/* Card 2: Payment Transactions */}
        <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Payments Verified
            </span>
            <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              {metrics.paymentCount}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
              ₱ {metrics.totalPaymentVolume.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>

        {/* Card 3: Maintenance Updates */}
        <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Maintenance Events
            </span>
            <div className="text-2xl font-black font-mono text-orange-600 dark:text-orange-400 mt-1">
              {metrics.maintenanceLogs}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
              Work orders & repair tickets
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
            <Wrench className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>

        {/* Card 4: Tenancy Events */}
        <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Resident Activity
            </span>
            <div className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400 mt-1">
              {metrics.tenantLogs}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
              Applications, joins & moveouts
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>
      </div>

      {/* 3. Toolbar: Search, Category Tabs, Timeframe */}
      <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-2xs space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by tenant, room, reference, or description..."
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0055a5] transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Timeframe:</span>
            </span>
            <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
              {[
                { key: "all", label: "All Time" },
                { key: "today", label: "Today" },
                { key: "week", label: "7 Days" },
                { key: "month", label: "This Month" },
              ].map((tf) => (
                <button
                  key={tf.key}
                  onClick={() => setTimeFilter(tf.key as any)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 pt-1">
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer shrink-0 border ${
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
      <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xs overflow-hidden">
        {/* Ledger Header */}
        <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50/70 dark:bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
              Audit Stream ({filteredLogs.length} Records)
            </span>
          </div>

          <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
            Page {currentPage} of {totalPages}
          </span>
        </div>

        {/* Ledger Content */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <RefreshCw className="w-8 h-8 text-[#0055a5] animate-spin mb-3" />
            <p className="text-sm font-bold text-slate-800 dark:text-zinc-200">
              Loading activity logs...
            </p>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Synthesizing real-time audit ledger from database
            </p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center px-4">
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
                className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-[#0055a5] text-white hover:bg-[#00478f] transition-colors"
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
                  className="p-4 sm:p-4.5 hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* Icon Pill */}
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-slate-200/80 dark:border-zinc-700/60 group-hover:scale-105 transition-transform">
                      {icon}
                    </div>

                    {/* Event Info */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">
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

                      <p className="text-xs sm:text-[13px] text-slate-700 dark:text-zinc-300 font-medium leading-relaxed">
                        {log.description}
                      </p>

                      {/* Detail Chips */}
                      <div className="flex flex-wrap items-center gap-3 pt-0.5 text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
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
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1 shrink-0 pt-1 sm:pt-0 pl-13 sm:pl-0">
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
                        className="text-xs font-bold text-[#0055a5] dark:text-blue-400 hover:underline inline-flex items-center gap-1 mt-1 group-hover:translate-x-0.5 transition-transform"
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

        {/* Ledger Pagination Footer */}
        {filteredLogs.length > 0 && totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50/70 dark:bg-zinc-900/60">
            <span className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, filteredLogs.length)} of{" "}
              {filteredLogs.length} events
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors cursor-pointer"
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
                      className={`min-w-8 h-8 px-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
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
                className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors cursor-pointer"
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
