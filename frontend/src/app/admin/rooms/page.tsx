"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import api from "@/lib/api";
import {
  Search,
  Plus,
  Building2,
  Users,
  Info,
  Wrench,
  Edit,
  Trash2,
  X,
  CheckCircle,
  BedDouble,
  Check,
  AlertTriangle,
  RefreshCw,
  Phone,
  Calendar,
  DoorOpen,
  Wifi,
  Wind,
  Monitor,
  Box,
  MoreHorizontal,
  ChevronRight,
  FileText,
  User,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import CustomSelect from "@/components/dropdown-select";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { formatPhoneNumber } from "@/lib/phone-utils";

interface Tenant {
  id: number;
  name: string;
  phone: string;
  email?: string;
  date_moved_in: string;
  bed_space: string | null;
  balance: number;
}

interface Room {
  id: number;
  room_number: string;
  type: string;
  rental_type: string;
  price: string;
  floor: string | null;
  description: string | null;
  amenities: string | null;
  capacity: number;
  current_occupants: number;
  available_slots: number;
  status: string;
  occupants: Tenant[];
}

const AMENITY_PRESETS = [
  "Air Conditioning",
  "Free High-Speed Wi-Fi",
  "Private Bathroom",
  "Hot Shower",
  "Study Desk & Chair",
  "Built-in Wardrobe",
  "Balcony / Window View",
  "Refrigerator",
  "Individual Submeter",
];

export default function AdminRooms() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected Room for the Right-Side Drawer
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  // Modals & Popups
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [activeMenuRoomId, setActiveMenuRoomId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [selectedFloorTab, setSelectedFloorTab] = useState("All Floors");
  const [typeFilter, setTypeFilter] = useState("All Room Types");
  const [rentalTypeFilter, setRentalTypeFilter] = useState("All Rental Models");
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    room_number: "",
    type: "Single",
    rental_type: "Whole Room",
    capacity: 1,
    price: "",
    floor: "",
    description: "",
    amenities: "",
    status: "Available",
  });

  const fetchRooms = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError("");
    try {
      const { data } = await api.get("/admin/rooms");
      const roomList: Room[] = data || [];
      setRooms(roomList);
      if (roomList.length > 0) {
        setSelectedRoom((prev) => {
          if (!prev) return roomList[0];
          const matched = roomList.find((r) => r.id === prev.id);
          return matched || roomList[0];
        });
      }
    } catch (err: any) {
      console.error("Failed to fetch rooms:", err);
      setError("Failed to load rooms.");
      toast.error("Could not load rooms inventory");
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleOpenModal = (room?: Room) => {
    if (room) {
      setEditingRoom(room);
      // Extract numeric floor only (e.g. "Floor 2" -> "2", "2nd floor" -> "2")
      const floorDigits = room.floor
        ? room.floor.replace(/\D/g, "")
        : room.room_number
          ? room.room_number.replace(/\D/g, "").charAt(0)
          : "1";
      setFormData({
        room_number: room.room_number,
        type: room.type || "Single",
        rental_type: room.rental_type || "Whole Room",
        capacity: room.capacity || 1,
        price: room.price || "",
        floor: floorDigits || "1",
        description: room.description || "",
        amenities: room.amenities || "",
        status: room.status || "Available",
      });
    } else {
      setEditingRoom(null);
      setFormData({
        room_number: "",
        type: "Single",
        rental_type: "Whole Room",
        capacity: 1,
        price: "",
        floor: "1",
        description: "",
        amenities: "",
        status: "Available",
      });
    }
    setError("");
    setIsModalOpen(true);
  };

  const handleToggleAmenity = (amenity: string) => {
    const current = formData.amenities
      ? formData.amenities
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    let updated: string[];
    if (current.includes(amenity)) {
      updated = current.filter((a) => a !== amenity);
    } else {
      updated = [...current, amenity];
    }
    setFormData({ ...formData, amenities: updated.join(", ") });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      // Standardize floor format to "Floor X"
      const floorDigits = formData.floor.toString().replace(/\D/g, "") || "1";
      const payload = {
        ...formData,
        floor: `Floor ${floorDigits}`,
      };

      if (editingRoom) {
        await api.put(`/admin/rooms/${editingRoom.id}`, payload);
        toast.success(`Room ${formData.room_number} updated successfully`);
      } else {
        await api.post("/admin/rooms", payload);
        toast.success(`Room ${formData.room_number} created successfully`);
      }
      setIsModalOpen(false);
      fetchRooms(true);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || "Operation failed.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (room: Room) => {
    if (room.current_occupants > 0) {
      toast.error(
        `Cannot delete Room ${room.room_number}: active tenants are currently residing here.`,
      );
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to permanently delete Room ${room.room_number}?`,
      )
    )
      return;

    setIsDeleting(room.id);
    try {
      await api.delete(`/admin/rooms/${room.id}`);
      toast.success(`Room ${room.room_number} removed from inventory`);
      fetchRooms(true);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || "Failed to delete room.";
      toast.error(errMsg);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleToggleMaintenance = async (room: Room) => {
    const nextStatus =
      room.status === "Maintenance" ? "Available" : "Maintenance";
    try {
      await api.put(`/admin/rooms/${room.id}`, { ...room, status: nextStatus });
      toast.success(
        nextStatus === "Available"
          ? `Room ${room.room_number} marked as Available`
          : `Room ${room.room_number} set to Maintenance`,
      );
      fetchRooms(true);
      if (selectedRoom && selectedRoom.id === room.id) {
        setSelectedRoom({ ...selectedRoom, status: nextStatus });
      }
    } catch (err: any) {
      toast.error("Failed to update room status");
    }
  };

  // Helper to categorize room status
  type RoomCategory =
    | "Full"
    | "OccupiedWithBeds"
    | "Vacant"
    | "Maintenance";

  const getRoomCategory = (room: Room): RoomCategory => {
    if (room.status === "Maintenance") return "Maintenance";
    const occupants =
      Number(room.current_occupants) || (room.occupants?.length || 0);
    const capacity = Number(room.capacity) > 0 ? Number(room.capacity) : 1;
    if (occupants === 0) return "Vacant";
    if (occupants >= capacity) return "Full";
    return "OccupiedWithBeds";
  };

  const getAvailableBeds = (room: Room): number => {
    const occupants =
      Number(room.current_occupants) || (room.occupants?.length || 0);
    const capacity = Number(room.capacity) > 0 ? Number(room.capacity) : 1;
    return Math.max(0, capacity - occupants);
  };

  const getRoomStatusLabel = (room: Room, compact = false): string => {
    const cat = getRoomCategory(room);
    if (cat === "Maintenance") return "Maintenance";
    if (cat === "Vacant") return "Vacant";
    if (cat === "Full") return "Full";
    const avail = getAvailableBeds(room);
    if (compact) {
      return `Occupied (${avail} ${avail === 1 ? "bed" : "beds"} avail)`;
    }
    return `Occupied with ${avail} ${avail === 1 ? "available bed" : "available beds"}`;
  };

  // KPI Metrics (Calculated dynamically)
  const metrics = useMemo(() => {
    const total = rooms.length;
    let full = 0;
    let occupiedWithBeds = 0;
    let vacant = 0;
    let maintenance = 0;

    rooms.forEach((r) => {
      const cat = getRoomCategory(r);
      if (cat === "Full") full++;
      else if (cat === "OccupiedWithBeds") occupiedWithBeds++;
      else if (cat === "Vacant") vacant++;
      else if (cat === "Maintenance") maintenance++;
    });

    const fullPct = total > 0 ? Math.round((full / total) * 100) : 0;
    const occupiedWithBedsPct =
      total > 0 ? Math.round((occupiedWithBeds / total) * 100) : 0;
    const vacantPct = total > 0 ? Math.round((vacant / total) * 100) : 0;
    const maintenancePct =
      total > 0 ? Math.round((maintenance / total) * 100) : 0;

    return {
      total,
      full,
      occupiedWithBeds,
      vacant,
      maintenance,
      fullPct,
      occupiedWithBedsPct,
      vacantPct,
      maintenancePct,
    };
  }, [rooms]);

  const normalizeFloorName = (
    floorStr?: string | null,
    roomNumber?: string,
  ): string => {
    if (floorStr) {
      const clean = floorStr.toLowerCase().trim();
      const match = clean.match(/\d+/);
      if (match) return `Floor ${match[0]}`;
      if (clean.includes("first")) return "Floor 1";
      if (clean.includes("second")) return "Floor 2";
      if (clean.includes("third")) return "Floor 3";
      if (clean.includes("fourth")) return "Floor 4";
      if (clean.includes("fifth")) return "Floor 5";
      if (clean.includes("sixth")) return "Floor 6";
      if (clean.includes("seventh")) return "Floor 7";
    }
    if (roomNumber && roomNumber.length >= 3 && !isNaN(Number(roomNumber[0]))) {
      return `Floor ${roomNumber[0]}`;
    }
    return "Floor 1";
  };

  // Unique floors and types
  const uniqueFloors = useMemo(() => {
    const set = new Set<string>();
    rooms.forEach((r) => {
      set.add(normalizeFloorName(r.floor, r.room_number));
    });
    return Array.from(set).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, "")) || 0;
      const numB = parseInt(b.replace(/\D/g, "")) || 0;
      return numA - numB;
    });
  }, [rooms]);

  const uniqueTypes = useMemo(() => {
    const set = new Set<string>();
    rooms.forEach((r) => {
      if (r.type) set.add(r.type);
    });
    return Array.from(set).sort();
  }, [rooms]);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      const effectiveFloor = normalizeFloorName(r.floor, r.room_number);
      const floorStr = effectiveFloor.toLowerCase();
      const tenantMatch = r.occupants?.some((t) =>
        t.name.toLowerCase().includes(q),
      );

      const matchesSearch =
        !q ||
        r.room_number.toLowerCase().includes(q) ||
        `room ${r.room_number}`.toLowerCase().includes(q) ||
        floorStr.includes(q) ||
        r.type.toLowerCase().includes(q) ||
        tenantMatch;

      // Status Filter
      const cat = getRoomCategory(r);
      let matchesStatus = true;
      if (statusFilter === "Full") matchesStatus = cat === "Full";
      else if (
        statusFilter === "Occupied (With Available Beds)" ||
        statusFilter === "Occupied w/ Beds" ||
        statusFilter === "Partially Occupied"
      )
        matchesStatus = cat === "OccupiedWithBeds";
      else if (statusFilter === "Occupied")
        matchesStatus = cat === "Full" || cat === "OccupiedWithBeds";
      else if (statusFilter === "Vacant") matchesStatus = cat === "Vacant";
      else if (statusFilter === "Maintenance")
        matchesStatus = cat === "Maintenance";

      // Floor Tab Filter
      const matchesFloorTab =
        selectedFloorTab === "All Floors" || effectiveFloor === selectedFloorTab;

      // Type Filter
      const matchesType =
        typeFilter === "All Room Types" || r.type === typeFilter;

      // Rental Model Filter
      const matchesRentalType =
        rentalTypeFilter === "All Rental Models" ||
        r.rental_type === rentalTypeFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesFloorTab &&
        matchesType &&
        matchesRentalType
      );
    });
  }, [
    rooms,
    searchQuery,
    statusFilter,
    selectedFloorTab,
    typeFilter,
    rentalTypeFilter,
  ]);

  // Group filtered rooms by Floor
  const groupedByFloor = useMemo(() => {
    const groups: { [key: string]: Room[] } = {};
    filteredRooms.forEach((r) => {
      const fl = normalizeFloorName(r.floor, r.room_number);
      if (!groups[fl]) groups[fl] = [];
      groups[fl].push(r);
    });
    // Sort floor keys numerically
    return Object.keys(groups)
      .sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, "")) || 0;
        const numB = parseInt(b.replace(/\D/g, "")) || 0;
        return numA - numB;
      })
      .map((key) => ({
        floor: key,
        rooms: groups[key].sort((a, b) =>
          a.room_number.localeCompare(b.room_number, undefined, { numeric: true }),
        ),
      }));
  }, [filteredRooms]);

  return (
    <div className="w-full h-full flex-1 min-h-0 font-sans text-slate-900 dark:text-zinc-100 flex flex-col overflow-hidden gap-2">
      {/* 1. TOP HEADER */}
      <div className="flex items-center justify-between gap-2.5 shrink-0">
        {/* Left Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-800/40 shadow-xs">
            <Building2 className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-950 dark:text-white tracking-tight leading-none">
              Manage Rooms
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium mt-0.5">
              View and manage all rooms, bedspaces and their current status.
            </p>
          </div>
        </div>
      </div>

      {/* 2. TOP KPI CARDS RIBBON (Horizontal 4 Tiles with Compact Height) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0">
        {/* Card 1: Full */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-xl p-2.5 sm:p-3 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/40">
              <FileText className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 block leading-tight">
                Full
              </span>
              <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-0.5">
                {metrics.full} / {metrics.total} units
              </div>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">
                {metrics.fullPct}%
              </span>
            </div>
          </div>
          <div className="w-full h-1 bg-slate-100 dark:bg-zinc-800 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${metrics.fullPct}%` }}
            />
          </div>
        </div>

        {/* Card 2: Occupied w/ Available Beds */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-xl p-2.5 sm:p-3 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-900/40">
              <BedDouble className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 block leading-tight truncate">
                Occupied w/ Beds
              </span>
              <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-0.5">
                {metrics.occupiedWithBeds} / {metrics.total} units
              </div>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block">
                {metrics.occupiedWithBedsPct}%
              </span>
            </div>
          </div>
          <div className="w-full h-1 bg-slate-100 dark:bg-zinc-800 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${metrics.occupiedWithBedsPct}%` }}
            />
          </div>
        </div>

        {/* Card 3: Vacant */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-xl p-2.5 sm:p-3 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/40">
              <DoorOpen className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 block leading-tight">
                Vacant
              </span>
              <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-0.5">
                {metrics.vacant} / {metrics.total} units
              </div>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block">
                {metrics.vacantPct}%
              </span>
            </div>
          </div>
          <div className="w-full h-1 bg-slate-100 dark:bg-zinc-800 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${metrics.vacantPct}%` }}
            />
          </div>
        </div>

        {/* Card 4: Maintenance */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-xl p-2.5 sm:p-3 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-900/40">
              <Wrench className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 block leading-tight">
                Maintenance
              </span>
              <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-0.5">
                {metrics.maintenance} / {metrics.total} units
              </div>
              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 block">
                {metrics.maintenancePct}%
              </span>
            </div>
          </div>
          <div className="w-full h-1 bg-slate-100 dark:bg-zinc-800 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-rose-500 rounded-full transition-all duration-500"
              style={{ width: `${metrics.maintenancePct}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. UNIFIED FILTER & ACTION CONTROLS BAR */}
      <div className="flex flex-wrap items-center gap-2 shrink-0 z-20">
        {/* 1. Searchbar */}
        <div className="relative w-44 sm:w-56">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search room, tenant, type..."
            className="w-full pl-8 pr-7 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* 2. Floors Dropdown Menu */}
        <div className="w-32 sm:w-36">
          <CustomSelect
            value={selectedFloorTab}
            onChange={(val) => setSelectedFloorTab(val)}
            options={["All Floors", ...uniqueFloors]}
            maxListHeight="175px"
            className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 outline-none"
          />
        </div>

        {/* 3. Room Statuses Dropdown */}
        <div className="w-36 sm:w-44">
          <CustomSelect
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            options={[
              "All Statuses",
              "Full",
              "Occupied (With Available Beds)",
              "Vacant",
              "Maintenance",
            ]}
            className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 outline-none"
          />
        </div>

        {/* 4. Room Types Dropdown */}
        <div className="w-32 sm:w-36">
          <CustomSelect
            value={typeFilter}
            onChange={(val) => setTypeFilter(val)}
            options={["All Room Types", ...uniqueTypes]}
            className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 outline-none"
          />
        </div>

        {/* 5. Rental Mode Dropdown */}
        <div className="w-32 sm:w-36">
          <CustomSelect
            value={rentalTypeFilter}
            onChange={(val) => setRentalTypeFilter(val)}
            options={["All Rental Models", "Whole Room", "Per Bed / Bedspace"]}
            className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 outline-none"
          />
        </div>

        {/* 6. Add Room Button */}
        <button
          onClick={() => handleOpenModal()}
          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add Room</span>
        </button>
      </div>

      {/* 4. MAIN SPLIT VIEW (Floor Room Rows vs. Right Drawer) */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row items-stretch gap-2.5 overflow-hidden">
        {/* LEFT COLUMN: Floor Rows Container - Only Floor Cards have scrollbar, main display shows 1st, 2nd, 3rd floor */}
        <div className="flex-1 min-w-0 h-full overflow-y-auto pr-1.5 custom-scrollbar space-y-2">
          {groupedByFloor.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-8 text-center">
              <DoorOpen className="w-10 h-10 text-slate-300 dark:text-zinc-700 mx-auto mb-2" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-200">
                No rooms match the selected criteria
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                Try adjusting your search keywords, status filter, or floor tabs.
              </p>
            </div>
          ) : (
            groupedByFloor.map((group) => (
              <div
                key={group.floor}
                className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-xl p-2.5 sm:p-3 shadow-2xs space-y-2 shrink-0"
              >
                {/* Floor Header */}
                {(() => {
                  let floorFull = 0;
                  let floorWithBeds = 0;
                  let floorVacant = 0;
                  let floorMaint = 0;

                  group.rooms.forEach((r) => {
                    const c = getRoomCategory(r);
                    if (c === "Full") floorFull++;
                    else if (c === "OccupiedWithBeds") floorWithBeds++;
                    else if (c === "Vacant") floorVacant++;
                    else if (c === "Maintenance") floorMaint++;
                  });

                  return (
                    <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
                      {/* Left: Floor Title & Room Counter beside it */}
                      <div className="flex items-center gap-2">
                        <h2 className="text-xs sm:text-sm font-extrabold text-slate-950 dark:text-white tracking-tight">
                          {group.floor}
                        </h2>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/60 shrink-0">
                          {group.rooms.length} {group.rooms.length === 1 ? "room" : "rooms"}
                        </span>
                      </div>

                      {/* Right: Room Status Summary for this floor */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                        {floorFull > 0 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Full: {floorFull}
                          </span>
                        )}
                        {floorWithBeds > 0 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Occupied w/ Beds: {floorWithBeds}
                          </span>
                        )}
                        {floorVacant > 0 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            Vacant: {floorVacant}
                          </span>
                        )}
                        {floorMaint > 0 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            Maint: {floorMaint}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Rooms Row */}
                <div className="flex items-stretch gap-2.5 overflow-x-auto pb-2 pt-0.5 custom-scrollbar scroll-smooth">
                  {group.rooms.map((room) => {
                    const cat = getRoomCategory(room);
                    const isSelected = selectedRoom?.id === room.id;
                    const primaryOccupant = room.occupants?.[0];
                    const extraOccupants =
                      (room.occupants?.length || 0) - 1;
                    const availBeds = getAvailableBeds(room);

                    return (
                      <div
                        key={room.id}
                        onClick={() => setSelectedRoom(room)}
                        className={`w-[calc((100%-2.5rem)/5)] min-w-[170px] lg:min-w-[calc((100%-2.5rem)/5)] lg:max-w-[calc((100%-2.5rem)/5)] shrink-0 bg-white dark:bg-zinc-900 rounded-xl p-2 sm:p-2.5 border cursor-pointer transition-all flex flex-col justify-between relative shadow-2xs hover:shadow-xs group ${
                          isSelected
                            ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/10 dark:bg-blue-950/20"
                            : "border-slate-200/90 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700"
                        }`}
                      >
                        {/* Top Line: Room Number & Status Badge */}
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                            {room.room_number}
                          </span>

                          {cat === "Full" && (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center gap-1 shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Full
                            </span>
                          )}
                          {cat === "OccupiedWithBeds" && (
                            <span
                              className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60 flex items-center gap-1 shrink-0"
                              title={`Occupied with ${availBeds} ${availBeds === 1 ? "available bed" : "available beds"}`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              Occupied ({availBeds} {availBeds === 1 ? "bed" : "beds"} avail)
                            </span>
                          )}
                          {cat === "Vacant" && (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 flex items-center gap-1 shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                              Vacant
                            </span>
                          )}
                          {cat === "Maintenance" && (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60 flex items-center gap-1 shrink-0">
                              <Wrench className="w-2.5 h-2.5" />
                              <span className="hidden xl:inline 2xl:hidden">Maint.</span>
                              <span className="inline xl:hidden 2xl:inline">Maintenance</span>
                            </span>
                          )}
                        </div>

                        {/* Room Subtitle: Type & Tier */}
                        <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium mt-0.5 truncate">
                          {room.type} •{" "}
                          {room.rental_type === "Per Bed / Bedspace"
                            ? "Standard"
                            : "Deluxe"}
                        </p>

                        {/* Miniature Bed Icons representing capacity */}
                        <div className="flex items-center gap-1 my-1">
                          {[...Array(Math.max(1, room.capacity || 1))].map(
                            (_, bIdx) => {
                              const isOccupied =
                                bIdx < (room.current_occupants || 0);
                              const isMaint = cat === "Maintenance";
                              return (
                                <BedDouble
                                  key={bIdx}
                                  className={`w-3 h-3 ${
                                    isMaint
                                      ? "text-rose-400 fill-rose-400/20"
                                      : isOccupied
                                        ? "text-emerald-500 fill-emerald-500/30"
                                        : "text-slate-300 dark:text-zinc-700"
                                  }`}
                                />
                              );
                            },
                          )}
                        </div>

                        {/* Resident Name or Empty line */}
                        <div className="h-4.5 flex items-center">
                          {primaryOccupant ? (
                            <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-800 dark:text-zinc-200 truncate w-full">
                              <User className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                              <span className="truncate">{primaryOccupant.name}</span>
                              {extraOccupants > 0 && (
                                <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 shrink-0">
                                  +{extraOccupants}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 dark:text-zinc-600 italic">
                              {cat === "Maintenance"
                                ? "Under Repair"
                                : "Available"}
                            </span>
                          )}
                        </div>

                        {/* Monthly Rate */}
                        <div className="text-[11px] font-bold font-mono text-slate-900 dark:text-white mt-1">
                          ₱{Number(room.price).toLocaleString()}/mo
                        </div>

                        {/* Bottom Row: Amenity Icons & Menu */}
                        <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-slate-100 dark:border-zinc-800/80">
                          <div className="flex items-center gap-1 text-slate-400 dark:text-zinc-500">
                            <Wifi className="w-2.5 h-2.5" />
                            <Wind className="w-2.5 h-2.5" />
                            <Monitor className="w-2.5 h-2.5" />
                          </div>

                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuRoomId(
                                  activeMenuRoomId === room.id ? null : room.id,
                                );
                              }}
                              className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                            >
                              <MoreHorizontal className="w-3 h-3" />
                            </button>

                            {/* Popup Action Menu */}
                            {activeMenuRoomId === room.id && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 bottom-6 w-36 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-slate-200 dark:border-zinc-800 py-1 z-30 text-xs"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuRoomId(null);
                                    handleOpenModal(room);
                                  }}
                                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-2 font-medium"
                                >
                                  <Edit className="w-3.5 h-3.5 text-blue-500" />
                                  Edit Room
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuRoomId(null);
                                    handleToggleMaintenance(room);
                                  }}
                                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-2 font-medium"
                                >
                                  <Wrench className="w-3.5 h-3.5 text-amber-500" />
                                  {room.status === "Maintenance"
                                    ? "Set Available"
                                    : "Maintenance"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuRoomId(null);
                                    handleDelete(room);
                                  }}
                                  disabled={room.current_occupants > 0}
                                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-zinc-800 text-rose-600 disabled:opacity-40 flex items-center gap-2 font-medium"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* RIGHT COLUMN: DETAILED ROOM DOSSIER (Matches Mockup Right Sidebar) */}
        {selectedRoom && (
          <div className="w-full lg:w-[285px] 2xl:w-[325px] shrink-0 h-full overflow-y-auto pr-1 custom-scrollbar">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-xl p-3.5 sm:p-4 shadow-xs space-y-3">
              {/* Header: Room Number, Badge & Close */}
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">
                      Room {selectedRoom.room_number}
                    </h2>
                    {getRoomCategory(selectedRoom) === "Full" && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                        Full
                      </span>
                    )}
                    {getRoomCategory(selectedRoom) === "OccupiedWithBeds" && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60">
                        Occupied with {getAvailableBeds(selectedRoom)}{" "}
                        {getAvailableBeds(selectedRoom) === 1
                          ? "available bed"
                          : "available beds"}
                      </span>
                    )}
                    {getRoomCategory(selectedRoom) === "Vacant" && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
                        Vacant
                      </span>
                    )}
                    {getRoomCategory(selectedRoom) === "Maintenance" && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60">
                        Maintenance
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedRoom(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 font-medium">
                  {normalizeFloorName(
                    selectedRoom.floor,
                    selectedRoom.room_number,
                  )}{" "}
                  • {selectedRoom.type} Room • Standard
                </p>
              </div>

              {/* Price & Rental Mode Pill */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black font-mono text-slate-950 dark:text-white">
                    ₱ {Number(selectedRoom.price).toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    / month
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40">
                  {selectedRoom.rental_type || "Whole Room"}
                </span>
              </div>

              {/* Photo & Amenities Mini Grid */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* Visual Thumbnail */}
                <div className="relative aspect-4/3 rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-800">
                  <img
                    src="/images/room_sample.jpg"
                    alt="Room sample"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback gradient if file missing
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                </div>

                {/* Amenities List */}
                <div className="space-y-1.5 flex flex-col justify-center">
                  <span className="text-[11px] font-bold text-slate-900 dark:text-white block mb-1">
                    Amenities
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-zinc-300 font-medium">
                    <Wifi className="w-3.5 h-3.5 text-slate-400" />
                    <span>Wi-Fi</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-zinc-300 font-medium">
                    <Wind className="w-3.5 h-3.5 text-slate-400" />
                    <span>Aircon</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-zinc-300 font-medium">
                    <Monitor className="w-3.5 h-3.5 text-slate-400" />
                    <span>Study Desk</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-zinc-300 font-medium">
                    <Box className="w-3.5 h-3.5 text-slate-400" />
                    <span>Wardrobe</span>
                  </div>
                </div>
              </div>

              {/* Room Information Table */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  Room Information
                </h3>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400">
                    <span>Total Capacity</span>
                    <span className="font-bold text-slate-800 dark:text-zinc-200">
                      {selectedRoom.capacity}{" "}
                      {selectedRoom.capacity === 1 ? "bed" : "beds"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400">
                    <span>Occupied Beds</span>
                    <span className="font-bold text-slate-800 dark:text-zinc-200">
                      {selectedRoom.current_occupants}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400">
                    <span>Vacant Beds</span>
                    <span className="font-bold text-slate-800 dark:text-zinc-200">
                      {Math.max(
                        0,
                        selectedRoom.capacity - selectedRoom.current_occupants,
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400">
                    <span>Status</span>
                    <span
                      className={`font-bold ${
                        getRoomCategory(selectedRoom) === "Full"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : getRoomCategory(selectedRoom) === "OccupiedWithBeds"
                            ? "text-amber-600 dark:text-amber-400"
                            : getRoomCategory(selectedRoom) === "Vacant"
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {getRoomStatusLabel(selectedRoom)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400">
                    <span>Last Updated</span>
                    <span className="font-medium text-slate-700 dark:text-zinc-300">
                      Oct 24, 2026 • 10:24 AM
                    </span>
                  </div>
                </div>
              </div>

              {/* Current Residents Section */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  Current Residents
                </h3>

                {selectedRoom.occupants && selectedRoom.occupants.length > 0 ? (
                  <div className="space-y-2">
                    {selectedRoom.occupants.map((resident, idx) => (
                      <div
                        key={resident.id}
                        onClick={() => router.push(`/admin/tenants`)}
                        className="p-2.5 rounded-xl border border-slate-200/80 dark:border-zinc-800 hover:border-blue-400 bg-slate-50/50 dark:bg-zinc-800/40 flex items-center justify-between gap-2.5 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-700 flex items-center justify-center shrink-0 text-slate-600 dark:text-zinc-300 font-bold text-xs">
                            <User className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                {resident.name}
                              </span>
                              {idx === 0 && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                                  Primary
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-zinc-400 truncate">
                              {resident.email ||
                                `${resident.name.toLowerCase().replace(/\s+/g, ".")}@email.com`}
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                              {formatPhoneNumber(resident.phone, "+63 999 123 7654")}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-4 px-3 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 text-center">
                    <p className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
                      No residents currently assigned
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">
                      Ready for new tenant check-in
                    </p>
                  </div>
                )}
              </div>

              {/* 3 Bottom Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => handleOpenModal(selectedRoom)}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Room</span>
                </button>

                <button
                  type="button"
                  onClick={() => router.push(`/admin/tenants?action=assign&room=${selectedRoom.room_number}`)}
                  className="w-full py-2.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100/50 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Assign Resident</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleMaintenance(selectedRoom)}
                  className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    {selectedRoom.status === "Maintenance"
                      ? "Set Available"
                      : "Change Status (Maintenance)"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ADD / EDIT ROOM MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-zinc-800 max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {editingRoom
                      ? `Edit Room ${editingRoom.room_number}`
                      : "Add New Room Unit"}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Configure specifications, floor location, capacity, and
                    pricing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setError("");
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Form */}
              <form
                onSubmit={handleSubmit}
                className="p-6 overflow-y-auto custom-scrollbar space-y-5"
              >
                {error && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Room Number & Floor */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      Room Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.room_number}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          room_number: e.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-50/50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-400/20 dark:focus:ring-zinc-600/30 outline-none"
                      placeholder="e.g. 101, 202-A"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center justify-between">
                      <span>
                        Floor Number <span className="text-rose-500">*</span>
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-normal">
                        Number only (e.g. 1, 2)
                      </span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 dark:text-zinc-400 select-none">
                        Floor
                      </span>
                      <input
                        required
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={formData.floor}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          setFormData({ ...formData, floor: val });
                        }}
                        className="w-full pl-14 pr-3.5 py-2 text-xs font-bold rounded-lg bg-slate-50/50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-400/20 dark:focus:ring-zinc-600/30 outline-none"
                        placeholder="1"
                      />
                    </div>
                  </div>
                </div>

                {/* Room Type & Rental Mode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      Room Type <span className="text-rose-500">*</span>
                    </label>
                    <CustomSelect
                      value={formData.type}
                      onChange={(val) =>
                        setFormData({ ...formData, type: val })
                      }
                      options={[
                        "Single",
                        "Double",
                        "Triple",
                        "Quadruple",
                        "Dormitory",
                        "Solo Standard",
                        "Aircon Deluxe",
                      ]}
                      className="w-full px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-50/50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-400/20 dark:focus:ring-zinc-600/30 outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      Rental Type <span className="text-rose-500">*</span>
                    </label>
                    <CustomSelect
                      value={formData.rental_type}
                      onChange={(val) =>
                        setFormData({ ...formData, rental_type: val })
                      }
                      options={["Whole Room", "Per Bed / Bedspace"]}
                      className="w-full px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-50/50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-400/20 dark:focus:ring-zinc-600/30 outline-none"
                    />
                  </div>
                </div>

                {/* Capacity & Pricing */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      Max Capacity (Beds){" "}
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      type="number"
                      min="1"
                      value={formData.capacity}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          capacity: parseInt(e.target.value) || 1,
                        })
                      }
                      className="w-full px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-50/50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-400/20 dark:focus:ring-zinc-600/30 outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      Monthly Price (₱) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      type="number"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      className="w-full px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-50/50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-400/20 dark:focus:ring-zinc-600/30 outline-none"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      Status
                    </label>
                    <CustomSelect
                      value={formData.status}
                      onChange={(val) =>
                        setFormData({ ...formData, status: val })
                      }
                      options={[
                        "Available",
                        "Occupied",
                        "Partially Occupied",
                        "Maintenance",
                        "Unavailable",
                      ]}
                      className="w-full px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-50/50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-400/20 dark:focus:ring-zinc-600/30 outline-none"
                    />
                  </div>
                </div>

                {/* One-Click Amenity Presets */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Included Amenities
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {AMENITY_PRESETS.map((preset) => {
                      const isSelected = formData.amenities?.includes(preset);
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleToggleAmenity(preset)}
                          className={`px-2.5 py-1 text-[11px] rounded-md font-medium border transition-colors ${
                            isSelected
                              ? "bg-blue-600 border-blue-600 text-white font-bold"
                              : "bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
                          }`}
                        >
                          {isSelected && (
                            <Check className="w-3 h-3 inline mr-1" />
                          )}
                          {preset}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="text"
                    value={formData.amenities}
                    onChange={(e) =>
                      setFormData({ ...formData, amenities: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-50/50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-400/20 dark:focus:ring-zinc-600/30 outline-none mt-1"
                    placeholder="Or type custom amenities separated by comma..."
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Description & Notes
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-50/50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-400/20 dark:focus:ring-zinc-600/30 outline-none resize-none"
                    placeholder="Add unit notes, bed arrangements, or leasing terms..."
                  />
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setError("");
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-70 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : editingRoom ? (
                      "Save Changes"
                    ) : (
                      "Create Room"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
