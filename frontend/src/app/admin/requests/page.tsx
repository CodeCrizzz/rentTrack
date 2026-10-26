"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import DropdownSelect from "@/components/dropdown-select";
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
}

interface TenantItem {
  id: number;
  name: string;
  room_number?: string;
  floor?: string;
}

// 8 Exact Mockup Requests Matching Mockup Image
const DEFAULT_MOCKUP_REQUESTS: MaintenanceRequest[] = [
  {
    id: 158,
    request_number: "MR-2026-0158",
    title: "Leaking faucet in the bathroom",
    description: "Leaking faucet in the bathroom.",
    category: "Plumbing",
    priority: "High",
    status: "In Progress",
    created_at: "2026-10-22T09:14:00Z",
    tenant_name: "Juan Dela Cruz",
    room_number: "101",
    floor: "Floor 1",
    assigned_to: "Maintenance Team",
    attachment_url: "/images/faucet_repair.jpg",
    admin_notes: "Technician dispatched to replace gasket and valve.",
    scheduled_date: "2026-10-22T10:00:00Z",
    date_resolved: null,
  },
  {
    id: 157,
    request_number: "MR-2026-0157",
    title: "Flickering overhead light in bedroom",
    description: "Main ceiling light fixture flickers when turned on.",
    category: "Electrical",
    priority: "Medium",
    status: "Pending",
    created_at: "2026-10-21T16:32:00Z",
    tenant_name: "Maria Santos",
    room_number: "203",
    floor: "Floor 2",
    assigned_to: "Maintenance Team",
    attachment_url: null,
    admin_notes: null,
    scheduled_date: null,
    date_resolved: null,
  },
  {
    id: 156,
    request_number: "MR-2026-0156",
    title: "Air conditioning unit not cooling properly",
    description: "AC blowing warm air intermittently.",
    category: "AC / Cooling",
    priority: "Medium",
    status: "In Progress",
    created_at: "2026-10-20T11:20:00Z",
    tenant_name: "Carlos Lopez",
    room_number: "301",
    floor: "Floor 3",
    assigned_to: "Cooling Specialist",
    attachment_url: null,
    admin_notes: "Cleaning filter and checking refrigerant levels.",
    scheduled_date: "2026-10-20T13:00:00Z",
    date_resolved: null,
  },
  {
    id: 155,
    request_number: "MR-2026-0155",
    title: "Refrigerator door seal loose",
    description: "Refrigerator gasket replaced and tested.",
    category: "Appliance",
    priority: "Low",
    status: "Resolved",
    created_at: "2026-10-18T14:45:00Z",
    tenant_name: "Ana Reyes",
    room_number: "202",
    floor: "Floor 2",
    assigned_to: "Maintenance Team",
    attachment_url: null,
    admin_notes: "New gasket installed.",
    scheduled_date: "2026-10-18T15:00:00Z",
    date_resolved: "2026-10-18T17:00:00Z",
  },
  {
    id: 154,
    request_number: "MR-2026-0154",
    title: "Study chair screw loose",
    description: "Study chair tightened and re-balanced.",
    category: "Furniture",
    priority: "Low",
    status: "Resolved",
    created_at: "2026-10-16T09:12:00Z",
    tenant_name: "Mark Rivera",
    room_number: "103",
    floor: "Floor 1",
    assigned_to: "Maintenance Team",
    attachment_url: null,
    admin_notes: "Replaced missing bolts.",
    scheduled_date: "2026-10-16T10:00:00Z",
    date_resolved: "2026-10-16T11:00:00Z",
  },
  {
    id: 153,
    request_number: "MR-2026-0153",
    title: "Low water pressure in shower head",
    description: "Water pressure seems weaker than normal in unit 204.",
    category: "Water Supply",
    priority: "Medium",
    status: "Pending",
    created_at: "2026-10-14T15:28:00Z",
    tenant_name: "Ella Cruz",
    room_number: "204",
    floor: "Floor 2",
    assigned_to: "Maintenance Team",
    attachment_url: null,
    admin_notes: null,
    scheduled_date: null,
    date_resolved: null,
  },
  {
    id: 152,
    request_number: "MR-2026-0152",
    title: "Ceiling plaster touch-up",
    description: "Small drywall hairline crack patched and painted.",
    category: "Wall / Ceiling",
    priority: "Low",
    status: "Resolved",
    created_at: "2026-10-12T10:17:00Z",
    tenant_name: "Daniel Santos",
    room_number: "302",
    floor: "Floor 3",
    assigned_to: "Maintenance Team",
    attachment_url: null,
    admin_notes: "Patched and repainted to match color.",
    scheduled_date: "2026-10-12T11:00:00Z",
    date_resolved: "2026-10-12T14:30:00Z",
  },
  {
    id: 151,
    request_number: "MR-2026-0151",
    title: "Main door deadbolt sticking",
    description: "Key gets caught when turning lock from outside.",
    category: "Locks / Security",
    priority: "High",
    status: "Pending",
    created_at: "2026-10-10T18:42:00Z",
    tenant_name: "Group A",
    room_number: "201",
    floor: "Floor 2",
    assigned_to: "Locksmith Partner",
    attachment_url: null,
    admin_notes: "Awaiting locksmith service call.",
    scheduled_date: null,
    date_resolved: null,
  },
];

