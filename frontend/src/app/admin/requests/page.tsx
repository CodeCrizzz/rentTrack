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
    HelpCircle, ZoomIn, UserCheck, Check,
    ShieldAlert, TrendingUp, Phone,
    Send, Building2, Search, Camera
} from 'lucide-react';

interface MaintenanceRequest {
    id: number;
    request_number?: string | null;
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
    image_url?: string | null;
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
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'In Progress' | 'High Priority' | 'Resolved'>('All');
    const [priorityFilter, setPriorityFilter] = useState('All Priorities');
    const [categoryFilter, setCategoryFilter] = useState('All Categories');
    const [highlightedRequestId, setHighlightedRequestId] = useState<number | null>(null);

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

            const targetReq = requests.find(r => r.id === reqId);
            const reqLabel = targetReq?.request_number || formatRequestNumber(reqId);
            toast.success(`Request #${reqLabel} marked as ${nextStatus}`);
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
                r.tenant_name.toLowerCase().includes(q) ||
                (r.request_number && r.request_number.toLowerCase().includes(q)) ||
                formatRequestNumber(r.id, r.request_number).toLowerCase().includes(q) ||
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
    const formatRequestNumber = (id: number | string, reqNum?: string | null) => {
        if (reqNum) return reqNum;
        if (typeof id === 'string' && id.startsWith('RT')) return id;
        if (!id) return '';
        return 'RT-' + String(id).padStart(6, '0');
    };

