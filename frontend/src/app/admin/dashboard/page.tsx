"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import Link from "next/link";
import api from "@/lib/api";
import CustomSelect from "@/components/CustomSelect";
import { toast } from "sonner";
import {
  ComposedChart,
  Bar,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Building2,
  Users,
  Wallet,
  Receipt,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  ExternalLink,
  Calendar,
  Check,
  X,
  ShieldAlert,
  FileText,
  ArrowRight,
  Activity,
  DollarSign,
  BedDouble,
  Filter,
  Sparkles,
  CreditCard,
  UserCheck,
  AlertCircle,
  Megaphone,
  Trash2,
  Send,
  RefreshCw,
} from "lucide-react";

interface Announcement {
  id: number;
  title: string;
  content: string;
  type: string;
  created_at: string;
  created_by_name?: string;
}

interface ExpiringContract {
  id: number;
  name: string;
  room_number: string | null;
  contract_end_date: string;
  days_left: number;
}

interface DashboardStats {
  rooms: {
    totalRooms: number;
    occupiedRooms: number;
    availableRooms: number;
    partiallyOccupiedRooms: number;
    maintenanceRooms: number;
    unavailableRooms: number;
  };
  tenants: {
    totalTenants: number;
    activeTenants: number;
    pendingTenants: number;
    inactiveTenants: number;
  };
  billing: {
    monthlyIncome: number;
    pendingDues: number;
    overduePayments: number;
    unpaidBillsCount: number;
    revenueIncrease: number;
    totalBilled: number;
    collectionRate: number;
    historicalIncome?: { year: number; month: number; total: number }[];
  };
  maintenance: {
    totalRequests: number;
    pendingRequests: number;
    inProgressRequests: number;
    resolvedRequests: number;
  };
  recentActivities: {
    id: string;
    type: string;
    title: string;
    description: string;
    date: string;
  }[];
  recentMessages: {
    id: number;
    tenant_name: string;
    message: string;
    status: string;
    created_at: string;
  }[];
  pendingTenantsList: {
    id: number;
    name: string;
    email: string;
    created_at: string;
  }[];
  recentPayments: {
    id: number;
    tenant_name: string;
    amount_paid: string;
    payment_date: string;
  }[];
  recentRequests: {
    id: number;
    request_number?: string | null;
    tenant_name: string;
    title: string;
    created_at: string;
  }[];
  expiringContracts: ExpiringContract[];
  overdueAccounts: {
    tenant_id: number;
    tenant_name: string;
    room_number: string | null;
    total_overdue: number;
  }[];
  upcomingRent: {
    id: number;
    tenant_name: string;
    room_number: string | null;
    balance: number;
    due_date: string;
  }[];
  pendingPaymentVerifications: {
    id: number;
    bill_id?: number;
    payment_id?: number;
    tenant_id?: number;
    tenant_name: string;
    total_amount: number;
    created_at: string;
  }[];
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

const formatRequestNumber = (id: any, reqNum?: string | null) => {
  if (reqNum) return reqNum;
  if (typeof id === "string" && id.startsWith("RT")) return id;
  if (!id) return "";
  return "RT-" + String(id).padStart(6, "0");
};

const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 dark:bg-zinc-900/95 backdrop-blur-md border border-slate-700/80 dark:border-zinc-700/80 shadow-2xl rounded-xl p-3.5 text-xs font-semibold text-white min-w-44">
        <p className="mb-2 text-slate-300 dark:text-zinc-400 font-bold uppercase tracking-wider text-[11px] border-b border-slate-700/60 pb-1.5">
          {label}
        </p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => {
            let dotColor = entry.color;
            if (entry.name === "Collected") dotColor = "#10b981";
            if (entry.name === "Outstanding") dotColor = "#f43f5e";
            if (entry.name === "Billed") dotColor = "#0284c7";

            return (
              <div
                key={`item-${index}`}
                className="flex justify-between items-center gap-4"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: dotColor }}
                  ></span>
                  <span className="text-slate-300 dark:text-zinc-300 font-medium">
                    {entry.name}
                  </span>
                </div>
                <span className="font-mono font-bold text-white">
                  ₱{Number(entry.value).toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [cashflowData, setCashflowData] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState("this_year");
  const [isLoading, setIsLoading] = useState(true);
  const [adminName, setAdminName] = useState("Admin");

  // Interactive Tab States
  const [urgentFilter, setUrgentFilter] = useState<
    "all" | "verifications" | "applications" | "overdue"
  >("all");
  const [activeLedgerTab, setActiveLedgerTab] = useState<
    "payments" | "overdue" | "maintenance" | "audit"
  >("payments");

  // Announcement Modal State
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(false);
  const [isPostingAnnouncement, setIsPostingAnnouncement] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    content: "",
    type: "General",
  });

  const fetchAnnouncements = async () => {
    setIsLoadingAnnouncements(true);
    try {
      const { data } = await api.get("/admin/announcements");
      setAnnouncements(data || []);
    } catch (err) {
      console.error("Failed to fetch announcements:", err);
    } finally {
      setIsLoadingAnnouncements(false);
    }
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementForm.title.trim() || !announcementForm.content.trim()) {
      toast.error("Please provide both a title and announcement content.");
      return;
    }

    if (announcementForm.type === "") {
      toast.error("Please select an announcement type.");
      return;
    }

    setIsPostingAnnouncement(true);
    try {
      const { data } = await api.post("/admin/announcements", {
        title: announcementForm.title.trim(),
        content: announcementForm.content.trim(),
        type: announcementForm.type,
      });
      toast.success("Announcement broadcasted successfully");
      const newAnn = data.announcement || data;
      setAnnouncements((prev) => [newAnn, ...prev]);
      setAnnouncementForm({ title: "", content: "", type: "General" });
    } catch (err) {
      console.error("Failed to post announcement:", err);
      toast.error("Failed to post announcement");
    } finally {
      setIsPostingAnnouncement(false);
    }
  };

  const handleDeleteAnnouncement = async (id: number) => {
    try {
      await api.delete(`/admin/announcements/${id}`);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      toast.success("Announcement deleted");
    } catch (err) {
      console.error("Failed to delete announcement:", err);
      toast.error("Failed to delete announcement");
    }
  };

  const fetchDashboardData = async () => {
    // Early exit if user is not admin
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      const token = localStorage.getItem("token");
      if (!token) {
        router.replace("/login");
        return;
      }
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.role !== "admin") {
            router.replace("/tenant/dashboard");
            return;
          }
        } catch (e) {}
      }
    }

    setIsLoading(true);

    try {
      const { data } = await api.get("/admin/dashboard");
      setStats(data);
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error("Access denied: Administrator privileges required.");
        router.replace("/tenant/dashboard");
        return;
      }
      if (error.response?.status === 401) {
        toast.error("Session expired. Please log in again.");
        router.replace("/login");
        return;
      }
      console.error("Failed to fetch admin stats:", error);
      toast.error("Could not load dashboard statistics");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCashFlow = async () => {
    try {
      const { data } = await api.get(`/admin/cashflow?range=${dateRange}`);
      setCashflowData(data || []);
    } catch (error: any) {
      if (error.response?.status !== 403 && error.response?.status !== 401) {
        console.error("Failed to fetch cash flow data:", error);
      }
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.name) setAdminName(user.name.split(" ")[0]);
      } catch (e) {}
    }
    fetchDashboardData();
  }, []);

  useEffect(() => {
    fetchCashFlow();
  }, [dateRange]);

  // Computed Financial & Operations Metrics
  const computedMetrics = useMemo(() => {
    if (!stats) return null;

    const totalRooms = stats.rooms.totalRooms || 0;
    const occupiedRooms = stats.rooms.occupiedRooms || 0;
    const availableRooms = stats.rooms.availableRooms || 0;
    const maintenanceRooms = stats.rooms.maintenanceRooms || 0;
    const partiallyOccupiedRooms = stats.rooms.partiallyOccupiedRooms || 0;
    const occupancyRate =
      totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    const monthlyIncome = Number(stats.billing.monthlyIncome) || 0;
    const pendingDues = Number(stats.billing.pendingDues) || 0;
    const overduePayments = Number(stats.billing.overduePayments) || 0;
    const totalBilled = Number(stats.billing.totalBilled) || 0;
    const collectionRate =
      totalBilled > 0
        ? Math.min(100, Math.round((monthlyIncome / totalBilled) * 100))
        : stats.billing.collectionRate || 0;

    const openWorkOrders =
      (stats.maintenance.pendingRequests || 0) +
      (stats.maintenance.inProgressRequests || 0);

    // Action queue counts (boarding house operates on flexible stays without contracts)
    const verificationsCount = stats.pendingPaymentVerifications?.length || 0;
    const applicationsCount = stats.pendingTenantsList?.length || 0;
    const overdueCount = stats.overdueAccounts?.length || 0;
    const totalActionCount =
      verificationsCount + applicationsCount + overdueCount;

    return {
      totalRooms,
      occupiedRooms,
      availableRooms,
      maintenanceRooms,
      partiallyOccupiedRooms,
      occupancyRate,
      monthlyIncome,
      pendingDues,
      overduePayments,
      totalBilled,
      collectionRate,
      revenueIncrease: Number(stats.billing.revenueIncrease) || 0,
      openWorkOrders,
      pendingRequests: stats.maintenance.pendingRequests || 0,
      inProgressRequests: stats.maintenance.inProgressRequests || 0,
      resolvedRequests: stats.maintenance.resolvedRequests || 0,
      verificationsCount,
      applicationsCount,
      overdueCount,
      totalActionCount,
    };
  }, [stats]);

  // Cashflow totals for selected period
  const cashflowTotals = useMemo(() => {
    let billed = 0;
    let collected = 0;
    let outstanding = 0;
    cashflowData.forEach((item) => {
      billed += Number(item.billed) || 0;
      collected += Number(item.collected) || 0;
      outstanding += Number(item.outstanding) || 0;
    });
    return { billed, collected, outstanding };
  }, [cashflowData]);

  if (isLoading || !stats || !stats.billing || !computedMetrics) {
    return (
      <div className="w-full space-y-6 pb-1 font-sans text-slate-900 dark:text-zinc-100 animate-pulse">
        {/* 1. Header Skeleton */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-2 border-b border-slate-200/80 dark:border-zinc-800/80 pb-5">
          <div>
            <div className="h-8 w-56 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
            <div className="h-3.5 w-80 bg-slate-200 dark:bg-zinc-800 rounded-md mt-2"></div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-9 w-40 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
          </div>
        </div>

        {/* 2. 4 KPI Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-28 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-zinc-800"></div>
              </div>
              <div className="h-7 w-36 bg-slate-200 dark:bg-zinc-800 rounded-md"></div>
              <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between">
                <div className="h-4 w-20 bg-slate-200 dark:bg-zinc-800 rounded-full"></div>
                <div className="h-3 w-16 bg-slate-200 dark:bg-zinc-800 rounded"></div>
              </div>
            </div>
          ))}
        </div>

        {/* 3. Main Split Skeleton: Chart & Urgent Actions */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Financial Chart Skeleton */}
          <div className="xl:col-span-8 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs flex flex-col justify-between h-[540px]">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                <div className="space-y-1">
                  <div className="h-5 w-56 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                  <div className="h-3 w-40 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                </div>
                <div className="h-8 w-32 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
              </div>
              <div className="grid grid-cols-3 gap-3 py-3 border-b border-slate-100 dark:border-zinc-800">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-1">
                    <div className="h-2.5 w-16 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                    <div className="h-4 w-24 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 my-4 flex items-end gap-3 px-2">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="flex-1 bg-slate-100 dark:bg-zinc-800/60 rounded-t-lg"
                  style={{ height: `${30 + ((i * 12) % 65)}%` }}
                ></div>
              ))}
            </div>
            <div className="flex justify-center gap-6 pt-2 border-t border-slate-100 dark:border-zinc-800">
              <div className="h-3 w-20 bg-slate-200 dark:bg-zinc-800 rounded"></div>
              <div className="h-3 w-20 bg-slate-200 dark:bg-zinc-800 rounded"></div>
              <div className="h-3 w-20 bg-slate-200 dark:bg-zinc-800 rounded"></div>
            </div>
          </div>

          {/* Urgent Action Center Skeleton */}
          <div className="xl:col-span-4 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs flex flex-col justify-between h-[540px]">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                <div className="h-5 w-44 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                <div className="h-5 w-16 bg-slate-200 dark:bg-zinc-800 rounded-full"></div>
              </div>
              <div className="flex gap-1">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-6 flex-1 bg-slate-200 dark:bg-zinc-800 rounded-md"
                  ></div>
                ))}
              </div>
              <div className="space-y-2.5 pt-1">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg border border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/30 flex items-center justify-between"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3.5 w-3/4 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                      <div className="h-2.5 w-1/2 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                    </div>
                    <div className="h-7 w-16 bg-slate-200 dark:bg-zinc-800 rounded-md shrink-0"></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="h-4 w-28 bg-slate-200 dark:bg-zinc-800 rounded mx-auto mt-2"></div>
          </div>
        </div>

        {/* 4. Bottom Operational Ledger Skeleton */}
        <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
          <div className="p-3 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex gap-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-7 w-28 bg-slate-200 dark:bg-zinc-800 rounded-lg"
                ></div>
              ))}
            </div>
            <div className="h-4 w-24 bg-slate-200 dark:bg-zinc-800 rounded"></div>
          </div>
          <div className="p-3 space-y-2">
            <div className="h-8 bg-slate-100 dark:bg-zinc-800 rounded-md"></div>
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-11 bg-slate-50/60 dark:bg-zinc-900/40 rounded-md border border-slate-100 dark:border-zinc-800/60"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-1 font-sans text-slate-900 dark:text-zinc-100">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-2 border-b border-slate-200/80 dark:border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Hello, {adminName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">
            Here's what's happening with your properties, check the details
            below
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setShowAnnouncementModal(true);
              fetchAnnouncements();
            }}
            className="px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-teal-700 hover:bg-teal-800 text-white transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Megaphone className="w-4 h-4" />
            <span>Add Announcement</span>
          </button>
        </div>
      </div>

      {/* Executive Metric Ribbon (4 High-Impact KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Monthly Collections & Revenue */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="show"
          className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden"
        >
          <div className="flex justify-between items-start mb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Monthly Revenue
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-slate-900 dark:text-white mt-1">
                ₱{computedMetrics.monthlyIncome.toLocaleString()}
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/50 dark:border-emerald-500/20">
              <Wallet className="w-4 h-4" />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-zinc-400">
                Collection Rate
              </span>
              <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
                {computedMetrics.collectionRate}%
              </span>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(0, computedMetrics.collectionRate))}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 pt-0.5">
              <span
                className={`inline-flex items-center gap-0.5 font-semibold ${computedMetrics.revenueIncrease >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
              >
                {computedMetrics.revenueIncrease >= 0 ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {Math.abs(computedMetrics.revenueIncrease).toFixed(1)}% vs prev.
                month
              </span>
              <Link
                href="/admin/billing"
                className="text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-0.5 font-medium"
              >
                Ledger <ChevronRight className="w-2.5 h-2.5" />
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Receivables & Pending Dues */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="show"
          className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden"
        >
          <div className="flex justify-between items-start mb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Total Receivables
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-slate-900 dark:text-white mt-1">
                ₱{computedMetrics.pendingDues.toLocaleString()}
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200/50 dark:border-amber-500/20">
              <Receipt className="w-4 h-4" />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-zinc-400">
                Overdue Balances
              </span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                ₱{computedMetrics.overduePayments.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-zinc-400">
                Unpaid Invoices
              </span>
              <span className="font-semibold text-slate-700 dark:text-zinc-300">
                {stats.billing.unpaidBillsCount || 0} bills
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 pt-1">
              <span className="text-rose-600 dark:text-rose-400 font-semibold">
                {computedMetrics.overdueCount} accounts delinquent
              </span>
              <Link
                href="/admin/billing"
                className="text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-0.5 font-medium"
              >
                Collect <ChevronRight className="w-2.5 h-2.5" />
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Portfolio Occupancy & Capacity */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="show"
          className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden"
        >
          <div className="flex justify-between items-start mb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Occupancy Rate
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-slate-900 dark:text-white mt-1 flex items-baseline gap-2">
                {computedMetrics.occupancyRate}%
                <span className="text-xs font-sans font-medium text-slate-500 dark:text-zinc-400">
                  ({computedMetrics.occupiedRooms}/{computedMetrics.totalRooms}{" "}
                  Units)
                </span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-200/50 dark:border-cyan-500/20">
              <Building2 className="w-4 h-4" />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 space-y-2">
            {/* Segmented Capacity Bar */}
            <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-2 flex overflow-hidden">
              <div
                style={{
                  width: `${(computedMetrics.occupiedRooms / (computedMetrics.totalRooms || 1)) * 100}%`,
                }}
                className="bg-emerald-500"
                title="Occupied"
              />
              <div
                style={{
                  width: `${(computedMetrics.availableRooms / (computedMetrics.totalRooms || 1)) * 100}%`,
                }}
                className="bg-cyan-500"
                title="Available"
              />
              <div
                style={{
                  width: `${(computedMetrics.maintenanceRooms / (computedMetrics.totalRooms || 1)) * 100}%`,
                }}
                className="bg-rose-500"
                title="Maintenance"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                {computedMetrics.occupiedRooms} Occ.
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                {computedMetrics.availableRooms} Vacant
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                {computedMetrics.maintenanceRooms} Maint.
              </span>
              <Link
                href="/admin/rooms"
                className="text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-0.5 font-medium ml-1"
              >
                Rooms <ChevronRight className="w-2.5 h-2.5" />
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Maintenance Work Orders */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="show"
          className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden"
        >
          <div className="flex justify-between items-start mb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Open Work Orders
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-slate-900 dark:text-white mt-1">
                {computedMetrics.openWorkOrders} Requests
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-200/50 dark:border-teal-500/20">
              <Wrench className="w-4 h-4" />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-zinc-400">
                Needs Review
              </span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                {computedMetrics.pendingRequests} pending
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-zinc-400">
                In Progress
              </span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {computedMetrics.inProgressRequests} in progress
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 pt-1">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                {computedMetrics.resolvedRequests} requests resolved
              </span>
              <Link
                href="/admin/requests"
                className="text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-0.5 font-medium"
              >
                View Requests <ChevronRight className="w-2.5 h-2.5" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Core Analytics & Urgent Action Center (2-Column Grid) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left: Cash Flow Velocity Analytics (8 Cols) */}
        <div className="xl:col-span-8 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col justify-between h-auto xl:h-[540px]">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Cash Flow Overview
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Invoiced billing vs verified collections vs outstanding
                  balances
                </p>
              </div>

              {/* Dropdown strictly with This Year and Last Year */}
              <div className="flex items-center gap-3">
                <CustomSelect
                  value={dateRange}
                  onChange={(val) => setDateRange(val)}
                  options={[
                    { value: "this_year", label: "This Year" },
                    { value: "last_year", label: "Last Year" },
                  ]}
                  className="w-36 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-200 rounded-lg pl-3 pr-8 py-2 outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
            </div>

            {/* Chart Area */}
            <div className="h-[310px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={cashflowData}
                  margin={{ top: 15, right: 10, left: -10, bottom: 0 }}
                  barGap={6}
                  barSize={14}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="currentColor"
                    className="text-slate-200 dark:text-zinc-800/80"
                  />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 500 }}
                    tickFormatter={(value) =>
                      value === 0
                        ? "0"
                        : `₱${value >= 1000 ? value / 1000 + "k" : value}`
                    }
                    width={55}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{
                      paddingBottom: "16px",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                    iconType="circle"
                  />
                  <Bar
                    dataKey="collected"
                    name="Collected"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="outstanding"
                    name="Outstanding"
                    fill="#f43f5e"
                    radius={[4, 4, 0, 0]}
                  />
                  <Area
                    type="monotone"
                    dataKey="billed"
                    name="Billed"
                    stroke="#0284c7"
                    strokeWidth={2.5}
                    fill="#0284c7"
                    fillOpacity={0.08}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Financial Snapshot Summary Bar Below Chart */}
          <div className="grid grid-cols-3 gap-3 pt-3 mt-3 border-t border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/40 p-3 rounded-lg text-center">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Period Invoiced
              </span>
              <p className="font-mono font-bold text-xs sm:text-sm text-cyan-600 dark:text-cyan-400 mt-0.5">
                ₱{cashflowTotals.billed.toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Total Collected
              </span>
              <p className="font-mono font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">
                ₱{cashflowTotals.collected.toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Uncollected Balance
              </span>
              <p className="font-mono font-bold text-xs sm:text-sm text-rose-600 dark:text-rose-400 mt-0.5">
                ₱{cashflowTotals.outstanding.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Urgent Action Center & Operations Tasks (4 Cols, Fixed Height) */}
        <div className="xl:col-span-4 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col h-[540px]">
          {/* Header (fixed) */}
          <div className="shrink-0 mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Action Center
              </h2>
              {computedMetrics.totalActionCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500 text-white shadow-sm">
                  {computedMetrics.totalActionCount} Urgent
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Items requiring administrator review or intervention
            </p>
          </div>

          {/* Filter Pills (fixed) */}
          <div className="shrink-0 flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-zinc-800/80 rounded-lg mb-4 text-xs font-semibold overflow-x-auto no-scrollbar">
            <button
              onClick={() => setUrgentFilter("all")}
              className={`px-2.5 py-1 rounded-md transition-all shrink-0 ${urgentFilter === "all" ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs" : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"}`}
            >
              All ({computedMetrics.totalActionCount})
            </button>
            <button
              onClick={() => setUrgentFilter("verifications")}
              className={`px-2.5 py-1 rounded-md transition-all shrink-0 ${urgentFilter === "verifications" ? "bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 shadow-xs" : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"}`}
            >
              Slips ({computedMetrics.verificationsCount})
            </button>
            <button
              onClick={() => setUrgentFilter("applications")}
              className={`px-2.5 py-1 rounded-md transition-all shrink-0 ${urgentFilter === "applications" ? "bg-white dark:bg-zinc-900 text-cyan-600 dark:text-cyan-400 shadow-xs" : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"}`}
            >
              Applicants ({computedMetrics.applicationsCount})
            </button>
            <button
              onClick={() => setUrgentFilter("overdue")}
              className={`px-2.5 py-1 rounded-md transition-all shrink-0 ${urgentFilter === "overdue" ? "bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-400 shadow-xs" : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"}`}
            >
              Overdue ({computedMetrics.overdueCount})
            </button>
          </div>

          {/* Action Items List (scrollable, occupies remaining space) */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
            {/* Payment Verifications */}
            {(urgentFilter === "all" || urgentFilter === "verifications") &&
              stats.pendingPaymentVerifications?.map((verification) => (
                <Link
                  key={`ver-${verification.id}`}
                  href={`/admin/billing?tenant=${encodeURIComponent(verification.tenant_name)}&billId=${verification.bill_id || verification.id}&verify=true&highlight=true`}
                  className="p-3 rounded-lg border border-amber-200/80 dark:border-amber-500/20 bg-amber-50/40 dark:bg-amber-500/5 hover:bg-amber-100/60 dark:hover:bg-amber-500/10 transition-colors flex items-center justify-between gap-2.5 group cursor-pointer"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        {verification.tenant_name}
                      </p>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold mt-0.5 truncate">
                        Submitted payment receipt • ₱
                        {Number(verification.total_amount).toLocaleString()}
                      </p>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 block truncate">
                        {new Date(verification.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-[11px] font-bold rounded bg-amber-600 group-hover:bg-amber-700 text-white shrink-0 transition-colors shadow-xs">
                    Verify Slip
                  </span>
                </Link>
              ))}

            {/* Pending Tenant Applications */}
            {(urgentFilter === "all" || urgentFilter === "applications") &&
              stats.pendingTenantsList?.map((tenant) => (
                <Link
                  key={`ten-${tenant.id}`}
                  href={`/admin/tenants?tab=approvals&search=${encodeURIComponent(tenant.name)}&tenantId=${tenant.id}`}
                  className="p-3 rounded-lg border border-cyan-200/80 dark:border-cyan-500/20 bg-cyan-50/40 dark:bg-cyan-500/5 hover:bg-cyan-100/60 dark:hover:bg-cyan-500/10 transition-colors flex items-center justify-between gap-2.5 group cursor-pointer"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                        {tenant.name}
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-zinc-400 truncate mt-0.5">
                        {tenant.email}
                      </p>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 block truncate">
                        Applied on{" "}
                        {new Date(tenant.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-[11px] font-bold rounded bg-cyan-600 group-hover:bg-cyan-700 text-white shrink-0 transition-colors shadow-xs">
                    Review
                  </span>
                </Link>
              ))}

            {/* Overdue Unpaid Balances (Flexible Stays - Tenants can leave anytime) */}
            {(urgentFilter === "all" || urgentFilter === "overdue") &&
              stats.overdueAccounts?.map((account) => (
                <Link
                  key={`overdue-${account.tenant_id}`}
                  href={`/admin/billing?tenant=${encodeURIComponent(account.tenant_name)}&highlight=true`}
                  className="p-3 rounded-lg border border-rose-200/80 dark:border-rose-500/20 bg-rose-50/40 dark:bg-rose-500/5 hover:bg-rose-100/60 dark:hover:bg-rose-500/10 transition-colors flex items-center justify-between gap-2.5 group cursor-pointer"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                        {account.tenant_name} (Room{" "}
                        {account.room_number || "N/A"})
                      </p>
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-0.5 truncate">
                        Overdue: ₱
                        {Number(account.total_overdue).toLocaleString()}
                      </p>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 block truncate">
                        No fixed contract • Open-ended stay
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-[11px] font-bold rounded bg-rose-600 group-hover:bg-rose-700 text-white shrink-0 transition-colors shadow-xs">
                    Collect
                  </span>
                </Link>
              ))}

            {/* Empty State */}
            {computedMetrics.totalActionCount === 0 && (
              <div className="text-center py-10 px-4 border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl my-auto">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                  All Action Queues Clear
                </h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  No pending payment verifications, applicant reviews, or
                  overdue balances.
                </p>
              </div>
            )}
          </div>

          {/* Footer (fixed at bottom) */}
          <div className="shrink-0 pt-4 mt-auto border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
            <span>Automatic refresh active</span>
            <Link
              href="/admin/settings"
              className="text-cyan-600 dark:text-cyan-400 font-medium hover:underline flex items-center gap-1"
            >
              Workflow settings <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Operational Ledger Hub (Interactive Workspace Tabs) */}
      <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
        {/* Ledger Header & Tab Selector */}
        <div className="p-5 border-b border-slate-200/80 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Operational Activity Ledger
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Real-time records for collections, delinquent accounts,
              maintenance requests, and activity log
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-lg text-xs font-semibold overflow-x-auto">
            <button
              onClick={() => setActiveLedgerTab("payments")}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${activeLedgerTab === "payments" ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"}`}
            >
              <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
              <span>Recent Payments ({stats.recentPayments.length})</span>
            </button>
            <button
              onClick={() => setActiveLedgerTab("overdue")}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${activeLedgerTab === "overdue" ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"}`}
            >
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
              <span>Overdue Accounts ({stats.overdueAccounts.length})</span>
            </button>
            <button
              onClick={() => setActiveLedgerTab("maintenance")}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${activeLedgerTab === "maintenance" ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"}`}
            >
              <Wrench className="w-3.5 h-3.5 text-cyan-500" />
              <span>Work Orders ({stats.recentRequests.length})</span>
            </button>
            <button
              onClick={() => setActiveLedgerTab("audit")}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${activeLedgerTab === "audit" ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"}`}
            >
              <Activity className="w-3.5 h-3.5 text-slate-400" />
              <span>Activity Log ({stats.recentActivities.length})</span>
            </button>
          </div>
        </div>

        {/* Ledger Body Content */}
        <div className="p-0 relative">
          {/* Top-Right scrollbar header filler for table tabs */}
          {activeLedgerTab !== "audit" && (
            <div className="absolute top-0 right-0 w-6 h-[42px] bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 z-30 pointer-events-none rounded-tr-xl" />
          )}

          {/* Recent Payments Table */}
          {activeLedgerTab === "payments" && (
            <div className="overflow-x-auto overflow-y-auto max-h-[282px] custom-scrollbar">
              <table className="w-full min-w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-zinc-900 shadow-xs border-b border-slate-200 dark:border-zinc-800">
                  <tr className="h-[42px] bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 uppercase tracking-wider text-[11px] font-bold">
                    <th className="py-2.5 px-6 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">
                      Tenant Name
                    </th>
                    <th className="py-2.5 px-4 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">
                      Amount Paid
                    </th>
                    <th className="py-2.5 px-4 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">
                      Transaction Date
                    </th>
                    <th className="py-2.5 px-4 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">
                      Status
                    </th>
                    <th className="py-2.5 pl-4 pr-6 text-right bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                  {stats.recentPayments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="h-[48px] hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-6 font-bold text-slate-900 dark:text-white">
                        {payment.tenant_name}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ₱{Number(payment.amount_paid).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 dark:text-zinc-400">
                        {new Date(payment.payment_date).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric", year: "numeric" },
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" /> Recorded
                        </span>
                      </td>
                      <td className="py-2.5 px-6 text-right">
                        <Link
                          href="/admin/billing"
                          className="text-cyan-600 dark:text-cyan-400 font-semibold hover:underline"
                        >
                          View Receipt
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {stats.recentPayments.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-slate-500 dark:text-zinc-400"
                      >
                        No recorded payments found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/*Overdue Accounts Ledger */}
          {activeLedgerTab === "overdue" && (
            <div className="overflow-x-auto overflow-y-auto max-h-[282px] custom-scrollbar">
              <table className="w-full min-w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-zinc-900 shadow-xs border-b border-slate-200 dark:border-zinc-800">
                  <tr className="h-[42px] bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 uppercase tracking-wider text-[11px] font-bold">
                    <th className="py-2.5 px-6 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">
                      Tenant Name
                    </th>
                    <th className="py-2.5 px-4 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">
                      Room No.
                    </th>
                    <th className="py-2.5 px-4 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">
                      Total Overdue
                    </th>
                    <th className="py-2.5 px-4 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">
                      Aging Flag
                    </th>
                    <th className="py-2.5 pl-4 pr-6 text-right bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                  {stats.overdueAccounts.map((account) => (
                    <tr
                      key={account.tenant_id}
                      className="h-[48px] hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-6 font-bold text-slate-900 dark:text-white">
                        {account.tenant_name}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-600 dark:text-zinc-300">
                        Room {account.room_number || "N/A"}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-rose-600 dark:text-rose-400">
                        ₱{Number(account.total_overdue).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                          <AlertTriangle className="w-3 h-3" /> Past Due Date
                        </span>
                      </td>
                      <td className="py-2.5 px-6 text-right">
                        <button
                          onClick={() =>
                            toast.success(
                              `Payment overdue notice sent to ${account.tenant_name}`,
                            )
                          }
                          className="text-rose-600 dark:text-rose-400 font-semibold hover:underline"
                        >
                          Send Reminder
                        </button>
                      </td>
                    </tr>
                  ))}
                  {stats.overdueAccounts.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-slate-500 dark:text-zinc-400"
                      >
                        No delinquent or overdue accounts.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Maintenance Requests */}
          {activeLedgerTab === "maintenance" && (
            <div className="overflow-x-auto overflow-y-auto max-h-[282px] custom-scrollbar">
              <table className="w-full min-w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-zinc-900 shadow-xs border-b border-slate-200 dark:border-zinc-800">
                  <tr className="h-[42px] bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 uppercase tracking-wider text-[11px] font-bold">
                    <th className="py-2.5 px-6 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">
                      Request # & Title
                    </th>
                    <th className="py-2.5 px-4 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">
                      Tenant
                    </th>
                    <th className="py-2.5 px-4 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">
                      Created Date
                    </th>
                    <th className="py-2.5 px-4 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">
                      Status
                    </th>
                    <th className="py-2.5 pl-4 pr-6 text-right bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                  {stats.recentRequests.map((req) => (
                    <tr
                      key={req.id}
                      className="h-[48px] hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-6 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-semibold text-teal-600 dark:text-teal-400">
                            {formatRequestNumber(req.id, req.request_number)}
                          </span>
                          <span className="truncate">{req.title}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-zinc-300">
                        {req.tenant_name}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 dark:text-zinc-400">
                        {new Date(req.created_at).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric", year: "numeric" },
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                          <Clock className="w-3 h-3" /> Active Request
                        </span>
                      </td>
                      <td className="py-2.5 px-6 text-right">
                        <Link
                          href="/admin/requests"
                          className="text-cyan-600 dark:text-cyan-400 font-semibold hover:underline"
                        >
                          Manage Request
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {stats.recentRequests.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-slate-500 dark:text-zinc-400"
                      >
                        No active maintenance requests.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/*Activity Log */}
          {activeLedgerTab === "audit" && (
            <div className="overflow-x-auto overflow-y-auto max-h-[282px] custom-scrollbar divide-y divide-slate-100 dark:divide-zinc-800/60">
              {stats.recentActivities.map((act) => (
                <div
                  key={act.id}
                  className="h-[54px] flex items-center justify-between px-6 hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 flex items-center justify-center shrink-0">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {act.title}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                        {act.description}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400 dark:text-zinc-500 shrink-0 ml-4">
                    {new Date(act.date).toLocaleString()}
                  </span>
                </div>
              ))}
              {stats.recentActivities.length === 0 && (
                <p className="text-center text-slate-500 dark:text-zinc-400 py-8 text-xs">
                  No recent activities logged.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ANNOUNCEMENT POP-UP MODAL */}
      <AnimatePresence>
        {showAnnouncementModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowAnnouncementModal(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 8 }}
              className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50/80 dark:bg-zinc-900/80 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-500/30 flex items-center justify-center shrink-0">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-950 dark:text-white">
                      Property Announcements
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                      Broadcast notices to all residents and review recent
                      bulletins
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAnnouncementModal(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 transition-colors cursor-pointer"
                  title="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body - Scrollable */}
              <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar space-y-5">
                {/* 1. Recent Announcements Section */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                      Recent Announcements ({announcements.length})
                    </span>
                    {isLoadingAnnouncements && (
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 font-semibold">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Refreshing...</span>
                      </span>
                    )}
                  </div>

                  <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-2 border border-slate-200 dark:border-zinc-800 rounded-xl p-2 bg-slate-50/50 dark:bg-zinc-900/30">
                    {isLoadingAnnouncements && announcements.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-600" />
                        <p>Loading recent announcements...</p>
                      </div>
                    ) : announcements.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400 dark:text-zinc-500">
                        <Megaphone className="w-6 h-6 mx-auto mb-1.5 opacity-30 text-teal-600" />
                        <p className="font-semibold text-slate-700 dark:text-zinc-300">
                          No announcements posted yet.
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Use the form below to publish your first announcement
                          to all tenants.
                        </p>
                      </div>
                    ) : (
                      announcements.map((ann) => {
                        const annDate = new Date(
                          ann.created_at,
                        ).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        });
                        const isUrgent =
                          ann.type === "Alert" || ann.type === "Urgent";
                        const isMaintenance = ann.type === "Maintenance";
                        const isBilling = ann.type === "Billing";

                        return (
                          <div
                            key={ann.id}
                            className="p-3 bg-white dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/70 rounded-lg shadow-2xs hover:border-slate-300 dark:hover:border-zinc-600 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-xs sm:text-sm text-slate-950 dark:text-white">
                                  {ann.title}
                                </h4>
                                <span
                                  className={`px-2 py-0.2 rounded-md text-[10px] font-bold ${
                                    isUrgent
                                      ? "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30"
                                      : isMaintenance
                                        ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30"
                                        : isBilling
                                          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30"
                                          : "bg-slate-100 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-600"
                                  }`}
                                >
                                  {ann.type}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] font-mono text-slate-400 dark:text-zinc-500">
                                  {annDate}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteAnnouncement(ann.id)
                                  }
                                  className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors cursor-pointer"
                                  title="Delete announcement"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <p className="text-xs text-slate-700 dark:text-zinc-300 font-normal leading-relaxed mt-1.5 whitespace-pre-wrap">
                              {ann.content}
                            </p>

                            {ann.created_by_name && (
                              <div className="text-[10px] text-slate-400 dark:text-zinc-500 mt-2 font-medium">
                                Posted by {ann.created_by_name}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 2. New Announcement Input Section */}
                <form
                  onSubmit={handlePostAnnouncement}
                  className="space-y-3 pt-4 border-t border-slate-200 dark:border-zinc-800"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                      Compose Announcement
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Notifies all tenant portals
                    </span>
                  </div>

                  {/* Title and Category Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                        Announcement Title
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Scheduled Water Interruption, Cleanliness Notice"
                        value={announcementForm.title}
                        onChange={(e) =>
                          setAnnouncementForm({
                            ...announcementForm,
                            title: e.target.value,
                          })
                        }
                        className="w-full py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-950 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                        Category
                      </label>
                      <CustomSelect
                        value={announcementForm.type}
                        onChange={(val) =>
                          setAnnouncementForm({
                            ...announcementForm,
                            type: val,
                          })
                        }
                        options={[
                          "General",
                          "Urgent",
                          "Maintenance",
                          "Billing",
                        ]}
                        className="w-full py-2 px-3 text-xs sm:text-sm font-bold rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-zinc-100"
                      />
                    </div>
                  </div>

                  {/* Announcement Content Text Box */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                      Announcement Message
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Write your announcement details here. Tenants will see this on their dashboard and notifications..."
                      value={announcementForm.content}
                      onChange={(e) =>
                        setAnnouncementForm({
                          ...announcementForm,
                          content: e.target.value,
                        })
                      }
                      className="w-full py-2.5 px-3 text-xs sm:text-sm font-medium rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-slate-950 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-teal-500 leading-relaxed"
                    />
                  </div>

                  {/* Footer Action Buttons */}
                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAnnouncementModal(false)}
                      className="px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={
                        isPostingAnnouncement ||
                        !announcementForm.title.trim() ||
                        !announcementForm.content.trim()
                      }
                      className="px-4 py-2 text-xs sm:text-sm font-bold rounded-lg bg-teal-700 hover:bg-teal-800 text-white transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPostingAnnouncement ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Broadcasting...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Publish Announcement</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
