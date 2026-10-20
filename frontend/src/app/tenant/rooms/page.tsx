"use client";

import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Building2, Users, BedDouble, Wrench, CheckCircle2, 
    Sparkles, DoorOpen, Search, Filter,
    Calendar, AlertTriangle, ArrowRight, X, Clock,
    Info, Wifi, Wind, Check, User, RefreshCw,
    Droplets, Zap, Sun, Tv
} from 'lucide-react';
import { toast } from 'sonner';

// Helper to assign intuitive icons to real inclusions/amenities entered by admin
const getAmenityIcon = (label: string) => {
    const lower = label.toLowerCase();
    if (lower.includes('wifi') || lower.includes('wi-fi') || lower.includes('internet')) return Wifi;
    if (lower.includes('air') || lower.includes('ac') || lower.includes('cooling') || lower.includes('fan')) return Wind;
    if (lower.includes('bath') || lower.includes('shower') || lower.includes('water')) return Droplets;
    if (lower.includes('submeter') || lower.includes('power') || lower.includes('electric') || lower.includes('zap')) return Zap;
    if (lower.includes('tv') || lower.includes('television')) return Tv;
    if (lower.includes('balcony') || lower.includes('window') || lower.includes('view') || lower.includes('sun')) return Sun;
    return Sparkles;
};

const formatRequestNumber = (id: any, reqNum?: string | null) => {
    if (reqNum) return reqNum;
    if (typeof id === 'string' && id.startsWith('RT')) return id;
    if (!id) return '';
    return 'RT-' + String(id).padStart(6, '0');
};

