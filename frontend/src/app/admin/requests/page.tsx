"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { toast } from 'sonner';
import CustomSelect from '@/components/CustomSelect';
import { 
    Search, Wrench, AlertTriangle, Calendar, User, 
    CheckCircle, Clock, Trash2, Edit, Eye, X, 
    RefreshCw, ExternalLink, MessageSquare, Check, 
    Droplets, Zap, Wind, Hammer, Wifi, HelpCircle, 
    ZoomIn, Download, UserCheck, Paperclip
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

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

const cardVariants: Variants = {
    hidden: { opacity: 0, scale: 0.98 },
    show: { opacity: 1, scale: 1, transition: { duration: 0.3 } }
};

const CONTRACTOR_PRESETS = [
    'In-House Maintenance',
    'Dave (Plumber)',
    'ElectroTech Services',
    'CoolAir HVAC Team',
    'Rapid Handyman'
];

export default function AdminMaintenanceRequests() {
    const router = useRouter();

    // Data State
    const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All Status');
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
    const fetchRequests = async (silent = false) => {
        if (!silent) setIsLoading(true);
        else setIsRefreshing(true);

        try {
            const { data } = await api.get('/admin/requests');
            setRequests(data || []);
        } catch (error) {
            console.error("Failed to load requests", error);
            toast.error("Failed to load maintenance requests");
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
            toast.success(`Work order #${editingRequest.id} updated`);

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

            const matchesStatus = statusFilter === 'All Status' || r.status === statusFilter;
            const matchesPriority = priorityFilter === 'All Priorities' || r.priority === priorityFilter;
            const matchesCategory = categoryFilter === 'All Categories' || 
                r.category.toLowerCase().includes(categoryFilter.toLowerCase());

            return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
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
        if (cat.includes('appliance')) return Wrench;
        return HelpCircle;
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Pending':
                return <span className="px-3 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold text-xs rounded-md border border-amber-200/60 dark:border-amber-500/20">Pending</span>;
            case 'In Progress':
                return <span className="px-3 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 font-bold text-xs rounded-md border border-blue-200/60 dark:border-blue-500/20">In Progress</span>;
            case 'Resolved':
                return <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold text-xs rounded-md border border-emerald-200/60 dark:border-emerald-500/20">Resolved</span>;
            case 'Cancelled':
                return <span className="px-3 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-bold text-xs rounded-md border border-slate-200 dark:border-zinc-700">Cancelled</span>;
            default:
                return <span className="px-3 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-bold text-xs rounded-md">{status}</span>;
        }
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'High':
                return <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> High</span>;
            case 'Normal':
                return <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Normal</span>;
            case 'Low':
                return <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Low</span>;
            default:
                return <span className="text-xs font-semibold text-slate-600 dark:text-zinc-400">{priority}</span>;
        }
    };

    return (
        <div className="w-full h-[calc(100vh-7rem)] flex flex-col gap-6 font-sans text-slate-900 dark:text-white overflow-hidden">
            
            {/* 1. Header Row */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 shrink-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
                        Maintenance Requests
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
                        Review repair tickets, dispatch technicians, and track resolution timelines.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => fetchRequests(true)}
                        disabled={isRefreshing}
                        className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-800 bg-card hover:bg-slate-50 dark:hover:bg-zinc-800/80 transition-colors flex items-center gap-2"
                        title="Refresh data"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-teal-600' : ''}`} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* 2. Metric Cards Row (Clean RentTrack 4-Card System) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 shrink-0">
                {/* Total Requests */}
                <motion.div variants={cardVariants} initial="hidden" animate="show" className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-sm font-semibold text-slate-500 dark:text-zinc-400">Total Requests</span>
                        <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                            <Wrench className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-baseline gap-2">
                            {metrics.total} <span className="text-xl font-medium">Tickets</span>
                        </div>
                        <p className="text-teal-600 font-semibold text-xs mt-2">
                            {metrics.pending + metrics.inProgress} currently open
                        </p>
                    </div>
                </motion.div>

                {/* Needs Review / Pending */}
                <motion.div variants={cardVariants} initial="hidden" animate="show" className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-sm font-semibold text-slate-500 dark:text-zinc-400">Needs Review</span>
                        <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                            <Clock className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-baseline gap-2">
                            {metrics.pending} <span className="text-xl font-medium">Pending</span>
                        </div>
                        <p className="text-amber-600 font-semibold text-xs mt-2">
                            Awaiting assignment
                        </p>
                    </div>
                </motion.div>

                {/* Dispatched / In Progress */}
                <motion.div variants={cardVariants} initial="hidden" animate="show" className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-sm font-semibold text-slate-500 dark:text-zinc-400">In Progress</span>
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                            <UserCheck className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-baseline gap-2">
                            {metrics.inProgress} <span className="text-xl font-medium">Dispatched</span>
                        </div>
                        <p className="text-blue-600 font-semibold text-xs mt-2">
                            Technicians assigned
                        </p>
                    </div>
                </motion.div>

                {/* Resolved */}
                <motion.div variants={cardVariants} initial="hidden" animate="show" className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-sm font-semibold text-slate-500 dark:text-zinc-400">Resolved</span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <CheckCircle className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-baseline gap-2">
                            {metrics.resolved} <span className="text-xl font-medium">Closed</span>
                        </div>
                        <p className="text-emerald-600 font-semibold text-xs mt-2">
                            {metrics.resolutionRate}% completion rate
                        </p>
                    </div>
                </motion.div>
            </div>

            {/* 3. Controls Toolbar (RentTrack CustomSelect system) */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-wrap">
                    {/* Search */}
                    <div className="relative w-full sm:w-64 flex items-center">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Search className="w-4 h-4" />
                        </div>
                        <input 
                            type="text" 
                            placeholder="Search requests..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-8 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-card text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 text-slate-400 hover:text-slate-600">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Status Filter */}
                    <div className="relative w-full sm:w-40 flex items-center">
                        <CustomSelect 
                            value={statusFilter}
                            onChange={(val) => setStatusFilter(val)}
                            options={[
                                "All Status",
                                "Pending",
                                "In Progress",
                                "Resolved",
                                "Cancelled"
                            ]}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-card text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        />
                    </div>

                    {/* Priority Filter */}
                    <div className="relative w-full sm:w-44 flex items-center">
                        <CustomSelect 
                            value={priorityFilter}
                            onChange={(val) => setPriorityFilter(val)}
                            options={[
                                "All Priorities",
                                "High",
                                "Normal",
                                "Low"
                            ]}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-card text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        />
                    </div>

                    {/* Category Filter */}
                    <div className="relative w-full sm:w-48 flex items-center">
                        <CustomSelect 
                            value={categoryFilter}
                            onChange={(val) => setCategoryFilter(val)}
                            options={[
                                "All Categories",
                                "Plumbing",
                                "Electrical",
                                "HVAC",
                                "Carpentry",
                                "Internet",
                                "Appliance",
                                "Other"
                            ]}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-card text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                        />
                    </div>
                </div>

                <div className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                    Showing <span className="font-bold text-slate-900 dark:text-white">{filteredRequests.length}</span> of {requests.length} work orders
                </div>
            </div>

            {/* 4. Main Data Table Card */}
            <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="overflow-auto flex-1 custom-scrollbar">
                    <table className="w-full text-left text-sm text-slate-700 dark:text-zinc-300 relative">
                        <thead className="bg-secondary border-b border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-500 dark:text-zinc-400 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Ticket ID</th>
                                <th className="px-6 py-4 font-semibold">Issue & Category</th>
                                <th className="px-6 py-4 font-semibold">Resident / Unit</th>
                                <th className="px-6 py-4 font-semibold">Priority</th>
                                <th className="px-6 py-4 font-semibold">Assigned Tech</th>
                                <th className="px-6 py-4 font-semibold">Schedule</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                                <th className="py-4 pl-6 pr-8 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                                        <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                        Loading work orders...
                                    </td>
                                </tr>
                            ) : filteredRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                                        No maintenance requests match your current filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredRequests.map((req) => {
                                    const CategoryIcon = getCategoryIcon(req.category);

                                    return (
                                        <tr 
                                            key={req.id} 
                                            className="hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors"
                                        >
                                            {/* Ticket ID */}
                                            <td className="px-6 py-4">
                                                <div className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                                                    #REQ-{req.id.toString().padStart(4, '0')}
                                                </div>
                                                <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                                                    {new Date(req.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                            </td>

                                            {/* Issue Title & Category */}
                                            <td className="px-6 py-4 max-w-[240px]">
                                                <div className="font-bold text-slate-900 dark:text-white truncate" title={req.title}>
                                                    {req.title}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 mt-1">
                                                    <CategoryIcon className="w-3.5 h-3.5 text-slate-400" />
                                                    <span>{req.category}</span>
                                                    {req.attachment_url && (
                                                        <span className="inline-flex items-center text-teal-600 dark:text-teal-400 text-[10px] ml-1" title="Photo attached">
                                                            <Paperclip className="w-3 h-3" />
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Resident & Room */}
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-slate-900 dark:text-white">
                                                    {req.tenant_name}
                                                </div>
                                                <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                                                    Room {req.room_number || 'N/A'}
                                                </div>
                                            </td>

                                            {/* Priority */}
                                            <td className="px-6 py-4">
                                                {getPriorityBadge(req.priority)}
                                            </td>

                                            {/* Assigned Tech */}
                                            <td className="px-6 py-4">
                                                {req.assigned_to ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-800 dark:text-zinc-200">
                                                        <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                                                        {req.assigned_to}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400 dark:text-zinc-500">Unassigned</span>
                                                )}
                                            </td>

                                            {/* Schedule Date */}
                                            <td className="px-6 py-4">
                                                {req.scheduled_date ? (
                                                    <div className="text-xs font-medium text-slate-800 dark:text-zinc-200 flex items-center gap-1">
                                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                        {new Date(req.scheduled_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400 dark:text-zinc-500">—</span>
                                                )}
                                            </td>

                                            {/* Status */}
                                            <td className="px-6 py-4">
                                                {getStatusBadge(req.status)}
                                            </td>

                                            {/* Action Buttons */}
                                            <td className="py-4 pl-6 pr-8 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button 
                                                        onClick={() => setViewingRequest(req)}
                                                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleOpenManage(req)}
                                                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                                                        title="Manage / Dispatch"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => setDeletingRequest(req)}
                                                        className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                                                        title="Delete Request"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
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

            {/* ============================================================== */}
            {/* VIEW REQUEST MODAL                                              */}
            {/* ============================================================== */}
            <AnimatePresence>
                {viewingRequest && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            onClick={() => setViewingRequest(null)}
                            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            className="relative w-full max-w-xl bg-card rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh] z-10"
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-slate-200 dark:border-zinc-800 bg-secondary/50 flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="font-mono text-xs font-bold text-slate-500 dark:text-zinc-400 bg-slate-200/60 dark:bg-zinc-800 px-2 py-0.5 rounded">
                                            #REQ-{viewingRequest.id.toString().padStart(4, '0')}
                                        </span>
                                        {getStatusBadge(viewingRequest.status)}
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                        {viewingRequest.title}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setViewingRequest(null)}
                                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                                
                                {/* Resident Info Card */}
                                <div className="p-4 rounded-xl bg-secondary/40 border border-slate-200/80 dark:border-zinc-800 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold flex items-center justify-center">
                                            {viewingRequest.tenant_name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-900 dark:text-white">
                                                {viewingRequest.tenant_name}
                                            </div>
                                            <div className="text-xs text-slate-500 dark:text-zinc-400">
                                                Assigned Room: <strong className="text-slate-800 dark:text-zinc-200">Room {viewingRequest.room_number || 'N/A'}</strong>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => router.push('/admin/chat')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 hover:bg-teal-100 transition-colors border border-teal-200 dark:border-teal-800/60"
                                    >
                                        <MessageSquare className="w-3.5 h-3.5" />
                                        <span>Chat</span>
                                    </button>
                                </div>

                                {/* Metadata Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    <div className="p-3 bg-secondary/30 rounded-lg border border-slate-200/60 dark:border-zinc-800/60">
                                        <div className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Category</div>
                                        <div className="text-xs font-bold text-slate-900 dark:text-white mt-1">{viewingRequest.category}</div>
                                    </div>
                                    <div className="p-3 bg-secondary/30 rounded-lg border border-slate-200/60 dark:border-zinc-800/60">
                                        <div className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Priority</div>
                                        <div className="mt-1">{getPriorityBadge(viewingRequest.priority)}</div>
                                    </div>
                                    <div className="p-3 bg-secondary/30 rounded-lg border border-slate-200/60 dark:border-zinc-800/60">
                                        <div className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Filed Date</div>
                                        <div className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                                            {new Date(viewingRequest.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block mb-1.5">
                                        Reported Problem Description
                                    </label>
                                    <div className="p-4 bg-secondary/30 rounded-xl border border-slate-200/80 dark:border-zinc-800 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                                        {viewingRequest.description}
                                    </div>
                                </div>

                                {/* Attachment Photo */}
                                {viewingRequest.attachment_url && (
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block mb-1.5">
                                            Attached Photographic Evidence
                                        </label>
                                        <div 
                                            onClick={() => setLightboxImage(getAttachmentUrl(viewingRequest.attachment_url))}
                                            className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-700 max-h-48 bg-zinc-950 cursor-pointer"
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img 
                                                src={getAttachmentUrl(viewingRequest.attachment_url) || ''} 
                                                alt="Attachment" 
                                                className="w-full h-44 object-contain"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold">
                                                <ZoomIn className="w-4 h-4" />
                                                <span>Click to Inspect Full Photo</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Dispatch Details */}
                                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-zinc-800">
                                    <div className="p-3 bg-secondary/30 rounded-lg border border-slate-200/60 dark:border-zinc-800/60">
                                        <div className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Assigned Tech</div>
                                        <div className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                                            {viewingRequest.assigned_to || 'None assigned'}
                                        </div>
                                    </div>
                                    <div className="p-3 bg-secondary/30 rounded-lg border border-slate-200/60 dark:border-zinc-800/60">
                                        <div className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Scheduled Date</div>
                                        <div className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                                            {viewingRequest.scheduled_date ? new Date(viewingRequest.scheduled_date).toLocaleDateString() : 'Not scheduled'}
                                        </div>
                                    </div>
                                </div>

                                {viewingRequest.admin_notes && (
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                                            Admin Work Notes
                                        </label>
                                        <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 border border-amber-200/60 dark:border-amber-900/40 rounded-lg text-xs leading-relaxed">
                                            {viewingRequest.admin_notes}
                                        </div>
                                    </div>
                                )}

                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 border-t border-slate-200 dark:border-zinc-800 bg-secondary/50 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-slate-400 font-semibold mr-1">Status:</span>
                                    {['Pending', 'In Progress', 'Resolved'].map(st => (
                                        <button
                                            key={st}
                                            onClick={() => {
                                                handleQuickStatus(viewingRequest.id, st);
                                                setViewingRequest(prev => prev ? { ...prev, status: st } : null);
                                            }}
                                            className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-all ${
                                                viewingRequest.status === st
                                                    ? 'bg-slate-900 text-white dark:bg-white dark:text-zinc-900 border-transparent shadow-xs'
                                                    : 'bg-card text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:bg-slate-100'
                                            }`}
                                        >
                                            {st}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={() => {
                                        const req = viewingRequest;
                                        setViewingRequest(null);
                                        handleOpenManage(req);
                                    }}
                                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                                >
                                    Manage & Dispatch
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ============================================================== */}
            {/* MANAGE & DISPATCH MODAL                                        */}
            {/* ============================================================== */}
            <AnimatePresence>
                {editingRequest && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            onClick={() => !isSubmitting && setEditingRequest(null)}
                            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            className="relative w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh] z-10"
                        >
                            <div className="p-5 border-b border-slate-200 dark:border-zinc-800 bg-secondary/50 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                    Manage Work Order #{editingRequest.id}
                                </h3>
                                <button
                                    onClick={() => !isSubmitting && setEditingRequest(null)}
                                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveManage} className="flex flex-col min-h-0">
                                <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                                    
                                    {/* Issue info banner */}
                                    <div className="p-3 bg-secondary/40 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs">
                                        <div className="font-bold text-slate-900 dark:text-white">{editingRequest.title}</div>
                                        <div className="text-slate-500 dark:text-zinc-400 mt-0.5">
                                            {editingRequest.tenant_name} • Room {editingRequest.room_number || 'N/A'} • {editingRequest.category}
                                        </div>
                                    </div>

                                    {/* Status & Priority Row */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                                                Status
                                            </label>
                                            <select
                                                value={manageForm.status}
                                                onChange={e => setManageForm({ ...manageForm, status: e.target.value })}
                                                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-card text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                                            >
                                                <option value="Pending">Pending</option>
                                                <option value="In Progress">In Progress</option>
                                                <option value="Resolved">Resolved</option>
                                                <option value="Cancelled">Cancelled</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                                                Priority
                                            </label>
                                            <select
                                                value={manageForm.priority}
                                                onChange={e => setManageForm({ ...manageForm, priority: e.target.value })}
                                                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-card text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                                            >
                                                <option value="Low">Low</option>
                                                <option value="Normal">Normal</option>
                                                <option value="High">High (Urgent)</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Assigned Technician */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                                            Assigned Technician / Contractor
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. In-House Maintenance, Dave (Plumber)"
                                            value={manageForm.assigned_to}
                                            onChange={e => setManageForm({ ...manageForm, assigned_to: e.target.value })}
                                            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-card text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                                        />
                                        <div className="flex items-center gap-1.5 flex-wrap mt-2">
                                            <span className="text-[11px] text-slate-400">Presets:</span>
                                            {CONTRACTOR_PRESETS.map(preset => (
                                                <button
                                                    type="button"
                                                    key={preset}
                                                    onClick={() => setManageForm({ ...manageForm, assigned_to: preset })}
                                                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-secondary hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 transition-colors"
                                                >
                                                    {preset}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Scheduled Date */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                                            Scheduled Service Date
                                        </label>
                                        <input
                                            type="date"
                                            value={manageForm.scheduled_date}
                                            onChange={e => setManageForm({ ...manageForm, scheduled_date: e.target.value })}
                                            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-card text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                                        />
                                    </div>

                                    {/* Work Notes */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 uppercase tracking-wider">
                                            Internal Resolution Notes
                                        </label>
                                        <textarea
                                            rows={3}
                                            placeholder="Add inspection notes, cost estimate, or parts replaced..."
                                            value={manageForm.admin_notes}
                                            onChange={e => setManageForm({ ...manageForm, admin_notes: e.target.value })}
                                            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-card text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none"
                                        />
                                    </div>

                                </div>

                                <div className="p-4 border-t border-slate-200 dark:border-zinc-800 bg-secondary/50 flex justify-end gap-2.5">
                                    <button
                                        type="button"
                                        disabled={isSubmitting}
                                        onClick={() => setEditingRequest(null)}
                                        className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-zinc-700 bg-card hover:bg-slate-100 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                                    >
                                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ============================================================== */}
            {/* DELETE MODAL                                                   */}
            {/* ============================================================== */}
            <AnimatePresence>
                {deletingRequest && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            onClick={() => !isDeleting && setDeletingRequest(null)}
                            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            className="relative w-full max-w-sm bg-card rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 p-5 space-y-4 z-10"
                        >
                            <div className="flex items-center gap-3 text-rose-600">
                                <div className="p-2 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900">
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-base font-bold text-slate-900 dark:text-white">Delete Ticket #{deletingRequest.id}?</h4>
                                    <p className="text-xs text-slate-500 dark:text-zinc-400">This action cannot be undone.</p>
                                </div>
                            </div>

                            <p className="text-xs text-slate-700 dark:text-zinc-300 font-medium bg-secondary/40 p-3 rounded-lg border border-slate-200/60 dark:border-zinc-800">
                                &quot;{deletingRequest.title}&quot; from {deletingRequest.tenant_name} (Room {deletingRequest.room_number || 'N/A'})
                            </p>

                            <div className="flex justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    disabled={isDeleting}
                                    onClick={() => setDeletingRequest(null)}
                                    className="px-3.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-zinc-700 bg-card hover:bg-slate-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={isDeleting}
                                    onClick={handleDeleteRequest}
                                    className="px-4 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-50"
                                >
                                    {isDeleting ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ============================================================== */}
            {/* LIGHTBOX MODAL                                                 */}
            {/* ============================================================== */}
            <AnimatePresence>
                {lightboxImage && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setLightboxImage(null)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <div className="relative max-w-3xl max-h-[85vh] bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl flex flex-col z-10">
                            <div className="p-3 bg-zinc-900 flex items-center justify-between text-white border-b border-zinc-800 text-xs">
                                <span className="font-semibold">Photographic Evidence</span>
                                <div className="flex items-center gap-2">
                                    <a
                                        href={lightboxImage}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1 text-zinc-400 hover:text-white rounded"
                                    >
                                        <Download className="w-4 h-4" />
                                    </a>
                                    <button onClick={() => setLightboxImage(null)} className="p-1 text-zinc-400 hover:text-white rounded">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-2 flex items-center justify-center bg-black max-h-[75vh] overflow-auto">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={lightboxImage} alt="Attachment" className="max-h-[70vh] w-auto object-contain rounded" />
                            </div>
                        </div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}
