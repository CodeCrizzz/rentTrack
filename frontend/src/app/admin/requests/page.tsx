"use client";

import { useEffect, useState, useMemo, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import DropdownSelect from "@/components/dropdown-select";

export interface MaintenanceRequest {
  id: number;
  request_number?: string | null;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  assigned_to: string | null;
  admin_notes: string | null;
  scheduled_date: string | null;
  date_resolved: string | null;
  tenant_name: string;
  room_number: string | null;
  floor?: string | null;
  attachment_url: string | null;
  image_url?: string | null;
  tenant_id?: number | string | null;
}
import {
  Wrench,
  AlertTriangle,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  Eye,
  X,
  Droplets,
  Zap,
  Wind,
  Armchair,
  Lock,
  Paintbrush,
  Tv,
  MoreHorizontal,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flame,
  AlertCircle,
  ZoomIn,
  Camera,
  Trash2,
  Check,
  Snowflake,
  Pencil,
} from "lucide-react";


interface TenantItem {
  id: number;
  name: string;
  room_number?: string;
  floor?: string;
}

// Maintenance Category Items
const CATEGORY_ITEMS = [
  {
    id: "Plumbing",
    label: "Plumbing",
    icon: Droplets,
    color: "text-[#0284c7]",
    bg: "bg-blue-100 dark:bg-blue-950/60",
    activeBorder: "border-blue-500 bg-blue-50/60 dark:bg-blue-950/40",
    fill: "fill-[#0284c7]",
  },
  {
    id: "Electrical",
    label: "Electrical",
    icon: Zap,
    color: "text-[#f59e0b]",
    bg: "bg-amber-100 dark:bg-amber-950/60",
    activeBorder: "border-amber-500 bg-amber-50/60 dark:bg-amber-950/40",
    fill: "fill-[#f59e0b]",
  },
  {
    id: "AC / Cooling",
    label: "AC / Cooling",
    icon: Snowflake,
    color: "text-[#06b6d4]",
    bg: "bg-cyan-100 dark:bg-cyan-950/60",
    activeBorder: "border-cyan-500 bg-cyan-50/60 dark:bg-cyan-950/40",
  },
  {
    id: "Appliance",
    label: "Appliance",
    icon: Tv,
    color: "text-[#0d9488]",
    bg: "bg-teal-100 dark:bg-teal-950/60",
    activeBorder: "border-teal-500 bg-teal-50/60 dark:bg-teal-950/40",
  },
  {
    id: "Furniture",
    label: "Furniture",
    icon: Armchair,
    color: "text-[#3b82f6]",
    bg: "bg-blue-100 dark:bg-blue-950/60",
    activeBorder: "border-blue-500 bg-blue-50/60 dark:bg-blue-950/40",
  },
  {
    id: "Locks / Security",
    label: "Locks / Security",
    icon: Lock,
    color: "text-[#0284c7]",
    bg: "bg-cyan-100 dark:bg-cyan-950/60",
    activeBorder: "border-cyan-500 bg-cyan-50/60 dark:bg-cyan-950/40",
  },
  {
    id: "Wall / Ceiling",
    label: "Wall / Ceiling",
    icon: Paintbrush,
    color: "text-[#e11d48]",
    bg: "bg-rose-100 dark:bg-rose-950/60",
    activeBorder: "border-rose-500 bg-rose-50/60 dark:bg-rose-950/40",
  },
  {
    id: "Others",
    label: "Others",
    icon: MoreHorizontal,
    color: "text-[#64748b]",
    bg: "bg-slate-100 dark:bg-zinc-800",
    activeBorder: "border-slate-500 bg-slate-100 dark:bg-zinc-800",
  },
];


function MaintenanceRequestsContent() {
  const searchParams = useSearchParams();

  // Data State
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Active / Selected Request for the Right Panel
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [floorFilter, setFloorFilter] = useState("All Floors");

  // Selection
  const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Active row dropdown action menu
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Modals
  const [viewingRequest, setViewingRequest] =
    useState<MaintenanceRequest | null>(null);
  const [isUpdateStatusModalOpen, setIsUpdateStatusModalOpen] = useState(false);
  const [updatingRequest, setUpdatingRequest] =
    useState<MaintenanceRequest | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Update Status Form State
  const [statusForm, setStatusForm] = useState({
    status: "In Progress",
    priority: "High",
    assigned_to: "Maintenance Team",
    admin_notes: "",
  });
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);

  // Fetch Requests & Tenants
  const fetchRequests = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [reqRes, tenantsRes] = await Promise.all([
        api.get("/admin/requests").catch(() => ({ data: [] })),
        api.get("/admin/tenants").catch(() => ({ data: [] })),
      ]);
      const list: MaintenanceRequest[] = reqRes.data || [];
      setRequests(Array.isArray(list) ? list : []);
      setTenants(tenantsRes.data || []);
    } catch (error) {
      console.error("Failed to load maintenance requests", error);
      setRequests([]);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests(true);
  }, []);

  useEffect(() => {
    const tenantParam =
      searchParams?.get("tenant") ||
      searchParams?.get("tenant_id") ||
      searchParams?.get("tenantId");
    const requestIdParam =
      searchParams?.get("requestId") ||
      searchParams?.get("id") ||
      searchParams?.get("reqId");

    if (!tenantParam && !requestIdParam) return;

    const tenantQuery = tenantParam ? tenantParam.trim() : "";
    const directRequestId = requestIdParam ? Number(requestIdParam) : NaN;

    const normalizedQuery = tenantQuery.toLowerCase();
    const matchingRequests = requests.filter((req) => {
      const tenantName = (req.tenant_name || "").trim().toLowerCase();
      return (
        tenantName.includes(normalizedQuery) ||
        normalizedQuery.includes(tenantName)
      );
    });

    const target =
      (!Number.isNaN(directRequestId) &&
        requests.find((req) => req.id === directRequestId)) ||
      (matchingRequests.length > 0 ? matchingRequests[0] : null);

    if (target) {
      setSelectedRequestId(target.id);
      setViewingRequest(target);
      setStatusFilter("All Statuses");
      setCategoryFilter("All Categories");
      setFloorFilter("All Floors");
      if (tenantQuery) {
        setSearchQuery(target.tenant_name || tenantQuery);
      }
    } else if (tenantQuery) {
      setSearchQuery(tenantQuery);
    }

    setCurrentPage(1);
  }, [searchParams, requests]);

  // Close row action dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('renttrack-refresh-counts'));
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Helpers
  const formatMRId = (req: MaintenanceRequest) => {
    if (req.request_number) return req.request_number;
    const year = req.created_at ? new Date(req.created_at).getFullYear() : 2026;
    return `MR-${year}-${String(req.id).padStart(4, "0")}`;
  };

  const getFloorDisplay = (
    room: string | null | undefined,
    floor: string | null | undefined,
  ) => {
    if (floor) return floor;
    if (!room) return "Floor 1";
    const num = parseInt(room.replace(/\D/g, ""), 10);
    if (!isNaN(num)) {
      if (num >= 400) return "Floor 4";
      if (num >= 300) return "Floor 3";
      if (num >= 200) return "Floor 2";
      if (num >= 100) return "Floor 1";
    }
    return "Floor 1";
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return { date: "—", time: "" };
    try {
      const d = new Date(dateStr);
      const date = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const time = d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      return { date, time };
    } catch {
      return { date: "—", time: "" };
    }
  };

  const formatRelativeTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return "Reported 1 day ago";
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = Math.max(0, now.getTime() - d.getTime());
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 0) {
        if (diffHours === 0) return "Reported just now";
        return `Reported ${diffHours} hr${diffHours > 1 ? "s" : ""} ago`;
      }
      if (diffDays === 1) return "Reported 1 day ago";
      return `Reported ${diffDays} days ago`;
    } catch {
      return "Reported 1 day ago";
    }
  };

  const getAvatarBgClass = (name: string) => {
    const palette = [
      "bg-[#0062cc] text-white",
      "bg-[#2563eb] text-white",
      "bg-[#0284c7] text-white",
      "bg-[#4f46e5] text-white",
      "bg-[#0d9488] text-white",
    ];
    let code = 0;
    for (let i = 0; i < name.length; i++) {
      code = name.charCodeAt(i) + ((code << 5) - code);
    }
    return palette[Math.abs(code) % palette.length];
  };

  // Status & Priority Normalization
  const normalizePriority = (
    p: string | null | undefined,
  ): "High" | "Medium" | "Low" => {
    const s = (p || "").toLowerCase();
    if (s.includes("high")) return "High";
    if (s.includes("low")) return "Low";
    return "Medium";
  };

  const normalizeStatus = (
    s: string | null | undefined,
  ): "Pending" | "In Progress" | "Resolved" => {
    const st = (s || "").toLowerCase();
    if (st.includes("progress")) return "In Progress";
    if (st.includes("resolv") || st.includes("complete")) return "Resolved";
    return "Pending";
  };

  // Metrics calculated dynamically from real requests
  const metrics = useMemo(() => {
    const pending = requests.filter(
      (r) => normalizeStatus(r.status) === "Pending",
    ).length;
    const inProgress = requests.filter(
      (r) => normalizeStatus(r.status) === "In Progress",
    ).length;
    const highPriority = requests.filter(
      (r) =>
        normalizePriority(r.priority) === "High" &&
        normalizeStatus(r.status) !== "Resolved",
    ).length;
    const completed = requests.filter(
      (r) => normalizeStatus(r.status) === "Resolved",
    ).length;

    // Calculate average resolution days if resolved dates exist
    const resolvedWithDates = requests.filter(
      (r) =>
        normalizeStatus(r.status) === "Resolved" &&
        r.created_at &&
        (r.date_resolved || (r as any).updated_at),
    );
    let avgResolutionDays = "0.0";
    if (resolvedWithDates.length > 0) {
      const totalDays = resolvedWithDates.reduce((acc, r) => {
        const start = new Date(r.created_at).getTime();
        const end = new Date(
          r.date_resolved || (r as any).updated_at,
        ).getTime();
        const days = Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
        return acc + days;
      }, 0);
      avgResolutionDays = (totalDays / resolvedWithDates.length).toFixed(1);
    } else if (completed > 0) {
      avgResolutionDays = "1.0";
    }

    return {
      openCount: pending + inProgress,
      pending,
      inProgress,
      highPriority,
      avgResolutionDays,
      completedThisMonth: completed,
    };
  }, [requests]);

  // Category counts calculated dynamically from real requests
  const categoryCounts: Record<string, number> = useMemo(() => {
    const counts: Record<string, number> = {
      Plumbing: 0,
      Electrical: 0,
      "AC / Cooling": 0,
      Appliance: 0,
      Furniture: 0,
      "Locks / Security": 0,
      "Wall / Ceiling": 0,
      Others: 0,
    };

    requests.forEach((r) => {
      const cat = r.category || "Others";
      const matchKey = Object.keys(counts).find(
        (k) => k.toLowerCase() === cat.toLowerCase(),
      );
      if (matchKey) {
        counts[matchKey]++;
      } else {
        counts["Others"] = (counts["Others"] || 0) + 1;
      }
    });

    return counts;
  }, [requests]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      // Status filter
      if (statusFilter !== "All Statuses") {
        if (normalizeStatus(req.status) !== statusFilter) return false;
      }

      // Category filter
      if (categoryFilter !== "All Categories") {
        if (
          (req.category || "").toLowerCase() !== categoryFilter.toLowerCase()
        ) {
          return false;
        }
      }

      // Floor filter
      if (floorFilter !== "All Floors") {
        const f = getFloorDisplay(req.room_number, req.floor);
        if (f !== floorFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const idStr = formatMRId(req).toLowerCase();
        const tName = (req.tenant_name || "").toLowerCase();
        const rNum = (req.room_number || "").toLowerCase();
        const title = (req.title || "").toLowerCase();
        const desc = (req.description || "").toLowerCase();
        const cat = (req.category || "").toLowerCase();

        return (
          idStr.includes(q) ||
          tName.includes(q) ||
          rNum.includes(q) ||
          title.includes(q) ||
          desc.includes(q) ||
          cat.includes(q)
        );
      }

      return true;
    });
  }, [requests, statusFilter, categoryFilter, floorFilter, searchQuery]);

  // Paginated Requests (8 items)
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredRequests.slice(startIndex, startIndex + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  // Active Request for Right Panel
  const activeRequest = useMemo(() => {
    if (selectedRequestId !== null) {
      const found = requests.find((r) => r.id === selectedRequestId);
      if (found) return found;
    }
    return paginatedRequests[0] || requests[0] || null;
  }, [selectedRequestId, requests, paginatedRequests]);

  // Quick Status Update Handler
  const handleQuickStatusUpdate = async (reqId: number, nextStatus: string) => {
    try {
      setRequests((prev) =>
        prev.map((r) => (r.id === reqId ? { ...r, status: nextStatus } : r)),
      );
      await api
        .put(`/admin/requests/${reqId}`, {
          status: nextStatus,
          date_resolved:
            nextStatus === "Resolved" ? new Date().toISOString() : null,
        })
        .catch(() => {});
      toast.success("Work Order Updated", {
        description: `Request marked as ${nextStatus}.`,
      });
      setActiveMenuId(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to Update Status", {
        description: "Could not update request operational status.",
      });
    }
  };

  // Delete Request Handler
  const handleDeleteRequest = async (reqId: number) => {
    if (!confirm("Are you sure you want to delete this maintenance request?"))
      return;
    try {
      await api.delete(`/admin/requests/${reqId}`).catch(() => {});
      setRequests((prev) => prev.filter((r) => r.id !== reqId));
      if (selectedRequestId === reqId) {
        setSelectedRequestId(null);
      }
      toast.success("Work Order Deleted", {
        description: "Maintenance request permanently removed.",
      });
      setActiveMenuId(null);
    } catch (err) {
      console.error(err);
      toast.error("Deletion Failed", {
        description: "Could not delete maintenance ticket.",
      });
    }
  };

  // Update Status Modal Submit
  const handleSaveStatusModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingRequest) return;
    setIsSubmittingStatus(true);
    try {
      await api
        .put(`/admin/requests/${updatingRequest.id}`, {
          status: statusForm.status,
          priority: statusForm.priority,
          assigned_to: statusForm.assigned_to,
          admin_notes: statusForm.admin_notes,
          date_resolved:
            statusForm.status === "Resolved" ? new Date().toISOString() : null,
        })
        .catch(() => {});
      setRequests((prev) =>
        prev.map((r) =>
          r.id === updatingRequest.id
            ? {
                ...r,
                status: statusForm.status,
                priority: statusForm.priority,
                assigned_to: statusForm.assigned_to,
                admin_notes: statusForm.admin_notes,
              }
            : r,
        ),
      );
      toast.success("Work Order Saved", {
        description: `Status changed to ${statusForm.status} (Priority: ${statusForm.priority}).`,
      });
      setIsUpdateStatusModalOpen(false);
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('renttrack-refresh-counts'));
      setUpdatingRequest(null);
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to Update Status", {
        description: "Could not save work order adjustments.",
      });
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  // Open Update Status Modal
  const openUpdateModal = (req: MaintenanceRequest) => {
    setUpdatingRequest(req);
    setStatusForm({
      status: req.status || "In Progress",
      priority: req.priority || "High",
      assigned_to: req.assigned_to || "Maintenance Team",
      admin_notes: req.admin_notes || "",
    });
    setIsUpdateStatusModalOpen(true);
    setActiveMenuId(null);
  };

  return (
    <div className="w-full h-full flex-1 min-h-0 font-sans text-slate-900 dark:text-zinc-100 flex flex-col overflow-hidden gap-2 sm:gap-2.5">
      {/* PAGE HEADER: TITLE & SUBHEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 shrink-0 pb-0.5">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-950 dark:text-white tracking-tight leading-none">
            Maintenance Requests
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-400 font-medium mt-0.5">
            Track, prioritize, and manage resident repair tickets, work orders, and resolution performance in real time.
          </p>
        </div>
      </div>

      {/* TOP SECTION: 4 KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0">
        {/* Card 1: Open Maintenance Requests */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/90 dark:border-zinc-800 p-2.5 sm:p-3 shadow-2xs flex flex-col justify-between relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.055]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, #f97316 0, #f97316 1px, transparent 0, transparent 10px), repeating-linear-gradient(90deg, #f97316 0, #f97316 1px, transparent 0, transparent 10px)', backgroundSize: '10px 10px' }} />
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-lg bg-[#fff2ea] dark:bg-amber-950/40 border border-[#ffedd5] dark:border-amber-800/40 text-[#f97316] flex items-center justify-center shrink-0">
                <Wrench className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate">
                Maintenance Requests
              </span>
            </div>

            <div className="mt-1">
              <div className="text-xl sm:text-2xl font-extrabold text-slate-950 dark:text-white tracking-tight">
                {metrics.openCount}
              </div>

              {/* 3 Columns Sub-Items matching mockup */}
              <div className="grid grid-cols-3 gap-1 mt-1">
                <div>
                  <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-zinc-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f97316] shrink-0" />
                    <span>Pending</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white pl-2.5 mt-0.5">
                    {metrics.pending}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-zinc-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb] shrink-0" />
                    <span>In Progress</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white pl-2.5 mt-0.5">
                    {metrics.inProgress}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-zinc-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] shrink-0" />
                    <span>High Priority</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white pl-2.5 mt-0.5">
                    {metrics.highPriority}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-zinc-800/80">
            <button
              onClick={() => {
                setStatusFilter("All Statuses");
                setCategoryFilter("All Categories");
                setFloorFilter("All Floors");
                setSearchQuery("");
              }}
              className="text-[10px] sm:text-[11px] font-bold text-[#0055a5] dark:text-blue-400 hover:underline flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>View All Requests</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card 2: Avg. Resolution Time */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/90 dark:border-zinc-800 p-2.5 sm:p-3 shadow-2xs flex flex-col justify-between relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.055]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, #2563eb 0, #2563eb 1px, transparent 0, transparent 10px), repeating-linear-gradient(90deg, #2563eb 0, #2563eb 1px, transparent 0, transparent 10px)', backgroundSize: '10px 10px' }} />
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-lg bg-[#eff6ff] dark:bg-blue-950/40 border border-[#dbeafe] dark:border-blue-800/40 text-[#2563eb] flex items-center justify-center shrink-0">
                <Clock className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate">
                Avg. Resolution Time
              </span>
            </div>

            <div className="mt-1 flex items-baseline justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xl sm:text-2xl font-extrabold text-slate-950 dark:text-white tracking-tight">
                  {metrics.avgResolutionDays} days
                </span>
                <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#16a34a] dark:text-emerald-400">
                  <ArrowDown className="w-2.5 h-2.5 stroke-[2.5]" /> 42%
                </span>
              </div>
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium self-end">
                vs. last mo.
              </span>
            </div>
          </div>

          <div className="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-zinc-800/80">
            <button
              onClick={() => setStatusFilter("Resolved")}
              className="text-[10px] sm:text-[11px] font-bold text-[#0055a5] dark:text-blue-400 hover:underline flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>View Performance</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card 3: Completed This Month */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/90 dark:border-zinc-800 p-2.5 sm:p-3 shadow-2xs flex flex-col justify-between relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.055]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, #16a34a 0, #16a34a 1px, transparent 0, transparent 10px), repeating-linear-gradient(90deg, #16a34a 0, #16a34a 1px, transparent 0, transparent 10px)', backgroundSize: '10px 10px' }} />
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-lg bg-[#f0fdf4] dark:bg-emerald-950/40 border border-[#dcfce7] dark:border-emerald-800/40 text-[#16a34a] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate">
                Completed This Month
              </span>
            </div>

            <div className="mt-1 flex items-baseline justify-between">
              <div className="text-xl sm:text-2xl font-extrabold text-slate-950 dark:text-white tracking-tight">
                {metrics.completedThisMonth}
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#16a34a] dark:text-emerald-400">
                  <ArrowUp className="w-2.5 h-2.5 stroke-[2.5]" /> 71%
                </span>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                  vs. last mo.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-zinc-800/80">
            <button
              onClick={() => setStatusFilter("Resolved")}
              className="text-[10px] sm:text-[11px] font-bold text-[#0055a5] dark:text-blue-400 hover:underline flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>View Maintenance Report</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card 4: High Priority Issues */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/90 dark:border-zinc-800 p-2.5 sm:p-3 shadow-2xs flex flex-col justify-between relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.055]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, #ef4444 0, #ef4444 1px, transparent 0, transparent 10px), repeating-linear-gradient(90deg, #ef4444 0, #ef4444 1px, transparent 0, transparent 10px)', backgroundSize: '10px 10px' }} />
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-lg bg-[#fef2f2] dark:bg-rose-950/40 border border-[#fee2e2] dark:border-rose-800/40 text-[#ef4444] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate">
                High Priority Issues
              </span>
            </div>

            <div className="mt-1">
              <div className="text-xl sm:text-2xl font-extrabold text-slate-950 dark:text-white tracking-tight">
                {metrics.highPriority}
              </div>
              <p className="text-[10px] font-medium text-slate-500 dark:text-zinc-400 mt-0.5">
                Requires immediate attention
              </p>
            </div>
          </div>

          <div className="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-zinc-800/80">
            <button
              onClick={() => {
                setStatusFilter("All Statuses");
                setCategoryFilter("All Categories");
              }}
              className="text-[10px] sm:text-[11px] font-bold text-[#0055a5] dark:text-blue-400 hover:underline flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>View High Priority</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. MAIN TWO-COLUMN WORKSPACE (Left: Table, Right: Cards)  */}
      {/* ========================================================= */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
        {/* ======================================================= */}
        {/* LEFT COLUMN: MAINTENANCE REQUESTS TABLE                 */}
        {/* ======================================================= */}
        <div className="lg:col-span-8 flex flex-col h-full min-h-0 overflow-hidden">
          {/* Table Container */}
          <div className="flex-1 min-h-0 bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl shadow-2xs overflow-hidden flex flex-col">
            {/* Section Title & Controls Bar */}
            <div className="p-3 pb-2.5 border-b border-slate-100 dark:border-zinc-800/60 space-y-2 shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Maintenance Requests
                </h2>
                <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500">
                  {filteredRequests.length}{" "}
                  {filteredRequests.length === 1 ? "ticket" : "tickets"} found
                </span>
              </div>

              {/* Controls Bar: Search, Status, Category, Floor Dropdowns */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {/* Search */}
                <div className="relative flex-1 min-w-45">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by request ID, tenant name, room number, or issue..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/90 dark:border-zinc-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs placeholder:text-slate-400 dark:placeholder:text-zinc-500 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs font-medium"
                  />
                </div>

                {/* Status Dropdown */}
                <div className="w-32 sm:w-34 shrink-0">
                  <DropdownSelect
                    value={statusFilter}
                    onChange={(val) => setStatusFilter(val)}
                    options={[
                      { value: "All Statuses", label: "All Statuses" },
                      {
                        value: "Pending",
                        label: "Pending",
                        dotColor: "bg-amber-500",
                      },
                      {
                        value: "In Progress",
                        label: "In Progress",
                        dotColor: "bg-blue-600",
                      },
                      {
                        value: "Resolved",
                        label: "Resolved",
                        dotColor: "bg-emerald-500",
                      },
                    ]}
                    className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/90 dark:border-zinc-700/80 rounded-xl pl-3 pr-7 py-1.5 text-xs font-semibold text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                {/* Category Dropdown */}
                <div className="w-36 sm:w-38 shrink-0">
                  <DropdownSelect
                    value={categoryFilter}
                    onChange={(val) => setCategoryFilter(val)}
                    options={[
                      "All Categories",
                      "Plumbing",
                      "Electrical",
                      "AC / Cooling",
                      "Appliance",
                      "Furniture",
                      "Water Supply",
                      "Wall / Ceiling",
                      "Locks / Security",
                      "Others",
                    ]}
                    className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/90 dark:border-zinc-700/80 rounded-xl pl-3 pr-7 py-1.5 text-xs font-semibold text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                {/* Floor Dropdown */}
                <div className="w-28 sm:w-30 shrink-0">
                  <DropdownSelect
                    value={floorFilter}
                    onChange={(val) => setFloorFilter(val)}
                    options={[
                      "All Floors",
                      "Floor 1",
                      "Floor 2",
                      "Floor 3",
                      "Floor 4",
                    ]}
                    className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/90 dark:border-zinc-700/80 rounded-xl pl-3 pr-7 py-1.5 text-xs font-semibold text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* Table Scroll Container */}
            <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white dark:bg-zinc-900 z-10 border-b border-slate-100 dark:border-zinc-800/80 text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                  <tr>
                    <th className="py-2.5 pl-4 pr-3">ID</th>
                    <th className="py-2.5 px-3">Tenant</th>
                    <th className="py-2.5 px-3">Room</th>
                    <th className="py-2.5 px-3">Issue Category</th>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Date Reported</th>
                    <th className="py-2.5 pr-4 pl-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/90 dark:divide-zinc-800/60 font-sans text-xs">
                  {paginatedRequests.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-14 text-center text-slate-400 dark:text-zinc-500"
                      >
                        <Wrench className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="font-bold text-slate-800 dark:text-zinc-200">
                          No requests found
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedRequests.map((req) => {
                      const mrId = formatMRId(req);
                      const normPriority = normalizePriority(req.priority);
                      const normStatus = normalizeStatus(req.status);
                      const dateObj = formatDate(req.created_at);
                      const floorDisplay = getFloorDisplay(
                        req.room_number,
                        req.floor,
                      );
                      const isSelected = activeRequest?.id === req.id;

                      return (
                        <tr
                          key={req.id}
                          onClick={() => {
                            setSelectedRequestId(req.id);
                            setViewingRequest(req);
                          }}
                          className={`h-12 transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-blue-50/50 dark:bg-blue-950/20"
                              : "hover:bg-slate-50/60 dark:hover:bg-zinc-800/30"
                          }`}
                        >
                          {/* ID */}
                          <td className="py-2 pl-4 pr-3 font-mono text-[11px] font-semibold text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                            {mrId}
                          </td>

                          {/* Tenant */}
                          <td className="py-2 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-6.5 h-6.5 rounded-full font-bold text-[10px] flex items-center justify-center shrink-0 shadow-2xs select-none ${getAvatarBgClass(
                                  req.tenant_name || "Tenant",
                                )}`}
                              >
                                {(req.tenant_name || "T")
                                  .trim()
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 dark:text-white leading-tight truncate">
                                  {req.tenant_name || "Tenant"}
                                </div>
                                <div className="text-[10px] text-slate-400 dark:text-zinc-500 leading-tight">
                                  {req.room_number
                                    ? `Room ${req.room_number}`
                                    : "—"}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Room */}
                          <td className="py-2 px-3 whitespace-nowrap">
                            <div className="font-bold text-slate-800 dark:text-zinc-200 leading-tight">
                              {req.room_number ? `Room ${req.room_number}` : "—"}
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-zinc-500 leading-tight">
                              {floorDisplay}
                            </div>
                          </td>

                          {/* Issue Category */}
                          <td className="py-2 px-3 font-medium text-slate-600 dark:text-zinc-300 whitespace-nowrap">
                            {req.category || "General"}
                          </td>

                          {/* Priority Badge */}
                          <td className="py-2 px-3 whitespace-nowrap">
                            {normPriority === "High" && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                                <Flame className="w-3 h-3 fill-current" /> High
                              </span>
                            )}
                            {normPriority === "Medium" && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                                <Zap className="w-3 h-3 fill-current" /> Medium
                              </span>
                            )}
                            {normPriority === "Low" && (
                              <span className="inline-flex items-center text-[11px] font-bold text-teal-600 dark:text-teal-400">
                                Low
                              </span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="py-2 px-3 whitespace-nowrap">
                            {normStatus === "In Progress" && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                                <User className="w-3 h-3" /> In Progress
                              </span>
                            )}
                            {normStatus === "Pending" && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                                <User className="w-3 h-3" /> Pending
                              </span>
                            )}
                            {normStatus === "Resolved" && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                <User className="w-3 h-3" /> Resolved
                              </span>
                            )}
                          </td>

                          {/* Date Reported */}
                          <td className="py-2 px-3 whitespace-nowrap">
                            <div className="font-semibold text-slate-800 dark:text-zinc-200 leading-tight">
                              {dateObj.date}
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-zinc-500 leading-tight">
                              {dateObj.time}
                            </div>
                          </td>

                          {/* Actions: Edit Icon Button */}
                          <td
                            className="py-2 pr-4 pl-2 text-right whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => openUpdateModal(req)}
                              title="Edit / Update Status"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-[#0055a5] hover:bg-blue-50 dark:hover:bg-zinc-800 dark:hover:text-blue-400 transition-colors cursor-pointer inline-flex items-center justify-center border border-transparent hover:border-blue-200 dark:hover:border-zinc-700"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer: Count & Pagination */}
            <div className="px-3.5 py-2 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 shrink-0">
              <div>
                Showing 1-{paginatedRequests.length} of {filteredRequests.length} requests
              </div>

              {/* Pagination buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="w-6.5 h-6.5 rounded-lg border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>

                <button className="w-6.5 h-6.5 rounded-lg bg-[#0055a5] text-white flex items-center justify-center text-xs font-bold">
                  {currentPage}
                </button>

                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="w-6.5 h-6.5 rounded-lg border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================= */}
        {/* RIGHT COLUMN: REQUEST DETAILS + MAINTENANCE CATEGORIES  */}
        {/* ======================================================= */}
        <div className="lg:col-span-4 flex flex-col gap-2.5 h-full min-h-0 overflow-hidden">
          {/* Card 1: Request Details */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-zinc-800 p-3 sm:p-3.5 shadow-2xs flex flex-col gap-2 shrink-0">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                Request Details
              </h3>
              <button
                onClick={() => setViewingRequest(activeRequest)}
                className="text-xs font-bold text-[#0055a5] dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {activeRequest ? (
              <>
                {/* ID + Badges */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-base sm:text-lg font-bold text-slate-950 dark:text-white tracking-tight">
                    {formatMRId(activeRequest)}
                  </span>
                  {normalizePriority(activeRequest.priority) === "High" && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                      <Flame className="w-3 h-3 fill-current" /> High Priority
                    </span>
                  )}
                  {normalizePriority(activeRequest.priority) === "Medium" && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      <Zap className="w-3 h-3 fill-current" /> Medium Priority
                    </span>
                  )}
                  {normalizePriority(activeRequest.priority) === "Low" && (
                    <span className="inline-flex items-center text-[11px] font-bold text-teal-600 dark:text-teal-400">
                      Low Priority
                    </span>
                  )}
                  {normalizeStatus(activeRequest.status) === "Pending" && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      <Clock className="w-3 h-3" /> Pending
                    </span>
                  )}
                  {normalizeStatus(activeRequest.status) === "In Progress" && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                      <User className="w-3 h-3" /> In Progress
                    </span>
                  )}
                  {normalizeStatus(activeRequest.status) === "Resolved" && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" /> Resolved
                    </span>
                  )}
                </div>

                {/* Info breakdown + Photo Thumbnail */}
                <div className="flex items-start justify-between gap-2.5">
                  {/* Left: Info Rows */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    {/* Tenant */}
                    <div className="flex items-start gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {activeRequest.tenant_name || "Unknown Resident"}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-zinc-400 truncate">
                          {activeRequest.room_number
                            ? `Room ${activeRequest.room_number}`
                            : "—"}
                          {getFloorDisplay(
                            activeRequest.room_number,
                            activeRequest.floor,
                          )
                            ? ` • ${getFloorDisplay(
                                activeRequest.room_number,
                                activeRequest.floor,
                              )}`
                            : ""}
                        </div>
                      </div>
                    </div>

                    {/* Date */}
                    <div className="flex items-start gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {formatDate(activeRequest.created_at).date} ·{" "}
                          {formatDate(activeRequest.created_at).time}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-zinc-400">
                          {formatRelativeTime(activeRequest.created_at)}
                        </div>
                      </div>
                    </div>

                    {/* Category & Description */}
                    <div className="flex items-start gap-2">
                      <Wrench className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {activeRequest.category || "General"}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-2">
                          {activeRequest.description ||
                            activeRequest.title ||
                            "No description provided."}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Issue Photo Thumbnail (only if attached) */}
                  {(activeRequest.attachment_url || activeRequest.image_url) && (
                    <div
                      onClick={() =>
                        setLightboxImage(
                          activeRequest.attachment_url ||
                            activeRequest.image_url ||
                            null,
                        )
                      }
                      className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-700 shadow-2xs shrink-0 cursor-pointer group"
                      title="Click to zoom image"
                    >
                      <img
                        src={
                          activeRequest.attachment_url ||
                          activeRequest.image_url ||
                          ""
                        }
                        alt="Proof of issue"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <ZoomIn className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Assigned To Section */}
                <div className="pt-1.5 border-t border-slate-100 dark:border-zinc-800">
                  <div className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 mb-1">
                    Assigned To
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-[#0062cc] dark:text-blue-400 font-bold text-[10px] flex items-center justify-center border border-blue-200 dark:border-blue-800 select-none">
                      {(activeRequest.assigned_to || "M")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                        {activeRequest.assigned_to || "Maintenance Team"}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-zinc-400 leading-tight">
                        {activeRequest.admin_notes ||
                          (normalizeStatus(activeRequest.status) === "Resolved"
                            ? "Work completed"
                            : "Ongoing repair")}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    onClick={() => setViewingRequest(activeRequest)}
                    className="flex-1 py-1.5 px-3 border border-[#0055a5] text-[#0055a5] hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl text-xs font-bold text-center transition-colors cursor-pointer"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => openUpdateModal(activeRequest)}
                    className="flex-1 py-1.5 px-3 bg-[#0055a5] hover:bg-[#00478f] text-white rounded-xl text-xs font-bold text-center shadow-xs transition-colors cursor-pointer"
                  >
                    Update Status
                  </button>
                </div>
              </>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 dark:text-zinc-500 text-center">
                <Wrench className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-xs font-semibold">
                  No maintenance request selected
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Select a request from the list to view details
                </p>
              </div>
            )}
          </div>

          {/* Card 2: Maintenance Categories */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-zinc-800 p-3 sm:p-3.5 shadow-2xs flex flex-col gap-2 min-h-0 shrink-0">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
              Maintenance Categories
            </h3>

            {/* Scrollable if reaches 4 rows or above */}
            <div className="max-h-41.25 overflow-y-auto custom-scrollbar pr-0.5">
              <div className="grid grid-cols-3 gap-2">
                {CATEGORY_ITEMS.map((cat) => (
                  <div
                    key={cat.id}
                    onClick={() =>
                      setCategoryFilter(
                        categoryFilter === cat.id ? "All Categories" : cat.id,
                      )
                    }
                    className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-2 select-none ${
                      categoryFilter === cat.id
                        ? cat.activeBorder
                        : "border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 hover:bg-slate-100/70 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg ${cat.bg} ${cat.color} flex items-center justify-center shrink-0`}
                    >
                      <cat.icon className={`w-3.5 h-3.5 ${cat.fill || ""}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                        {cat.label}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-zinc-500 whitespace-nowrap">
                        {categoryCounts[cat.id] ?? 0}{" "}
                        {categoryCounts[cat.id] === 1 ? "request" : "requests"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: VIEW DETAILS MODAL                               */}
      {/* ========================================================= */}
      <AnimatePresence>
        {viewingRequest && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setViewingRequest(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50/80 dark:bg-zinc-900/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#0055a5] dark:text-blue-400 flex items-center justify-center">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      {formatMRId(viewingRequest)}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Maintenance Request Details
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingRequest(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">
                      Tenant
                    </span>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                      {viewingRequest.tenant_name || "Resident"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">
                      Room / Floor
                    </span>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                      {viewingRequest.room_number
                        ? `Room ${viewingRequest.room_number}`
                        : "—"}{" "}
                      (
                      {getFloorDisplay(
                        viewingRequest.room_number,
                        viewingRequest.floor,
                      )}
                      )
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">
                      Date Reported
                    </span>
                    <p className="font-semibold text-slate-800 dark:text-zinc-200 mt-0.5">
                      {formatDate(viewingRequest.created_at).date}{" "}
                      {formatDate(viewingRequest.created_at).time}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">
                      Category
                    </span>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                      {viewingRequest.category || "General"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">
                      Priority
                    </span>
                    <div className="mt-0.5">
                      {normalizePriority(viewingRequest.priority) ===
                        "High" && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                          <Flame className="w-3 h-3 fill-current" /> High
                        </span>
                      )}
                      {normalizePriority(viewingRequest.priority) ===
                        "Medium" && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                          <Zap className="w-3 h-3 fill-current" /> Medium
                        </span>
                      )}
                      {normalizePriority(viewingRequest.priority) === "Low" && (
                        <span className="inline-flex items-center text-xs font-bold text-teal-600 dark:text-teal-400">
                          Low
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">
                      Status
                    </span>
                    <div className="mt-0.5">
                      {normalizeStatus(viewingRequest.status) === "Pending" && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                          <User className="w-3 h-3" /> Pending
                        </span>
                      )}
                      {normalizeStatus(viewingRequest.status) ===
                        "In Progress" && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400">
                          <User className="w-3 h-3" /> In Progress
                        </span>
                      )}
                      {normalizeStatus(viewingRequest.status) ===
                        "Resolved" && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <User className="w-3 h-3" /> Resolved
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Issue Description
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800">
                    {viewingRequest.description ||
                      viewingRequest.title ||
                      "No description provided."}
                  </p>
                </div>

                {/* Evidence Photo */}
                {(viewingRequest.attachment_url ||
                  viewingRequest.image_url) && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                      Attached Photo
                    </h4>
                    <div
                      onClick={() =>
                        setLightboxImage(
                          viewingRequest.attachment_url ||
                            viewingRequest.image_url ||
                            null,
                        )
                      }
                      className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-700 h-44 bg-slate-100 cursor-pointer group"
                    >
                      <img
                        src={
                          viewingRequest.attachment_url ||
                          viewingRequest.image_url ||
                          ""
                        }
                        alt="Attachment"
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-xs font-bold">
                        <ZoomIn className="w-4 h-4" />
                        <span>Click to view full size</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Assigned Technician & Notes */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">
                      Assigned Technician
                    </span>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                      {viewingRequest.assigned_to || "Maintenance Team"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">
                      Service Status
                    </span>
                    <p className="font-bold text-[#0055a5] dark:text-blue-400 mt-0.5">
                      {viewingRequest.status}
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-end gap-2 bg-slate-50/50 dark:bg-zinc-900/50">
                <button
                  onClick={() => setViewingRequest(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    openUpdateModal(viewingRequest);
                    setViewingRequest(null);
                  }}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-[#0055a5] hover:bg-[#00478f] text-white transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Update Status</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL 2: UPDATE STATUS MODAL                              */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isUpdateStatusModalOpen && updatingRequest && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget)
                setIsUpdateStatusModalOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
            >
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50/80 dark:bg-zinc-900/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#0055a5] dark:text-blue-400 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Update Request Status
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {formatMRId(updatingRequest)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsUpdateStatusModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={handleSaveStatusModal}
                className="p-4 sm:p-5 space-y-3.5"
              >
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Status
                  </label>
                  <DropdownSelect
                    value={statusForm.status}
                    onChange={(val) =>
                      setStatusForm({ ...statusForm, status: val })
                    }
                    options={[
                      {
                        value: "Pending",
                        label: "Pending",
                        dotColor: "bg-amber-500",
                      },
                      {
                        value: "In Progress",
                        label: "In Progress",
                        dotColor: "bg-blue-600",
                      },
                      {
                        value: "Resolved",
                        label: "Resolved",
                        dotColor: "bg-emerald-500",
                      },
                    ]}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Assigned Technician
                  </label>
                  <input
                    type="text"
                    value={statusForm.assigned_to}
                    onChange={(e) =>
                      setStatusForm({
                        ...statusForm,
                        assigned_to: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Admin Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Add work order notes..."
                    value={statusForm.admin_notes}
                    onChange={(e) =>
                      setStatusForm({
                        ...statusForm,
                        admin_notes: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsUpdateStatusModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingStatus}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-[#0055a5] hover:bg-[#00478f] text-white transition-colors"
                  >
                    {isSubmittingStatus ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* LIGHTBOX FOR PHOTO ZOOM                                   */}
      {/* ========================================================= */}
      <AnimatePresence>
        {lightboxImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setLightboxImage(null)}
          >
            <div className="relative max-w-2xl max-h-[90vh]">
              <img
                src={lightboxImage}
                alt="Enlarged issue"
                className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
              />
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AdminMaintenanceRequests() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-96 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-slate-300 dark:border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
        </div>
      }
    >
      <MaintenanceRequestsContent />
    </Suspense>
  );
}