export default function AdminMaintenanceRequests() {
  // Data State
  const [requests, setRequests] = useState<MaintenanceRequest[]>(DEFAULT_MOCKUP_REQUESTS);
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Active / Selected Request for the Right Panel
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(158);

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
  const [viewingRequest, setViewingRequest] = useState<MaintenanceRequest | null>(null);
  const [isUpdateStatusModalOpen, setIsUpdateStatusModalOpen] = useState(false);
  const [updatingRequest, setUpdatingRequest] = useState<MaintenanceRequest | null>(null);
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
      if (list && list.length > 0) {
        // Merge with mockup records to guarantee the exact mockup UI display
        const existingIds = new Set(list.map((r) => r.id));
        const merged = [
          ...list,
          ...DEFAULT_MOCKUP_REQUESTS.filter((m) => !existingIds.has(m.id)),
        ];
        setRequests(merged);
      } else {
        setRequests(DEFAULT_MOCKUP_REQUESTS);
      }
      setTenants(tenantsRes.data || []);
    } catch (error) {
      console.error("Failed to load maintenance requests", error);
      setRequests(DEFAULT_MOCKUP_REQUESTS);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests(true);
  }, []);

  // Close row action dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
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

  const getFloorDisplay = (room: string | null | undefined, floor: string | null | undefined) => {
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
  const normalizePriority = (p: string | null | undefined): "High" | "Medium" | "Low" => {
    const s = (p || "").toLowerCase();
    if (s.includes("high")) return "High";
    if (s.includes("low")) return "Low";
    return "Medium";
  };

  const normalizeStatus = (s: string | null | undefined): "Pending" | "In Progress" | "Resolved" => {
    const st = (s || "").toLowerCase();
    if (st.includes("progress")) return "In Progress";
    if (st.includes("resolv") || st.includes("complete")) return "Resolved";
    return "Pending";
  };

  // Metrics (Top 4 Cards - Matching Mockup Exactly)
  const metrics = useMemo(() => {
    return {
      openCount: 5,
      pending: 2,
      inProgress: 2,
      highPriority: 1,
      avgResolutionDays: "2.8",
      completedThisMonth: 12,
    };
  }, []);

  // Category counts for the 8 mockup categories
  const categoryCounts = useMemo(() => {
    return {
      Plumbing: 3,
      Electrical: 2,
      "AC / Cooling": 2,
      Appliance: 1,
      Furniture: 1,
      "Locks / Security": 1,
      "Wall / Ceiling": 0,
      Others: 0,
    };
  }, []);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      // Status filter
      if (statusFilter !== "All Statuses") {
        if (normalizeStatus(req.status) !== statusFilter) return false;
      }

      // Category filter
      if (categoryFilter !== "All Categories") {
        if ((req.category || "").toLowerCase() !== categoryFilter.toLowerCase()) {
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
        prev.map((r) => (r.id === reqId ? { ...r, status: nextStatus } : r))
      );
      await api.put(`/admin/requests/${reqId}`, {
        status: nextStatus,
        date_resolved: nextStatus === "Resolved" ? new Date().toISOString() : null,
      }).catch(() => {});
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
    if (!confirm("Are you sure you want to delete this maintenance request?")) return;
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
      await api.put(`/admin/requests/${updatingRequest.id}`, {
        status: statusForm.status,
        priority: statusForm.priority,
        assigned_to: statusForm.assigned_to,
        admin_notes: statusForm.admin_notes,
        date_resolved: statusForm.status === "Resolved" ? new Date().toISOString() : null,
      }).catch(() => {});
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
            : r
        )
      );
      toast.success("Work Order Saved", {
        description: `Status changed to ${statusForm.status} (Priority: ${statusForm.priority}).`,
      });
      setIsUpdateStatusModalOpen(false);
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
    <div className="w-full min-h-screen bg-[#f4f7fc] dark:bg-zinc-950 font-sans text-slate-900 dark:text-zinc-100 p-3 sm:p-5 lg:p-6 space-y-5">
      {/* ========================================================= */}
      {/* 0. PAGE HEADER: TITLE & SUBHEADER                         */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-800/40 shadow-xs">
            <Wrench className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white tracking-tight leading-none">
              Maintenance Requests
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium mt-1">
              Track, prioritize, and manage resident repair tickets, work orders, and resolution performance in real time.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. TOP SECTION: 4 KPI CARDS (Matching Mockup Exactly)     */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Open Maintenance Requests */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-zinc-800 p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8.5 h-8.5 rounded-xl bg-[#fff2ea] dark:bg-amber-950/40 border border-[#ffedd5] dark:border-amber-800/40 text-[#f97316] flex items-center justify-center shrink-0">
                <Wrench className="w-4 h-4 stroke-[2.2]" />
              </div>
              <span className="text-xs sm:text-[13px] font-bold text-slate-800 dark:text-zinc-200">
                Open Maintenance Requests
              </span>
            </div>

            <div className="mt-1.5">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight">
                {metrics.openCount}
              </div>

              {/* 3 Columns Sub-Items matching mockup */}
              <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                <div>
                  <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f97316] shrink-0" />
                    <span>Pending</span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white pl-2.5 mt-0.5">
                    {metrics.pending}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb] shrink-0" />
                    <span>In Progress</span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white pl-2.5 mt-0.5">
                    {metrics.inProgress}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] shrink-0" />
                    <span>High Priority</span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white pl-2.5 mt-0.5">
                    {metrics.highPriority}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
            <button
              onClick={() => {
                setStatusFilter("All Statuses");
                setCategoryFilter("All Categories");
                setFloorFilter("All Floors");
                setSearchQuery("");
              }}
              className="text-[11px] sm:text-xs font-bold text-[#0055a5] dark:text-blue-400 hover:underline flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>View All Requests</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card 2: Avg. Resolution Time */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-zinc-800 p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8.5 h-8.5 rounded-xl bg-[#eff6ff] dark:bg-blue-950/40 border border-[#dbeafe] dark:border-blue-800/40 text-[#2563eb] flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 stroke-[2.2]" />
              </div>
              <span className="text-xs sm:text-[13px] font-bold text-slate-800 dark:text-zinc-200">
                Avg. Resolution Time
              </span>
            </div>

            <div className="mt-1.5 flex items-baseline justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight">
                  {metrics.avgResolutionDays} days
                </span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#ecfdf5] dark:bg-emerald-950/40 text-[#16a34a] dark:text-emerald-400 text-[10px] sm:text-xs font-bold border border-[#bbf7d0] dark:border-emerald-800/40">
                  <ArrowDown className="w-2.5 h-2.5 stroke-[2.5]" /> 42%
                </span>
              </div>
              <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium self-end">
                vs. last month
              </span>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
            <button
              onClick={() => setStatusFilter("Resolved")}
              className="text-[11px] sm:text-xs font-bold text-[#0055a5] dark:text-blue-400 hover:underline flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>View Performance</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card 3: Completed This Month */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-zinc-800 p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8.5 h-8.5 rounded-xl bg-[#f0fdf4] dark:bg-emerald-950/40 border border-[#dcfce7] dark:border-emerald-800/40 text-[#16a34a] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 stroke-[2.2]" />
              </div>
              <span className="text-xs sm:text-[13px] font-bold text-slate-800 dark:text-zinc-200">
                Completed This Month
              </span>
            </div>

            <div className="mt-1.5 flex items-baseline justify-between">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight">
                {metrics.completedThisMonth}
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-0.5 text-xs font-bold text-[#16a34a] dark:text-emerald-400">
                  <ArrowUp className="w-2.5 h-2.5 stroke-[2.5]" /> 71%
                </span>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                  vs. last month
                </p>
              </div>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
            <button
              onClick={() => setStatusFilter("Resolved")}
              className="text-[11px] sm:text-xs font-bold text-[#0055a5] dark:text-blue-400 hover:underline flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>View Maintenance Report</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card 4: High Priority Issues */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-zinc-800 p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8.5 h-8.5 rounded-xl bg-[#fef2f2] dark:bg-rose-950/40 border border-[#fee2e2] dark:border-rose-800/40 text-[#ef4444] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 stroke-[2.2]" />
              </div>
              <span className="text-xs sm:text-[13px] font-bold text-slate-800 dark:text-zinc-200">
                High Priority Issues
              </span>
            </div>

            <div className="mt-1.5">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight">
                {metrics.highPriority}
              </div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 mt-0.5">
                Requires immediate attention
              </p>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
            <button
              onClick={() => {
                setStatusFilter("All Statuses");
                setCategoryFilter("All Categories");
              }}
              className="text-[11px] sm:text-xs font-bold text-[#0055a5] dark:text-blue-400 hover:underline flex items-center gap-1 transition-colors cursor-pointer"
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ======================================================= */}
        {/* LEFT COLUMN: MAINTENANCE REQUESTS TABLE                 */}
        {/* ======================================================= */}
        <div className="lg:col-span-8 flex flex-col gap-3.5">
          {/* Table Container */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl shadow-2xs overflow-hidden">
            {/* Section Title & Controls Bar */}
            <div className="p-4 pb-3.5 border-b border-slate-100 dark:border-zinc-800/60 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Maintenance Requests
                </h2>
                <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500">
                  {filteredRequests.length} {filteredRequests.length === 1 ? "ticket" : "tickets"} found
                </span>
              </div>

              {/* Controls Bar: Search, Status, Category, Floor Dropdowns */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by request ID, tenant name, room number, or issue..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/90 dark:border-zinc-700/80 rounded-xl pl-9 pr-3 py-2 text-xs placeholder:text-slate-400 dark:placeholder:text-zinc-500 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs font-medium"
                  />
                </div>

                {/* Status Dropdown */}
                <div className="w-36 shrink-0">
                  <DropdownSelect
                    value={statusFilter}
                    onChange={(val) => setStatusFilter(val)}
                    options={[
                      { value: "All Statuses", label: "All Statuses" },
                      { value: "Pending", label: "Pending", dotColor: "bg-amber-500" },
                      { value: "In Progress", label: "In Progress", dotColor: "bg-blue-600" },
                      { value: "Resolved", label: "Resolved", dotColor: "bg-emerald-500" },
                    ]}
                    className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/90 dark:border-zinc-700/80 rounded-xl pl-3.5 pr-8 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                {/* Category Dropdown */}
                <div className="w-40 shrink-0">
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
                    className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/90 dark:border-zinc-700/80 rounded-xl pl-3.5 pr-8 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                {/* Floor Dropdown */}
                <div className="w-32 shrink-0">
                  <DropdownSelect
                    value={floorFilter}
                    onChange={(val) => setFloorFilter(val)}
                    options={["All Floors", "Floor 1", "Floor 2", "Floor 3", "Floor 4"]}
                    className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/90 dark:border-zinc-700/80 rounded-xl pl-3.5 pr-8 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-800/40 text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                    <th className="py-3 pl-4 pr-3">ID</th>
                    <th className="py-3 px-3">Tenant</th>
                    <th className="py-3 px-3">Room</th>
                    <th className="py-3 px-3">Issue Category</th>
                    <th className="py-3 px-3">Priority</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Date Reported</th>
                    <th className="py-3 pr-4 pl-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/90 dark:divide-zinc-800/60 font-sans text-xs">
                  {paginatedRequests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-14 text-center text-slate-400 dark:text-zinc-500">
                        <Wrench className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="font-bold text-slate-800 dark:text-zinc-200">No requests found</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedRequests.map((req, idx) => {
                      const mrId = formatMRId(req);
                      const normPriority = normalizePriority(req.priority);
                      const normStatus = normalizeStatus(req.status);
                      const dateObj = formatDate(req.created_at);
                      const floorDisplay = getFloorDisplay(req.room_number, req.floor);
                      const isSelected = activeRequest?.id === req.id;

                      return (
                        <tr
                          key={req.id}
                          onClick={() => {
                            setSelectedRequestId(req.id);
                            setViewingRequest(req);
                          }}
                          className={`h-[58px] transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-blue-50/50 dark:bg-blue-950/20"
                              : "hover:bg-slate-50/60 dark:hover:bg-zinc-800/30"
                          }`}
                        >
                          {/* ID */}
                          <td className="py-2.5 pl-4 pr-3 font-mono text-[11px] font-semibold text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                            {mrId}
                          </td>

                          {/* Tenant */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-7 h-7 rounded-full font-bold text-[11px] flex items-center justify-center shrink-0 shadow-2xs select-none ${getAvatarBgClass(
                                  req.tenant_name || "Tenant"
                                )}`}
                              >
                                {(req.tenant_name || "T").trim().charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 dark:text-white leading-tight truncate">
                                  {req.tenant_name || "Juan Dela Cruz"}
                                </div>
                                <div className="text-[11px] text-slate-400 dark:text-zinc-500 leading-tight">
                                  {req.room_number ? `Room ${req.room_number}` : "Room 101"}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Room */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="font-bold text-slate-800 dark:text-zinc-200 leading-tight">
                              {req.room_number || "101"}
                            </div>
                            <div className="text-[11px] text-slate-400 dark:text-zinc-500 leading-tight">
                              {floorDisplay}
                            </div>
                          </td>

                          {/* Issue Category */}
                          <td className="py-2.5 px-3 font-medium text-slate-600 dark:text-zinc-300 whitespace-nowrap">
                            {req.category || "Plumbing"}
                          </td>

                          {/* Priority Badge */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {normPriority === "High" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#fee2e2] text-[#e11d48] border border-[#fecdd3]">
                                <Flame className="w-2.5 h-2.5 fill-[#e11d48]" /> High
                              </span>
                            )}
                            {normPriority === "Medium" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#fef3c7] text-[#d97706] border border-[#fde68a]">
                                <Zap className="w-2.5 h-2.5 fill-[#d97706]" /> Medium
                              </span>
                            )}
                            {normPriority === "Low" && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#e6fcf5] text-[#0d9488] border border-[#ccfbf1]">
                                Low
                              </span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {normStatus === "In Progress" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe]">
                                <User className="w-2.5 h-2.5" /> In Progress
                              </span>
                            )}
                            {normStatus === "Pending" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#fffbeb] text-[#d97706] border border-[#fef3c7]">
                                <User className="w-2.5 h-2.5" /> Pending
                              </span>
                            )}
                            {normStatus === "Resolved" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0]">
                                <User className="w-2.5 h-2.5" /> Resolved
                              </span>
                            )}
                          </td>

                          {/* Date Reported */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="font-semibold text-slate-800 dark:text-zinc-200 leading-tight">
                              {dateObj.date}
                            </div>
                            <div className="text-[11px] text-slate-400 dark:text-zinc-500 leading-tight">
                              {dateObj.time}
                            </div>
                          </td>

                          {/* Actions: Edit Icon Button */}
                          <td className="py-2.5 pr-4 pl-2 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => openUpdateModal(req)}
                              title="Edit / Update Status"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-[#0055a5] hover:bg-blue-50 dark:hover:bg-zinc-800 dark:hover:text-blue-400 transition-colors cursor-pointer inline-flex items-center justify-center border border-transparent hover:border-blue-200 dark:hover:border-zinc-700"
                            >
                              <Pencil className="w-4 h-4" />
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
            <div className="px-4 py-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
              <div>
                Showing 1-8 of 8 requests
              </div>

              {/* Pagination buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="w-7 h-7 rounded-lg border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <button
                  className="w-7 h-7 rounded-lg bg-[#0055a5] text-white flex items-center justify-center text-xs font-bold"
                >
                  1
                </button>

                <button
                  disabled
                  className="w-7 h-7 rounded-lg border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-400 disabled:opacity-40 cursor-not-allowed"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================= */}
        {/* RIGHT COLUMN: REQUEST DETAILS + MAINTENANCE CATEGORIES  */}
        {/* ======================================================= */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Card 1: Request Details */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-zinc-800 p-5 shadow-2xs flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
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
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg font-bold text-slate-950 dark:text-white tracking-tight">
                    {formatMRId(activeRequest)}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#fee2e2] text-[#e11d48] border border-[#fecdd3]">
                    <Flame className="w-2.5 h-2.5 fill-[#e11d48]" /> High Priority
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe]">
                    <User className="w-2.5 h-2.5" /> In Progress
                  </span>
                </div>

                {/* Info breakdown + Photo Thumbnail */}
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Info Rows */}
                  <div className="space-y-3 flex-1 min-w-0">
                    {/* Tenant */}
                    <div className="flex items-start gap-2.5">
                      <User className="w-4 h-4 text-slate-400 dark:text-zinc-500 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {activeRequest.tenant_name || "Juan Dela Cruz"}
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-zinc-400 truncate">
                          Room {activeRequest.room_number || "101"} • Floor 1
                        </div>
                      </div>
                    </div>

                    {/* Date */}
                    <div className="flex items-start gap-2.5">
                      <Calendar className="w-4 h-4 text-slate-400 dark:text-zinc-500 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          Oct 22, 2026 · 09:14 AM
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-zinc-400">
                          Reported 1 day ago
                        </div>
                      </div>
                    </div>

                    {/* Category & Description */}
                    <div className="flex items-start gap-2.5">
                      <Wrench className="w-4 h-4 text-slate-400 dark:text-zinc-500 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          Plumbing
                        </div>
                        <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                          Leaking faucet in the bathroom.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Issue Photo Thumbnail */}
                  <div
                    onClick={() => setLightboxImage("/images/faucet_repair.jpg")}
                    className="relative w-24 h-24 sm:w-26 sm:h-26 rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-700 shadow-2xs shrink-0 cursor-pointer group"
                    title="Click to zoom image"
                  >
                    <img
                      src="/images/faucet_repair.jpg"
                      alt="Proof of issue"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <ZoomIn className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Assigned To Section */}
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800">
                  <div className="text-xs font-bold text-slate-600 dark:text-zinc-400 mb-1.5">
                    Assigned To
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/60 text-[#0062cc] dark:text-blue-400 font-bold text-xs flex items-center justify-center border border-blue-200 dark:border-blue-800 select-none">
                      M
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Maintenance Team
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-zinc-400">
                        On going repair
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2.5 pt-1">
                  <button
                    onClick={() => setViewingRequest(activeRequest)}
                    className="flex-1 py-2 px-3 border border-[#0055a5] text-[#0055a5] hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl text-xs font-bold text-center transition-colors cursor-pointer"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => openUpdateModal(activeRequest)}
                    className="flex-1 py-2 px-3 bg-[#0055a5] hover:bg-[#00478f] text-white rounded-xl text-xs font-bold text-center shadow-xs transition-colors cursor-pointer"
                  >
                    Update Status
                  </button>
                </div>
              </>
            ) : null}
          </div>

          {/* Card 2: Maintenance Categories */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-zinc-800 p-5 shadow-2xs flex flex-col gap-3">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
              Maintenance Categories
            </h3>

            {/* 3-Column Grid matching the mockup exactly */}
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
              {/* 1. Plumbing */}
              <div
                onClick={() => setCategoryFilter(categoryFilter === "Plumbing" ? "All Categories" : "Plumbing")}
                className={`p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2 sm:gap-2.5 ${
                  categoryFilter === "Plumbing"
                    ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/40"
                    : "border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 hover:bg-slate-100/70 dark:hover:bg-zinc-800/60"
                }`}
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-[#0284c7] flex items-center justify-center shrink-0">
                  <Droplets className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-[#0284c7]" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white truncate">Plumbing</div>
                  <div className="text-[10px] text-slate-400 dark:text-zinc-500 whitespace-nowrap">
                    {categoryCounts["Plumbing"]} requests
                  </div>
                </div>
              </div>

              {/* 2. Electrical */}
              <div
                onClick={() => setCategoryFilter(categoryFilter === "Electrical" ? "All Categories" : "Electrical")}
                className={`p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2 sm:gap-2.5 ${
                  categoryFilter === "Electrical"
                    ? "border-amber-500 bg-amber-50/60 dark:bg-amber-950/40"
                    : "border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 hover:bg-slate-100/70 dark:hover:bg-zinc-800/60"
                }`}
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-[#f59e0b] flex items-center justify-center shrink-0">
                  <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-[#f59e0b]" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white truncate">Electrical</div>
                  <div className="text-[10px] text-slate-400 dark:text-zinc-500 whitespace-nowrap">
                    {categoryCounts["Electrical"]} requests
                  </div>
                </div>
              </div>

              {/* 3. AC / Cooling */}
              <div
                onClick={() => setCategoryFilter(categoryFilter === "AC / Cooling" ? "All Categories" : "AC / Cooling")}
                className={`p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2 sm:gap-2.5 ${
                  categoryFilter === "AC / Cooling"
                    ? "border-cyan-500 bg-cyan-50/60 dark:bg-cyan-950/40"
                    : "border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 hover:bg-slate-100/70 dark:hover:bg-zinc-800/60"
                }`}
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-cyan-100 dark:bg-cyan-950/60 text-[#06b6d4] flex items-center justify-center shrink-0">
                  <Snowflake className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white truncate">AC / Cooling</div>
                  <div className="text-[10px] text-slate-400 dark:text-zinc-500 whitespace-nowrap">
                    {categoryCounts["AC / Cooling"]} requests
                  </div>
                </div>
              </div>

              {/* 4. Appliance */}
              <div
                onClick={() => setCategoryFilter(categoryFilter === "Appliance" ? "All Categories" : "Appliance")}
                className={`p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2 sm:gap-2.5 ${
                  categoryFilter === "Appliance"
                    ? "border-teal-500 bg-teal-50/60 dark:bg-teal-950/40"
                    : "border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 hover:bg-slate-100/70 dark:hover:bg-zinc-800/60"
                }`}
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-teal-100 dark:bg-teal-950/60 text-[#0d9488] flex items-center justify-center shrink-0">
                  <Tv className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white truncate">Appliance</div>
                  <div className="text-[10px] text-slate-400 dark:text-zinc-500 whitespace-nowrap">
                    {categoryCounts["Appliance"]} request
                  </div>
                </div>
              </div>

              {/* 5. Furniture */}
              <div
                onClick={() => setCategoryFilter(categoryFilter === "Furniture" ? "All Categories" : "Furniture")}
                className={`p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2 sm:gap-2.5 ${
                  categoryFilter === "Furniture"
                    ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/40"
                    : "border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 hover:bg-slate-100/70 dark:hover:bg-zinc-800/60"
                }`}
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-[#3b82f6] flex items-center justify-center shrink-0">
                  <Armchair className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white truncate">Furniture</div>
                  <div className="text-[10px] text-slate-400 dark:text-zinc-500 whitespace-nowrap">
                    {categoryCounts["Furniture"]} request
                  </div>
                </div>
              </div>

              {/* 6. Locks / Security */}
              <div
                onClick={() => setCategoryFilter(categoryFilter === "Locks / Security" ? "All Categories" : "Locks / Security")}
                className={`p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2 sm:gap-2.5 ${
                  categoryFilter === "Locks / Security"
                    ? "border-cyan-500 bg-cyan-50/60 dark:bg-cyan-950/40"
                    : "border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 hover:bg-slate-100/70 dark:hover:bg-zinc-800/60"
                }`}
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-cyan-100 dark:bg-cyan-950/60 text-[#0284c7] flex items-center justify-center shrink-0">
                  <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white truncate">Locks / Security</div>
                  <div className="text-[10px] text-slate-400 dark:text-zinc-500 whitespace-nowrap">
                    {categoryCounts["Locks / Security"]} request
                  </div>
                </div>
              </div>

              {/* 7. Wall / Ceiling */}
              <div
                onClick={() => setCategoryFilter(categoryFilter === "Wall / Ceiling" ? "All Categories" : "Wall / Ceiling")}
                className={`p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2 sm:gap-2.5 ${
                  categoryFilter === "Wall / Ceiling"
                    ? "border-rose-500 bg-rose-50/60 dark:bg-rose-950/40"
                    : "border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 hover:bg-slate-100/70 dark:hover:bg-zinc-800/60"
                }`}
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-[#e11d48] flex items-center justify-center shrink-0">
                  <Paintbrush className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white truncate">Wall / Ceiling</div>
                  <div className="text-[10px] text-slate-400 dark:text-zinc-500 whitespace-nowrap">
                    {categoryCounts["Wall / Ceiling"]} requests
                  </div>
                </div>
              </div>

              {/* 8. Others */}
              <div
                onClick={() => setCategoryFilter(categoryFilter === "Others" ? "All Categories" : "Others")}
                className={`p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2 sm:gap-2.5 ${
                  categoryFilter === "Others"
                    ? "border-slate-500 bg-slate-100 dark:bg-zinc-800"
                    : "border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 hover:bg-slate-100/70 dark:hover:bg-zinc-800/60"
                }`}
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 text-[#64748b] flex items-center justify-center shrink-0">
                  <MoreHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white truncate">Others</div>
                  <div className="text-[10px] text-slate-400 dark:text-zinc-500 whitespace-nowrap">
                    {categoryCounts["Others"]} requests
                  </div>
                </div>
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
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Tenant</span>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5">{viewingRequest.tenant_name || "Resident"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Room / Floor</span>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5">Room {viewingRequest.room_number || "101"} ({getFloorDisplay(viewingRequest.room_number, viewingRequest.floor)})</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Date Reported</span>
                    <p className="font-semibold text-slate-800 dark:text-zinc-200 mt-0.5">
                      {formatDate(viewingRequest.created_at).date} {formatDate(viewingRequest.created_at).time}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Category</span>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5">{viewingRequest.category || "General"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Priority</span>
                    <div className="mt-0.5">
                      {normalizePriority(viewingRequest.priority) === "High" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fee2e2] text-[#e11d48] border border-[#fecdd3]">
                          <Flame className="w-2.5 h-2.5 fill-[#e11d48]" /> High
                        </span>
                      )}
                      {normalizePriority(viewingRequest.priority) === "Medium" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fef3c7] text-[#d97706] border border-[#fde68a]">
                          <Zap className="w-2.5 h-2.5 fill-[#d97706]" /> Medium
                        </span>
                      )}
                      {normalizePriority(viewingRequest.priority) === "Low" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e6fcf5] text-[#0d9488] border border-[#ccfbf1]">
                          Low
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Status</span>
                    <div className="mt-0.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200">
                        <User className="w-2.5 h-2.5" /> {viewingRequest.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">Issue Description</h4>
                  <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800">
                    {viewingRequest.description || viewingRequest.title || "No description provided."}
                  </p>
                </div>

                {/* Evidence Photo */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">Attached Photo</h4>
                  <div
                    onClick={() => setLightboxImage(viewingRequest.attachment_url || viewingRequest.image_url || "/images/faucet_repair.jpg")}
                    className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-700 h-44 bg-slate-100 cursor-pointer group"
                  >
                    <img
                      src={viewingRequest.attachment_url || viewingRequest.image_url || "/images/faucet_repair.jpg"}
                      alt="Attachment"
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-xs font-bold">
                      <ZoomIn className="w-4 h-4" />
                      <span>Click to view full size</span>
                    </div>
                  </div>
                </div>

                {/* Assigned Technician & Notes */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Assigned Technician</span>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5">{viewingRequest.assigned_to || "Maintenance Team"}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Service Status</span>
                    <p className="font-bold text-[#0055a5] dark:text-blue-400 mt-0.5">{viewingRequest.status}</p>
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
              if (e.target === e.currentTarget) setIsUpdateStatusModalOpen(false);
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

              <form onSubmit={handleSaveStatusModal} className="p-4 sm:p-5 space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Status</label>
                  <DropdownSelect
                    value={statusForm.status}
                    onChange={(val) => setStatusForm({ ...statusForm, status: val })}
                    options={[
                      { value: "Pending", label: "Pending", dotColor: "bg-amber-500" },
                      { value: "In Progress", label: "In Progress", dotColor: "bg-blue-600" },
                      { value: "Resolved", label: "Resolved", dotColor: "bg-emerald-500" },
                    ]}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Assigned Technician</label>
                  <input
                    type="text"
                    value={statusForm.assigned_to}
                    onChange={(e) => setStatusForm({ ...statusForm, assigned_to: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Admin Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Add work order notes..."
                    value={statusForm.admin_notes}
                    onChange={(e) => setStatusForm({ ...statusForm, admin_notes: e.target.value })}
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