export default function TenantRooms() {
    const [rooms, setRooms] = useState<any[]>([]);
    const [assignedRoomData, setAssignedRoomData] = useState<any>(null);
    const [isAssigned, setIsAssigned] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("All");
    
    // Modal states
    const [selectedRoom, setSelectedRoom] = useState<any>(null);
    const [selectedMaintenance, setSelectedMaintenance] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const fetchRooms = async (showToast = false) => {
        if (showToast) setIsRefreshing(true);
        try {
            const { data } = await api.get('/tenant/rooms');
            if (data.isAssigned) {
                setIsAssigned(true);
                setAssignedRoomData(data);
            } else {
                setIsAssigned(false);
                setRooms(data.rooms || []);
            }
            if (showToast) toast.success("Room status synchronized");
        } catch (error) {
            console.error("Error fetching rooms:", error);
            if (showToast) toast.error("Failed to sync room information");
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchRooms();
    }, []);

    const handleChooseRoom = async () => {
        if (!selectedRoom) return;
        setIsSubmitting(true);
        setErrorMsg("");
        
        try {
            const { data } = await api.post('/tenant/rooms/choose', { room_id: selectedRoom.id });
            toast.success(data.message || `Successfully assigned to Room ${selectedRoom.room_number}!`);
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

    const uniqueTypes = useMemo(() => {
        const types = Array.from(new Set(rooms.map(r => r.type).filter(Boolean)));
        return ["All", ...types];
    }, [rooms]);

    const filteredRooms = useMemo(() => {
        return rooms.filter(r => {
            const q = searchQuery.toLowerCase().trim();
            const matchesQuery = !q || (
                r.room_number?.toLowerCase().includes(q) ||
                r.type?.toLowerCase().includes(q) ||
                (r.floor && r.floor.toLowerCase().includes(q))
            );
            const matchesType = typeFilter === "All" || r.type === typeFilter;
            return matchesQuery && matchesType;
        });
    }, [rooms, searchQuery, typeFilter]);


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
                        <div key={i} className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
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
                    <div className="lg:col-span-2 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-4 h-[380px]">
                        <div className="h-4 w-40 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                        <div className="grid grid-cols-2 gap-3">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-16 bg-slate-100 dark:bg-zinc-800/60 rounded-xl"></div>
                            ))}
                        </div>
                        <div className="h-32 bg-slate-100 dark:bg-zinc-800/40 rounded-xl"></div>
                    </div>
                    <div className="lg:col-span-1 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-3 h-[380px]">
                        <div className="h-4 w-36 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="p-3 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 flex items-center gap-3">
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
        const { room = {}, roommates = [], maintenance_history = [] } = assignedRoomData;
        const actualRoommates = roommates || [];
        const openBeds = Math.max(0, (room.capacity || 1) - (room.current_occupants || 0));

        // Only display real inclusions entered by admin when adding/editing the room (base inclusions removed)
        const realAmenities: { icon: any; label: string; status: string }[] = (room?.amenities && typeof room.amenities === 'string')
            ? room.amenities
                .split(',')
                .map((s: string) => s.trim())
                .filter(Boolean)
                .map((label: string) => ({
                    icon: getAmenityIcon(label),
                    label,
                    status: 'Included'
                }))
            : [];

        const MIN_AMENITY_SLOTS = 4;
        const emptySlotsCount = Math.max(0, MIN_AMENITY_SLOTS - realAmenities.length);

        return (
            <div className="w-full flex-1 flex flex-col space-y-4 sm:space-y-5 font-sans text-slate-900 dark:text-zinc-100 min-h-[calc(100vh-6.2rem)] justify-between pb-1">
                
                {/* Header Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-zinc-800/80 shrink-0">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                                <DoorOpen className="w-6 h-6 text-teal-600 shrink-0" />
                                <span>Room {room.room_number || 'Assigned'}</span>
                            </h1>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
                            Official room specs, rental terms, room roster, and facility maintenance requests.
                        </p>
                    </div>
                </div>

                {/*  Executive Suite Telemetry Ribbon (4 Tiles) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 shrink-0">
                    
                    {/* Monthly Rent */}
                    <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-4 sm:p-4.5 shadow-xs flex items-center justify-between">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Monthly Rent</span>
                            <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 leading-tight">
                                ₱{Number(room.price || 0).toLocaleString()}
                            </div>
                            <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mt-1">Due on 5th of each month</div>
                        </div>
                        <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                            <Sparkles className="w-5.5 h-5.5" />
                        </div>
                    </div>

                    {/* Suite Capacity */}
                    <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-4 sm:p-4.5 shadow-xs flex items-center justify-between">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Suite Capacity</span>
                            <div className="text-2xl sm:text-3xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-0.5 leading-tight">
                                {room.current_occupants || 1} / {room.capacity || 1} <span className="text-sm font-semibold text-slate-500">Beds</span>
                            </div>
                            <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mt-1">
                                {openBeds === 0 ? 'Full suite occupancy' : `${openBeds} vacant bed(s)`}
                            </div>
                        </div>
                        <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                            <BedDouble className="w-5.5 h-5.5" />
                        </div>
                    </div>

                    {/* Suite Classification */}
                    <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-4 sm:p-4.5 shadow-xs flex items-center justify-between">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Suite Classification</span>
                            <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-0.5 leading-tight truncate max-w-[140px]">
                                {room.type || 'Standard Room'}
                            </div>
                            <div className="text-xs font-semibold text-teal-600 dark:text-teal-400 mt-1">
                                Floor {room.floor || '1'} Wing
                            </div>
                        </div>
                        <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
                            <Building2 className="w-5.5 h-5.5" />
                        </div>
                    </div>

                    {/* Maintenance History */}
                    <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-4 sm:p-4.5 shadow-xs flex items-center justify-between">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Maintenance History</span>
                            <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white mt-0.5 leading-tight">
                                {maintenance_history.length} Request{maintenance_history.length !== 1 ? 's' : ''}
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

                {/* Amenities & Maintenance Log (Left) and Suite Residents Roster (Right) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 items-stretch">
                    
                    {/* Left: Room Amenities & Suite Maintenance Log */}
                    <div className="lg:col-span-2 flex flex-col gap-2.5">
                        
                        {/* Amenities Strip */}
                        <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-4 sm:p-4.5 shadow-xs shrink-0">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-teal-600" />
                                    <span>Room Inclusions & Amenities</span>
                                </h2>
                                {realAmenities.length >= 5 && (
                                    <span className="text-[10px] font-mono font-semibold text-slate-400 dark:text-zinc-500">
                                        Slide to view all ({realAmenities.length}) →
                                    </span>
                                )}
                            </div>

                            <div className="overflow-x-auto custom-scrollbar pb-1 flex items-center gap-3 w-full">
                                {realAmenities.map((item: { icon: any; label: string; status: string }, idx: number) => {
                                    const Icon = item.icon || Sparkles;
                                    return (
                                        <div 
                                            key={idx} 
                                            className="h-[58px] p-3 rounded-xl border border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/30 flex items-center gap-2.5 shrink-0 min-w-[140px] sm:min-w-[calc((100%-36px)/4)] w-[calc((100%-36px)/4)]"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100 truncate">{item.label}</p>
                                                <p className="text-xs text-teal-600 dark:text-teal-400 font-semibold">{item.status}</p>
                                            </div>
                                        </div>
                                    );
                                })}

                                {Array.from({ length: emptySlotsCount }).map((_, idx) => (
                                    <div 
                                        key={`empty-${idx}`} 
                                        className="h-[58px] p-3 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800/80 bg-slate-50/20 dark:bg-zinc-900/10 flex items-center gap-2.5 shrink-0 min-w-[140px] sm:min-w-[calc((100%-36px)/4)] w-[calc((100%-36px)/4)] opacity-60"
                                    >
                                        <div className="w-8 h-8 rounded-lg border border-dashed border-slate-300 dark:border-zinc-700/60 flex items-center justify-center shrink-0 text-slate-400 dark:text-zinc-500 text-xs font-mono">
                                            —
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs sm:text-sm font-medium text-slate-400 dark:text-zinc-500 italic truncate">Empty Slot</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Maintenance History Log */}
                        <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 shadow-xs flex-1 flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <div>
                                        <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                            <Wrench className="w-4.5 h-4.5 text-slate-500" />
                                            <span>Suite Maintenance History</span>
                                        </h2>
                                    </div>
                                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                                        {maintenance_history.length} Logged
                                    </span>
                                </div>

                                {maintenance_history.length > 0 ? (
                                    <div className="h-[382px] overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-2.5">
                                        {maintenance_history.map((reqItem: any, idx: number) => (
                                            <div 
                                                key={idx}
                                                onClick={() => setSelectedMaintenance(reqItem)}
                                                className="h-[68px] px-3.5 py-2.5 rounded-xl border border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/30 hover:border-teal-500/50 transition-all cursor-pointer flex items-center justify-between gap-3 group shrink-0"
                                            >
                                                <div className="min-w-0 pr-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                                            reqItem.status === 'Resolved' ? 'bg-emerald-500' :
                                                            reqItem.status === 'In Progress' ? 'bg-indigo-500' : 'bg-amber-500'
                                                        }`}></span>
                                                        <span className="font-mono text-xs font-bold text-teal-600 dark:text-teal-400 shrink-0">
                                                            {formatRequestNumber(reqItem.id, reqItem.request_number)}
                                                        </span>
                                                        <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate group-hover:text-teal-500 transition-colors">{reqItem.title}</p>
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono mt-0.5 truncate">
                                                        {reqItem.category || 'General'} · Submitted {new Date(reqItem.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <span className={`text-xs font-bold uppercase shrink-0 ${
                                                    reqItem.status === 'Resolved' ? 'text-emerald-600 dark:text-emerald-400' :
                                                    reqItem.status === 'In Progress' ? 'text-indigo-600 dark:text-indigo-400' :
                                                    'text-amber-600 dark:text-amber-400'
                                                }`}>
                                                    {reqItem.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-[382px] p-6 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 text-center flex flex-col items-center justify-center">
                                        <CheckCircle2 className="w-9 h-9 text-emerald-500 mx-auto mb-2 opacity-80" />
                                        <p className="text-sm font-bold text-slate-700 dark:text-zinc-300">All Systems Functional</p>
                                        <p className="text-xs text-slate-500 mt-1">Zero outstanding repair requests logged for your room.</p>
                                    </div>
                                )}
                            </div>

                            <div className="pt-2.5 border-t border-slate-100 dark:border-zinc-800/80 mt-3 flex items-center justify-between text-xs text-slate-400">
                                <span>Recent maintenance activity</span>
                                <span className="font-mono text-teal-600 dark:text-teal-400 font-semibold">Active Monitoring</span>
                            </div>
                        </div>

                    </div>

                    {/* Right: Suite Residents Directory */}
                    <div className="lg:col-span-1 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                                <div>
                                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                        <Users className="w-4.5 h-4.5 text-indigo-500" />
                                        <span>Suite Residents</span>
                                    </h2>
                                    <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">Co-occupants in Room {room.room_number}</p>
                                </div>
                                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                                    {actualRoommates.length} Member{actualRoommates.length !== 1 ? 's' : ''}
                                </span>
                            </div>

                            {actualRoommates.length > 0 ? (
                                <div className="h-[382px] overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-2.5 my-3">
                                    {actualRoommates.map((mate: any, i: number) => (
                                        <div key={i} className="h-[68px] px-3.5 py-2.5 rounded-xl border border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/40 flex items-center gap-3.5 shrink-0">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                                                mate.is_me 
                                                    ? 'bg-teal-600 text-white shadow-xs' 
                                                    : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                                            }`}>
                                                {mate.name?.charAt(0) || 'R'}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">{mate.name}</p>
                                                    {mate.is_me && (
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-teal-50 dark:bg-teal-500/10 text-teal-600 border border-teal-200/50 dark:border-teal-500/20">
                                                            You
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono mt-0.5 truncate">
                                                    Moved in: {mate.date_moved_in ? new Date(mate.date_moved_in).toLocaleDateString() : 'Active Resident'}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-[382px] p-8 text-center text-slate-400 flex flex-col items-center justify-center my-3 border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl">
                                    <Users className="w-9 h-9 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm font-semibold">No co-occupants</p>
                                    <p className="text-xs text-slate-500 mt-1">You currently have this room to yourself.</p>
                                </div>
                            )}
                        </div>

                        {/* Room Capacity & Inventory Status Footer */}
                        <div className="space-y-2.5 pt-1">
                            <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-zinc-900/40 border border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-xs sm:text-sm">
                                <span className="text-slate-500 dark:text-zinc-400 font-medium">Occupancy Roster</span>
                                <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">
                                    {actualRoommates.length} / {room.capacity || 2} Beds Occupied
                                </span>
                            </div>

                            <div className="pt-2.5 border-t border-slate-100 dark:border-zinc-800 text-xs sm:text-sm text-slate-400 font-mono flex items-center justify-between">
                                <span>Bedspace Inventory</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Good Standing</span>
                            </div>
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
                                            <Wrench className="w-4.5 h-4.5 text-teal-600" />
                                            <span>Request #{formatRequestNumber(selectedMaintenance.id, selectedMaintenance.request_number)} Details</span>
                                        </h2>
                                        <button onClick={() => setSelectedMaintenance(null)} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="p-5 overflow-y-auto custom-scrollbar space-y-4">
                                        <div>
                                            <div className="flex items-center justify-between gap-2">
                                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedMaintenance.title}</h3>
                                                <span className={`text-xs font-bold uppercase ${
                                                    selectedMaintenance.status === 'Resolved' ? 'text-emerald-600 dark:text-emerald-400' :
                                                    selectedMaintenance.status === 'In Progress' ? 'text-indigo-600 dark:text-indigo-400' :
                                                    'text-amber-600 dark:text-amber-400'
                                                }`}>
                                                    {selectedMaintenance.status}
                                                </span>
                                            </div>
                                            <p className="text-xs sm:text-sm text-slate-500 mt-1">
                                                Submitted on {new Date(selectedMaintenance.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/50 border border-slate-100 dark:border-zinc-800/80 text-sm text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                            {selectedMaintenance.description || 'No description provided.'}
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
                            <DoorOpen className="w-6 h-6 text-teal-600 shrink-0" />
                            <span>Available Rooms & Bedspaces</span>
                        </h1>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-500/20">
                            <span>{rooms.length} Units Listed</span>
                        </span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
                        Browse vacant rooms and confirm your residence suite to activate your tenancy.
                    </p>
                </div>
            </div>

            {/* Filter & Search Strip */}
            <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-1.5 overflow-x-auto text-xs sm:text-sm">
                    {uniqueTypes.map(t => (
                        <button
                            key={t}
                            onClick={() => setTypeFilter(t)}
                            className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                                typeFilter === t
                                    ? 'bg-teal-600 text-white font-bold shadow-xs'
                                    : 'bg-slate-100 dark:bg-zinc-800/60 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
                            }`}
                        >
                            {t}
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
                        className="w-full py-2 pl-9 pr-3 text-sm rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-teal-500"
                    />
                </div>
            </div>

            {/* 3. Rooms Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 flex-1">
                {filteredRooms.length > 0 ? (
                    filteredRooms.map((room: any) => {
                        const isFull = (room.available_slots || 0) <= 0 || room.status === 'Maintenance';

                        return (
                            <div 
                                key={room.id}
                                className={`rounded-xl bg-card border border-slate-200 dark:border-zinc-800 p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-teal-500 transition-all ${
                                    isFull ? 'opacity-60' : ''
                                }`}
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white">Room {room.room_number}</h3>
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">{room.type}</p>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold uppercase ${
                                            isFull ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10' :
                                            'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10'
                                        }`}>
                                            {isFull ? 'Unavailable' : `${room.available_slots || (room.capacity - room.current_occupants)} Bed(s) Free`}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 my-3.5 py-3 border-y border-slate-100 dark:border-zinc-800/80 text-xs sm:text-sm">
                                        <div>
                                            <span className="text-xs text-slate-400 font-semibold block">Monthly Rent</span>
                                            <span className="font-extrabold font-mono text-emerald-600 dark:text-emerald-400 text-base">₱{Number(room.price).toLocaleString()}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-400 font-semibold block">Capacity</span>
                                            <span className="font-extrabold font-mono text-slate-700 dark:text-zinc-300 text-sm sm:text-base">{room.current_occupants} / {room.capacity} Beds</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    disabled={isFull}
                                    onClick={() => setSelectedRoom(room)}
                                    className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                                        isFull
                                            ? 'bg-slate-100 dark:bg-zinc-800 text-slate-400 cursor-not-allowed'
                                            : 'bg-teal-600 hover:bg-teal-700 text-white shadow-xs'
                                    }`}
                                >
                                    <span>{isFull ? 'Suite Full' : 'Select Suite'}</span>
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
                                        <Building2 className="w-4.5 h-4.5 text-teal-600" />
                                        <span>Confirm Room Assignment</span>
                                    </h2>
                                    <button onClick={() => !isSubmitting && setSelectedRoom(null)} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500">
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
                                        You are about to select <strong className="text-slate-900 dark:text-white">Room {selectedRoom.room_number}</strong>. You will be assigned to this suite and your resident profile will be activated.
                                    </p>
                                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/50 border border-slate-100 dark:border-zinc-800 space-y-2 text-xs sm:text-sm">
                                        <div className="flex justify-between"><span className="text-slate-400 font-semibold">Classification:</span><span className="font-bold">{selectedRoom.type}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-400 font-semibold">Monthly Rate:</span><span className="font-bold font-mono text-emerald-600">₱{Number(selectedRoom.price).toLocaleString()} / mo</span></div>
                                        <div className="flex justify-between"><span className="text-slate-400 font-semibold">Suite Capacity:</span><span className="font-bold font-mono">{selectedRoom.capacity} Beds</span></div>
                                    </div>
                                    <button
                                        onClick={handleChooseRoom}
                                        disabled={isSubmitting}
                                        className="w-full py-3 rounded-lg text-sm font-bold bg-teal-600 hover:bg-teal-700 text-white transition-all shadow-xs disabled:opacity-50"
                                    >
                                        {isSubmitting ? 'Confirming Suite...' : 'Confirm Suite Assignment'}
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
