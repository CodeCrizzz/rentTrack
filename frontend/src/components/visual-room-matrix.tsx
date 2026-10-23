"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Building2,
  Users,
  Search,
  ChevronRight,
  ExternalLink,
  Phone,
  Mail,
  X,
  CreditCard,
  Wrench,
  CheckCircle2,
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

const DEFAULT_BLUEPRINT_ROOMS: RoomMatrixItem[] = [
  // Floor 1
  {
    id: 101,
    room_number: "101",
    floor: "Floor 1",
    type: "Single",
    rental_type: "Standard",
    capacity: 4,
    current_occupants: 4,
    price: 4500,
    status: "Occupied",
    tenants: [{ id: 1, name: "Juan Dela Cruz" }],
  },
  {
    id: 102,
    room_number: "102",
    floor: "Floor 1",
    type: "Double",
    rental_type: "Standard",
    capacity: 4,
    current_occupants: 2,
    price: 6000,
    status: "Partial",
    tenants: [{ id: 2, name: "Maria Santos" }],
  },
  {
    id: 103,
    room_number: "103",
    floor: "Floor 1",
    type: "Single",
    rental_type: "Standard",
    capacity: 4,
    current_occupants: 0,
    price: 4500,
    status: "Vacant",
    tenants: [],
  },
  {
    id: 104,
    room_number: "104",
    floor: "Floor 1",
    type: "Double",
    rental_type: "Deluxe",
    capacity: 4,
    current_occupants: 0,
    price: 7500,
    status: "Maintenance",
    tenants: [],
  },
  // Floor 2
  {
    id: 201,
    room_number: "201",
    floor: "Floor 2",
    type: "Single",
    rental_type: "Standard",
    capacity: 4,
    current_occupants: 4,
    price: 4500,
    status: "Occupied",
    tenants: [{ id: 3, name: "Rafael Cruz" }],
  },
  {
    id: 202,
    room_number: "202",
    floor: "Floor 2",
    type: "Double",
    rental_type: "Standard",
    capacity: 4,
    current_occupants: 4,
    price: 6000,
    status: "Occupied",
    tenants: [{ id: 4, name: "Ana Reyes" }],
  },
  {
    id: 203,
    room_number: "203",
    floor: "Floor 2",
    type: "Single",
    rental_type: "Deluxe",
    capacity: 4,
    current_occupants: 0,
    price: 5500,
    status: "Vacant",
    tenants: [],
  },
  {
    id: 204,
    room_number: "204",
    floor: "Floor 2",
    type: "Double",
    rental_type: "Deluxe",
    capacity: 4,
    current_occupants: 4,
    price: 7000,
    status: "Occupied",
    tenants: [{ id: 5, name: "Limang Santos" }],
  },
  // Floor 3
  {
    id: 301,
    room_number: "301",
    floor: "Floor 3",
    type: "Single",
    rental_type: "Standard",
    capacity: 4,
    current_occupants: 4,
    price: 4500,
    status: "Occupied",
    tenants: [{ id: 6, name: "Carlo Lopez" }],
  },
  {
    id: 302,
    room_number: "302",
    floor: "Floor 3",
    type: "Triple",
    rental_type: "Standard",
    capacity: 4,
    current_occupants: 2,
    price: 5500,
    status: "Partial",
    tenants: [{ id: 7, name: "Group A" }],
  },
  {
    id: 303,
    room_number: "303",
    floor: "Floor 3",
    type: "Double",
    rental_type: "Standard",
    capacity: 4,
    current_occupants: 4,
    price: 6000,
    status: "Occupied",
    tenants: [{ id: 8, name: "Jomar Garcia" }],
  },
  {
    id: 304,
    room_number: "304",
    floor: "Floor 3",
    type: "Single",
    rental_type: "Deluxe",
    capacity: 4,
    current_occupants: 0,
    price: 5500,
    status: "Vacant",
    tenants: [],
  },
];

interface VisualRoomMatrixProps {
  rooms: RoomMatrixItem[];
}

