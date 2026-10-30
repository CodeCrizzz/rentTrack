"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  X,
  FileSpreadsheet,
  Printer,
  Download,
  RefreshCw,
  Search,
  Building2,
  DollarSign,
  AlertTriangle,
  Wrench,
  CheckCircle2,
  ArrowUpRight,
  ShieldAlert,
  Wallet,
  Layers,
  FileText,
  FileCheck,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { formatPhoneNumber } from "@/lib/phone-utils";
import DropdownSelect from "@/components/dropdown-select";

interface AdminReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export type ReportTab = "all" | "overview" | "financials" | "occupancy" | "delinquent" | "maintenance";

interface ReportMeta {
  propertyName: string;
  generatedAt: string;
  generatedBy: string;
  dateRange: string;
  rangeKey: string;
}

interface FinancialsData {
  totalBilled: number;
  totalCollected: number;
  outstandingBalance: number;
  collectionRate: number;
  rentTotal: number;
  waterTotal: number;
  electricityTotal: number;
  otherTotal: number;
  paymentCount: number;
  methodBreakdown: Array<{ method: string; count: string | number; total: string | number }>;
  ledger: Array<{
    id: number;
    reference_number: string;
    payment_date: string;
    payment_method: string;
    amount_paid: number;
    status: string;
    tenant_name: string;
    room_number: string;
    billing_month: string;
  }>;
}

interface OccupancyData {
  totalRooms: number;
  totalCapacity: number;
  totalOccupants: number;
  occupancyRate: number;
  occupiedRooms: number;
  partiallyOccupiedRooms: number;
  availableRooms: number;
  maintenanceRooms: number;
  rooms: Array<{
    id: number;
    room_number: string;
    type: string;
    rental_type: string;
    capacity: number;
    price: number;
    floor: number;
    status: string;
    current_occupants: number;
    occupants_list: string;
  }>;
}

interface OverdueData {
  count: number;
  totalOverdueBalance: number;
  accounts: Array<{
    bill_id: number;
    tenant_name: string;
    phone: string;
    room_number: string;
    billing_month: string;
    due_date: string;
    total_amount: number;
    amount_paid: number;
    balance: number;
    days_overdue: number;
  }>;
}

interface MaintenanceData {
  stats: {
    total?: string | number;
    resolved_count?: string | number;
    in_progress_count?: string | number;
    pending_count?: string | number;
    cancelled_count?: string | number;
  };
  tickets: Array<{
    id: number;
    request_number: string;
    title: string;
    category: string;
    priority: string;
    status: string;
    created_at: string;
    date_resolved: string | null;
    assigned_to: string | null;
    tenant_name: string;
    room_number: string;
  }>;
}

interface ReportData {
  meta: ReportMeta;
  financials: FinancialsData;
  occupancy: OccupancyData;
  overdue: OverdueData;
  maintenance: MaintenanceData;
}

const TABS: Array<{ id: ReportTab; label: string; icon: any }> = [
  { id: "all", label: "All Reports (Master)", icon: Layers },
  { id: "overview", label: "Executive Summary", icon: FileText },
  { id: "financials", label: "Financials & Cash Flow", icon: DollarSign },
  { id: "occupancy", label: "Rent Roll & Rooms", icon: Building2 },
  { id: "delinquent", label: "Delinquent Accounts", icon: AlertTriangle },
  { id: "maintenance", label: "Maintenance Audit", icon: Wrench },
];

