"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import DropdownSelect from "@/components/dropdown-select";
import { formatPhoneNumber } from "@/lib/phone-utils";
import {
  Bed,
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

interface VisualRoomMatrixProps {
  rooms: RoomMatrixItem[];
}

// Bed Icon for bed capacity slots
const BedIcon = ({ filled, status }: { filled: boolean; status: string }) => {
  let iconColor = "text-slate-300 dark:text-zinc-600";
  let label = "Vacant bed";

  if (status === "Maintenance") {
    iconColor = "text-rose-500 dark:text-rose-400";
    label = "Bed under maintenance";
  } else if (filled) {
    if (status === "OccupiedWithBeds" || status === "Partial") {
      iconColor = "text-amber-500 dark:text-amber-400";
      label = "Occupied bed";
    } else {
      iconColor = "text-emerald-500 dark:text-emerald-400";
      label = "Occupied bed";
    }
  }

  return (
    <span title={label} className="inline-flex shrink-0">
      <Bed
        className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${iconColor} transition-colors`}
      />
    </span>
  );
};

export default function VisualRoomMatrix({
  rooms = [],
}: VisualRoomMatrixProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeRoomModal, setActiveRoomModal] = useState<RoomMatrixItem | null>(
    null,
  );

  // Normalize floor names with fallback to room number first digit
  const normalizeFloor = (floorStr?: string | null, roomNumber?: string) => {
    if (floorStr) {
      const clean = floorStr.toLowerCase();
      if (
        clean.includes("1") ||
        clean.includes("first") ||
        clean.includes("1st")
      )
        return "Floor 1";
      if (
        clean.includes("2") ||
        clean.includes("second") ||
        clean.includes("2nd")
      )
        return "Floor 2";
      if (
        clean.includes("3") ||
        clean.includes("third") ||
        clean.includes("3rd")
      )
        return "Floor 3";
      if (
        clean.includes("4") ||
        clean.includes("fourth") ||
        clean.includes("4th")
      )
        return "Floor 4";
      if (
        clean.includes("5") ||
        clean.includes("fifth") ||
        clean.includes("5th")
      )
        return "Floor 5";
      if (
        clean.includes("6") ||
        clean.includes("sixth") ||
        clean.includes("6th")
      )
        return "Floor 6";
      if (
        clean.includes("7") ||
        clean.includes("seventh") ||
        clean.includes("7th")
      )
        return "Floor 7";
    }
    if (roomNumber && roomNumber.length >= 3 && !isNaN(Number(roomNumber[0]))) {
      return `Floor ${roomNumber[0]}`;
    }
    return "Floor 1";
  };

  type EffectiveStatus =
    | "Full"
    | "OccupiedWithBeds"
    | "Available"
    | "Maintenance";

  // Status computation for each room
  const getRoomEffectiveStatus = (room: RoomMatrixItem): EffectiveStatus => {
    const rawStatus = (room.status || "").toLowerCase();
    if (rawStatus === "maintenance" || rawStatus === "unavailable")
      return "Maintenance";
    const occupants =
      room.current_occupants ?? (room.tenants ? room.tenants.length : 0);
    const capacity = Number(room.capacity) > 0 ? Number(room.capacity) : 1;
    if (occupants === 0) return "Available";
    if (occupants >= capacity) return "Full";
    return "OccupiedWithBeds";
  };

  const getAvailableBedsCount = (room: RoomMatrixItem): number => {
    const occupants =
      room.current_occupants ?? (room.tenants ? room.tenants.length : 0);
    const capacity = Number(room.capacity) > 0 ? Number(room.capacity) : 1;
    return Math.max(0, capacity - occupants);
  };

  // Live rooms from PostgreSQL
  const allRooms = useMemo(() => {
    return rooms.map((r) => ({
      ...r,
      floor: normalizeFloor(r.floor, r.room_number),
    }));
  }, [rooms]);

  // Extract distinct floors from live dataset
  const distinctFloors = useMemo(() => {
    const set = new Set<string>();
    allRooms.forEach((r) => {
      set.add(normalizeFloor(r.floor, r.room_number));
    });
    const arr = Array.from(set).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true }),
    );
    return arr.length > 0 ? arr : ["Floor 1"];
  }, [allRooms]);

  // Overall Status KPI Counts from real rooms
  const metrics = useMemo(() => {
    let full = 0;
    let occupiedWithBeds = 0;
    let vacant = 0;
    let maintenance = 0;

    allRooms.forEach((r) => {
      const st = getRoomEffectiveStatus(r);
      if (st === "Full") full++;
      else if (st === "OccupiedWithBeds") occupiedWithBeds++;
      else if (st === "Available") vacant++;
      else if (st === "Maintenance") maintenance++;
    });

    return {
      total: allRooms.length,
      full,
      occupiedWithBeds,
      vacant,
      maintenance,
    };
  }, [allRooms]);

  // Filtered Rooms
  const filteredRooms = useMemo(() => {
    return allRooms.filter((room) => {
      const effectiveSt = getRoomEffectiveStatus(room);
      if (statusFilter !== "all") {
        if (statusFilter === "full" && effectiveSt !== "Full") return false;
        if (
          (statusFilter === "occupied_with_beds" ||
            statusFilter === "partial") &&
          effectiveSt !== "OccupiedWithBeds"
        )
          return false;
        if (
          (statusFilter === "occupied") &&
          effectiveSt !== "Full" &&
          effectiveSt !== "OccupiedWithBeds"
        )
          return false;
        if (
          (statusFilter === "vacant" || statusFilter === "available") &&
          effectiveSt !== "Available"
        )
          return false;
        if (statusFilter === "maintenance" && effectiveSt !== "Maintenance")
          return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNumber = room.room_number?.toLowerCase().includes(q);
        const matchesType = room.type?.toLowerCase().includes(q);
        const matchesTenant = room.tenants?.some((t) =>
          t.name?.toLowerCase().includes(q),
        );
        if (!matchesNumber && !matchesType && !matchesTenant) return false;
      }
      return true;
    });
  }, [allRooms, statusFilter, searchQuery]);

  // Group rooms by floor
  const roomsByFloor = useMemo(() => {
    const map: Record<string, RoomMatrixItem[]> = {};
    distinctFloors.forEach((fl) => {
      map[fl] = [];
    });

    filteredRooms.forEach((r) => {
      const fl = normalizeFloor(r.floor, r.room_number);
      if (map[fl]) {
        map[fl].push(r);
      }
    });

    return map;
  }, [filteredRooms, distinctFloors]);

  const renderRoomCard = (room: RoomMatrixItem) => {
    const effectiveStatus = getRoomEffectiveStatus(room);
    const occupants =
      room.current_occupants ?? (room.tenants ? room.tenants.length : 0);
    const capacity = Number(room.capacity) > 0 ? Number(room.capacity) : 1;
    const availBeds = getAvailableBedsCount(room);
    const totalBeds = Math.min(Math.max(capacity, 1), 24);

    // Group beds into rows of maximum 4 beds per row
    const bedSlots = Array.from({ length: totalBeds }).map((_, slotIdx) => {
      let isFilled = false;
      if (effectiveStatus === "Full") isFilled = true;
      else if (effectiveStatus === "OccupiedWithBeds") isFilled = slotIdx < occupants;
      else if (effectiveStatus === "Maintenance") isFilled = true;
      return { slotIdx, isFilled };
    });

    const bedRows: { slotIdx: number; isFilled: boolean }[][] = [];
    for (let i = 0; i < bedSlots.length; i += 4) {
      bedRows.push(bedSlots.slice(i, i + 4));
    }

    // Dynamic min-height based on number of bed rows to allow card to expand
    const cardMinHeight =
      bedRows.length <= 1
        ? "min-h-[160px]"
        : bedRows.length === 2
          ? "min-h-[188px]"
          : bedRows.length === 3
            ? "min-h-[216px]"
            : "min-h-[244px]";

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
        className={`bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-xl p-3.5 sm:p-4 flex flex-col justify-between shadow-2xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer ${cardMinHeight}`}
      >
        <div>
          {/* Room Number */}
          <div className="mb-1">
            <span className="font-extrabold text-sm sm:text-base font-mono text-slate-900 dark:text-white">
              {room.room_number}
            </span>
          </div>

          {/* Room Subtype */}
          <p
            title={subType}
            className="text-xs text-slate-600 dark:text-zinc-300 font-semibold truncate mb-2"
          >
            {subType}
          </p>

          {/* Visual Bed Slot Icons (Max 4 beds per row; additional beds create new rows) */}
          <div className="flex flex-col gap-1.5 my-2">
            {bedRows.map((row, rowIdx) => (
              <div key={rowIdx} className="flex items-center gap-1.5">
                {row.map(({ slotIdx, isFilled }) => (
                  <BedIcon
                    key={slotIdx}
                    filled={isFilled}
                    status={effectiveStatus}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Room Status Text */}
          <p
            className={`text-xs font-bold truncate my-1.5 ${
              effectiveStatus === "Full"
                ? "text-emerald-600 dark:text-emerald-400"
                : effectiveStatus === "OccupiedWithBeds"
                  ? "text-amber-600 dark:text-amber-400"
                  : effectiveStatus === "Maintenance"
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-blue-600 dark:text-blue-400"
            }`}
            title={
              effectiveStatus === "OccupiedWithBeds"
                ? `Occupied with ${availBeds} ${availBeds === 1 ? "available bed" : "available beds"}`
                : effectiveStatus === "Full"
                  ? "Full"
                  : effectiveStatus === "Available"
                    ? "Vacant"
                    : "Maintenance"
            }
          >
            {effectiveStatus === "Full"
              ? "Full"
              : effectiveStatus === "OccupiedWithBeds"
                ? `Occupied with ${availBeds} ${availBeds === 1 ? "available bed" : "available beds"}`
                : effectiveStatus === "Available"
                  ? "Vacant"
                  : "Maintenance"}
          </p>
        </div>

        {/* Tariff */}
        <div className="pt-2 mt-2 border-t border-slate-100 dark:border-zinc-800 text-xs sm:text-sm font-mono font-bold text-slate-700 dark:text-zinc-200">
          ₱{Number(room.price).toLocaleString()}
          <span className="text-[10px] font-medium text-slate-600 dark:text-zinc-300 ml-0.5">
            /mo
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-2xs font-sans">
      {/* Header */}
      <div className="mb-5 space-y-3">
        <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
          Floor & Room Matrix
        </h2>

        {/* Row: 1st Searchbar, 2nd Status Dropdown, 3rd 4 Room Status Text directly beside dropdown */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {/* 1st: Searchbar */}
          <div className="relative w-52 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search room, tenant or room type..."
              className="w-full bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-900 dark:text-zinc-100 placeholder:text-slate-500 dark:placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* 2nd: Status Dropdown Menu */}
          <div className="w-36 sm:w-48">
            <DropdownSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "All Status", dotColor: "bg-slate-400" },
                { value: "full", label: "Full", dotColor: "bg-emerald-500" },
                {
                  value: "occupied_with_beds",
                  label: "Occupied w/ Beds",
                  dotColor: "bg-amber-500",
                },
                {
                  value: "available",
                  label: "Vacant",
                  dotColor: "bg-blue-500",
                },
                {
                  value: "maintenance",
                  label: "Maintenance",
                  dotColor: "bg-rose-500",
                },
              ]}
              className="w-full bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80 text-xs font-semibold text-slate-700 dark:text-zinc-200 rounded-lg px-2.5 py-1.5 hover:border-slate-300 dark:hover:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors shadow-2xs"
            />
          </div>

          {/* 3rd: The 4 Room Status Text directly beside the dropdown menu */}
          <div className="flex items-center gap-3 sm:gap-4 text-xs font-semibold text-slate-700 dark:text-zinc-200 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Full{" "}
              <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
                {metrics.full}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Occupied w/ Beds{" "}
              <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
                {metrics.occupiedWithBeds}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Vacant{" "}
              <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
                {metrics.vacant}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Maintenance{" "}
              <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
                {metrics.maintenance}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Architectural Multi-Column Layout (All Floors Displayed) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {distinctFloors.map((fl) => {
          const floorRooms = roomsByFloor[fl] || [];
          const countLabel = `${floorRooms.length} ${floorRooms.length === 1 ? "room" : "rooms"}`;

          return (
            <div
              key={fl}
              className="bg-slate-50/60 dark:bg-zinc-900/40 rounded-xl p-3 border border-slate-100 dark:border-zinc-800/60 flex flex-col"
            >
              {/* Floor Header Bar */}
              <div className="flex flex-wrap items-center justify-between mb-2.5 px-0.5 gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-zinc-200">
                    {fl}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/60">
                    {countLabel}
                  </span>
                </div>

                {/* Floor Status Summary Badges */}
                {(() => {
                  let fFull = 0;
                  let fWithBeds = 0;
                  let fVacant = 0;
                  let fMaint = 0;
                  floorRooms.forEach((r) => {
                    const st = getRoomEffectiveStatus(r);
                    if (st === "Full") fFull++;
                    else if (st === "OccupiedWithBeds") fWithBeds++;
                    else if (st === "Available") fVacant++;
                    else if (st === "Maintenance") fMaint++;
                  });

                  return (
                    <div className="flex flex-wrap items-center gap-1 text-[10px] font-bold">
                      {fFull > 0 && (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Full: {fFull}
                        </span>
                      )}
                      {fWithBeds > 0 && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Occupied w/ Beds: {fWithBeds}
                        </span>
                      )}
                      {fVacant > 0 && (
                        <span className="px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          Vacant: {fVacant}
                        </span>
                      )}
                      {fMaint > 0 && (
                        <span className="px-1.5 py-0.2 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          Maint: {fMaint}
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Scrollable Cards Container: Minimum 2 rows displayed; extra rows shown via scrollbar */}
              <div className="h-[370px] overflow-y-auto p-0.5 pr-1.5 custom-scrollbar">
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
                  {floorRooms.length > 0 ? (
                    floorRooms.map((room) => renderRoomCard(room))
                  ) : (
                    <div className="col-span-full h-[340px] flex items-center justify-center text-xs text-slate-600 dark:text-zinc-300 font-medium">
                      No units on this floor.
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
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
                    <p className="text-xs text-slate-600 dark:text-zinc-300 font-medium">
                      {normalizeFloor(
                        activeRoomModal.floor,
                        activeRoomModal.room_number,
                      )}{" "}
                      • {activeRoomModal.type} •{" "}
                      {activeRoomModal.rental_type || "Whole Room"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveRoomModal(null)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-5 space-y-4">
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                    <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-zinc-300">
                      Capacity
                    </span>
                    <div className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-0.5">
                      {activeRoomModal.current_occupants} /{" "}
                      {activeRoomModal.capacity} Beds
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                    <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-zinc-300">
                      Monthly Rent
                    </span>
                    <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                      ₱{Number(activeRoomModal.price).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                    <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-zinc-300">
                      Status
                    </span>
                    <div
                      className={`text-xs font-bold mt-1 ${
                        getRoomEffectiveStatus(activeRoomModal) === "Full"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : getRoomEffectiveStatus(activeRoomModal) ===
                              "OccupiedWithBeds"
                            ? "text-amber-600 dark:text-amber-400"
                            : getRoomEffectiveStatus(activeRoomModal) ===
                                "Available"
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {getRoomEffectiveStatus(activeRoomModal) === "Full"
                        ? "Full"
                        : getRoomEffectiveStatus(activeRoomModal) ===
                            "OccupiedWithBeds"
                          ? `Occupied with ${getAvailableBedsCount(activeRoomModal)} ${getAvailableBedsCount(activeRoomModal) === 1 ? "available bed" : "available beds"}`
                          : getRoomEffectiveStatus(activeRoomModal) ===
                              "Available"
                            ? "Vacant"
                            : "Maintenance"}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-200 mb-2">
                    Current Residents ({activeRoomModal.tenants?.length || 0})
                  </h4>

                  {activeRoomModal.tenants &&
                  activeRoomModal.tenants.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {activeRoomModal.tenants.map((t) => (
                        <div
                          key={t.id}
                          className="p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 flex items-center justify-between gap-3"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">
                              {t.name}
                            </p>
                            <p className="text-[11px] text-slate-600 dark:text-zinc-300 font-medium">
                              {t.email || "No email"}{" "}
                              {t.phone ? `• ${formatPhoneNumber(t.phone)}` : ""}
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
                    <div className="py-6 text-center text-xs text-slate-600 dark:text-zinc-300 font-medium border border-dashed border-slate-200 dark:border-zinc-800 rounded-lg">
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
