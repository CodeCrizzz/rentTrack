"use client";
import { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { toast } from 'sonner';
import {
    Users,
    UserCheck,
    Clock,
    AlertCircle,
    Search,
    Building2,
    DoorOpen,
    RefreshCw,
    List,
    LayoutGrid,
    Phone,
    Mail,
    Calendar,
    Edit,
    Trash2,
    Eye,
    CheckCircle2,
    XCircle,
    X,
    ChevronRight,
    MapPin,
    CreditCard,
    DollarSign,
    Shield,
    ArrowUpRight,
    Check,
    AlertTriangle
} from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';

interface Tenant {
    id: number;
    name: string;
    email: string;
    phone: string;
    created_at: string;
    room_number: string | null;
    room_id: number | null;
    gender?: string;
    address?: string;
    id_document?: string;
    bed_space?: string;
    date_moved_in?: string;
    contract_end_date?: string;
    monthly_rent?: number;
    payment_status?: 'Paid' | 'Unpaid' | 'Overdue' | 'No Bills Yet' | 'N/A';
    last_payment_date?: string;
    balance?: number;
    status: 'Active' | 'Inactive' | 'Moved Out' | 'Pending' | 'Declined';
}

interface Room {
    id: number;
    room_number: string;
    status: string;
    capacity: number;
}

const cardVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } }
};