    const getAttachmentUrl = (path: string | null | undefined) => {
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

                {/* Status Tabs & Filters Skeleton */}
                <div className="shrink-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-2 shadow-xs">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="h-8 w-56 sm:w-64 bg-slate-100 dark:bg-zinc-800 rounded-lg"></div>
                        <div className="h-8 w-36 bg-slate-100 dark:bg-zinc-800 rounded-lg"></div>
                        <div className="h-8 w-40 bg-slate-100 dark:bg-zinc-800 rounded-lg"></div>
                        <div className="h-8 w-40 bg-slate-100 dark:bg-zinc-800 rounded-lg"></div>
                    </div>
                </div>

                {/* Main Work Orders Ledger Skeleton */}
                <div className="flex-1 min-h-0 max-h-[610px] bg-card border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs flex flex-col relative">
                    <div className="absolute top-0 right-0 w-6 h-[46px] bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 z-30 pointer-events-none rounded-tr-xl" />
                    <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                        <table className="w-full min-w-full text-left text-sm border-collapse">
                            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-zinc-900 shadow-xs border-b border-slate-200 dark:border-zinc-800">
                                <tr className="h-[46px] bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 uppercase tracking-wider text-sm font-black">
                                    <th className="py-2.5 px-4 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800"><div className="h-4 w-28 bg-slate-200 dark:bg-zinc-700 rounded"></div></th>
                                    <th className="py-2.5 px-4 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800"><div className="h-4 w-36 bg-slate-200 dark:bg-zinc-700 rounded"></div></th>
                                    <th className="py-2.5 px-3 text-center bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800"><div className="h-4 w-20 bg-slate-200 dark:bg-zinc-700 rounded mx-auto"></div></th>
                                    <th className="py-2.5 px-3 text-center bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800"><div className="h-4 w-20 bg-slate-200 dark:bg-zinc-700 rounded mx-auto"></div></th>
                                    <th className="py-2.5 px-4 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800"><div className="h-4 w-32 bg-slate-200 dark:bg-zinc-700 rounded"></div></th>
                                    <th className="py-2.5 px-3.5 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800"><div className="h-4 w-24 bg-slate-200 dark:bg-zinc-700 rounded"></div></th>
                                    <th className="py-2.5 px-3 text-center bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800"><div className="h-4 w-12 bg-slate-200 dark:bg-zinc-700 rounded mx-auto"></div></th>
                                    <th className="py-2.5 pl-3.5 pr-6 text-right bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800"><div className="h-4 w-24 bg-slate-200 dark:bg-zinc-700 rounded ml-auto"></div></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 font-sans">
                                {[...Array(9)].map((_, i) => (
                                    <tr key={i} className="h-[62px]">
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
        <div className="w-full h-[calc(100vh-6.2rem)] md:h-[calc(100vh-7.2rem)] lg:h-[calc(100dvh-7.2rem)] flex flex-col font-sans text-slate-900 dark:text-zinc-100 overflow-hidden space-y-2.5 sm:space-y-3">
            
            {/* Header Toolbar */}
            <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight">
                            Maintenance Requests
                        </h1>
                        <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-slate-300 dark:border-zinc-700">
                            {filteredRequests.length} of {requests.length} requests
                        </span>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-zinc-300 mt-0.5">
                        Maintenance request tracking and resolution timeline auditing.
                    </p>
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
                        <div className={`text-2xl sm:text-3xl lg:text-4xl font-black font-mono mt-0.5 flex items-baseline gap-2 ${metrics.pending > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-950 dark:text-white'}`}>
                            {metrics.pending} <span className="text-sm sm:text-base font-sans font-extrabold text-slate-700 dark:text-zinc-300">Pending</span>
                        </div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-zinc-300 mt-0.5">
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
                        <div className="text-2xl sm:text-3xl lg:text-4xl font-black font-mono text-slate-950 dark:text-white mt-0.5 flex items-baseline gap-2">
                            {metrics.inProgress} <span className="text-sm sm:text-base font-sans font-extrabold text-slate-700 dark:text-zinc-300">In Progress</span>
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
                            {metrics.resolutionRate}% <span className="text-sm sm:text-base font-sans font-extrabold text-slate-700 dark:text-zinc-300">Resolved</span>
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-zinc-300 mt-0.5 flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-slate-600 dark:text-zinc-400" />
                            <span><span className="font-extrabold text-slate-950 dark:text-white">{metrics.resolved}</span> of <span className="font-bold text-slate-900 dark:text-zinc-100">{metrics.total}</span> requests closed</span>
                        </p>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-300/60 dark:border-emerald-500/30">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                </motion.div>

            </div>

            {/* Status Filter Tabs & Toolbar */}
            <div className="shrink-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-2 shadow-xs">
                <div className="flex flex-wrap items-center gap-2">
                    
                    {/* 1. Search Bar (Only request number & tenant name) */}
                    <div className="relative min-w-56 sm:min-w-64 max-w-sm flex-1 sm:flex-initial">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Search request # or tenant name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full py-1.5 pl-8 pr-3 text-xs sm:text-sm font-semibold rounded-lg bg-slate-50/70 dark:bg-zinc-900/60 border border-slate-300 dark:border-zinc-700 text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                        />
                    </div>

                    {/* 2. Priority Selector */}
                    <div className="w-36 sm:w-40 shrink-0">
                        <CustomSelect
                            value={priorityFilter}
                            onChange={(val) => setPriorityFilter(val)}
                            options={["All Priorities", "High", "Normal", "Low"]}
                            className="w-full py-1.5 px-3 rounded-lg bg-slate-50/70 dark:bg-zinc-900/60 border border-slate-300 dark:border-zinc-700 text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100"
                        />
                    </div>

                    {/* 3. Category Selector */}
                    <div className="w-40 sm:w-44 shrink-0">
                        <CustomSelect
                            value={categoryFilter}
                            onChange={(val) => setCategoryFilter(val)}
                            options={["All Categories", "Plumbing", "Electrical", "HVAC", "Carpentry", "Internet", "Furniture"]}
                            className="w-full py-1.5 px-3 rounded-lg bg-slate-50/70 dark:bg-zinc-900/60 border border-slate-300 dark:border-zinc-700 text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100"
                        />
                    </div>

                    {/* 4. Request Status Dropdown */}
                    <div className="w-40 sm:w-44 shrink-0">
                        <CustomSelect
                            value={statusFilter}
                            onChange={(val) => setStatusFilter(val as any)}
                            options={[
                                { value: 'All', label: 'All Requests' },
                                { value: 'Pending', label: 'Pending Review' },
                                { value: 'In Progress', label: 'In Progress' },
                                { value: 'High Priority', label: 'High Priority' },
                                { value: 'Resolved', label: 'Resolved' }
                            ]}
                            className="w-full py-1.5 px-3 rounded-lg bg-slate-50/70 dark:bg-zinc-900/60 border border-slate-300 dark:border-zinc-700 text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100"
                        />
                    </div>

                    {/* Reset Filters button if any filter is active */}
                    {(searchQuery || priorityFilter !== 'All Priorities' || categoryFilter !== 'All Categories' || statusFilter !== 'All') && (
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setPriorityFilter('All Priorities');
                                setCategoryFilter('All Categories');
                                setStatusFilter('All');
                            }}
                            className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                            Reset
                        </button>
                    )}

                </div>
            </div>

            {/* Main Work Orders Ledger (Displays exactly 9 Rows with scrollbar for more) */}
            <div className="flex-1 min-h-0 max-h-[610px] bg-card border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs flex flex-col relative">
                {/* Header filler to extend label header width and align scrollbar with 1st data row */}
                <div className="absolute top-0 right-0 w-6 h-[46px] bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 z-30 pointer-events-none rounded-tr-xl" />

                {/* WORK ORDER TABLE */}
                <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                        <table className="w-full min-w-full text-left text-sm border-collapse">
                            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-zinc-900 shadow-xs border-b border-slate-200 dark:border-zinc-800">
                                <tr className="h-[46px] bg-slate-100 dark:bg-zinc-900 text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                    <th className="py-3 px-4 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">Request #</th>
                                    <th className="py-3 px-3.5 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">Tenant</th>
                                    <th className="py-3 px-3.5 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">Category</th>
                                    <th className="py-3 px-3.5 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-center">Priority</th>
                                    <th className="py-3 px-3.5 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 text-center">Status</th>
                                    <th className="py-3 pl-3.5 pr-6 text-right bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 font-sans">
                                {filteredRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-16 text-center text-slate-400 dark:text-zinc-500">
                                            <Wrench className="w-12 h-12 mx-auto mb-2.5 opacity-30" />
                                            <p className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">No maintenance requests found</p>
                                            <p className="text-sm font-medium text-slate-600 dark:text-zinc-400 mt-1">Try adjusting your filters or search keywords.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRequests.map(req => {
                                        const CategoryIcon = getCategoryIcon(req.category);
                                        const status = getStatusBadge(req.status);
                                        const priority = getPriorityBadge(req.priority);

                                        const isHighlighted = highlightedRequestId === req.id;

                                        return (
                                            <tr 
                                                key={req.id} 
                                                onClick={() => setHighlightedRequestId(prev => prev === req.id ? null : req.id)}
                                                className={`h-[62px] transition-colors cursor-pointer group ${
                                                    isHighlighted
                                                        ? "bg-slate-200/80 hover:bg-slate-200 dark:bg-zinc-800/90 dark:hover:bg-zinc-800 font-semibold"
                                                        : "hover:bg-slate-50/80 dark:hover:bg-zinc-800/40"
                                                }`}
                                            >
                                                
                                                {/* Request # */}
                                                <td className="py-2 px-4 whitespace-nowrap">
                                                    <span className="font-extrabold text-base sm:text-[17px] text-slate-900 dark:text-white">
                                                        {formatRequestNumber(req.id, req.request_number)}
                                                    </span>
                                                </td>

                                                {/* Tenant */}
                                                <td className="py-2 px-3.5 whitespace-nowrap">
                                                    <div className="font-extrabold text-base sm:text-[17px] text-slate-950 dark:text-white leading-tight">
                                                        {req.tenant_name}
                                                    </div>
                                                    <div className="text-sm font-medium text-slate-700 dark:text-zinc-300 leading-tight mt-0.5">
                                                        {req.room_number ? `Room ${req.room_number}` : 'Common Property'}
                                                    </div>
                                                </td>

                                                {/* Category */}
                                                <td className="py-2 px-3.5 whitespace-nowrap">
                                                    <div className="flex items-center gap-2.5 font-semibold text-sm sm:text-base text-slate-900 dark:text-zinc-100">
                                                        <CategoryIcon className="w-4.5 h-4.5 text-slate-500 dark:text-zinc-400 shrink-0" />
                                                        <span>{req.category}</span>
                                                    </div>
                                                </td>

                                                {/* Priority */}
                                                <td className="py-2 px-3.5 text-center whitespace-nowrap">
                                                    <span className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${priority.className}`}>
                                                        {priority.label}
                                                    </span>
                                                </td>

                                                {/* Status */}
                                                <td className="py-2 px-3.5 text-center whitespace-nowrap">
                                                    <span className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${status.className}`}>
                                                        {status.label}
                                                    </span>
                                                </td>

                                                {/* Actions */}
                                                <td className="py-2 px-4 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {/* Quick Status Advance Button: Start -> Resolve */}
                                                        {req.status === 'Pending' && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleQuickStatus(req.id, 'In Progress');
                                                                }}
                                                                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors cursor-pointer"
                                                                title="Start Repair (Mark as In Progress)"
                                                            >
                                                                Start
                                                            </button>
                                                        )}
                                                        {req.status === 'In Progress' && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleQuickStatus(req.id, 'Resolved');
                                                                }}
                                                                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-colors cursor-pointer"
                                                                title="Mark as Resolved"
                                                            >
                                                                Resolve
                                                            </button>
                                                        )}

                                                        {/* View Details */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setViewingRequest(req);
                                                            }}
                                                            className="p-2 rounded-lg text-slate-600 hover:text-slate-950 dark:text-zinc-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                                            title="View Details"
                                                        >
                                                            <Eye className="w-4.5 h-4.5" />
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
                </div>

            {/* MODALS */}
            <AnimatePresence>
                
                {/* VIEW REQUEST DETAILS */}
                {viewingRequest && (() => {
                    const proofUrl = getAttachmentUrl(viewingRequest.attachment_url || viewingRequest.image_url);
                    return (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
                            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                                <div className="p-5 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-start shrink-0 bg-slate-50/50 dark:bg-zinc-900/40">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                                {formatRequestNumber(viewingRequest.id, viewingRequest.request_number)}
                                            </span>
                                            <span className="text-slate-300 dark:text-zinc-700">·</span>
                                            <span className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${getStatusBadge(viewingRequest.status).className}`}>
                                                {getStatusBadge(viewingRequest.status).label}
                                            </span>
                                        </div>
                                        <h3 className="text-lg sm:text-xl font-black text-slate-950 dark:text-white mt-1 leading-tight">{viewingRequest.title}</h3>
                                        <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-zinc-400 mt-0.5">{viewingRequest.tenant_name} · Room {viewingRequest.room_number || 'Common Property'}</p>
                                    </div>
                                    <button onClick={() => setViewingRequest(null)} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="p-5 overflow-y-auto custom-scrollbar space-y-4 flex-1">
                                    <div className="bg-slate-50 dark:bg-zinc-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-sm space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs uppercase font-extrabold text-slate-600 dark:text-zinc-400 tracking-wider">Category & Priority</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-900 dark:text-zinc-100 font-semibold">{viewingRequest.category}</span>
                                                <span className="text-slate-300 dark:text-zinc-600">•</span>
                                                <span className={`text-xs sm:text-sm ${getPriorityBadge(viewingRequest.priority).className}`}>
                                                    {getPriorityBadge(viewingRequest.priority).label}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="pt-2.5 border-t border-slate-200 dark:border-zinc-800">
                                            <span className="text-xs uppercase font-extrabold text-slate-600 dark:text-zinc-400 tracking-wider">Description of Issue</span>
                                            <p className="text-slate-900 dark:text-zinc-100 font-medium text-sm sm:text-base mt-1 whitespace-pre-wrap">{viewingRequest.description}</p>
                                        </div>
                                        {viewingRequest.admin_notes && (
                                            <div className="pt-2.5 border-t border-slate-200 dark:border-zinc-800">
                                                <span className="text-xs uppercase font-extrabold text-slate-600 dark:text-zinc-400 tracking-wider">Admin Notes</span>
                                                <p className="text-slate-800 dark:text-zinc-200 font-medium italic mt-1">{viewingRequest.admin_notes}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Proof of Issue Image */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                                                <Camera className="w-4 h-4 text-slate-700 dark:text-zinc-300" />
                                                Proof of Issue
                                            </span>
                                            {proofUrl && (
                                                <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                                                    Click photo to zoom
                                                </span>
                                            )}
                                        </div>

                                        {proofUrl ? (
                                            <div 
                                                onClick={() => setLightboxImage(proofUrl)}
                                                className="group relative rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-black cursor-zoom-in shadow-inner"
                                            >
                                                <img
                                                    src={proofUrl}
                                                    alt="Proof of Issue"
                                                    className="w-full max-h-56 object-contain mx-auto transition-transform duration-200 group-hover:scale-[1.02]"
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-bold text-xs pointer-events-none">
                                                    <ZoomIn className="w-4 h-4" />
                                                    <span>Click to expand full size</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 flex items-center justify-center gap-2 text-slate-400 dark:text-zinc-500 text-xs sm:text-sm">
                                                <Camera className="w-4 h-4 opacity-50" />
                                                <span>No proof of issue image attached by resident.</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-end items-center gap-2.5 p-4 border-t border-slate-200 dark:border-zinc-800 shrink-0 bg-slate-50/40 dark:bg-zinc-900/20">
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
                                            Start Repair
                                        </button>
                                    )}
                                    {viewingRequest.status === 'In Progress' && (
                                        <button
                                            onClick={() => handleQuickStatus(viewingRequest.id, 'Resolved')}
                                            className="px-4 py-2 text-sm font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition-colors cursor-pointer shadow-xs"
                                        >
                                            Mark as Resolved
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    );
                })()}

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
