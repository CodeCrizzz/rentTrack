"use client";

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { 
    Bell, Megaphone, Info, AlertTriangle, CheckCircle2, 
    Calendar, User, Search, RefreshCw, X, ShieldAlert,
    Clock, Sparkles, Pin, ArrowUpRight
} from 'lucide-react';
import { toast } from 'sonner';

interface Announcement {
    id: number;
    title: string;
    content: string;
    type: string;
    created_at: string;
    created_by_name: string;
}

export default function TenantAnnouncements() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

    const fetchAnnouncements = async (showToast = false) => {
        if (showToast) setIsRefreshing(true);
        try {
            const { data } = await api.get('/tenant/announcements');
            setAnnouncements(data || []);
            if (showToast) toast.success("Announcements synchronized");
        } catch (error) {
            console.error("Failed to fetch announcements:", error);
            if (showToast) toast.error("Failed to sync announcements");
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const getTypeDetails = (type: string) => {
        const t = (type || '').toLowerCase();
        if (t.includes('alert') || t.includes('urgent') || t.includes('emerg')) {
            return { 
                icon: AlertTriangle, 
                color: 'text-rose-600 dark:text-rose-400', 
                bg: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200/60 dark:border-rose-500/20',
                label: 'Urgent / Alert' 
            };
        }
        if (t.includes('event') || t.includes('social') || t.includes('comm')) {
            return { 
                icon: Megaphone, 
                color: 'text-indigo-600 dark:text-indigo-400', 
                bg: 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200/60 dark:border-indigo-500/20',
                label: 'Community Event' 
            };
        }
        if (t.includes('success') || t.includes('resolv')) {
            return { 
                icon: CheckCircle2, 
                color: 'text-emerald-600 dark:text-emerald-400', 
                bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/60 dark:border-emerald-500/20',
                label: 'Advisory Update' 
            };
        }
        return { 
            icon: Info, 
            color: 'text-teal-600 dark:text-teal-400', 
            bg: 'bg-teal-50 dark:bg-teal-500/10 border-teal-200/60 dark:border-teal-500/20',
            label: 'General Notice' 
        };
    };

    const categories = ["All", "Urgent", "Event", "General"];

    const filteredAnnouncements = useMemo(() => {
        return announcements.filter(ann => {
            const q = searchQuery.toLowerCase().trim();
            const matchesQuery = !q || (
                ann.title?.toLowerCase().includes(q) ||
                ann.content?.toLowerCase().includes(q)
            );
            
            let matchesCategory = true;
            if (selectedCategory === "Urgent") {
                matchesCategory = (ann.type || '').toLowerCase().includes('alert') || (ann.type || '').toLowerCase().includes('urgent');
            } else if (selectedCategory === "Event") {
                matchesCategory = (ann.type || '').toLowerCase().includes('event');
            } else if (selectedCategory === "General") {
                matchesCategory = !(ann.type || '').toLowerCase().includes('alert') && !(ann.type || '').toLowerCase().includes('event');
            }

            return matchesQuery && matchesCategory;
        });
    }, [announcements, searchQuery, selectedCategory]);

    const urgentCount = announcements.filter(a => (a.type || '').toLowerCase().includes('alert') || (a.type || '').toLowerCase().includes('urgent')).length;
    const eventCount = announcements.filter(a => (a.type || '').toLowerCase().includes('event')).length;

    // ==========================================
    // 1:1 SKELETON LOADER
    // ==========================================
    if (isLoading) {
        return (
            <div className="w-full space-y-4 font-sans text-slate-900 dark:text-zinc-100 animate-pulse">
                {/* 1. Header Toolbar Skeleton */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-zinc-800/80">
                    <div>
                        <div className="h-7 w-64 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                        <div className="h-3.5 w-80 bg-slate-200 dark:bg-zinc-800 rounded-md mt-2"></div>
                    </div>
                    <div className="h-8 w-24 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                </div>

                {/* 2. Telemetry Ribbon (4 Tiles) Skeleton */}
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

                {/* 3. Filter Strip Skeleton */}
                <div className="h-11 w-full bg-card border border-slate-200 dark:border-zinc-800 rounded-xl"></div>

                {/* 4. Bulletin Cards Feed Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="min-h-[240px] rounded-2xl bg-card border border-slate-200 dark:border-zinc-800 p-5 space-y-3">
                            <div className="flex justify-between">
                                <div className="h-6 w-24 bg-slate-200 dark:bg-zinc-800 rounded-md"></div>
                                <div className="h-4 w-16 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                            </div>
                            <div className="h-5 w-3/4 bg-slate-200 dark:bg-zinc-800 rounded-md"></div>
                            <div className="space-y-2 p-3 rounded-xl bg-slate-50/50 dark:bg-zinc-900/40">
                                <div className="h-3 w-full bg-slate-200 dark:bg-zinc-800/60 rounded"></div>
                                <div className="h-3 w-5/6 bg-slate-200 dark:bg-zinc-800/60 rounded"></div>
                                <div className="h-3 w-4/6 bg-slate-200 dark:bg-zinc-800/60 rounded"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ==========================================
    // REAL UI RENDER
    // ==========================================
    return (
        <div className="w-full space-y-4 font-sans text-slate-900 dark:text-zinc-100">
            
            {/* 1. Header Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-zinc-800/80">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                            <Bell className="w-5 h-5 text-teal-600" />
                            <span>Community Notice Board & Bulletins</span>
                        </h1>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-200/60 dark:border-teal-500/20">
                            <span>{announcements.length} Bulletins Posted</span>
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                        Official property announcements, scheduled power/water maintenance, and house rules.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fetchAnnouncements(true)}
                        disabled={isRefreshing}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-800 bg-card hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-teal-600' : 'text-slate-500'}`} />
                        <span>Sync</span>
                    </button>
                </div>
            </div>

            {/* 2. Telemetry Ribbon (4 Tiles) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                
                {/* Tile 1: Total Bulletins */}
                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Notices</span>
                        <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-0.5 leading-tight">
                            {announcements.length}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500 mt-0.5">Community bulletin active</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
                        <Bell className="w-5 h-5" />
                    </div>
                </div>

                {/* Tile 2: Urgent Alerts */}
                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Urgent Alerts</span>
                        <div className={`text-xl font-black font-mono mt-0.5 leading-tight ${
                            urgentCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                            {urgentCount}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500 mt-0.5">
                            {urgentCount > 0 ? 'Requires attention' : 'No emergency flags'}
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                        <ShieldAlert className="w-5 h-5" />
                    </div>
                </div>

                {/* Tile 3: Community Events */}
                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Facility Events</span>
                        <div className="text-xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-0.5 leading-tight">
                            {eventCount}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500 mt-0.5">Scheduled activities</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                        <Megaphone className="w-5 h-5" />
                    </div>
                </div>

                {/* Tile 4: Notice Authority */}
                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Broadcast Channel</span>
                        <div className="text-sm font-extrabold font-mono text-slate-900 dark:text-white mt-1 leading-tight">
                            Admin Office
                        </div>
                        <div className="text-[10px] font-semibold text-emerald-600 mt-0.5">Verified Communications</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 flex items-center justify-center shrink-0">
                        <Sparkles className="w-5 h-5" />
                    </div>
                </div>

            </div>

            {/* 3. Filter & Search Strip */}
            <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-1 overflow-x-auto text-xs">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                selectedCategory === cat
                                    ? 'bg-teal-600 text-white font-bold shadow-xs'
                                    : 'bg-slate-100 dark:bg-zinc-800/60 text-slate-600 dark:text-zinc-400 hover:bg-slate-200'
                            }`}
                        >
                            {cat === 'All' ? 'All Notices' : cat}
                        </button>
                    ))}
                </div>

                <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                        type="text"
                        placeholder="Search bulletins..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full py-1.5 pl-8 pr-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-teal-500"
                    />
                </div>
            </div>

            {/* 4. Bulletins Card Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                {filteredAnnouncements.length > 0 ? (
                    filteredAnnouncements.map((ann, index) => {
                        const details = getTypeDetails(ann.type);
                        const Icon = details.icon;

                        return (
                            <div
                                key={ann.id}
                                onClick={() => setSelectedAnnouncement(ann)}
                                className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs hover:border-teal-500/60 hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group"
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-2 mb-3">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${details.bg} ${details.color}`}>
                                            <Icon className="w-3 h-3" />
                                            <span>{ann.type || 'Notice'}</span>
                                        </span>

                                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                                            {index === 0 && (
                                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-emerald-500 text-white shadow-xs">
                                                    NEW
                                                </span>
                                            )}
                                            <Clock className="w-3 h-3" />
                                            <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                                        {ann.title}
                                    </h3>

                                    {/* Entire Announcement Body Displayed in Full */}
                                    <div className="my-3.5 p-3.5 rounded-xl bg-slate-50/70 dark:bg-zinc-900/40 border border-slate-100 dark:border-zinc-800/60 text-xs sm:text-sm text-slate-700 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap break-words">
                                        {ann.content}
                                    </div>
                                </div>

                                <div className="pt-2.5 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                                    <span className="flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        <span>{ann.created_by_name || 'Management'}</span>
                                    </span>
                                    <span className="text-teal-600 dark:text-teal-400 font-bold group-hover:underline flex items-center gap-1">
                                        <span>View Details</span>
                                        <ArrowUpRight className="w-3 h-3" />
                                    </span>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="col-span-full py-16 text-center text-slate-400 bg-card rounded-2xl border border-slate-200 dark:border-zinc-800">
                        <Megaphone className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-xs font-semibold">No announcements match your search</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Check back later for newly broadcast notices</p>
                    </div>
                )}
            </div>

            {/* Modal: Full Bulletin View */}
            <AnimatePresence>
                {selectedAnnouncement && (
                    <>
                        <div 
                            className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs z-50"
                            onClick={() => setSelectedAnnouncement(null)}
                        />
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                            <div className="w-full max-w-lg bg-card rounded-2xl shadow-xl border border-slate-200 dark:border-zinc-800 overflow-hidden pointer-events-auto flex flex-col max-h-[85vh]">
                                <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-900/40">
                                    <div className="flex items-center gap-2">
                                        <Bell className="w-4 h-4 text-teal-600" />
                                        <span className="text-xs font-extrabold uppercase text-slate-500">Official Bulletin</span>
                                    </div>
                                    <button onClick={() => setSelectedAnnouncement(null)} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="p-5 overflow-y-auto custom-scrollbar space-y-4">
                                    <div>
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                                            {selectedAnnouncement.type}
                                        </span>
                                        <h2 className="text-lg font-black text-slate-900 dark:text-white mt-2 leading-tight">
                                            {selectedAnnouncement.title}
                                        </h2>
                                        <div className="flex items-center gap-3 text-xs text-slate-400 font-mono mt-1.5">
                                            <span>Issued by {selectedAnnouncement.created_by_name || 'Management'}</span>
                                            <span>·</span>
                                            <span>{new Date(selectedAnnouncement.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900/50 border border-slate-100 dark:border-zinc-800/80 text-xs sm:text-sm text-slate-700 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                                        {selectedAnnouncement.content}
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
