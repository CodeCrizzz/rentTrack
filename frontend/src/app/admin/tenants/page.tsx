"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Users,
  UserCheck,
  UserMinus,
  FileText,
  Receipt,
  Calendar,
  MapPin,
  Bell,
  BarChart3,
  Search,
  Plus,
  MoreHorizontal,
  ChevronDown,
  Check,
  X,
  BedDouble,
  CreditCard,
  MessageSquare,
  Send,
  Eye,
  Edit,
  Trash2,
  DoorOpen,
  AlertCircle,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Phone,
  Mail,
  User,
  Clock,
  ExternalLink,
} from "lucide-react";
import CustomSelect from "@/components/dropdown-select";
import AdminReportModal from "@/components/admin-report-modal";
import { formatPhoneNumber, formatPhoneInput } from "@/lib/phone-utils";

interface Tenant {
  id: number;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  room_number: string | null;
  room_id: number | null;
  room_type?: string;
  rental_type?: string;
  floor?: string;
  gender?: string;
  address?: string;
  id_document?: string;
  bed_space?: string;
  date_moved_in?: string;
  contract_end_date?: string;
  monthly_rent?: number;
  payment_status?: "Paid" | "Unpaid" | "Overdue" | "No Bills Yet" | "N/A";
  last_payment_date?: string;
  next_due_date?: string;
  balance?: number;
  status: "Active" | "Inactive" | "Moved Out" | "Pending" | "Declined";
  emergency_contact?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
}

interface Room {
  id: number;
  room_number: string;
  type: string;
  rental_type: string;
  price: string | number;
  floor: string | null;
  capacity: number;
  status: string;
}

function TenantsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Core Data
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adminName, setAdminName] = useState("Admin");
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);

  // Selection & Active Dossier
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [activeMenuTenantId, setActiveMenuTenantId] = useState<number | null>(null);

  // Tabs & Filters (Matching Mockup: All Tenants | Active | Pending | Moved Out)
  const [activeTab, setActiveTab] = useState<"all" | "active" | "pending" | "moved_out">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [roomTypeFilter, setRoomTypeFilter] = useState("All Room Types");
  const [floorFilter, setFloorFilter] = useState("All Floors");

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<{
    id: number;
    name: string;
    action: "Approve" | "Reject";
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStatusUpdating, setIsStatusUpdating] = useState<number | null>(null);
  const [isDeletingTenantId, setIsDeletingTenantId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    room_id: "" as string | number,
    address: "",
    gender: "",
    monthly_rent: "",
    date_moved_in: "",
    contract_end_date: "",
    status: "Active",
  });

  // Time & Greeting
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

  // Fetch admin user
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        if (u.name) setAdminName(u.name);
      } catch (e) {}
    }
  }, []);

  // Fetch Data
  const fetchTenants = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const { data } = await api.get("/admin/tenants");
      const enriched: Tenant[] = (data || []).map((t: any) => ({
        ...t,
        phone: formatPhoneNumber(t.phone, ""),
        gender: t.gender || "Not Specified",
        address: t.address || "",
        id_document: t.id_document ? "Verified" : "Pending",
        bed_space: t.bed_space || "N/A",
        date_moved_in: t.date_moved_in
          ? new Date(t.date_moved_in).toISOString().split("T")[0]
          : "",
        contract_end_date: t.contract_end_date
          ? new Date(t.contract_end_date).toISOString().split("T")[0]
          : "",
        monthly_rent: Number(t.monthly_rent) || 0,
        payment_status:
          t.balance == null
            ? "No Bills Yet"
            : Number(t.balance) > 0
              ? "Overdue"
              : "Paid",
        last_payment_date: t.last_payment_date || "N/A",
        balance: Number(t.balance) || 0,
        status: t.status || (t.room_number ? "Active" : "Pending"),
      }));

      setTenants(enriched);
      if (enriched.length > 0) {
        setSelectedTenant((prev) => {
          if (!prev) return enriched[0];
          const matched = enriched.find((x) => x.id === prev.id);
          return matched || enriched[0];
        });
      }
    } catch (err: any) {
      console.error("Failed to fetch tenants:", err);
      toast.error("Failed to load resident directory");
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const { data } = await api.get("/admin/rooms");
      setRooms(data || []);
    } catch (err) {
      console.error("Failed to fetch rooms:", err);
    }
  };

  const fetchPendingPayments = async () => {
    try {
      const { data } = await api.get("/admin/bills/payments/pending-count");
      if (data && typeof data.pendingCount !== "undefined") {
        setPendingPaymentsCount(data.pendingCount);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchTenants();
    fetchRooms();
    fetchPendingPayments();
  }, []);

  // Handle URL search params
  useEffect(() => {
    if (!searchParams) return;
    const tabParam = searchParams.get("tab");
    const searchParam = searchParams.get("search");
    const tenantIdParam = searchParams.get("tenantId");

    if (tabParam === "approvals" || tabParam === "pending") {
      setActiveTab("pending");
      setStatusFilter("Pending");
    }
    if (searchParam) {
      setSearchQuery(searchParam);
    }
    if (tenantIdParam && tenants.length > 0) {
      const matched = tenants.find((t) => t.id === Number(tenantIdParam));
      if (matched) {
        setSelectedTenant(matched);
      }
    }
  }, [searchParams, tenants]);

  // Click outside to close action menu
  useEffect(() => {
    const handleCloseMenu = () => setActiveMenuTenantId(null);
    window.addEventListener("click", handleCloseMenu);
    return () => window.removeEventListener("click", handleCloseMenu);
  }, []);

  // Compute Metrics matching the 4 Top KPI Cards
  const metrics = useMemo(() => {
    const totalBeds = rooms.reduce((acc, r) => acc + (r.capacity || 0), 0);
    const activeCount = tenants.filter((t) => t.status === "Active").length;
    const pendingCount = tenants.filter((t) => t.status === "Pending").length;
    const movedOutCount = tenants.filter((t) => t.status === "Moved Out").length;
    const total = tenants.length;

    return {
      total,
      totalBeds: totalBeds || 32,
      activeCount,
      pendingCount,
      movedOutCount,
    };
  }, [tenants, rooms]);

  // Unique Room Types & Floors for Dropdowns
  const uniqueRoomTypes = useMemo(() => {
    const set = new Set<string>();
    rooms.forEach((r) => {
      if (r.type) set.add(r.type.includes("Room") ? r.type : `${r.type} Room`);
    });
    // Add default fallbacks if room inventory is small
    ["Single Room", "Double Room", "Triple Room"].forEach((t) => set.add(t));
    return Array.from(set).sort();
  }, [rooms]);

  const uniqueFloors = useMemo(() => {
    const set = new Set<string>();
    rooms.forEach((r) => {
      if (r.floor) {
        const match = r.floor.match(/\d+/);
        set.add(match ? `Floor ${match[0]}` : r.floor);
      } else if (r.room_number && r.room_number.length >= 3 && !isNaN(Number(r.room_number[0]))) {
        set.add(`Floor ${r.room_number[0]}`);
      }
    });
    ["Floor 1", "Floor 2", "Floor 3"].forEach((f) => set.add(f));
    return Array.from(set).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, "")) || 0;
      const numB = parseInt(b.replace(/\D/g, "")) || 0;
      return numA - numB;
    });
  }, [rooms]);

  // Helper: Format Tenant Room Type & Rental Model
  const getTenantRoomType = (t: Tenant) => {
    if (t.room_type) {
      return t.room_type.includes("Room") ? t.room_type : `${t.room_type} Room`;
    }
    const matchedRoom = rooms.find((r) => r.room_number === t.room_number);
    if (matchedRoom?.type) {
      return matchedRoom.type.includes("Room") ? matchedRoom.type : `${matchedRoom.type} Room`;
    }
    return "Single Room";
  };

  const getTenantRentalModel = (t: Tenant) => {
    if (t.rental_type) return t.rental_type;
    if (t.bed_space && t.bed_space !== "N/A" && t.bed_space.toLowerCase().includes("bed")) {
      return "Bedspace";
    }
    const matchedRoom = rooms.find((r) => r.room_number === t.room_number);
    if (matchedRoom?.rental_type) return matchedRoom.rental_type;
    return "Whole Room";
  };

  const getTenantFloor = (t: Tenant) => {
    if (t.floor) return t.floor;
    const matchedRoom = rooms.find((r) => r.room_number === t.room_number);
    if (matchedRoom?.floor) return matchedRoom.floor;
    if (t.room_number && t.room_number.length >= 3 && !isNaN(Number(t.room_number[0]))) {
      return `Floor ${t.room_number[0]}`;
    }
    return "Floor 1";
  };

  // Filtered tenants list
  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      // 1. Tab Filter
      if (activeTab === "active" && t.status !== "Active") return false;
      if (activeTab === "pending" && t.status !== "Pending") return false;
      if (activeTab === "moved_out" && t.status !== "Moved Out") return false;

      // 2. Status Dropdown Filter
      if (statusFilter !== "All Statuses" && t.status !== statusFilter) return false;

      // 3. Room Type Dropdown Filter
      if (roomTypeFilter !== "All Room Types") {
        const effectiveType = getTenantRoomType(t);
        if (effectiveType.toLowerCase() !== roomTypeFilter.toLowerCase()) return false;
      }

      // 4. Floor Dropdown Filter
      if (floorFilter !== "All Floors") {
        const effectiveFloor = getTenantFloor(t);
        const matchNumber = floorFilter.match(/\d+/);
        if (matchNumber && !effectiveFloor.includes(matchNumber[0])) return false;
      }

      // 5. Search Bar Query (name, email, phone, room number)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (t.name || "").toLowerCase().includes(q);
        const emailMatch = (t.email || "").toLowerCase().includes(q);
        const phoneMatch = (t.phone || "").toLowerCase().includes(q);
        const roomMatch = (t.room_number || "").toLowerCase().includes(q);
        if (!nameMatch && !emailMatch && !phoneMatch && !roomMatch) return false;
      }

      return true;
    });
  }, [tenants, activeTab, statusFilter, roomTypeFilter, floorFilter, searchQuery, rooms]);

  // Handle Tab Switch
  const handleTabChange = (tab: "all" | "active" | "pending" | "moved_out") => {
    setActiveTab(tab);
    if (tab === "active") setStatusFilter("Active");
    else if (tab === "pending") setStatusFilter("Pending");
    else if (tab === "moved_out") setStatusFilter("Moved Out");
    else setStatusFilter("All Statuses");
  };

  // Modal Handlers
  const handleOpenAddModal = () => {
    setEditingTenant(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      password: "",
      room_id: "",
      address: "",
      gender: "Male",
      monthly_rent: "",
      date_moved_in: new Date().toISOString().split("T")[0],
      contract_end_date: "",
      status: "Active",
    });
    setError("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormData({
      name: tenant.name,
      email: tenant.email,
      phone: formatPhoneNumber(tenant.phone, ""),
      password: "",
      room_id: tenant.room_id?.toString() ?? "",
      address: tenant.address || "",
      gender: tenant.gender || "Male",
      monthly_rent: tenant.monthly_rent?.toString() || "",
      date_moved_in: tenant.date_moved_in || "",
      contract_end_date: tenant.contract_end_date || "",
      status: tenant.status || "Active",
    });
    setError("");
    setIsModalOpen(true);
  };

  const handleSubmitTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      toast.warning("Incomplete Resident Profile", {
        description: "Please fill in the resident's full name and contact number.",
      });
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      if (editingTenant) {
        await api.put(`/admin/tenants/${editingTenant.id}`, formData);
        toast.success("Resident Profile Updated", {
          description: `${formData.name}'s profile and lease details have been saved.`,
        });
      } else {
        await api.post("/admin/tenants", formData);
        toast.success("Resident Registered Successfully", {
          description: `${formData.name} has been enrolled in the directory.`,
        });
      }
      setIsModalOpen(false);
      fetchTenants(true);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || "Failed to save tenant information.";
      setError(errMsg);
      toast.error(editingTenant ? "Failed to Update Resident" : "Failed to Register Resident", {
        description: errMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status Approval / Rejection
  const executeStatusUpdate = async () => {
    if (!confirmStatus) return;
    setIsStatusUpdating(confirmStatus.id);
    try {
      const status = confirmStatus.action === "Approve" ? "Active" : "Declined";
      await api.put(`/admin/tenants/${confirmStatus.id}`, { status });
      toast.success(
        confirmStatus.action === "Approve" ? "Application Approved" : "Application Declined",
        {
          description: `Resident application for ${confirmStatus.name} was ${confirmStatus.action === "Approve" ? "approved" : "declined"}.`,
        }
      );
      fetchTenants(true);
      if (selectedTenant?.id === confirmStatus.id) {
        setSelectedTenant((prev) => (prev ? { ...prev, status } : null));
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Application Status Failed", {
        description: "Failed to update resident application status.",
      });
    } finally {
      setIsStatusUpdating(null);
      setConfirmStatus(null);
    }
  };

  // Delete Tenant
  const handleDeleteTenant = async (tenant: Tenant) => {
    if (!window.confirm(`Permanently remove ${tenant.name} from residents directory?`)) {
      return;
    }
    setIsDeletingTenantId(tenant.id);
    try {
      await api.delete(`/admin/tenants/${tenant.id}`);
      toast.success("Resident Record Removed", {
        description: `Resident ${tenant.name} has been deleted from the directory.`,
      });
      fetchTenants(true);
      if (selectedTenant?.id === tenant.id) {
        setSelectedTenant(null);
      }
    } catch (err: any) {
      toast.error("Deletion Failed", {
        description: err.response?.data?.message || "Could not delete resident record.",
      });
    } finally {
      setIsDeletingTenantId(null);
    }
  };



  // Helper for Initials / Avatar: Default profile picture for all tenants is a single letter
  const getInitials = (name?: string) => {
    if (!name) return "T";
    return name.trim().charAt(0).toUpperCase();
  };

  const getTenantPhoto = (_tenant: Tenant) => {
    return null;
  };

  // Color palette for initials avatars (e.g. RC, AR, MA, DC in mockup)
  const getAvatarBgClass = (name: string) => {
    const palette = [
      "bg-[#2563eb] text-white", // Vibrant Blue (RC, AR)
      "bg-[#0284c7] text-white", // Sky
      "bg-[#4f46e5] text-white", // Indigo
      "bg-[#64748b] text-white", // Slate (MA)
      "bg-[#0d9488] text-white", // Teal (DC)
    ];
    let code = 0;
    for (let i = 0; i < name.length; i++) {
      code = name.charCodeAt(i) + ((code << 5) - code);
    }
    return palette[Math.abs(code) % palette.length];
  };

  // Parse emergency contact gracefully
  const parseEmergencyContact = (tenant: Tenant) => {
    const raw = tenant.emergency_contact;
    if (!raw) {
      return {
        relation: tenant.emergency_contact_relation || "Mother",
        name: tenant.emergency_contact_name || "Maria Dela Cruz",
        phone: formatPhoneNumber(tenant.emergency_contact_phone, "+63 905 111 2233"),
      };
    }

    const phoneMatch = raw.match(/\+?\d[\d\s-]{8,}/);
    const rawPhone = phoneMatch ? phoneMatch[0] : (tenant.emergency_contact_phone || "+63 905 111 2233");
    let clean = raw.replace(/\(?\+?\d[\d\s-]{8,}\)?/, "").replace(/[()]/g, "").trim();
    let relation = tenant.emergency_contact_relation || "Mother";
    if (clean.includes(":")) {
      const parts = clean.split(":");
      relation = parts[0].trim();
      clean = parts[1].trim();
    }

    return {
      relation: relation || "Mother",
      name: clean || tenant.emergency_contact_name || "Maria Dela Cruz",
      phone: formatPhoneNumber(rawPhone, "+63 905 111 2233"),
    };
  };

  return (
    <div className="w-full h-full flex-1 min-h-0 font-sans text-slate-900 dark:text-zinc-100 flex flex-col overflow-hidden gap-2 sm:gap-2.5">
      {/* 1. TOP SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0 pb-0.5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white tracking-tight leading-none">
            Manage Tenants
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium mt-0.5">
            Real-time directory overview of active residents, pending applications, and lease statuses.
          </p>
        </div>

        {/* Top Right Actions: Generate Report */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">

          {/* Generate Report Button */}
          <button
            onClick={() => setShowReportModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-[#0055a5] hover:bg-[#00478f] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5 text-white stroke-[2.2]" />
            <span>Generate Report</span>
          </button>
        </div>
      </div>

      {/* 2. FOUR KPI CARDS RIBBON (Exact match to Mockup UI) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0">
        {/* Card 1: Total Active Tenants */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-xl p-3 shadow-2xs flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 block">
              Total Active Tenants
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white mt-0.5">
              {metrics.activeCount}{" "}
              <span className="text-sm font-semibold text-slate-400">
                / {metrics.totalBeds}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {metrics.activeCount}
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center">
                ↑ 6%{" "}
                <span className="text-slate-400 font-normal ml-0.5">
                  vs. last mo.
                </span>
              </span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-800/40">
            <Users className="w-4 h-4 stroke-[2.2]" />
          </div>
        </div>

        {/* Card 2: Pending Applications */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-xl p-3 shadow-2xs flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 block">
              Pending Applications
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white mt-0.5">
              {metrics.pendingCount}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
              <span>🔶</span>
              <span>{metrics.pendingCount} new this week</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-800/40">
            <FileText className="w-4 h-4 stroke-[2.2]" />
          </div>
        </div>

        {/* Card 3: Payment Receipts (Pending Verification) */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-xl p-3 shadow-2xs flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 block">
              Payment Receipts (Pending Verification)
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white mt-0.5">
              {pendingPaymentsCount}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold text-blue-600 dark:text-blue-400">
              <span>🔷</span>
              <span>{pendingPaymentsCount} awaiting review</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-800/40">
            <Receipt className="w-4 h-4 stroke-[2.2]" />
          </div>
        </div>

        {/* Card 4: Moved Out (This Month) */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-xl p-3 shadow-2xs flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 block">
              Moved Out (This Month)
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white mt-0.5">
              {metrics.movedOutCount}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold text-purple-600 dark:text-purple-400">
              <span>🟣</span>
              <span>0 vs. last month</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-100 dark:border-purple-800/40">
            <UserMinus className="w-4 h-4 stroke-[2.2]" />
          </div>
        </div>
      </div>

      {/* 3. MAIN SPLIT VIEW (Left: Tenant Management Table | Right: Tenant Profile Dossier) */}
      <div className="flex-1 min-h-0 flex flex-col xl:flex-row items-stretch gap-3 overflow-hidden">
        {/* LEFT COLUMN: TENANT MANAGEMENT CARD */}
        <div className="flex-1 min-w-0 w-full h-full bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex flex-col min-h-0 overflow-hidden">
          {/* Header */}
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-950 dark:text-white tracking-tight">
              Tenant Management
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              View and manage all tenant accounts and their details.
            </p>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative w-52 sm:w-60">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tenants..."
                className="w-full pl-3.5 pr-8 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-blue-500"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              )}
            </div>

            {/* Statuses Dropdown */}
            <div className="w-32 sm:w-36">
              <CustomSelect
                value={statusFilter}
                onChange={(val) => {
                  setStatusFilter(val);
                  if (val === "Active") setActiveTab("active");
                  else if (val === "Pending") setActiveTab("pending");
                  else if (val === "Moved Out") setActiveTab("moved_out");
                  else setActiveTab("all");
                }}
                options={["All Statuses", "Active", "Pending", "Moved Out"]}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 outline-none"
              />
            </div>

            {/* Room Types Dropdown */}
            <div className="w-36 sm:w-40">
              <CustomSelect
                value={roomTypeFilter}
                onChange={(val) => setRoomTypeFilter(val)}
                options={["All Room Types", ...uniqueRoomTypes]}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 outline-none"
              />
            </div>

            {/* All Floors Dropdown */}
            <div className="w-32 sm:w-36">
              <CustomSelect
                value={floorFilter}
                onChange={(val) => setFloorFilter(val)}
                options={["All Floors", ...uniqueFloors]}
                maxListHeight="175px"
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 outline-none"
              />
            </div>

            {/* + Add Tenant Button */}
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 rounded-xl bg-[#0055a5] hover:bg-[#00478f] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Tenant</span>
            </button>
          </div>

          {/* Filter Tabs Bar (Exact match to Mockup) */}
          <div className="flex items-center gap-6 border-b border-slate-200/80 dark:border-zinc-800 pt-1">
            <button
              onClick={() => handleTabChange("all")}
              className={`flex items-center gap-2 pb-2.5 text-xs font-bold transition-all relative cursor-pointer ${
                activeTab === "all"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              <span>All Tenants</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  activeTab === "all"
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60"
                    : "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                {metrics.total}
              </span>
              {activeTab === "all" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>

            <button
              onClick={() => handleTabChange("active")}
              className={`flex items-center gap-2 pb-2.5 text-xs font-bold transition-all relative cursor-pointer ${
                activeTab === "active"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              <span>Active</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  activeTab === "active"
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60"
                    : "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                {metrics.activeCount}
              </span>
              {activeTab === "active" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>

            <button
              onClick={() => handleTabChange("pending")}
              className={`flex items-center gap-2 pb-2.5 text-xs font-bold transition-all relative cursor-pointer ${
                activeTab === "pending"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              <span>Pending</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  activeTab === "pending"
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60"
                    : "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                {metrics.pendingCount}
              </span>
              {activeTab === "pending" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>

            <button
              onClick={() => handleTabChange("moved_out")}
              className={`flex items-center gap-2 pb-2.5 text-xs font-bold transition-all relative cursor-pointer ${
                activeTab === "moved_out"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              <span>Moved Out</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  activeTab === "moved_out"
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60"
                    : "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                {metrics.movedOutCount}
              </span>
              {activeTab === "moved_out" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
          </div>

          {/* Table Container: minimum 8 tenants visible in view, remaining scrollable with scrollbar */}
          <div className="flex-1 min-h-[384px] overflow-x-auto overflow-y-auto custom-scrollbar border border-slate-100 dark:border-zinc-800/80 rounded-xl mt-2">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-white dark:bg-zinc-900 z-10 border-b border-slate-200/80 dark:border-zinc-800 shadow-2xs">
                <tr className="text-[11px] font-bold text-slate-600 dark:text-zinc-400">
                  <th className="py-2.5 px-3 pl-3.5">Tenant</th>
                  <th className="py-2.5 px-3">Room</th>
                  <th className="py-2.5 px-3">Room Type</th>
                  <th className="py-2.5 px-3">Rental Model</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Monthly Rent</th>
                  <th className="py-2.5 px-3">Contact</th>
                  <th className="py-2.5 px-3 text-right pr-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                {isLoading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={8} className="py-3 px-3">
                        <div className="h-4 bg-slate-100 dark:bg-zinc-800 rounded w-full" />
                      </td>
                    </tr>
                  ))
                ) : filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No tenants found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((tenant) => {
                    const isSelected = selectedTenant?.id === tenant.id;

                    return (
                      <tr
                        key={tenant.id}
                        onClick={() => setSelectedTenant(tenant)}
                        className={`transition-colors cursor-pointer group ${
                          isSelected
                            ? "bg-blue-50/60 dark:bg-blue-950/20"
                            : "hover:bg-slate-50/80 dark:hover:bg-zinc-800/40"
                        }`}
                      >
                        {/* Tenant Identity */}
                        <td className="py-2 px-3 pl-3.5">
                          <div className="flex items-center gap-2">
                            {(() => {
                              const photo = getTenantPhoto(tenant);
                              if (photo) {
                                return (
                                  <img
                                    src={photo}
                                    alt={tenant.name}
                                    className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200 dark:border-zinc-700 shadow-2xs"
                                  />
                                );
                              }
                              return (
                                <div
                                  className={`w-7 h-7 rounded-full font-bold text-[11px] flex items-center justify-center shrink-0 shadow-2xs ${getAvatarBgClass(
                                    tenant.name
                                  )}`}
                                >
                                  {getInitials(tenant.name)}
                                </div>
                              );
                            })()}
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 dark:text-white block truncate leading-tight">
                                {tenant.name}
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-zinc-400 block truncate leading-tight mt-0.5">
                                {tenant.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Room */}
                        <td className="py-2 px-3 font-semibold text-slate-800 dark:text-zinc-200">
                          {tenant.room_number ? tenant.room_number : "—"}
                        </td>

                        {/* Room Type */}
                        <td className="py-2 px-3 text-slate-600 dark:text-zinc-300">
                          {getTenantRoomType(tenant)}
                        </td>

                        {/* Rental Model */}
                        <td className="py-2 px-3 text-slate-600 dark:text-zinc-300">
                          {getTenantRentalModel(tenant)}
                        </td>

                        {/* Status Badge */}
                        <td className="py-2 px-3">
                          {tenant.status === "Active" && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Active
                            </span>
                          )}
                          {tenant.status === "Pending" && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60 inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Pending
                            </span>
                          )}
                          {(tenant.status === "Moved Out" || tenant.status === "Inactive") && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 inline-flex items-center gap-1">
                              <DoorOpen className="w-2.5 h-2.5" />
                              Moved Out
                            </span>
                          )}
                          {tenant.status === "Declined" && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200/60 inline-flex items-center gap-1">
                              Declined
                            </span>
                          )}
                        </td>

                        {/* Monthly Rent */}
                        <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-white">
                          ₱ {Number(tenant.monthly_rent || 0).toLocaleString()}
                        </td>

                        {/* Contact */}
                        <td className="py-2 px-3 font-mono text-slate-600 dark:text-zinc-300">
                          {formatPhoneNumber(tenant.phone)}
                        </td>

                        {/* Actions */}
                        <td className="py-2 px-3 text-right relative pr-3.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuTenantId(
                                activeMenuTenantId === tenant.id ? null : tenant.id
                              );
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {/* Popover Action Menu */}
                          {activeMenuTenantId === tenant.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-2 bottom-6 w-44 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-slate-200 dark:border-zinc-800 py-1.5 z-30 text-xs text-left"
                            >
                              <button
                                onClick={() => {
                                  setActiveMenuTenantId(null);
                                  setSelectedTenant(tenant);
                                  setIsViewModalOpen(true);
                                }}
                                className="w-full px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-2 font-medium"
                              >
                                <Eye className="w-3.5 h-3.5 text-blue-500" />
                                View Profile
                              </button>
                              <button
                                onClick={() => {
                                  setActiveMenuTenantId(null);
                                  handleOpenEditModal(tenant);
                                }}
                                className="w-full px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-2 font-medium"
                              >
                                <Edit className="w-3.5 h-3.5 text-slate-500" />
                                Edit Details
                              </button>
                              {tenant.status === "Pending" && (
                                <>
                                  <button
                                    onClick={() => {
                                      setActiveMenuTenantId(null);
                                      setConfirmStatus({
                                        id: tenant.id,
                                        name: tenant.name,
                                        action: "Approve",
                                      });
                                    }}
                                    className="w-full px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-2 text-emerald-600 font-medium"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    Approve Resident
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveMenuTenantId(null);
                                      setConfirmStatus({
                                        id: tenant.id,
                                        name: tenant.name,
                                        action: "Reject",
                                      });
                                    }}
                                    className="w-full px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-2 text-rose-600 font-medium"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    Decline Application
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => {
                                  setActiveMenuTenantId(null);
                                  router.push(`/admin/chat?tenant_id=${tenant.id}`);
                                }}
                                className="w-full px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-2 font-medium"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-teal-500" />
                                Send Message
                              </button>
                              <button
                                onClick={() => {
                                  setActiveMenuTenantId(null);
                                  router.push(`/admin/billing?action=create&tenant_id=${tenant.id}`);
                                }}
                                className="w-full px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-2 font-medium"
                              >
                                <Receipt className="w-3.5 h-3.5 text-indigo-500" />
                                Issue Bill
                              </button>
                              <div className="border-t border-slate-100 dark:border-zinc-800 my-1" />
                              <button
                                onClick={() => {
                                  setActiveMenuTenantId(null);
                                  handleDeleteTenant(tenant);
                                }}
                                className="w-full px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-2 text-rose-600 font-medium"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: TENANT PROFILE DOSSIER (Exact match to Mockup UI) */}
        {selectedTenant && (
          <div className="w-full xl:w-[320px] 2xl:w-[360px] shrink-0 h-full bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex flex-col min-h-0 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800/80 shrink-0">
              <h3 className="text-sm sm:text-base font-black text-slate-950 dark:text-white">
                Tenant Profile
              </h3>
              <button
                onClick={() => setIsViewModalOpen(true)}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View full profile</span>
                <span>→</span>
              </button>
            </div>

            {/* Scrollable Dossier Content */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-0.5 space-y-3 mt-2.5">
              {/* Profile Overview Card */}
              <div className="flex items-center gap-3">
              {(() => {
                const photo = getTenantPhoto(selectedTenant);
                if (photo) {
                  return (
                    <img
                      src={photo}
                      alt={selectedTenant.name}
                      className="w-14 h-14 rounded-full object-cover shrink-0 border-2 border-white dark:border-zinc-700 shadow-md"
                    />
                  );
                }
                return (
                  <div
                    className={`w-14 h-14 rounded-full font-extrabold text-lg flex items-center justify-center shrink-0 border-2 border-white dark:border-zinc-700 shadow-md ${getAvatarBgClass(
                      selectedTenant.name
                    )}`}
                  >
                    {getInitials(selectedTenant.name)}
                  </div>
                );
              })()}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-sm sm:text-base text-slate-950 dark:text-white truncate">
                    {selectedTenant.name}
                  </h4>
                  {selectedTenant.status === "Active" && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/60 inline-flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  )}
                  {selectedTenant.status === "Pending" && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200/60 inline-flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-amber-500" />
                      Pending
                    </span>
                  )}
                  {(selectedTenant.status === "Moved Out" || selectedTenant.status === "Inactive") && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400 border border-slate-200 inline-flex items-center gap-1">
                      Moved Out
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                  {selectedTenant.email}
                </p>
                <p className="text-[11px] font-mono font-medium text-slate-600 dark:text-zinc-300 truncate mt-0.5">
                  📞 {formatPhoneNumber(selectedTenant.phone, "+63 999 123 7654")}
                </p>
              </div>
            </div>

            {/* 3 Metric Tiles (Room, Since, Tenant ID) */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 rounded-xl border border-slate-200/90 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 flex items-start gap-1.5">
                <DoorOpen className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-slate-900 dark:text-white block truncate leading-tight">
                    Room {selectedTenant.room_number || "101"}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400 block truncate mt-0.5">
                    {getTenantRoomType(selectedTenant)}
                  </span>
                </div>
              </div>

              <div className="p-2 rounded-xl border border-slate-200/90 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 flex items-start gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-slate-900 dark:text-white block truncate leading-tight">
                    Since
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400 block truncate mt-0.5 font-mono">
                    {selectedTenant.date_moved_in
                      ? new Date(selectedTenant.date_moved_in).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Aug 15, 2026"}
                  </span>
                </div>
              </div>

              <div className="p-2 rounded-xl border border-slate-200/90 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 flex items-start gap-1.5">
                <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-slate-900 dark:text-white block truncate leading-tight">
                    Tenant ID
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400 block truncate mt-0.5 font-mono font-bold">
                    TR-{String(selectedTenant.id).padStart(4, "0")}
                  </span>
                </div>
              </div>
            </div>

            {/* Room & Billing Information Section */}
            <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-zinc-800/80">
              <h5 className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Room & Billing Information
              </h5>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-600 dark:text-zinc-400">
                  <span>Rental Model</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {getTenantRentalModel(selectedTenant)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-zinc-400">
                  <span>Monthly Rent</span>
                  <span className="font-mono font-black text-slate-900 dark:text-white">
                    ₱ {Number(selectedTenant.monthly_rent || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-zinc-400">
                  <span>Next Due Date</span>
                  <span className="font-medium text-slate-700 dark:text-zinc-300 font-mono">
                    {selectedTenant.next_due_date
                      ? new Date(selectedTenant.next_due_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Nov 5, 2026"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-zinc-400">
                  <span>Current Balance</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`font-mono font-black ${
                        (Number(selectedTenant.balance) || 0) > 0
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-slate-900 dark:text-white"
                      }`}
                    >
                      ₱ {Number(selectedTenant.balance || 0).toLocaleString()}
                    </span>
                    {(Number(selectedTenant.balance) || 0) <= 0 ? (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        Paid
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                        Overdue
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency Contact Section */}
            <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-zinc-800/80">
              <h5 className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Emergency Contact
              </h5>
              {(() => {
                const ec = parseEmergencyContact(selectedTenant);
                return (
                  <div className="flex items-start justify-between text-xs">
                    <span className="text-slate-500 dark:text-zinc-400 font-medium">
                      {ec.relation}
                    </span>
                    <div className="text-right">
                      <span className="font-bold text-slate-900 dark:text-white block">
                        {ec.name}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono block mt-0.5">
                        📞 {ec.phone}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Documents Section */}
            <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-zinc-800/80">
              <h5 className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Documents
              </h5>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-zinc-300 font-medium">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Valid ID</span>
                  </div>
                  <button
                    onClick={() => setIsViewModalOpen(true)}
                    className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                  >
                    View
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-zinc-300 font-medium">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Application Form</span>
                  </div>
                  <button
                    onClick={() => setIsViewModalOpen(true)}
                    className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                  >
                    View
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-zinc-300 font-medium">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Lease Agreement</span>
                  </div>
                  <button
                    onClick={() => setIsViewModalOpen(true)}
                    className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                  >
                    View
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions Section */}
            <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-zinc-800/80">
              <h5 className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Quick Actions
              </h5>
              <div className="space-y-2">
                {/* 1. Solid Blue Button: View Tenant Profile */}
                <button
                  onClick={() => setIsViewModalOpen(true)}
                  className="w-full py-2.5 rounded-xl bg-[#0055a5] hover:bg-[#00478f] text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>View Tenant Profile</span>
                </button>

                {/* 2. Outlined Button: Send Message */}
                <button
                  onClick={() => router.push(`/admin/chat?tenant_id=${selectedTenant.id}`)}
                  className="w-full py-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-xs font-bold shadow-2xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-blue-600 stroke-[2.2]" />
                  <span>Send Message</span>
                </button>

                {/* 3. Outlined Button: Issue Bill */}
                <button
                  onClick={() => router.push(`/admin/billing?action=create&tenant_id=${selectedTenant.id}`)}
                  className="w-full py-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-xs font-bold shadow-2xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Receipt className="w-3.5 h-3.5 text-blue-600 stroke-[2.2]" />
                  <span>Issue Bill</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* MODAL 1: ADD / EDIT TENANT */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl border border-slate-200 dark:border-zinc-800 max-h-[90vh] flex flex-col"
            >
              <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingTenant ? `Edit Resident: ${editingTenant.name}` : "Register New Resident"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Configure resident profile, room assignment, and lease terms.
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitTenant} className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-rose-50 text-rose-600 text-xs font-semibold flex items-center gap-2 border border-rose-200">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Juan Dela Cruz"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. juan@email.com"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase">
                      Phone Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: formatPhoneInput(e.target.value) })
                      }
                      placeholder="+63 999 123 7654"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  {!editingTenant && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase">
                        Account Password *
                      </label>
                      <input
                        type="password"
                        required={!editingTenant}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  {editingTenant && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase">
                        Account Status
                      </label>
                      <CustomSelect
                        value={formData.status}
                        onChange={(val) => setFormData({ ...formData, status: val })}
                        options={[
                          { value: "Active", label: "Active", dotColor: "bg-emerald-500" },
                          { value: "Pending", label: "Pending", dotColor: "bg-amber-500" },
                          { value: "Moved Out", label: "Moved Out", dotColor: "bg-slate-400" },
                          { value: "Declined", label: "Declined", dotColor: "bg-rose-500" },
                        ]}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white outline-none"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase">
                      Assigned Room
                    </label>
                    <CustomSelect
                      value={String(formData.room_id || "")}
                      onChange={(val) => setFormData({ ...formData, room_id: val })}
                      options={[
                        { value: "", label: "No Room Assigned (Pending)" },
                        ...rooms.map((r) => ({
                          value: String(r.id),
                          label: `Room ${r.room_number} (${r.type}) — ₱${Number(r.price).toLocaleString()}`,
                        })),
                      ]}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase">
                      Monthly Rent (₱)
                    </label>
                    <input
                      type="number"
                      value={formData.monthly_rent}
                      onChange={(e) => setFormData({ ...formData, monthly_rent: e.target.value })}
                      placeholder="e.g. 4500"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase">
                      Move-In Date
                    </label>
                    <input
                      type="date"
                      value={formData.date_moved_in}
                      onChange={(e) => setFormData({ ...formData, date_moved_in: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase">
                      Gender
                    </label>
                    <CustomSelect
                      value={formData.gender}
                      onChange={(val) => setFormData({ ...formData, gender: val })}
                      options={["Male", "Female", "Other"]}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-zinc-800 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 text-xs font-bold rounded-lg bg-[#0055a5] hover:bg-[#00478f] text-white flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    )}
                    <span>Save Resident</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: VIEW FULL PROFILE INSPECTION */}
      <AnimatePresence>
        {isViewModalOpen && selectedTenant && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-zinc-800 max-h-[90vh] flex flex-col"
            >
              <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 font-extrabold flex items-center justify-center">
                    {getInitials(selectedTenant.name)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {selectedTenant.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      Tenant ID: TR-{String(selectedTenant.id).padStart(4, "0")} • Room {selectedTenant.room_number || "Unassigned"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar space-y-4 text-xs">
                {/* 3 Top Financial Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Monthly Rent</span>
                    <span className="text-base font-black font-mono text-slate-900 dark:text-white mt-0.5 block">
                      ₱ {Number(selectedTenant.monthly_rent || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Current Balance</span>
                    <span
                      className={`text-base font-black font-mono mt-0.5 block ${
                        (Number(selectedTenant.balance) || 0) > 0 ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      ₱ {Number(selectedTenant.balance || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Last Payment</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 mt-1 block font-mono">
                      {selectedTenant.last_payment_date || "No payment record"}
                    </span>
                  </div>
                </div>

                {/* Personal & Lease Details */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2 p-3.5 rounded-xl border border-slate-200/90 dark:border-zinc-800">
                    <h5 className="font-bold text-slate-900 dark:text-white uppercase text-[11px]">
                      Contact Details
                    </h5>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Email</span>
                      <span className="font-bold text-slate-800 dark:text-zinc-200">{selectedTenant.email}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Phone</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
                        {formatPhoneNumber(selectedTenant.phone)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Address</span>
                      <span className="font-medium text-slate-700 dark:text-zinc-300">
                        {selectedTenant.address || "Riverside Boarding House"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 p-3.5 rounded-xl border border-slate-200/90 dark:border-zinc-800">
                    <h5 className="font-bold text-slate-900 dark:text-white uppercase text-[11px]">
                      Lease Information
                    </h5>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Room Number</span>
                      <span className="font-bold text-slate-800 dark:text-zinc-200">
                        {selectedTenant.room_number ? `Room ${selectedTenant.room_number}` : "Unassigned"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Rental Model</span>
                      <span className="font-bold text-slate-800 dark:text-zinc-200">
                        {getTenantRentalModel(selectedTenant)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Move-In Date</span>
                      <span className="font-mono font-medium text-slate-700 dark:text-zinc-300">
                        {selectedTenant.date_moved_in || "Aug 15, 2026"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setIsViewModalOpen(false);
                      handleOpenEditModal(selectedTenant);
                    }}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: STATUS CONFIRMATION (Approve / Reject) */}
      <AnimatePresence>
        {confirmStatus && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200 dark:border-zinc-800 p-5"
            >
              <h3 className="text-sm font-extrabold text-slate-950 dark:text-white">
                {confirmStatus.action === "Approve" ? "Approve Resident" : "Decline Application"}
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-300 mt-1 leading-relaxed">
                {confirmStatus.action === "Approve"
                  ? `Confirm onboarding approval for ${confirmStatus.name}? Their status will become Active.`
                  : `Decline application for ${confirmStatus.name}? Their record will be flagged as Declined.`}
              </p>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  onClick={() => setConfirmStatus(null)}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-zinc-800 text-slate-700 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={executeStatusUpdate}
                  disabled={isStatusUpdating !== null}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg text-white transition-colors cursor-pointer ${
                    confirmStatus.action === "Approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {isStatusUpdating !== null ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    confirmStatus.action
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* MODAL 5: OPERATIONAL & FINANCIAL REPORT MODAL */}
      <AdminReportModal isOpen={showReportModal} onClose={() => setShowReportModal(false)} />
    </div>
  );
}

export default function AdminTenants() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-96 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-slate-300 dark:border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
        </div>
      }
    >
      <TenantsContent />
    </Suspense>
  );
}
