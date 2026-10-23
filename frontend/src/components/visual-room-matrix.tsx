"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Building2,
  Users,
  Search,
  Filter,
  ChevronRight,
  Layers,
  Sparkles,
  ExternalLink,
  Phone,
  Mail,
  User,
  X,
  CreditCard,
  DoorOpen,
  DollarSign,
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

interface VisualRoomMatrixProps {
  rooms: RoomMatrixItem[];
}

// Bed SVG Icon Component matching mockup
const BedIcon = ({
  filled,
  status,
  className = "w-5 h-5",
}: {
  filled: boolean;
  status: string;
  className?: string;
}) => {
  if (status === "Maintenance") {
    return (
      <svg
        className={`${className} text-rose-500 fill-rose-500/20`}
        viewBox="0 0 24 24"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9" />
      </svg>
    );
  }
  if (filled) {
    return (
      <svg
        className={`${className} text-emerald-500 fill-emerald-500/20`}
        viewBox="0 0 24 24"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9" />
      </svg>
    );
  }
  return (
    <svg
      className={`${className} text-slate-300 dark:text-zinc-600 fill-transparent`}
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9" />
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

  // Extract distinct floors from dataset
  const distinctFloors = useMemo(() => {
    const set = new Set<string>();
    rooms.forEach((r) => {
      set.add(normalizeFloor(r.floor, r.room_number));
    });
    return Array.from(set).sort();
  }, [rooms]);

  // Overall Status KPI Counts
  const metrics = useMemo(() => {
    let occupied = 0;
    let partial = 0;
    let vacant = 0;
    let maintenance = 0;

    rooms.forEach((r) => {
      const st = getRoomEffectiveStatus(r);
      if (st === "Occupied") occupied++;
      else if (st === "Partial") partial++;
      else if (st === "Vacant") vacant++;
      else if (st === "Maintenance") maintenance++;
    });

    return {
      total: rooms.length,
      occupied,
      partial,
      vacant,
      maintenance,
    };
  }, [rooms]);

  // Filtered Rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
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
  }, [rooms, selectedFloor, statusFilter, searchQuery]);

  // Group rooms by floor
  const roomsByFloor = useMemo(() => {
    const map: Record<string, RoomMatrixItem[]> = {};
    const floorsToInclude = selectedFloor === "all" ? distinctFloors : [selectedFloor];
    
    floorsToInclude.forEach((fl) => {
      map[fl] = [];
    });

    filteredRooms.forEach((r) => {
      const fl = normalizeFloor(r.floor, r.room_number);
      if (!map[fl]) map[fl] = [];
      map[fl].push(r);
    });

    return map;
  }, [filteredRooms, distinctFloors, selectedFloor]);

  const renderRoomCard = (room: RoomMatrixItem) => {
    const effectiveStatus = getRoomEffectiveStatus(room);
    const occupants = room.current_occupants || 0;
    const capacity = room.capacity || 1;
    const isMaintenance = effectiveStatus === "Maintenance";

    // Subtitle type string (e.g., "Single • Standard")
    const subType = `${room.type || "Standard"} • ${room.rental_type || "Standard"}`;

    // Tenant name string
    const residentString =
      room.tenants && room.tenants.length > 0
        ? room.tenants.map((t) => t.name).join(", ")
        : "-";

    return (
      <div
        key={room.id}
        onClick={() => setActiveRoomModal(room)}
        className="p-3.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer flex flex-col justify-between shadow-2xs hover:shadow-xs group min-h-[145px]"
      >
        <div>
          {/* Room Number & Status Badge */}
          <div className="flex items-center justify-between gap-1.5 mb-1">
            <span className="font-extrabold text-sm sm:text-base font-mono text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {room.room_number}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                effectiveStatus === "Occupied"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
                  : effectiveStatus === "Partial"
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60"
                  : effectiveStatus === "Vacant"
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60"
                  : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60"
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
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium truncate mb-2">
            {subType}
          </p>

          {/* Visual Bed Slot Icons */}
          <div className="flex items-center gap-1.5 py-1">
            {Array.from({ length: Math.min(capacity, 6) }).map((_, slotIdx) => (
              <BedIcon
                key={slotIdx}
                filled={slotIdx < occupants}
                status={effectiveStatus}
                className="w-4 h-4"
              />
            ))}
          </div>

          {/* Resident Name Chip */}
          <div className="mt-1.5">
            <p
              className="text-xs font-semibold text-slate-700 dark:text-zinc-300 truncate"
              title={residentString}
            >
              {residentString}
            </p>
          </div>
        </div>

        {/* Price Tariff */}
        <div className="pt-2 mt-2 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
          <span className="font-mono font-bold text-slate-600 dark:text-zinc-400 text-[11px]">
            ₱{Number(room.price).toLocaleString()}
            <span className="text-[10px] font-normal text-slate-400">/mo</span>
          </span>
          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium group-hover:underline flex items-center gap-0.5">
            View <ChevronRight className="w-2.5 h-2.5" />
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs font-sans">
      {/* Header Row: Title, Live Counters, Search, and Status Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
        {/* Left: Title & Live Counters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
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

        {/* Right: Search & Status Filter */}
        <div className="flex items-center gap-2.5">
          {/* Search Box */}
          <div className="relative w-48 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search room, tenant or room type..."
              className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
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
      <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-zinc-800/80 pb-3 mb-4 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setSelectedFloor("all")}
          className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 ${
            selectedFloor === "all"
              ? "bg-[#0284c7] text-white shadow-xs"
              : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800"
          }`}
        >
          All Floors
        </button>

        {distinctFloors.map((fl) => (
          <button
            key={fl}
            type="button"
            onClick={() => setSelectedFloor(fl)}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 ${
              selectedFloor === fl
                ? "bg-[#0284c7] text-white shadow-xs"
                : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800"
            }`}
          >
            {fl}
          </button>
        ))}
      </div>

      {/* Floor Grid Layout (Multi-column architectural view like mockup) */}
      {selectedFloor === "all" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {distinctFloors.map((fl) => {
            const floorRooms = roomsByFloor[fl] || [];
            return (
              <div key={fl} className="bg-slate-50/50 dark:bg-zinc-900/30 rounded-xl p-3 border border-slate-100 dark:border-zinc-800/60">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-zinc-200">
                    {fl}
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500">
                    {floorRooms.length} rooms
                  </span>
                </div>

                {floorRooms.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">
                    No matching rooms on this floor.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {floorRooms.map((room) => renderRoomCard(room))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
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
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              className="relative w-full max-w-lg bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-10"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50/70 dark:bg-zinc-900/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-mono font-bold text-sm shadow-md">
                    {activeRoomModal.room_number}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Room {activeRoomModal.room_number}
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

              {/* Modal Body */}
              <div className="p-4 sm:p-5 space-y-4">
                {/* Metrics ribbon */}
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

                {/* Resident List */}
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

              {/* Modal Footer */}
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
