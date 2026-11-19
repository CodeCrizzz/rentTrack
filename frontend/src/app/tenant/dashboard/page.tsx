"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  CreditCard,
  Building2,
  Bell,
  CheckCircle2,
  ArrowUpRight,
  Clock,
  Droplets,
  Zap,
  ShieldCheck,
  Calendar,
  AlertCircle,
  Wrench,
  ChevronRight,
  Wallet,
  TrendingUp,
  BedDouble,
} from "lucide-react";
import { toast } from "sonner";

function AnimatedBalance({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (value > 0) {
      let start = 0;
      const end = value;
      const duration = 800;
      const increment = end / (duration / 16);

      const timer = setInterval(() => {
        start += increment;
        if (start >= end) {
          setDisplayValue(end);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(start));
        }
      }, 16);
      return () => clearInterval(timer);
    } else {
      setDisplayValue(0);
    }
  }, [value]);

  return <>₱{displayValue.toLocaleString()}</>;
}

export default function TenantDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [userName, setUserName] = useState("Resident");
  const [selectedYear, setSelectedYear] = useState<"This Year" | "Last Year">(
    "This Year",
  );
  const [currentBill, setCurrentBill] = useState<any>(null);

  const [tenantData, setTenantData] = useState<{
    balanceDue: number;
    recentTransactions: any[];
    recentActivities: any[];
    status: string;
    roomNumber: string | null;
    unreadCount: number;
    announcements: any[];
  }>({
    balanceDue: 0,
    recentTransactions: [],
    recentActivities: [],
    status: "Pending",
    roomNumber: null,
    unreadCount: 0,
    announcements: [],
  });

  const utilityData =
    selectedYear === "This Year"
      ? [
          { month: "Jan", water: 110, electricity: 280 },
          { month: "Feb", water: 100, electricity: 250 },
          { month: "Mar", water: 120, electricity: 310 },
          { month: "Apr", water: 130, electricity: 410 },
          { month: "May", water: 150, electricity: 480 },
          { month: "Jun", water: 125, electricity: 440 },
          { month: "Jul", water: 135, electricity: 455 },
          { month: "Aug", water: 145, electricity: 500 },
          { month: "Sep", water: 140, electricity: 490 },
          { month: "Oct", water: 130, electricity: 465 },
          { month: "Nov", water: 120, electricity: 430 },
          { month: "Dec", water: 115, electricity: 410 },
        ]
      : [
          { month: "Jan", water: 100, electricity: 250 },
          { month: "Feb", water: 105, electricity: 265 },
          { month: "Mar", water: 110, electricity: 300 },
          { month: "Apr", water: 115, electricity: 375 },
          { month: "May", water: 120, electricity: 450 },
          { month: "Jun", water: 118, electricity: 440 },
          { month: "Jul", water: 122, electricity: 460 },
          { month: "Aug", water: 125, electricity: 475 },
          { month: "Sep", water: 122, electricity: 450 },
          { month: "Oct", water: 120, electricity: 425 },
          { month: "Nov", water: 112, electricity: 375 },
          { month: "Dec", water: 110, electricity: 350 },
        ];

  const fetchDashboardData = async () => {
    try {
      const [dashboardRes, unreadRes, announcementsRes, currentBillRes] =
        await Promise.all([
          api.get("/tenant/dashboard"),
          api
            .get("/tenant/chat/unread")
            .catch(() => ({ data: { unreadCount: 0 } })),
          api.get("/tenant/announcements").catch(() => ({ data: [] })),
          api.get("/tenant/bill/current").catch(() => ({ data: null })),
        ]);
      const { data } = dashboardRes;
      if (currentBillRes?.data) {
        setCurrentBill(currentBillRes.data);
      }
      setTenantData({
        balanceDue: parseFloat(data.balanceDue) || 0,
        status: data.status || "Pending",
        roomNumber: data.roomNumber,
        recentTransactions: (data.recentTransactions || []).map((tx: any) => ({
          id: tx.id,
          type: tx.amount_paid ? "payment" : "charge",
          description: tx.billing_month
            ? `${tx.billing_month} Statement`
            : tx.description || "Payment Received",
          date:
            tx.payment_date || tx.created_at
              ? new Date(tx.payment_date || tx.created_at).toLocaleDateString()
              : "N/A",
          amount: parseFloat(tx.amount_paid || tx.total_amount || 0),
          status:
            tx.status === "Verified" || tx.status === "Approved"
              ? "Paid"
              : tx.status || "Paid",
        })),
        recentActivities: (data.recentActivities || []).map((act: any) => ({
          id: act.id,
          title: act.title || "Account Update",
          detail: act.detail || "",
          category: act.category || "Account",
          status:
            act.status === "Verified" || act.status === "Approved"
              ? "Paid"
              : act.status || "Updated",
          date: act.date ? new Date(act.date).toLocaleDateString() : "N/A",
        })),
        unreadCount: unreadRes.data?.unreadCount || 0,
        announcements: announcementsRes.data || [],
      });
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          const parsed = JSON.parse(userStr);
          if (parsed.name) setUserName(parsed.name);
        } catch (e) {}
      }
    }
    fetchDashboardData();

    const handleRefresh = () => {
      fetchDashboardData();
    };
    window.addEventListener("renttrack-refresh-data", handleRefresh);
    window.addEventListener("renttrack_refresh_all", handleRefresh);
    return () => {
      window.removeEventListener("renttrack-refresh-data", handleRefresh);
      window.removeEventListener("renttrack_refresh_all", handleRefresh);
    };
  }, []);

  const today = new Date();
  const billDueDate = currentBill?.dueDate
    ? new Date(currentBill.dueDate)
    : new Date(today.getFullYear(), today.getMonth() + 1, 5);
  const daysUntilDue = Math.ceil(
    (billDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  const isOverdue =
    currentBill &&
    currentBill.remainingBalance > 0 &&
    (currentBill.status === "Overdue" || daysUntilDue < 0);
  const isDueSoon =
    currentBill &&
    currentBill.remainingBalance > 0 &&
    !isOverdue &&
    daysUntilDue <= 3;

  const totalPaidThisYear = (tenantData.recentTransactions || [])
    .filter(
      (tx: any) =>
        tx.type === "payment" &&
        (tx.status === "Paid" || tx.status === "Approved"),
    )
    .reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0);

  const latestAnnouncement =
    tenantData.announcements && tenantData.announcements.length > 0
      ? tenantData.announcements[0]
      : null;

  // 1:1 SKELETON LOADER
  if (isLoading || !isMounted) {
    return (
      <div className="w-full h-full flex-1 flex flex-col gap-4 pb-1 font-sans text-slate-100 animate-pulse overflow-hidden">
        {/* Header Skeleton */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800 shrink-0">
          <div>
            <div className="h-7 w-64 bg-slate-800 rounded-lg"></div>
            <div className="h-3.5 w-80 bg-slate-800 rounded-md mt-2"></div>
          </div>
          <div className="h-12 w-full sm:w-80 bg-slate-900 border border-slate-800 rounded-xl"></div>
        </div>

        {/* Telemetry Ribbon Cards Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between"
            >
              <div className="space-y-1.5 flex-1">
                <div className="h-2.5 w-24 bg-slate-800 rounded"></div>
                <div className="h-6 w-32 bg-slate-800 rounded-md"></div>
                <div className="h-2.5 w-20 bg-slate-800 rounded"></div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-800 shrink-0"></div>
            </div>
          ))}
        </div>

        {/* 3. Main Split Section Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
          {/* Chart Box Skeleton */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between h-full min-h-[380px] overflow-hidden">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div className="space-y-1">
                <div className="h-4 w-40 bg-slate-800 rounded"></div>
                <div className="h-3 w-56 bg-slate-800 rounded"></div>
              </div>
              <div className="h-7 w-28 bg-slate-800 rounded-lg"></div>
            </div>
            <div className="flex-1 my-4 flex items-end gap-3 px-2">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="flex-1 bg-slate-800/60 rounded-t-lg"
                  style={{ height: `${25 + ((i * 11) % 65)}%` }}
                ></div>
              ))}
            </div>
            <div className="flex justify-center gap-6 pt-2 border-t border-slate-800">
              <div className="h-3 w-24 bg-slate-800 rounded"></div>
              <div className="h-3 w-24 bg-slate-800 rounded"></div>
            </div>
          </div>

          {/* Recent Transactions Skeleton */}
          <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between h-full min-h-[380px] overflow-hidden">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div className="h-4 w-36 bg-slate-800 rounded"></div>
              <div className="h-3.5 w-16 bg-slate-800 rounded"></div>
            </div>
            <div className="space-y-2.5 my-auto">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-lg border border-slate-800 bg-slate-950/40 flex items-center justify-between"
                >
                  <div className="space-y-1 flex-1">
                    <div className="h-3 w-32 bg-slate-800 rounded"></div>
                    <div className="h-2.5 w-20 bg-slate-800 rounded"></div>
                  </div>
                  <div className="h-4 w-16 bg-slate-800 rounded"></div>
                </div>
              ))}
            </div>
            <div className="h-3 w-28 bg-slate-800 rounded mx-auto mt-2"></div>
          </div>
        </div>
      </div>
    );
  }

  // REAL UI RENDER
  return (
    <div className="w-full h-full flex-1 flex flex-col gap-4 pb-1 font-sans text-slate-100 overflow-hidden">
      {/* Header Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800 shrink-0">
        <div className="shrink-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
              Welcome back, {userName.split(" ")[0] || "Resident"}
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Track your bills, monitor utilities, and view payment history.
          </p>
        </div>

        {latestAnnouncement && (
          <div className="flex items-start gap-2.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 shadow-xs max-w-xl w-full lg:w-auto">
            <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center shrink-0 mt-0.5">
              <Bell className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700/60">
                  Announcement
                </span>
                <span className="text-xs font-extrabold text-slate-100">
                  {latestAnnouncement.title}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  &bull;{" "}
                  {new Date(latestAnnouncement.created_at).toLocaleDateString()}
                </span>
              </div>
              {latestAnnouncement.content &&
                latestAnnouncement.content.trim() !==
                  latestAnnouncement.title?.trim() && (
                  <p className="text-[11px] text-slate-300 mt-0.5 whitespace-pre-wrap break-words">
                    {latestAnnouncement.content}
                  </p>
                )}
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                Issued by:{" "}
                {latestAnnouncement.created_by_name &&
                !latestAnnouncement.created_by_name
                  .toLowerCase()
                  .includes("master")
                  ? latestAnnouncement.created_by_name
                  : "Administrator"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Notification Alert Banner: Payment Overdue or Due Soon */}
      {isOverdue && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-rose-300">
                  Action Required &bull; Payment Overdue for
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {currentBill.month}
                </span>
              </div>
              <p className="text-xs text-rose-200/90 mt-0.5">
                Your balance of{" "}
                <strong className="font-mono font-bold text-rose-300">
                  ₱{Number(currentBill.remainingBalance).toLocaleString()}
                </strong>{" "}
                was due on {currentBill.dueDate}. Please settle your invoice
                immediately to prevent late penalties.
              </p>
            </div>
          </div>
          <Link
            href="/tenant/payments"
            className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-rose-500 hover:bg-rose-600 text-white transition-all shrink-0 self-start sm:self-center shadow-xs flex items-center gap-1.5"
          >
            <span>Settle Overdue Bill</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {!isOverdue && isDueSoon && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-300">
                  Payment Reminder &bull; Invoice Due Soon
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {currentBill.month}
                </span>
              </div>
              <p className="text-xs text-amber-200/90 mt-0.5">
                Your statement balance of{" "}
                <strong className="font-mono font-bold text-amber-300">
                  ₱{Number(currentBill.remainingBalance).toLocaleString()}
                </strong>{" "}
                is due on {currentBill.dueDate}. Settle early to keep your
                account clear.
              </p>
            </div>
          </div>
          <Link
            href="/tenant/payments"
            className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-all shrink-0 self-start sm:self-center shadow-xs flex items-center gap-1.5"
          >
            <span>View & Pay Invoice</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* 2. Resident Telemetry Ribbon (4 Cards in slate-900 surface with slate-400 secondary text) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        {/* Tile 1: Outstanding Balance */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Outstanding
            </span>
            <div
              className={`text-xl font-black font-mono mt-0.5 leading-tight ${
                tenantData.balanceDue > 0 ? "text-rose-400" : "text-slate-100"
              }`}
            >
              <AnimatedBalance value={tenantData.balanceDue} />
            </div>
            <div className="text-[10px] font-semibold text-slate-400 mt-0.5 flex items-center gap-1">
              {tenantData.balanceDue > 0 ? (
                <span className="text-amber-400 font-bold">
                  Due in {daysUntilDue} days
                </span>
              ) : (
                <span className="text-slate-400 font-bold">
                  Account Settled
                </span>
              )}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* Tile 2: Total Paid This Year */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Paid YTD
            </span>
            <div className="text-xl font-black font-mono text-slate-100 mt-0.5 leading-tight">
              ₱{totalPaidThisYear.toLocaleString()}
            </div>
            <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
              Verified on ledger
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Tile 3: Assigned Suite / Bed Space */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Assigned Suite
            </span>
            <div className="text-xl font-black font-mono text-slate-100 mt-0.5 leading-tight">
              {tenantData.status === "Active"
                ? `Room ${tenantData.roomNumber}`
                : "Pending"}
            </div>
            <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
              {tenantData.status === "Active"
                ? "Active occupancy"
                : "Awaiting room selection"}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        {/* Tile 4: Notice Board */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Notice Board
            </span>
            <div className="text-xl font-black font-mono text-slate-100 mt-0.5 leading-tight">
              {tenantData.announcements.length} Bulletin
              {tenantData.announcements.length !== 1 ? "s" : ""}
            </div>
            <div className="text-[10px] font-semibold text-slate-400 mt-0.5 truncate max-w-[150px]">
              {latestAnnouncement
                ? latestAnnouncement.title
                : "No active alerts"}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Utility Consumption Chart & Recent Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
        {/* Utility Consumption Breakdown Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between h-full min-h-[390px] overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Submeter Utility Breakdown</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Monthly Electricity and Water expenses.
              </p>
            </div>

            {/* Year Selector Pill */}
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs font-semibold shrink-0">
              <button
                onClick={() => setSelectedYear("This Year")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  selectedYear === "This Year"
                    ? "bg-slate-800 text-slate-100 font-bold shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                This Year
              </button>
              <button
                onClick={() => setSelectedYear("Last Year")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  selectedYear === "Last Year"
                    ? "bg-slate-800 text-slate-100 font-bold shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Last Year
              </button>
            </div>
          </div>

          <div className="flex-1 my-3 relative min-h-0">
            <div className="absolute inset-0">
              <ChartContainer
                config={{
                  water: { label: "Water Tariff", color: "#38BDF8" },
                  electricity: {
                    label: "Electricity Submeter",
                    color: "#F59E0B",
                  },
                }}
                className="h-full w-full"
              >
                <BarChart
                  data={utilityData}
                  margin={{ top: 12, right: 10, left: 4, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#1e293b"
                  />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-[10px] font-bold fill-slate-400"
                  />
                  <YAxis
                    width={50}
                    domain={[0, 500]}
                    ticks={[0, 100, 200, 300, 400, 500]}
                    interval={0}
                    tickFormatter={(val) => `₱${val}`}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={5}
                    className="text-[10px] font-bold fill-slate-400"
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="electricity"
                    fill="#F59E0B"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                  <Bar
                    dataKey="water"
                    fill="#38BDF8"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                </BarChart>
              </ChartContainer>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span>
                <span className="text-[11px] font-bold text-slate-300">
                  Electricity Submeter
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8]"></span>
                <span className="text-[11px] font-bold text-slate-300">
                  Water Tariff
                </span>
              </div>
            </div>

            <span className="text-[11px] font-mono font-semibold text-slate-400 hidden sm:inline">
              Avg. ₱
              {(
                utilityData.reduce(
                  (acc, d) => acc + d.water + d.electricity,
                  0,
                ) / utilityData.length
              ).toFixed(0)}
              /mo
            </span>
          </div>
        </div>

        {/* Recent Account Activity (slate-900 surface with slate-400 secondary text) */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between h-full min-h-[390px] overflow-hidden">
          <div className="flex justify-between items-center pb-3 border-b border-slate-800 shrink-0">
            <div>
              <h2 className="text-sm font-extrabold text-slate-100 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Recent Activity</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Tracks data changes in your account
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar my-2 space-y-2 min-h-0">
            {tenantData.recentActivities &&
            tenantData.recentActivities.length > 0 ? (
              tenantData.recentActivities.map((act: any, i) => {
                const isPositive =
                  act.status === "Paid" ||
                  act.status === "Updated" ||
                  act.status === "Active" ||
                  act.status === "Resolved";
                const isWarning =
                  act.status === "Pending" ||
                  act.status === "In Progress" ||
                  act.status === "Partial";
                const isDanger =
                  act.status === "Overdue" || act.status === "Unpaid";

                return (
                  <div
                    key={act.id || i}
                    className="p-2.5 rounded-lg border border-slate-800/80 bg-slate-950/60 flex items-start justify-between gap-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isPositive
                              ? "bg-teal-400"
                              : isWarning
                                ? "bg-amber-400"
                                : isDanger
                                  ? "bg-rose-500"
                                  : "bg-slate-400"
                          }`}
                        ></span>
                        <p className="text-xs font-bold text-slate-200 leading-snug">
                          {act.title}
                        </p>
                      </div>
                      {act.detail && (
                        <p className="text-[11px] text-slate-400 mt-0.5 pl-3 leading-snug break-words">
                          {act.detail}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-500 font-mono mt-1 pl-3">
                        {act.date}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                        {act.category}
                      </p>
                      <span
                        className={`text-[9px] font-bold uppercase ${
                          isPositive
                            ? "text-teal-400"
                            : isWarning
                              ? "text-amber-400"
                              : isDanger
                                ? "text-rose-400"
                                : "text-slate-400"
                        }`}
                      >
                        {act.status}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400">
                <Clock className="w-8 h-8 opacity-40 mb-2" />
                <p className="text-xs font-semibold">
                  No recent account activity recorded
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Account changes, billings, payments, and tickets will display
                  here
                </p>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-800 flex justify-end items-center text-[11px] text-slate-400 shrink-0">
            <span className="text-slate-300 font-sans font-semibold">
              Account Activity Log
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
