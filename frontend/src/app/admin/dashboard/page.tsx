"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import Link from "next/link";
import api from "@/lib/api";
import { toast } from "sonner";
import AdminReportModal from "@/components/admin-report-modal";
import DropdownSelect from "@/components/dropdown-select";
import { formatPhoneNumber } from "@/lib/phone-utils";
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
  Bed,
  Search,
  Phone,
  Mail,
} from "lucide-react";

export interface RoomTenant {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
}

export interface RoomMatrixItem {
  id: number;
  room_number: string;
  type: string;
  rental_type?: string;
  capacity: number;
  price: string | number;
  floor: string;
  status: string;
  current_occupants: number;
  computed_status?: string;
  tenants?: RoomTenant[];
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

// Bed Icon for bed capacity slots
const BedIcon = ({ filled, status }: { filled: boolean; status: string }) => {
  let iconColor = "text-slate-300 dark:text-zinc-600";
  let label = "Vacant bed";

  if (status === "Maintenance") {
    iconColor = "text-rose-500 dark:text-rose-400";
    label = "Bed under maintenance";
  } else if (filled) {
    if (status === "OccupiedWithBeds" || status === "Partial") {
      iconColor = "text-amber-500 dark:text-amber-400";
      label = "Occupied bed";
    } else {
      iconColor = "text-emerald-500 dark:text-emerald-400";
      label = "Occupied bed";
    }
  }

  return (
    <span title={label} className="inline-flex shrink-0">
      <Bed
        className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${iconColor} transition-colors`}
      />
    </span>
  );
};

const normalizeFloor = (floorStr?: string | null, roomNumber?: string) => {
  if (floorStr) {
    const clean = floorStr.toLowerCase();
    if (clean.includes("1") || clean.includes("first") || clean.includes("1st"))
      return "Floor 1";
    if (
      clean.includes("2") ||
      clean.includes("second") ||
      clean.includes("2nd")
    )
      return "Floor 2";
    if (clean.includes("3") || clean.includes("third") || clean.includes("3rd"))
      return "Floor 3";
    if (
      clean.includes("4") ||
      clean.includes("fourth") ||
      clean.includes("4th")
    )
      return "Floor 4";
    if (clean.includes("5") || clean.includes("fifth") || clean.includes("5th"))
      return "Floor 5";
    if (clean.includes("6") || clean.includes("sixth") || clean.includes("6th"))
      return "Floor 6";
    if (
      clean.includes("7") ||
      clean.includes("seventh") ||
      clean.includes("7th")
    )
      return "Floor 7";
  }
  if (roomNumber && roomNumber.length >= 3 && !isNaN(Number(roomNumber[0]))) {
    return `Floor ${roomNumber[0]}`;
  }
  return "Floor 1";
};

type EffectiveStatus =
  | "Full"
  | "OccupiedWithBeds"
  | "Available"
  | "Maintenance";

const getRoomEffectiveStatus = (room: RoomMatrixItem): EffectiveStatus => {
  const rawStatus = (room.status || "").toLowerCase();
  if (rawStatus === "maintenance" || rawStatus === "unavailable")
    return "Maintenance";
  const occupants =
    room.current_occupants ?? (room.tenants ? room.tenants.length : 0);
  const capacity = Number(room.capacity) > 0 ? Number(room.capacity) : 1;
  if (occupants === 0) return "Available";
  if (occupants >= capacity) return "Full";
  return "OccupiedWithBeds";
};

const getAvailableBedsCount = (room: RoomMatrixItem): number => {
  const occupants =
    room.current_occupants ?? (room.tenants ? room.tenants.length : 0);
  const capacity = Number(room.capacity) > 0 ? Number(room.capacity) : 1;
  return Math.max(0, capacity - occupants);
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

  // Floor & Room Matrix Filter & Modal States
  const [matrixStatusFilter, setMatrixStatusFilter] = useState<string>("all");
  const [matrixSearchQuery, setMatrixSearchQuery] = useState<string>("");
  const [activeRoomModal, setActiveRoomModal] = useState<RoomMatrixItem | null>(
    null,
  );

  const allMatrixRooms = useMemo(() => {
    return (stats?.roomMatrix || []).map((r) => ({
      ...r,
      floor: normalizeFloor(r.floor, r.room_number),
    }));
  }, [stats?.roomMatrix]);

  const distinctMatrixFloors = useMemo(() => {
    const set = new Set<string>();
    allMatrixRooms.forEach((r) => {
      set.add(normalizeFloor(r.floor, r.room_number));
    });
    const arr = Array.from(set).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true }),
    );
    return arr.length > 0 ? arr : ["Floor 1"];
  }, [allMatrixRooms]);

  const matrixMetrics = useMemo(() => {
    let full = 0;
    let occupiedWithBeds = 0;
    let vacant = 0;
    let maintenance = 0;

    allMatrixRooms.forEach((r) => {
      const st = getRoomEffectiveStatus(r);
      if (st === "Full") full++;
      else if (st === "OccupiedWithBeds") occupiedWithBeds++;
      else if (st === "Available") vacant++;
      else if (st === "Maintenance") maintenance++;
    });

    return {
      total: allMatrixRooms.length,
      full,
      occupiedWithBeds,
      vacant,
      maintenance,
    };
  }, [allMatrixRooms]);

  const filteredMatrixRooms = useMemo(() => {
    return allMatrixRooms.filter((room) => {
      const effectiveSt = getRoomEffectiveStatus(room);
      if (matrixStatusFilter !== "all") {
        if (matrixStatusFilter === "full" && effectiveSt !== "Full")
          return false;
        if (
          (matrixStatusFilter === "occupied_with_beds" ||
            matrixStatusFilter === "partial") &&
          effectiveSt !== "OccupiedWithBeds"
        )
          return false;
        if (
          matrixStatusFilter === "occupied" &&
          effectiveSt !== "Full" &&
          effectiveSt !== "OccupiedWithBeds"
        )
          return false;
        if (
          (matrixStatusFilter === "vacant" ||
            matrixStatusFilter === "available") &&
          effectiveSt !== "Available"
        )
          return false;
        if (
          matrixStatusFilter === "maintenance" &&
          effectiveSt !== "Maintenance"
        )
          return false;
      }
      if (matrixSearchQuery.trim()) {
        const q = matrixSearchQuery.toLowerCase();
        const matchesNumber = room.room_number?.toLowerCase().includes(q);
        const matchesType = room.type?.toLowerCase().includes(q);
        const matchesTenant = room.tenants?.some((t) =>
          t.name?.toLowerCase().includes(q),
        );
        if (!matchesNumber && !matchesType && !matchesTenant) return false;
      }
      return true;
    });
  }, [allMatrixRooms, matrixStatusFilter, matrixSearchQuery]);

  const matrixRoomsByFloor = useMemo(() => {
    const map: Record<string, RoomMatrixItem[]> = {};
    distinctMatrixFloors.forEach((fl) => {
      map[fl] = [];
    });

    filteredMatrixRooms.forEach((r) => {
      const fl = normalizeFloor(r.floor, r.room_number);
      if (map[fl]) {
        map[fl].push(r);
      }
    });

    return map;
  }, [filteredMatrixRooms, distinctMatrixFloors]);

  const renderMatrixRoomCard = (room: RoomMatrixItem) => {
    const effectiveStatus = getRoomEffectiveStatus(room);
    const occupants =
      room.current_occupants ?? (room.tenants ? room.tenants.length : 0);
    const capacity = Number(room.capacity) > 0 ? Number(room.capacity) : 1;
    const availBeds = getAvailableBedsCount(room);
    const totalBeds = Math.min(Math.max(capacity, 1), 24);

    const bedSlots = Array.from({ length: totalBeds }).map((_, slotIdx) => {
      let isFilled = false;
      if (effectiveStatus === "Full") isFilled = true;
      else if (effectiveStatus === "OccupiedWithBeds")
        isFilled = slotIdx < occupants;
      else if (effectiveStatus === "Maintenance") isFilled = true;
      return { slotIdx, isFilled };
    });

    const bedRows: { slotIdx: number; isFilled: boolean }[][] = [];
    for (let i = 0; i < bedSlots.length; i += 5) {
      bedRows.push(bedSlots.slice(i, i + 5));
    }

    const hasBedScroll = bedRows.length >= 3;
    const cardMinHeight = "min-h-[190px]";

    const subType = `${room.type || "Single"} • ${room.rental_type || "Standard"}`;

    return (
      <div
        key={room.id}
        onClick={() => setActiveRoomModal(room)}
        className={`bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-xl p-3.5 sm:p-4 flex flex-col justify-between shadow-2xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer ${cardMinHeight}`}
      >
        <div>
          <div className="mb-1">
            <span className="font-extrabold text-sm sm:text-base font-mono text-slate-900 dark:text-white">
              {room.room_number}
            </span>
          </div>

          <p
            title={subType}
            className="text-xs text-slate-600 dark:text-zinc-300 font-semibold truncate mb-2"
          >
            {subType}
          </p>

          <div
            className={`flex flex-col gap-1.5 my-2 min-h-[46px] max-h-[46px] ${
              hasBedScroll
                ? "overflow-y-auto pr-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent"
                : "overflow-hidden"
            }`}
          >
            {bedRows.map((row, rowIdx) => (
              <div key={rowIdx} className="flex items-center gap-1.5">
                {row.map(({ slotIdx, isFilled }) => (
                  <BedIcon
                    key={slotIdx}
                    filled={isFilled}
                    status={effectiveStatus}
                  />
                ))}
              </div>
            ))}
          </div>

          <p
            className={`text-xs font-bold truncate my-1.5 ${
              effectiveStatus === "Full"
                ? "text-emerald-600 dark:text-emerald-400"
                : effectiveStatus === "OccupiedWithBeds"
                  ? "text-amber-600 dark:text-amber-400"
                  : effectiveStatus === "Maintenance"
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-blue-600 dark:text-blue-400"
            }`}
            title={
              effectiveStatus === "OccupiedWithBeds"
                ? `Occupied with ${availBeds} ${availBeds === 1 ? "available bed" : "available beds"}`
                : effectiveStatus === "Full"
                  ? "Full"
                  : effectiveStatus === "Available"
                    ? "Vacant"
                    : "Maintenance"
            }
          >
            {effectiveStatus === "Full"
              ? "Full"
              : effectiveStatus === "OccupiedWithBeds"
                ? `Occupied with ${availBeds} ${availBeds === 1 ? "available bed" : "available beds"}`
                : effectiveStatus === "Available"
                  ? "Vacant"
                  : "Maintenance"}
          </p>
        </div>

        <div className="pt-2 mt-2 border-t border-slate-100 dark:border-zinc-800 text-xs sm:text-sm font-mono font-bold text-slate-700 dark:text-zinc-200">
          ₱{Number(room.price).toLocaleString()}
          <span className="text-[10px] font-medium text-slate-600 dark:text-zinc-300 ml-0.5">
            /mo
          </span>
        </div>
      </div>
    );
  };

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
      toast.warning("Empty Announcement", {
        description: "Please enter announcement text before submitting.",
      });
      return;
    }

    setIsPostingAnnouncement(true);
    try {
      const firstLine = text.split("\n")[0];
      const title =
        firstLine.length > 60 ? firstLine.slice(0, 57) + "..." : firstLine;
      const { data } = await api.post("/admin/announcements", {
        title,
        content: text,
        type: "General",
      });
      toast.success("Announcement Published", {
        description: "Notice posted to community bulletin board.",
      });
      const created = data.announcement || data;
      setCurrentAnnouncement(created);
      setAnnouncementText("");
      setShowAnnouncementModal(false);
    } catch (err) {
      console.error("Failed to post announcement:", err);
      toast.error("Publishing Failed", {
        description: "Could not post announcement to community board.",
      });
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

    // Standard consistent breaking lines for all amounts
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

  // Urgent Action items
  const urgentActions = useMemo(() => {
    const list: any[] = [];

    // Payment Verification
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

    // Tenant Applications
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

    // Overdue Accounts
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

    // Maintenance Requests
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

  // Recent Activity Items
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

        {/* Cards Skeleton */}
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
      {/* TOP HEADER & QUICK ACTIONS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-1 border-b border-slate-200/80 dark:border-zinc-800/80 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span>
              {getGreeting()}, {adminName}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-300 mt-0.5 font-medium">
            Here's what's happening with your property today.
          </p>
        </div>

        {/* Top Right Action Controls */}
        <div className="flex items-center gap-3.5 flex-wrap sm:flex-nowrap">
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

          {/* ENTER ANNOUNCEMENT POPUP CARD */}
          <AnimatePresence>
            {showAnnouncementModal && (
              <div
                className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
                onClick={(e) => {
                  if (e.target === e.currentTarget)
                    setShowAnnouncementModal(false);
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

                  {/* Body */}
                  <form
                    onSubmit={handlePostAnnouncement}
                    className="p-4 sm:p-5 space-y-4"
                  >
                    {/*  Current Announcement */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                        Current Announcement:
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
                              {currentAnnouncement.content ||
                                currentAnnouncement.title}
                            </p>
                            {currentAnnouncement.created_at && (
                              <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono mt-2">
                                Posted on{" "}
                                {new Date(
                                  currentAnnouncement.created_at,
                                ).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
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

                    {/* Text box */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                        Enter Announcement:
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
                        disabled={
                          isPostingAnnouncement || !announcementText.trim()
                        }
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

          {/* Generate Report Button */}
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

      {/* KPI(Key Performance Indicators) CARDS */}
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
                {Math.abs(computedMetrics.revenueIncrease).toFixed(0)}% vs. last
                month
              </span>
            </div>
            {/* Progress Bar */}
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

        {/* Card 3: Outstanding Bills */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="show"
          className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between"
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300">
                Outstanding Bills
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

        {/* Card 4: Maintenance Requests */}
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
                  requests
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

      {/* CORE ANALYTICS, ACTION QUEUE & RECENT ACTIVITY */}
      <div
        className="grid grid-cols-1 xl:grid-cols-[var(--cashflow-col)_minmax(0,1.35fr)_minmax(0,1fr)] gap-5"
        style={{ ["--cashflow-col" as any]: "minmax(0, calc(50% + 40px))" }}
      >
        {/* Left Column: Cash Flow Overview */}
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
                    {/* dashed line across each amount on graph */}
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

              {/* 4 Stacked Right KPI Badges */}
              <div className="w-full lg:w-40 xl:w-44 shrink-0 flex flex-col justify-center gap-3 h-full min-h-[420px] sm:min-h-[460px]">
                {/* Total Billed */}
                <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center gap-2 hover:border-blue-300 dark:hover:border-blue-800/60 transition-colors shadow-2xs">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200/50 dark:border-blue-500/20">
                    <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 block leading-tight">
                      Total Due Amount
                    </span>
                    <p className="font-mono font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white mt-0.5">
                      ₱{cashflowTotals.billed.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Collected Amount */}
                <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center gap-2 hover:border-emerald-300 dark:hover:border-emerald-800/60 transition-colors shadow-2xs">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200/50 dark:border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 block leading-tight">
                      Collected Amount
                    </span>
                    <p className="font-mono font-extrabold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">
                      ₱{cashflowTotals.collected.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Overdue Amount */}
                <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center gap-2 hover:border-rose-300 dark:hover:border-rose-800/60 transition-colors shadow-2xs">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200/50 dark:border-rose-500/20">
                    <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 block leading-tight">
                      Overdue Amount
                    </span>
                    <p className="font-mono font-extrabold text-xs sm:text-sm text-rose-600 dark:text-rose-400 mt-0.5">
                      ₱{cashflowTotals.outstanding.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Collection Rate */}
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

        {/* Urgent Action Center */}
        <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col h-[580px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Urgent Action Center
              </h2>
            </div>
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

          {/* Action List */}
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
                  No urgent actions requiring attention right now.
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

        {/* Recent Activity */}
        <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col h-[580px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 shrink-0">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Recent Activity
            </h2>
            <Link
              href="/admin/settings#activity-logs"
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

      {/* FLOOR & ROOM MATRIX */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-2xs font-sans">
        {/* Header */}
        <div className="mb-5 space-y-3">
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
            Floor & Room Matrix
          </h2>

          {/* Row: 1st Searchbar, 2nd Status Dropdown, 3rd 4 Room Status Text directly beside dropdown */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {/* 1st: Searchbar */}
            <div className="relative w-52 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={matrixSearchQuery}
                onChange={(e) => setMatrixSearchQuery(e.target.value)}
                placeholder="Search room, tenant or room type..."
                className="w-full bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-900 dark:text-zinc-100 placeholder:text-slate-500 dark:placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* 2nd: Status Dropdown Menu */}
            <div className="w-36 sm:w-48">
              <DropdownSelect
                value={matrixStatusFilter}
                onChange={setMatrixStatusFilter}
                options={[
                  {
                    value: "all",
                    label: "All Status",
                    dotColor: "bg-slate-400",
                  },
                  { value: "full", label: "Full", dotColor: "bg-emerald-500" },
                  {
                    value: "occupied_with_beds",
                    label: "Occupied w/ Beds",
                    dotColor: "bg-amber-500",
                  },
                  {
                    value: "available",
                    label: "Vacant",
                    dotColor: "bg-blue-500",
                  },
                  {
                    value: "maintenance",
                    label: "Maintenance",
                    dotColor: "bg-rose-500",
                  },
                ]}
                className="w-full bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80 text-xs font-semibold text-slate-700 dark:text-zinc-200 rounded-lg px-2.5 py-1.5 hover:border-slate-300 dark:hover:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors shadow-2xs"
              />
            </div>

            {/* 3rd: The 4 Room Status Text directly beside the dropdown menu */}
            <div className="flex items-center gap-3 sm:gap-4 text-xs font-semibold text-slate-700 dark:text-zinc-200 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Full{" "}
                <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
                  {matrixMetrics.full}
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Occupied w/ Beds{" "}
                <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
                  {matrixMetrics.occupiedWithBeds}
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Vacant{" "}
                <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
                  {matrixMetrics.vacant}
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Maintenance{" "}
                <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
                  {matrixMetrics.maintenance}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Architectural Multi-Column Layout (All Floors Displayed) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {distinctMatrixFloors.map((fl) => {
            const floorRooms = matrixRoomsByFloor[fl] || [];
            const countLabel = `${floorRooms.length} ${floorRooms.length === 1 ? "room" : "rooms"}`;

            return (
              <div
                key={fl}
                className="bg-slate-50/60 dark:bg-zinc-900/40 rounded-xl p-3 border border-slate-100 dark:border-zinc-800/60 flex flex-col"
              >
                {/* Floor Header Bar */}
                <div className="flex flex-wrap items-center justify-between mb-2.5 px-0.5 gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-zinc-200">
                      {fl}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/60">
                      {countLabel}
                    </span>
                  </div>

                  {/* Floor Status Summary Badges */}
                  {(() => {
                    let fFull = 0;
                    let fWithBeds = 0;
                    let fVacant = 0;
                    let fMaint = 0;
                    floorRooms.forEach((r) => {
                      const st = getRoomEffectiveStatus(r);
                      if (st === "Full") fFull++;
                      else if (st === "OccupiedWithBeds") fWithBeds++;
                      else if (st === "Available") fVacant++;
                      else if (st === "Maintenance") fMaint++;
                    });

                    return (
                      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-[10px] font-bold">
                        {fFull > 0 && (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Full: {fFull}
                          </span>
                        )}
                        {fWithBeds > 0 && (
                          <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Occupied w/ Beds: {fWithBeds}
                          </span>
                        )}
                        {fVacant > 0 && (
                          <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            Vacant: {fVacant}
                          </span>
                        )}
                        {fMaint > 0 && (
                          <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Maint: {fMaint}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Scrollable Cards Container */}
                <div className="h-[370px] overflow-y-auto p-0.5 pr-1.5 custom-scrollbar">
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
                    {floorRooms.length > 0 ? (
                      floorRooms.map((room) => renderMatrixRoomCard(room))
                    ) : (
                      <div className="col-span-full h-[340px] flex items-center justify-center text-xs text-slate-600 dark:text-zinc-300 font-medium">
                        No units on this floor.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* QUICK VIEW POP-UP MODAL */}
        <AnimatePresence>
          {activeRoomModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0"
                onClick={() => setActiveRoomModal(null)}
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.96, opacity: 0, y: 8 }}
                className="relative w-full max-w-lg bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-10"
              >
                <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50/70 dark:bg-zinc-900/60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-mono font-bold text-sm shadow-md">
                      {activeRoomModal.room_number}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Room {activeRoomModal.room_number} Details
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-zinc-300 font-medium">
                        {normalizeFloor(
                          activeRoomModal.floor,
                          activeRoomModal.room_number,
                        )}{" "}
                        • {activeRoomModal.type} •{" "}
                        {activeRoomModal.rental_type || "Whole Room"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveRoomModal(null)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-4 sm:p-5 space-y-4">
                  <div className="grid grid-cols-3 gap-2.5 text-center">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                      <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-zinc-300">
                        Capacity
                      </span>
                      <div className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                        {activeRoomModal.current_occupants} /{" "}
                        {activeRoomModal.capacity} Beds
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                      <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-zinc-300">
                        Monthly Rent
                      </span>
                      <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                        ₱{Number(activeRoomModal.price).toLocaleString()}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                      <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-zinc-300">
                        Status
                      </span>
                      <div
                        className={`text-xs font-bold mt-1 ${
                          getRoomEffectiveStatus(activeRoomModal) === "Full"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : getRoomEffectiveStatus(activeRoomModal) ===
                                "OccupiedWithBeds"
                              ? "text-amber-600 dark:text-amber-400"
                              : getRoomEffectiveStatus(activeRoomModal) ===
                                  "Available"
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {getRoomEffectiveStatus(activeRoomModal) === "Full"
                          ? "Full"
                          : getRoomEffectiveStatus(activeRoomModal) ===
                              "OccupiedWithBeds"
                            ? `Occupied with ${getAvailableBedsCount(activeRoomModal)} ${getAvailableBedsCount(activeRoomModal) === 1 ? "available bed" : "available beds"}`
                            : getRoomEffectiveStatus(activeRoomModal) ===
                                "Available"
                              ? "Vacant"
                              : "Maintenance"}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-200 mb-2">
                      Current Residents ({activeRoomModal.tenants?.length || 0})
                    </h4>

                    {activeRoomModal.tenants &&
                    activeRoomModal.tenants.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {activeRoomModal.tenants.map((t) => (
                          <div
                            key={t.id}
                            className="p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 flex items-center justify-between gap-3"
                          >
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white">
                                {t.name}
                              </p>
                              <p className="text-[11px] text-slate-600 dark:text-zinc-300 font-medium">
                                {t.email || "No email"}{" "}
                                {t.phone
                                  ? `• ${formatPhoneNumber(t.phone)}`
                                  : ""}
                              </p>
                            </div>
                            <Link
                              href={`/admin/tenants?search=${encodeURIComponent(t.name)}`}
                              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 shrink-0"
                            >
                              <span>Profile</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-xs text-slate-600 dark:text-zinc-300 font-medium border border-dashed border-slate-200 dark:border-zinc-800 rounded-lg">
                        No tenants currently assigned to this room.
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 flex items-center justify-between">
                  <Link
                    href={
                      activeRoomModal?.room_number
                        ? `/admin/rooms?room=${encodeURIComponent(activeRoomModal.room_number)}`
                        : "/admin/rooms"
                    }
                    className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <span>View Room Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => setActiveRoomModal(null)}
                    className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Operational & Financial Report Modal */}
      <AdminReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
      />
    </div>
  );
}
