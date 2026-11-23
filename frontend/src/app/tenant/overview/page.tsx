"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  CreditCard,
  Building2,
  Bell,
  CheckCircle2,
  ArrowUpRight,
  Clock,
  Droplets,
  Zap,
  Calendar,
  AlertCircle,
  Wallet,
  TrendingUp,
} from "lucide-react";

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
          paymentMethod: tx.payment_method || "E-Wallet",
          referenceNumber:
            tx.reference_number ||
            tx.reference_number ||
            (tx.id ? `REF-${tx.id}` : "—"),
          invoiceNumber: tx.invoice_number || null,
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
      <div className="w-full h-full flex-1 flex flex-col gap-4 pb-1 font-sans text-slate-900 dark:text-slate-100 animate-pulse overflow-hidden">
        {/* Header Skeleton */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div>
            <div className="h-7 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
            <div className="h-3.5 w-80 bg-slate-200 dark:bg-slate-800 rounded-md mt-2"></div>
          </div>
          <div className="h-12 w-full sm:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"></div>
        </div>

        {/* Telemetry Ribbon Card Skeleton */}
        <div className="grid grid-cols-1 gap-3 shrink-0">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
            <div className="space-y-1.5 flex-1">
              <div className="h-2.5 w-24 bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
              <div className="h-2.5 w-20 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0"></div>
          </div>
        </div>

        {/* 3. Main Split Section Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
          {/* Statement & Recent Payments Box Skeleton */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between h-full min-h-[380px] overflow-hidden">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="space-y-1">
                <div className="h-4 w-52 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-3 w-64 bg-slate-200 dark:bg-slate-800 rounded"></div>
              </div>
              <div className="h-8 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 mt-3">
              <div className="md:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-4 space-y-3">
                <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="space-y-2 pt-2">
                  <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
                  <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
                  <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
                </div>
                <div className="h-9 w-full bg-slate-200 dark:bg-slate-800 rounded-lg mt-4"></div>
              </div>
              <div className="md:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-4 space-y-2.5">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-12 bg-slate-200/70 dark:bg-slate-800/60 rounded-lg"
                  ></div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Transactions Skeleton */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between h-full min-h-[380px] overflow-hidden">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div className="h-3.5 w-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </div>
            <div className="space-y-2.5 my-auto">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex items-center justify-between"
                >
                  <div className="space-y-1 flex-1">
                    <div className="h-3 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    <div className="h-2.5 w-20 bg-slate-200 dark:bg-slate-800 rounded"></div>
                  </div>
                  <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
                </div>
              ))}
            </div>
            <div className="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded mx-auto mt-2"></div>
          </div>
        </div>
      </div>
    );
  }

  // REAL UI RENDER
  return (
    <div className="w-full h-full flex-1 min-h-0 flex flex-col gap-3.5 font-sans text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Header Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="shrink-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Hello, {userName.split(" ")[0] || "Resident"}
            </h1>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span>
                Assigned Room:{" "}
                <strong className="font-mono font-extrabold text-indigo-900 dark:text-indigo-200">
                  {tenantData.status === "Active"
                    ? `Room ${tenantData.roomNumber}`
                    : "Pending"}
                </strong>
              </span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Track your bills, monitor utilities, and view payment history.
          </p>
        </div>

        {latestAnnouncement && (
          <div className="flex items-start gap-2.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs max-w-xl w-full lg:w-auto">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0 mt-0.5">
              <Bell className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60">
                  Announcement
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  {latestAnnouncement.title}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  &bull;{" "}
                  {new Date(latestAnnouncement.created_at).toLocaleDateString()}
                </span>
              </div>
              {latestAnnouncement.content &&
                latestAnnouncement.content.trim() !==
                  latestAnnouncement.title?.trim() && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 whitespace-pre-wrap break-words">
                    {latestAnnouncement.content}
                  </p>
                )}
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
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

      {/* 2. Single-Row Balance & Action Required Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 shrink-0 items-stretch">
        {/* Left Side: Total Outstanding Balance */}
        <div
          className={`${
            isOverdue || isDueSoon ? "lg:col-span-4" : "lg:col-span-12"
          } bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between`}
        >
          <div>
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Outstanding
            </span>
            <div
              className={`text-xl sm:text-2xl font-black font-mono mt-0.5 leading-tight ${
                tenantData.balanceDue > 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-slate-900 dark:text-slate-100"
              }`}
            >
              <AnimatedBalance value={tenantData.balanceDue} />
            </div>
            <div className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
              {tenantData.balanceDue > 0 ? (
                <span
                  className={
                    daysUntilDue < 0
                      ? "text-rose-600 dark:text-rose-400 font-bold"
                      : "text-amber-600 dark:text-amber-400 font-bold"
                  }
                >
                  {daysUntilDue < 0
                    ? `Overdue by ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? "" : "s"}`
                    : daysUntilDue === 0
                      ? "Due today"
                      : `Due in ${daysUntilDue} days`}
                </span>
              ) : (
                <span className="text-slate-500 dark:text-slate-400 font-bold">
                  Account Settled
                </span>
              )}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* Right Side: Action Required (Overdue or Due Soon) */}
        {isOverdue && (
          <div className="lg:col-span-8 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-rose-800 dark:text-rose-300">
                    Action Required &bull; Payment Overdue for
                  </span>
                  <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30">
                    {currentBill.month}
                  </span>
                </div>
                <p className="text-xs sm:text-[13px] text-rose-700 dark:text-rose-200/90 mt-0.5">
                  Your balance of{" "}
                  <strong className="font-mono font-bold text-rose-900 dark:text-rose-300">
                    ₱{Number(currentBill.remainingBalance).toLocaleString()}
                  </strong>{" "}
                  was due on {currentBill.dueDate}. Please settle your invoice
                  immediately to prevent late penalties.
                </p>
              </div>
            </div>
            <Link
              href="/tenant/bill_and_payment"
              className="px-3.5 py-2 text-xs sm:text-[13px] font-bold rounded-lg bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 text-white transition-all shrink-0 self-start sm:self-center shadow-xs flex items-center gap-1.5"
            >
              <span>Settle Overdue Bill</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {!isOverdue && isDueSoon && (
          <div className="lg:col-span-8 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center shrink-0">
                <Clock className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-amber-800 dark:text-amber-300">
                    Payment Reminder &bull; Invoice Due Soon
                  </span>
                  <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                    {currentBill.month}
                  </span>
                </div>
                <p className="text-xs sm:text-[13px] text-amber-700 dark:text-amber-200/90 mt-0.5">
                  Your statement balance of{" "}
                  <strong className="font-mono font-bold text-amber-900 dark:text-amber-300">
                    ₱{Number(currentBill.remainingBalance).toLocaleString()}
                  </strong>{" "}
                  is due on {currentBill.dueDate}. Settle early to keep your
                  account clear.
                </p>
              </div>
            </div>
            <Link
              href="/tenant/bill_and_payment"
              className="px-3.5 py-2 text-xs sm:text-[13px] font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-all shrink-0 self-start sm:self-center shadow-xs flex items-center gap-1.5"
            >
              <span>View & Pay Invoice</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* Current Billing Statement & Recent Payments + Recent Account Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 lg:grid-rows-1 gap-4 flex-1 h-full min-h-[540px] items-stretch">
        {/* Current Billing Statement & Recent Payments */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between h-full min-h-[540px] overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CreditCard className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
                <span>Current Billing Statement &amp; Recent Payments</span>
              </h2>
              <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
                View your monthly rent, utility charges, and payment history.
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 text-xs sm:text-[13px] font-bold shrink-0 self-start sm:self-center">
              <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>
                1o122ssssswezzw21z14xc 2 Due Date:{" "}
                <span className="font-mono font-extrabold text-slate-900 dark:text-white">
                  {currentBill?.dueDate
                    ? new Date(currentBill.dueDate).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        },
                      )
                    : billDueDate.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                </span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 flex-1 h-full mt-3 min-h-0 overflow-hidden">
            {/* Left Column: Active Monthly Statement Breakdown */}
            <div className="md:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-4 flex flex-col justify-between min-h-0">
              <div>
                <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-800">
                  <div className="min-w-0">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                      Active Statement
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 truncate mt-0.5">
                      {currentBill?.hasBill
                        ? currentBill.month
                        : "Current Billing Cycle"}
                    </h3>
                    <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 block truncate mt-0.5">
                      {currentBill?.invoice_number ||
                        (currentBill?.id
                          ? `INV-${String(currentBill.id).padStart(6, "0")}`
                          : "No Pending Invoice")}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wide shrink-0 ${
                      !currentBill?.hasBill
                        ? "bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        : currentBill.remainingBalance <= 0 ||
                            currentBill.status === "Paid"
                          ? "bg-teal-50 dark:bg-teal-500/15 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-500/30"
                          : isOverdue
                            ? "bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30"
                            : "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30"
                    }`}
                  >
                    {!currentBill?.hasBill
                      ? "No Bill"
                      : currentBill.remainingBalance <= 0
                        ? "Paid"
                        : currentBill.status || "Active"}
                  </span>
                </div>

                {/* Itemized Charges */}
                <div className="py-3 space-y-2 text-[13px] sm:text-sm">
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                      <span>Room Rent</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      ₱
                      {Number(
                        currentBill?.breakdown?.rent || 0,
                      ).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                      <span>Water Bill</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      ₱
                      {Number(
                        currentBill?.hasBill
                          ? (currentBill?.breakdown?.water ?? 300)
                          : 300,
                      ).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                      <span>Electricity Bill</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      ₱
                      {Number(
                        currentBill?.hasBill
                          ? (currentBill?.breakdown?.electricity ?? 500)
                          : 500,
                      ).toLocaleString()}
                    </span>
                  </div>

                  {(currentBill?.additionalCharges &&
                  currentBill.additionalCharges.length > 0
                    ? currentBill.additionalCharges
                    : (currentBill?.breakdown?.other || 0) > 0
                      ? [
                          {
                            label:
                              currentBill?.notes &&
                              currentBill.notes !== "Auto-generated bill"
                                ? currentBill.notes
                                : "Additional Charge",
                            amount: currentBill.breakdown.other,
                          },
                        ]
                      : []
                  ).map(
                    (
                      charge: { label: string; amount: number },
                      idx: number,
                    ) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-0.5"
                      >
                        <span className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-2 min-w-0 pr-2">
                          <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
                          <span className="truncate">{charge.label}</span>
                        </span>
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100 shrink-0">
                          ₱{Number(charge.amount || 0).toLocaleString()}
                        </span>
                      </div>
                    ),
                  )}

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="font-extrabold text-sm sm:text-[15px] text-slate-800 dark:text-slate-200">
                      Total Statement
                    </span>
                    <span className="font-mono font-black text-base sm:text-lg text-slate-900 dark:text-slate-100">
                      ₱{Number(currentBill?.totalAmount || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-teal-600 dark:text-teal-400 font-semibold text-[13px] sm:text-sm">
                    <span>Amount Paid</span>
                    <span className="font-mono font-bold">
                      ₱{Number(currentBill?.amountPaid || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Balance & Quick Action */}
              <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                      Balance
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Due: {currentBill?.dueDate || "5th of month"}
                    </span>
                  </div>
                  <span
                    className={`text-xl sm:text-2xl font-black font-mono ${
                      Number(
                        currentBill?.remainingBalance ?? tenantData.balanceDue,
                      ) > 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-teal-600 dark:text-teal-400"
                    }`}
                  >
                    ₱
                    {Number(
                      currentBill?.remainingBalance ??
                        tenantData.balanceDue ??
                        0,
                    ).toLocaleString()}
                  </span>
                </div>

                <Link
                  href="/tenant/bill_and_payment"
                  className={`w-full py-2 px-3 rounded-lg text-[13px] sm:text-sm font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                    Number(
                      currentBill?.remainingBalance ?? tenantData.balanceDue,
                    ) > 0
                      ? "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-200/80 hover:bg-slate-300/70 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200"
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>
                    {Number(
                      currentBill?.remainingBalance ?? tenantData.balanceDue,
                    ) > 0
                      ? "Pay using E-Wallet"
                      : "View Billing Statement"}
                  </span>
                </Link>
              </div>
            </div>

            {/* Right Column: Recent Payment Transactions */}
            <div className="md:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 p-3.5 flex flex-col min-h-0 overflow-hidden">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    Payment Transactions
                  </span>
                </div>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {tenantData.recentTransactions.length} Record
                  {tenantData.recentTransactions.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="relative flex-1 mt-2 min-h-[380px]">
                <div className="absolute inset-0 overflow-y-auto custom-scrollbar space-y-2 pr-1.5">
                  {tenantData.recentTransactions &&
                  tenantData.recentTransactions.length > 0 ? (
                    tenantData.recentTransactions.map(
                      (tx: any, idx: number) => (
                        <div
                          key={tx.id || idx}
                          className="p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 flex items-center justify-between gap-2.5 shadow-2xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                {tx.description}
                              </p>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-500/30">
                                {tx.paymentMethod || "E-Wallet"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              <span>{tx.referenceNumber}</span>
                              <span>&bull;</span>
                              <span>{tx.date}</span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="text-sm sm:text-base font-black font-mono text-slate-900 dark:text-slate-100">
                              ₱{Number(tx.amount || 0).toLocaleString()}
                            </p>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-teal-600 dark:text-teal-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 dark:bg-teal-400"></span>
                              {tx.status || "Paid"}
                            </span>
                          </div>
                        </div>
                      ),
                    )
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-500 dark:text-slate-400">
                      <Wallet className="w-8 h-8 opacity-35 mb-2" />
                      <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                        No payment transactions recorded yet
                      </p>
                      <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                        Once you settle a monthly statement via QR Ph or cash at
                        the admin office, your official receipts will appear
                        here.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Account Activity */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between h-full min-h-[540px] overflow-hidden">
          <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Clock className="w-4.5 h-4.5 text-slate-500 dark:text-slate-400" />
                <span>Recent Activity</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tracks data changes in your account
              </p>
            </div>
          </div>

          <div className="relative flex-1 my-2 min-h-[380px]">
            <div className="absolute inset-0 overflow-y-auto custom-scrollbar space-y-2 pr-1.5">
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
                      className="p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-950/60 flex items-start justify-between gap-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              isPositive
                                ? "bg-teal-500 dark:bg-teal-400"
                                : isWarning
                                  ? "bg-amber-500 dark:bg-amber-400"
                                  : isDanger
                                    ? "bg-rose-500"
                                    : "bg-slate-400"
                            }`}
                          ></span>
                          <p className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-slate-200 leading-snug">
                            {act.title}
                          </p>
                        </div>
                        {act.detail && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 pl-3 leading-snug break-words">
                            {act.detail}
                          </p>
                        )}
                        <p className="text-[11px] text-slate-500 dark:text-slate-500 font-mono mt-1 pl-3">
                          {act.date}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                          {act.category}
                        </p>
                        <span
                          className={`text-[10px] font-bold uppercase ${
                            isPositive
                              ? "text-teal-600 dark:text-teal-400"
                              : isWarning
                                ? "text-amber-600 dark:text-amber-400"
                                : isDanger
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {act.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-500 dark:text-slate-400">
                  <Clock className="w-8 h-8 opacity-40 mb-2" />
                  <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                    No recent account activity recorded
                  </p>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Account changes, billings, payments, and tickets will
                    display here
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end items-center text-xs text-slate-500 dark:text-slate-400 shrink-0">
            <span className="text-slate-600 dark:text-slate-300 font-sans font-semibold">
              Account Activity Log
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