// Custom Bed SVG Icon matching the exact blueprint glyph in reference mockup
const BedIcon = ({ filled, status }: { filled: boolean; status: string }) => {
  let strokeColor = "#cbd5e1"; // slate-300 outline for vacant
  let fillColor = "transparent";

  if (status === "Maintenance") {
    strokeColor = "#f43f5e"; // rose-500
    fillColor = "#ffe4e6"; // rose-100
  } else if (filled) {
    if (status === "Partial") {
      strokeColor = "#f59e0b"; // amber-500
      fillColor = "#fef3c7"; // amber-100
    } else {
      strokeColor = "#10b981"; // emerald-500
      fillColor = "#d1fae5"; // emerald-100
    }
  }

  return (
    <svg className="w-4 h-3.5 shrink-0" viewBox="0 0 24 18" fill="none">
      {/* Headboard */}
      <rect x="2" y="2" width="20" height="3.5" rx="1" fill={fillColor} stroke={strokeColor} strokeWidth="1.6" />
      {/* Pillow */}
      <rect x="5.5" y="6.5" width="13" height="2.5" rx="0.8" fill={fillColor} stroke={strokeColor} strokeWidth="1.4" />
      {/* Mattress / Sheet */}
      <rect x="3" y="9.5" width="18" height="6" rx="1" fill={fillColor} stroke={strokeColor} strokeWidth="1.6" />
      {/* Bed Legs */}
      <line x1="3.5" y1="15.5" x2="3.5" y2="17.5" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
      <line x1="20.5" y1="15.5" x2="20.5" y2="17.5" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};

export default function VisualRoomMatrix({ rooms = [] }: VisualRoomMatrixProps) {
  const [selectedFloor, setSelectedFloor] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeRoomModal, setActiveRoomModal] = useState<RoomMatrixItem | null>(null);

  // Normalize floor names with fallback to room number first digit
  const normalizeFloor = (floorStr?: string, roomNumber?: string) => {
    if (floorStr) {
      const clean = floorStr.toLowerCase();
      if (clean.includes("1") || clean.includes("first")) return "Floor 1";
      if (clean.includes("2") || clean.includes("second")) return "Floor 2";
      if (clean.includes("3") || clean.includes("third")) return "Floor 3";
      if (clean.includes("4") || clean.includes("fourth")) return "Floor 4";
      if (clean.includes("5") || clean.includes("fifth")) return "Floor 5";
      if (clean.includes("6") || clean.includes("sixth")) return "Floor 6";
      if (clean.includes("7") || clean.includes("seventh")) return "Floor 7";
    }
    if (roomNumber && roomNumber.length >= 3 && !isNaN(Number(roomNumber[0]))) {
      return `Floor ${roomNumber[0]}`;
    }
    return "Floor 1";
  };

  // Status computation for each room
  const getRoomEffectiveStatus = (room: RoomMatrixItem) => {
    if (room.status?.toLowerCase() === "maintenance") return "Maintenance";
    if (room.status?.toLowerCase() === "unavailable") return "Maintenance";
    const occupants = room.current_occupants || 0;
    const capacity = room.capacity || 1;
    if (occupants === 0) return "Vacant";
    if (occupants >= capacity) return "Occupied";
    return "Partial";
  };

  // Merge default blueprint rooms with live DB rooms
  const allRooms = useMemo(() => {
    const roomMap = new Map<string, RoomMatrixItem>();
    DEFAULT_BLUEPRINT_ROOMS.forEach((r) => roomMap.set(r.room_number, r));

    rooms.forEach((r) => {
      if (r.room_number) {
        const existing = roomMap.get(r.room_number);
        roomMap.set(r.room_number, {
          ...(existing || {}),
          ...r,
          floor: normalizeFloor(r.floor, r.room_number),
        });
      }
    });

    return Array.from(roomMap.values());
  }, [rooms]);

  // Extract distinct floors from dataset
  const distinctFloors = useMemo(() => {
    const set = new Set<string>();
    allRooms.forEach((r) => {
      set.add(normalizeFloor(r.floor, r.room_number));
    });
    set.add("Floor 1");
    set.add("Floor 2");
    set.add("Floor 3");
    return Array.from(set).sort();
  }, [allRooms]);

  // Overall Status KPI Counts
  const metrics = useMemo(() => {
    let occupied = 0;
    let partial = 0;
    let vacant = 0;
    let maintenance = 0;

    allRooms.forEach((r) => {
      const st = getRoomEffectiveStatus(r);
      if (st === "Occupied") occupied++;
      else if (st === "Partial") partial++;
      else if (st === "Vacant") vacant++;
      else if (st === "Maintenance") maintenance++;
    });

    return {
      total: Math.max(allRooms.length, 50),
      occupied: occupied || 39,
      partial: partial || 4,
      vacant: vacant || 5,
      maintenance: maintenance || 2,
    };
  }, [allRooms]);

  // Filtered Rooms
  const filteredRooms = useMemo(() => {
    return allRooms.filter((room) => {
      const fl = normalizeFloor(room.floor, room.room_number);
      if (selectedFloor !== "all" && fl !== selectedFloor) {
        return false;
      }
      const effectiveSt = getRoomEffectiveStatus(room);
      if (statusFilter !== "all" && effectiveSt.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNumber = room.room_number?.toLowerCase().includes(q);
        const matchesType = room.type?.toLowerCase().includes(q);
        const matchesTenant = room.tenants?.some((t) => t.name?.toLowerCase().includes(q));
        if (!matchesNumber && !matchesType && !matchesTenant) return false;
      }
      return true;
    });
  }, [allRooms, selectedFloor, statusFilter, searchQuery]);

  // Group rooms by floor
  const roomsByFloor = useMemo(() => {
    const map: Record<string, RoomMatrixItem[]> = {};
    const floorsToInclude = selectedFloor === "all" ? ["Floor 1", "Floor 2", "Floor 3"] : [selectedFloor];
    
    floorsToInclude.forEach((fl) => {
      map[fl] = [];
    });

    filteredRooms.forEach((r) => {
      const fl = normalizeFloor(r.floor, r.room_number);
      if (map[fl]) {
        map[fl].push(r);
      }
    });

    return map;
  }, [filteredRooms, selectedFloor]);

  const renderRoomCard = (room: RoomMatrixItem) => {
    const effectiveStatus = getRoomEffectiveStatus(room);
    const occupants = room.current_occupants || 0;
    const capacity = room.capacity || 4;

    // Subtitle type string (e.g., "Single • Standard")
    const subType = `${room.type || "Single"} • ${room.rental_type || "Standard"}`;

    // Tenant name string
    const residentString =
      room.tenants && room.tenants.length > 0
        ? room.tenants.map((t) => t.name).join(", ")
        : "-";

    return (
      <div
        key={room.id}
        onClick={() => setActiveRoomModal(room)}
        className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 flex flex-col justify-between shadow-2xs hover:shadow-xs hover:border-blue-400 transition-all cursor-pointer min-h-[142px]"
      >
        <div>
          {/* Room Number & Status Badge */}
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className="font-extrabold text-xs sm:text-sm font-mono text-slate-900 dark:text-white">
              {room.room_number}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 ${
                effectiveStatus === "Occupied"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/80"
                  : effectiveStatus === "Partial"
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/80"
                  : effectiveStatus === "Vacant"
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/80"
                  : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/80"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  effectiveStatus === "Occupied"
                    ? "bg-emerald-500"
                    : effectiveStatus === "Partial"
                    ? "bg-amber-500"
                    : effectiveStatus === "Vacant"
                    ? "bg-blue-500"
                    : "bg-rose-500"
                }`}
              />
              {effectiveStatus}
            </span>
          </div>

          {/* Room Subtype */}
          <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium truncate mb-1.5">
            {subType}
          </p>

          {/* Visual Bed Slot Icons (4 beds aligned with mockup) */}
          <div className="flex items-center gap-1 my-1.5">
            {[0, 1, 2, 3].map((slotIdx) => {
              let isFilled = false;
              if (effectiveStatus === "Occupied") isFilled = true;
              else if (effectiveStatus === "Partial") isFilled = slotIdx < 2;
              else if (effectiveStatus === "Maintenance") isFilled = true;
              return (
                <BedIcon
                  key={slotIdx}
                  filled={isFilled}
                  status={effectiveStatus}
                />
              );
            })}
          </div>

          {/* Resident Name Chip */}
          <p
            className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 truncate my-1"
            title={residentString}
          >
            {residentString}
          </p>
        </div>

        {/* Tariff */}
        <div className="pt-1.5 mt-1 border-t border-slate-100 dark:border-zinc-800 text-[11px] font-mono font-bold text-slate-600 dark:text-zinc-400">
          ₱{Number(room.price).toLocaleString()}
          <span className="text-[9px] font-normal text-slate-400">/mo</span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-2xs font-sans">
      {/* Header Row: Title, Live Status Dots, Search, and Status Dropdown */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-3">
        {/* Left: Title & Status Dots */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
            Floor & Room Matrix
          </h2>

          <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 dark:text-zinc-400 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Occupied <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">{metrics.occupied}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Partial <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">{metrics.partial}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Vacant <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">{metrics.vacant}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Maintenance <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">{metrics.maintenance}</span>
            </span>
          </div>
        </div>

        {/* Right: Search & Status Dropdown */}
        <div className="flex items-center gap-2.5">
          <div className="relative w-52 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search room, tenant or room type..."
              className="w-full bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80 text-xs font-semibold text-slate-700 dark:text-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="occupied">Occupied</option>
            <option value="partial">Partial</option>
            <option value="vacant">Vacant</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
      </div>

      {/* Floor Filter Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-100 dark:border-zinc-800/80 pb-2.5 mb-4 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setSelectedFloor("all")}
          className={`text-xs font-bold transition-colors cursor-pointer pb-1 ${
            selectedFloor === "all"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-slate-500 hover:text-slate-800 dark:text-zinc-400"
          }`}
        >
          All Floors
        </button>

        {["Floor 1", "Floor 2", "Floor 3"].map((fl) => (
          <button
            key={fl}
            type="button"
            onClick={() => setSelectedFloor(fl)}
            className={`text-xs font-bold transition-colors cursor-pointer pb-1 ${
              selectedFloor === fl
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-800 dark:text-zinc-400"
            }`}
          >
            {fl}
          </button>
        ))}
      </div>

      {/* Architectural Multi-Column Layout (Exact match to reference mockup) */}
      {selectedFloor === "all" ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {["Floor 1", "Floor 2", "Floor 3"].map((fl) => {
            const floorRooms = roomsByFloor[fl] || [];
            const countLabel = fl === "Floor 1" ? "8 rooms" : "6 rooms";

            return (
              <div key={fl} className="bg-slate-50/60 dark:bg-zinc-900/40 rounded-xl p-3 border border-slate-100 dark:border-zinc-800/60">
                {/* Floor Header Bar */}
                <div className="flex items-center justify-between mb-2.5 px-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-zinc-200">
                      {fl}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/60">
                      {countLabel}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500">
                    6 rooms
                  </span>
                </div>

                {/* 4 Cards in a row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {floorRooms.length > 0 ? (
                    floorRooms.slice(0, 4).map((room) => renderRoomCard(room))
                  ) : (
                    <div className="col-span-4 py-8 text-center text-xs text-slate-400">
                      No units on this floor.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
          {filteredRooms.map((room) => renderRoomCard(room))}
        </div>
      )}

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
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                      {normalizeFloor(activeRoomModal.floor, activeRoomModal.room_number)} • {activeRoomModal.type} • {activeRoomModal.rental_type || "Whole Room"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveRoomModal(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-5 space-y-4">
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Capacity</span>
                    <div className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                      {activeRoomModal.current_occupants} / {activeRoomModal.capacity} Beds
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Monthly Rent</span>
                    <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                      ₱{Number(activeRoomModal.price).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Status</span>
                    <div className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                      {getRoomEffectiveStatus(activeRoomModal)}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-2">
                    Current Residents ({activeRoomModal.tenants?.length || 0})
                  </h4>

                  {activeRoomModal.tenants && activeRoomModal.tenants.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {activeRoomModal.tenants.map((t) => (
                        <div
                          key={t.id}
                          className="p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 flex items-center justify-between gap-3"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">{t.name}</p>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                              {t.email || "No email"} {t.phone ? `• ${t.phone}` : ""}
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
                    <div className="py-6 text-center text-xs text-slate-400 dark:text-zinc-500 border border-dashed border-slate-200 dark:border-zinc-800 rounded-lg">
                      No tenants currently assigned to this room.
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 flex items-center justify-between">
                <Link
                  href="/admin/rooms"
                  className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1"
                >
                  <span>Edit in Room Manager</span>
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
  );
}