export default function AdminReportModal({ isOpen, onClose }: AdminReportModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<ReportTab>("all");
  const [dateRange, setDateRange] = useState("this_month");
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [propertyProfile, setPropertyProfile] = useState({
    propertyName: "RentTrack Elite Residences & Dormitory",
    propertyAddress: "123 Katipunan Ave, Loyola Heights, Quezon City",
    contactPhone: "+63 917 123 4567",
    landlordName: "Property Management Office",
    taxId: "TIN: 432-891-002-000",
  });

  // Load custom settings from localStorage if configured by admin
  useEffect(() => {
    try {
      const stored = localStorage.getItem("renttrack_admin_settings");
      if (stored) {
        const parsed = JSON.parse(stored);
        setPropertyProfile((prev) => ({
          ...prev,
          propertyName: parsed.propertyName || prev.propertyName,
          propertyAddress: parsed.propertyAddress || prev.propertyAddress,
          contactPhone: parsed.contactPhone || prev.contactPhone,
          landlordName: parsed.landlordName || prev.landlordName,
          taxId: parsed.taxId || prev.taxId,
        }));
      }
    } catch (e) {
      console.error("Error reading admin profile settings", e);
    }
  }, [isOpen]);

  const fetchReport = async (range = dateRange) => {
    setIsLoading(true);
    try {
      const res = await api.get(`/admin/reports?range=${range}`);
      setReportData(res.data);
    } catch (error) {
      console.error("Failed to load report data:", error);
      toast.error("Failed to fetch report data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReport(dateRange);
    }
  }, [isOpen, dateRange]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Before & After Print listener to ensure searchFilter does not hide rows during printing
  useEffect(() => {
    let savedSearch = "";
    const handleBeforePrint = () => {
      savedSearch = searchFilter;
      if (searchFilter) setSearchFilter("");
    };
    const handleAfterPrint = () => {
      if (savedSearch) setSearchFilter(savedSearch);
    };
    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [searchFilter]);

  // CSV Export utility
  const handleExportCSV = (mode: "all" | "active" = "all") => {
    if (!reportData) {
      toast.error("No report data available to export.");
      return;
    }

    const rows: string[][] = [];
    const dateStamp = new Date().toISOString().split("T")[0];

    const clean = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    // Header Meta
    rows.push(["PROPERTY AUDIT REPORT"]);
    rows.push(["Property Name", reportData.meta.propertyName || propertyProfile.propertyName]);
    rows.push(["Property Address", propertyProfile.propertyAddress]);
    rows.push(["Date Range", reportData.meta.dateRange]);
    rows.push(["Generated At", new Date().toLocaleString()]);
    rows.push(["Generated By", reportData.meta.generatedBy]);
    rows.push([]);

    const shouldExportAll = mode === "all" || activeTab === "all";

    // Financials
    if (shouldExportAll || activeTab === "overview" || activeTab === "financials") {
      rows.push(["=== FINANCIAL SUMMARY & CASH FLOW ==="]);
      rows.push(["Metric", "Value"]);
      rows.push(["Total Billed In Period", `₱${reportData.financials.totalBilled.toLocaleString()}`]);
      rows.push(["Total Payments Collected", `₱${reportData.financials.totalCollected.toLocaleString()}`]);
      rows.push(["Outstanding Balance", `₱${reportData.financials.outstandingBalance.toLocaleString()}`]);
      rows.push(["Collection Efficiency", `${reportData.financials.collectionRate}%`]);
      rows.push(["Rent Component", `₱${reportData.financials.rentTotal.toLocaleString()}`]);
      rows.push(["Water Charges", `₱${reportData.financials.waterTotal.toLocaleString()}`]);
      rows.push(["Electricity Charges", `₱${reportData.financials.electricityTotal.toLocaleString()}`]);
      rows.push(["Other Fees", `₱${reportData.financials.otherTotal.toLocaleString()}`]);
      rows.push([]);

      rows.push(["--- PAYMENT METHODS BREAKDOWN ---"]);
      rows.push(["Payment Method", "Transaction Count", "Total Amount (PHP)"]);
      reportData.financials.methodBreakdown.forEach((m) => {
        rows.push([m.method, String(m.count), String(m.total)]);
      });
      rows.push([]);

      rows.push(["--- PAYMENT AUDIT LEDGER ---"]);
      rows.push(["Reference #", "Date", "Tenant Name", "Room", "Billing Month", "Method", "Amount Paid (PHP)", "Status"]);
      reportData.financials.ledger.forEach((p) => {
        rows.push([
          p.reference_number || `TXN-${p.id}`,
          p.payment_date ? new Date(p.payment_date).toLocaleDateString() : "-",
          p.tenant_name || "-",
          p.room_number || "-",
          p.billing_month || "-",
          p.payment_method || "-",
          String(p.amount_paid),
          p.status,
        ]);
      });
      rows.push([]);
    }

    // Occupancy
    if (shouldExportAll || activeTab === "overview" || activeTab === "occupancy") {
      rows.push(["=== RENT ROLL & OCCUPANCY ==="]);
      rows.push(["Total Rooms", String(reportData.occupancy.totalRooms)]);
      rows.push(["Total Bed Capacity", String(reportData.occupancy.totalCapacity)]);
      rows.push(["Current Occupants", String(reportData.occupancy.totalOccupants)]);
      rows.push(["Overall Occupancy Rate", `${reportData.occupancy.occupancyRate}%`]);
      rows.push(["Fully Occupied Rooms", String(reportData.occupancy.occupiedRooms)]);
      rows.push(["Partially Occupied Rooms", String(reportData.occupancy.partiallyOccupiedRooms)]);
      rows.push(["Vacant Available Rooms", String(reportData.occupancy.availableRooms)]);
      rows.push(["Under Maintenance", String(reportData.occupancy.maintenanceRooms)]);
      rows.push([]);

      rows.push(["--- ROOM INVENTORY DETAILS ---"]);
      rows.push(["Room #", "Type", "Rental Type", "Floor", "Capacity", "Occupants Count", "Monthly Price", "Status", "Current Occupants"]);
      reportData.occupancy.rooms.forEach((r) => {
        rows.push([
          r.room_number,
          r.type,
          r.rental_type,
          String(r.floor),
          String(r.capacity),
          String(r.current_occupants),
          String(r.price),
          r.status,
          r.occupants_list || "Vacant",
        ]);
      });
      rows.push([]);
    }

    // Delinquent Accounts
    if (shouldExportAll || activeTab === "overview" || activeTab === "delinquent") {
      rows.push(["=== DELINQUENT / OVERDUE ACCOUNTS ==="]);
      rows.push(["Total Delinquent Bills", String(reportData.overdue.count)]);
      rows.push(["Total Overdue Balance", `₱${reportData.overdue.totalOverdueBalance.toLocaleString()}`]);
      rows.push([]);

      rows.push(["--- OVERDUE TENANT LIST ---"]);
      rows.push(["Tenant Name", "Room #", "Phone Number", "Billing Month", "Due Date", "Days Overdue", "Total Billed", "Paid", "Balance Due"]);
      reportData.overdue.accounts.forEach((a) => {
        rows.push([
          a.tenant_name,
          a.room_number || "-",
          formatPhoneNumber(a.phone, "-"),
          a.billing_month,
          a.due_date ? new Date(a.due_date).toLocaleDateString() : "-",
          String(a.days_overdue),
          String(a.total_amount),
          String(a.amount_paid),
          String(a.balance),
        ]);
      });
      rows.push([]);
    }

    // Maintenance
    if (shouldExportAll || activeTab === "overview" || activeTab === "maintenance") {
      rows.push(["=== MAINTENANCE & WORK ORDERS ==="]);
      rows.push(["Total Requests", String(reportData.maintenance.stats.total || 0)]);
      rows.push(["Resolved", String(reportData.maintenance.stats.resolved_count || 0)]);
      rows.push(["In Progress", String(reportData.maintenance.stats.in_progress_count || 0)]);
      rows.push(["Pending", String(reportData.maintenance.stats.pending_count || 0)]);
      rows.push([]);

      rows.push(["--- RECENT WORK ORDERS ---"]);
      rows.push(["Ticket #", "Date Filed", "Tenant", "Room", "Category", "Priority", "Title", "Assigned To", "Status"]);
      reportData.maintenance.tickets.forEach((t) => {
        rows.push([
          t.request_number || `REQ-${t.id}`,
          t.created_at ? new Date(t.created_at).toLocaleDateString() : "-",
          t.tenant_name || "-",
          t.room_number || "-",
          t.category,
          t.priority,
          t.title,
          t.assigned_to || "Unassigned",
          t.status,
        ]);
      });
    }

    const csvContent = rows.map((r) => r.map(clean).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const filename = `RentTrack_Master_Report_${dateRange}_${dateStamp}.csv`;
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Report Exported", {
      description: `${filename} downloaded successfully.`,
    });
  };

  const handlePrint = () => {
    const currentSearch = searchFilter;
    if (currentSearch) {
      setSearchFilter("");
      setTimeout(() => {
        window.print();
        setTimeout(() => setSearchFilter(currentSearch), 600);
      }, 80);
    } else {
      window.print();
    }
  };

  // Filtered lists for quick search in active tab
  const filteredLedger = useMemo(() => {
    if (!reportData?.financials?.ledger) return [];
    if (!searchFilter.trim()) return reportData.financials.ledger;
    const q = searchFilter.toLowerCase();
    return reportData.financials.ledger.filter(
      (p) =>
        p.tenant_name?.toLowerCase().includes(q) ||
        p.room_number?.toLowerCase().includes(q) ||
        p.reference_number?.toLowerCase().includes(q) ||
        p.payment_method?.toLowerCase().includes(q)
    );
  }, [reportData, searchFilter]);

  const filteredRooms = useMemo(() => {
    if (!reportData?.occupancy?.rooms) return [];
    if (!searchFilter.trim()) return reportData.occupancy.rooms;
    const q = searchFilter.toLowerCase();
    return reportData.occupancy.rooms.filter(
      (r) =>
        r.room_number?.toLowerCase().includes(q) ||
        r.type?.toLowerCase().includes(q) ||
        r.occupants_list?.toLowerCase().includes(q) ||
        r.status?.toLowerCase().includes(q)
    );
  }, [reportData, searchFilter]);

  const filteredOverdue = useMemo(() => {
    if (!reportData?.overdue?.accounts) return [];
    if (!searchFilter.trim()) return reportData.overdue.accounts;
    const q = searchFilter.toLowerCase();
    return reportData.overdue.accounts.filter(
      (a) =>
        a.tenant_name?.toLowerCase().includes(q) ||
        a.room_number?.toLowerCase().includes(q) ||
        a.phone?.toLowerCase().includes(q)
    );
  }, [reportData, searchFilter]);

  const filteredTickets = useMemo(() => {
    if (!reportData?.maintenance?.tickets) return [];
    if (!searchFilter.trim()) return reportData.maintenance.tickets;
    const q = searchFilter.toLowerCase();
    return reportData.maintenance.tickets.filter(
      (t) =>
        t.title?.toLowerCase().includes(q) ||
        t.tenant_name?.toLowerCase().includes(q) ||
        t.room_number?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q) ||
        t.request_number?.toLowerCase().includes(q)
    );
  }, [reportData, searchFilter]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <>
      {/* Global CSS for Print View */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-report-area,
          #printable-report-area * {
            visibility: visible !important;
          }
          .report-modal-overlay {
            position: static !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            background: transparent !important;
            backdrop-filter: none !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            z-index: auto !important;
          }
          .report-modal-container {
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            background: #ffffff !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            transform: none !important;
          }
          #printable-report-area {
            position: relative !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            min-height: 0 !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            background: #ffffff !important;
            color: #0f172a !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
          }
          .report-print-section {
            display: block !important;
            visibility: visible !important;
          }
          .report-print-section * {
            visibility: visible !important;
          }
          .report-page-break {
            page-break-before: always !important;
            break-before: page !important;
            padding-top: 16px !important;
          }
          .report-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          thead {
            display: table-header-group !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-md font-sans text-slate-900 dark:text-zinc-100 report-modal-overlay">
        {/* Backdrop click */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 no-print"
          onClick={onClose}
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-6xl h-[94vh] max-h-[920px] rounded-2xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden z-10 report-modal-container"
        >
          {/* Header Bar */}
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/60 no-print">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                    Operational & Financial Master Report
                  </h2>
                  <span className="text-[10px] font-mono font-bold text-teal-600 dark:text-teal-400">
                    Official Hub
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-zinc-300 mt-0.5 font-medium">
                  Export verified cash flow, rent roll, delinquency audits, and work orders
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleExportCSV(activeTab === "all" ? "all" : "active")}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Export active view as CSV"
              >
                <Download className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={() => handleExportCSV("all")}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 shadow-xs transition-colors hidden sm:flex items-center gap-1.5 cursor-pointer"
                title="Export complete master report with all sections"
              >
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                <span>Full Audit CSV</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-teal-700 hover:bg-teal-800 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Print all report sections as an official master PDF or physical document"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print All Reports</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors ml-1 cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Controls Bar: Time Filter & Tabs */}
          <div className="shrink-0 px-5 py-3 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col md:flex-row md:items-center justify-between gap-3 no-print">
            {/* Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                      isActive
                        ? "bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
                        : "text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-900"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? "text-teal-600 dark:text-teal-400" : ""}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Right side: Range Selector & Refresh */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-40 sm:w-44 shrink-0">
                <DropdownSelect
                  value={dateRange}
                  onChange={(val) => setDateRange(val)}
                  options={[
                    { value: "this_month", label: "Current Month" },
                    { value: "last_month", label: "Previous Month" },
                    { value: "this_year", label: "Year-to-Date" },
                    { value: "all_time", label: "All-Time History" },
                  ]}
                  className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-zinc-200 focus:outline-none"
                />
              </div>

              {/* Quick Search */}
              {activeTab !== "overview" && (
                <div className="relative w-40 sm:w-48">
                  <Search className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search records..."
                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg pl-8 pr-2.5 py-1 text-xs text-slate-900 dark:text-zinc-100 placeholder:text-slate-500 dark:placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  {searchFilter && (
                    <button
                      type="button"
                      onClick={() => setSearchFilter("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => fetchReport(dateRange)}
                disabled={isLoading}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors disabled:opacity-50 cursor-pointer"
                title="Reload Report Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-teal-600" : ""}`} />
              </button>
            </div>
          </div>

          {/* Main Scrollable Report Content Area */}
          <div
            id="printable-report-area"
            className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 bg-slate-50/40 dark:bg-zinc-950"
          >
            {/* Printable Formal Letterhead (Visible in both PDF and screen) */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs report-avoid-break">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-zinc-800">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-teal-600 dark:text-teal-400 font-bold">
                    Official Property Audit Document
                  </span>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                    {reportData?.meta?.propertyName || propertyProfile.propertyName}
                  </h1>
                  <p className="text-xs text-slate-600 dark:text-zinc-300 mt-1 font-medium">
                    {propertyProfile.propertyAddress} • {propertyProfile.contactPhone}
                  </p>
                  <p className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 font-medium">
                    {propertyProfile.taxId}
                  </p>
                </div>

                <div className="text-left sm:text-right space-y-1">
                  <div className="inline-block px-2.5 py-1 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-semibold">
                    Scope: {reportData?.meta?.dateRange || "Current Month"}
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-zinc-300 font-medium">
                    Generated: {reportData?.meta?.generatedAt ? new Date(reportData.meta.generatedAt).toLocaleString() : new Date().toLocaleString()}
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-zinc-300 font-medium">
                    Prepared by: <span className="font-semibold text-slate-800 dark:text-zinc-200">{reportData?.meta?.generatedBy || "Administrator"}</span>
                  </p>
                </div>
              </div>

              {/* Status Ribbon Summary */}
              {reportData && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
                  <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400">
                      Total Collections
                    </span>
                    <div className="text-lg sm:text-xl font-extrabold font-mono text-emerald-800 dark:text-emerald-200 mt-0.5">
                      ₱{reportData.financials.totalCollected.toLocaleString()}
                    </div>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      {reportData.financials.collectionRate}% efficiency
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700 dark:text-blue-400">
                      Occupancy Rate
                    </span>
                    <div className="text-lg sm:text-xl font-extrabold font-mono text-blue-800 dark:text-blue-200 mt-0.5">
                      {reportData.occupancy.occupancyRate}%
                    </div>
                    <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                      {reportData.occupancy.totalOccupants} / {reportData.occupancy.totalCapacity} tenants
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 dark:text-amber-400">
                      Overdue Receivables
                    </span>
                    <div className="text-lg sm:text-xl font-extrabold font-mono text-amber-800 dark:text-amber-200 mt-0.5">
                      ₱{reportData.overdue.totalOverdueBalance.toLocaleString()}
                    </div>
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                      {reportData.overdue.count} delinquent bills
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-purple-700 dark:text-purple-400">
                      Maintenance Health
                    </span>
                    <div className="text-lg sm:text-xl font-extrabold font-mono text-purple-800 dark:text-purple-200 mt-0.5">
                      {reportData.maintenance.stats.resolved_count || 0} Resolved
                    </div>
                    <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                      {reportData.maintenance.stats.pending_count || 0} pending tickets
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Loading Skeleton */}
            {isLoading && !reportData && (
              <div className="p-12 flex flex-col items-center justify-center space-y-3 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800">
                <RefreshCw className="w-8 h-8 animate-spin text-teal-600" />
                <p className="text-xs font-semibold text-slate-500">Compiling multi-source reports and financial balances...</p>
              </div>
            )}

            {/* REPORT SECTIONS */}
            {reportData && (
              <>
                {/* =========================================================================
                    SECTION 1: EXECUTIVE SUMMARY
                    ========================================================================= */}
                <section
                  className={`report-print-section space-y-6 ${
                    activeTab === "all" || activeTab === "overview" ? "block" : "hidden"
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b-2 border-slate-800 dark:border-zinc-700">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-teal-600 no-print" />
                      <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-slate-900 dark:text-white">
                        Section 1: Executive Summary & Performance Indicators
                      </h2>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 font-medium">Part 1 of 5</span>
                  </div>

                  {/* 2-Column Split: Revenue Composition & Occupancy Split */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Revenue Composition */}
                    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs report-avoid-break">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-emerald-600" />
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Revenue & Billing Breakdown</h3>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-700 dark:text-zinc-300">
                          Total: ₱{reportData.financials.totalBilled.toLocaleString()}
                        </span>
                      </div>

                      <div className="space-y-3 mt-4">
                        {[
                          { label: "Base Rent", amount: reportData.financials.rentTotal, color: "bg-teal-500" },
                          { label: "Electricity Charges", amount: reportData.financials.electricityTotal, color: "bg-amber-500" },
                          { label: "Water Charges", amount: reportData.financials.waterTotal, color: "bg-blue-500" },
                          { label: "Other Fees / Penalties", amount: reportData.financials.otherTotal, color: "bg-purple-500" },
                        ].map((item, idx) => {
                          const pct =
                            reportData.financials.totalBilled > 0
                              ? Math.round((item.amount / reportData.financials.totalBilled) * 100)
                              : 0;
                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="font-semibold text-slate-700 dark:text-zinc-200">{item.label}</span>
                                <span className="font-mono font-bold text-slate-900 dark:text-white">
                                  ₱{item.amount.toLocaleString()} ({pct}%)
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                                <div className={`${item.color} h-full rounded-full`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-5 pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-600 dark:text-zinc-300 font-medium">
                        <span>Total Collections Completed:</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          ₱{reportData.financials.totalCollected.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Occupancy Status Distribution */}
                    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs report-avoid-break">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-blue-600" />
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Room Inventory & Capacity</h3>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-700 dark:text-zinc-300">
                          {reportData.occupancy.totalRooms} Total Rooms
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="p-3 rounded-lg border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
                          <span className="text-xs text-slate-600 dark:text-zinc-300 font-semibold">Total Capacity</span>
                          <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">
                            {reportData.occupancy.totalCapacity} Beds
                          </div>
                        </div>
                        <div className="p-3 rounded-lg border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
                          <span className="text-xs text-slate-600 dark:text-zinc-300 font-semibold">Current Occupants</span>
                          <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">
                            {reportData.occupancy.totalOccupants} Tenants
                          </div>
                        </div>
                        <div className="p-3 rounded-lg border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
                          <span className="text-xs text-slate-600 dark:text-zinc-300 font-semibold">Fully Occupied Rooms</span>
                          <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                            {reportData.occupancy.occupiedRooms} Rooms
                          </div>
                        </div>
                        <div className="p-3 rounded-lg border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
                          <span className="text-xs text-slate-600 dark:text-zinc-300 font-semibold">Vacant / Available</span>
                          <div className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
                            {reportData.occupancy.availableRooms} Rooms
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-600 dark:text-zinc-300 font-medium">
                        <span>Rooms in Maintenance:</span>
                        <span className="font-mono font-bold text-amber-600">
                          {reportData.occupancy.maintenanceRooms} Units
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Overdue Delinquency High-Priority Highlight */}
                  <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs report-avoid-break">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-rose-600" />
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Delinquency Attention Summary</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab("delinquent")}
                        className="text-xs text-teal-600 dark:text-teal-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer no-print"
                      >
                        <span>View all {reportData.overdue.count} accounts</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {reportData.overdue.accounts.length === 0 ? (
                      <div className="py-6 text-center text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                        ✓ All tenant accounts are in good standing! No overdue receivables in this billing cycle.
                      </div>
                    ) : (
                      <div className="overflow-x-auto mt-3">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 font-semibold">
                              <th className="py-2 px-3 font-semibold">Tenant Name</th>
                              <th className="py-2 px-3 font-semibold">Room</th>
                              <th className="py-2 px-3 font-semibold">Month</th>
                              <th className="py-2 px-3 font-semibold">Due Date</th>
                              <th className="py-2 px-3 font-semibold">Days Overdue</th>
                              <th className="py-2 px-3 font-semibold text-right">Balance Due</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                            {reportData.overdue.accounts.slice(0, 5).map((acc) => (
                              <tr key={acc.bill_id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
                                <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                                  {acc.tenant_name}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-slate-800 dark:text-zinc-200 font-medium">
                                  {acc.room_number || "-"}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 dark:text-zinc-300 font-medium">
                                  {acc.billing_month}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 dark:text-zinc-300 font-medium">
                                  {acc.due_date ? new Date(acc.due_date).toLocaleDateString() : "-"}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="inline-block text-[10px] font-bold text-rose-600 dark:text-rose-400">
                                    {acc.days_overdue} days late
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                                  ₱{Number(acc.balance).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </section>

                {/* =========================================================================
                    SECTION 2: FINANCIALS & CASH FLOW LEDGER
                    ========================================================================= */}
                <section
                  className={`report-print-section space-y-6 report-page-break ${
                    activeTab === "all" || activeTab === "financials" ? "block" : "hidden"
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b-2 border-slate-800 dark:border-zinc-700">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-600 no-print" />
                      <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-slate-900 dark:text-white">
                        Section 2: Financial Statements & Payment Transaction Ledger
                      </h2>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 font-medium">Part 2 of 5</span>
                  </div>

                  {/* Payment Methods Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 report-avoid-break">
                    {reportData.financials.methodBreakdown.map((m, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs"
                      >
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-600 dark:text-zinc-300">
                          {m.method}
                        </span>
                        <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">
                          ₱{Number(m.total).toLocaleString()}
                        </div>
                        <span className="text-[11px] text-slate-600 dark:text-zinc-300 font-medium">
                          {m.count} transactions
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Payments Ledger Table */}
                  <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Transaction Payment Ledger</h3>
                        <p className="text-xs text-slate-600 dark:text-zinc-300 font-medium">
                          Showing {filteredLedger.length} verified payment entries{" "}
                          {searchFilter ? `(filtered by "${searchFilter}")` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-emerald-600 block">Total Ledger Revenue</span>
                        <span className="text-sm font-extrabold font-mono text-emerald-700 dark:text-emerald-400">
                          ₱{reportData.financials.totalCollected.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {filteredLedger.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-500 dark:text-zinc-400">
                        No payment transactions recorded for this period.
                      </div>
                    ) : (
                      <div className="overflow-x-auto mt-3">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 font-semibold">
                              <th className="py-2.5 px-3 font-semibold">Ref Number</th>
                              <th className="py-2.5 px-3 font-semibold">Date</th>
                              <th className="py-2.5 px-3 font-semibold">Tenant</th>
                              <th className="py-2.5 px-3 font-semibold">Room</th>
                              <th className="py-2.5 px-3 font-semibold">Billing Period</th>
                              <th className="py-2.5 px-3 font-semibold">Method</th>
                              <th className="py-2.5 px-3 font-semibold text-right">Amount</th>
                              <th className="py-2.5 px-3 font-semibold">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                            {filteredLedger.map((p) => (
                              <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
                                <td className="py-2.5 px-3 font-mono font-medium text-slate-700 dark:text-zinc-300">
                                  {p.reference_number || `TXN-${p.id}`}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 dark:text-zinc-300 font-medium">
                                  {p.payment_date ? new Date(p.payment_date).toLocaleDateString() : "-"}
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                                  {p.tenant_name}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-slate-800 dark:text-zinc-200 font-medium">
                                  {p.room_number || "-"}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 dark:text-zinc-300 font-medium">
                                  {p.billing_month || "-"}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="inline-block text-[10px] font-semibold text-slate-700 dark:text-zinc-300">
                                    {p.payment_method || "Cash"}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                  ₱{Number(p.amount_paid).toLocaleString()}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                                    <CheckCircle2 className="w-3 h-3" />
                                    {p.status || "Completed"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </section>

                {/* =========================================================================
                    SECTION 3: RENT ROLL & ROOM INVENTORY
                    ========================================================================= */}
                <section
                  className={`report-print-section space-y-6 report-page-break ${
                    activeTab === "all" || activeTab === "occupancy" ? "block" : "hidden"
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b-2 border-slate-800 dark:border-zinc-700">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-600 no-print" />
                      <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-slate-900 dark:text-white">
                        Section 3: Rent Roll & Room Inventory Directory
                      </h2>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 font-medium">Part 3 of 5</span>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Rent Roll & Census</h3>
                        <p className="text-xs text-slate-600 dark:text-zinc-300 font-medium">
                          {filteredRooms.length} rooms listed with active occupants and monthly tariffs
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-blue-600 block">Occupancy Census</span>
                        <span className="text-sm font-extrabold font-mono text-blue-700 dark:text-blue-400">
                          {reportData.occupancy.totalOccupants} / {reportData.occupancy.totalCapacity} Beds ({reportData.occupancy.occupancyRate}%)
                        </span>
                      </div>
                    </div>

                    {filteredRooms.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-500 dark:text-zinc-400">
                        No room inventory records found.
                      </div>
                    ) : (
                      <div className="overflow-x-auto mt-3">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 font-semibold">
                              <th className="py-2.5 px-3 font-semibold">Room #</th>
                              <th className="py-2.5 px-3 font-semibold">Type</th>
                              <th className="py-2.5 px-3 font-semibold">Floor</th>
                              <th className="py-2.5 px-3 font-semibold">Capacity</th>
                              <th className="py-2.5 px-3 font-semibold">Occupancy Status</th>
                              <th className="py-2.5 px-3 font-semibold">Occupant Names</th>
                              <th className="py-2.5 px-3 font-semibold text-right">Monthly Rent</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                            {filteredRooms.map((r) => {
                              const isFull = r.current_occupants >= r.capacity;
                              const isVacant = r.current_occupants === 0;
                              return (
                                <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
                                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                                    {r.room_number}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-700 dark:text-zinc-200 font-medium">{r.type}</td>
                                  <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-zinc-300 font-medium">Floor {r.floor}</td>
                                  <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-zinc-200 font-medium">
                                    {r.current_occupants} / {r.capacity} beds
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span
                                      className={`inline-block text-[10px] font-bold ${
                                        r.status === "Maintenance"
                                          ? "text-amber-600 dark:text-amber-400"
                                          : isFull
                                          ? "text-emerald-600 dark:text-emerald-400"
                                          : isVacant
                                          ? "text-slate-600 dark:text-zinc-400"
                                          : "text-blue-600 dark:text-blue-400"
                                      }`}
                                    >
                                      {r.status === "Maintenance" ? "Maintenance" : isFull ? "Fully Occupied" : isVacant ? "Vacant" : "Partial"}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-700 dark:text-zinc-300 font-medium">
                                    {r.occupants_list || "Vacant"}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                                    ₱{Number(r.price).toLocaleString()}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </section>

                {/* =========================================================================
                    SECTION 4: DELINQUENT ACCOUNTS SCHEDULE
                    ========================================================================= */}
                <section
                  className={`report-print-section space-y-6 report-page-break ${
                    activeTab === "all" || activeTab === "delinquent" ? "block" : "hidden"
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b-2 border-slate-800 dark:border-zinc-700">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 no-print" />
                      <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-slate-900 dark:text-white">
                        Section 4: Delinquent & Overdue Accounts Schedule
                      </h2>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 font-medium">Part 4 of 5</span>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          Delinquent / Overdue Accounts Schedule
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-zinc-300 font-medium">
                          {filteredOverdue.length} delinquent accounts with unpaid balances
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-rose-500 block">Total Overdue Receivables</span>
                        <span className="text-base font-extrabold font-mono text-rose-600 dark:text-rose-400">
                          ₱{reportData.overdue.totalOverdueBalance.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {filteredOverdue.length === 0 ? (
                      <div className="py-8 text-center text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg border border-emerald-100 dark:border-emerald-800/40">
                        ✓ All tenant accounts are in good standing! No overdue receivables in this billing period.
                      </div>
                    ) : (
                      <div className="overflow-x-auto mt-3">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 font-semibold">
                              <th className="py-2.5 px-3 font-semibold">Tenant Name</th>
                              <th className="py-2.5 px-3 font-semibold">Room</th>
                              <th className="py-2.5 px-3 font-semibold">Contact #</th>
                              <th className="py-2.5 px-3 font-semibold">Billing Month</th>
                              <th className="py-2.5 px-3 font-semibold">Due Date</th>
                              <th className="py-2.5 px-3 font-semibold">Days Overdue</th>
                              <th className="py-2.5 px-3 font-semibold text-right">Total Billed</th>
                              <th className="py-2.5 px-3 font-semibold text-right">Amount Paid</th>
                              <th className="py-2.5 px-3 font-semibold text-right">Balance Due</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                            {filteredOverdue.map((acc) => (
                              <tr key={acc.bill_id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
                                <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                                  {acc.tenant_name}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-slate-800 dark:text-zinc-200 font-medium">
                                  {acc.room_number || "-"}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-zinc-300 font-medium">
                                  {formatPhoneNumber(acc.phone, "-")}
                                </td>
                                <td className="py-2.5 px-3 text-slate-700 dark:text-zinc-300 font-medium">{acc.billing_month}</td>
                                <td className="py-2.5 px-3 text-slate-600 dark:text-zinc-300 font-medium">
                                  {acc.due_date ? new Date(acc.due_date).toLocaleDateString() : "-"}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="inline-block text-[10px] font-bold text-rose-600 dark:text-rose-400">
                                    {acc.days_overdue} days
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-zinc-300 font-medium">
                                  ₱{Number(acc.total_amount).toLocaleString()}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                                  ₱{Number(acc.amount_paid).toLocaleString()}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                                  ₱{Number(acc.balance).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </section>

                {/* =========================================================================
                    SECTION 5: MAINTENANCE & WORK ORDERS
                    ========================================================================= */}
                <section
                  className={`report-print-section space-y-6 report-page-break ${
                    activeTab === "all" || activeTab === "maintenance" ? "block" : "hidden"
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b-2 border-slate-800 dark:border-zinc-700">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-purple-600 no-print" />
                      <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-slate-900 dark:text-white">
                        Section 5: Maintenance Health & Work Orders Audit
                      </h2>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 font-medium">Part 5 of 5</span>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 report-avoid-break">
                    <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-600 dark:text-zinc-300">
                        Total Requests
                      </span>
                      <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                        {reportData.maintenance.stats.total || 0}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600">
                        Resolved
                      </span>
                      <div className="text-xl font-bold font-mono text-emerald-600 mt-1">
                        {reportData.maintenance.stats.resolved_count || 0}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600">
                        In Progress
                      </span>
                      <div className="text-xl font-bold font-mono text-blue-600 mt-1">
                        {reportData.maintenance.stats.in_progress_count || 0}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600">
                        Pending Action
                      </span>
                      <div className="text-xl font-bold font-mono text-amber-600 mt-1">
                        {reportData.maintenance.stats.pending_count || 0}
                      </div>
                    </div>
                  </div>

                  {/* Tickets Table */}
                  <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Maintenance Work Order Ledger</h3>
                        <p className="text-xs text-slate-600 dark:text-zinc-300 font-medium">
                          {filteredTickets.length} tickets recorded
                        </p>
                      </div>
                    </div>

                    {filteredTickets.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-500 dark:text-zinc-400">
                        No maintenance requests recorded for this period.
                      </div>
                    ) : (
                      <div className="overflow-x-auto mt-3">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 font-semibold">
                              <th className="py-2.5 px-3 font-semibold">Ticket #</th>
                              <th className="py-2.5 px-3 font-semibold">Date Filed</th>
                              <th className="py-2.5 px-3 font-semibold">Tenant</th>
                              <th className="py-2.5 px-3 font-semibold">Room</th>
                              <th className="py-2.5 px-3 font-semibold">Category</th>
                              <th className="py-2.5 px-3 font-semibold">Priority</th>
                              <th className="py-2.5 px-3 font-semibold">Issue Title</th>
                              <th className="py-2.5 px-3 font-semibold">Assigned To</th>
                              <th className="py-2.5 px-3 font-semibold">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                            {filteredTickets.map((t) => (
                              <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
                                <td className="py-2.5 px-3 font-mono font-medium text-slate-700 dark:text-zinc-300">
                                  {t.request_number || `REQ-${t.id}`}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 dark:text-zinc-300 font-medium">
                                  {t.created_at ? new Date(t.created_at).toLocaleDateString() : "-"}
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                                  {t.tenant_name || "-"}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-slate-800 dark:text-zinc-200 font-medium">
                                  {t.room_number || "-"}
                                </td>
                                <td className="py-2.5 px-3 text-slate-700 dark:text-zinc-200 font-medium">{t.category}</td>
                                <td className="py-2.5 px-3">
                                  <span
                                    className={`inline-block text-[10px] font-bold ${
                                      t.priority === "Urgent"
                                        ? "text-rose-600 dark:text-rose-400"
                                        : t.priority === "High"
                                        ? "text-amber-600 dark:text-amber-400"
                                        : "text-slate-600 dark:text-zinc-400"
                                    }`}
                                  >
                                    {t.priority}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-zinc-200">
                                  {t.title}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 dark:text-zinc-300 font-medium">
                                  {t.assigned_to || "Unassigned"}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span
                                    className={`inline-block text-[10px] font-bold ${
                                      t.status === "Resolved"
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : t.status === "In Progress"
                                        ? "text-blue-600 dark:text-blue-400"
                                        : "text-amber-600 dark:text-amber-400"
                                    }`}
                                  >
                                    {t.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </section>

                {/* =========================================================================
                    SECTION 6: OFFICIAL CERTIFICATION & SIGN-OFF
                    ========================================================================= */}
                <div className="report-print-section pt-8 mt-6 border-t-2 border-slate-900 dark:border-zinc-700 report-avoid-break">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="max-w-md">
                      <div className="flex items-center gap-2 mb-1">
                        <FileCheck className="w-4 h-4 text-teal-600 no-print" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                          Certified System Audit Statement
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed font-medium">
                        This document contains the certified operational, tenant occupancy, delinquency, maintenance, and cash flow records generated from the RentTrack Management Information System for <span className="font-semibold text-slate-800 dark:text-zinc-200">{reportData?.meta?.dateRange || "the selected billing cycle"}</span>.
                      </p>
                    </div>

                    <div className="flex items-center gap-10 pt-4 sm:pt-0">
                      <div className="text-center min-w-[140px]">
                        <div className="border-b border-slate-400 dark:border-zinc-600 pb-1 mb-1.5 font-mono text-xs font-bold text-slate-900 dark:text-zinc-100">
                          {reportData?.meta?.generatedBy || "Administrator"}
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-semibold block">
                          Prepared By (Admin)
                        </span>
                      </div>

                      <div className="text-center min-w-[140px]">
                        <div className="border-b border-slate-400 dark:border-zinc-600 pb-1 mb-1.5 font-mono text-xs font-bold text-slate-900 dark:text-zinc-100">
                          {propertyProfile.landlordName || "Property Manager"}
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-semibold block">
                          Authorized Officer
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </>,
    document.body
  );
}
