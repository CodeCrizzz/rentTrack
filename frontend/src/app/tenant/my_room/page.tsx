"use client";

import { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Users,
  BedDouble,
  Wrench,
  CheckCircle2,
  Sparkles,
  DoorOpen,
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  ArrowRight,
  X,
  Clock,
  Info,
  Wifi,
  Wind,
  Check,
  User,
  Droplets,
  Zap,
  Sun,
  Tv,
  Wallet,
  ShieldAlert,
  VolumeX,
  UserCheck,
  Flame,
  Ban,
} from "lucide-react";
import { toast } from "sonner";

const BOARDING_HOUSE_RULES = [
  {
    icon: Calendar,
    title: "Monthly Rent & Utility Due Date",
    description:
      "Monthly rent, water (₱300), and electricity (₱700) bills must be settled on or before the 5th of each month. Billing statements are generated 7 days before the due date.",
  },
  {
    icon: VolumeX,
    title: "Quiet Hours & Curfew",
    description:
      "Observe quiet hours from 10:00 PM to 6:00 AM. Keep hallways and shared spaces free from loud noise.",
  },
  {
    icon: UserCheck,
    title: "Visitor & Guest Policy",
    description:
      "Visitors are allowed in common areas only until 9:00 PM. Overnight stay of non-registered guests is prohibited.",
  },
  {
    icon: Sparkles,
    title: "Cleanliness & Waste Disposal",
    description:
      "Keep your room, bedspace, and common areas clean. Segregate and dispose of garbage properly every day.",
  },
  {
    icon: Flame,
    title: "Electrical & Fire Safety",
    description:
      "All electronics and appliances must be unplugged before leaving the room. High-wattage cooking equipment, open flames, and unauthorized wiring tampering are prohibited.",
  },
  {
    icon: Ban,
    title: "Smoking, Alcohol & Pets",
    description:
      "Strictly no smoking, vaping, alcoholic drinking, illegal substances, or pets inside the boarding house premises.",
  },
];

const getAttachmentUrl = (path: string | null | undefined) => {
  if (!path) return null;
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("blob:") ||
    path.startsWith("data:")
  )
    return path;
  const host =
    typeof window !== "undefined" ? window.location.hostname : "localhost";
  return `http://${host}:5000${path.startsWith("/") ? path : `/${path}`}`;
};

const formatRequestNumber = (id: any, reqNum?: string | null) => {
  if (reqNum) return reqNum;
  if (typeof id === "string" && id.startsWith("RT")) return id;
  if (!id) return "";
  return "RT-" + String(id).padStart(6, "0");
};

