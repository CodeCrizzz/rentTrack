"use client";

import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { toast } from 'sonner';
import CustomSelect from '@/components/CustomSelect';
import { 
    Wrench, AlertTriangle, Calendar, User, 
    CheckCircle2, Clock, Eye, X, 
    RefreshCw, Droplets, Zap, Wind, Hammer, Wifi, 
    HelpCircle, ZoomIn, UserCheck, Paperclip, Check,
    List, LayoutGrid, ShieldAlert, TrendingUp, Phone,
    Send, Building2, Search
} from 'lucide-react';

interface MaintenanceRequest {
    id: number;
    title: string;
    description: string;
    category: string;
    priority: string;
    status: string;
    created_at: string;
    assigned_to: string | null;
    admin_notes: string | null;
    scheduled_date: string | null;
    date_resolved: string | null;
    tenant_name: string;
    room_number: string | null;
    attachment_url: string | null;
}

const cardVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } }
};

export default function AdminMaintenanceRequests() {
    // Data State
    const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // View & Filters
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'In Progress' | 'High Priority' | 'Resolved'>('All');
    const [priorityFilter, setPriorityFilter] = useState('All Priorities');
    const [categoryFilter, setCategoryFilter] = useState('All Categories');

    // Modals
    const [viewingRequest, setViewingRequest] = useState<MaintenanceRequest | null>(null);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);

    // Fetch Data
    const fetchRequests = async (silent = false) => {
        if (!silent) setIsLoading(true);

        try {
            const { data } = await api.get('/admin/requests');
            setRequests(data || []);
        } catch (error) {
            console.error("Failed to load requests", error);
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    // Quick Status Switch (Start -> Resolve)
    const handleQuickStatus = async (reqId: number, nextStatus: string) => {
        try {
            setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: nextStatus } : r));
            if (viewingRequest && viewingRequest.id === reqId) {
                setViewingRequest(prev => prev ? { ...prev, status: nextStatus } : null);
            }
            
            const payload: any = { status: nextStatus };
            if (nextStatus === 'Resolved') payload.date_resolved = new Date().toISOString();

            await api.put(`/admin/requests/${reqId}`, payload);
            toast.success(`Request #${formatRequestNumber(reqId)} marked as ${nextStatus}`);
        } catch (error) {
            console.error("Status update error", error);
            toast.error("Failed to update status");
            fetchRequests();
        }
    };


    // Derived Metrics
    const metrics = useMemo(() => {
        const total = requests.length;
        const pending = requests.filter(r => r.status === 'Pending').length;
        const inProgress = requests.filter(r => r.status === 'In Progress').length;
        const resolved = requests.filter(r => r.status === 'Resolved').length;
        const highPriority = requests.filter(r => r.priority === 'High' && r.status !== 'Resolved').length;
        const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

        return { total, pending, inProgress, resolved, highPriority, resolutionRate };
    }, [requests]);

    // Filtered Requests
    const filteredRequests = useMemo(() => {
        return requests.filter(r => {
            const q = searchQuery.toLowerCase().trim();
            const matchesSearch = !q || (
                r.title.toLowerCase().includes(q) ||
                r.description.toLowerCase().includes(q) ||
                r.tenant_name.toLowerCase().includes(q) ||
                (r.room_number && r.room_number.toLowerCase().includes(q)) ||
                (r.assigned_to && r.assigned_to.toLowerCase().includes(q)) ||
                formatRequestNumber(r.id).toLowerCase().includes(q) ||
                `#req-${r.id}`.includes(q) ||
                r.id.toString() === q
            );

            // Status Filter
            if (statusFilter === 'Pending' && r.status !== 'Pending') return false;
            if (statusFilter === 'In Progress' && r.status !== 'In Progress') return false;
            if (statusFilter === 'Resolved' && r.status !== 'Resolved') return false;
            if (statusFilter === 'High Priority' && (r.priority !== 'High' || r.status === 'Resolved')) return false;

            const matchesPriority = priorityFilter === 'All Priorities' || r.priority === priorityFilter;
            const matchesCategory = categoryFilter === 'All Categories' || 
                r.category.toLowerCase().includes(categoryFilter.toLowerCase());

            return matchesSearch && matchesPriority && matchesCategory;
        });
    }, [requests, searchQuery, statusFilter, priorityFilter, categoryFilter]);

    // Helpers
    const formatRequestNumber = (id: number | string) => {
        if (!id) return '';
        return 'RT' + String(id).padStart(4, '0');
    };

    const getAttachmentUrl = (path: string | null) => {
        if (!path) return null;
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        return `http://${host}:5000${path.startsWith('/') ? path : `/${path}`}`;
    };

    const getCategoryIcon = (category: string) => {
        const cat = (category || '').toLowerCase();
        if (cat.includes('plumb') || cat.includes('water') || cat.includes('leak')) return Droplets;
        if (cat.includes('electr') || cat.includes('power') || cat.includes('light')) return Zap;
        if (cat.includes('air') || cat.includes('hvac') || cat.includes('cool')) return Wind;
        if (cat.includes('carp') || cat.includes('door') || cat.includes('wood')) return Hammer;
        if (cat.includes('wifi') || cat.includes('net') || cat.includes('internet')) return Wifi;
        return Wrench;
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Pending':
                return {
                    label: 'Pending',
                    className: 'text-amber-700 dark:text-amber-500 font-semibold'
                };
            case 'In Progress':
                return {
                    label: 'In Progress',
                    className: 'text-blue-700 dark:text-blue-400 font-semibold'
                };
            case 'Resolved':
                return {
                    label: 'Resolved',
                    className: 'text-emerald-700 dark:text-emerald-400 font-semibold'
                };
            default:
                return {
                    label: status,
                    className: 'text-slate-600 dark:text-zinc-400 font-semibold'
                };
        }
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'High':
                return {
                    label: 'High Priority',
                    className: 'text-rose-700 dark:text-rose-400 font-semibold'
                };
            case 'Low':
                return {
                    label: 'Low',
                    className: 'text-slate-500 dark:text-zinc-400 font-semibold'
                };
            default:
                return {
                    label: 'Normal',
                    className: 'text-slate-600 dark:text-zinc-300 font-semibold'
                };
        }
    };

    if (isLoading) {
        return (
            <div className="w-full h-[calc(100vh-6.2rem)] md:h-[calc(100vh-7.2rem)] lg:h-[calc(100dvh-7.2rem)] flex flex-col font-sans text-slate-900 dark:text-zinc-100 overflow-hidden space-y-2.5 animate-pulse">
                {/*Header Toolbar */}
                <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="h-7 w-60 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                            <div className="h-6 w-28 bg-slate-200 dark:bg-zinc-800 rounded-full"></div>
                        </div>
                        <div className="h-4 w-96 bg-slate-200 dark:bg-zinc-800 rounded mt-1.5"></div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="h-9 w-28 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                        <div className="h-9 w-20 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                    </div>
                </div>

                {/* Executive Metric Ribbon (4 Tiles) */}
                <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 sm:p-3 shadow-xs flex items-center justify-between">
                            <div className="space-y-2 flex-1">
                                <div className="h-3 w-28 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                                <div className="h-8 w-32 bg-slate-200 dark:bg-zinc-800 rounded-md"></div>
                                <div className="h-3 w-28 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                            </div>
                            <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-zinc-800 shrink-0"></div>
                        </div>
                    ))}
                </div>

                {/* Status Tabs & Filters */}
                <div className="shrink-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-2 shadow-xs">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 overflow-x-auto">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-8 w-28 bg-slate-100 dark:bg-zinc-800 rounded-lg"></div>
                            ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="h-8 w-56 bg-slate-100 dark:bg-zinc-800 rounded-lg"></div>
                            <div className="h-8 w-36 bg-slate-100 dark:bg-zinc-800 rounded-lg"></div>
                            <div className="h-8 w-40 bg-slate-100 dark:bg-zinc-800 rounded-lg"></div>
                        </div>
                    </div>
                </div>

                {/* Main Work Orders Ledger */}
                <div className="flex-1 min-h-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs flex flex-col">
                    <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                        <table className="w-full min-w-full text-left text-sm border-collapse">
                            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-zinc-800 shadow-xs">
                                <tr className="h-[44px] text-slate-700 dark:text-zinc-300 uppercase tracking-wider text-sm font-black">
                                    <th className="py-2.5 px-4"><div className="h-4 w-28 bg-slate-200 dark:bg-zinc-700 rounded"></div></th>
                                    <th className="py-2.5 px-4"><div className="h-4 w-36 bg-slate-200 dark:bg-zinc-700 rounded"></div></th>
                                    <th className="py-2.5 px-3 text-center"><div className="h-4 w-20 bg-slate-200 dark:bg-zinc-700 rounded mx-auto"></div></th>
                                    <th className="py-2.5 px-3 text-center"><div className="h-4 w-20 bg-slate-200 dark:bg-zinc-700 rounded mx-auto"></div></th>
                                    <th className="py-2.5 px-4"><div className="h-4 w-32 bg-slate-200 dark:bg-zinc-700 rounded"></div></th>
                                    <th className="py-2.5 px-3.5"><div className="h-4 w-24 bg-slate-200 dark:bg-zinc-700 rounded"></div></th>
                                    <th className="py-2.5 px-3 text-center"><div className="h-4 w-12 bg-slate-200 dark:bg-zinc-700 rounded mx-auto"></div></th>
                                    <th className="py-2.5 px-4 text-right"><div className="h-4 w-24 bg-slate-200 dark:bg-zinc-700 rounded ml-auto"></div></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 font-sans">
                                {[...Array(9)].map((_, i) => (
                                    <tr key={i} className="h-[52px]">
                                        <td className="py-2 px-4">
                                            <div className="flex items-center gap-2">
                                                <div className="h-4 w-16 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                                                <div className="h-4 w-24 bg-slate-100 dark:bg-zinc-800/60 rounded"></div>
                                            </div>
                                        </td>
                                        <td className="py-2 px-4">
                                            <div className="space-y-1">
                                                <div className="h-4 w-44 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                                                <div className="h-3.5 w-28 bg-slate-100 dark:bg-zinc-800/60 rounded"></div>
                                            </div>
                                        </td>
                                        <td className="py-2 px-3 text-center"><div className="h-6 w-20 bg-slate-100 dark:bg-zinc-800 rounded-full mx-auto"></div></td>
                                        <td className="py-2 px-3 text-center"><div className="h-6 w-24 bg-slate-100 dark:bg-zinc-800 rounded-full mx-auto"></div></td>
                                        <td className="py-2 px-4"><div className="h-4 w-32 bg-slate-100 dark:bg-zinc-800 rounded"></div></td>
                                        <td className="py-2 px-3.5"><div className="h-4 w-24 bg-slate-100 dark:bg-zinc-800 rounded"></div></td>
                                        <td className="py-2 px-3 text-center"><div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 mx-auto"></div></td>
                                        <td className="py-2 px-4 text-right"><div className="h-7 w-24 bg-slate-100 dark:bg-zinc-800 rounded-lg ml-auto"></div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-[calc(100vh-6.2rem)] md:h-[calc(100vh-7.2rem)] lg:h-[calc(100dvh-7.2rem)] flex flex-col font-sans text-slate-900 dark:text-zinc-100 overflow-hidden space-y-2.5">
            
            {/* Header Toolbar */}
            <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            Maintenance Requests
                        </h1>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-300 dark:border-zinc-700">
                            {filteredRequests.length} of {requests.length} requests
                        </span>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-zinc-400 mt-0.5">
                        Maintenance request tracking and resolution timeline auditing.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* View Switcher */}
                    <div className="flex items-center bg-slate-100 dark:bg-zinc-800/80 p-0.5 rounded-lg border border-slate-300 dark:border-zinc-700 text-xs sm:text-sm font-semibold">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${viewMode === 'table' ? 'bg-white dark:bg-zinc-900 text-slate-950 dark:text-white shadow-xs font-extrabold' : 'text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-white font-semibold'}`}
                            title="Table list view"
                        >
                            <List className="w-3.5 h-3.5" />
                            <span>List View</span>
                        </button>
                        <button
                            onClick={() => setViewMode('cards')}
                            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${viewMode === 'cards' ? 'bg-white dark:bg-zinc-900 text-slate-950 dark:text-white shadow-xs font-extrabold' : 'text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-white font-semibold'}`}
                            title="Work order cards"
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            <span>Cards</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Executive Metric Ribbon (4 High-Density KPI Tiles) */}
            <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                
                {/* Metric 1: Total Requests */}
                <motion.div variants={cardVariants} initial="hidden" animate="show" className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 sm:p-3 shadow-xs flex items-center justify-between select-none">
                    <div>
                        <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-zinc-300">Total Requests</span>
                        <div className="text-2xl sm:text-3xl lg:text-4xl font-black font-mono text-slate-950 dark:text-white mt-0.5 flex items-baseline gap-2">
                            {metrics.total} <span className="text-sm sm:text-base font-sans font-extrabold text-slate-700 dark:text-zinc-300">Requests</span>
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-zinc-300 mt-0.5">
                            <span className="font-extrabold text-slate-950 dark:text-white">{metrics.pending + metrics.inProgress}</span> currently active
                        </p>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white flex items-center justify-center shrink-0 border border-slate-300 dark:border-zinc-700">
                        <Wrench className="w-5 h-5" />
                    </div>
                </motion.div>

                {/* Metric 2: Needs Review (Pending) */}
                <motion.div 
                    variants={cardVariants} 
                    initial="hidden" 
                    animate="show" 
                    className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 sm:p-3 shadow-xs flex items-center justify-between select-none"
                >
                    <div>
                        <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-zinc-300">Needs Review</span>
                        <div className="text-2xl sm:text-3xl lg:text-4xl font-black font-mono mt-0.5 flex items-baseline gap-2">
                            <span className={metrics.pending > 0 ? "text-amber-700 dark:text-amber-400" : "text-slate-950 dark:text-white"}>{metrics.pending}</span> <span className="text-sm sm:text-base font-sans font-extrabold text-amber-700 dark:text-amber-400">Pending</span>
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-zinc-300 mt-0.5">
                            {metrics.pending > 0 ? 'Awaiting review and action' : 'All requests processed'}
                        </p>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-300/60 dark:border-amber-500/30">
                        <Clock className="w-5 h-5" />
                    </div>
                </motion.div>

                {/* Metric 3: In Progress */}
                <motion.div 
                    variants={cardVariants} 
                    initial="hidden" 
                    animate="show" 
                    className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 sm:p-3 shadow-xs flex items-center justify-between select-none"
                >
                    <div>
                        <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-zinc-300">In Progress</span>
                        <div className="text-2xl sm:text-3xl lg:text-4xl font-black font-mono mt-0.5 flex items-baseline gap-2">
                            <span className={metrics.inProgress > 0 ? "text-blue-700 dark:text-blue-400" : "text-slate-950 dark:text-white"}>{metrics.inProgress}</span> <span className="text-sm sm:text-base font-sans font-extrabold text-blue-700 dark:text-blue-400">In Progress</span>
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-zinc-300 mt-0.5">
                            {metrics.inProgress > 0 ? 'Repairs currently ongoing' : 'Zero ongoing repairs'}
                        </p>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-300/60 dark:border-blue-500/30">
                        <UserCheck className="w-5 h-5" />
                    </div>
                </motion.div>

                {/* Metric 4: Resolution Rate */}
                <motion.div 
                    variants={cardVariants} 
                    initial="hidden" 
                    animate="show" 
                    className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 sm:p-3 shadow-xs flex items-center justify-between select-none"
                >
                    <div>
                        <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-zinc-300">Resolution Rate</span>
                        <div className="text-2xl sm:text-3xl lg:text-4xl font-black font-mono text-slate-950 dark:text-white mt-0.5 flex items-baseline gap-2">
                            {metrics.resolutionRate}% <span className="text-sm sm:text-base font-sans font-extrabold text-emerald-700 dark:text-emerald-400">Resolved</span>
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-zinc-300 mt-0.5 flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                            <span><span className="font-extrabold text-slate-950 dark:text-white">{metrics.resolved}</span> of <span className="font-bold text-slate-900 dark:text-zinc-100">{metrics.total}</span> requests closed</span>
                        </p>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-300/60 dark:border-emerald-500/30">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                </motion.div>

            </div>

            {/* Status Filter Tabs & Toolbar */}
            <div className="shrink-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-2 shadow-xs space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    
                    {/* Status Filter Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
                        {[
                            { key: 'All', label: 'All Requests', count: metrics.total },
                            { key: 'Pending', label: 'Pending Review', count: metrics.pending, alert: metrics.pending > 0 },
                            { key: 'In Progress', label: 'In Progress', count: metrics.inProgress },
                            { key: 'High Priority', label: 'High Priority', count: metrics.highPriority, alert: metrics.highPriority > 0 },
                            { key: 'Resolved', label: 'Resolved', count: metrics.resolved }
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setStatusFilter(tab.key as any)}
                                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                                    statusFilter === tab.key
                                        ? 'bg-slate-950 text-white dark:bg-white dark:text-zinc-950 font-extrabold shadow-xs'
                                        : 'bg-slate-100 dark:bg-zinc-800/90 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 font-bold border border-slate-300 dark:border-zinc-700'
                                }`}
                            >
                                <span>{tab.label}</span>
                                <span className={`px-1.5 py-0.2 rounded-full text-xs font-mono font-bold ${
                                    statusFilter === tab.key
                                        ? 'bg-white/20 text-white dark:bg-black/20 dark:text-zinc-950'
                                        : tab.alert
                                            ? 'bg-rose-500 text-white animate-pulse'
                                            : 'bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-zinc-100'
                                }`}>
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Search & Selectors */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Search Bar */}
                        <div className="relative min-w-56 max-w-sm">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-zinc-400" />
                            <input
                                type="text"
                                placeholder="Search resident, room, category, request #..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full py-1.5 pl-8 pr-3 text-xs sm:text-sm font-semibold rounded-lg bg-slate-50/70 dark:bg-zinc-900/60 border border-slate-300 dark:border-zinc-700 text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                            />
                        </div>

                        {/* Priority Selector */}
                        <div className="w-36">
                            <CustomSelect
                                value={priorityFilter}
                                onChange={(val) => setPriorityFilter(val)}
                                options={["All Priorities", "High", "Normal", "Low"]}
                                className="w-full py-1.5 px-3 rounded-lg bg-slate-50/70 dark:bg-zinc-900/60 border border-slate-300 dark:border-zinc-700 text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100"
                            />
                        </div>

                        {/* Category Selector */}
                        <div className="w-40">
                            <CustomSelect
                                value={categoryFilter}
                                onChange={(val) => setCategoryFilter(val)}
                                options={["All Categories", "Plumbing", "Electrical", "HVAC", "Carpentry", "Internet", "Furniture"]}
                                className="w-full py-1.5 px-3 rounded-lg bg-slate-50/70 dark:bg-zinc-900/60 border border-slate-300 dark:border-zinc-700 text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100"
                            />
                        </div>
                    </div>

                </div>
            </div>

            {/* Main Work Orders Ledger (Locked 1-Page with inner scrollbar, Minimum 9 Rows) */}
            <div className="flex-1 min-h-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs flex flex-col relative">
                {/* Header filler to prevent horizontal scrollbar alignment gap */}
                <div className="absolute top-0 right-0 w-8 h-[44px] bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700 z-30 pointer-events-none rounded-tr-xl" />

                {viewMode === 'table' ? (
                    /* WORK ORDER TABLE */
                    <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                        <table className="w-full min-w-full text-left text-sm border-collapse">
                            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-zinc-800 shadow-xs border-b border-slate-200 dark:border-zinc-700">
                                <tr className="h-[44px] bg-slate-100 dark:bg-zinc-800 text-sm sm:text-[15px] font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                    <th className="py-2.5 px-4 bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Request #</th>
                                    <th className="py-2.5 px-4 bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Tenant</th>
                                    <th className="py-2.5 px-4 bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Category</th>
                                    <th className="py-2.5 px-3 bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700 text-center">Priority</th>
                                    <th className="py-2.5 px-3 bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700 text-center">Status</th>
                                    <th className="py-2.5 px-3 text-center bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Proof</th>
                                    <th className="py-2.5 px-4 text-right bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 font-sans">
                                {filteredRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-14 text-center text-slate-400 dark:text-zinc-500">
                                            <Wrench className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                            <p className="font-extrabold text-base text-slate-900 dark:text-white">No maintenance requests found</p>
                                            <p className="text-sm font-medium text-slate-600 dark:text-zinc-400 mt-0.5">Try adjusting your filters or search keywords.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRequests.map(req => {
                                        const CategoryIcon = getCategoryIcon(req.category);
                                        const status = getStatusBadge(req.status);
                                        const priority = getPriorityBadge(req.priority);
                                        const attachUrl = getAttachmentUrl(req.attachment_url);

                                        return (
                                            <tr key={req.id} className="h-[52px] sm:h-[54px] hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors group">
                                                
                                                {/* Request # */}
                                                <td className="py-2 px-4 whitespace-nowrap">
                                                    <span className="font-mono font-bold text-sm sm:text-base text-teal-700 dark:text-teal-400">{formatRequestNumber(req.id)}</span>
                                                </td>

                                                {/* Tenant */}
                                                <td className="py-2 px-4 whitespace-nowrap">
                                                    <div className="font-extrabold text-sm sm:text-base text-slate-950 dark:text-white leading-tight">
                                                        {req.tenant_name}
                                                    </div>
                                                    <div className="text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-zinc-300 leading-tight mt-0.5">
                                                        {req.room_number ? `Room ${req.room_number}` : 'Common Property'}
                                                    </div>
                                                </td>

                                                {/* Category */}
                                                <td className="py-2 px-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2 font-medium text-sm text-slate-900 dark:text-zinc-100">
                                                        <CategoryIcon className="w-4 h-4 text-slate-500 dark:text-zinc-400 shrink-0" />
                                                        <span>{req.category}</span>
                                                    </div>
                                                </td>

                                                {/* Priority */}
                                                <td className="py-2 px-3 text-center whitespace-nowrap">
                                                    <span className={`text-xs sm:text-sm ${priority.className}`}>
                                                        {priority.label}
                                                    </span>
                                                </td>

                                                {/* Status */}
                                                <td className="py-2 px-3 text-center whitespace-nowrap">
                                                    <span className={`text-xs sm:text-sm ${status.className}`}>
                                                        {status.label}
                                                    </span>
                                                </td>

                                                {/* Proof Image */}
                                                <td className="py-2 px-3 text-center whitespace-nowrap">
                                                    {attachUrl ? (
                                                        <button 
                                                            onClick={() => setLightboxImage(attachUrl)}
                                                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-teal-700 dark:text-teal-400 transition-colors inline-flex items-center justify-center border border-slate-300 dark:border-zinc-700 cursor-pointer"
                                                            title="View attached photo proof"
                                                        >
                                                            <Paperclip className="w-4 h-4" />
                                                        </button>
                                                    ) : (
                                                        <span className="text-sm font-semibold text-slate-400">—</span>
                                                    )}
                                                </td>

                                                {/* Actions */}
                                                <td className="py-2 px-4 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-2.5">
                                                        {/* Quick Status Advance Button: Start -> Resolve */}
                                                        {req.status === 'Pending' && (
                                                            <button
                                                                onClick={() => handleQuickStatus(req.id, 'In Progress')}
                                                                className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 hover:underline transition-colors cursor-pointer"
                                                                title="Start Repair (Mark as In Progress)"
                                                            >
                                                                Start
                                                            </button>
                                                        )}
                                                        {req.status === 'In Progress' && (
                                                            <button
                                                                onClick={() => handleQuickStatus(req.id, 'Resolved')}
                                                                className="text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 hover:underline transition-colors cursor-pointer"
                                                                title="Mark as Resolved"
                                                            >
                                                                Resolve
                                                            </button>
                                                        )}

                                                        {/* View Details */}
                                                        <button
                                                            onClick={() => setViewingRequest(req)}
                                                            className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
                                                            title="View Details"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>

                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    /* WORK ORDER CARDS VIEW */
                    <div className="overflow-y-auto flex-1 p-3 custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {filteredRequests.length === 0 ? (
                                <div className="col-span-full py-12 text-center text-slate-400 dark:text-zinc-500">
                                    <Wrench className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                    <p className="font-extrabold text-base text-slate-900 dark:text-white">No maintenance requests found.</p>
                                    <p className="text-sm font-medium text-slate-600 dark:text-zinc-400 mt-0.5">Try adjusting your filters or search keywords.</p>
                                </div>
                            ) : (
                                filteredRequests.map(req => {
                                    const CategoryIcon = getCategoryIcon(req.category);
                                    const status = getStatusBadge(req.status);
                                    const priority = getPriorityBadge(req.priority);

                                    return (
                                        <div key={req.id} className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-zinc-700 transition-all">
                                            <div>
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <div>
                                                        <span className="inline-block font-mono font-bold text-xs sm:text-sm px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-200/60 dark:border-teal-500/20">
                                                            {formatRequestNumber(req.id)}
                                                        </span>
                                                        <div className="font-sans font-extrabold text-slate-950 dark:text-white text-base mt-1">
                                                            {req.tenant_name}
                                                        </div>
                                                        <div className="text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-zinc-300 mt-0.5">
                                                            {req.room_number ? `Room ${req.room_number}` : 'Common Property'}
                                                        </div>
                                                    </div>
                                                    <span className={`text-xs sm:text-sm ${priority.className}`}>
                                                        {priority.label}
                                                    </span>
                                                </div>

                                                <div className="bg-slate-50 dark:bg-zinc-900/60 rounded-lg p-2.5 border border-slate-200 dark:border-zinc-800 mb-3">
                                                    <div className="flex items-center gap-2 font-medium text-sm text-slate-900 dark:text-zinc-100">
                                                        <CategoryIcon className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
                                                        <span>{req.category}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-zinc-800/80">
                                                <span className={`text-xs sm:text-sm ${status.className}`}>
                                                    {status.label}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    {req.status === 'Pending' && (
                                                        <button
                                                            onClick={() => handleQuickStatus(req.id, 'In Progress')}
                                                            className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 hover:underline transition-colors cursor-pointer"
                                                            title="Start Repair (Mark as In Progress)"
                                                        >
                                                            Start
                                                        </button>
                                                    )}
                                                    {req.status === 'In Progress' && (
                                                        <button
                                                            onClick={() => handleQuickStatus(req.id, 'Resolved')}
                                                            className="text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 hover:underline transition-colors cursor-pointer"
                                                            title="Mark as Resolved"
                                                        >
                                                            Resolve
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setViewingRequest(req)}
                                                        className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

            </div>

            {/* MODALS */}
            <AnimatePresence>
                
                {/* VIEW REQUEST DETAILS */}
                {viewingRequest && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3">
                        <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-5 space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="font-mono text-sm font-bold text-teal-700 dark:text-teal-400">{formatRequestNumber(viewingRequest.id)}</span>
                                    <h3 className="text-lg sm:text-xl font-black text-slate-950 dark:text-white mt-0.5">{viewingRequest.title}</h3>
                                    <p className="text-sm font-semibold text-slate-700 dark:text-zinc-300">{viewingRequest.tenant_name} · Room {viewingRequest.room_number || 'Common Property'}</p>
                                </div>
                                <button onClick={() => setViewingRequest(null)} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="bg-slate-50 dark:bg-zinc-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-sm space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs uppercase font-extrabold text-slate-600 dark:text-zinc-400 tracking-wider">Status</span>
                                    <span className={`text-xs sm:text-sm ${getStatusBadge(viewingRequest.status).className}`}>
                                        {getStatusBadge(viewingRequest.status).label}
                                    </span>
                                </div>
                                <div className="pt-2.5 border-t border-slate-200 dark:border-zinc-800">
                                    <span className="text-xs uppercase font-extrabold text-slate-600 dark:text-zinc-400 tracking-wider">Category & Priority</span>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-slate-900 dark:text-zinc-100 font-semibold">{viewingRequest.category}</span>
                                        <span className="text-slate-300 dark:text-zinc-600">•</span>
                                        <span className={`text-xs sm:text-sm ${getPriorityBadge(viewingRequest.priority).className}`}>
                                            {getPriorityBadge(viewingRequest.priority).label}
                                        </span>
                                    </div>
                                </div>
                                <div className="pt-2.5 border-t border-slate-200 dark:border-zinc-800">
                                    <span className="text-xs uppercase font-extrabold text-slate-600 dark:text-zinc-400 tracking-wider">Description</span>
                                    <p className="text-slate-900 dark:text-zinc-100 font-medium text-sm sm:text-base mt-1">{viewingRequest.description}</p>
                                </div>
                                {viewingRequest.admin_notes && (
                                    <div className="pt-2.5 border-t border-slate-200 dark:border-zinc-800">
                                        <span className="text-xs uppercase font-extrabold text-slate-600 dark:text-zinc-400 tracking-wider">Admin Notes</span>
                                        <p className="text-slate-800 dark:text-zinc-200 font-medium italic mt-1">{viewingRequest.admin_notes}</p>
                                    </div>
                                )}
                            </div>

                            {getAttachmentUrl(viewingRequest.attachment_url) && (
                                <div>
                                    <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-zinc-300 mb-1.5 block">Attached Photo Proof</span>
                                    <img
                                        src={getAttachmentUrl(viewingRequest.attachment_url)!}
                                        alt="Proof"
                                        className="rounded-xl max-h-48 w-full object-contain bg-black border border-slate-200 dark:border-zinc-800 cursor-zoom-in"
                                        onClick={() => setLightboxImage(getAttachmentUrl(viewingRequest.attachment_url))}
                                    />
                                </div>
                            )}

                            <div className="flex justify-end items-center gap-2.5 pt-3 border-t border-slate-200 dark:border-zinc-800">
                                <button
                                    onClick={() => setViewingRequest(null)}
                                    className="px-4 py-2 text-sm font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 transition-colors cursor-pointer"
                                >
                                    Close
                                </button>
                                {viewingRequest.status === 'Pending' && (
                                    <button
                                        onClick={() => handleQuickStatus(viewingRequest.id, 'In Progress')}
                                        className="px-4 py-2 text-sm font-bold rounded-lg bg-blue-700 hover:bg-blue-800 text-white transition-colors cursor-pointer shadow-xs"
                                    >
                                        Start
                                    </button>
                                )}
                                {viewingRequest.status === 'In Progress' && (
                                    <button
                                        onClick={() => handleQuickStatus(viewingRequest.id, 'Resolved')}
                                        className="px-4 py-2 text-sm font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition-colors cursor-pointer shadow-xs"
                                    >
                                        Resolve
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* MODAL 3: LIGHTBOX IMAGE VIEWER */}
                {lightboxImage && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md z-100 flex items-center justify-center p-4">
                        <div className="relative max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl bg-black border border-zinc-800">
                            <button onClick={() => setLightboxImage(null)} className="absolute top-3 right-3 p-2 bg-black/60 rounded-full text-white hover:bg-black">
                                <X className="w-5 h-5" />
                            </button>
                            <img src={lightboxImage} alt="Attachment Full" className="max-w-full max-h-[80vh] object-contain" />
                        </div>
                    </motion.div>
                )}



            </AnimatePresence>

        </div>
    );
}