export default function AdminTenants() {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Pending' | 'Overdue' | 'Moved Out'>('All');
    const [roomFilter, setRoomFilter] = useState('All Rooms');
    const [sortFilter, setSortFilter] = useState('Newest First');
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
    const [error, setError] = useState('');

    // --- MODAL & FORM STATES ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
    const [viewingTenant, setViewingTenant] = useState<Tenant | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState<number | null>(null);
    const [isStatusUpdating, setIsStatusUpdating] = useState<number | null>(null);
    const [confirmStatus, setConfirmStatus] = useState<{ id: number; name: string; action: 'Approve' | 'Reject' } | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        room_id: '' as string | number,
        address: '',
        gender: '',
        monthly_rent: '',
        date_moved_in: '',
        contract_end_date: '',
        status: 'Pending'
    });

    const fetchTenants = async (showToast = false) => {
        if (showToast) setIsRefreshing(true);
        try {
            const { data } = await api.get('/admin/tenants');
            const enrichedData: Tenant[] = data.map((t: any) => ({
                ...t,
                gender: t.gender || 'Not Specified',
                address: t.address || '',
                id_document: t.id_document ? 'Verified' : 'Pending',
                bed_space: t.bed_space || 'N/A',
                date_moved_in: t.date_moved_in ? new Date(t.date_moved_in).toISOString().split('T')[0] : '',
                contract_end_date: t.contract_end_date ? new Date(t.contract_end_date).toISOString().split('T')[0] : '',
                monthly_rent: t.monthly_rent || 0,
                payment_status: t.balance == null ? 'No Bills Yet' : Number(t.balance) > 0 ? 'Overdue' : 'Paid',
                last_payment_date: t.last_payment_date || 'N/A',
                balance: Number(t.balance) || 0,
                status: t.status || (t.room_number ? 'Active' : 'Pending')
            }));

            setTenants(enrichedData);
            if (showToast) toast.success('Resident records synchronized');
        } catch (err: any) {
            console.error("Failed to fetch tenants:", err);
            setError("Failed to load residents list.");
            if (showToast) toast.error("Failed to refresh residents.");
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    const fetchRooms = async () => {
        try {
            const { data } = await api.get('/admin/rooms');
            setRooms(data);
        } catch (err: any) {
            console.error("Failed to fetch rooms:", err);
        }
    };

    useEffect(() => {
        fetchTenants();
        fetchRooms();
    }, []);

    const handleOpenModal = (tenant: Tenant, intention: 'approve' | 'edit' = 'edit') => {
        setEditingTenant(tenant);
        setFormData({
            name: tenant.name,
            email: tenant.email,
            phone: tenant.phone || '',
            password: '',
            room_id: tenant.room_id?.toString() ?? '',
            address: tenant.address || '',
            gender: tenant.gender || '',
            monthly_rent: tenant.monthly_rent?.toString() || '',
            date_moved_in: tenant.date_moved_in || '',
            contract_end_date: tenant.contract_end_date || '',
            status: intention === 'approve' ? 'Active' : tenant.status
        });
        setError('');
        setIsModalOpen(true);
    };

    const handleViewTenant = (tenant: Tenant) => {
        setViewingTenant(tenant);
        setIsViewModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            if (editingTenant) {
                await api.put(`/admin/tenants/${editingTenant.id}`, formData);
                toast.success('Resident updated successfully');
            } else {
                await api.post('/admin/tenants', formData);
                toast.success('Resident registered successfully');
            }
            setIsModalOpen(false);
            fetchTenants();
        } catch (err: any) {
            const errMsg = err.response?.data?.message || "Operation failed. Please check your data.";
            setError(errMsg);
            toast.error(errMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteTenant = async (id: number) => {
        if (!window.confirm("Are you sure you want to remove this resident? This action cannot be undone.")) return;

        setIsDeleting(id);
        setError('');

        try {
            await api.delete(`/admin/tenants/${id}`);
            toast.success('Resident record deleted');
            setTenants((prev) => prev.filter((tenant) => tenant.id !== id));
            if (viewingTenant?.id === id) setIsViewModalOpen(false);
        } catch (err: any) {
            console.error("Failed to delete tenant:", err);
            const errMsg = "Cannot delete resident with recorded payment dependencies.";
            setError(errMsg);
            toast.error(errMsg);
        } finally {
            setIsDeleting(null);
        }
    };

    const handleUpdateStatusClick = (tenant: Tenant, action: 'Approve' | 'Reject') => {
        setConfirmStatus({ id: tenant.id, name: tenant.name, action });
    };

    const executeStatusUpdate = async () => {
        if (!confirmStatus) return;
        setIsStatusUpdating(confirmStatus.id);
        setError('');
        try {
            const status = confirmStatus.action === 'Approve' ? 'Active' : 'Declined';
            await api.put(`/admin/tenants/${confirmStatus.id}`, { status });
            toast.success(`Resident application ${confirmStatus.action === 'Approve' ? 'approved' : 'declined'} successfully!`);
            fetchTenants();
            if (viewingTenant?.id === confirmStatus.id) {
                setViewingTenant(prev => prev ? { ...prev, status } : null);
            }
        } catch (err: any) {
            console.error(`Failed to update status:`, err);
            toast.error(`Failed to update resident status.`);
        } finally {
            setIsStatusUpdating(null);
            setConfirmStatus(null);
        }
    };

    // --- COMPUTED METRICS ---
    const metrics = useMemo(() => {
        const total = tenants.length;
        const totalBeds = rooms.reduce((acc, r) => acc + (r.capacity || 0), 0);
        const activeTenants = tenants.filter(t => t.status === 'Active');
        const activeCount = activeTenants.length;
        const capacityPercent = totalBeds > 0 ? Math.round((activeCount / totalBeds) * 100) : 0;
        const pendingCount = tenants.filter(t => t.status === 'Pending').length;
        const overdueTenants = tenants.filter(t => t.payment_status === 'Overdue' || (Number(t.balance) || 0) > 0);
        const overdueCount = overdueTenants.length;
        const totalUnpaid = overdueTenants.reduce((acc, t) => acc + (Number(t.balance) || 0), 0);
        const movedOutCount = tenants.filter(t => t.status === 'Moved Out').length;

        return {
            total,
            totalBeds,
            activeCount,
            capacityPercent,
            pendingCount,
            overdueCount,
            totalUnpaid,
            movedOutCount
        };
    }, [tenants, rooms]);

    // --- FILTERED & SORTED LIST ---
    const uniqueRooms = useMemo(() => {
        const nums = Array.from(new Set(rooms.map(r => r.room_number))).filter(Boolean);
        return nums.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }, [rooms]);

    const filteredTenants = useMemo(() => {
        return tenants.filter(t => {
            // Status Category Filter
            if (statusFilter === 'Active' && t.status !== 'Active') return false;
            if (statusFilter === 'Pending' && t.status !== 'Pending') return false;
            if (statusFilter === 'Moved Out' && t.status !== 'Moved Out') return false;
            if (statusFilter === 'Overdue') {
                if (t.payment_status !== 'Overdue' && (Number(t.balance) || 0) <= 0) return false;
            }

            // Room Filter
            if (roomFilter !== 'All Rooms') {
                const targetRoom = roomFilter.replace('Room ', '').trim();
                if (t.room_number !== targetRoom) return false;
            }

            // Search Query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchesName = t.name.toLowerCase().includes(q);
                const matchesEmail = t.email.toLowerCase().includes(q);
                const matchesPhone = t.phone ? t.phone.toLowerCase().includes(q) : false;
                const matchesRoom = t.room_number ? t.room_number.toString().toLowerCase().includes(q) : false;
                const matchesBed = t.bed_space ? t.bed_space.toLowerCase().includes(q) : false;
                if (!matchesName && !matchesEmail && !matchesPhone && !matchesRoom && !matchesBed) {
                    return false;
                }
            }

            return true;
        }).sort((a, b) => {
            if (sortFilter === 'Name (A-Z)') return a.name.localeCompare(b.name);
            if (sortFilter === 'Name (Z-A)') return b.name.localeCompare(a.name);
            if (sortFilter === 'Room (0-9)') {
                if (!a.room_number) return 1;
                if (!b.room_number) return -1;
                return a.room_number.localeCompare(b.room_number, undefined, { numeric: true });
            }
            if (sortFilter === 'Highest Balance') {
                return (Number(b.balance) || 0) - (Number(a.balance) || 0);
            }
            if (sortFilter === 'Oldest First') {
                const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                return dateA - dateB;
            }
            // 'Newest First' default
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return dateB - dateA;
        });
    }, [tenants, statusFilter, roomFilter, searchQuery, sortFilter]);

    // Status Pill Style Helper
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Active':
                return {
                    label: 'Active Resident',
                    className: 'text-emerald-600 dark:text-emerald-400',
                    dot: 'bg-emerald-500'
                };
            case 'Pending':
                return {
                    label: 'Pending Approval',
                    className: 'text-amber-600 dark:text-amber-400',
                    dot: 'bg-amber-500 animate-pulse'
                };
            case 'Declined':
                return {
                    label: 'Application Declined',
                    className: 'text-rose-600 dark:text-rose-400',
                    dot: 'bg-rose-500'
                };
            case 'Moved Out':
                return {
                    label: 'Moved Out',
                    className: 'text-slate-600 dark:text-zinc-400',
                    dot: 'bg-slate-400'
                };
            default:
                return {
                    label: status,
                    className: 'text-slate-600 dark:text-zinc-400',
                    dot: 'bg-slate-400'
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
                            <div className="h-6 w-44 bg-slate-200 dark:bg-zinc-800 rounded-md"></div>
                            <div className="h-5 w-24 bg-slate-200 dark:bg-zinc-800 rounded-full"></div>
                        </div>
                        <div className="h-3.5 w-72 bg-slate-200 dark:bg-zinc-800 rounded-md mt-1.5"></div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="h-8 w-28 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                        <div className="h-8 w-20 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                    </div>
                </div>

                {/* 2. Executive Metric Ribbon */}
                <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3 shadow-xs flex items-center justify-between">
                            <div className="space-y-1.5 flex-1">
                                <div className="h-2.5 w-24 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                                <div className="h-6 w-32 bg-slate-200 dark:bg-zinc-800 rounded-md"></div>
                                <div className="h-2.5 w-20 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 shrink-0"></div>
                        </div>
                    ))}
                </div>

                {/* 3. Triage Status Tabs & Search Strip */}
                <div className="shrink-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-2 shadow-xs">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div className="flex items-center gap-1 overflow-x-auto">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-7 w-24 bg-slate-100 dark:bg-zinc-800 rounded-md"></div>
                            ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="h-7 w-48 bg-slate-100 dark:bg-zinc-800 rounded-lg"></div>
                            <div className="h-7 w-28 bg-slate-100 dark:bg-zinc-800 rounded-lg"></div>
                            <div className="h-7 w-28 bg-slate-100 dark:bg-zinc-800 rounded-lg"></div>
                        </div>
                    </div>
                </div>

                {/* 4. Main Residents Ledger */}
                <div className="flex-1 min-h-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs flex flex-col">
                    <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                        <table className="w-full min-w-full text-left text-xs border-collapse">
                            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-zinc-800 shadow-xs">
                                <tr className="h-10 text-slate-700 dark:text-zinc-300 uppercase tracking-wider text-[11px] font-bold">
                                    <th className="py-2.5 px-4"><div className="h-3 w-28 bg-slate-200 dark:bg-zinc-700 rounded"></div></th>
                                    <th className="py-2.5 px-3"><div className="h-3 w-20 bg-slate-200 dark:bg-zinc-700 rounded"></div></th>
                                    <th className="py-2.5 px-4"><div className="h-3 w-24 bg-slate-200 dark:bg-zinc-700 rounded"></div></th>
                                    <th className="py-2.5 px-3 text-right"><div className="h-3 w-16 bg-slate-200 dark:bg-zinc-700 rounded ml-auto"></div></th>
                                    <th className="py-2.5 px-3 text-center"><div className="h-3 w-20 bg-slate-200 dark:bg-zinc-700 rounded mx-auto"></div></th>
                                    <th className="py-2.5 px-3 text-center"><div className="h-3 w-20 bg-slate-200 dark:bg-zinc-700 rounded mx-auto"></div></th>
                                    <th className="py-2.5 px-4 text-right"><div className="h-3 w-16 bg-slate-200 dark:bg-zinc-700 rounded ml-auto"></div></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 font-sans">
                                {[...Array(7)].map((_, i) => (
                                    <tr key={i} className="h-12">
                                        <td className="py-2 px-4">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-800 shrink-0"></div>
                                                <div className="space-y-1">
                                                    <div className="h-3.5 w-28 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                                                    <div className="h-2.5 w-36 bg-slate-100 dark:bg-zinc-800/60 rounded"></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-2 px-3"><div className="h-5 w-20 bg-slate-100 dark:bg-zinc-800 rounded-full"></div></td>
                                        <td className="py-2 px-4"><div className="h-3.5 w-24 bg-slate-100 dark:bg-zinc-800 rounded"></div></td>
                                        <td className="py-2 px-3 text-right"><div className="h-3.5 w-16 bg-slate-100 dark:bg-zinc-800 rounded ml-auto"></div></td>
                                        <td className="py-2 px-3 text-center"><div className="h-5 w-20 bg-slate-100 dark:bg-zinc-800 rounded-full mx-auto"></div></td>
                                        <td className="py-2 px-3 text-center"><div className="h-5 w-20 bg-slate-100 dark:bg-zinc-800 rounded-full mx-auto"></div></td>
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
                            Manage Tenants
                        </h1>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">
                            {filteredTenants.length} of {tenants.length} listed
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                        Resident registry, bedspace placements, onboarding approvals, and financial ledger status.
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
                            title="Resident cards"
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            <span>Cards</span>
                        </button>
                    </div>

                    {/* Refresh Sync Button */}
                    <button
                        onClick={() => fetchTenants(true)}
                        disabled={isRefreshing}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-800 bg-card hover:bg-slate-50 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5 shadow-xs"
                        title="Sync resident records"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-600' : ''}`} />
                        <span>{isRefreshing ? 'Syncing...' : 'Sync'}</span>
                    </button>
                </div>
            </div>

            {/* 2. Executive Metric Ribbon (4 Compact KPI Tiles) */}
            <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                
                {/* Metric 1: Total Residents */}
                <motion.div variants={cardVariants} initial="hidden" animate="show" className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Registered Residents</span>
                        <div className="text-xl font-extrabold font-mono text-slate-900 dark:text-white mt-0.5 flex items-baseline gap-1.5">
                            {metrics.total} <span className="text-xs font-sans font-medium text-slate-500">Tenants</span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">
                            {metrics.activeCount} active • {metrics.movedOutCount} departed
                        </p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-200/50 dark:border-cyan-500/20">
                        <Users className="w-4 h-4" />
                    </div>
                </motion.div>

                {/* Metric 2: Facility Occupancy Density */}
                <motion.div variants={cardVariants} initial="hidden" animate="show" className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3 shadow-xs flex items-center justify-between">
                    <div className="flex-1 pr-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Facility Density</span>
                            <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">{metrics.capacityPercent}%</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden my-1">
                            <div 
                                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                                style={{ width: `${Math.min(100, Math.max(0, metrics.capacityPercent))}%` }}
                            />
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-zinc-400 truncate">
                            {metrics.activeCount} of {metrics.totalBeds} total bedspaces filled
                        </p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/50 dark:border-emerald-500/20">
                        <Building2 className="w-4 h-4" />
                    </div>
                </motion.div>

                {/* Metric 3: Pending Onboarding Approvals */}
                <motion.div 
                    variants={cardVariants} 
                    initial="hidden" 
                    animate="show" 
                    onClick={() => setStatusFilter(statusFilter === 'Pending' ? 'All' : 'Pending')}
                    className={`bg-card border rounded-xl p-3 shadow-xs flex items-center justify-between cursor-pointer transition-all ${metrics.pendingCount > 0 ? 'border-amber-300 dark:border-amber-500/40 bg-amber-50/20 dark:bg-amber-500/5' : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300'}`}
                >
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Pending Approvals</span>
                            {metrics.pendingCount > 0 && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                            )}
                        </div>
                        <div className="text-xl font-extrabold font-mono text-amber-600 dark:text-amber-400 mt-0.5 flex items-baseline gap-1.5">
                            {metrics.pendingCount} <span className="text-xs font-sans font-medium text-slate-500">Applications</span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">
                            {metrics.pendingCount > 0 ? 'Requires onboarding triage' : 'All applications triaged'}
                        </p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200/50 dark:border-amber-500/20">
                        <Clock className="w-4 h-4" />
                    </div>
                </motion.div>

                {/* Metric 4: Delinquent / Overdue Ledger */}
                <motion.div 
                    variants={cardVariants} 
                    initial="hidden" 
                    animate="show" 
                    onClick={() => setStatusFilter(statusFilter === 'Overdue' ? 'All' : 'Overdue')}
                    className={`bg-card border rounded-xl p-3 shadow-xs flex items-center justify-between cursor-pointer transition-all ${metrics.overdueCount > 0 ? 'border-rose-300 dark:border-rose-500/40 bg-rose-50/20 dark:bg-rose-500/5' : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300'}`}
                >
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Arrears & Overdue</span>
                        <div className={`text-xl font-extrabold font-mono mt-0.5 flex items-baseline gap-1.5 ${metrics.overdueCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            ₱{metrics.totalUnpaid.toLocaleString()}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">
                            {metrics.overdueCount > 0 ? `${metrics.overdueCount} accounts past due date` : 'Zero delinquent accounts'}
                        </p>
                    </div>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${metrics.overdueCount > 0 ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200/50 dark:border-rose-500/20' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-500/20'}`}>
                        <AlertCircle className="w-4 h-4" />
                    </div>
                </motion.div>

            </div>

            {/* 3. Triage Status Category Filters & Controls */}
            <div className="shrink-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 shadow-xs space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    
                    {/* Status Pill Filters */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0 text-xs font-semibold custom-scrollbar">
                        <button
                            onClick={() => setStatusFilter('All')}
                            className={`px-3 py-1 rounded-lg transition-all shrink-0 flex items-center gap-1.5 ${statusFilter === 'All' ? 'bg-slate-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs' : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'}`}
                        >
                            <span>All Residents</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${statusFilter === 'All' ? 'bg-white/20 text-white dark:bg-black/20 dark:text-zinc-900' : 'bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300'}`}>
                                {tenants.length}
                            </span>
                        </button>
                        <button
                            onClick={() => setStatusFilter('Active')}
                            className={`px-3 py-1 rounded-lg transition-all shrink-0 flex items-center gap-1.5 ${statusFilter === 'Active' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'}`}
                        >
                            <span>Active Occupants</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${statusFilter === 'Active' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300'}`}>
                                {metrics.activeCount}
                            </span>
                        </button>
                        <button
                            onClick={() => setStatusFilter('Pending')}
                            className={`px-3 py-1 rounded-lg transition-all shrink-0 flex items-center gap-1.5 ${statusFilter === 'Pending' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'}`}
                        >
                            <span>Pending Approval</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${statusFilter === 'Pending' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300'}`}>
                                {metrics.pendingCount}
                            </span>
                        </button>
                        <button
                            onClick={() => setStatusFilter('Overdue')}
                            className={`px-3 py-1 rounded-lg transition-all shrink-0 flex items-center gap-1.5 ${statusFilter === 'Overdue' ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'}`}
                        >
                            <span>Overdue Accounts</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${statusFilter === 'Overdue' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300'}`}>
                                {metrics.overdueCount}
                            </span>
                        </button>
                        <button
                            onClick={() => setStatusFilter('Moved Out')}
                            className={`px-3 py-1 rounded-lg transition-all shrink-0 flex items-center gap-1.5 ${statusFilter === 'Moved Out' ? 'bg-slate-700 text-white shadow-xs' : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'}`}
                        >
                            <span>Departed</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${statusFilter === 'Moved Out' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300'}`}>
                                {metrics.movedOutCount}
                            </span>
                        </button>
                    </div>

                    <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium shrink-0">
                        {filteredTenants.length} matching criteria
                    </span>
                </div>

                {/* Secondary Search & Dropdown Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1.5 border-t border-slate-100 dark:border-zinc-800/80">
                    {/* Search Input */}
                    <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search resident name, email, phone, room #..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-8 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-cyan-500/20"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Room Filter Dropdown */}
                    <CustomSelect
                        value={roomFilter}
                        onChange={(val) => setRoomFilter(val)}
                        options={["All Rooms", ...uniqueRooms.map(r => `Room ${r}`)]}
                        className="w-full px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 text-slate-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-cyan-500/20"
                    />

                    {/* Sort Filter Dropdown */}
                    <CustomSelect
                        value={sortFilter}
                        onChange={(val) => setSortFilter(val)}
                        options={["Newest First", "Oldest First", "Name (A-Z)", "Name (Z-A)", "Room (0-9)", "Highest Balance"]}
                        className="w-full px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 text-slate-700 dark:text-zinc-300 outline-none focus:ring-2 focus:ring-cyan-500/20"
                    />
                </div>
            </div>

            {/* 4. Main Inventory Data: Operations Table or Directory Cards */}
            {viewMode === 'table' ? (
                <div className="flex-1 min-h-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xs flex flex-col overflow-hidden relative">
                    {/* Top-Right scrollbar header filler to eliminate the gap */}
                    <div className="absolute top-0 right-0 w-8 h-[38px] bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700 z-30 pointer-events-none rounded-tr-xl" />

                    <div className="flex-1 min-h-0 overflow-y-scroll overflow-x-auto custom-scrollbar">
                        <table className="w-full min-w-full text-left text-xs border-collapse">
                            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-zinc-800 shadow-xs">
                                <tr className="h-[38px] bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 uppercase tracking-wider text-[11px] font-bold">
                                    <th className="py-2 px-6 bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Resident Profile</th>
                                    <th className="py-2 px-4 bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Room & Bedspace</th>
                                    <th className="py-2 px-4 bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Contact Details</th>
                                    <th className="py-2 px-4 bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Stay Policy</th>
                                    <th className="py-2 px-4 bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Ledger Balance</th>
                                    <th className="py-2 px-4 bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Status</th>
                                    <th className="py-2 px-6 text-right bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                                {filteredTenants.map((tenant) => {
                                    const badge = getStatusBadge(tenant.status);
                                    const hasOverdue = (Number(tenant.balance) || 0) > 0;

                                    return (
                                        <tr key={tenant.id} className="h-[52px] hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors">
                                            {/* Resident Profile */}
                                            <td className="py-2 px-6">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 font-bold flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-zinc-700 text-xs">
                                                        {tenant.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate block">
                                                            {tenant.name}
                                                        </span>
                                                        <p className="text-[10px] text-slate-400 dark:text-zinc-500 truncate">
                                                            {tenant.gender !== 'Not Specified' ? tenant.gender : 'Resident'} • ID #{tenant.id}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Room & Placement */}
                                            <td className="py-2 px-4">
                                                {tenant.room_number ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-slate-200/60 dark:border-zinc-700 font-mono">
                                                            Room {tenant.room_number}
                                                        </span>
                                                        {tenant.bed_space && tenant.bed_space !== 'N/A' && (
                                                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-200/50 dark:border-cyan-500/20">
                                                                {tenant.bed_space}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-zinc-800/60 text-slate-400 dark:text-zinc-500">
                                                        Unassigned
                                                    </span>
                                                )}
                                            </td>

                                            {/* Contact Details */}
                                            <td className="py-2 px-4">
                                                <div className="flex flex-col text-[11px] leading-tight">
                                                    {tenant.phone ? (
                                                        <a 
                                                            href={`tel:${tenant.phone}`} 
                                                            className="text-slate-700 dark:text-zinc-300 hover:text-cyan-600 dark:hover:text-cyan-400 flex items-center gap-1 font-mono font-medium truncate"
                                                        >
                                                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                                            {tenant.phone}
                                                        </a>
                                                    ) : (
                                                        <span className="text-slate-400 dark:text-zinc-500 italic">No phone</span>
                                                    )}
                                                    <a 
                                                        href={`mailto:${tenant.email}`} 
                                                        className="text-slate-500 dark:text-zinc-400 hover:underline truncate mt-0.5"
                                                    >
                                                        {tenant.email}
                                                    </a>
                                                </div>
                                            </td>

                                            {/* Stay Policy (Boarding House - Leave Anytime) */}
                                            <td className="py-2 px-4">
                                                <div className="text-[11px] leading-tight">
                                                    <span className="font-semibold text-slate-800 dark:text-zinc-200 block">
                                                        {tenant.date_moved_in 
                                                            ? new Date(tenant.date_moved_in).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                                                            : (tenant.created_at ? new Date(tenant.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A')}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                                                        Flexible Stay (Leave Anytime)
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Financial Ledger Balance */}
                                            <td className="py-2 px-4">
                                                <div>
                                                    <div className="font-mono font-bold text-xs flex items-baseline gap-1">
                                                        <span className={hasOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                                                            ₱{Number(tenant.balance || 0).toLocaleString()}
                                                        </span>
                                                        <span className="text-[10px] font-sans font-medium text-slate-400">
                                                            {hasOverdue ? 'Overdue' : 'Balance'}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">
                                                        Rent: ₱{Number(tenant.monthly_rent || 0).toLocaleString()}/mo
                                                    </p>
                                                </div>
                                            </td>

                                            {/* Status Badge */}
                                            <td className="py-2 px-4">
                                                <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${badge.className}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                                                    {badge.label}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="py-2 px-6 text-right">
                                                {tenant.status === 'Pending' ? (
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            onClick={() => handleUpdateStatusClick(tenant, 'Approve')}
                                                            disabled={isStatusUpdating === tenant.id}
                                                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1 shadow-xs"
                                                        >
                                                            <Check className="w-3 h-3 stroke-[3]" />
                                                            <span>Approve</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdateStatusClick(tenant, 'Reject')}
                                                            disabled={isStatusUpdating === tenant.id}
                                                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors"
                                                        >
                                                            <span>Decline</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleViewTenant(tenant)}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                                                            title="Inspect resident details"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={() => handleViewTenant(tenant)}
                                                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-zinc-700 bg-card hover:bg-slate-50 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 transition-colors flex items-center gap-1"
                                                        >
                                                            <Eye className="w-3 h-3 text-slate-400" />
                                                            <span>View</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenModal(tenant, 'edit')}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                                                            title="Edit resident profile"
                                                        >
                                                            <Edit className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteTenant(tenant.id)}
                                                            disabled={isDeleting === tenant.id}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                                                            title="Delete resident"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}

                                {filteredTenants.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center">
                                            <Users className="w-8 h-8 text-slate-300 dark:text-zinc-700 mx-auto mb-2" />
                                            <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                                No residents found
                                            </p>
                                            <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">
                                                Try adjusting your filter category or search keywords.
                                            </p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* Directory Cards (Grid View) */
                <div className="flex-1 min-h-0 overflow-y-scroll custom-scrollbar pr-0.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                        {filteredTenants.map((tenant) => {
                            const badge = getStatusBadge(tenant.status);
                            const hasOverdue = (Number(tenant.balance) || 0) > 0;

                            return (
                                <motion.div
                                    key={tenant.id}
                                    variants={cardVariants}
                                    initial="hidden"
                                    animate="show"
                                    className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between"
                                >
                                    <div>
                                        {/* Card Header */}
                                        <div className="flex items-start justify-between gap-2 mb-2.5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 font-bold flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-zinc-700 text-xs">
                                                    {tenant.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate block">
                                                        {tenant.name}
                                                    </span>
                                                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 truncate">
                                                        ID #{tenant.id} • {tenant.gender || 'Tenant'}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold shrink-0 ${badge.className}`}>
                                                <span className={`w-1 h-1 rounded-full ${badge.dot}`} />
                                                {tenant.status}
                                            </span>
                                        </div>

                                        {/* Room & Placement Pill */}
                                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-zinc-900/40 border border-slate-100 dark:border-zinc-800/80 mb-2.5 flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-1.5 font-mono">
                                                <DoorOpen className="w-3.5 h-3.5 text-slate-400" />
                                                <span className="font-bold text-slate-800 dark:text-zinc-200">
                                                    {tenant.room_number ? `Room ${tenant.room_number}` : 'Unassigned'}
                                                </span>
                                                {tenant.bed_space && tenant.bed_space !== 'N/A' && (
                                                    <span className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-400">
                                                        • {tenant.bed_space}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                                                Flexible Stay
                                            </span>
                                        </div>

                                        {/* Contact & Financial Data */}
                                        <div className="space-y-1 text-[11px] mb-3">
                                            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400">
                                                <span>Phone</span>
                                                <span className="font-mono font-medium text-slate-700 dark:text-zinc-300">
                                                    {tenant.phone || 'N/A'}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400">
                                                <span>Balance</span>
                                                <span className={`font-mono font-bold ${hasOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                    ₱{Number(tenant.balance || 0).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400">
                                                <span>Monthly Rent</span>
                                                <span className="font-mono text-slate-700 dark:text-zinc-300">
                                                    ₱{Number(tenant.monthly_rent || 0).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Action Buttons */}
                                    <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between gap-1.5">
                                        {tenant.status === 'Pending' ? (
                                            <>
                                                <button
                                                    onClick={() => handleUpdateStatusClick(tenant, 'Approve')}
                                                    className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center justify-center gap-1 shadow-xs"
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                    <span>Approve</span>
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateStatusClick(tenant, 'Reject')}
                                                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors"
                                                >
                                                    Decline
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => handleViewTenant(tenant)}
                                                    className="flex-1 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-zinc-700 bg-card hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors flex items-center justify-center gap-1"
                                                >
                                                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                                                    <span>View</span>
                                                </button>
                                                <button
                                                    onClick={() => handleOpenModal(tenant, 'edit')}
                                                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors flex items-center gap-1"
                                                >
                                                    <Edit className="w-3.5 h-3.5 text-slate-400" />
                                                    <span>Edit</span>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 5. RESIDENT DETAIL MODAL (Clean, Non-AI-Slop Executive Drawer) */}
            <AnimatePresence>
                {isViewModalOpen && viewingTenant && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-xl flex flex-col max-h-[90vh]"
                        >
                            {/* Modal Header */}
                            <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-zinc-900/40">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 font-bold text-sm flex items-center justify-center border border-slate-200/80 dark:border-zinc-700 shadow-xs">
                                        {viewingTenant.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                                {viewingTenant.name}
                                            </h2>
                                            {(() => {
                                                const badge = getStatusBadge(viewingTenant.status);
                                                return (
                                                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${badge.className}`}>
                                                        <span className={`w-1 h-1 rounded-full ${badge.dot}`} />
                                                        {viewingTenant.status}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                        <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                                            Resident ID #{viewingTenant.id} • Registered {viewingTenant.created_at ? new Date(viewingTenant.created_at).toLocaleDateString() : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsViewModalOpen(false)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 overflow-y-auto custom-scrollbar space-y-5">
                                
                                {/* Top 3 Financial KPI Tiles */}
                                <div className="grid grid-cols-3 gap-2.5">
                                    <div className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">Monthly Rent</span>
                                        <span className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5 block">
                                            ₱{Number(viewingTenant.monthly_rent || 0).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">Current Balance</span>
                                        <span className={`text-lg font-bold font-mono mt-0.5 block ${(Number(viewingTenant.balance) || 0) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                            ₱{Number(viewingTenant.balance || 0).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">Last Payment</span>
                                        <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 mt-1 block truncate">
                                            {viewingTenant.last_payment_date}
                                        </span>
                                    </div>
                                </div>

                                {/* Information Sections */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Section 1: Contact & Personal Details */}
                                    <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-3">
                                        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                                            <Users className="w-3.5 h-3.5 text-cyan-600" />
                                            <span>Personal Profile</span>
                                        </h3>
                                        <div className="space-y-2 text-xs">
                                            <div>
                                                <span className="text-[10px] font-bold uppercase text-slate-400 block">Email Address</span>
                                                <a href={`mailto:${viewingTenant.email}`} className="font-medium text-cyan-600 dark:text-cyan-400 hover:underline">
                                                    {viewingTenant.email}
                                                </a>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold uppercase text-slate-400 block">Phone Number</span>
                                                <span className="font-mono font-medium text-slate-800 dark:text-zinc-200">
                                                    {viewingTenant.phone || 'None provided'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold uppercase text-slate-400 block">Gender</span>
                                                <span className="text-slate-800 dark:text-zinc-200 font-medium">
                                                    {viewingTenant.gender || 'Not specified'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold uppercase text-slate-400 block">Permanent Address</span>
                                                <span className="text-slate-700 dark:text-zinc-300">
                                                    {viewingTenant.address || 'No address logged'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 2: Boarding House Placement */}
                                    <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-3">
                                        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                                            <DoorOpen className="w-3.5 h-3.5 text-cyan-600" />
                                            <span>Boarding Placement</span>
                                        </h3>
                                        <div className="space-y-2 text-xs">
                                            <div>
                                                <span className="text-[10px] font-bold uppercase text-slate-400 block">Assigned Room</span>
                                                <span className="font-bold text-slate-900 dark:text-white font-mono">
                                                    {viewingTenant.room_number ? `Room ${viewingTenant.room_number}` : 'Unassigned'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold uppercase text-slate-400 block">Assigned Bedspace</span>
                                                <span className="font-semibold text-slate-800 dark:text-zinc-200">
                                                    {viewingTenant.bed_space || 'N/A'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold uppercase text-slate-400 block">Move-In Date</span>
                                                <span className="text-slate-800 dark:text-zinc-200 font-medium">
                                                    {viewingTenant.date_moved_in || 'Pending move-in'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold uppercase text-slate-400 block">Tenancy Terms</span>
                                                <div className="p-2 rounded-lg bg-slate-50 dark:bg-zinc-900/50 border border-slate-100 dark:border-zinc-800 text-[11px] text-slate-600 dark:text-zinc-400">
                                                    Flexible month-to-month stay. Residents may leave anytime without a fixed-term contract.
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-4 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-zinc-900/20">
                                <button
                                    onClick={() => handleDeleteTenant(viewingTenant.id)}
                                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors flex items-center gap-1.5"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete Resident</span>
                                </button>

                                <div className="flex items-center gap-2">
                                    {viewingTenant.status === 'Pending' && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    setIsViewModalOpen(false);
                                                    handleUpdateStatusClick(viewingTenant, 'Approve');
                                                }}
                                                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1"
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                                <span>Approve</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsViewModalOpen(false);
                                                    handleUpdateStatusClick(viewingTenant, 'Reject');
                                                }}
                                                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors"
                                            >
                                                Decline
                                            </button>
                                        </>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const t = viewingTenant;
                                            setIsViewModalOpen(false);
                                            handleOpenModal(t, 'edit');
                                        }}
                                        className="px-4 py-2 text-xs font-bold rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white transition-colors flex items-center gap-1.5 shadow-xs"
                                    >
                                        <Edit className="w-3.5 h-3.5" />
                                        <span>Edit Resident</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* 6. EDIT RESIDENT MODAL */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-xl flex flex-col max-h-[90vh]"
                        >
                            <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-zinc-900/40">
                                <div>
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                        Edit Resident Profile
                                    </h2>
                                    <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                                        Update contact information, room placement, and status.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                                {error && (
                                    <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                            Full Name <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            required
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500/20"
                                            placeholder="e.g. Maria Santos"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                                Email Address <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                required
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500/20"
                                                placeholder="maria@example.com"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                                Phone Number
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500/20 font-mono"
                                                placeholder="+63 900 000 0000"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                                Gender
                                            </label>
                                            <CustomSelect
                                                value={formData.gender}
                                                onChange={(val) => setFormData({ ...formData, gender: val })}
                                                options={["Not Specified", "Male", "Female", "Other"]}
                                                className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 text-slate-700 dark:text-zinc-300 outline-none"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                                Account Status
                                            </label>
                                            <CustomSelect
                                                value={formData.status}
                                                onChange={(val) => setFormData({ ...formData, status: val })}
                                                options={["Pending", "Active", "Declined", "Moved Out"]}
                                                className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 text-slate-700 dark:text-zinc-300 outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                            Permanent Address
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500/20"
                                            placeholder="Provincial address or home town"
                                        />
                                    </div>

                                    {/* Boarding Placement Terms */}
                                    <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 block mb-2">
                                            Room Assignment & Terms
                                        </span>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                                    Assigned Room
                                                </label>
                                                <CustomSelect
                                                    value={formData.room_id?.toString() || ''}
                                                    onChange={(val) => setFormData({ ...formData, room_id: val })}
                                                    options={[
                                                        { value: "", label: "Unassigned / Pending" },
                                                        ...rooms.map(room => ({
                                                            value: room.id.toString(),
                                                            label: `Room ${room.room_number} (${room.status})`
                                                        }))
                                                    ]}
                                                    className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 text-slate-700 dark:text-zinc-300 outline-none"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                                    Monthly Rent (₱)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={formData.monthly_rent}
                                                    onChange={(e) => setFormData({ ...formData, monthly_rent: e.target.value })}
                                                    className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500/20 font-mono"
                                                    placeholder="e.g. 3500"
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-3 space-y-1">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                                Move-In Date
                                            </label>
                                            <input
                                                type="date"
                                                value={formData.date_moved_in}
                                                onChange={(e) => setFormData({ ...formData, date_moved_in: e.target.value })}
                                                className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 text-slate-900 dark:text-white outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-end gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-zinc-800 bg-card hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-5 py-2 text-xs font-bold rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                                    >
                                        {isSubmitting ? (
                                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <Check className="w-3.5 h-3.5" />
                                        )}
                                        <span>Save Changes</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* 7. STATUS CONFIRMATION MODAL */}
            <AnimatePresence>
                {confirmStatus && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-xl p-5"
                        >
                            <div className="flex items-start gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${confirmStatus.action === 'Approve' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20'}`}>
                                    {confirmStatus.action === 'Approve' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                        {confirmStatus.action === 'Approve' ? 'Approve Resident' : 'Decline Application'}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                                        {confirmStatus.action === 'Approve'
                                            ? `Confirm onboarding approval for ${confirmStatus.name}? Their status will become Active.`
                                            : `Decline application for ${confirmStatus.name}? Their record will be flagged as Declined.`}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 flex items-center justify-end gap-2">
                                <button
                                    onClick={() => setConfirmStatus(null)}
                                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-800 bg-card hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={executeStatusUpdate}
                                    disabled={isStatusUpdating !== null}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-lg text-white transition-colors flex items-center gap-1.5 shadow-xs ${confirmStatus.action === 'Approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                                >
                                    {isStatusUpdating !== null ? (
                                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        confirmStatus.action
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}
