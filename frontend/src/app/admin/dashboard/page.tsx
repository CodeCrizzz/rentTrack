"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import Link from "next/link";
import api from "@/lib/api";
import { toast } from "sonner";
import AdminReportModal from "@/components/admin-report-modal";
import VisualRoomMatrix, {
  RoomMatrixItem,
} from "@/components/visual-room-matrix";
import {
  ComposedChart,
  Bar,
  Line,
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
  FileCheck,
  FileText,
  DollarSign,
  BedDouble,
  CreditCard,
  UserCheck,
  Megaphone,
  RefreshCw,
  FileSpreadsheet,
  Bell,
  Plus,
  UserPlus,
  LogOut,
  MessageSquare,
  TrendingUp,
  Percent,
  MapPin,
  BarChart3,
  Key,
  User,
} from "lucide-react";


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
  beds?: {
    totalBeds: number;
    occupiedBeds: number;
    availableBeds: number;
    maintenanceBeds: number;
    bedOccupancyRate: number;
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
    subRow1?: string;
    subRow2?: string;
    date: string;
    link?: string;
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
    room_number?: string | null;
  }[];
  recentPayments: {
    id: number;
    tenant_name: string;
    amount_paid: string;
    payment_date: string;
    reference_number?: string;
  }[];
  recentRequests: {
    id: number;
    request_number?: string | null;
    tenant_name: string;
    title: string;
    description?: string;
    category?: string;
    priority?: string;
    status?: string;
    assigned_to?: string | null;
    room_number?: string | null;
    scheduled_date?: string | null;
    date_resolved?: string | null;
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
  roomMatrix?: RoomMatrixItem[];
  pendingPaymentVerifications: {
    id: number;
    bill_id?: number;
    payment_id?: number;
    tenant_id?: number;
    tenant_name: string;
    room_number?: string | null;
    total_amount: number;
    created_at: string;
  }[];
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

const EMPTY_MONTHS = [
  { month: "Jan", billed: 0, collected: 0, outstanding: 0 },
  { month: "Feb", billed: 0, collected: 0, outstanding: 0 },
  { month: "Mar", billed: 0, collected: 0, outstanding: 0 },
  { month: "Apr", billed: 0, collected: 0, outstanding: 0 },
  { month: "May", billed: 0, collected: 0, outstanding: 0 },
  { month: "Jun", billed: 0, collected: 0, outstanding: 0 },
  { month: "Jul", billed: 0, collected: 0, outstanding: 0 },
  { month: "Aug", billed: 0, collected: 0, outstanding: 0 },
  { month: "Sep", billed: 0, collected: 0, outstanding: 0 },
  { month: "Oct", billed: 0, collected: 0, outstanding: 0 },
  { month: "Nov", billed: 0, collected: 0, outstanding: 0 },
  { month: "Dec", billed: 0, collected: 0, outstanding: 0 },
];



const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-slate-200 dark:border-zinc-800 shadow-xl rounded-xl p-3 text-xs font-semibold text-slate-800 dark:text-white min-w-44">
        <p className="mb-2 text-slate-900 dark:text-slate-100 font-bold text-xs border-b border-slate-100 dark:border-zinc-800 pb-1.5">
          {label} 2026
        </p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => {
            let dotColor = entry.color;
            if (entry.name === "Collected") dotColor = "#10b981";
            if (entry.name === "Outstanding") dotColor = "#f43f5e";
            if (
              entry.name === "Invoiced" ||
              entry.name === "Invoiced (Total Amount)"
            )
              dotColor = "#0284c7";

            return (
              <div
                key={`item-${index}`}
                className="flex justify-between items-center gap-4"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: dotColor }}
                  ></span>
                  <span className="text-slate-600 dark:text-slate-300 font-medium">
                    {entry.name}
                  </span>
                </div>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
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

const formatRelativeTime = (dateStr: string) => {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
};

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [cashflowData, setCashflowData] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<
    "this_month" | "last_month" | "this_year" | "last_year"
  >("this_year");
  const [isLoading, setIsLoading] = useState(true);
  const [adminName, setAdminName] = useState("Admin");

  // Urgent Action Filter: "all" | "payments" | "applicants" | "overdue" | "maintenance"
  const [urgentFilter, setUrgentFilter] = useState<
    "all" | "payments" | "applicants" | "overdue" | "maintenance"
  >("all");

  // Report Modal State
  const [showReportModal, setShowReportModal] = useState(false);

  // Announcement Modal State
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<{
    id: number;
    title?: string;
    content: string;
    created_at?: string;
  } | null>(null);
  const [isLoadingAnnouncement, setIsLoadingAnnouncement] = useState(false);
  const [announcementText, setAnnouncementText] = useState("");
  const [isPostingAnnouncement, setIsPostingAnnouncement] = useState(false);

  const fetchCurrentAnnouncement = async () => {
    setIsLoadingAnnouncement(true);
    try {
      const { data } = await api.get("/admin/announcements");
      if (Array.isArray(data) && data.length > 0) {
        setCurrentAnnouncement(data[0]);
      } else {
        setCurrentAnnouncement(null);
      }
    } catch (err) {
      console.error("Failed to fetch current announcement:", err);
    } finally {
      setIsLoadingAnnouncement(false);
    }
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = announcementText.trim();
    if (!text) {
      toast.error("Please enter an announcement.");
      return;
    }

    setIsPostingAnnouncement(true);
    try {
      const firstLine = text.split("\n")[0];
      const title = firstLine.length > 60 ? firstLine.slice(0, 57) + "..." : firstLine;
      const { data } = await api.post("/admin/announcements", {
        title,
        content: text,
        type: "General",
      });
      toast.success("Announcement posted successfully!");
      const created = data.announcement || data;
      setCurrentAnnouncement(created);
      setAnnouncementText("");
      setShowAnnouncementModal(false);
    } catch (err) {
      console.error("Failed to post announcement:", err);
      toast.error("Failed to post announcement");
    } finally {
      setIsPostingAnnouncement(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, []);


  const fetchDashboardData = async () => {
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

    const totalRooms = stats.rooms?.totalRooms || 0;
    const occupiedRooms = stats.rooms?.occupiedRooms || 0;
    const availableRooms = stats.rooms?.availableRooms || 0;
    const maintenanceRooms = stats.rooms?.maintenanceRooms || 0;
    const partiallyOccupiedRooms = stats.rooms?.partiallyOccupiedRooms || 0;

    // Bed capacity metrics (source of truth from database)
    const totalBeds = stats.beds?.totalBeds || 0;
    const occupiedBeds = stats.beds?.occupiedBeds || 0;
    const availableBeds = stats.beds?.availableBeds || 0;
    const maintenanceBeds = stats.beds?.maintenanceBeds || 0;
    const bedOccupancyRate =
      stats.beds?.bedOccupancyRate ??
      (totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0);

    const monthlyIncome = Number(stats.billing?.monthlyIncome) || 0;
    const pendingDues = Number(stats.billing?.pendingDues) || 0;
    const overduePayments = Number(stats.billing?.overduePayments) || 0;
    const unpaidBillsCount = stats.billing?.unpaidBillsCount || 0;
    const totalBilled = Number(stats.billing?.totalBilled) || 0;
    const collectionRate = stats.billing?.collectionRate || 0;
    const revenueIncrease = Number(stats.billing?.revenueIncrease) || 0;

    const pendingRequests = stats.maintenance?.pendingRequests || 0;
    const inProgressRequests = stats.maintenance?.inProgressRequests || 0;
    const resolvedRequests = stats.maintenance?.resolvedRequests || 0;
    const openWorkOrders = pendingRequests + inProgressRequests;

    // Urgent Action Center Counts
    const verificationsCount = stats.pendingPaymentVerifications?.length || 0;
    const applicationsCount = stats.pendingTenantsList?.length || 0;
    const overdueCount = stats.overdueAccounts?.length || 0;
    const maintenanceActionCount = openWorkOrders;
    const totalActionCount =
      verificationsCount +
      applicationsCount +
      overdueCount +
      maintenanceActionCount;

    return {
      totalRooms,
      occupiedRooms,
      availableRooms,
      maintenanceRooms,
      partiallyOccupiedRooms,
      totalBeds,
      occupiedBeds,
      availableBeds,
      maintenanceBeds,
      bedOccupancyRate,
      monthlyIncome,
      pendingDues,
      overduePayments,
      unpaidBillsCount,
      totalBilled,
      collectionRate,
      revenueIncrease,
      openWorkOrders,
      pendingRequests,
      inProgressRequests,
      resolvedRequests,
      verificationsCount,
      applicationsCount,
      overdueCount,
      maintenanceActionCount,
      totalActionCount,
    };
  }, [stats]);

  // Effective Cashflow data to render based on selected dateRange
  const cashflowDataToRender = useMemo(() => {
    if (!cashflowData || cashflowData.length === 0) {
      if (dateRange === "this_month") {
        const cur = new Date().toLocaleString("default", { month: "short" });
        return [{ month: cur, billed: 0, collected: 0, outstanding: 0 }];
      }
      if (dateRange === "last_month") {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        const last = d.toLocaleString("default", { month: "short" });
        return [{ month: last, billed: 0, collected: 0, outstanding: 0 }];
      }
      return EMPTY_MONTHS;
    }

    if (dateRange === "this_month") {
      const curMonth = new Date().toLocaleString("default", { month: "short" });
      const currentYear = new Date().getFullYear();
      const match = cashflowData.filter(
        (d) => d.month === curMonth && (!d.year || d.year === currentYear),
      );
      if (match.length > 0) return match;
      if (cashflowData.length === 1) return cashflowData;
      return [cashflowData[cashflowData.length - 1]];
    }

    if (dateRange === "last_month") {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      const lastMonth = d.toLocaleString("default", { month: "short" });
      const lastYear = d.getFullYear();
      const match = cashflowData.filter(
        (d) => d.month === lastMonth && (!d.year || d.year === lastYear),
      );
      if (match.length > 0) return match;
      if (cashflowData.length === 1) return cashflowData;
      return cashflowData.slice(-2, -1);
    }

    return cashflowData;
  }, [cashflowData, dateRange]);

  // Cashflow totals for selected period
  const cashflowTotals = useMemo(() => {
    let billed = 0;
    let collected = 0;
    let outstanding = 0;
    cashflowDataToRender.forEach((item) => {
      billed += Number(item.billed) || 0;
      collected += Number(item.collected) || 0;
      outstanding += Number(item.outstanding) || 0;
    });

    const rate =
      billed > 0 ? Math.min(100, Math.round((collected / billed) * 100)) : 0;

    return { billed, collected, outstanding, rate };
  }, [cashflowDataToRender]);

  // Consistent scale across This Month, Last Month, This Year, and Last Year (0, 25k, 50k, 75k, 100k)
  const { cashflowMaxVal, cashflowTicks } = useMemo(() => {
    let max = 0;
    cashflowDataToRender.forEach((d) => {
      const b = Number(d.billed) || 0;
      const c = Number(d.collected) || 0;
      const o = Number(d.outstanding) || 0;
      if (b > max) max = b;
      if (c > max) max = c;
      if (o > max) max = o;
    });

    // Standard consistent breaking lines: ₱0, ₱25,000, ₱50,000, ₱75,000, ₱100,000
    const baseMax = 100000;
    const baseStep = 25000;

    let maxVal = baseMax;
    let step = baseStep;

    if (max > baseMax) {
      step = 50000;
      maxVal = Math.ceil((max * 1.15) / step) * step;
    }

    const ticks: number[] = [];
    for (let v = 0; v <= maxVal; v += step) {
      ticks.push(v);
    }
    return { cashflowMaxVal: maxVal, cashflowTicks: ticks };
  }, [cashflowDataToRender]);

  // Urgent Action items (100% Real Database Records)
  const urgentActions = useMemo(() => {
    const list: any[] = [];

    // 1. Payment Verification
    if (
      stats?.pendingPaymentVerifications &&
      stats.pendingPaymentVerifications.length > 0
    ) {
      stats.pendingPaymentVerifications.forEach((v) => {
        list.push({
          id: `pay-${v.id}`,
          type: "payments",
          title: "Payment Verification",
          subRow1: `${v.tenant_name} • Room ${v.room_number || "N/A"}`,
          subRow2: `₱ ${Number(v.total_amount).toLocaleString()} • ${formatRelativeTime(v.created_at)}`,
          subtitle: `${v.tenant_name} • Room ${v.room_number || "N/A"} • ₱ ${Number(v.total_amount).toLocaleString()}`,
          btnText: "Verify Slip",
          link: `/admin/billing?tenant=${encodeURIComponent(v.tenant_name)}&verify=true`,
          icon: Receipt,
          color: "amber",
        });
      });
    }

    // 2. Tenant Applications
    if (stats?.pendingTenantsList && stats.pendingTenantsList.length > 0) {
      stats.pendingTenantsList.forEach((t) => {
        list.push({
          id: `app-${t.id}`,
          type: "applicants",
          title: "Tenant Application",
          subRow1: `${t.name}${t.room_number ? ` • Room ${t.room_number}` : ""}`,
          subRow2: `Applied ${formatRelativeTime(t.created_at)}`,
          subtitle: `${t.name}${t.room_number ? ` • Room ${t.room_number}` : ""} • Applied ${formatRelativeTime(t.created_at)}`,
          btnText: "Review",
          link: `/admin/tenants?tab=approvals&search=${encodeURIComponent(t.name)}`,
          icon: UserCheck,
          color: "blue",
        });
      });
    }

    // 3. Overdue Accounts
    if (stats?.overdueAccounts && stats.overdueAccounts.length > 0) {
      stats.overdueAccounts.forEach((a) => {
        list.push({
          id: `od-${a.tenant_id}`,
          type: "overdue",
          title: "Overdue Account",
          subRow1: `${a.tenant_name} • Room ${a.room_number || "N/A"}`,
          subRow2: `₱ ${Number(a.total_overdue).toLocaleString()} overdue`,
          subtitle: `${a.tenant_name} • Room ${a.room_number || "N/A"} • ₱ ${Number(a.total_overdue).toLocaleString()} overdue`,
          btnText: "Collect",
          link: `/admin/billing?tenant=${encodeURIComponent(a.tenant_name)}&highlight=true`,
          icon: AlertTriangle,
          color: "rose",
        });
      });
    }

    // 4. Maintenance Requests
    const openReqs =
      stats?.recentRequests?.filter((r) => r.status !== "Resolved") || [];
    if (openReqs.length > 0) {
      openReqs.slice(0, 10).forEach((r) => {
        list.push({
          id: `req-${r.id}`,
          type: "maintenance",
          title: "Maintenance Request",
          subRow1: `${r.title} • Room ${r.room_number || "N/A"}`,
          subRow2: `${r.priority || "Normal"} priority • ${formatRelativeTime(r.created_at)}`,
          subtitle: `${r.title} • Room ${r.room_number || "N/A"} • ${r.priority || "Normal"} priority`,
          btnText: "View",
          link: `/admin/requests?search=${encodeURIComponent(r.request_number || r.title)}`,
          icon: Wrench,
          color: "amber",
        });
      });
    }

    return list;
  }, [stats]);

  // Recent Activity Items (100% Real Live Activity Feed)
  const recentActivitiesList = useMemo(() => {
    if (!stats?.recentActivities || stats.recentActivities.length === 0) {
      return [];
    }

    return stats.recentActivities.slice(0, 30).map((a) => {
      let raw1: string = a.subRow1 || "";
      let raw2: string = a.subRow2 || "";

      if (!raw1 && a.description) {
        if (a.description.includes("(Ref:")) {
          const parts = a.description.split("(Ref:");
          raw1 = parts[0].trim();
          raw2 = `(Ref: ${parts[1].trim()}`.replace(/\(Ref:\s*#?/, "(Ref: #");
        } else if (a.description.includes(" moved to ")) {
          const parts = a.description.split(" moved to ");
          raw1 = `${parts[0].trim()} moved`;
          raw2 = `to ${parts.slice(1).join(" moved to ").trim()}`;
        } else if (a.type === "maintenance" && a.description.includes(" - ")) {
          const parts = a.description.split(" - ");
          const statusMatch = a.description.match(/\(([^)]+)\)/);
          raw1 = `${parts[0].trim()} moved`;
          raw2 = `to ${statusMatch ? statusMatch[1] : "Pending"}`;
        } else if (a.description.includes(" — ")) {
          const parts = a.description.split(" — ");
          raw1 = parts[0].trim();
          raw2 = parts.slice(1).join(" — ").trim();
        } else if (a.description.includes(" • ")) {
          const parts = a.description.split(" • ");
          raw1 = parts[0].trim();
          raw2 = parts.slice(1).join(" • ").trim();
        } else {
          raw1 = a.description;
          raw2 = "";
        }
      }

      // Ensure maintenance stops at "moved" on row 1 and extends "to [status]" on row 2
      if (raw1.endsWith(" moved to")) {
        raw1 = raw1.replace(/\s+moved\s+to$/, " moved");
        raw2 = raw2 ? `to ${raw2}` : "to";
      } else if (raw1.includes(" moved to ")) {
        const parts = raw1.split(" moved to ");
        raw1 = `${parts[0].trim()} moved`;
        raw2 = `to ${parts.slice(1).join(" moved to ").trim()} ${raw2}`.trim();
      }

      // Enforce max 27 characters on 1st row; overflow extends below it to 2nd row
      let subRow1 = raw1.trim();
      let subRow2 = raw2.trim();

      if (subRow1.length > 27) {
        let breakIdx = 27;
        const lastSpace = subRow1.lastIndexOf(" ", 27);
        if (lastSpace > 8) {
          breakIdx = lastSpace;
        }
        const overflow = subRow1.slice(breakIdx).trim();
        subRow1 = subRow1.slice(0, breakIdx).trim();
        subRow2 = subRow2 ? `${overflow} ${subRow2}`.trim() : overflow;
      }

      return {
        id: a.id,
        type: a.type,
        title: a.title,
        description: a.description,
        subRow1,
        subRow2,
        timeAgo: formatRelativeTime(a.date),
        link: a.link || "/admin/dashboard",
      };
    });
  }, [stats]);

  if (isLoading || !stats || !computedMetrics) {
    return (
      <div className="w-full space-y-6 pb-6 font-sans text-slate-900 dark:text-zinc-100 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-2 border-b border-slate-200 dark:border-zinc-800 pb-4">
          <div className="space-y-2">
            <div className="h-7 w-60 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
            <div className="h-4 w-80 bg-slate-200 dark:bg-zinc-800 rounded"></div>
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-24 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
            <div className="h-9 w-32 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
          </div>
        </div>

        {/* 4 Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-40 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5"
            ></div>
          ))}
        </div>

        {/* Middle Section Skeleton */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <div className="xl:col-span-6 h-[420px] bg-card border border-slate-200 dark:border-zinc-800 rounded-xl"></div>
          <div className="xl:col-span-3 h-[420px] bg-card border border-slate-200 dark:border-zinc-800 rounded-xl"></div>
          <div className="xl:col-span-3 h-[420px] bg-card border border-slate-200 dark:border-zinc-800 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-1 font-sans text-slate-900 dark:text-zinc-100">
      {/* 1. TOP HEADER & QUICK ACTIONS (Exact match to reference mockup) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-1 border-b border-slate-200/80 dark:border-zinc-800/80 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span>
              {getGreeting()}, {adminName}
            </span>
            <span className="text-2xl">👋</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-300 mt-0.5 font-medium">
            Here's what's happening with your property today.
          </p>
        </div>

        {/* Top Right Action Controls */}
        <div className="flex items-center gap-3.5 flex-wrap sm:flex-nowrap">
          {/* Issue Bill Button */}
          <Link
            href="/admin/billing?action=create"
            className="h-9 px-4 rounded-lg bg-[#0055a5] hover:bg-[#00478f] text-white transition-colors flex items-center gap-2 text-xs sm:text-[13px] font-bold shadow-xs"
          >
            <FileText className="w-4 h-4 text-white stroke-[2.2]" />
            <span>Issue Bill</span>
          </Link>

          {/* Add Announcement Button */}
          <button
            type="button"
            onClick={() => {
              setShowAnnouncementModal(true);
              fetchCurrentAnnouncement();
            }}
            className="h-9 px-4 rounded-lg bg-[#0055a5] hover:bg-[#00478f] text-white transition-colors flex items-center gap-2 text-xs sm:text-[13px] font-bold shadow-xs cursor-pointer"
          >
            <Megaphone className="w-4 h-4 text-white stroke-[2.2]" />
            <span>Add Announcement</span>
          </button>


          {/* Generate Report Button (Solid Deep Blue) */}
          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="h-9 px-4 rounded-lg bg-[#0055a5] hover:bg-[#00478f] text-white transition-colors flex items-center gap-2 text-xs sm:text-[13px] font-bold shadow-xs cursor-pointer"
          >
            <BarChart3 className="w-4 h-4 text-white stroke-[2.2]" />
            <span>Generate Report</span>
          </button>
        </div>
      </div>

      {/* 2. EXECUTIVE KPI RIBBON (4 Metric Cards Across One Row) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Card 1: Monthly Collections */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="show"
          className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between"
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300">
                Monthly Collections
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-slate-900 dark:text-white mt-1">
                ₱
                {computedMetrics.monthlyIncome.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/50 dark:border-emerald-500/20">
              <Wallet className="w-5 h-5" />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                Collection rate: {computedMetrics.collectionRate}%
              </span>
              <span
                className={`inline-flex items-center gap-0.5 text-xs font-bold ${
                  computedMetrics.revenueIncrease >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {computedMetrics.revenueIncrease >= 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
                {computedMetrics.revenueIncrease >= 0 ? "+" : "-"}
                {Math.abs(computedMetrics.revenueIncrease).toFixed(0)}% vs. last month
              </span>
            </div>
            {/* Emerald Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(0, computedMetrics.collectionRate))}%`,
                }}
              />
            </div>
            <div className="pt-1">
              <Link
                href="/admin/billing"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
              >
                View Billing Ledger →
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Card 2: Occupancy & Bed Capacity */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="show"
          className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between"
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300">
                Occupancy & Bed Capacity
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-slate-900 dark:text-white mt-1 flex items-baseline gap-2">
                {computedMetrics.bedOccupancyRate}%
                <span className="text-xs font-sans font-semibold text-slate-600 dark:text-zinc-300">
                  ({computedMetrics.occupiedBeds}/{computedMetrics.totalBeds}{" "}
                  beds)
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/50 dark:border-blue-500/20">
              <Building2 className="w-5 h-5" />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 space-y-2">
            {/* Segmented Capacity Bar: Green, Cyan, Rose */}
            <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-2 flex overflow-hidden">
              <div
                style={{
                  width: `${(computedMetrics.occupiedBeds / (computedMetrics.totalBeds || 1)) * 100}%`,
                }}
                className="bg-emerald-500"
                title={`Occupied: ${computedMetrics.occupiedBeds}`}
              />
              <div
                style={{
                  width: `${(computedMetrics.availableBeds / (computedMetrics.totalBeds || 1)) * 100}%`,
                }}
                className="bg-cyan-500"
                title={`Available: ${computedMetrics.availableBeds}`}
              />
              <div
                style={{
                  width: `${(computedMetrics.maintenanceBeds / (computedMetrics.totalBeds || 1)) * 100}%`,
                }}
                className="bg-rose-500"
                title={`Maintenance: ${computedMetrics.maintenanceBeds}`}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-zinc-200 font-semibold pt-0.5">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Occupied {computedMetrics.occupiedBeds}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                Available {computedMetrics.availableBeds}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                Maintenance {computedMetrics.maintenanceBeds}
              </span>
            </div>

            <div className="pt-0.5">
              <Link
                href="/admin/rooms"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
              >
                View Room Manager →
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Card 3: Outstanding Receivables */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="show"
          className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between"
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300">
                Outstanding Receivables
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-slate-900 dark:text-white mt-1">
                ₱
                {computedMetrics.pendingDues.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200/50 dark:border-rose-500/20">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-700 dark:text-zinc-200">
                Overdue:{" "}
                <span className="font-mono text-rose-600 dark:text-rose-400 font-bold">
                  ₱
                  {computedMetrics.overduePayments.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </span>
              <span className="text-slate-400 dark:text-zinc-600">|</span>
              <span className="text-slate-700 dark:text-zinc-200">
                Unpaid Invoices: {computedMetrics.unpaidBillsCount}
              </span>
            </div>
            <div className="pt-2">
              <Link
                href="/admin/billing?filter=unpaid"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
              >
                View Bills and Payments →
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Card 4: Open Maintenance Requests */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="show"
          className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between"
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300">
                Open Maintenance Requests
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-slate-900 dark:text-white mt-1">
                {computedMetrics.openWorkOrders}{" "}
                <span className="text-sm font-sans font-semibold text-slate-600 dark:text-zinc-300">
                  open requests
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200/50 dark:border-amber-500/20">
              <Wrench className="w-5 h-5" />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-zinc-200">
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Needs Review {computedMetrics.pendingRequests}
              </span>
              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                In Progress {computedMetrics.inProgressRequests}
              </span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Resolved {computedMetrics.resolvedRequests}
              </span>
            </div>
            <div className="pt-2">
              <Link
                href="/admin/requests"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
              >
                View Request Desk →
              </Link>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 3. CORE ANALYTICS, ACTION QUEUE & RECENT ACTIVITY (3-Column Desktop Grid) */}
      <div
        className="grid grid-cols-1 xl:grid-cols-[var(--cashflow-col)_minmax(0,1.35fr)_minmax(0,1fr)] gap-5"
        style={{ ["--cashflow-col" as any]: "minmax(0, calc(50% + 40px))" }}
      >
        {/* Left Column: Cash Flow Overview (Aligned with 'View' in Card 3) */}
        <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col justify-between min-h-[580px] xl:h-[580px]">
          <div>
            {/* Title & 4 Pill Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Cash Flow Overview
                </h2>
                <p className="text-xs text-slate-600 dark:text-zinc-300 mt-0.5 font-medium">
                  Billed vs. collected vs. outstanding
                </p>
              </div>

              {/* 4 Pill Buttons */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setDateRange("this_month")}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    dateRange === "this_month"
                      ? "bg-[#0284c7] text-white shadow-xs"
                      : "text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => setDateRange("last_month")}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    dateRange === "last_month"
                      ? "bg-[#0284c7] text-white shadow-xs"
                      : "text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Last Month
                </button>
                <button
                  type="button"
                  onClick={() => setDateRange("this_year")}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    dateRange === "this_year"
                      ? "bg-[#0284c7] text-white shadow-xs"
                      : "text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  This Year
                </button>
                <button
                  type="button"
                  onClick={() => setDateRange("last_year")}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    dateRange === "last_year"
                      ? "bg-[#0284c7] text-white shadow-xs"
                      : "text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Last Year
                </button>
              </div>
            </div>

            {/* Split: Chart on Left (Expanded Width), 4 Stacked Cards on Right (Decreased Width) */}
            <div className="flex flex-col lg:flex-row gap-4 items-stretch">
              {/* Chart Subpanel (Standard Recharts ResponsiveContainer) */}
              <div className="flex-1 min-w-0 h-[420px] sm:h-[460px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={cashflowDataToRender}
                    margin={{
                      top: 14,
                      right: 12,
                      left: 0,
                      bottom: 0,
                    }}
                    barGap={
                      cashflowDataToRender.length <= 1 ||
                      dateRange === "this_month" ||
                      dateRange === "last_month"
                        ? 18
                        : 2
                    }
                    barSize={
                      cashflowDataToRender.length <= 1 ||
                      dateRange === "this_month" ||
                      dateRange === "last_month"
                        ? 130
                        : cashflowDataToRender.length <= 3
                          ? 28
                          : 7
                    }
                  >
                    {/* Clear breaking line (horizontal dashed line) across each amount on graph */}
                    <CartesianGrid
                      strokeDasharray="4 4"
                      vertical={false}
                      stroke="currentColor"
                      className="text-slate-300 dark:text-zinc-700"
                      strokeOpacity={0.7}
                    />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 700 }}
                      dy={5}
                    />
                    <YAxis
                      domain={[0, cashflowMaxVal]}
                      ticks={cashflowTicks}
                      axisLine={false}
                      tickLine={false}
                      width={68}
                      tick={({ y, payload }: any) => {
                        const val = payload.value;
                        const formatted =
                          val === 0 ? "₱0" : `₱${Number(val).toLocaleString()}`;
                        return (
                          <text
                            x={0}
                            y={y}
                            dy={3.5}
                            fill="#94a3b8"
                            fontSize={10.5}
                            fontWeight={700}
                            textAnchor="start"
                          >
                            {formatted}
                          </text>
                        );
                      }}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(148, 163, 184, 0.08)" }}
                      content={<CustomChartTooltip />}
                    />
                    <Legend
                      verticalAlign="bottom"
                      content={() => {
                        const isSingleMonth =
                          cashflowDataToRender.length <= 1 ||
                          dateRange === "this_month" ||
                          dateRange === "last_month";
                        return (
                          <div
                            style={{ paddingLeft: 68, paddingRight: 12 }}
                            className="w-full flex items-center justify-center pt-3 text-[11px] font-semibold text-slate-700 dark:text-zinc-200"
                          >
                            <div
                              className={`flex items-center justify-center ${
                                isSingleMonth ? "gap-[18px]" : "gap-5"
                              }`}
                            >
                              <span
                                className={`flex items-center justify-center gap-1.5 ${
                                  isSingleMonth ? "w-[130px] text-center" : ""
                                }`}
                              >
                                <span className="w-2.5 h-2.5 rounded-xs bg-[#10b981] shrink-0" />
                                <span>Collected</span>
                              </span>
                              <span
                                className={`flex items-center justify-center gap-1.5 ${
                                  isSingleMonth ? "w-[130px] text-center" : ""
                                }`}
                              >
                                <span className="w-2.5 h-2.5 rounded-xs bg-[#0284c7] shrink-0" />
                                <span>Invoiced</span>
                              </span>
                              <span
                                className={`flex items-center justify-center gap-1.5 ${
                                  isSingleMonth ? "w-[130px] text-center" : ""
                                }`}
                              >
                                <span className="w-2.5 h-2.5 rounded-xs bg-[#f43f5e] shrink-0" />
                                <span>Outstanding</span>
                              </span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    {/* Graph bars with minPointSize so 0 amounts also show a visible bar */}
                    <Bar
                      dataKey="collected"
                      name="Collected"
                      fill="#10b981"
                      radius={
                        cashflowDataToRender.length <= 1 ||
                        dateRange === "this_month" ||
                        dateRange === "last_month"
                          ? [10, 10, 0, 0]
                          : [2.5, 2.5, 0, 0]
                      }
                      minPointSize={
                        cashflowDataToRender.length <= 1 ||
                        dateRange === "this_month" ||
                        dateRange === "last_month"
                          ? 12
                          : 4
                      }
                    />
                    <Bar
                      dataKey="billed"
                      name="Invoiced"
                      fill="#0284c7"
                      radius={
                        cashflowDataToRender.length <= 1 ||
                        dateRange === "this_month" ||
                        dateRange === "last_month"
                          ? [10, 10, 0, 0]
                          : [2.5, 2.5, 0, 0]
                      }
                      minPointSize={
                        cashflowDataToRender.length <= 1 ||
                        dateRange === "this_month" ||
                        dateRange === "last_month"
                          ? 12
                          : 4
                      }
                    />
                    <Bar
                      dataKey="outstanding"
                      name="Outstanding"
                      fill="#f43f5e"
                      radius={
                        cashflowDataToRender.length <= 1 ||
                        dateRange === "this_month" ||
                        dateRange === "last_month"
                          ? [10, 10, 0, 0]
                          : [2.5, 2.5, 0, 0]
                      }
                      minPointSize={
                        cashflowDataToRender.length <= 1 ||
                        dateRange === "this_month" ||
                        dateRange === "last_month"
                          ? 12
                          : 4
                      }
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* 4 Stacked Right KPI Badges (Decreased width to expand graph) */}
              <div className="w-full lg:w-40 xl:w-44 shrink-0 flex flex-col justify-center gap-3 h-full min-h-[420px] sm:min-h-[460px]">
                {/* 1. Total Invoiced */}
                <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center gap-2 hover:border-blue-300 dark:hover:border-blue-800/60 transition-colors shadow-2xs">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200/50 dark:border-blue-500/20">
                    <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 block leading-tight">
                      Total Invoiced
                    </span>
                    <p className="font-mono font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white mt-0.5">
                      ₱{cashflowTotals.billed.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* 2. Collected */}
                <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center gap-2 hover:border-emerald-300 dark:hover:border-emerald-800/60 transition-colors shadow-2xs">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200/50 dark:border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 block leading-tight">
                      Collected
                    </span>
                    <p className="font-mono font-extrabold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">
                      ₱{cashflowTotals.collected.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* 3. Outstanding */}
                <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center gap-2 hover:border-rose-300 dark:hover:border-rose-800/60 transition-colors shadow-2xs">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200/50 dark:border-rose-500/20">
                    <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 block leading-tight">
                      Outstanding
                    </span>
                    <p className="font-mono font-extrabold text-xs sm:text-sm text-rose-600 dark:text-rose-400 mt-0.5">
                      ₱{cashflowTotals.outstanding.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* 4. Collection Rate */}
                <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center gap-2 hover:border-teal-300 dark:hover:border-teal-800/60 transition-colors shadow-2xs">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0 border border-teal-200/50 dark:border-teal-500/20">
                    <Percent className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 block leading-tight">
                      Collection Rate
                    </span>
                    <p className="font-mono font-extrabold text-xs sm:text-sm text-teal-600 dark:text-teal-400 mt-0.5">
                      {cashflowTotals.rate}%
                    </p>
                    <div className="w-full bg-slate-200 dark:bg-zinc-700 h-1.5 rounded-full mt-1 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.max(0, cashflowTotals.rate))}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Column: Urgent Action Center */}
        <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col h-[580px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Urgent Action Center
              </h2>
              {computedMetrics.totalActionCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                  {computedMetrics.totalActionCount} need attention
                </span>
              )}
            </div>
            <Link
              href="/admin/billing"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              View All →
            </Link>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 mb-3 text-xs font-semibold shrink-0">
            <button
              onClick={() => setUrgentFilter("all")}
              className={`px-2 py-0.5 rounded-md transition-all shrink-0 cursor-pointer ${
                urgentFilter === "all"
                  ? "bg-[#0284c7] text-white"
                  : "text-slate-600 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white font-medium"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setUrgentFilter("payments")}
              className={`px-2 py-0.5 rounded-md transition-all shrink-0 cursor-pointer ${
                urgentFilter === "payments"
                  ? "bg-[#0284c7] text-white"
                  : "text-slate-600 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white font-medium"
              }`}
            >
              Payments
            </button>
            <button
              onClick={() => setUrgentFilter("applicants")}
              className={`px-2 py-0.5 rounded-md transition-all shrink-0 cursor-pointer ${
                urgentFilter === "applicants"
                  ? "bg-[#0284c7] text-white"
                  : "text-slate-600 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white font-medium"
              }`}
            >
              Applicants
            </button>
            <button
              onClick={() => setUrgentFilter("overdue")}
              className={`px-2 py-0.5 rounded-md transition-all shrink-0 cursor-pointer ${
                urgentFilter === "overdue"
                  ? "bg-[#0284c7] text-white"
                  : "text-slate-600 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white font-medium"
              }`}
            >
              Overdue
            </button>
            <button
              onClick={() => setUrgentFilter("maintenance")}
              className={`px-2 py-0.5 rounded-md transition-all shrink-0 cursor-pointer ${
                urgentFilter === "maintenance"
                  ? "bg-[#0284c7] text-white"
                  : "text-slate-600 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white font-medium"
              }`}
            >
              Maintenance
            </button>
          </div>

          {/* Action List (Scrollable - exactly 5 items visible, scroll for remaining) */}
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2.5 pr-1 custom-scrollbar">
            {urgentActions.filter(
              (a) => urgentFilter === "all" || a.type === urgentFilter,
            ).length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-600 dark:text-zinc-300">
                <CheckCircle2 className="w-9 h-9 text-emerald-500 mb-2 stroke-[1.5]" />
                <p className="text-xs font-bold text-slate-800 dark:text-zinc-100">
                  All caught up!
                </p>
                <p className="text-[11px] mt-0.5 text-slate-600 dark:text-zinc-300 font-medium">
                  No urgent items requiring attention right now.
                </p>
              </div>
            ) : (
              urgentActions
                .filter(
                  (a) => urgentFilter === "all" || a.type === urgentFilter,
                )
                .map((item) => {
                  const IconComp = item.icon;
                  return (
                    <div
                      key={item.id}
                      className="h-[calc((100%-40px)/5)] shrink-0 px-3 py-2 rounded-xl border border-slate-200/80 dark:border-zinc-800/90 bg-white dark:bg-zinc-900/90 flex items-center justify-between gap-3 sm:gap-3.5 shadow-2xs hover:border-slate-300 dark:hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            item.color === "amber"
                              ? "bg-amber-100/70 dark:bg-amber-500/20 text-amber-600"
                              : item.color === "blue"
                                ? "bg-blue-100/70 dark:bg-blue-500/20 text-blue-600"
                                : "bg-rose-100/70 dark:bg-rose-500/20 text-rose-600"
                          }`}
                        >
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {item.title}
                          </p>
                          {item.subRow1 ? (
                            <>
                              <p className="text-[11px] text-slate-600 dark:text-zinc-300 truncate mt-0.5 font-medium leading-tight">
                                {item.subRow1}
                              </p>
                              <p
                                className={`text-[10px] truncate leading-tight mt-0.5 font-semibold ${
                                  item.type === "overdue"
                                    ? "text-rose-600 dark:text-rose-400"
                                    : "text-slate-600 dark:text-zinc-300"
                                }`}
                              >
                                {item.subRow2}
                              </p>
                            </>
                          ) : (
                            <p className="text-[11px] text-slate-600 dark:text-zinc-300 truncate mt-0.5 font-medium">
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center shrink-0 pl-1">
                        <Link
                          href={item.link}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                        >
                          {item.btnText}
                        </Link>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Right Column: Recent Activity */}
        <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col h-[580px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 shrink-0">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Recent Activity
            </h2>
            <Link
              href="/admin/activity-logs"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              View All →
            </Link>
          </div>

          {/* Activity Stream (Scrollable - exactly 7 items visible, scroll for remaining) */}
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1.5 pr-1 custom-scrollbar">
            {recentActivitiesList.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-600 dark:text-zinc-300">
                <Clock className="w-9 h-9 text-slate-400 dark:text-zinc-600 mb-2 stroke-[1.5]" />
                <p className="text-xs font-bold text-slate-800 dark:text-zinc-100">
                  No recent activity
                </p>
                <p className="text-[11px] mt-0.5 text-slate-600 dark:text-zinc-300 font-medium">
                  Events will appear here as payments, tenants, and requests
                  update.
                </p>
              </div>
            ) : (
              recentActivitiesList.map((act) => {
                const isPayment = act.type === "payment";
                const isTenant =
                  act.type === "tenant" || act.type === "applicant";
                const isMaintenance = act.type === "maintenance";
                const isAnnouncement = act.type === "announcement";
                const isMoveOut = act.type === "moveout";

                return (
                  <Link
                    key={act.id}
                    href={act.link || "/admin/dashboard"}
                    className="h-[calc((100%-36px)/7)] shrink-0 flex items-center gap-2.5 group cursor-pointer pb-1.5 border-b border-slate-100 dark:border-zinc-800/80 last:border-b-0 hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 px-1 rounded-lg transition-colors"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        isPayment
                          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                          : isTenant
                            ? "bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
                            : isMaintenance
                              ? "bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400"
                              : isMoveOut
                                ? "bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400"
                                : isAnnouncement
                                  ? "bg-cyan-100 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400"
                                  : "bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400"
                      }`}
                    >
                      {isPayment ? (
                        <FileCheck className="w-4 h-4" />
                      ) : isTenant ? (
                        <FileText className="w-4 h-4" />
                      ) : isMaintenance ? (
                        <Wrench className="w-4 h-4" />
                      ) : isMoveOut ? (
                        <LogOut className="w-4 h-4" />
                      ) : isAnnouncement ? (
                        <Megaphone className="w-4 h-4" />
                      ) : (
                        <MessageSquare className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {act.title}
                        </p>
                        <span className="text-[10px] text-slate-600 dark:text-zinc-300 shrink-0 font-medium">
                          {act.timeAgo}
                        </span>
                      </div>
                      <div className="mt-0.5 leading-tight">
                        <p className="text-[11px] text-slate-600 dark:text-zinc-300 truncate font-medium">
                          {act.subRow1 || act.description}
                        </p>
                        {act.subRow2 ? (
                          <p className="text-[11px] text-slate-600 dark:text-zinc-300 truncate font-medium mt-0.5">
                            {act.subRow2}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 4. FLOOR & ROOM MATRIX */}
      <VisualRoomMatrix rooms={stats.roomMatrix || []} />

      {/* ENTER ANNOUNCEMENT POPUP CARD */}
      <AnimatePresence>
        {showAnnouncementModal && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowAnnouncementModal(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 8 }}
              className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header: Enter Announcement */}
              <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50/80 dark:bg-zinc-900/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-[#0055a5] dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center shrink-0">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-950 dark:text-white">
                    Enter Announcement
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAnnouncementModal(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 transition-colors cursor-pointer"
                  title="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body: Only the 2 specified outputs */}
              <form onSubmit={handlePostAnnouncement} className="p-4 sm:p-5 space-y-4">
                {/* Output 1: Current Announcement */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Current Announcement
                  </label>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs sm:text-sm text-slate-800 dark:text-zinc-200 min-h-[70px] max-h-[140px] overflow-y-auto leading-relaxed custom-scrollbar">
                    {isLoadingAnnouncement ? (
                      <div className="flex items-center gap-2 text-slate-400 py-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-[#0055a5]" />
                        <span>Loading current announcement...</span>
                      </div>
                    ) : currentAnnouncement ? (
                      <div>
                        <p className="whitespace-pre-wrap font-medium">
                          {currentAnnouncement.content || currentAnnouncement.title}
                        </p>
                        {currentAnnouncement.created_at && (
                          <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono mt-2">
                            Posted on {new Date(currentAnnouncement.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-400 italic py-2">
                        No current announcement posted.
                      </p>
                    )}
                  </div>
                </div>

                {/* Output 2: Text box where admin can type to announce */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Enter Announcement
                  </label>
                  <textarea
                    rows={4}
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    placeholder="Type your announcement here..."
                    className="w-full p-3 text-xs sm:text-sm font-medium rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0055a5] resize-none leading-relaxed"
                    autoFocus
                  />
                </div>

                {/* Modal Footer Controls */}
                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAnnouncementModal(false)}
                    className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPostingAnnouncement || !announcementText.trim()}
                    className="h-9 px-4 rounded-lg bg-[#0055a5] hover:bg-[#00478f] text-white text-xs sm:text-[13px] font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isPostingAnnouncement ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Posting...</span>
                      </>
                    ) : (
                      <span>Announce</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* Operational & Financial Report Modal */}
      <AdminReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
      />
    </div>
  );
}