export default function TenantRooms() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [assignedRoomData, setAssignedRoomData] = useState<any>(null);
  const [tenantGender, setTenantGender] = useState<string | null>(null);
  const [isAssigned, setIsAssigned] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [rentalFilter, setRentalFilter] = useState("All");

  // Modal states
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [selectedMaintenance, setSelectedMaintenance] = useState<any>(null);
  const [selectedBoardmate, setSelectedBoardmate] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchRooms = async () => {
    try {
      const { data } = await api.get("/tenant/rooms");
      if (data.isAssigned) {
        setIsAssigned(true);
        setAssignedRoomData(data);
      } else {
        setIsAssigned(false);
        setRooms(data.rooms || []);
        if (data.tenantGender) {
          setTenantGender(data.tenantGender);
        }
      }
    } catch (error) {
      console.error("Error fetching rooms:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const storedUser = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        if (u.gender) setTenantGender(u.gender);
      } catch (e) {}
    }
    fetchRooms();
    const handleRefresh = () => {
      fetchRooms();
    };
    window.addEventListener("renttrack-refresh-data", handleRefresh);
    window.addEventListener("renttrack_refresh_all", handleRefresh);
    return () => {
      window.removeEventListener("renttrack-refresh-data", handleRefresh);
      window.removeEventListener("renttrack_refresh_all", handleRefresh);
    };
  }, []);

  const handleChooseRoom = async () => {
    if (!selectedRoom) return;
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const { data } = await api.post("/tenant/rooms/choose", {
        room_id: selectedRoom.id,
      });
      toast.success(
        data.message ||
          `Successfully assigned to Room ${selectedRoom.room_number}!`,
      );
      setSelectedRoom(null);
      await fetchRooms();
    } catch (error: any) {
      const msg = error.response?.data?.message || "Failed to select room";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const uniqueRentalModels = useMemo(
    () => ["All", "Whole Room", "Per Bed / Bedspace"],
    [],
  );

  const filteredRooms = useMemo(() => {
    const normGender = (tenantGender || "").trim().toLowerCase();
    const isMale = normGender === "male" || normGender === "m";
    const isFemale = normGender === "female" || normGender === "f";
    return rooms.filter((r) => {
      const rGender = (r.gender || "").trim().toLowerCase();
      // Strict gender filtering: Male only sees male rooms, Female only sees female rooms
      if (isMale) {
        if (!rGender.includes("male") || rGender.includes("female")) {
          return false;
        }
      } else if (isFemale) {
        if (!rGender.includes("female")) {
          return false;
        }
      }

      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        r.room_number?.toLowerCase().includes(q) ||
        (r.floor && r.floor.toLowerCase().includes(q));
      const matchesRental =
        rentalFilter === "All" || r.rental_type === rentalFilter;
      return matchesQuery && matchesRental;
    });
  }, [rooms, searchQuery, rentalFilter, tenantGender]);

  // SKELETON LOADER
  if (isLoading) {
    return (
      <div className="w-full space-y-4 font-sans text-slate-900 dark:text-zinc-100 animate-pulse">
        {/* Header Toolbar Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-zinc-800/80">
          <div>
            <div className="h-7 w-64 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
            <div className="h-3.5 w-80 bg-slate-200 dark:bg-zinc-800 rounded-md mt-2"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-24 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
          </div>
        </div>

        {/* Telemetry Ribbon (4 Tiles) Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between"
            >
              <div className="space-y-1.5 flex-1">
                <div className="h-2.5 w-24 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                <div className="h-6 w-32 bg-slate-200 dark:bg-zinc-800 rounded-md"></div>
                <div className="h-2.5 w-20 bg-slate-200 dark:bg-zinc-800 rounded"></div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 shrink-0"></div>
            </div>
          ))}
        </div>

        {/* Main Workspace Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-3 h-[380px]">
            <div className="h-4 w-48 bg-slate-200 dark:bg-zinc-800 rounded"></div>
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-14 bg-slate-100 dark:bg-zinc-800/40 rounded-xl"
              ></div>
            ))}
          </div>
          <div className="lg:col-span-1 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-3 h-[380px]">
            <div className="h-4 w-36 bg-slate-200 dark:bg-zinc-800 rounded"></div>
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="p-3 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-zinc-800 shrink-0"></div>
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 w-24 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                  <div className="h-2.5 w-32 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ASSIGNED ROOM VIEW
  if (isAssigned && assignedRoomData) {
    const {
      room = {},
      roommates = [],
      maintenance_history = [],
    } = assignedRoomData;
    const actualRoommates = roommates || [];
    const openBeds = Math.max(
      0,
      (room.capacity || 1) - (room.current_occupants || 0),
    );

    return (
      <div className="w-full h-full flex-1 flex flex-col gap-3 sm:gap-3.5 font-sans text-slate-900 dark:text-zinc-100 overflow-hidden pb-1">
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-zinc-800/80 shrink-0">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                <span>Room {room.room_number || "Assigned"}</span>
              </h1>
              {room.gender && (
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                    room.gender.toLowerCase().includes("male") &&
                    !room.gender.toLowerCase().includes("female")
                      ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                      : room.gender.toLowerCase().includes("female")
                        ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
                        : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"
                  }`}
                >
                  {room.gender}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
              Official room specs, rental terms, room roster, and facility
              maintenance requests.
            </p>
          </div>
        </div>

        {/*  Executive Room Telemetry Ribbon (4 Tiles) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 shrink-0">
          {/* Monthly Rent */}
          <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-4 sm:p-4.5 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Monthly Rent
              </span>
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white mt-0.5 leading-tight">
                ₱{Number(room.price || 0).toLocaleString()}
              </div>
              <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mt-1">
                Due on 5th of each month
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
              <Wallet className="w-5.5 h-5.5" />
            </div>
          </div>

          {/* Room Capacity */}
          <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-4 sm:p-4.5 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Room Capacity
              </span>
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white mt-0.5 leading-tight">
                {room.current_occupants || 1} / {room.capacity || 1}{" "}
                <span className="text-sm font-semibold text-slate-500">
                  Beds
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mt-1">
                {openBeds === 0
                  ? "Full room occupancy"
                  : `${openBeds} vacant bed(s)`}
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
              <BedDouble className="w-5.5 h-5.5" />
            </div>
          </div>

          {/* Room Rental Mode */}
          <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-4 sm:p-4.5 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Rental Model
              </span>
              <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-0.5 leading-tight truncate max-w-[140px]">
                {room.rental_type || "Whole Room"}
              </div>
              <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mt-1">
                Floor {room.floor || "1"}
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
              <Building2 className="w-5.5 h-5.5" />
            </div>
          </div>

          {/* Maintenance History */}
          <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-4 sm:p-4.5 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Maintenance History
              </span>
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white mt-0.5 leading-tight">
                {maintenance_history.length} Request
                {maintenance_history.length !== 1 ? "s" : ""}
              </div>
              <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mt-1">
                Facility logs verified
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 flex items-center justify-center shrink-0">
              <Wrench className="w-5.5 h-5.5" />
            </div>
          </div>
        </div>

        {/* Rules & Maintenance Log and Room Residents Roster  */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0 items-stretch overflow-hidden">
          {/* Left: Boarding House Rules & Regulations and Room Maintenance Log */}
          <div className="lg:col-span-2 flex flex-col gap-3 min-h-0 overflow-hidden">
            {/* Boarding House Rules & Regulations */}
            <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-4 sm:p-4.5 shadow-xs shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldAlert className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Our Rules &amp; Regulations</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Room policies required for all residents to maintain safety.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                {BOARDING_HOUSE_RULES.map((rule, idx) => {
                  const Icon = rule.icon;
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200/80 dark:border-zinc-800/80 bg-slate-50/60 dark:bg-zinc-900/40 flex items-start gap-2.5"
                    >
                      <div className="w-7 h-7 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold text-slate-900 dark:text-zinc-100 leading-snug">
                          {idx + 1}. {rule.title}
                        </p>
                        <p className="text-[11px] text-slate-600 dark:text-zinc-400 mt-0.5 leading-snug">
                          {rule.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Maintenance History Log */}
            <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl px-4 pt-3.5 pb-3 sm:px-5 sm:pt-4 sm:pb-3 shadow-xs flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex justify-between items-center mb-2.5 shrink-0">
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <Wrench className="w-4.5 h-4.5 text-slate-500" />
                      <span> Maintenance History </span>
                    </h2>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                    {maintenance_history.length} Logged
                  </span>
                </div>

                {maintenance_history.length > 0 ? (
                  <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-2">
                    {maintenance_history.map((reqItem: any, idx: number) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedMaintenance(reqItem)}
                        className="h-[60px] px-3.5 py-2 rounded-xl border border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/30 hover:border-zinc-400 dark:hover:border-zinc-700 transition-all cursor-pointer flex items-center justify-between gap-3 group shrink-0"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                reqItem.status === "Resolved"
                                  ? "bg-zinc-900 dark:bg-white"
                                  : reqItem.status === "In Progress"
                                    ? "bg-zinc-400 dark:bg-zinc-500"
                                    : "bg-amber-500"
                              }`}
                            ></span>
                            <span className="font-mono text-xs font-bold text-slate-900 dark:text-white shrink-0">
                              {formatRequestNumber(
                                reqItem.id,
                                reqItem.request_number,
                              )}
                            </span>
                            <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                              {reqItem.title}
                            </p>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono mt-0.5 truncate">
                            {reqItem.category || "General"} · Submitted{" "}
                            {new Date(reqItem.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-bold uppercase shrink-0 ${
                            reqItem.status === "Resolved"
                              ? "text-zinc-900 dark:text-white"
                              : reqItem.status === "In Progress"
                                ? "text-zinc-500 dark:text-zinc-400"
                                : "text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {reqItem.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 p-6 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 text-center flex flex-col items-center justify-center">
                    <CheckCircle2 className="w-9 h-9 text-slate-500 dark:text-zinc-400 mx-auto mb-2 opacity-80" />
                    <p className="text-sm font-bold text-slate-700 dark:text-zinc-300">
                      All Systems Functional
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Zero outstanding repair requests logged for your room.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ROOMMATE */}
          <div className="lg:col-span-1 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between min-h-0 overflow-hidden">
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="w-4.5 h-4.5 text-indigo-500" />
                    <span>Room Boardmate</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
                    Co-occupants in Room {room.room_number}
                  </p>
                </div>
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                  {actualRoommates.length} Occupant
                  {actualRoommates.length !== 1 ? "s" : ""}
                </span>
              </div>

              {actualRoommates.length > 0 ? (
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-2.5 my-3">
                  {actualRoommates.map((mate: any, i: number) => (
                    <div
                      key={i}
                      className="h-[68px] px-3.5 py-2.5 rounded-xl border border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/40 flex items-center gap-3.5 shrink-0"
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                          mate.is_me
                            ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-xs"
                            : "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                        }`}
                      >
                        {mate.name?.charAt(0) || "R"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                            {mate.name}
                          </p>
                          {mate.is_me && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700/60">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono mt-0.5 truncate">
                          Moved in:{" "}
                          {mate.date_moved_in
                            ? new Date(mate.date_moved_in).toLocaleDateString()
                            : "Active Resident"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedBoardmate(mate)}
                        className="text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:underline transition-colors bg-transparent border-0 outline-none cursor-pointer shrink-0"
                      >
                        View Profile
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 min-h-0 p-8 text-center text-slate-400 flex flex-col items-center justify-center my-3 border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl">
                  <Users className="w-9 h-9 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-semibold">No co-occupants</p>
                  <p className="text-xs text-slate-500 mt-1">
                    You currently have this room to yourself.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Maintenance Detail Modal */}
        <AnimatePresence>
          {selectedMaintenance && (
            <>
              <div
                className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs z-50"
                onClick={() => setSelectedMaintenance(null)}
              />
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div className="w-full max-w-lg bg-card rounded-2xl shadow-xl border border-slate-200 dark:border-zinc-800 overflow-hidden pointer-events-auto flex flex-col max-h-[85vh]">
                  <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-900/40">
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <Wrench className="w-4.5 h-4.5 text-slate-500 dark:text-zinc-400" />
                      <span>
                        Request #
                        {formatRequestNumber(
                          selectedMaintenance.id,
                          selectedMaintenance.request_number,
                        )}{" "}
                        Details
                      </span>
                    </h2>
                    <button
                      onClick={() => setSelectedMaintenance(null)}
                      className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-5 overflow-y-auto custom-scrollbar space-y-4">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                          {selectedMaintenance.title}
                        </h3>
                        <span
                          className={`text-xs font-bold uppercase ${
                            selectedMaintenance.status === "Resolved"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : selectedMaintenance.status === "In Progress"
                                ? "text-indigo-600 dark:text-indigo-400"
                                : "text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {selectedMaintenance.status}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        Submitted on{" "}
                        {new Date(
                          selectedMaintenance.created_at,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/50 border border-slate-100 dark:border-zinc-800/80 text-sm text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                      {selectedMaintenance.description ||
                        "No description provided."}
                    </div>

                    {(selectedMaintenance.attachment_url ||
                      selectedMaintenance.image_url) && (
                      <div className="mt-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block mb-1.5">
                          Damage Proof Photo
                        </span>
                        <a
                          href={
                            getAttachmentUrl(
                              selectedMaintenance.attachment_url ||
                                selectedMaintenance.image_url,
                            ) || "#"
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-black/5 dark:bg-black/20 hover:opacity-95 transition-opacity"
                        >
                          <img
                            src={
                              getAttachmentUrl(
                                selectedMaintenance.attachment_url ||
                                  selectedMaintenance.image_url,
                              ) || ""
                            }
                            alt="Damage proof"
                            className="w-full max-h-52 object-contain bg-slate-100 dark:bg-zinc-900"
                          />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </AnimatePresence>

        {/* Boardmate Profile Modal */}
        <AnimatePresence>
          {selectedBoardmate && (
            <>
              <div
                className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs z-50"
                onClick={() => setSelectedBoardmate(null)}
              />
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div className="w-full max-w-md bg-card rounded-2xl shadow-xl border border-slate-200 dark:border-zinc-800 overflow-hidden pointer-events-auto flex flex-col max-h-[85vh]">
                  <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-900/40">
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <User className="w-4.5 h-4.5 text-slate-500 dark:text-zinc-400" />
                      <span>Boardmate Profile</span>
                    </h2>
                    <button
                      type="button"
                      onClick={() => setSelectedBoardmate(null)}
                      className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-5 overflow-y-auto custom-scrollbar space-y-4">
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-base shrink-0 ${
                          selectedBoardmate.is_me
                            ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-xs"
                            : "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                        }`}
                      >
                        {selectedBoardmate.name?.charAt(0) || "R"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                            {selectedBoardmate.name}
                          </h3>
                          {selectedBoardmate.is_me && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700/60 shrink-0">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
                          Room {room.room_number} Occupant
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 dark:bg-zinc-900/50 border border-slate-100 dark:border-zinc-800/80 divide-y divide-slate-100 dark:divide-zinc-800/80 text-xs sm:text-sm">
                      <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                        <span className="text-slate-500 dark:text-zinc-400 font-medium">
                          Status
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {selectedBoardmate.status || "Active"}
                        </span>
                      </div>
                      <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                        <span className="text-slate-500 dark:text-zinc-400 font-medium">
                          Gender
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {selectedBoardmate.gender || "Not Specified"}
                        </span>
                      </div>
                      <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                        <span className="text-slate-500 dark:text-zinc-400 font-medium shrink-0">
                          Email
                        </span>
                        <span className="font-mono font-semibold text-slate-900 dark:text-white truncate">
                          {selectedBoardmate.email || "Not Provided"}
                        </span>
                      </div>
                      <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                        <span className="text-slate-500 dark:text-zinc-400 font-medium shrink-0">
                          Contact
                        </span>
                        <span className="font-mono font-semibold text-slate-900 dark:text-white truncate">
                          {selectedBoardmate.phone || "Not Provided"}
                        </span>
                      </div>
                      <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
                        <span className="text-slate-500 dark:text-zinc-400 font-medium shrink-0">
                          Moved In
                        </span>
                        <span className="font-mono font-semibold text-slate-900 dark:text-white">
                          {selectedBoardmate.date_moved_in
                            ? new Date(
                                selectedBoardmate.date_moved_in,
                              ).toLocaleDateString()
                            : "Active Resident"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // AVAILABLE ROOMS SELECTION VIEW
  return (
    <div className="w-full flex-1 flex flex-col space-y-4 sm:space-y-5 font-sans text-slate-900 dark:text-zinc-100 min-h-[calc(100vh-6.2rem)] pb-1">
      {/* Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-zinc-800/80 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <DoorOpen className="w-6 h-6 text-slate-900 dark:text-white shrink-0" />
              <span>Available Rooms & Bedspaces</span>
            </h1>
            <span className="text-xs font-mono font-bold text-zinc-600 dark:text-zinc-400">
              {filteredRooms.length} Units Available
            </span>
            {tenantGender && tenantGender !== "Not Specified" && (
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                • Filtered for {tenantGender} Residents
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
            Browse vacant rooms and confirm your residence room to activate your
            tenancy.
          </p>
        </div>
      </div>

      {/* Filter & Search Strip */}
      <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs sm:text-sm">
          {uniqueRentalModels.map((m) => (
            <button
              key={m}
              onClick={() => setRentalFilter(m)}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                rentalFilter === m
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 font-bold shadow-xs"
                  : "bg-slate-100 dark:bg-zinc-800/60 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-750"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search room # or floor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-2 pl-9 pr-3 text-sm rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
          />
        </div>
      </div>

      {/* 3. Rooms Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 flex-1">
        {filteredRooms.length > 0 ? (
          filteredRooms.map((room: any) => {
            const isFull =
              (room.available_slots || 0) <= 0 || room.status === "Maintenance";

            return (
              <div
                key={room.id}
                className={`rounded-xl bg-card border border-slate-200 dark:border-zinc-800 p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-zinc-400 dark:hover:border-zinc-700 transition-all ${
                  isFull ? "opacity-60" : ""
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">
                          Room {room.room_number}
                        </h3>
                        {room.gender && (
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                              room.gender.toLowerCase().includes("male") &&
                              !room.gender.toLowerCase().includes("female")
                                ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                                : room.gender.toLowerCase().includes("female")
                                  ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
                                  : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"
                            }`}
                          >
                            {room.gender}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                        {room.rental_type || "Whole Room"}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded text-xs font-mono font-bold uppercase ${
                        isFull
                          ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10"
                          : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-200"
                      }`}
                    >
                      {isFull
                        ? "Unavailable"
                        : `${room.available_slots || room.capacity - room.current_occupants} Bed(s) Free`}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 my-3.5 py-3 border-y border-slate-100 dark:border-zinc-800/80 text-xs sm:text-sm">
                    <div>
                      <span className="text-xs text-slate-400 font-semibold block">
                        Monthly Rent
                      </span>
                      <span className="font-extrabold font-mono text-slate-900 dark:text-white text-base">
                        ₱{Number(room.price).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 font-semibold block">
                        Capacity
                      </span>
                      <span className="font-extrabold font-mono text-slate-700 dark:text-zinc-300 text-sm sm:text-base">
                        {room.current_occupants} / {room.capacity} Beds
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  disabled={isFull}
                  onClick={() => setSelectedRoom(room)}
                  className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    isFull
                      ? "bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-600 cursor-not-allowed"
                      : "bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 shadow-xs"
                  }`}
                >
                  <span>{isFull ? "Room Full" : "Select Room"}</span>
                  {!isFull && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-16 text-center text-slate-400 bg-card rounded-xl border border-slate-200 dark:border-zinc-800">
            <DoorOpen className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-semibold">No rooms match your filter</p>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {selectedRoom && (
          <>
            <div
              className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs z-50"
              onClick={() => !isSubmitting && setSelectedRoom(null)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <div className="w-full max-w-md bg-card rounded-2xl shadow-xl border border-slate-200 dark:border-zinc-800 overflow-hidden pointer-events-auto flex flex-col">
                <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-900/40">
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Building2 className="w-4.5 h-4.5 text-slate-500 dark:text-zinc-400" />
                    <span>Confirm Room Assignment</span>
                  </h2>
                  <button
                    onClick={() => !isSubmitting && setSelectedRoom(null)}
                    className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  {errorMsg && (
                    <div className="p-3 rounded-lg bg-rose-50 text-rose-600 text-xs sm:text-sm font-semibold border border-rose-200">
                      {errorMsg}
                    </div>
                  )}
                  <p className="text-sm text-slate-600 dark:text-zinc-400">
                    You are about to select{" "}
                    <strong className="text-slate-900 dark:text-white">
                      Room {selectedRoom.room_number}
                    </strong>
                    . You will be assigned to this room and and your profile
                    will be activated.
                  </p>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/50 border border-slate-100 dark:border-zinc-800 space-y-2 text-xs sm:text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-semibold">
                        Rental Mode:
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {selectedRoom.rental_type || "Whole Room"}
                      </span>
                    </div>
                    {selectedRoom.gender && (
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-semibold">
                          Gender Designation:
                        </span>
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-xs border ${
                            selectedRoom.gender.toLowerCase().includes("male") &&
                            !selectedRoom.gender.toLowerCase().includes("female")
                              ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                              : selectedRoom.gender.toLowerCase().includes("female")
                                ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
                                : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"
                          }`}
                        >
                          {selectedRoom.gender}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-semibold">
                        Monthly Rate:
                      </span>
                      <span className="font-bold font-mono text-slate-900 dark:text-white">
                        ₱{Number(selectedRoom.price).toLocaleString()} / mo
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-semibold">
                        Room Capacity
                      </span>
                      <span className="font-bold font-mono text-slate-900 dark:text-white">
                        {selectedRoom.capacity} Beds
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleChooseRoom}
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-lg text-sm font-bold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 transition-all shadow-xs disabled:opacity-50"
                  >
                    {isSubmitting
                      ? "Confirming Room..."
                      : "Confirm Room Assignment"}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
