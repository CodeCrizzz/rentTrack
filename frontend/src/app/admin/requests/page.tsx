"use client";

import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { toast } from 'sonner';
import CustomSelect from '@/components/CustomSelect';
import { 
    Wrench, AlertTriangle, Calendar, User, 
    CheckCircle2, Clock, Trash2, Edit, Eye, X, 
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

const CONTRACTOR_PRESETS = [
    'In-House Maintenance',
    'Dave (Plumber)',
    'ElectroTech Services',
    'CoolAir HVAC Team',
    'Rapid Handyman',
    'FiberNet Tech'
];

export default function AdminMaintenanceRequests() {
    // Data State
    const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // View & Filters
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'In Progress' | 'High Priority' | 'Resolved'>('All');
    const [priorityFilter, setPriorityFilter] = useState('All Priorities');
    const [categoryFilter, setCategoryFilter] = useState('All Categories');

    // Modals
    const [viewingRequest, setViewingRequest] = useState<MaintenanceRequest | null>(null);
    const [editingRequest, setEditingRequest] = useState<MaintenanceRequest | null>(null);
    const [deletingRequest, setDeletingRequest] = useState<MaintenanceRequest | null>(null);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);

    // Edit Form State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [manageForm, setManageForm] = useState({
        status: 'Pending',
        priority: 'Normal',
        assigned_to: '',
        scheduled_date: '',
        admin_notes: ''
    });

    // Fetch Data
    const fetchRequests = async (showToast = false) => {
        if (showToast) setIsRefreshing(true);
        else setIsLoading(true);

        try {
            const { data } = await api.get('/admin/requests');
            setRequests(data || []);
            if (showToast) toast.success("Maintenance tickets synchronized");
        } catch (error) {
            console.error("Failed to load requests", error);
            if (showToast) toast.error("Failed to load maintenance requests");
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    // Open Manage Modal
    const handleOpenManage = (req: MaintenanceRequest) => {
        setEditingRequest(req);
        setManageForm({
            status: req.status || 'Pending',
            priority: req.priority || 'Normal',
            assigned_to: req.assigned_to || '',
            scheduled_date: req.scheduled_date ? new Date(req.scheduled_date).toISOString().split('T')[0] : '',
            admin_notes: req.admin_notes || ''
        });
    };

    // Save Managed Changes
    const handleSaveManage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRequest) return;

        setIsSubmitting(true);
        try {
            const updatePayload: any = {
                status: manageForm.status,
                priority: manageForm.priority,
                assigned_to: manageForm.assigned_to.trim() || null,
                scheduled_date: manageForm.scheduled_date || null,
                admin_notes: manageForm.admin_notes.trim() || null
            };

            if (manageForm.status === 'Resolved' && editingRequest.status !== 'Resolved') {
                updatePayload.date_resolved = new Date().toISOString();
            }

            await api.put(`/admin/requests/${editingRequest.id}`, updatePayload);
            toast.success(`Ticket #${editingRequest.id} dispatched & updated`);

            setRequests(prev => prev.map(r => r.id === editingRequest.id ? { ...r, ...updatePayload } : r));
            
            if (viewingRequest && viewingRequest.id === editingRequest.id) {
                setViewingRequest(prev => prev ? { ...prev, ...updatePayload } : null);
            }

            setEditingRequest(null);
        } catch (error) {
            console.error("Failed to update work order", error);
            toast.error("Failed to update work order");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Quick Status Switch
    const handleQuickStatus = async (reqId: number, nextStatus: string) => {
        try {
            setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: nextStatus } : r));
            
            const payload: any = { status: nextStatus };
            if (nextStatus === 'Resolved') payload.date_resolved = new Date().toISOString();

            await api.put(`/admin/requests/${reqId}`, payload);
            toast.success(`Request #${reqId} marked as ${nextStatus}`);
        } catch (error) {
            console.error("Status update error", error);
            toast.error("Failed to update status");
            fetchRequests(true);
        }
    };

    // Delete Request
    const handleDeleteRequest = async () => {
        if (!deletingRequest) return;
        setIsDeleting(true);

        try {
            await api.delete(`/admin/requests/${deletingRequest.id}`);
            toast.success(`Request #${deletingRequest.id} removed`);
            setRequests(prev => prev.filter(r => r.id !== deletingRequest.id));
            if (viewingRequest?.id === deletingRequest.id) setViewingRequest(null);
            setDeletingRequest(null);
        } catch (error) {
            console.error("Delete request error", error);
            toast.error("Failed to delete request");
        } finally {
            setIsDeleting(false);
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
                `#req-${r.id}`.includes(q) ||
                r.id.toString() === q
            );

            // Status Triage Filter
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
                    label: 'Pending Review',
                    className: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/20',
                    dot: 'bg-amber-500 animate-pulse'
                };
            case 'In Progress':
                return {
                    label: 'In Progress',
                    className: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200/50 dark:border-blue-500/20',
                    dot: 'bg-blue-500'
                };
            case 'Resolved':
                return {
                    label: 'Resolved',
                    className: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20',
                    dot: 'bg-emerald-500'
                };
            default:
                return {
                    label: status,
                    className: 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700',
                    dot: 'bg-slate-400'
                };
        }
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'High':
                return {
                    label: 'High Priority',
                    className: 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200/50 dark:border-rose-500/20',
                    dot: 'bg-rose-500 animate-ping'
                };
            case 'Low':
                return {
                    label: 'Low',
                    className: 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700',
                    dot: 'bg-slate-400'
                };
            default:
                return {
                    label: 'Normal',
                    className: 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-200/50 dark:border-sky-500/20',
                    dot: 'bg-sky-500'
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
                            <div className="h-6 w-52 bg-slate-200 dark:bg-zinc-800 rounded-md"></div>
                            <div className="h-5 w-24 bg-slate-200 dark:bg-zinc-800 rounded-full"></div>
                        </div>
                        <div className="h-3.5 w-80 bg-slate-200 dark:bg-zinc-800 rounded-md mt-1.5"></div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="h-8 w-28 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                        <div className="h-8 w-20 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                    </div>
                </div>

                {/* 2. Executive Metric Ribbon (4 Tiles) */}
                <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3 shadow-xs flex items-center justify-between">
                            <div className="space-y-1.5 flex-1">
                                <div className="h-2.5 w-24 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                                <div className="h-6 w-28 bg-slate-200 dark:bg-zinc-800 rounded-md"></div>
                                <div className="h-2.5 w-24 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 shrink-0"></div>
                        </div>
                    ))}
                </div>

                {/* 3. Status Triage Bar & Filters */}
                <div className="shrink-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-2 shadow-xs">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                        <div className="flex items-center gap-1 overflow-x-auto">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-7 w-28 bg-slate-100 dark:bg-zinc-800 rounded-md"></div>
                            ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="h-7 w-48 bg-slate-100 dark:bg-zinc-800 rounded-lg"></div>
                            <div className="h-7 w-28 bg-slate-100 dark:bg-zinc-800 rounded-lg"></div>
                            <div className="h-7 w-32 bg-slate-100 dark:bg-zinc-800 rounded-lg"></div>
                        </div>
                    </div>
                </div>

                {/* 4. Main Work Orders Ledger */}
                <div className="flex-1 min-h-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs flex flex-col">
                    <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                        <table className="w-full min-w-full text-left text-xs border-collapse">
                            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-zinc-800 shadow-xs">
                                <tr className="h-10 text-slate-700 dark:text-zinc-300 uppercase tracking-wider text-[11px] font-bold">
                                    <th className="py-2.5 px-4"><div className="h-3 w-24 bg-slate-200 dark:bg-zinc-700 rounded"></div></th>
                                    <th className="py-2.5 px-4"><div className="h-3 w-32 bg-slate-200 dark:bg-zinc-700 rounded"></div></th>
                                    <th className="py-2.5 px-3 text-center"><div className="h-3 w-16 bg-slate-200 dark:bg-zinc-700 rounded mx-auto"></div></th>
                                    <th className="py-2.5 px-3 text-center"><div className="h-3 w-16 bg-slate-200 dark:bg-zinc-700 rounded mx-auto"></div></th>
                                    <th className="py-2.5 px-4"><div className="h-3 w-28 bg-slate-200 dark:bg-zinc-700 rounded"></div></th>
                                    <th className="py-2.5 px-3"><div className="h-3 w-20 bg-slate-200 dark:bg-zinc-700 rounded"></div></th>
                                    <th className="py-2.5 px-3 text-center"><div className="h-3 w-12 bg-slate-200 dark:bg-zinc-700 rounded mx-auto"></div></th>
                                    <th className="py-2.5 px-4 text-right"><div className="h-3 w-20 bg-slate-200 dark:bg-zinc-700 rounded ml-auto"></div></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 font-sans">
                                {[...Array(7)].map((_, i) => (
                                    <tr key={i} className="h-12">
                                        <td className="py-2 px-4">
                                            <div className="flex items-center gap-1.5">
                                                <div className="h-4 w-16 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                                                <div className="h-3 w-16 bg-slate-100 dark:bg-zinc-800/60 rounded"></div>
                                            </div>
                                        </td>
                                        <td className="py-2 px-4">
                                            <div className="space-y-1">
                                                <div className="h-3.5 w-36 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                                                <div className="h-3 w-20 bg-slate-100 dark:bg-zinc-800/60 rounded"></div>
                                            </div>
                                        </td>
                                        <td className="py-2 px-3 text-center"><div className="h-5 w-16 bg-slate-100 dark:bg-zinc-800 rounded-full mx-auto"></div></td>
                                        <td className="py-2 px-3 text-center"><div className="h-5 w-20 bg-slate-100 dark:bg-zinc-800 rounded-full mx-auto"></div></td>
                                        <td className="py-2 px-4"><div className="h-3.5 w-28 bg-slate-100 dark:bg-zinc-800 rounded"></div></td>
                                        <td className="py-2 px-3"><div className="h-3.5 w-20 bg-slate-100 dark:bg-zinc-800 rounded"></div></td>
                                        <td className="py-2 px-3 text-center"><div className="w-8 h-8 rounded bg-slate-100 dark:bg-zinc-800 mx-auto"></div></td>
                                        <td className="py-2 px-4 text-right"><div className="h-6 w-20 bg-slate-100 dark:bg-zinc-800 rounded-lg ml-auto"></div></td>
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
            
            {/* 1. Header Toolbar */}
            <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                            Maintenance Requests
                        </h1>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">
                            {filteredRequests.length} of {requests.length} tickets
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                        Repair ticket triage, contractor dispatching, and resolution timeline auditing.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* View Switcher */}
                    <div className="flex items-center bg-slate-100 dark:bg-zinc-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-zinc-700/80 text-xs font-semibold">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${viewMode === 'table' ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs font-bold' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'}`}
                            title="Table view"
                        >
                            <List className="w-3.5 h-3.5" />
                            <span>Table</span>
                        </button>
                        <button
                            onClick={() => setViewMode('cards')}
                            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${viewMode === 'cards' ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs font-bold' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'}`}
                            title="Work order cards"
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            <span>Cards</span>
                        </button>
                    </div>

                    {/* Sync Refresh Button */}
                    <button
                        onClick={() => fetchRequests(true)}
                        disabled={isRefreshing}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-800 bg-card hover:bg-slate-50 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5 shadow-xs"
                        title="Sync requests"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-teal-600' : ''}`} />
                        <span>{isRefreshing ? 'Syncing...' : 'Sync'}</span>
                    </button>
                </div>
            </div>

            {/* 2. Executive Metric Ribbon (4 High-Density KPI Tiles) */}
            <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                
                {/* Metric 1: Total Tickets */}
                <motion.div variants={cardVariants} initial="hidden" animate="show" className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Gross Work Orders</span>
                        <div className="text-xl font-extrabold font-mono text-slate-900 dark:text-white mt-0.5 flex items-baseline gap-1.5">
                            {metrics.total} <span className="text-xs font-medium text-slate-500">tickets</span>
                        </div>
                        <div className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mt-0.5">
                            {metrics.pending + metrics.inProgress} currently open
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-500/10 border border-teal-200/50 dark:border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
                        <Wrench className="w-5 h-5" />
                    </div>
                </motion.div>

                {/* Metric 2: Needs Review (Pending) */}
                <motion.div 
                    variants={cardVariants} 
                    initial="hidden" 
                    animate="show" 
                    onClick={() => setStatusFilter('Pending')}
                    className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3 shadow-xs flex items-center justify-between cursor-pointer hover:border-amber-400 transition-colors"
                >
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Needs Triage</span>
                            {metrics.pending > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>}
                        </div>
                        <div className="text-xl font-extrabold font-mono text-amber-600 dark:text-amber-400 mt-0.5 flex items-baseline gap-1.5">
                            {metrics.pending} <span className="text-xs font-medium text-amber-600">pending</span>
                        </div>
                        <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                            Awaiting dispatching
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                        <Clock className="w-5 h-5" />
                    </div>
                </motion.div>

                {/* Metric 3: Dispatched (In Progress) */}
                <motion.div 
                    variants={cardVariants} 
                    initial="hidden" 
                    animate="show" 
                    onClick={() => setStatusFilter('In Progress')}
                    className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3 shadow-xs flex items-center justify-between cursor-pointer hover:border-blue-400 transition-colors"
                >
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Active Dispatches</span>
                        <div className="text-xl font-extrabold font-mono text-blue-600 dark:text-blue-400 mt-0.5 flex items-baseline gap-1.5">
                            {metrics.inProgress} <span className="text-xs font-medium text-blue-600">in progress</span>
                        </div>
                        <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                            Field technicians assigned
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200/50 dark:border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                        <UserCheck className="w-5 h-5" />
                    </div>
                </motion.div>

                {/* Metric 4: Resolution Rate */}
                <motion.div 
                    variants={cardVariants} 
                    initial="hidden" 
                    animate="show" 
                    onClick={() => setStatusFilter('Resolved')}
                    className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3 shadow-xs flex items-center justify-between cursor-pointer hover:border-emerald-400 transition-colors"
                >
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Resolution Rate</span>
                        <div className="text-xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-baseline gap-1.5">
                            {metrics.resolutionRate}% <span className="text-xs font-medium text-emerald-600">efficiency</span>
                        </div>
                        <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            <span>{metrics.resolved} tickets closed</span>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                </motion.div>

            </div>

            {/* 3. Triage Category Tabs & Filter Toolbar */}
            <div className="shrink-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-2 shadow-xs space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    
                    {/* Status Triage Filter Tabs */}
                    <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar text-xs">
                        {[
                            { key: 'All', label: 'All Tickets', count: metrics.total },
                            { key: 'Pending', label: 'Pending Triage', count: metrics.pending, alert: metrics.pending > 0 },
                            { key: 'In Progress', label: 'In Progress', count: metrics.inProgress },
                            { key: 'High Priority', label: 'High Priority', count: metrics.highPriority, alert: metrics.highPriority > 0 },
                            { key: 'Resolved', label: 'Resolved', count: metrics.resolved }
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setStatusFilter(tab.key as any)}
                                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
                                    statusFilter === tab.key
                                        ? 'bg-teal-600 text-white font-bold shadow-xs'
                                        : 'bg-slate-100 dark:bg-zinc-800/60 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800'
                                }`}
                            >
                                <span>{tab.label}</span>
                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                                    statusFilter === tab.key
                                        ? 'bg-white/20 text-white'
                                        : tab.alert
                                            ? 'bg-rose-500 text-white animate-pulse'
                                            : 'bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300'
                                }`}>
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Search & Selectors */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Search Bar */}
                        <div className="relative min-w-45 max-w-xs">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search title, tenant, room..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full py-1.5 pl-8 pr-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                        </div>

                        {/* Priority Selector */}
                        <div className="w-32">
                            <CustomSelect
                                value={priorityFilter}
                                onChange={(val) => setPriorityFilter(val)}
                                options={["All Priorities", "High", "Normal", "Low"]}
                                className="py-1.5 px-3 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300"
                            />
                        </div>

                        {/* Category Selector */}
                        <div className="w-36">
                            <CustomSelect
                                value={categoryFilter}
                                onChange={(val) => setCategoryFilter(val)}
                                options={["All Categories", "Plumbing", "Electrical", "HVAC", "Carpentry", "Internet", "Furniture"]}
                                className="py-1.5 px-3 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300"
                            />
                        </div>
                    </div>

                </div>
            </div>

            {/* 4. Main Work Orders Ledger (Locked 1-Page with inner scrollbar) */}
            <div className="flex-1 min-h-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs flex flex-col">
                
                {viewMode === 'table' ? (
                    /* WORK ORDER TABLE */
                    <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                        <table className="w-full min-w-full text-left text-xs border-collapse">
                            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-zinc-800 shadow-xs">
                                <tr className="h-10 text-slate-700 dark:text-zinc-300 uppercase tracking-wider text-[11px] font-bold">
                                    <th className="py-2.5 px-4 bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Ticket & Unit</th>
                                    <th className="py-2.5 px-4 bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Issue Title & Category</th>
                                    <th className="py-2.5 px-3 bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700 text-center">Priority</th>
                                    <th className="py-2.5 px-3 bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700 text-center">Status</th>
                                    <th className="py-2.5 px-4 bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Assigned Contractor</th>
                                    <th className="py-2.5 px-3 bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Scheduled</th>
                                    <th className="py-2.5 px-3 text-center bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Proof</th>
                                    <th className="py-2.5 px-4 text-right bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Quick Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 font-sans">
                                {filteredRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-zinc-500">
                                            <Wrench className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                            <p className="font-semibold text-sm">No maintenance requests matching filters.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRequests.map(req => {
                                        const CategoryIcon = getCategoryIcon(req.category);
                                        const status = getStatusBadge(req.status);
                                        const priority = getPriorityBadge(req.priority);
                                        const attachUrl = getAttachmentUrl(req.attachment_url);

                                        return (
                                            <tr key={req.id} className="h-12 hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                                                
                                                {/* Ticket ID & Unit */}
                                                <td className="py-2 px-4 whitespace-nowrap">
                                                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                                        <span className="font-mono text-teal-600 dark:text-teal-400">#REQ-{req.id}</span>
                                                        <span>·</span>
                                                        <span>{req.tenant_name}</span>
                                                    </div>
                                                    <div className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                                                        {req.room_number ? `Room ${req.room_number}` : 'Common Property'}
                                                    </div>
                                                </td>

                                                {/* Issue & Category */}
                                                <td className="py-2 px-4">
                                                    <div className="font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5 truncate max-w-xs">
                                                        <CategoryIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                        <span className="truncate">{req.title}</span>
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 truncate max-w-xs">
                                                        {req.description}
                                                    </div>
                                                </td>

                                                {/* Priority Badge */}
                                                <td className="py-2 px-3 text-center whitespace-nowrap">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${priority.className}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`}></span>
                                                        {priority.label}
                                                    </span>
                                                </td>

                                                {/* Status Badge */}
                                                <td className="py-2 px-3 text-center whitespace-nowrap">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${status.className}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
                                                        {status.label}
                                                    </span>
                                                </td>

                                                {/* Contractor */}
                                                <td className="py-2 px-4 whitespace-nowrap font-medium text-slate-700 dark:text-zinc-300">
                                                    {req.assigned_to ? (
                                                        <div className="flex items-center gap-1.5 text-xs">
                                                            <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                                                            <span>{req.assigned_to}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                                                    )}
                                                </td>

                                                {/* Scheduled Date */}
                                                <td className="py-2 px-3 whitespace-nowrap text-slate-600 dark:text-zinc-400 text-xs font-mono">
                                                    {req.scheduled_date ? new Date(req.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
                                                </td>

                                                {/* Proof Image */}
                                                <td className="py-2 px-3 text-center whitespace-nowrap">
                                                    {attachUrl ? (
                                                        <button 
                                                            onClick={() => setLightboxImage(attachUrl)}
                                                            className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-teal-600"
                                                            title="View attached photo"
                                                        >
                                                            <Paperclip className="w-3.5 h-3.5" />
                                                        </button>
                                                    ) : (
                                                        <span className="text-slate-400 text-[11px]">-</span>
                                                    )}
                                                </td>

                                                {/* Actions */}
                                                <td className="py-2 px-4 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {/* Quick Status Advance Button */}
                                                        {req.status === 'Pending' && (
                                                            <button
                                                                onClick={() => handleQuickStatus(req.id, 'In Progress')}
                                                                className="px-2 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 text-[11px] font-bold"
                                                                title="Mark as In Progress"
                                                            >
                                                                Dispatch
                                                            </button>
                                                        )}
                                                        {req.status === 'In Progress' && (
                                                            <button
                                                                onClick={() => handleQuickStatus(req.id, 'Resolved')}
                                                                className="px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 text-[11px] font-bold"
                                                                title="Mark as Resolved"
                                                            >
                                                                Resolve
                                                            </button>
                                                        )}

                                                        {/* Dispatch / Manage Modal */}
                                                        <button
                                                            onClick={() => handleOpenManage(req)}
                                                            className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 hover:text-slate-900"
                                                            title="Manage Work Order"
                                                        >
                                                            <Edit className="w-3.5 h-3.5" />
                                                        </button>

                                                        {/* View Details */}
                                                        <button
                                                            onClick={() => setViewingRequest(req)}
                                                            className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 hover:text-slate-900"
                                                            title="View Details"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </button>

                                                        {/* Delete */}
                                                        <button
                                                            onClick={() => setDeletingRequest(req)}
                                                            className="p-1.5 rounded-md hover:bg-rose-100 text-slate-400 hover:text-rose-600"
                                                            title="Delete Ticket"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
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
                                    <p className="font-semibold text-sm">No maintenance requests found.</p>
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
                                                        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-teal-600">
                                                            <span>#REQ-{req.id}</span>
                                                            <span className="text-slate-400">·</span>
                                                            <span className="text-slate-700 dark:text-zinc-300 font-sans">{req.tenant_name}</span>
                                                        </div>
                                                        <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                                                            {req.room_number ? `Room ${req.room_number}` : 'Common Area'}
                                                        </div>
                                                    </div>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${priority.className}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`}></span>
                                                        {priority.label}
                                                    </span>
                                                </div>

                                                <div className="bg-slate-50 dark:bg-zinc-900/60 rounded-lg p-2.5 border border-slate-100 dark:border-zinc-800 space-y-1 mb-3 text-xs">
                                                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                                        <CategoryIcon className="w-3.5 h-3.5 text-slate-500" />
                                                        <span>{req.title}</span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-600 dark:text-zinc-400 line-clamp-2">
                                                        {req.description}
                                                    </p>
                                                    {req.assigned_to && (
                                                        <div className="pt-1 border-t border-slate-200 dark:border-zinc-800 flex justify-between text-[11px] font-medium text-slate-500">
                                                            <span>Contractor:</span>
                                                            <span className="font-bold text-slate-800 dark:text-zinc-200">{req.assigned_to}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${status.className}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
                                                    {status.label}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => setViewingRequest(req)}
                                                        className="p-1 rounded text-slate-500 hover:text-slate-900"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenManage(req)}
                                                        className="px-2 py-0.5 rounded bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-bold"
                                                    >
                                                        Manage
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

            {/* ============================================================== */}
            {/* 5. MODALS */}
            {/* ============================================================== */}
            <AnimatePresence>
                
                {/* MODAL 1: DISPATCH / MANAGE WORK ORDER */}
                {editingRequest && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3">
                        <motion.div initial={{ scale: 0.96, y: 8, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
                            
                            <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-slate-50/80 dark:bg-zinc-900/60">
                                <div>
                                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                                        Manage Work Order #REQ-{editingRequest.id}
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {editingRequest.title} · Room {editingRequest.room_number || 'N/A'}
                                    </p>
                                </div>
                                <button onClick={() => setEditingRequest(null)} className="p-1 rounded-lg hover:bg-slate-200 text-slate-500">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveManage} className="p-5 space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Ticket Status</label>
                                        <CustomSelect
                                            value={manageForm.status}
                                            onChange={(val) => setManageForm({ ...manageForm, status: val })}
                                            options={["Pending", "In Progress", "Resolved"]}
                                            className="py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 font-semibold"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Priority Level</label>
                                        <CustomSelect
                                            value={manageForm.priority}
                                            onChange={(val) => setManageForm({ ...manageForm, priority: val })}
                                            options={["Low", "Normal", "High"]}
                                            className="py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 font-semibold"
                                        />
                                    </div>
                                </div>

                                {/* Contractor Preset Selection */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Assigned Contractor / Technician</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Dave (Plumber) or In-House..."
                                        value={manageForm.assigned_to}
                                        onChange={(e) => setManageForm({ ...manageForm, assigned_to: e.target.value })}
                                        className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    />
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {CONTRACTOR_PRESETS.map((p, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => setManageForm({ ...manageForm, assigned_to: p })}
                                                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-[10px] font-semibold text-slate-600 dark:text-zinc-400"
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Scheduled Date */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Scheduled Repair Date</label>
                                    <input
                                        type="date"
                                        value={manageForm.scheduled_date}
                                        onChange={(e) => setManageForm({ ...manageForm, scheduled_date: e.target.value })}
                                        className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    />
                                </div>

                                {/* Admin Notes */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Internal Admin Notes</label>
                                    <textarea
                                        rows={2}
                                        placeholder="Add technician feedback, spare parts needed..."
                                        value={manageForm.admin_notes}
                                        onChange={(e) => setManageForm({ ...manageForm, admin_notes: e.target.value })}
                                        className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                                    <button
                                        type="button"
                                        onClick={() => setEditingRequest(null)}
                                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-4 py-2 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5 shadow-xs"
                                    >
                                        {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                        <span>Update Ticket</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}

                {/* MODAL 2: VIEW TICKET DETAILS */}
                {viewingRequest && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3">
                        <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-5 space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="font-mono text-xs font-bold text-teal-600">#REQ-{viewingRequest.id}</span>
                                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">{viewingRequest.title}</h3>
                                    <p className="text-xs text-slate-500">{viewingRequest.tenant_name} · Room {viewingRequest.room_number || 'N/A'}</p>
                                </div>
                                <button onClick={() => setViewingRequest(null)} className="p-1 rounded-lg text-slate-500">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="bg-slate-50 dark:bg-zinc-900/60 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs space-y-2">
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-slate-400">Description</span>
                                    <p className="text-slate-800 dark:text-zinc-200 mt-0.5">{viewingRequest.description}</p>
                                </div>
                                {viewingRequest.admin_notes && (
                                    <div className="pt-2 border-t border-slate-200 dark:border-zinc-800">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Admin Dispatch Notes</span>
                                        <p className="text-slate-700 dark:text-zinc-300 italic mt-0.5">{viewingRequest.admin_notes}</p>
                                    </div>
                                )}
                            </div>

                            {getAttachmentUrl(viewingRequest.attachment_url) && (
                                <div>
                                    <span className="text-xs font-bold text-slate-500 mb-1.5 block">Attached Photo Proof</span>
                                    <img
                                        src={getAttachmentUrl(viewingRequest.attachment_url)!}
                                        alt="Proof"
                                        className="rounded-xl max-h-48 w-full object-contain bg-black border border-slate-200 dark:border-zinc-800 cursor-zoom-in"
                                        onClick={() => setLightboxImage(getAttachmentUrl(viewingRequest.attachment_url))}
                                    />
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                                <button
                                    onClick={() => setViewingRequest(null)}
                                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => {
                                        const req = viewingRequest;
                                        setViewingRequest(null);
                                        handleOpenManage(req);
                                    }}
                                    className="px-4 py-2 text-xs font-bold rounded-lg bg-teal-600 text-white"
                                >
                                    Manage Work Order
                                </button>
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

                {/* MODAL 4: DELETE CONFIRMATION */}
                {deletingRequest && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3">
                        <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-3">
                            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Delete Maintenance Ticket</h3>
                            <p className="text-xs text-slate-500">
                                Are you sure you want to remove ticket #REQ-{deletingRequest.id} ({deletingRequest.title})? This action cannot be reversed.
                            </p>
                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                                <button onClick={() => setDeletingRequest(null)} className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100">
                                    Cancel
                                </button>
                                <button onClick={handleDeleteRequest} disabled={isDeleting} className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-rose-600 text-white">
                                    {isDeleting ? 'Deleting...' : 'Delete Ticket'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

            </AnimatePresence>

        </div>
    );
}
