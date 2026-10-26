"use client";
import { useEffect, useState, useMemo, useRef, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import CustomSelect from "@/components/dropdown-select";
import AdminReportModal from "@/components/admin-report-modal";
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Receipt,
  CreditCard,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Plus,
  RefreshCw,
  Eye,
  Edit,
  Calendar,
  ArrowUpRight,
  Building2,
  User,
  Check,
  X,
  Printer,
  Zap,
  Droplets,
  Home,
  Layers,
  ShieldCheck,
  TrendingUp,
  ExternalLink,
  Wallet,
  BarChart3,
  FileText,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

export interface Bill {
  id: number;
  tenant_id: number;
  tenant_name: string;
  room_id: number | null;
  room_number: string | null;
  billing_month: string;
  due_date: string;
  rent_amount: number;
  water_charges: number;
  electricity_charges: number;
  other_fees: number;
  total_amount: number;
  amount_paid: number;
  balance: number;
  status: string;
  notes: string | null;
  invoice_number?: string;
  created_at?: string;
  payments?: any[];
}

export interface BillFormData {
  tenant_id: number | "";
  room_id: number | "";
  billing_month: string;
  due_date: string;
  rent_amount: number;
  water_charges: number;
  electricity_charges: number;
  other_fees: number;
  notes: string;
}

export interface PaymentFormData {
  amount_paid: number | "";
  payment_date: string;
  payment_method: string;
  notes: string;
}

interface Tenant {
  id: number;
  name: string;
  room_id: number | null;
  room_number?: string;
}

interface Room {
  id: number;
  room_number: string;
  price: number;
}

interface PendingPayment {
  id: number;
  bill_id: number;
  amount_paid: string;
  payment_date: string;
  payment_method: string;
  notes: string;
  reference_number?: string;
  referenceNumber?: string;
  receipt_url: string;
  status: string;
  billing_month: string;
  bill_total: string;
  bill_balance: string;
  tenant_name: string;
  room_number: string;
}

interface DetailedBill extends Bill {
  tenant_email?: string;
  tenant_phone?: string;
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
};

const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-slate-200 dark:border-zinc-800 shadow-xl rounded-xl p-3 text-xs font-semibold text-slate-800 dark:text-white min-w-44">
        <p className="mb-2 text-slate-900 dark:text-slate-100 font-bold text-xs border-b border-slate-100 dark:border-zinc-800 pb-1.5">
          {label}
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
                  ₱{Number(entry.value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

function BillingContent() {
  const searchParams = useSearchParams();
  const [bills, setBills] = useState<Bill[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [allPayments, setAllPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"invoices" | "payments">(
    "invoices",
  );

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "All Invoices" | "Verification" | "Overdue" | "Partial" | "Unpaid" | "All" | "Pending Verification"
  >("All Invoices");
  const [monthFilter, setMonthFilter] = useState("All");
  const [roomFilter, setRoomFilter] = useState("All Rooms");
  const [sortFilter, setSortFilter] = useState("Newest First");

  // Deep Linking Highlight State
  const [highlightedBillId, setHighlightedBillId] = useState<number | null>(
    null,
  );
  const [highlightedTenant, setHighlightedTenant] = useState<string | null>(
    null,
  );
  const hasAutoScrolledRef = useRef(false);

  // Handle incoming URL search parameters (e.g. from Action Center deep links)
  useEffect(() => {
    if (!searchParams) return;
    const tenantParam =
      searchParams.get("tenant") || searchParams.get("search");
    const billIdParam = searchParams.get("billId");
    const statusParam = searchParams.get("status");
    const tabParam = searchParams.get("tab");
    const isHighlight = searchParams.get("highlight") === "true";

    // When deep linking to a specific item, do not filter out other bills so the full list remains visible
    if (tenantParam) {
      setHighlightedTenant(tenantParam);
      // Only set searchQuery if NOT highlighting a specific tenant
      if (!isHighlight && !billIdParam) {
        setSearchQuery(tenantParam);
      }
    }
    if (billIdParam) {
      setHighlightedBillId(Number(billIdParam));
    }

    if (statusParam) {
      if (statusParam === "Pending Verification" || statusParam === "Verification") {
        setStatusFilter("Verification");
      } else if (statusParam === "All" || statusParam === "All Invoices") {
        setStatusFilter("All Invoices");
      } else if (["Overdue", "Partial", "Unpaid"].includes(statusParam)) {
        setStatusFilter(statusParam as any);
      }
    }
    if (tabParam === "payments" || tabParam === "invoices") {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Smoothly scroll to the targeted bill row or card ONCE on initial load
  useEffect(() => {
    if (hasAutoScrolledRef.current) return;
    if (!highlightedBillId && !highlightedTenant) return;
    if (bills.length === 0) return;

    const timer = setTimeout(() => {
      let el: HTMLElement | null = null;
      if (highlightedBillId) {
        el = document.getElementById(`bill-row-${highlightedBillId}`);
      }
      if (!el && highlightedTenant) {
        const matched = bills.find((b) =>
          b.tenant_name
            ?.toLowerCase()
            .includes(highlightedTenant.toLowerCase()),
        );
        if (matched) {
          el = document.getElementById(`bill-row-${matched.id}`);
          if (!highlightedBillId) setHighlightedBillId(matched.id);
        }
      }
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        hasAutoScrolledRef.current = true;
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [highlightedBillId, highlightedTenant, bills]);

  // Automatically target and open verification modal if requested via URL
  useEffect(() => {
    if (!searchParams || pendingPayments.length === 0) return;
    const shouldVerify = searchParams.get("verify") === "true";
    const billIdParam = searchParams.get("billId");
    const tenantParam =
      searchParams.get("tenant") || searchParams.get("search");

    if (shouldVerify || billIdParam) {
      let matchIdx = -1;
      if (billIdParam) {
        matchIdx = pendingPayments.findIndex(
          (p) => p.bill_id === Number(billIdParam),
        );
      }
      if (matchIdx === -1 && tenantParam) {
        matchIdx = pendingPayments.findIndex((p) =>
          p.tenant_name.toLowerCase().includes(tenantParam.toLowerCase()),
        );
      }

      if (matchIdx !== -1) {
        setCurrentVerifyIndex(matchIdx);
        setIsVerifyModalOpen(true);
      } else if (shouldVerify && pendingPayments.length > 0) {
        setCurrentVerifyIndex(0);
        setIsVerifyModalOpen(true);
      }
    }
  }, [searchParams, pendingPayments]);

  // Modals
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isGenerateConfirmOpen, setIsGenerateConfirmOpen] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Quick Action & Filter Controls (Matching Mockup UI)
  const [quickActionPeriod, setQuickActionPeriod] = useState("This Month");
  const [chartPeriod, setChartPeriod] = useState<
    "This Month" | "Last Month" | "This Year" | "Last Year"
  >("This Year");
  const [cashflowMap, setCashflowMap] = useState<Record<string, any[]>>({});
  const [activeTableTab, setActiveTableTab] = useState<
    "all" | "unpaid" | "overdue" | "pending" | "paid"
  >("all");
  const [tableSearchQuery, setTableSearchQuery] = useState("");
  const [tableFloorFilter, setTableFloorFilter] = useState("All Floors");
  const [tableRoomTypeFilter, setTableRoomTypeFilter] = useState("All Room Types");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<number[]>([]);
  const [activeMenuBillId, setActiveMenuBillId] = useState<number | null>(null);
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState<number | null>(null);
  const [sortField, setSortField] = useState<
    "period" | "amount" | "status" | "due_date" | "none"
  >("none");
  const [sortAsc, setSortAsc] = useState(true);

  // Selected items & forms
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [billDetails, setBillDetails] = useState<DetailedBill | null>(null);
  const [currentVerifyIndex, setCurrentVerifyIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialBillForm: BillFormData = {
    tenant_id: "",
    room_id: "",
    billing_month: "",
    due_date: new Date().toISOString().split("T")[0],
    rent_amount: 0,
    water_charges: 0,
    electricity_charges: 0,
    other_fees: 0,
    notes: "",
  };
  const [billForm, setBillForm] = useState<BillFormData>(initialBillForm);

  const initialPaymentForm: PaymentFormData = {
    amount_paid: "",
    payment_date: new Date().toISOString().split("T")[0],
    payment_method: "Cash",
    notes: "",
  };
  const [paymentForm, setPaymentForm] =
    useState<PaymentFormData>(initialPaymentForm);

  // --- DATA FETCHING ---
  const fetchCashFlowForPeriod = useCallback(async (period: string) => {
    try {
      const rangeMap: Record<string, string> = {
        "This Month": "this_month",
        "Last Month": "last_month",
        "This Year": "this_year",
        "Last Year": "last_year",
      };
      const rangeKey = rangeMap[period] || "this_year";
      const { data } = await api.get(`/admin/cashflow?range=${rangeKey}`);
      setCashflowMap((prev) => ({ ...prev, [period]: data || [] }));
    } catch (error) {
      console.error("Failed to fetch cash flow data:", error);
    }
  }, []);

  const fetchData = async () => {
    try {
      const [
        billsRes,
        tenantsRes,
        roomsRes,
        pendingRes,
        paymentsRes,
        thisMonthCf,
        lastMonthCf,
        thisYearCf,
        lastYearCf,
      ] = await Promise.all([
        api.get("/admin/bills"),
        api.get("/admin/tenants"),
        api.get("/admin/rooms"),
        api.get("/admin/bills/payments/pending"),
        api.get("/admin/bills/payments"),
        api.get("/admin/cashflow?range=this_month"),
        api.get("/admin/cashflow?range=last_month"),
        api.get("/admin/cashflow?range=this_year"),
        api.get("/admin/cashflow?range=last_year"),
      ]);
      setBills(billsRes.data);
      setTenants(tenantsRes.data);
      setRooms(roomsRes.data);
      setPendingPayments(pendingRes.data);
      setAllPayments(paymentsRes.data);
      setCashflowMap({
        "This Month": thisMonthCf.data || [],
        "Last Month": lastMonthCf.data || [],
        "This Year": thisYearCf.data || [],
        "Last Year": lastYearCf.data || [],
      });
    } catch (error) {
      console.error("Failed to fetch billing data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchCashFlowForPeriod(chartPeriod);
  }, [chartPeriod, fetchCashFlowForPeriod]);

  // --- MONTH OPTIONS ---
  const uniqueMonths = useMemo(() => {
    const months = Array.from(
      new Set(bills.map((b) => b.billing_month)),
    ).filter(Boolean);
    return months.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [bills]);

  const monthOptions = useMemo(() => {
    return [
      { value: "All", label: "All Months" },
      ...uniqueMonths.map((m) => ({ value: m, label: m })),
    ];
  }, [uniqueMonths]);

  // --- ROOM OPTIONS ---
  const uniqueRooms = useMemo(() => {
    const roomNumbers = Array.from(
      new Set(rooms.map((r) => r.room_number)),
    ).filter(Boolean);
    return [
      "All Rooms",
      ...roomNumbers
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
        .map((r) => `Room ${r}`),
    ];
  }, [rooms]);

  // --- METRICS COMPUTATION ---
  const metrics = useMemo(() => {
    const totalInvoiced = bills.reduce(
      (acc, b) => acc + (Number(b.total_amount) || 0),
      0,
    );
    const totalCollected = bills.reduce(
      (acc, b) => acc + (Number(b.amount_paid) || 0),
      0,
    );
    const totalBalance = bills.reduce(
      (acc, b) => acc + (Number(b.balance) || 0),
      0,
    );
    const collectionRate =
      totalInvoiced > 0
        ? Math.round((totalCollected / totalInvoiced) * 100)
        : 0;

    const overdueBills = bills.filter((b) => b.status === "Overdue");
    const overdueAmount = overdueBills.reduce(
      (acc, b) => acc + (Number(b.balance) || 0),
      0,
    );
    const overdueCount = overdueBills.length;

    const pendingVerificationCount = pendingPayments.length;
    const paidCount = bills.filter((b) => b.status === "Paid").length;
    const partialCount = bills.filter((b) => b.status === "Partial").length;
    const unpaidCount = bills.filter((b) => b.status === "Unpaid").length;

    return {
      totalInvoiced,
      totalCollected,
      totalBalance,
      collectionRate,
      overdueAmount,
      overdueCount,
      pendingVerificationCount,
      paidCount,
      partialCount,
      unpaidCount,
    };
  }, [bills, pendingPayments]);

  // --- INVOICE HELPERS (Random Collision-Proof Invoice Numbers INV-XXXXXX) ---
  const formatInvoiceNumber = (bill: Bill) => {
    if (bill.invoice_number) return bill.invoice_number;
    const hash = (bill.id * 9301 + 49297) % 233280;
    const random6 = 100000 + (hash % 900000);
    return `INV-${random6}`;
  };

  const monthNamesShort = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  const monthNamesFull = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const parseBillMonthYear = (monthStr: string | null | undefined): { monthIndex: number; year: number } | null => {
    if (!monthStr) return null;
    const str = monthStr.trim();
    const ymMatch = str.match(/^(\d{4})-(\d{1,2})/);
    if (ymMatch) {
      return { year: parseInt(ymMatch[1], 10), monthIndex: parseInt(ymMatch[2], 10) - 1 };
    }
    const yearMatch = str.match(/\d{4}/);
    const year = yearMatch ? parseInt(yearMatch[0], 10) : new Date().getFullYear();
    
    const lower = str.toLowerCase();
    for (let i = 0; i < 12; i++) {
      if (lower.includes(monthNamesFull[i].toLowerCase()) || lower.includes(monthNamesShort[i].toLowerCase())) {
        return { monthIndex: i, year };
      }
    }
    return null;
  };

  const getBillRoomDisplay = (bill: Bill) => {
    const room = rooms.find(
      (r) => r.id === bill.room_id || r.room_number === bill.room_number,
    );
    const type = (room as any)?.type || (room as any)?.rental_type || "Standard";
    return bill.room_number ? `${bill.room_number} (${type})` : "Unassigned";
  };

  // 100% Real bills from database
  const allTableBills = bills;

  // Real Top Section Metrics matching Cash Flow Overview
  const displayMetrics = useMemo(() => {
    const periodData = cashflowMap[quickActionPeriod] || [];
    let totalInvoiced = 0;
    let totalCollected = 0;
    let totalBalance = 0;

    periodData.forEach((d: any) => {
      totalInvoiced += Number(d.billed) || 0;
      totalCollected += Number(d.collected) || 0;
      totalBalance += Number(d.outstanding) || 0;
    });

    const collectionRate =
      totalInvoiced > 0
        ? Math.min(100, Math.round((totalCollected / totalInvoiced) * 100))
        : 0;
    const outstandingRate =
      totalInvoiced > 0
        ? Math.min(100, Math.round((totalBalance / totalInvoiced) * 100))
        : 0;

    // Previous month comparison from cashflowMap
    const prevMonthData = cashflowMap["Last Month"] || [];
    let prevInvoiced = 0;
    let prevCollected = 0;
    prevMonthData.forEach((d: any) => {
      prevInvoiced += Number(d.billed) || 0;
      prevCollected += Number(d.collected) || 0;
    });
    const prevCollectionRate =
      prevInvoiced > 0
        ? Math.min(100, Math.round((prevCollected / prevInvoiced) * 100))
        : 0;
    const rateDiff = collectionRate - prevCollectionRate;

    // Pending Payments from DB
    const pendingCount = pendingPayments.length;
    const pendingAmount = pendingPayments.reduce(
      (acc, p) => acc + (Number(p.amount_paid) || 0),
      0,
    );

    // Overdue Accounts from DB
    const overdueBills = bills.filter(
      (b) =>
        b.status === "Overdue" ||
        (Number(b.balance) > 0 && b.due_date && new Date(b.due_date) < new Date()),
    );
    const overdueCount = overdueBills.length;
    const overdueAmount = overdueBills.reduce(
      (acc, b) => acc + (Number(b.balance) || 0),
      0,
    );

    return {
      totalCollected,
      totalInvoiced,
      outstanding: totalBalance,
      collectionRate,
      outstandingRate,
      rateDiff,
      pendingVerificationAmount: pendingAmount,
      pendingVerificationCount: pendingCount,
      overdueAmount,
      overdueCount,
    };
  }, [cashflowMap, quickActionPeriod, pendingPayments, bills]);

  // Real Monthly Chart Data from Cash Flow API (Exact same amounts as Admin Dashboard)
  const monthlyChartData = useMemo(() => {
    const rawData = cashflowMap[chartPeriod] || [];

    if (!rawData || rawData.length === 0) {
      if (chartPeriod === "This Month") {
        const cur = new Date().toLocaleString("default", { month: "short" });
        return [{ month: cur, billed: 0, invoiced: 0, collected: 0, outstanding: 0 }];
      }
      if (chartPeriod === "Last Month") {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        const last = d.toLocaleString("default", { month: "short" });
        return [{ month: last, billed: 0, invoiced: 0, collected: 0, outstanding: 0 }];
      }
      return [
        { month: "Jan", billed: 0, invoiced: 0, collected: 0, outstanding: 0 },
        { month: "Feb", billed: 0, invoiced: 0, collected: 0, outstanding: 0 },
        { month: "Mar", billed: 0, invoiced: 0, collected: 0, outstanding: 0 },
        { month: "Apr", billed: 0, invoiced: 0, collected: 0, outstanding: 0 },
        { month: "May", billed: 0, invoiced: 0, collected: 0, outstanding: 0 },
        { month: "Jun", billed: 0, invoiced: 0, collected: 0, outstanding: 0 },
        { month: "Jul", billed: 0, invoiced: 0, collected: 0, outstanding: 0 },
        { month: "Aug", billed: 0, invoiced: 0, collected: 0, outstanding: 0 },
        { month: "Sep", billed: 0, invoiced: 0, collected: 0, outstanding: 0 },
        { month: "Oct", billed: 0, invoiced: 0, collected: 0, outstanding: 0 },
        { month: "Nov", billed: 0, invoiced: 0, collected: 0, outstanding: 0 },
        { month: "Dec", billed: 0, invoiced: 0, collected: 0, outstanding: 0 },
      ];
    }

    if (chartPeriod === "This Month") {
      const curMonth = new Date().toLocaleString("default", { month: "short" });
      const currentYear = new Date().getFullYear();
      const match = rawData.filter(
        (d) => d.month === curMonth && (!d.year || d.year === currentYear),
      );
      const target = match.length > 0 ? match[0] : rawData[rawData.length - 1];
      return [
        {
          ...target,
          month: target.month,
          billed: Number(target.billed) || 0,
          invoiced: Number(target.billed) || 0,
          collected: Number(target.collected) || 0,
          outstanding: Number(target.outstanding) || 0,
        },
      ];
    }

    if (chartPeriod === "Last Month") {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      const lastMonth = d.toLocaleString("default", { month: "short" });
      const lastYear = d.getFullYear();
      const match = rawData.filter(
        (d) => d.month === lastMonth && (!d.year || d.year === lastYear),
      );
      const target =
        match.length > 0
          ? match[0]
          : rawData.length > 1
          ? rawData[rawData.length - 2]
          : rawData[0];
      return [
        {
          ...target,
          month: target.month,
          billed: Number(target.billed) || 0,
          invoiced: Number(target.billed) || 0,
          collected: Number(target.collected) || 0,
          outstanding: Number(target.outstanding) || 0,
        },
      ];
    }

    return rawData.map((d: any) => ({
      ...d,
      month: d.month,
      billed: Number(d.billed) || 0,
      invoiced: Number(d.billed) || 0,
      collected: Number(d.collected) || 0,
      outstanding: Number(d.outstanding) || 0,
    }));
  }, [cashflowMap, chartPeriod]);

  // Consistent scale matching Dashboard Cash Flow Overview (0, 25k, 50k, 75k, 100k)
  const { chartMaxVal, chartTicks } = useMemo(() => {
    let max = 0;
    monthlyChartData.forEach((d) => {
      const b = Number(d.invoiced ?? d.billed) || 0;
      const c = Number(d.collected) || 0;
      const o = Number(d.outstanding) || 0;
      if (b > max) max = b;
      if (c > max) max = c;
      if (o > max) max = o;
    });

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
    return { chartMaxVal: maxVal, chartTicks: ticks };
  }, [monthlyChartData]);

  // Real Chart Bottom Ribbon Totals matching Cash Flow Overview
  const chartSummary = useMemo(() => {
    let totalInvoiced = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;

    monthlyChartData.forEach((d) => {
      totalInvoiced += Number(d.invoiced ?? d.billed) || 0;
      totalCollected += Number(d.collected) || 0;
      totalOutstanding += Number(d.outstanding) || 0;
    });

    const collectionRate =
      totalInvoiced > 0
        ? Math.min(100, Math.round((totalCollected / totalInvoiced) * 100))
        : 0;

    return {
      totalInvoiced,
      totalCollected,
      totalOutstanding,
      collectionRate,
    };
  }, [monthlyChartData]);

  // Real Recent Payment Activities
  const recentActivities = useMemo(() => {
    const combined = [
      ...pendingPayments.map((p) => ({
        id: `pending-${p.id}`,
        type: "pending" as const,
        title: "Payment Pending Verification",
        tenant: p.tenant_name || "Tenant",
        room: p.room_number ? `Room ${p.room_number}` : "No Room",
        amount: `₱ ${Number(p.amount_paid || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        method: p.payment_method || "Online",
        badge: "Pending",
        rawDate: p.payment_date || (p as any).created_at,
      })),
      ...allPayments.map((p) => ({
        id: `payment-${p.id}`,
        type: (p.status === "Approved" || p.status === "Verified" || p.status === "Paid"
          ? "verified"
          : "pending") as "verified" | "pending",
        title: "Payment Received",
        tenant: p.tenant_name || "Tenant",
        room: p.room_number ? `Room ${p.room_number}` : "No Room",
        amount: `₱ ${Number(p.amount_paid || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        method: p.payment_method || "Cash",
        badge: p.status || "Verified",
        rawDate: p.payment_date || (p as any).created_at,
      })),
    ];

    combined.sort((a, b) => {
      const timeA = a.rawDate ? new Date(a.rawDate).getTime() : 0;
      const timeB = b.rawDate ? new Date(b.rawDate).getTime() : 0;
      return timeB - timeA;
    });

    return combined.slice(0, 5).map((item) => {
      let formattedTime = "Recently";
      if (item.rawDate) {
        const d = new Date(item.rawDate);
        if (!isNaN(d.getTime())) {
          formattedTime = d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
        }
      }
      return {
        ...item,
        time: formattedTime,
      };
    });
  }, [allPayments, pendingPayments]);

  // Real Billing Summary & Donut Gauge Metrics strictly for Current Month
  const billingSummary = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Filter bills to current month only
    const currentMonthBills = bills.filter((b) => {
      const parsed = parseBillMonthYear(b.billing_month);
      if (parsed) {
        return parsed.monthIndex === currentMonth && parsed.year === currentYear;
      }
      if (b.due_date) {
        const d = new Date(b.due_date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }
      return false;
    });

    const currentMonthBillIds = new Set(currentMonthBills.map((b) => b.id));

    const periodData = cashflowMap["This Month"] || [];
    let totalInvoices = 0;
    let totalCollected = 0;
    let outstandingBalance = 0;

    if (
      periodData.length > 0 &&
      (Number(periodData[0]?.billed) > 0 ||
        Number(periodData[0]?.collected) > 0 ||
        Number(periodData[0]?.outstanding) > 0)
    ) {
      periodData.forEach((d: any) => {
        totalInvoices += Number(d.billed) || 0;
        totalCollected += Number(d.collected) || 0;
        outstandingBalance += Number(d.outstanding) || 0;
      });
    } else {
      currentMonthBills.forEach((b) => {
        totalInvoices += Number(b.total_amount) || 0;
        totalCollected += Number(b.amount_paid) || 0;
        outstandingBalance += Number(b.balance) || 0;
      });
    }

    // Pending verification for current month only
    const pendingAmount = pendingPayments
      .filter((p) => {
        if (p.bill_id && currentMonthBillIds.has(p.bill_id)) return true;
        const parsed = parseBillMonthYear(p.billing_month);
        if (parsed) {
          return parsed.monthIndex === currentMonth && parsed.year === currentYear;
        }
        if (p.payment_date) {
          const d = new Date(p.payment_date);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        }
        return false;
      })
      .reduce((sum, p) => sum + (Number(p.amount_paid) || 0), 0);

    // Overdue balance for current month bills only
    const overdueBalance = currentMonthBills
      .filter(
        (b) =>
          b.status === "Overdue" ||
          (Number(b.balance) > 0 && b.due_date && new Date(b.due_date) < now),
      )
      .reduce((sum, b) => sum + (Number(b.balance) || 0), 0);

    const collectionRate =
      totalInvoices > 0 ? Math.round((totalCollected / totalInvoices) * 100) : 0;
    const pendingRate =
      totalInvoices > 0 ? Math.round((pendingAmount / totalInvoices) * 100) : 0;
    const outstandingRate =
      totalInvoices > 0 ? Math.max(0, 100 - collectionRate - pendingRate) : 0;

    const circ = 226.2;
    const collectedOffset = circ - (Math.min(100, collectionRate) / 100) * circ;
    const pendingOffset = circ - (Math.min(100, pendingRate) / 100) * circ;

    return {
      totalInvoices,
      totalCollected,
      pendingVerification: pendingAmount,
      outstandingBalance,
      overdueBalance,
      collectionRate,
      pendingRate,
      outstandingRate,
      collectedOffset,
      pendingOffset,
    };
  }, [cashflowMap, bills, pendingPayments]);

  const availableRoomTypes = useMemo(() => {
    const set = new Set(rooms.map((r: any) => r.type || "Standard"));
    return [
      "All Room Types",
      "Standard",
      "Bedspace",
      "Single",
      "Deluxe",
      ...Array.from(set).filter(
        (t) => !["Standard", "Bedspace", "Single", "Deluxe"].includes(t),
      ),
    ];
  }, [rooms]);

  const availableFloors = useMemo(
    () => ["All Floors", "Floor 1", "Floor 2", "Floor 3", "Floor 4"],
    [],
  );

  const filteredTableBills = useMemo(() => {
    return allTableBills
      .filter((bill) => {
        // Tab filter
        if (
          activeTableTab === "unpaid" &&
          bill.status !== "Unpaid" &&
          bill.status !== "Partially Paid"
        ) {
          return false;
        }
        if (activeTableTab === "overdue" && bill.status !== "Overdue") {
          return false;
        }
        if (
          activeTableTab === "pending" &&
          bill.status !== "Pending Verification" &&
          bill.status !== "Verification"
        ) {
          return false;
        }
        if (activeTableTab === "paid" && bill.status !== "Paid") {
          return false;
        }

        // Floor filter
        if (tableFloorFilter !== "All Floors") {
          const floorNum = tableFloorFilter.replace("Floor ", "").trim();
          const rNum = bill.room_number?.toString() || "";
          if (!rNum.startsWith(floorNum)) return false;
        }

        // Room Type filter
        if (tableRoomTypeFilter !== "All Room Types") {
          const room = rooms.find(
            (r) => r.id === bill.room_id || r.room_number === bill.room_number,
          );
          const type =
            (room as any)?.type ||
            (bill.room_number === "203" || bill.room_number === "301"
              ? "Bedspace"
              : "Standard");
          if (type.toLowerCase() !== tableRoomTypeFilter.toLowerCase())
            return false;
        }

        // Search query (only invoice ID / number and tenant name)
        if (tableSearchQuery.trim()) {
          const q = tableSearchQuery.toLowerCase().trim();
          const invNum = formatInvoiceNumber(bill).toLowerCase();
          const matchTenant = bill.tenant_name?.toLowerCase().includes(q);
          const matchInv =
            invNum.includes(q) ||
            (bill.invoice_number ? bill.invoice_number.toLowerCase().includes(q) : false) ||
            bill.id.toString().includes(q);
          if (!matchTenant && !matchInv) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortField === "amount") {
          return sortAsc
            ? (Number(a.total_amount) || 0) - (Number(b.total_amount) || 0)
            : (Number(b.total_amount) || 0) - (Number(a.total_amount) || 0);
        }
        if (sortField === "due_date") {
          const dateA = a.due_date ? new Date(a.due_date).getTime() : 0;
          const dateB = b.due_date ? new Date(b.due_date).getTime() : 0;
          return sortAsc ? dateA - dateB : dateB - dateA;
        }
        if (sortField === "status") {
          return sortAsc
            ? a.status.localeCompare(b.status)
            : b.status.localeCompare(a.status);
        }
        if (sortField === "period") {
          return sortAsc
            ? (a.billing_month || "").localeCompare(b.billing_month || "")
            : (b.billing_month || "").localeCompare(a.billing_month || "");
        }
        return b.id - a.id;
      });
  }, [
    allTableBills,
    activeTableTab,
    tableFloorFilter,
    tableRoomTypeFilter,
    tableSearchQuery,
    sortField,
    sortAsc,
    rooms,
  ]);

  const itemsPerPage = 5;
  const totalPages = Math.max(
    1,
    Math.ceil(filteredTableBills.length / itemsPerPage),
  );
  const paginatedBills = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTableBills.slice(start, start + itemsPerPage);
  }, [filteredTableBills, currentPage]);

  const isAllSelected =
    paginatedBills.length > 0 &&
    paginatedBills.every((b) => selectedInvoiceIds.includes(b.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedInvoiceIds((prev) =>
        prev.filter((id) => !paginatedBills.some((b) => b.id === id)),
      );
    } else {
      const pageIds = paginatedBills.map((b) => b.id);
      setSelectedInvoiceIds((prev) =>
        Array.from(new Set([...prev, ...pageIds])),
      );
    }
  };

  const handleToggleSelectRow = (id: number) => {
    setSelectedInvoiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  // --- DUE INVOICES (PAID BILLS EXCLUDED AS THEY ARE DISPLAYED IN PAYMENT JOURNAL) ---
  const dueBills = useMemo(() => {
    return bills.filter((b) => b.status !== "Paid");
  }, [bills]);

  // --- FILTERED INVOICES ---
  const filteredBills = useMemo(() => {
    return dueBills
      .filter((bill) => {
        // Status Category
        if (statusFilter !== "All" && statusFilter !== "All Invoices") {
          if (statusFilter === "Verification" || statusFilter === "Pending Verification") {
            if (bill.status !== "Pending Verification") return false;
          } else if (bill.status !== statusFilter) {
            return false;
          }
        }

        // Month Filter
        if (monthFilter !== "All" && bill.billing_month !== monthFilter)
          return false;

        // Room Filter
        if (roomFilter !== "All Rooms") {
          const targetRoom = roomFilter.replace("Room ", "").trim();
          if (bill.room_number !== targetRoom) return false;
        }

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTenant = bill.tenant_name?.toLowerCase().includes(q);
          const matchRoom = bill.room_number
            ?.toString()
            .toLowerCase()
            .includes(q);
          const matchNotes = bill.notes
            ? bill.notes.toLowerCase().includes(q)
            : false;
          const matchMonth = bill.billing_month?.toLowerCase().includes(q);
          if (!matchTenant && !matchRoom && !matchNotes && !matchMonth)
            return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortFilter === "Highest Balance")
          return (Number(b.balance) || 0) - (Number(a.balance) || 0);
        if (sortFilter === "Highest Total")
          return (Number(b.total_amount) || 0) - (Number(a.total_amount) || 0);
        if (sortFilter === "Oldest First") {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateA - dateB;
        }
        // 'Newest First' default
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
  }, [
    dueBills,
    statusFilter,
    monthFilter,
    roomFilter,
    searchQuery,
    sortFilter,
  ]);

  // --- FILTERED PAYMENTS (ONLY PAID STATUS) ---
  const filteredPayments = useMemo(() => {
    return allPayments.filter((payment) => {
      const isApproved =
        payment.status === "Paid" ||
        payment.status === "Approved" ||
        payment.status === "Verified" ||
        !payment.status;
      const isPendingOrRejected =
        payment.status === "Pending" ||
        payment.status === "Pending Verification" ||
        payment.status === "Rejected";
      if (!isApproved || isPendingOrRejected) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTenant = payment.tenant_name?.toLowerCase().includes(q);
        const matchRoom = payment.room_number
          ?.toString()
          .toLowerCase()
          .includes(q);
        const matchMethod = payment.payment_method?.toLowerCase().includes(q);
        const matchMonth = payment.billing_month?.toLowerCase().includes(q);
        const matchRef = (
          payment.reference_number ||
          payment.referenceNumber ||
          payment.notes
        )
          ?.toLowerCase()
          .includes(q);
        if (
          !matchTenant &&
          !matchRoom &&
          !matchMethod &&
          !matchMonth &&
          !matchRef
        )
          return false;
      }
      return true;
    });
  }, [allPayments, searchQuery]);

  const paidPaymentsCount = useMemo(() => {
    return allPayments.filter((p) => {
      const isApproved =
        p.status === "Paid" ||
        p.status === "Approved" ||
        p.status === "Verified" ||
        !p.status;
      const isPendingOrRejected =
        p.status === "Pending" ||
        p.status === "Pending Verification" ||
        p.status === "Rejected";
      return isApproved && !isPendingOrRejected;
    }).length;
  }, [allPayments]);

  // --- FORM HANDLERS ---
  const handleTenantSelect = (tenantIdStr: string) => {
    const tenantId = Number(tenantIdStr);
    const tenant = tenants.find((t) => t.id === tenantId);
    const room = rooms.find((r) => r.id === tenant?.room_id);
    const defaultRent = room?.price || 0;

    setBillForm({
      ...billForm,
      tenant_id: tenantId,
      room_id: tenant?.room_id || "",
      rent_amount: Number(defaultRent),
    });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billForm.tenant_id) {
      toast.error("Please select a tenant");
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post("/admin/bills", billForm);
      toast.success("Billing Invoice Issued", {
        description: "Invoice generated and added to billing ledger.",
      });
      setIsCreateOpen(false);
      setBillForm(initialBillForm);
      fetchData();
    } catch (error: any) {
      console.error("Create bill error:", error);
      toast.error("Failed to Issue Invoice", {
        description: error.response?.data?.message || "Could not generate invoice.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBill) return;

    try {
      setIsSubmitting(true);
      await api.put(`/admin/bills/${selectedBill.id}`, billForm);
      toast.success("Invoice Updated", {
        description: "Invoice adjustments and charges saved successfully.",
      });
      setIsEditOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Edit bill error:", error);
      toast.error("Failed to Update Invoice", {
        description: "Could not save invoice adjustments.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBill) return;

    try {
      setIsSubmitting(true);
      await api.post(`/admin/bills/${selectedBill.id}/pay`, paymentForm);
      toast.success("Payment Recorded", {
        description: `Payment of ₱${Number(paymentForm.amount_paid).toLocaleString()} posted to ledger.`,
      });
      setIsPayOpen(false);
      setPaymentForm(initialPaymentForm);
      fetchData();
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error("Payment Record Failed", {
        description: error.response?.data?.message || "Could not post payment.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateMonthly = async () => {
    try {
      setIsSubmitting(true);
      await api.post("/admin/bills/generate");
      toast.success("Monthly Invoices Generated", {
        description: "Billing statements created for all active residents.",
      });
      setIsGenerateConfirmOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Auto generate bills error:", error);
      toast.error("Generation Failed", {
        description: error.response?.data?.message || "Failed to generate monthly bills.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyPayment = async (
    paymentId: number,
    action: "approve" | "reject",
  ) => {
    try {
      await api.post(`/admin/bills/payments/${paymentId}/verify`, { action });
      toast.success(
        action === "approve" ? "Payment Approved" : "Payment Rejected",
        {
          description:
            action === "approve"
              ? "Payment proof verified and receipt acknowledged."
              : "Payment proof marked as rejected.",
        }
      );
      fetchData();
      if (pendingPayments.length <= 1) {
        setIsVerifyModalOpen(false);
      }
    } catch (error) {
      console.error("Verification error:", error);
      toast.error("Verification Failed", {
        description: `Failed to ${action} payment verification.`,
      });
    }
  };

  // --- MODAL OPENERS ---
  const openViewModal = async (bill: Bill) => {
    setSelectedBill(bill);
    setBillDetails(null);
    setIsViewOpen(true);
    try {
      const { data } = await api.get(`/admin/bills/${bill.id}`);
      setBillDetails(data);
    } catch (error) {
      console.error("Error fetching bill details:", error);
      toast.error("Failed to load invoice statement details.");
    }
  };

  const openEditModal = (bill: Bill) => {
    setSelectedBill(bill);
    setBillForm({
      tenant_id: bill.tenant_id,
      room_id: bill.room_id || "",
      billing_month: bill.billing_month,
      due_date: bill.due_date
        ? new Date(bill.due_date).toISOString().split("T")[0]
        : "",
      rent_amount: Number(bill.rent_amount) || 0,
      water_charges: Number(bill.water_charges) || 0,
      electricity_charges: Number(bill.electricity_charges) || 0,
      other_fees: Number(bill.other_fees) || 0,
      notes: bill.notes || "",
    });
    setIsEditOpen(true);
  };

  const openPayModal = (bill: Bill) => {
    setSelectedBill(bill);
    setPaymentForm({
      amount_paid: Number(bill.balance) || "",
      payment_date: new Date().toISOString().split("T")[0],
      payment_method: "Cash",
      notes: "",
    });
    setIsPayOpen(true);
  };

  // Status Badge Helpers - Only colored text with no background color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return {
          label: "Paid",
          className: "text-emerald-600 dark:text-emerald-400 font-bold",
        };
      case "Partial":
        return {
          label: "Partial",
          className: "text-blue-600 dark:text-blue-400 font-bold",
        };
      case "Pending Verification":
        return {
          label: "Pending Verification",
          className: "text-amber-600 dark:text-amber-400 font-bold",
        };
      case "Overdue":
        return {
          label: "Overdue",
          className: "text-rose-600 dark:text-rose-400 font-bold",
        };
      default:
        return {
          label: "Unpaid",
          className: "text-slate-600 dark:text-zinc-400 font-bold",
        };
    }
  };

  if (isLoading) {
    return (
      <div className="w-full flex flex-col font-sans text-slate-900 dark:text-zinc-100 space-y-4 pb-2 animate-pulse">
        {/* Top Header Skeleton */}
        <div className="space-y-1.5 pb-0.5">
          <div className="h-6 w-52 bg-slate-200 dark:bg-zinc-800 rounded" />
          <div className="h-3.5 w-96 max-w-full bg-slate-100 dark:bg-zinc-800/60 rounded" />
        </div>

        {/* Top 4 Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-xl p-4 shadow-xs h-36 flex flex-col justify-between"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-zinc-800" />
                <div className="h-4 w-28 bg-slate-200 dark:bg-zinc-800 rounded" />
              </div>
              <div className="h-7 w-36 bg-slate-200 dark:bg-zinc-800 rounded" />
              <div className="h-3 w-24 bg-slate-200 dark:bg-zinc-800 rounded" />
            </div>
          ))}
        </div>

        {/* Middle 3 Cards Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
          <div className="lg:col-span-6 bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-xl p-5 h-80 flex flex-col justify-between">
            <div className="h-6 w-48 bg-slate-200 dark:bg-zinc-800 rounded" />
            <div className="h-44 w-full bg-slate-100 dark:bg-zinc-800/60 rounded" />
            <div className="h-10 w-full bg-slate-200 dark:bg-zinc-800 rounded-lg" />
          </div>
          <div className="lg:col-span-3 bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-xl p-5 h-80 flex flex-col justify-between">
            <div className="h-6 w-40 bg-slate-200 dark:bg-zinc-800 rounded" />
            <div className="space-y-3 flex-1 pt-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-8 w-full bg-slate-100 dark:bg-zinc-800/60 rounded" />
              ))}
            </div>
          </div>
          <div className="lg:col-span-3 bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-xl p-5 h-80 flex flex-col justify-between">
            <div className="h-6 w-36 bg-slate-200 dark:bg-zinc-800 rounded" />
            <div className="space-y-2 flex-1 pt-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-5 w-full bg-slate-100 dark:bg-zinc-800/60 rounded" />
              ))}
            </div>
            <div className="h-16 w-full bg-slate-100 dark:bg-zinc-800/60 rounded-xl" />
          </div>
        </div>

        {/* Bottom Table Skeleton */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-xl p-4 h-96 flex flex-col justify-between">
          <div className="h-8 w-full bg-slate-200 dark:bg-zinc-800 rounded" />
          <div className="h-64 w-full bg-slate-100 dark:bg-zinc-800/50 rounded" />
          <div className="h-6 w-48 bg-slate-200 dark:bg-zinc-800 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col font-sans text-slate-900 dark:text-zinc-100 space-y-4 pb-2">
      {/* 1. TOP SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0 pb-0.5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white tracking-tight leading-none">
            Bills and Payments
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium mt-1">
            Real-time billing overview, invoice management, and collection tracking.
          </p>
        </div>

        {/* Period Selector */}
        <div className="w-36">
          <CustomSelect
            value={quickActionPeriod}
            onChange={(val) => setQuickActionPeriod(val)}
            options={["This Month", "Last Month", "This Year", "Last Year"]}
            className="w-full bg-white dark:bg-zinc-900 pl-3 pr-7 py-1.5 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-zinc-300 shadow-xs"
          />
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. SUMMARY CARDS RIBBON (4 KPI CARDS)                     */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Collected */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-xl p-3.5 sm:p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-zinc-700 transition-colors">
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-800/40">
              <Wallet className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                Total Collected ({quickActionPeriod})
              </span>
              <div className="text-xl sm:text-[22px] font-bold text-slate-900 dark:text-white mt-0.5 tracking-tight font-sans">
                ₱ {displayMetrics.totalCollected.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="mt-3 pt-1">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="font-medium text-slate-500 dark:text-zinc-400">
                Collection Rate <span className="font-semibold text-slate-700 dark:text-zinc-300">{displayMetrics.collectionRate}%</span>
              </span>
              <span className={`font-semibold flex items-center gap-0.5 ${
                displayMetrics.rateDiff >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-500 dark:text-rose-400"
              }`}>
                {displayMetrics.rateDiff >= 0 ? <TrendingUp className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                {displayMetrics.rateDiff >= 0 ? `+${displayMetrics.rateDiff}%` : `${displayMetrics.rateDiff}%`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, displayMetrics.collectionRate)}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 shrink-0">
                vs. last month
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              setActiveTableTab("all");
              document.getElementById("bills-table-section")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 cursor-pointer mt-3 pt-1 group"
          >
            <span>View Billing Ledger</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Card 2: Total Invoiced */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-xl p-3.5 sm:p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-zinc-700 transition-colors">
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-800/40">
              <FileText className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                Total Invoiced ({quickActionPeriod})
              </span>
              <div className="text-xl sm:text-[22px] font-bold text-slate-900 dark:text-white mt-0.5 tracking-tight font-sans">
                ₱ {displayMetrics.totalInvoiced.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="mt-3 pt-1 flex items-baseline justify-between">
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-400 dark:text-zinc-500 tracking-wider">
                Outstanding
              </div>
              <div className="text-sm font-bold text-slate-800 dark:text-zinc-200 font-sans mt-0.5">
                ₱ {displayMetrics.outstanding.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">
              {displayMetrics.outstandingRate}%
            </span>
          </div>

          <button
            onClick={() => {
              setActiveTableTab("unpaid");
              document.getElementById("bills-table-section")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 cursor-pointer mt-3 pt-1 group"
          >
            <span>View Bills & Invoices</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Card 3: Pending Verification */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-xl p-3.5 sm:p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-zinc-700 transition-colors">
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-800/40">
              <Clock className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                Pending Verification
              </span>
              <div className="text-xl sm:text-[22px] font-bold text-slate-900 dark:text-white mt-0.5 tracking-tight font-sans">
                ₱ {displayMetrics.pendingVerificationAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="mt-3 pt-1">
            <div className="text-[10px] uppercase font-semibold text-slate-400 dark:text-zinc-500 tracking-wider">
              Receipts
            </div>
            <div className="text-sm font-bold text-slate-800 dark:text-zinc-200 mt-0.5">
              {displayMetrics.pendingVerificationCount}
            </div>
          </div>

          <button
            onClick={() => {
              setActiveTableTab("pending");
              document.getElementById("bills-table-section")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 cursor-pointer mt-3 pt-1 group"
          >
            <span>View Payment Verifications</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Card 4: Overdue Accounts */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-xl p-3.5 sm:p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-zinc-700 transition-colors">
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-800/40">
              <AlertTriangle className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                Overdue Accounts
              </span>
              <div className="text-xl sm:text-[22px] font-bold text-slate-900 dark:text-white mt-0.5 tracking-tight font-sans">
                ₱ {displayMetrics.overdueAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="mt-3 pt-1">
            <div className="text-[10px] uppercase font-semibold text-slate-400 dark:text-zinc-500 tracking-wider">
              Overdue Invoices
            </div>
            <div className="text-sm font-bold text-slate-800 dark:text-zinc-200 mt-0.5">
              {displayMetrics.overdueCount}
            </div>
          </div>

          <button
            onClick={() => {
              setActiveTableTab("overdue");
              document.getElementById("bills-table-section")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 cursor-pointer mt-3 pt-1 group"
          >
            <span>View Payments</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. MIDDLE SECTION: 3 CARDS                                */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Card 1: Billing & Payment Overview (lg:col-span-6) */}
        <div className="lg:col-span-6 bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            {/* Title & 4 Pill Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Billing & Payment Overview
                </h2>
                <p className="text-xs text-slate-600 dark:text-zinc-300 mt-0.5 font-medium">
                  Invoiced vs. collected vs. outstanding
                </p>
              </div>

              {/* 4 Pill Buttons */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl text-xs font-semibold">
                {(["This Month", "Last Month", "This Year", "Last Year"] as const).map(
                  (tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setChartPeriod(tab)}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        chartPeriod === tab
                          ? "bg-[#0284c7] text-white shadow-xs"
                          : "text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      {tab}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* Recharts Chart Subpanel matching Dashboard Cash Flow Overview */}
            <div className="w-full h-[260px] sm:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={monthlyChartData}
                  margin={{
                    top: 14,
                    right: 12,
                    left: 0,
                    bottom: 0,
                  }}
                  barGap={
                    monthlyChartData.length <= 1 ||
                    chartPeriod === "This Month" ||
                    chartPeriod === "Last Month"
                      ? 18
                      : 2
                  }
                  barSize={
                    monthlyChartData.length <= 1 ||
                    chartPeriod === "This Month" ||
                    chartPeriod === "Last Month"
                      ? 70
                      : monthlyChartData.length <= 3
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
                    domain={[0, chartMaxVal]}
                    ticks={chartTicks}
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
                        monthlyChartData.length <= 1 ||
                        chartPeriod === "This Month" ||
                        chartPeriod === "Last Month";
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
                                isSingleMonth ? "w-[70px] text-center" : ""
                              }`}
                            >
                              <span className="w-2.5 h-2.5 rounded-xs bg-[#10b981] shrink-0" />
                              <span>Collected</span>
                            </span>
                            <span
                              className={`flex items-center justify-center gap-1.5 ${
                                isSingleMonth ? "w-[70px] text-center" : ""
                              }`}
                            >
                              <span className="w-2.5 h-2.5 rounded-xs bg-[#0284c7] shrink-0" />
                              <span>Invoiced</span>
                            </span>
                            <span
                              className={`flex items-center justify-center gap-1.5 ${
                                isSingleMonth ? "w-[70px] text-center" : ""
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
                  {/* Graph bars matching Dashboard colors and radii */}
                  <Bar
                    dataKey="collected"
                    name="Collected"
                    fill="#10b981"
                    radius={
                      monthlyChartData.length <= 1 ||
                      chartPeriod === "This Month" ||
                      chartPeriod === "Last Month"
                        ? [8, 8, 0, 0]
                        : [2.5, 2.5, 0, 0]
                    }
                    minPointSize={
                      monthlyChartData.length <= 1 ||
                      chartPeriod === "This Month" ||
                      chartPeriod === "Last Month"
                        ? 10
                        : 3
                    }
                  />
                  <Bar
                    dataKey="invoiced"
                    name="Invoiced"
                    fill="#0284c7"
                    radius={
                      monthlyChartData.length <= 1 ||
                      chartPeriod === "This Month" ||
                      chartPeriod === "Last Month"
                        ? [8, 8, 0, 0]
                        : [2.5, 2.5, 0, 0]
                    }
                    minPointSize={
                      monthlyChartData.length <= 1 ||
                      chartPeriod === "This Month" ||
                      chartPeriod === "Last Month"
                        ? 10
                        : 3
                    }
                  />
                  <Bar
                    dataKey="outstanding"
                    name="Outstanding"
                    fill="#f43f5e"
                    radius={
                      monthlyChartData.length <= 1 ||
                      chartPeriod === "This Month" ||
                      chartPeriod === "Last Month"
                        ? [8, 8, 0, 0]
                        : [2.5, 2.5, 0, 0]
                    }
                    minPointSize={
                      monthlyChartData.length <= 1 ||
                      chartPeriod === "This Month" ||
                      chartPeriod === "Last Month"
                        ? 10
                        : 3
                    }
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom Stats Ribbon */}
          <div className="bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-zinc-800 rounded-xl p-2.5 mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Stat 1 */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                  Total Invoiced
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  ₱ {chartSummary.totalInvoiced.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Stat 2 */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                  Total Collected
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  ₱ {chartSummary.totalCollected.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Stat 3 */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                  Outstanding Balance
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  ₱ {chartSummary.totalOutstanding.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Stat 4 */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-900/40 text-teal-600 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                  Collection Rate
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  {chartSummary.collectionRate}%
                </div>
              </div>
            </div>

            {/* Stat 5 button */}
            <button
              onClick={() => {
                setActiveTableTab("all");
                document.getElementById("bills-table-section")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 border border-blue-200 dark:border-blue-900/60 rounded-md bg-white dark:bg-zinc-800 transition-colors shadow-2xs cursor-pointer ml-auto"
            >
              <span>View Full Ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 2: Recent Payment Activity (lg:col-span-3) */}
        <div className="lg:col-span-3 bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Recent Payment Activity
              </h2>
              <button
                onClick={() => {
                  setActiveTableTab("paid");
                  document.getElementById("bills-table-section")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 cursor-pointer"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-zinc-800">
              {recentActivities.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 dark:text-zinc-500">
                  <Clock className="w-6 h-6 mx-auto mb-2 text-slate-300 dark:text-zinc-600" />
                  No recent payment transactions recorded yet
                </div>
              ) : (
                recentActivities.map((act) => (
                  <div key={act.id} className="py-2.5 first:pt-0 last:pb-0 flex items-start gap-2.5">
                    {/* Status icon */}
                    <div className="shrink-0 mt-0.5">
                      {act.type === "verified" ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                          <Clock className="w-3.5 h-3.5 stroke-[2]" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate">
                        {act.title}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                        {act.tenant} · {act.room}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300 mt-0.5">
                        {act.amount} <span className="font-normal text-slate-400">· {act.method}</span>
                      </div>
                    </div>

                    {/* Badge & timestamp */}
                    <div className="shrink-0 text-right">
                      {act.badge === "Verified" || act.badge === "Approved" || act.badge === "Paid" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <Check className="w-3 h-3 stroke-[2.5]" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                          <Clock className="w-3 h-3 stroke-[2]" /> Pending
                        </span>
                      )}
                      <div className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">
                        {act.time}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Billing Summary (lg:col-span-3) */}
        <div className="lg:col-span-3 bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Billing Summary
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-[11px] font-semibold text-slate-600 dark:text-zinc-400 border border-slate-200/60 dark:border-zinc-700/60">
                This Month
              </span>
            </div>

            {/* Key-Value Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-zinc-400">Total Invoices</span>
                <span className="font-bold text-slate-900 dark:text-white font-sans">
                  ₱ {billingSummary.totalInvoices.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-zinc-400">Total Collected (Verified)</span>
                <span className="font-bold text-slate-900 dark:text-white font-sans">
                  ₱ {billingSummary.totalCollected.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-zinc-400">Pending Verification</span>
                <span className="font-bold text-slate-900 dark:text-white font-sans">
                  ₱ {billingSummary.pendingVerification.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-zinc-400">Outstanding Balance</span>
                <span className="font-bold text-slate-900 dark:text-white font-sans">
                  ₱ {billingSummary.outstandingBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-zinc-400">Overdue Balance</span>
                <span className="font-bold text-slate-900 dark:text-white font-sans">
                  ₱ {billingSummary.overdueBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Donut Chart Widget */}
          <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-3">
            {/* Donut circle with hover tooltip */}
            <div className="group/donut relative w-22 h-22 shrink-0 flex items-center justify-center cursor-pointer">
              {/* Floating window at the top on hover */}
              <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 opacity-0 invisible group-hover/donut:opacity-100 group-hover/donut:visible group-hover/donut:-translate-y-0.5 transition-all duration-150 pointer-events-none z-30">
                <div className="relative px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200/90 dark:border-zinc-700 shadow-lg text-[11px] font-semibold text-slate-800 dark:text-zinc-200 whitespace-nowrap flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Collection Rate</span>
                </div>
                {/* Downward pointer caret */}
                <div className="w-2 h-2 bg-white dark:bg-zinc-800 border-r border-b border-slate-200/90 dark:border-zinc-700 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
              </div>

              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="36"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="9"
                  className="text-slate-100 dark:text-zinc-800"
                />
                {/* Collected */}
                <circle
                  cx="50"
                  cy="50"
                  r="36"
                  fill="transparent"
                  stroke="#10b981"
                  strokeWidth="9"
                  strokeDasharray="226.2"
                  strokeDashoffset={billingSummary.collectedOffset}
                  strokeLinecap="round"
                />
                {/* Pending */}
                {billingSummary.pendingVerification > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="36"
                    fill="transparent"
                    stroke="#f59e0b"
                    strokeWidth="9"
                    strokeDasharray="226.2"
                    strokeDashoffset={billingSummary.pendingOffset}
                    strokeLinecap="round"
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-center">
                <span className="text-base font-extrabold text-slate-900 dark:text-white leading-none">
                  {billingSummary.collectionRate}%
                </span>
              </div>
            </div>

            {/* Legend values */}
            <div className="space-y-1.5 text-xs flex-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-slate-600 dark:text-zinc-400 text-[10px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Collected
                </span>
                <span className="font-bold text-slate-900 dark:text-white text-[10px]">
                  ₱ {billingSummary.totalCollected.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-slate-600 dark:text-zinc-400 text-[10px]">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Pending
                </span>
                <span className="font-bold text-slate-900 dark:text-white text-[10px]">
                  ₱ {billingSummary.pendingVerification.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-slate-600 dark:text-zinc-400 text-[10px]">
                  <span className="w-2 h-2 rounded-full bg-rose-400" /> Outstanding
                </span>
                <span className="font-bold text-slate-900 dark:text-white text-[10px]">
                  ₱ {billingSummary.outstandingBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. BOTTOM SECTION: BILLS & PAYMENTS TABLE                 */}
      {/* ========================================================= */}
      <div id="bills-table-section" className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-xl shadow-xs overflow-hidden">
        {/* Header & Controls */}
        <div className="p-4 border-b border-slate-200/80 dark:border-zinc-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          {/* Left: Title & Filter Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white whitespace-nowrap">
              Bills and Payments
            </h3>

            <div className="flex items-center gap-1 border-b sm:border-b-0 border-slate-200 dark:border-zinc-800 overflow-x-auto pb-1 sm:pb-0">
              {(
                [
                  { key: "all", label: "All Bills" },
                  { key: "unpaid", label: "Unpaid" },
                  { key: "overdue", label: "Overdue" },
                  { key: "pending", label: "Pending Verification" },
                  { key: "paid", label: "Paid" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTableTab(tab.key);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                    activeTableTab === tab.key
                      ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-b-2 border-blue-600 dark:border-blue-400"
                      : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Search Input */}
          <div className="relative min-w-[240px] sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by invoice ID or tenant name..."
              value={tableSearchQuery}
              onChange={(e) => {
                setTableSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-800/50 text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {tableSearchQuery && (
              <button
                onClick={() => setTableSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/80 text-slate-600 dark:text-zinc-400 font-semibold select-none">
                <th className="py-3 pl-4 pr-3 text-left whitespace-nowrap">Invoice #</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Tenant</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Room</th>
                <th
                  onClick={() => {
                    setSortField("period");
                    setSortAsc(!sortAsc);
                  }}
                  className="py-3 px-3 text-center whitespace-nowrap cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  Bill Period ↕
                </th>
                <th
                  onClick={() => {
                    setSortField("amount");
                    setSortAsc(!sortAsc);
                  }}
                  className="py-3 px-3 text-center whitespace-nowrap cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  Amount ↕
                </th>
                <th
                  onClick={() => {
                    setSortField("status");
                    setSortAsc(!sortAsc);
                  }}
                  className="py-3 px-3 text-center whitespace-nowrap cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  Status ↕
                </th>
                <th
                  onClick={() => {
                    setSortField("due_date");
                    setSortAsc(!sortAsc);
                  }}
                  className="py-3 px-3 text-center whitespace-nowrap cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  Due Date ↕
                </th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Paid Amount</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Balance</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {paginatedBills.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="h-[210px] text-center align-middle p-0"
                  >
                    <div className="flex items-center justify-center h-[210px] text-slate-300 dark:text-zinc-600 font-light text-xs">
                      No invoices found matching criteria.
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedBills.map((bill) => {
                  const formattedInv = formatInvoiceNumber(bill);
                  const roomDisplay = getBillRoomDisplay(bill);

                  return (
                    <tr
                      key={bill.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      {/* Invoice # */}
                      <td className="py-3 pl-4 pr-3 text-left whitespace-nowrap font-mono font-medium text-blue-600 dark:text-blue-400">
                        <button
                          onClick={() => openViewModal(bill)}
                          className="hover:underline cursor-pointer"
                        >
                          {formattedInv}
                        </button>
                      </td>

                      {/* Tenant */}
                      <td className="py-3 px-3 text-center whitespace-nowrap font-medium text-slate-900 dark:text-white">
                        {bill.tenant_name}
                      </td>

                      {/* Room */}
                      <td className="py-3 px-3 text-center whitespace-nowrap text-slate-600 dark:text-zinc-300">
                        {roomDisplay}
                      </td>

                      {/* Bill Period */}
                      <td className="py-3 px-3 text-center whitespace-nowrap text-slate-600 dark:text-zinc-400">
                        {bill.billing_month}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-3 text-center whitespace-nowrap font-medium font-sans text-slate-900 dark:text-white">
                        ₱ {Number(bill.total_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {bill.status === "Paid" && (
                          <span className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Paid
                          </span>
                        )}
                        {bill.status === "Partially Paid" && (
                          <span className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                            <Clock className="w-3.5 h-3.5 stroke-[2]" /> Partially Paid
                          </span>
                        )}
                        {bill.status === "Overdue" && (
                          <span className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                            <AlertTriangle className="w-3.5 h-3.5 stroke-[2]" /> Overdue
                          </span>
                        )}
                        {bill.status === "Pending Verification" && (
                          <span className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                            <Clock className="w-3.5 h-3.5 stroke-[2]" /> Pending Verification
                          </span>
                        )}
                        {bill.status !== "Paid" &&
                          bill.status !== "Partially Paid" &&
                          bill.status !== "Overdue" &&
                          bill.status !== "Pending Verification" && (
                            <span className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-400">
                              {bill.status}
                            </span>
                          )}
                      </td>

                      {/* Due Date */}
                      <td className="py-3 px-3 text-center whitespace-nowrap text-slate-600 dark:text-zinc-400">
                        {bill.due_date
                          ? new Date(bill.due_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "N/A"}
                      </td>

                      {/* Paid Amount */}
                      <td className="py-3 px-3 text-center whitespace-nowrap font-sans text-slate-600 dark:text-zinc-300">
                        ₱ {Number(bill.amount_paid || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>

                      {/* Balance */}
                      <td className={`py-3 px-3 text-center whitespace-nowrap font-sans ${Number(bill.balance) > 0 ? "font-bold text-rose-600 dark:text-rose-400" : "text-slate-600 dark:text-zinc-300"}`}>
                        ₱ {Number(bill.balance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap relative">
                        <div className="inline-flex items-center justify-center gap-2">
                          <button
                            onClick={() => openViewModal(bill)}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                          >
                            View
                          </button>

                          <div className="relative inline-block text-left">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuBillId(
                                  activeMenuBillId === bill.id ? null : bill.id,
                                );
                              }}
                              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {activeMenuBillId === bill.id && (
                              <div
                                className="absolute right-0 mt-1 w-44 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg shadow-lg z-30 py-1 text-left"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => {
                                    setActiveMenuBillId(null);
                                    openViewModal(bill);
                                  }}
                                  className="w-full px-3 py-1.5 text-xs text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700 flex items-center gap-2 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                                  View Statement
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveMenuBillId(null);
                                    openPayModal(bill);
                                  }}
                                  className="w-full px-3 py-1.5 text-xs text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700 flex items-center gap-2 cursor-pointer"
                                >
                                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                                  Record Payment
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveMenuBillId(null);
                                    openEditModal(bill);
                                  }}
                                  className="w-full px-3 py-1.5 text-xs text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700 flex items-center gap-2 cursor-pointer"
                                >
                                  <Edit className="w-3.5 h-3.5 text-slate-600" />
                                  Edit Invoice
                                </button>
                                {bill.status === "Pending Verification" && (
                                  <button
                                    onClick={() => {
                                      setActiveMenuBillId(null);
                                      const matchIdx = pendingPayments.findIndex(
                                        (p) => p.bill_id === bill.id,
                                      );
                                      setCurrentVerifyIndex(
                                        matchIdx >= 0 ? matchIdx : 0,
                                      );
                                      setIsVerifyModalOpen(true);
                                    }}
                                    className="w-full px-3 py-1.5 text-xs text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                                    Verify Payment
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-2 border-t border-slate-200/80 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="text-xs text-slate-500 dark:text-zinc-400">
            Showing{" "}
            <span className="font-semibold text-slate-700 dark:text-zinc-300">
              {filteredTableBills.length === 0
                ? 0
                : (currentPage - 1) * itemsPerPage + 1}
              –{Math.min(currentPage * itemsPerPage, filteredTableBills.length)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-700 dark:text-zinc-300">
              {filteredTableBills.length}
            </span>{" "}
            invoices
          </div>

          <div className="flex items-center gap-1">
            {/* Prev */}
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="w-7 h-7 rounded-md border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Page Numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
              <button
                key={pg}
                onClick={() => setCurrentPage(pg)}
                className={`w-7 h-7 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  currentPage === pg
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
                }`}
              >
                {pg}
              </button>
            ))}

            {/* Next */}
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="w-7 h-7 rounded-md border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* MODALS & SLIDE-OVERS */}
      <AnimatePresence>
        {/* VIEW STATEMENT DETAILS */}
        {isViewOpen && selectedBill && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4"
          >
            <motion.div
              initial={{ scale: 0.97, y: 12, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              id="statement-modal-printable"
              className="bg-white dark:bg-[#111215] border border-slate-200/90 dark:border-zinc-800/90 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Document Masthead / Header */}
              <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800/80 flex justify-between items-start bg-slate-50/60 dark:bg-zinc-900/40 shrink-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-zinc-500 font-semibold">
                      Official Statement
                    </span>
                    <span className="text-slate-300 dark:text-zinc-700">·</span>
                    <span className="font-mono text-xs font-bold text-slate-700 dark:text-zinc-300">
                      {formatInvoiceNumber(selectedBill)}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    Statement of Account
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  {/* Status Badge */}
                  {(() => {
                    const currentStatus =
                      billDetails?.status || selectedBill.status;
                    if (currentStatus === "Paid") {
                      return (
                        <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          Paid in Full
                        </span>
                      );
                    } else if (currentStatus === "Overdue") {
                      return (
                        <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                          Overdue
                        </span>
                      );
                    } else if (currentStatus === "Partial") {
                      return (
                        <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                          Partially Paid
                        </span>
                      );
                    }
                    return (
                      <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        Pending Payment
                      </span>
                    );
                  })()}
                  <button
                    onClick={() => setIsViewOpen(false)}
                    className="p-1 rounded-lg hover:bg-slate-200/70 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                    aria-label="Close modal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Body / Document Sheet */}
              <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
                {!billDetails ? (
                  <div className="py-16 flex flex-col items-center justify-center gap-3">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs text-slate-400 font-mono">
                      Loading statement data...
                    </span>
                  </div>
                ) : (
                  <>
                    {/* Editorial Two-Column Parties Metadata */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-5 border-b border-slate-100 dark:border-zinc-800/80 text-xs">
                      {/* Billed To */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-zinc-500 font-semibold">
                          Billed To
                        </span>
                        <div className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                          {billDetails.tenant_name}
                        </div>
                        <div className="text-slate-600 dark:text-zinc-400 text-xs flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="font-semibold text-slate-800 dark:text-zinc-200">
                            {billDetails.room_number
                              ? `Room ${billDetails.room_number}`
                              : "No Assigned Room"}
                          </span>
                          {(billDetails.tenant_email ||
                            billDetails.tenant_phone) && (
                            <>
                              <span className="text-slate-300 dark:text-zinc-700">
                                ·
                              </span>
                              <span className="font-mono text-[11px] text-slate-500 dark:text-zinc-400">
                                {billDetails.tenant_email ||
                                  billDetails.tenant_phone}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Statement Metadata */}
                      <div className="sm:text-right space-y-1 sm:justify-self-end">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-zinc-500 font-semibold">
                          Statement Period
                        </span>
                        <div className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                          {billDetails.billing_month}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
                          Due:{" "}
                          {billDetails.due_date
                            ? new Date(billDetails.due_date).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )
                            : "Upon Receipt"}
                        </div>
                      </div>
                    </div>

                    {/* Itemized Charges Ledger Table */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 dark:text-zinc-500 font-semibold">
                        Itemized Charges
                      </div>
                      <div className="border border-slate-200/80 dark:border-zinc-800/80 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/70 dark:bg-zinc-900/40 text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                              <th className="py-2.5 px-3.5">
                                Charge Description
                              </th>
                              <th className="py-2.5 px-3.5 text-center hidden sm:table-cell">
                                Billing Basis
                              </th>
                              <th className="py-2.5 px-3.5 text-right">
                                Amount
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 font-sans">
                            {/* Room Rent */}
                            <tr>
                              <td className="py-2.5 px-3.5">
                                <div className="font-semibold text-slate-800 dark:text-zinc-200">
                                  Room Rent
                                </div>
                                <div className="text-[11px] text-slate-400 dark:text-zinc-500">
                                  Monthly residential lease for{" "}
                                  {billDetails.room_number
                                    ? `Room ${billDetails.room_number}`
                                    : "unit"}
                                </div>
                              </td>
                              <td className="py-2.5 px-3.5 text-center text-[11px] text-slate-500 dark:text-zinc-400 hidden sm:table-cell">
                                Base Rent
                              </td>
                              <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-800 dark:text-zinc-200">
                                ₱
                                {(
                                  Number(billDetails.rent_amount) || 0
                                ).toLocaleString()}
                              </td>
                            </tr>

                            {/* Water Charges */}
                            <tr>
                              <td className="py-2.5 px-3.5">
                                <div className="font-semibold text-slate-800 dark:text-zinc-200">
                                  Water Supply Charges
                                </div>
                                <div className="text-[11px] text-slate-400 dark:text-zinc-500">
                                  Fixed monthly water utility allocation
                                </div>
                              </td>
                              <td className="py-2.5 px-3.5 text-center text-[11px] text-slate-500 dark:text-zinc-400 hidden sm:table-cell">
                                Fixed Utility
                              </td>
                              <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-800 dark:text-zinc-200">
                                ₱
                                {(
                                  Number(billDetails.water_charges) || 0
                                ).toLocaleString()}
                              </td>
                            </tr>

                            {/* Electricity Charges */}
                            <tr>
                              <td className="py-2.5 px-3.5">
                                <div className="font-semibold text-slate-800 dark:text-zinc-200">
                                  Electricity Charges
                                </div>
                                <div className="text-[11px] text-slate-400 dark:text-zinc-500">
                                  Submeter electrical consumption
                                </div>
                              </td>
                              <td className="py-2.5 px-3.5 text-center text-[11px] text-slate-500 dark:text-zinc-400 hidden sm:table-cell">
                                Submeter Reading
                              </td>
                              <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-800 dark:text-zinc-200">
                                ₱
                                {(
                                  Number(billDetails.electricity_charges) || 0
                                ).toLocaleString()}
                              </td>
                            </tr>

                            {/* Other Fees */}
                            {(Number(billDetails.other_fees) || 0) > 0 && (
                              <tr>
                                <td className="py-2.5 px-3.5">
                                  <div className="font-semibold text-slate-800 dark:text-zinc-200">
                                    Other Fees / Maintenance
                                  </div>
                                  <div className="text-[11px] text-slate-400 dark:text-zinc-500">
                                    Incidental property dues or surcharges
                                  </div>
                                </td>
                                <td className="py-2.5 px-3.5 text-center text-[11px] text-slate-500 dark:text-zinc-400 hidden sm:table-cell">
                                  Incidental
                                </td>
                                <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-800 dark:text-zinc-200">
                                  ₱
                                  {(
                                    Number(billDetails.other_fees) || 0
                                  ).toLocaleString()}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Financial Settlement Ledger  */}
                    <div className="flex justify-end pt-1">
                      <div className="w-full sm:w-72 space-y-2 text-xs">
                        <div className="flex justify-between text-slate-500 dark:text-zinc-400">
                          <span>Gross Invoiced Total</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
                            ₱
                            {(
                              Number(billDetails.total_amount) || 0
                            ).toLocaleString()}
                          </span>
                        </div>

                        {(Number(billDetails.amount_paid) || 0) > 0 && (
                          <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                            <span>Less: Payments Applied</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
                              -₱
                              {(
                                Number(billDetails.amount_paid) || 0
                              ).toLocaleString()}
                            </span>
                          </div>
                        )}

                        <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-baseline">
                          <span className="font-bold text-slate-900 dark:text-white">
                            Total Ammount
                          </span>
                          <span
                            className={`font-mono text-base font-bold ${
                              Number(billDetails.balance) === 0
                                ? "text-slate-900 dark:text-zinc-100"
                                : "text-rose-600 dark:text-rose-400/80"
                            }`}
                          >
                            ₱{Number(billDetails.balance).toLocaleString()}
                          </span>
                        </div>

                        {Number(billDetails.balance) === 0 && (
                          <div className="text-[11px] text-emerald-600 dark:text-emerald-400/80 font-medium text-right flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Account fully settled</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="px-6 py-3.5 border-t border-slate-100 dark:border-zinc-800/80 bg-slate-50/60 dark:bg-zinc-900/40 flex justify-between items-center shrink-0">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Statement</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsViewOpen(false)}
                    className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  {billDetails && Number(billDetails.balance) > 0 && (
                    <button
                      onClick={() => {
                        setIsViewOpen(false);
                        openPayModal(billDetails);
                      }}
                      className="px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark as Paid</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* POP-UP CARD: MARK AS PAID (CASH SETTLEMENT & STATEMENT) */}
        {isPayOpen && selectedBill && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3"
          >
            <motion.div
              initial={{ scale: 0.96, y: 8, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-slate-50/80 dark:bg-zinc-900/60 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Confirm Payment
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                      {selectedBill.tenant_name} ·{" "}
                      {selectedBill.room_number
                        ? `Room ${selectedBill.room_number}`
                        : "No Room"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPayOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={handlePaySubmit}
                className="p-5 space-y-4 overflow-y-auto"
              >
                {/* Tenant Billing Statement Overview Card */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 space-y-3">
                  <div className="flex justify-between items-start pb-2.5 border-b border-slate-200/80 dark:border-zinc-800">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                        Billing Statement Overview
                      </span>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                        {selectedBill.billing_month}
                      </h3>
                    </div>
                    <span className="text-[11px] font-bold uppercase text-amber-600 dark:text-amber-400">
                      {selectedBill.status}
                    </span>
                  </div>

                  {/* Breakdown Items */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-slate-600 dark:text-zinc-400">
                      <span>Room Rent</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-zinc-100">
                        ₱
                        {(
                          Number(selectedBill.rent_amount) || 0
                        ).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 dark:text-zinc-400">
                      <span>Water Charges</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-zinc-100">
                        ₱
                        {(
                          Number(selectedBill.water_charges) || 0
                        ).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 dark:text-zinc-400">
                      <span>Electricity Charges</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-zinc-100">
                        ₱
                        {(
                          Number(selectedBill.electricity_charges) || 0
                        ).toLocaleString()}
                      </span>
                    </div>
                    {(Number(selectedBill.other_fees) || 0) > 0 && (
                      <div className="flex justify-between items-center text-rose-600 dark:text-rose-400 font-semibold">
                        <span>Other Fees / Surcharges</span>
                        <span className="font-mono font-bold">
                          +₱
                          {(
                            Number(selectedBill.other_fees) || 0
                          ).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Statement Total & Balance */}
                  <div className="pt-2.5 border-t border-slate-200/80 dark:border-zinc-800 space-y-1.5">
                    <div className="flex justify-between items-center text-xs text-slate-500 dark:text-zinc-400">
                      <span>Total Statement Amount</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-zinc-300">
                        ₱
                        {(
                          Number(selectedBill.total_amount) || 0
                        ).toLocaleString()}
                      </span>
                    </div>
                    {(Number(selectedBill.amount_paid) || 0) > 0 && (
                      <div className="flex justify-between items-center text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                        <span>Previously Paid</span>
                        <span className="font-mono font-bold">
                          -₱
                          {(
                            Number(selectedBill.amount_paid) || 0
                          ).toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-baseline pt-1 border-t border-dashed border-slate-200 dark:border-zinc-800">
                      <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                        Outstanding Balance
                      </span>
                      <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                        ₱{Number(selectedBill.balance).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Input Details */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <label className="font-bold text-slate-700 dark:text-zinc-300">
                        Amount Received (₱)
                      </label>
                      {Number(paymentForm.amount_paid) !==
                        Number(selectedBill.balance) && (
                        <button
                          type="button"
                          onClick={() =>
                            setPaymentForm({
                              ...paymentForm,
                              amount_paid: Number(selectedBill.balance),
                            })
                          }
                          className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:underline cursor-pointer"
                        >
                          Pay Full (₱
                          {Number(selectedBill.balance).toLocaleString()})
                        </button>
                      )}
                    </div>
                    <input
                      required
                      type="number"
                      step="0.01"
                      max={Number(selectedBill.balance)}
                      value={paymentForm.amount_paid}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          amount_paid:
                            e.target.value === ""
                              ? ""
                              : parseFloat(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 text-sm font-mono font-bold rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-zinc-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                        Payment Method
                      </label>
                      <div className="py-2 px-3 text-xs rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-600 dark:text-zinc-400" />
                        <span>Cash</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                        Payment Date
                      </label>
                      <input
                        required
                        type="date"
                        value={paymentForm.payment_date}
                        onChange={(e) =>
                          setPaymentForm({
                            ...paymentForm,
                            payment_date: e.target.value,
                          })
                        }
                        className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-zinc-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsPayOpen(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Confirming...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirm</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Create Statement */}
        {isCreateOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3"
          >
            <motion.div
              initial={{ scale: 0.96, y: 8, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-slate-50/80 dark:bg-zinc-900/60">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Issue Single payment
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Generate a billing invoice with itemized utility charges.
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Tenant Selection */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      Tenant
                    </label>
                    <CustomSelect
                      value={billForm.tenant_id?.toString() || ""}
                      onChange={(val) => handleTenantSelect(val)}
                      options={[
                        { value: "", label: "Select Resident" },
                        ...tenants.map((t) => ({
                          value: t.id.toString(),
                          label: `${t.name} (Rm ${rooms.find((r) => r.id === t.room_id)?.room_number || "N/A"})`,
                        })),
                      ]}
                      className="py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 font-semibold"
                    />
                  </div>

                  {/* Billing Month */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      Billing Month
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. October 2026"
                      value={billForm.billing_month}
                      onChange={(e) =>
                        setBillForm({
                          ...billForm,
                          billing_month: e.target.value,
                        })
                      }
                      className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400/30 dark:focus:ring-zinc-600/40"
                    />
                  </div>

                  {/* Due Date */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      Due Date
                    </label>
                    <input
                      required
                      type="date"
                      value={billForm.due_date}
                      onChange={(e) =>
                        setBillForm({ ...billForm, due_date: e.target.value })
                      }
                      className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-slate-400/30 dark:focus:ring-zinc-600/40"
                    />
                  </div>
                </div>

                {/* Charges Breakdown */}
                <div className="border border-slate-200 dark:border-zinc-800 rounded-xl p-3 bg-slate-50/50 dark:bg-zinc-900/40 space-y-3">
                  <div className="text-xs font-bold uppercase text-slate-500">
                    Itemized Charges (₱)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                        Base Rent
                      </label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        value={billForm.rent_amount}
                        onChange={(e) =>
                          setBillForm({
                            ...billForm,
                            rent_amount: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full py-1.5 px-2 text-xs font-mono font-bold rounded-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-right"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                        Water
                      </label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        value={billForm.water_charges}
                        onChange={(e) =>
                          setBillForm({
                            ...billForm,
                            water_charges: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full py-1.5 px-2 text-xs font-mono font-bold rounded-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-right"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                        Electricity
                      </label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        value={billForm.electricity_charges}
                        onChange={(e) =>
                          setBillForm({
                            ...billForm,
                            electricity_charges:
                              parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full py-1.5 px-2 text-xs font-mono font-bold rounded-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-right"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                        Other Fees
                      </label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        value={billForm.other_fees}
                        onChange={(e) =>
                          setBillForm({
                            ...billForm,
                            other_fees: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full py-1.5 px-2 text-xs font-mono font-bold rounded-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-right"
                      />
                    </div>
                  </div>

                  {/*  Total Calculation */}
                  <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 dark:text-zinc-300">
                      Calculated Invoice Total:
                    </span>
                    <span className="text-base font-mono font-bold text-slate-900 dark:text-zinc-100">
                      ₱
                      {(
                        (Number(billForm.rent_amount) || 0) +
                        (Number(billForm.water_charges) || 0) +
                        (Number(billForm.electricity_charges) || 0) +
                        (Number(billForm.other_fees) || 0)
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>


                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 flex items-center gap-1.5 shadow-xs"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    <span>Create Invoice</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* EDIT INVOICE */}
        {isEditOpen && selectedBill && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3"
          >
            <motion.div
              initial={{ scale: 0.96, y: 8, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-slate-50/80 dark:bg-zinc-900/60">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Edit Invoice Charges
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    {formatInvoiceNumber(selectedBill)} for {selectedBill.tenant_name}
                  </p>
                </div>
                <button
                  onClick={() => setIsEditOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      Billing Month
                    </label>
                    <input
                      required
                      type="text"
                      value={billForm.billing_month}
                      onChange={(e) =>
                        setBillForm({
                          ...billForm,
                          billing_month: e.target.value,
                        })
                      }
                      className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      Due Date
                    </label>
                    <input
                      required
                      type="date"
                      value={billForm.due_date}
                      onChange={(e) =>
                        setBillForm({ ...billForm, due_date: e.target.value })
                      }
                      className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 font-semibold"
                    />
                  </div>
                </div>

                <div className="border border-slate-200 dark:border-zinc-800 rounded-xl p-3 bg-slate-50/50 dark:bg-zinc-900/40 space-y-3">
                  <div className="text-xs font-bold uppercase text-slate-500">
                    Adjust Charges (₱)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                        Rent
                      </label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        value={billForm.rent_amount}
                        onChange={(e) =>
                          setBillForm({
                            ...billForm,
                            rent_amount: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full py-1.5 px-2 text-xs font-mono font-bold rounded-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-right"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                        Water
                      </label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        value={billForm.water_charges}
                        onChange={(e) =>
                          setBillForm({
                            ...billForm,
                            water_charges: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full py-1.5 px-2 text-xs font-mono font-bold rounded-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-right"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                        Electricity
                      </label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        value={billForm.electricity_charges}
                        onChange={(e) =>
                          setBillForm({
                            ...billForm,
                            electricity_charges:
                              parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full py-1.5 px-2 text-xs font-mono font-bold rounded-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-right"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                        Other
                      </label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        value={billForm.other_fees}
                        onChange={(e) =>
                          setBillForm({
                            ...billForm,
                            other_fees: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full py-1.5 px-2 text-xs font-mono font-bold rounded-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-right"
                      />
                    </div>
                  </div>
                </div>


                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-xs"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* VERIFY ONLINE E-RECEIPTS (GCASH */}
        {isVerifyModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3"
          >
            <motion.div
              initial={{ scale: 0.96, y: 8, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-slate-50/80 dark:bg-zinc-900/60">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-500" />
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Digital Receipt Verification
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                      {pendingPayments.length} submission
                      {pendingPayments.length !== 1 ? "s" : ""} awaiting review
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsVerifyModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
                {pendingPayments.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
                    <p className="font-bold text-sm">
                      All caught up! No pending receipts.
                    </p>
                  </div>
                ) : (
                  (() => {
                    const safeIndex = Math.max(
                      0,
                      Math.min(currentVerifyIndex, pendingPayments.length - 1),
                    );
                    const payment = pendingPayments[safeIndex];

                    return (
                      <div className="space-y-4">
                        {/* Carousel Controls */}
                        <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                          <span>
                            Submission {safeIndex + 1} of{" "}
                            {pendingPayments.length}
                          </span>
                          <div className="flex gap-1.5">
                            <button
                              disabled={safeIndex === 0}
                              onClick={() =>
                                setCurrentVerifyIndex(safeIndex - 1)
                              }
                              className="px-2.5 py-1 bg-slate-100 dark:bg-zinc-800 rounded disabled:opacity-40"
                            >
                              Previous
                            </button>
                            <button
                              disabled={
                                safeIndex === pendingPayments.length - 1
                              }
                              onClick={() =>
                                setCurrentVerifyIndex(safeIndex + 1)
                              }
                              className="px-2.5 py-1 bg-slate-100 dark:bg-zinc-800 rounded disabled:opacity-40"
                            >
                              Next
                            </button>
                          </div>
                        </div>

                        {/* Split details & image */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div className="bg-slate-50 dark:bg-zinc-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-2 text-xs">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400">
                                  Resident
                                </span>
                                <div className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                                  {payment.tenant_name}
                                </div>
                                <div className="text-slate-500">
                                  Room {payment.room_number || "N/A"} ·{" "}
                                  {payment.billing_month}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-slate-400">
                                    Payment Method
                                  </span>
                                  <div className="font-bold text-slate-800 dark:text-zinc-200">
                                    {payment.payment_method}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-slate-400">
                                    Payment Date
                                  </span>
                                  <div className="font-bold text-slate-800 dark:text-zinc-200">
                                    {new Date(
                                      payment.payment_date,
                                    ).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>

                              <div className="pt-2 border-t border-slate-100 dark:border-zinc-800">
                                <span className="text-[10px] uppercase font-bold text-slate-400">
                                  Amount Claimed
                                </span>
                                <div className="text-2xl font-mono font-black text-emerald-600 dark:text-emerald-400">
                                  ₱
                                  {Number(payment.amount_paid).toLocaleString()}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  Bill Total: ₱
                                  {Number(payment.bill_total).toLocaleString()}
                                </div>
                              </div>

                              {(payment.reference_number || payment.notes) && (
                                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800">
                                  <span className="text-[10px] uppercase font-bold text-slate-400">
                                    GCash Reference Number
                                  </span>
                                  <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                                    {payment.reference_number ||
                                      (payment.notes
                                        ? payment.notes.replace(
                                            /^Ref[:#]?\s*/i,
                                            "",
                                          )
                                        : "N/A")}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  handleVerifyPayment(payment.id, "approve");
                                  if (safeIndex > 0)
                                    setCurrentVerifyIndex(safeIndex - 1);
                                }}
                                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
                              >
                                <Check className="w-4 h-4" />
                                <span>Approve Payment</span>
                              </button>
                              <button
                                onClick={() => {
                                  handleVerifyPayment(payment.id, "reject");
                                  if (safeIndex > 0)
                                    setCurrentVerifyIndex(safeIndex - 1);
                                }}
                                className="flex-1 py-2.5 rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 font-bold text-xs flex items-center justify-center gap-1.5"
                              >
                                <X className="w-4 h-4" />
                                <span>Reject Proof</span>
                              </button>
                            </div>
                          </div>

                          {/* Receipt Preview */}
                          <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-slate-100 dark:bg-zinc-900 flex items-center justify-center min-h-[260px]">
                            {payment.receipt_url ? (
                              <img
                                src={`http://localhost:5000${payment.receipt_url}`}
                                alt="Payment Receipt"
                                className="max-h-[340px] max-w-full object-contain cursor-zoom-in"
                                onClick={() =>
                                  window.open(
                                    `http://localhost:5000${payment.receipt_url}`,
                                    "_blank",
                                  )
                                }
                                title="Click to view full receipt"
                              />
                            ) : (
                              <div className="text-xs text-slate-400 font-semibold p-4 text-center">
                                No uploaded screenshot attachment found.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ADMIN REPORT MODAL */}
      <AdminReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
      />
    </div>
  );
}

export default function AdminBilling() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-[calc(100vh-6.2rem)] md:h-[calc(100vh-7.2rem)] lg:h-[calc(100dvh-7.2rem)] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-slate-300 dark:border-zinc-700 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      }
    >
      <BillingContent />
    </Suspense>
  );
}
