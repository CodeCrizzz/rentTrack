"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Building2,
  Users,
  Bed,
  CheckCircle2,
  Wrench,
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
  DollarSign
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

export default function VisualRoomMatrix({ rooms = [] }: VisualRoomMatrixProps) {
  const [selectedFloor, setSelectedFloor] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeRoomModal, setActiveRoomModal] = useState<RoomMatrixItem | null>(null);

  // Normalize floor names (e.g. "1st floor", "1st Floor" -> "Floor 1")
  const normalizeFloor = (floorStr?: string) => {
    if (!floorStr) return "Floor 1";
    const clean = floorStr.toLowerCase();
    if (clean.includes("1") || clean.includes("first")) return "Floor 1";
    if (clean.includes("2") || clean.includes("second")) return "Floor 2";
    if (clean.includes("3") || clean.includes("third")) return "Floor 3";
    if (clean.includes("4") || clean.includes("fourth")) return "Floor 4";
    if (clean.includes("5") || clean.includes("fifth")) return "Floor 5";
    return floorStr.trim();
  };

  // Extract distinct floors from dataset
  const distinctFloors = useMemo(() => {
    const set = new Set<string>();
    rooms.forEach(r => {
      set.add(normalizeFloor(r.floor));
    });
    return Array.from(set).sort();
  }, [rooms]);

  // Status computation for each room
  const getRoomEffectiveStatus = (room: RoomMatrixItem) => {
    if (room.status?.toLowerCase() === "maintenance") return "Maintenance";
    if (room.status?.toLowerCase() === "unavailable") return "Unavailable";
    const occupants = room.current_occupants || 0;
    const capacity = room.capacity || 1;
    if (occupants === 0) return "Vacant";
    if (occupants >= capacity) return "Occupied";
    return "Partially Occupied";
  };

  // Status KPI Counts
  const metrics = useMemo(() => {
    let occupied = 0;
    let partial = 0;
    let vacant = 0;
    let maintenance = 0;

    rooms.forEach(r => {
      const st = getRoomEffectiveStatus(r);
      if (st === "Occupied") occupied++;
      else if (st === "Partially Occupied") partial++;
      else if (st === "Vacant") vacant++;
      else if (st === "Maintenance") maintenance++;
    });

    return {
      total: rooms.length,
      occupied,
      partial,
      vacant,
      maintenance
    };
  }, [rooms]);

  // Filtered Rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      // Floor filter
      if (selectedFloor !== "all" && normalizeFloor(room.floor) !== selectedFloor) {
        return false;
      }
      // Status filter
      const effectiveSt = getRoomEffectiveStatus(room);
      if (statusFilter !== "all" && effectiveSt.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNumber = room.room_number?.toLowerCase().includes(q);
        const matchesType = room.type?.toLowerCase().includes(q);
        const matchesTenant = room.tenants?.some(t => t.name?.toLowerCase().includes(q));
        if (!matchesNumber && !matchesType && !matchesTenant) return false;
      }
      return true;
    });
  }, [rooms, selectedFloor, statusFilter, searchQuery]);

  return (
    <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden font-sans">
      {/* Header & Controls */}
      <div className="p-5 border-b border-slate-200/80 dark:border-zinc-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/50 dark:bg-zinc-900/30">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Visual Floor & Room Matrix
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Digital Twin
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Interactive building layout with real-time bed slot availability, occupant rosters, and tariffs
          </p>
        </div>

        {/* Right side quick filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative w-44 sm:w-52">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search room, tenant..."
              className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="all">All Statuses ({rooms.length})</option>
            <option value="occupied">Occupied ({metrics.occupied})</option>
            <option value="partially occupied">Partial ({metrics.partial})</option>
            <option value="vacant">Vacant ({metrics.vacant})</option>
            <option value="maintenance">Maintenance ({metrics.maintenance})</option>
          </select>

          {/* Room Inventory Link */}
          <Link
            href="/admin/rooms"
            className="px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 text-xs font-semibold flex items-center gap-1 transition-colors ml-auto sm:ml-0"
          >
            <span>Rooms Manager</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* KPI Ribbon & Floor Navigation */}
      <div className="px-5 py-3 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Floor Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setSelectedFloor("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              selectedFloor === "all"
                ? "bg-slate-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Floors</span>
          </button>

          {distinctFloors.map(fl => (
            <button
              key={fl}
              type="button"
              onClick={() => setSelectedFloor(fl)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                selectedFloor === fl
                  ? "bg-teal-700 text-white shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800"
              }`}
            >
              <span>{fl}</span>
            </button>
          ))}
        </div>

        {/* Status Legend Pill Badges */}
        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-zinc-400 overflow-x-auto scrollbar-none">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Occupied ({metrics.occupied})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            Partial ({metrics.partial})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-zinc-700" />
            Vacant ({metrics.vacant})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            Maintenance ({metrics.maintenance})
          </span>
        </div>
      </div>

      {/* Grid of Room Cards */}
      <div className="p-5 bg-slate-100/40 dark:bg-zinc-950/40 min-h-[420px]">
        {filteredRooms.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500 dark:text-zinc-400 border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl">
            No rooms match the selected floor or filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {filteredRooms.map(room => {
              const effectiveStatus = getRoomEffectiveStatus(room);
              const occupants = room.current_occupants || 0;
              const capacity = room.capacity || 1;
              const isFull = occupants >= capacity;
              const isVacant = occupants === 0 && effectiveStatus !== "Maintenance";
              const isMaintenance = effectiveStatus === "Maintenance";
              const isPartial = occupants > 0 && occupants < capacity && !isMaintenance;

              return (
                <motion.div
                  key={room.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => setActiveRoomModal(room)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between relative group shadow-xs hover:shadow-md ${
                    isMaintenance
                      ? "bg-amber-50/40 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/50 hover:border-amber-400"
                      : isFull
                      ? "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-emerald-400 dark:hover:border-emerald-700"
                      : isPartial
                      ? "bg-blue-50/30 dark:bg-blue-950/10 border-blue-200 dark:border-blue-900/50 hover:border-blue-400"
                      : "bg-white/70 dark:bg-zinc-900/60 border-dashed border-slate-300 dark:border-zinc-700 hover:border-slate-400"
                  }`}
                >
                  {/* Top Bar: Room Number & Status Badge */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-base font-extrabold font-mono text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                            Room {room.room_number}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
                            {normalizeFloor(room.floor)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                          {room.type} • {room.rental_type || "Whole Room"}
                        </p>
                      </div>

                      {/* Status Tag */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          isMaintenance
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                            : isFull
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                            : isPartial
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400"
                            : "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isMaintenance
                              ? "bg-amber-500"
                              : isFull
                              ? "bg-emerald-500"
                              : isPartial
                              ? "bg-blue-500"
                              : "bg-slate-400"
                          }`}
                        />
                        {isMaintenance ? "Maint." : isFull ? "Occupied" : isPartial ? "Partial" : "Vacant"}
                      </span>
                    </div>

                    {/* Bed Capacity Slots Visualizer */}
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 mb-1.5">
                        <span className="flex items-center gap-1">
                          <Bed className="w-3.5 h-3.5" />
                          <span>Capacity:</span>
                        </span>
                        <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
                          {occupants} / {capacity} Beds
                        </span>
                      </div>

                      {/* Visual Bed Slot Dots / Segments */}
                      <div className="grid grid-cols-4 gap-1.5">
                        {Array.from({ length: Math.min(capacity, 8) }).map((_, slotIdx) => {
                          const isSlotFilled = slotIdx < occupants;
                          return (
                            <div
                              key={slotIdx}
                              className={`h-2 rounded-full transition-colors ${
                                isMaintenance
                                  ? "bg-amber-400 dark:bg-amber-600"
                                  : isSlotFilled
                                  ? "bg-emerald-500"
                                  : "bg-slate-200 dark:bg-zinc-800"
                              }`}
                              title={isSlotFilled ? `Slot ${slotIdx + 1}: Occupied` : `Slot ${slotIdx + 1}: Available`}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Occupants Preview Chips */}
                    <div className="mt-3 space-y-1">
                      {room.tenants && room.tenants.length > 0 ? (
                        room.tenants.slice(0, 2).map((t, tidx) => (
                          <div
                            key={tidx}
                            className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-zinc-300 font-medium truncate"
                          >
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{t.name}</span>
                          </div>
                        ))
                      ) : isMaintenance ? (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 italic">
                          Under maintenance / offline
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400 dark:text-zinc-500 italic">
                          Available for immediate lease
                        </p>
                      )}

                      {room.tenants && room.tenants.length > 2 && (
                        <p className="text-[10px] text-slate-400 font-semibold pl-4">
                          +{room.tenants.length - 2} more resident(s)
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom: Rent Tariff & Quick Action Indicator */}
                  <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block leading-none">
                        Tariff
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        ₱{Number(room.price).toLocaleString()}
                        <span className="text-[10px] font-normal text-slate-400">/mo</span>
                      </span>
                    </div>

                    <span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                      Details <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

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
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-10"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50/70 dark:bg-zinc-900/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-mono font-bold text-sm shadow-md">
                    {activeRoomModal.room_number}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Room {activeRoomModal.room_number} Details
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                      {normalizeFloor(activeRoomModal.floor)} • {activeRoomModal.type} • {activeRoomModal.rental_type || "Whole Room"}
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
              <div className="p-5 space-y-4">
                {/* Metrics ribbon */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Occupancy</span>
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
                      {activeRoomModal.tenants.map(t => (
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
                            className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 shrink-0"
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
                  className="text-xs text-teal-600 dark:text-teal-400 font-semibold hover:underline flex items-center gap-1"
                >
                  <span>Edit in Rooms Manager</span>
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
