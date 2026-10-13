"use client";

import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { toast } from 'sonner';
import CustomSelect from '@/components/CustomSelect';
import { 
    Megaphone, Bell, AlertTriangle, CheckCircle2, 
    Info, Plus, Trash2, Search, Calendar, User, 
    Clock, RefreshCw, X, Check, ShieldAlert, Sparkles,
    Pin
} from 'lucide-react';

interface Announcement {
    id: number;
    title: string;
    content: string;
    type: string;
    created_at: string;
    created_by_name?: string;
}

const cardVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } }
};

export default function AdminAnnouncements() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<'All' | 'Alert' | 'Event' | 'Info' | 'Success'>('All');

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        type: 'Info'
    });

    const fetchAnnouncements = async (silent = false) => {
        if (!silent) setIsLoading(true);
        else setIsRefreshing(true);

        try {
            const { data } = await api.get('/admin/announcements');
            setAnnouncements(data || []);
            if (silent) toast.success("Announcements synchronized");
        } catch (error) {
            console.error("Failed to fetch announcements:", error);
            if (silent) toast.error("Failed to load announcements");
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.content.trim()) return;

        setIsSubmitting(true);
        try {
            const { data } = await api.post('/admin/announcements', formData);
            setAnnouncements(prev => [data.announcement || data, ...prev]);
            toast.success("Notice broadcasted to all residents");
            setShowCreateModal(false);
            setFormData({ title: '', content: '', type: 'Info' });
        } catch (error) {
            console.error("Failed to create announcement:", error);
            toast.error("Failed to broadcast announcement");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await api.delete(`/admin/announcements/${id}`);
            toast.success("Notice removed from bulletin board");
            setAnnouncements(prev => prev.filter(a => a.id !== id));
            setDeletingId(null);
        } catch (error) {
            console.error("Failed to delete announcement:", error);
            toast.error("Failed to delete announcement");
        }
    };

    // Metrics
    const metrics = useMemo(() => {
        const total = announcements.length;
        const alerts = announcements.filter(a => a.type === 'Alert').length;
        const events = announcements.filter(a => a.type === 'Event').length;
        const general = announcements.filter(a => a.type === 'Info' || a.type === 'Success').length;
        return { total, alerts, events, general };
    }, [announcements]);

    // Filtered
    const filteredAnnouncements = useMemo(() => {
        return announcements.filter(a => {
            if (typeFilter !== 'All' && a.type !== typeFilter) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchTitle = a.title.toLowerCase().includes(q);
                const matchContent = a.content.toLowerCase().includes(q);
                if (!matchTitle && !matchContent) return false;
            }
            return true;
        });
    }, [announcements, typeFilter, searchQuery]);

    const getTypeMeta = (type: string) => {
        switch (type) {
            case 'Alert':
                return {
                    label: 'Emergency Alert',
                    badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200/50 dark:border-rose-500/20',
                    dot: 'bg-rose-500 animate-ping',
                    icon: AlertTriangle
                };
            case 'Event':
                return {
                    label: 'Community Event',
                    badgeClass: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-500/20',
                    dot: 'bg-indigo-500',
                    icon: Megaphone
                };
            case 'Success':
                return {
                    label: 'Advisory / Update',
                    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20',
                    dot: 'bg-emerald-500',
                    icon: CheckCircle2
                };
            default:
                return {
                    label: 'General Notice',
                    badgeClass: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400 border border-sky-200/50 dark:border-sky-500/20',
                    dot: 'bg-sky-500',
                    icon: Info
                };
        }
    };

    if (isLoading) {
        return (
            <div className="w-full h-[calc(100vh-6.2rem)] md:h-[calc(100vh-7.2rem)] lg:h-[calc(100dvh-7.2rem)] flex flex-col font-sans text-slate-900 dark:text-zinc-100 overflow-hidden space-y-2.5 animate-pulse">
                {/* 1. Header Toolbar */}
                <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="h-6 w-64 bg-slate-200 dark:bg-zinc-800 rounded-md"></div>
                            <div className="h-5 w-20 bg-slate-200 dark:bg-zinc-800 rounded-full"></div>
                        </div>
                        <div className="h-3.5 w-80 bg-slate-200 dark:bg-zinc-800 rounded-md mt-1.5"></div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="h-8 w-20 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                        <div className="h-8 w-32 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                    </div>
                </div>

                {/* 2. Executive Metric Ribbon */}
                <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3 shadow-xs flex items-center justify-between">
                            <div className="space-y-1.5 flex-1">
                                <div className="h-2.5 w-24 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                                <div className="h-6 w-20 bg-slate-200 dark:bg-zinc-800 rounded-md"></div>
                                <div className="h-2.5 w-24 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 shrink-0"></div>
                        </div>
                    ))}
                </div>

                {/* 3. Category Pills & Search Strip */}
                <div className="shrink-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-2 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-1 overflow-x-auto">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-7 w-28 bg-slate-100 dark:bg-zinc-800 rounded-md"></div>
                        ))}
                    </div>
                    <div className="h-7 w-48 bg-slate-100 dark:bg-zinc-800 rounded-lg"></div>
                </div>

                {/* 4. Bulletin Board Feed */}
                <div className="flex-1 min-h-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs p-3">
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="p-4 rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="h-5 w-28 bg-slate-200 dark:bg-zinc-800 rounded-full"></div>
                                        <div className="h-4 w-24 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="h-4 w-24 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                                        <div className="h-7 w-7 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                                    </div>
                                </div>
                                <div className="h-5 w-2/3 bg-slate-200 dark:bg-zinc-800 rounded-md"></div>
                                <div className="space-y-1.5">
                                    <div className="h-3.5 w-full bg-slate-100 dark:bg-zinc-800/60 rounded"></div>
                                    <div className="h-3.5 w-4/5 bg-slate-100 dark:bg-zinc-800/60 rounded"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-[calc(100vh-6.2rem)] md:h-[calc(100vh-7.2rem)] lg:h-[calc(100dvh-7.2rem)] flex flex-col font-sans text-slate-900 dark:text-zinc-100 overflow-hidden space-y-2.5">
            
            {/* 1. Header Toolbar */}
            <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                            Community Bulletin & Announcements
                        </h1>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">
                            {filteredAnnouncements.length} active
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                        Broadcast urgent notices, maintenance advisories, and house policy announcements.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fetchAnnouncements(true)}
                        disabled={isRefreshing}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-800 bg-card hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-teal-600' : ''}`} />
                        <span>Sync</span>
                    </button>

                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-all flex items-center gap-1.5 shadow-xs"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Broadcast Notice</span>
                    </button>
                </div>
            </div>

            {/* 2. Executive Metric Ribbon */}
            <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                
                <motion.div variants={cardVariants} initial="hidden" animate="show" className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Bulletins</span>
                        <div className="text-xl font-extrabold font-mono text-slate-900 dark:text-white mt-0.5">
                            {metrics.total} notices
                        </div>
                        <div className="text-[11px] font-semibold text-slate-500 mt-0.5">Public board active</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
                        <Bell className="w-5 h-5" />
                    </div>
                </motion.div>

                <motion.div variants={cardVariants} initial="hidden" animate="show" onClick={() => setTypeFilter('Alert')} className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3 shadow-xs flex items-center justify-between cursor-pointer hover:border-rose-400 transition-colors">
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Urgent Alerts</span>
                            {metrics.alerts > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>}
                        </div>
                        <div className="text-xl font-extrabold font-mono text-rose-600 mt-0.5">
                            {metrics.alerts} high priority
                        </div>
                        <div className="text-[11px] font-semibold text-rose-600 mt-0.5">Emergency broadcasts</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                </motion.div>

                <motion.div variants={cardVariants} initial="hidden" animate="show" onClick={() => setTypeFilter('Event')} className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3 shadow-xs flex items-center justify-between cursor-pointer hover:border-indigo-400 transition-colors">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Community Events</span>
                        <div className="text-xl font-extrabold font-mono text-indigo-600 mt-0.5">
                            {metrics.events} scheduled
                        </div>
                        <div className="text-[11px] font-semibold text-indigo-600 mt-0.5">House meetings & events</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                        <Megaphone className="w-5 h-5" />
                    </div>
                </motion.div>

                <motion.div variants={cardVariants} initial="hidden" animate="show" onClick={() => setTypeFilter('Info')} className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3 shadow-xs flex items-center justify-between cursor-pointer hover:border-sky-400 transition-colors">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">General Notices</span>
                        <div className="text-xl font-extrabold font-mono text-sky-600 mt-0.5">
                            {metrics.general} advisories
                        </div>
                        <div className="text-[11px] font-semibold text-sky-600 mt-0.5">Utilities & house rules</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
                        <Info className="w-5 h-5" />
                    </div>
                </motion.div>

            </div>

            {/* 3. Triage Category Tabs & Search Bar */}
            <div className="shrink-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-2 shadow-xs flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1 overflow-x-auto text-xs">
                    {[
                        { key: 'All', label: 'All Notices', count: metrics.total },
                        { key: 'Alert', label: 'Urgent Alerts', count: metrics.alerts, alert: metrics.alerts > 0 },
                        { key: 'Event', label: 'Events', count: metrics.events },
                        { key: 'Info', label: 'General Info', count: metrics.general }
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setTypeFilter(tab.key as any)}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                typeFilter === tab.key
                                    ? 'bg-teal-600 text-white font-bold shadow-xs'
                                    : 'bg-slate-100 dark:bg-zinc-800/60 text-slate-600 dark:text-zinc-400 hover:bg-slate-200'
                            }`}
                        >
                            <span>{tab.label}</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                                typeFilter === tab.key ? 'bg-white/20 text-white' : tab.alert ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300'
                            }`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="relative min-w-[200px] max-w-xs">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search notice titles or body..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full py-1.5 pl-8 pr-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                </div>
            </div>

            {/* 4. Bulletin Board Feed (Locked 1-page with inner scrollbar) */}
            <div className="flex-1 min-h-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs flex flex-col">
                <div className="overflow-y-auto flex-1 p-3.5 custom-scrollbar space-y-3">
                    {filteredAnnouncements.length === 0 ? (
                        <div className="py-16 text-center text-slate-400 text-xs">
                            <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-30 text-teal-600" />
                            <p className="font-semibold text-sm text-slate-700 dark:text-zinc-300">No announcements found.</p>
                            <p className="mt-0.5">Click "Broadcast Notice" to publish an announcement.</p>
                        </div>
                    ) : (
                        filteredAnnouncements.map(announcement => {
                            const meta = getTypeMeta(announcement.type);
                            const IconComponent = meta.icon;

                            return (
                                <div
                                    key={announcement.id}
                                    className="bg-slate-50/60 dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800 rounded-xl p-4 transition-all hover:border-slate-300 dark:hover:border-zinc-700 space-y-2.5"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center shrink-0">
                                                <IconComponent className="w-4 h-4 text-teal-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white leading-snug">
                                                    {announcement.title}
                                                </h3>
                                                <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                                                    <span>{new Date(announcement.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                    <span>·</span>
                                                    <span>Published by Management</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${meta.badgeClass}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`}></span>
                                                {meta.label}
                                            </span>
                                            <button
                                                onClick={() => setDeletingId(announcement.id)}
                                                className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                                                title="Delete Announcement"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed pl-10.5 whitespace-pre-wrap">
                                        {announcement.content}
                                    </p>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ============================================================== */}
            {/* 5. MODALS */}
            {/* ============================================================== */}
            <AnimatePresence>

                {/* BROADCAST NOTICE MODAL */}
                {showCreateModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3">
                        <motion.div initial={{ scale: 0.96, y: 8, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
                            
                            <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-slate-50/80 dark:bg-zinc-900/60">
                                <div>
                                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Broadcast Community Notice</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">Post an advisory to the tenant portal bulletin.</p>
                                </div>
                                <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg text-slate-500 hover:bg-slate-200">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleCreate} className="p-5 space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Notice Category</label>
                                    <CustomSelect
                                        value={formData.type}
                                        onChange={(val) => setFormData({ ...formData, type: val })}
                                        options={[
                                            { value: 'Info', label: 'General Notice' },
                                            { value: 'Alert', label: 'Emergency Alert' },
                                            { value: 'Event', label: 'Community Event' },
                                            { value: 'Success', label: 'Policy / Maintenance Advisory' }
                                        ]}
                                        className="py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 font-semibold"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Notice Headline / Title</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. Scheduled Water Interruption on Thursday 2PM - 5PM"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Notice Body & Details</label>
                                    <textarea
                                        required
                                        rows={4}
                                        placeholder="Write clear instructions for residents..."
                                        value={formData.content}
                                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                        className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-4 py-2 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5 shadow-xs"
                                    >
                                        {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Megaphone className="w-3.5 h-3.5" />}
                                        <span>Publish Notice</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}

                {/* DELETE CONFIRM MODAL */}
                {deletingId && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3">
                        <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-3">
                            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Delete Notice</h3>
                            <p className="text-xs text-slate-500">
                                Are you sure you want to delete this bulletin notice? Residents will no longer see it on their board.
                            </p>
                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                                <button onClick={() => setDeletingId(null)} className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100">
                                    Cancel
                                </button>
                                <button onClick={() => handleDelete(deletingId)} className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-rose-600 text-white">
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

            </AnimatePresence>

        </div>
    );
}
