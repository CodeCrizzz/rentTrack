"use client";
import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
    List,
    LayoutGrid,
    Phone,
    Mail,
    Calendar,
    Edit,
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

function TenantsContent() {
    const searchParams = useSearchParams();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'directory' | 'approvals'>('directory');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Overdue' | 'Moved Out'>('All');
    const [roomFilter, setRoomFilter] = useState('All Rooms');
    const [sortFilter, setSortFilter] = useState('Newest First');
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
    const [error, setError] = useState('');

    // Handle URL search parameters from Action Center
    useEffect(() => {
        if (!searchParams) return;
        const tabParam = searchParams.get('tab');
        const searchParam = searchParams.get('search');

        if (tabParam === 'approvals' || tabParam === 'directory') {
            setActiveTab(tabParam);
        }
        if (searchParam) {
            setSearchQuery(searchParam);
        }
    }, [searchParams]);

    // --- MODAL & FORM STATES ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
    const [viewingTenant, setViewingTenant] = useState<Tenant | null>(null);

    // Auto-open viewing modal if tenantId is provided in URL
    useEffect(() => {
        if (!searchParams || tenants.length === 0) return;
        const tenantIdParam = searchParams.get('tenantId');
        if (tenantIdParam) {
            const matched = tenants.find(t => t.id === Number(tenantIdParam));
            if (matched) {
                setViewingTenant(matched);
                setIsViewModalOpen(true);
            }
        }
    }, [searchParams, tenants]);
    const [isSubmitting, setIsSubmitting] = useState(false);
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

    const fetchTenants = async () => {
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
        } catch (err: any) {
            console.error("Failed to fetch tenants:", err);
            setError("Failed to load residents list.");
        } finally {
            setIsLoading(false);
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
        const total = tenants.filter(t => t.status !== 'Pending').length;
        const totalRegistered = tenants.length;
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
            totalRegistered,
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
            // Separation: Approvals vs Directory
            if (activeTab === 'approvals') {
                if (t.status !== 'Pending') return false;
            } else {
                // Resident Directory strictly excludes unapproved pending applicants
                if (t.status === 'Pending') return false;

                // Status Category Filter
                if (statusFilter === 'Active' && t.status !== 'Active') return false;
                if (statusFilter === 'Moved Out' && t.status !== 'Moved Out') return false;
                if (statusFilter === 'Overdue') {
                    if (t.payment_status !== 'Overdue' && (Number(t.balance) || 0) <= 0) return false;
                }

                // Room Filter
                if (roomFilter !== 'All Rooms') {
                    const targetRoom = roomFilter.replace('Room ', '').trim();
                    if (t.room_number !== targetRoom) return false;
                }
            }

            // Search Query: strictly and accurately search tenant name only
            if (searchQuery.trim()) {
                const cleanQuery = searchQuery
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .toLowerCase()
                    .trim();

                const cleanName = (t.name || '')
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .toLowerCase()
                    .trim();

                if (!cleanName) return false;

                // Split tenant name into clean word tokens (e.g. "Christian", "S.", "Natividad" -> ["christian", "s", "natividad"])
                const nameWords = cleanName
                    .split(/\s+/)
                    .map(w => w.replace(/^[^\w]+|[^\w]+$/g, ''))
                    .filter(Boolean);

                const firstName = nameWords[0] || '';

                if (cleanQuery.length === 1) {
                    // When typing only 1 character:
                    // Strictly match the 1st letter of the tenant's 1st name only
                    if (firstName.charAt(0) !== cleanQuery) {
                        return false;
                    }
                } else {
                    // When typing multiple characters:
                    // 1. Direct match if full name begins with query (e.g. "camille rose", "christian dave")
                    if (cleanName.startsWith(cleanQuery)) {
                        return true;
                    }

                    // 2. Tokenized word-prefix matching:
                    // Every word in the query must match the beginning of a word in the tenant's name
                    const queryTokens = cleanQuery.split(/\s+/).filter(Boolean);
                    const allTokensMatch = queryTokens.length > 0 && queryTokens.every(qToken =>
                        nameWords.some(nWord => nWord.startsWith(qToken))
                    );

                    if (!allTokensMatch) {
                        return false;
                    }
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
    }, [tenants, activeTab, statusFilter, roomFilter, searchQuery, sortFilter]);

    // Status Style Helper - High-contrast text colors for clear legibility (no faded/slop tones)
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Active':
                return {
                    label: 'Active',
                    className: 'text-emerald-700 dark:text-emerald-400 font-bold'
                };
            case 'Pending':
                return {
                    label: 'Pending',
                    className: 'text-amber-700 dark:text-amber-400 font-bold'
                };
            case 'Declined':
                return {
                    label: 'Declined',
                    className: 'text-rose-700 dark:text-rose-400 font-bold'
                };
            case 'Moved Out':
            case 'Inactive':
                return {
                    label: status === 'Moved Out' ? 'Moved Out' : 'Inactive',
                    className: 'text-slate-700 dark:text-zinc-300 font-bold'
                };
            default:
                return {
                    label: status || 'Inactive',
                    className: 'text-slate-700 dark:text-zinc-300 font-bold'
                };
        }
    };

    if (isLoading) {
        return (
            <div className="w-full h-[calc(100vh-6.2rem)] md:h-[calc(100vh-7.2rem)] lg:h-[calc(100dvh-7.2rem)] flex flex-col font-sans text-slate-900 dark:text-zinc-100 overflow-hidden space-y-2.5 sm:space-y-3 animate-pulse">
                {/* 1. Header Toolbar */}
                <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-60 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                            <div className="h-5 w-24 bg-slate-200 dark:bg-zinc-800 rounded-md"></div>
                        </div>
                        <div className="h-4 w-80 bg-slate-200 dark:bg-zinc-800 rounded mt-1"></div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-9 w-28 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                        <div className="h-9 w-24 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                    </div>
                </div>

                {/* 2. Executive Metric Ribbon */}
                <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 sm:p-3 shadow-xs flex items-center justify-between">
                            <div className="space-y-1.5 flex-1">
                                <div className="h-3.5 w-24 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                                <div className="h-8 w-28 bg-slate-200 dark:bg-zinc-800 rounded-md"></div>
                                <div className="h-3 w-32 bg-slate-100 dark:bg-zinc-800/60 rounded"></div>
                            </div>
                            <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-zinc-800 shrink-0"></div>
                        </div>
                    ))}
                </div>

                {/* Status Tabs & Search Strip */}
                <div className="shrink-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-2 shadow-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-8 w-24 bg-slate-100 dark:bg-zinc-800 rounded-lg"></div>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-slate-100 dark:border-zinc-800/80">
                        <div className="h-8.5 w-64 sm:w-72 bg-slate-100 dark:bg-zinc-800 rounded-lg"></div>
                        <div className="h-8.5 w-32 sm:w-36 bg-slate-100 dark:bg-zinc-800 rounded-lg"></div>
                        <div className="h-8.5 w-36 sm:w-40 bg-slate-100 dark:bg-zinc-800 rounded-lg"></div>
                    </div>
                </div>

                {/* 4. Table Skeleton */}
                <div className="flex-1 min-h-0 max-h-[610px] bg-card border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs flex flex-col relative">
                    <div className="absolute top-0 right-0 w-6 h-[46px] bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 z-30 pointer-events-none rounded-tr-xl" />
                    <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                        <table className="w-full min-w-full text-left text-sm border-collapse">
                            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">
                                <tr className="h-[46px] bg-slate-100 dark:bg-zinc-900">
                                    <th className="py-2.5 px-3.5 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800"><div className="h-4 w-28 bg-slate-200 dark:bg-zinc-700 rounded"></div></th>
                                    <th className="py-2.5 px-3 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800"><div className="h-4 w-20 bg-slate-200 dark:bg-zinc-700 rounded"></div></th>
                                    <th className="py-2.5 px-3 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800"><div className="h-4 w-20 bg-slate-200 dark:bg-zinc-700 rounded"></div></th>
                                    <th className="py-2.5 px-3 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800"><div className="h-4 w-24 bg-slate-200 dark:bg-zinc-700 rounded"></div></th>
                                    <th className="py-2.5 px-3 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800"><div className="h-4 w-16 bg-slate-200 dark:bg-zinc-700 rounded"></div></th>
                                    <th className="py-2.5 pl-3.5 pr-6 text-right bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800"><div className="h-4 w-14 bg-slate-200 dark:bg-zinc-700 rounded ml-auto"></div></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 font-sans">
                                {[...Array(9)].map((_, i) => (
                                    <tr key={i} className="h-[62px]">
                                        <td className="py-2 px-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-zinc-800 shrink-0"></div>
                                                <div className="space-y-1">
                                                    <div className="h-4 w-28 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                                                    <div className="h-3 w-32 bg-slate-100 dark:bg-zinc-800/60 rounded"></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-2 px-3">
                                            <div className="space-y-1">
                                                <div className="h-4 w-20 bg-slate-100 dark:bg-zinc-800 rounded"></div>
                                                <div className="h-3 w-14 bg-slate-100 dark:bg-zinc-800/60 rounded"></div>
                                            </div>
                                        </td>
                                        <td className="py-2 px-3"><div className="h-4 w-24 bg-slate-100 dark:bg-zinc-800 rounded"></div></td>
                                        <td className="py-2 px-3">
                                            <div className="space-y-1">
                                                <div className="h-4 w-24 bg-slate-100 dark:bg-zinc-800 rounded"></div>
                                                <div className="h-3 w-14 bg-slate-100 dark:bg-zinc-800/60 rounded"></div>
                                            </div>
                                        </td>
                                        <td className="py-2 px-3"><div className="h-4 w-16 bg-slate-100 dark:bg-zinc-800 rounded"></div></td>
                                        <td className="py-2 px-4 text-right"><div className="h-8 w-18 bg-slate-100 dark:bg-zinc-800 rounded-lg ml-auto"></div></td>
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
            
            {/* 1. Header Toolbar */}
            <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight">
                            {activeTab === 'approvals' ? 'Account Approvals' : 'Tenants Directory'}
                        </h1>
                        <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-slate-300 dark:border-zinc-700">
                            {activeTab === 'approvals' 
                                ? `${filteredTenants.length} of ${metrics.pendingCount} pending`
                                : `${filteredTenants.length} of ${metrics.total} residents`}
                        </span>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-zinc-300 mt-0.5">
                        {activeTab === 'approvals'
                            ? 'Review, verify, and approve incoming resident account registration applications.'
                            : 'Resident registry, bedspace allocations, onboarding review, and rent ledger balances.'}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* View Switcher */}
                    <div className="flex items-center bg-slate-100 dark:bg-zinc-800/90 p-0.5 rounded-lg border border-slate-300 dark:border-zinc-700 text-xs font-semibold">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${viewMode === 'table' ? 'bg-white dark:bg-zinc-900 text-slate-950 dark:text-white shadow-2xs font-extrabold' : 'text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-white font-bold'}`}
                            title="Table ledger view"
                        >
                            <List className="w-3.5 h-3.5" />
                            <span>Table</span>
                        </button>
                        <button
                            onClick={() => setViewMode('cards')}
                            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${viewMode === 'cards' ? 'bg-white dark:bg-zinc-900 text-slate-950 dark:text-white shadow-2xs font-extrabold' : 'text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-white font-bold'}`}
                            title="Resident cards view"
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            <span>Cards</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. Executive Metric Ribbon (4 Tiles) */}
            <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                
                {/* Metric 1: Total Residents */}
                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 sm:p-3 shadow-xs flex items-center justify-between select-none">
                    <div>
                        <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-zinc-300">Total Residents</span>
                        <div className="text-2xl sm:text-3xl lg:text-4xl font-black font-mono text-slate-950 dark:text-white mt-0.5 flex items-baseline gap-2">
                            {metrics.total} <span className="text-sm sm:text-base font-sans font-extrabold text-slate-700 dark:text-zinc-300">Tenants</span>
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-zinc-300 mt-0.5">
                            <span className="font-extrabold text-slate-950 dark:text-white">{metrics.activeCount} active</span> • <span className="font-bold text-slate-800 dark:text-zinc-200">{metrics.movedOutCount} departed</span>
                        </p>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white flex items-center justify-center shrink-0 border border-slate-300 dark:border-zinc-700">
                        <Users className="w-5 h-5" />
                    </div>
                </div>

                {/* Metric 2: Occupancy Density */}
                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 sm:p-3 shadow-xs flex items-center justify-between select-none">
                    <div>
                        <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-zinc-300">Occupancy Density</span>
                        <div className="text-2xl sm:text-3xl lg:text-4xl font-black font-mono text-slate-950 dark:text-white mt-0.5 flex items-baseline gap-2">
                            {metrics.capacityPercent}% <span className="text-sm sm:text-base font-sans font-extrabold text-slate-700 dark:text-zinc-300">Filled</span>
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-zinc-300 mt-0.5">
                            <span className="font-extrabold text-slate-950 dark:text-white">{metrics.activeCount}</span> of <span className="font-bold text-slate-900 dark:text-zinc-100">{metrics.totalBeds}</span> total bedspaces
                        </p>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-300/60 dark:border-emerald-500/30">
                        <Building2 className="w-5 h-5" />
                    </div>
                </div>

                {/* Metric 3: Account Approvals */}
                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 sm:p-3 shadow-xs flex items-center justify-between select-none">
                    <div>
                        <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-zinc-300">Account Approvals</span>
                        <div className={`text-2xl sm:text-3xl lg:text-4xl font-black font-mono mt-0.5 flex items-baseline gap-2 ${metrics.pendingCount > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-950 dark:text-white'}`}>
                            {metrics.pendingCount} <span className="text-sm sm:text-base font-sans font-extrabold text-slate-700 dark:text-zinc-300">Pending</span>
                        </div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-zinc-300 mt-0.5">
                            {metrics.pendingCount > 0 ? 'Awaiting admin verification' : 'All accounts reviewed'}
                        </p>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-300/60 dark:border-amber-500/30">
                        <UserCheck className="w-5 h-5" />
                    </div>
                </div>

                {/* Metric 4: Ledger Arrears */}
                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 sm:p-3 shadow-xs flex items-center justify-between select-none">
                    <div>
                        <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-700 dark:text-zinc-300">Overdue Arrears</span>
                        <div className={`text-2xl sm:text-3xl lg:text-4xl font-black font-mono mt-0.5 flex items-baseline gap-2 ${metrics.overdueCount > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-slate-950 dark:text-white'}`}>
                            ₱{metrics.totalUnpaid.toLocaleString()}
                        </div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-zinc-300 mt-0.5">
                            {metrics.overdueCount > 0 ? `${metrics.overdueCount} accounts past due` : 'Zero delinquent accounts'}
                        </p>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-300/60 dark:border-rose-500/30">
                        <AlertCircle className="w-5 h-5" />
                    </div>
                </div>

            </div>

            {/* 3. Primary Tab Switcher & Filters */}
            <div className="shrink-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-2 shadow-xs space-y-1.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    
                    {/* Primary Tab Navigation: Resident Directory vs Account Approvals */}
                    <div className="flex items-center bg-slate-100 dark:bg-zinc-800/90 p-0.5 rounded-lg border border-slate-300 dark:border-zinc-700 text-xs font-semibold">
                        <button
                            onClick={() => setActiveTab('directory')}
                            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                                activeTab === 'directory' 
                                    ? 'bg-white dark:bg-zinc-900 text-slate-950 dark:text-white shadow-2xs font-extrabold' 
                                    : 'text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-white font-semibold'
                            }`}
                        >
                            <Users className="w-3.5 h-3.5" />
                            <span>Resident Directory</span>
                            <span className="text-[11px] px-1.5 py-0.2 rounded font-mono font-bold bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-zinc-100">
                                {metrics.total}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('approvals')}
                            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                                activeTab === 'approvals' 
                                    ? 'bg-white dark:bg-zinc-900 text-amber-700 dark:text-amber-300 shadow-2xs font-extrabold' 
                                    : 'text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-white font-semibold'
                            }`}
                        >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Account Approvals</span>
                            {metrics.pendingCount > 0 ? (
                                <span className="text-[11px] px-1.5 py-0.2 rounded font-mono font-bold bg-amber-600 text-white">
                                    {metrics.pendingCount}
                                </span>
                            ) : (
                                <span className="text-[11px] px-1.5 py-0.2 rounded font-mono font-bold bg-slate-200 dark:bg-zinc-700 text-slate-800 dark:text-zinc-200">
                                    0
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Sub-Filters: Directory Status Pills */}
                    {activeTab === 'directory' ? (
                        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 sm:pb-0 text-xs font-semibold custom-scrollbar">
                            <button
                                onClick={() => setStatusFilter('All')}
                                className={`px-2.5 py-1 rounded-lg transition-all shrink-0 flex items-center gap-1.5 border ${
                                    statusFilter === 'All' 
                                        ? 'bg-slate-950 text-white border-slate-950 dark:bg-white dark:text-zinc-900 dark:border-white shadow-2xs font-extrabold' 
                                        : 'bg-slate-100 dark:bg-zinc-800/90 border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 hover:text-slate-950 dark:hover:text-white font-bold'
                                }`}
                            >
                                <span>All</span>
                                <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${statusFilter === 'All' ? 'bg-white/20 text-white dark:bg-black/20 dark:text-zinc-900' : 'bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-zinc-100'}`}>
                                    {metrics.total}
                                </span>
                            </button>
                            <button
                                onClick={() => setStatusFilter('Active')}
                                className={`px-2.5 py-1 rounded-lg transition-all shrink-0 flex items-center gap-1.5 border ${
                                    statusFilter === 'Active' 
                                        ? 'bg-emerald-700 text-white border-emerald-700 dark:bg-emerald-500 dark:text-zinc-950 dark:border-emerald-500 shadow-2xs font-extrabold' 
                                        : 'bg-slate-100 dark:bg-zinc-800/90 border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 hover:text-slate-950 dark:hover:text-white font-bold'
                                }`}
                            >
                                <span>Active</span>
                                <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${statusFilter === 'Active' ? 'bg-white/20 text-white dark:bg-black/20 dark:text-zinc-950' : 'bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-zinc-100'}`}>
                                    {metrics.activeCount}
                                </span>
                            </button>
                            <button
                                onClick={() => setStatusFilter('Overdue')}
                                className={`px-2.5 py-1 rounded-lg transition-all shrink-0 flex items-center gap-1.5 border ${
                                    statusFilter === 'Overdue' 
                                        ? 'bg-rose-700 text-white border-rose-700 dark:bg-rose-500 dark:text-zinc-950 dark:border-rose-500 shadow-2xs font-extrabold' 
                                        : 'bg-slate-100 dark:bg-zinc-800/90 border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 hover:text-slate-950 dark:hover:text-white font-bold'
                                }`}
                            >
                                <span>Overdue</span>
                                <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${statusFilter === 'Overdue' ? 'bg-white/20 text-white dark:bg-black/20 dark:text-zinc-950' : 'bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-zinc-100'}`}>
                                    {metrics.overdueCount}
                                </span>
                            </button>
                            <button
                                onClick={() => setStatusFilter('Moved Out')}
                                className={`px-2.5 py-1 rounded-lg transition-all shrink-0 flex items-center gap-1.5 border ${
                                    statusFilter === 'Moved Out' 
                                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-zinc-200 dark:text-zinc-950 dark:border-zinc-200 shadow-2xs font-extrabold' 
                                        : 'bg-slate-100 dark:bg-zinc-800/90 border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 hover:text-slate-950 dark:hover:text-white font-bold'
                                }`}
                            >
                                <span>Departed</span>
                                <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${statusFilter === 'Moved Out' ? 'bg-white/20 text-white dark:bg-black/20 dark:text-zinc-950' : 'bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-zinc-100'}`}>
                                    {metrics.movedOutCount}
                                </span>
                            </button>
                        </div>
                    ) : (
                        <div className="text-xs text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>{filteredTenants.length} applicant{filteredTenants.length === 1 ? '' : 's'} awaiting admin verification</span>
                        </div>
                    )}
                </div>

                {/* Secondary Search & Dropdown Filters */}
                <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-slate-200 dark:border-zinc-800">
                    {/* Compact Search Input */}
                    <div className="relative w-64 sm:w-72 shrink-0">
                        <Search className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder={activeTab === 'approvals' ? "Search applicant by name..." : "Search by tenant name..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-7 py-1.5 text-sm font-semibold rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-50/70 dark:bg-zinc-900/60 text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-slate-400/30 dark:focus:ring-zinc-600/40"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-950 dark:hover:text-white cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Room Filter Dropdown (only on Directory) */}
                    {activeTab === 'directory' && (
                        <div className="w-32 sm:w-36 shrink-0">
                            <CustomSelect
                                value={roomFilter}
                                onChange={(val) => setRoomFilter(val)}
                                options={["All Rooms", ...uniqueRooms.map(r => `Room ${r}`)]}
                                className="w-full px-2.5 py-1.5 text-sm font-bold rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-50/70 dark:bg-zinc-900/60 text-slate-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-slate-400/30 dark:focus:ring-zinc-600/40"
                            />
                        </div>
                    )}

                    {/* Sort Filter Dropdown */}
                    <div className="w-36 sm:w-40 shrink-0">
                        <CustomSelect
                            value={sortFilter}
                            onChange={(val) => setSortFilter(val)}
                            options={activeTab === 'approvals' 
                                ? ["Newest First", "Oldest First", "Name (A-Z)", "Name (Z-A)"]
                                : ["Newest First", "Oldest First", "Name (A-Z)", "Name (Z-A)", "Room (0-9)", "Highest Balance"]
                            }
                            className="w-full px-2.5 py-1.5 text-sm font-bold rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-50/70 dark:bg-zinc-900/60 text-slate-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-slate-400/30 dark:focus:ring-zinc-600/40"
                        />
                    </div>
                </div>
            </div>

            {/* 4. Main Inventory Data: Operations Table or Directory Cards */}
            {viewMode === 'table' ? (
                <div className="flex-1 min-h-0 max-h-[610px] bg-card border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xs flex flex-col overflow-hidden relative">
                    {/* Header filler to extend label header width and align scrollbar with 1st data row */}
                    <div className="absolute top-0 right-0 w-6 h-[46px] bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 z-30 pointer-events-none rounded-tr-xl" />

                    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto custom-scrollbar">
                        <table className="w-full min-w-full text-left text-sm border-collapse">
                            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-zinc-900 shadow-xs border-b border-slate-200 dark:border-zinc-800">
                                {activeTab === 'approvals' ? (
                                    <tr className="h-[46px] bg-slate-100 dark:bg-zinc-900 text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                        <th className="py-3 px-4 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">Applicant</th>
                                        <th className="py-3 px-3.5 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">Phone</th>
                                        <th className="py-3 px-3.5 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">Address & Gender</th>
                                        <th className="py-3 px-3.5 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">Applied Date</th>
                                        <th className="py-3 px-3.5 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">Status</th>
                                        <th className="py-3 pl-3.5 pr-6 text-right bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">Review Decision</th>
                                    </tr>
                                ) : (
                                    <tr className="h-[46px] bg-slate-100 dark:bg-zinc-900 text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                        <th className="py-3 px-4 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">Resident</th>
                                        <th className="py-3 px-3.5 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">Room & Bed</th>
                                        <th className="py-3 px-3.5 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">Phone</th>
                                        <th className="py-3 px-3.5 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">Monthly Rent & Ledger</th>
                                        <th className="py-3 px-3.5 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">Status</th>
                                        <th className="py-3 pl-3.5 pr-6 text-right bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">Actions</th>
                                    </tr>
                                )}
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 font-sans">
                                {activeTab === 'approvals' ? (
                                    filteredTenants.map((tenant) => {
                                        const badge = getStatusBadge(tenant.status);
                                        const appliedDate = tenant.created_at ? new Date(tenant.created_at).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                        }) : '—';

                                        return (
                                            <tr 
                                                key={tenant.id} 
                                                className="h-[62px] hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors group"
                                            >
                                                {/* Applicant Identity */}
                                                <td className="py-2 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-extrabold flex items-center justify-center shrink-0 border border-amber-300 dark:border-amber-700 text-base">
                                                            {tenant.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <span className="font-extrabold text-base sm:text-[17px] text-slate-950 dark:text-white truncate block leading-tight">
                                                                {tenant.name}
                                                            </span>
                                                            <span className="text-sm text-slate-700 dark:text-zinc-300 font-medium truncate block leading-tight mt-0.5">
                                                                {tenant.email}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Phone */}
                                                <td className="py-2 px-3.5 whitespace-nowrap">
                                                    {tenant.phone ? (
                                                        <a 
                                                            href={`tel:${tenant.phone}`} 
                                                            className="text-base sm:text-[17px] font-mono font-bold text-slate-900 dark:text-zinc-100 hover:text-black dark:hover:text-white hover:underline transition-colors"
                                                        >
                                                            {tenant.phone}
                                                        </a>
                                                    ) : (
                                                        <span className="text-sm text-slate-500 dark:text-zinc-400 font-semibold italic">—</span>
                                                    )}
                                                </td>

                                                {/* Address & Gender */}
                                                <td className="py-2 px-3.5 max-w-[210px]">
                                                    <span className="text-base sm:text-[17px] font-bold text-slate-950 dark:text-white block truncate leading-tight">
                                                        {tenant.address || 'No address provided'}
                                                    </span>
                                                    <span className="text-sm font-medium text-slate-700 dark:text-zinc-300 block leading-tight mt-0.5">
                                                        {tenant.gender || 'Unspecified gender'}
                                                    </span>
                                                </td>

                                                {/* Applied Date */}
                                                <td className="py-2 px-3.5 whitespace-nowrap">
                                                    <span className="text-sm sm:text-base font-mono font-bold text-slate-900 dark:text-zinc-100">
                                                        {appliedDate}
                                                    </span>
                                                </td>

                                                {/* Status (text only badge) */}
                                                <td className="py-2 px-3.5 whitespace-nowrap">
                                                    <span className={`text-sm sm:text-base ${badge.className}`}>
                                                        {badge.label}
                                                    </span>
                                                </td>

                                                {/* Review Decision Buttons */}
                                                <td className="py-2 px-4 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            onClick={() => handleUpdateStatusClick(tenant, 'Approve')}
                                                            disabled={isStatusUpdating === tenant.id}
                                                            className="px-3.5 py-1.5 text-sm font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                                                        >
                                                            <Check className="w-4 h-4 stroke-[2.5]" />
                                                            <span>Approve</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdateStatusClick(tenant, 'Reject')}
                                                            disabled={isStatusUpdating === tenant.id}
                                                            className="px-3.5 py-1.5 text-sm font-bold rounded-lg border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 transition-colors cursor-pointer"
                                                        >
                                                            <span>Decline</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleViewTenant(tenant)}
                                                            className="p-2 rounded-lg text-slate-600 hover:text-slate-950 dark:text-zinc-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                                            title="Inspect applicant details"
                                                        >
                                                            <Eye className="w-4.5 h-4.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    filteredTenants.map((tenant) => {
                                        const badge = getStatusBadge(tenant.status);
                                        const hasOverdue = (Number(tenant.balance) || 0) > 0;

                                        return (
                                            <tr 
                                                key={tenant.id} 
                                                className="h-[62px] hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors group"
                                            >
                                                {/* Resident Identity */}
                                                <td className="py-2 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 font-extrabold flex items-center justify-center shrink-0 border border-slate-300 dark:border-zinc-700 text-base">
                                                            {tenant.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <span className="font-extrabold text-base sm:text-[17px] text-slate-950 dark:text-white truncate block leading-tight">
                                                                {tenant.name}
                                                            </span>
                                                            <span className="text-sm text-slate-700 dark:text-zinc-300 font-medium truncate block leading-tight mt-0.5">
                                                                {tenant.email}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Room & Bed */}
                                                <td className="py-2 px-3.5">
                                                    {tenant.room_number ? (
                                                        <div>
                                                            <span className="font-extrabold text-base sm:text-[17px] text-slate-950 dark:text-white block leading-tight">
                                                                Room {tenant.room_number}
                                                            </span>
                                                            <span className="text-sm font-medium text-slate-700 dark:text-zinc-300 block leading-tight mt-0.5">
                                                                {tenant.bed_space && tenant.bed_space !== 'N/A' ? tenant.bed_space : 'Private Room'}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm font-medium text-slate-500 dark:text-zinc-400 italic">
                                                            Unassigned
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Phone */}
                                                <td className="py-2 px-3.5 whitespace-nowrap">
                                                    {tenant.phone ? (
                                                        <a 
                                                            href={`tel:${tenant.phone}`} 
                                                            className="text-base sm:text-[17px] font-mono font-bold text-slate-900 dark:text-zinc-100 hover:text-black dark:hover:text-white hover:underline transition-colors"
                                                        >
                                                            {tenant.phone}
                                                        </a>
                                                    ) : (
                                                        <span className="text-sm font-semibold text-slate-500 dark:text-zinc-400 italic">—</span>
                                                    )}
                                                </td>

                                                {/* Rent & Balance */}
                                                <td className="py-2 px-3.5">
                                                    <div>
                                                        <span className="font-mono font-black text-base sm:text-[17px] text-slate-950 dark:text-white block leading-tight">
                                                            ₱{Number(tenant.monthly_rent || 0).toLocaleString()} <span className="text-xs font-sans font-bold text-slate-600 dark:text-zinc-400">/mo</span>
                                                        </span>
                                                        {hasOverdue ? (
                                                            <span className="text-sm sm:text-base font-mono font-bold text-rose-700 dark:text-rose-400 block leading-tight mt-0.5">
                                                                ₱{Number(tenant.balance || 0).toLocaleString()} past due
                                                            </span>
                                                        ) : (
                                                            <span className="text-sm sm:text-base font-bold font-mono text-emerald-700 dark:text-emerald-400 block leading-tight mt-0.5">
                                                                Settled
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Status (text only badge) */}
                                                <td className="py-2 px-3.5 whitespace-nowrap">
                                                    <span className={`text-sm sm:text-base ${badge.className}`}>
                                                        {badge.label}
                                                    </span>
                                                </td>

                                                {/* Action Buttons */}
                                                <td className="py-2 px-4 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            onClick={() => handleViewTenant(tenant)}
                                                            className="px-3.5 py-1.5 text-sm font-bold rounded-lg border border-slate-300 dark:border-zinc-700 bg-card hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-900 dark:text-zinc-100 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                                                        >
                                                            <Eye className="w-4.5 h-4.5 text-slate-700 dark:text-zinc-300" />
                                                            <span>View</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenModal(tenant, 'edit')}
                                                            className="p-2 rounded-lg text-slate-700 hover:text-slate-950 dark:text-zinc-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                                            title="Edit resident profile"
                                                        >
                                                            <Edit className="w-4.5 h-4.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}

                                {filteredTenants.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center">
                                            {activeTab === 'approvals' ? (
                                                <>
                                                    <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                                                    <p className="text-base font-extrabold text-slate-900 dark:text-white">
                                                        No pending account approvals
                                                    </p>
                                                    <p className="text-sm font-medium text-slate-700 dark:text-zinc-300 mt-0.5">
                                                        All resident account applications have been processed and reviewed.
                                                    </p>
                                                </>
                                            ) : (
                                                <>
                                                    <Users className="w-8 h-8 text-slate-400 dark:text-zinc-600 mx-auto mb-2" />
                                                    <p className="text-base font-extrabold text-slate-900 dark:text-white">
                                                        No residents found
                                                    </p>
                                                    <p className="text-sm font-medium text-slate-700 dark:text-zinc-300 mt-0.5">
                                                        Try adjusting your filter category or search keywords.
                                                    </p>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* Directory Cards (Grid View) */
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-0.5">
                    {filteredTenants.length === 0 ? (
                        <div className="bg-card border border-slate-200/90 dark:border-zinc-800/90 rounded-lg p-12 text-center">
                            {activeTab === 'approvals' ? (
                                <>
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500/80 mx-auto mb-2" />
                                    <p className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                                        No pending account approvals
                                    </p>
                                    <p className="text-xs font-medium text-slate-700 dark:text-zinc-300 mt-0.5">
                                        All resident account applications have been processed and reviewed.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <Users className="w-8 h-8 text-slate-400 dark:text-zinc-600 mx-auto mb-2" />
                                    <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                                        No residents found
                                    </p>
                                    <p className="text-xs font-medium text-slate-700 dark:text-zinc-300 mt-0.5">
                                        Try adjusting your filter category or search keywords.
                                    </p>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                            {filteredTenants.map((tenant) => {
                                const badge = getStatusBadge(tenant.status);
                                const hasOverdue = (Number(tenant.balance) || 0) > 0;

                                if (activeTab === 'approvals') {
                                    return (
                                        <motion.div
                                            key={tenant.id}
                                            variants={cardVariants}
                                            initial="hidden"
                                            animate="show"
                                            className="bg-card border border-amber-300/80 dark:border-amber-700/60 rounded-xl p-3 shadow-xs hover:border-amber-400 dark:hover:border-amber-500 transition-all flex flex-col justify-between space-y-3"
                                        >
                                            <div>
                                                {/* Top Bar: Applied date & Status */}
                                                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-zinc-800">
                                                    <span className="text-xs font-mono font-bold text-slate-700 dark:text-zinc-300">
                                                        Applied {tenant.created_at ? new Date(tenant.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                                                    </span>
                                                    <span className={`text-sm ${badge.className}`}>
                                                        {badge.label}
                                                    </span>
                                                </div>

                                                {/* Applicant Identity */}
                                                <div className="flex items-center gap-2.5 mt-2.5">
                                                    <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-extrabold flex items-center justify-center shrink-0 border border-amber-300 dark:border-amber-700 text-sm">
                                                        {tenant.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="font-extrabold text-base text-slate-950 dark:text-white truncate block">
                                                            {tenant.name}
                                                        </span>
                                                        <span className="text-sm font-medium text-slate-700 dark:text-zinc-300 truncate block mt-0.5">
                                                            {tenant.email}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Applicant Info Box */}
                                                <div className="mt-3 p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50 space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wide">Phone</span>
                                                        <span className="font-mono font-bold text-slate-950 dark:text-zinc-100 text-sm">
                                                            {tenant.phone || '—'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wide">Gender</span>
                                                        <span className="text-slate-900 dark:text-zinc-100 font-medium text-sm">
                                                            {tenant.gender || 'Unspecified'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wide">Address</span>
                                                        <span className="text-slate-900 dark:text-zinc-100 font-medium text-sm truncate max-w-[170px]" title={tenant.address}>
                                                            {tenant.address || '—'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Card Footer Actions */}
                                            <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 flex items-center gap-1.5">
                                                <button
                                                    onClick={() => handleUpdateStatusClick(tenant, 'Approve')}
                                                    disabled={isStatusUpdating === tenant.id}
                                                    className="flex-1 py-1.5 text-sm font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                                                >
                                                    <Check className="w-4 h-4 stroke-[2.5]" />
                                                    <span>Approve</span>
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateStatusClick(tenant, 'Reject')}
                                                    disabled={isStatusUpdating === tenant.id}
                                                    className="px-3 py-1.5 text-sm font-bold rounded-lg border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 transition-colors cursor-pointer"
                                                >
                                                    Decline
                                                </button>
                                                <button
                                                    onClick={() => handleViewTenant(tenant)}
                                                    className="p-2 rounded-lg border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
                                                    title="Inspect applicant details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    );
                                }

                                return (
                                    <motion.div
                                        key={tenant.id}
                                        variants={cardVariants}
                                        initial="hidden"
                                        animate="show"
                                        className="bg-card border border-slate-300/80 dark:border-zinc-700/80 rounded-xl p-3 shadow-xs hover:border-slate-400 dark:hover:border-zinc-600 transition-all flex flex-col justify-between space-y-3"
                                    >
                                        <div>
                                            {/* Top Bar: Status */}
                                            <div className="flex items-center justify-end pb-1.5 border-b border-slate-200 dark:border-zinc-800">
                                                <span className={`text-sm ${badge.className}`}>
                                                    {badge.label}
                                                </span>
                                            </div>

                                            {/* Resident Identity */}
                                            <div className="flex items-center gap-2.5 mt-2.5">
                                                <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 font-extrabold flex items-center justify-center shrink-0 border border-slate-300 dark:border-zinc-700 text-sm">
                                                    {tenant.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="font-extrabold text-base text-slate-950 dark:text-white truncate block">
                                                        {tenant.name}
                                                    </span>
                                                    <span className="text-sm font-medium text-slate-700 dark:text-zinc-300 truncate block mt-0.5">
                                                        {tenant.email}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Placement & Financial Info */}
                                            <div className="mt-3 p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wide">Room</span>
                                                    <span className="font-extrabold text-sm text-slate-950 dark:text-white">
                                                        {tenant.room_number ? `Room ${tenant.room_number}` : 'Unassigned'}
                                                        {tenant.bed_space && tenant.bed_space !== 'N/A' && ` • ${tenant.bed_space}`}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wide">Rent</span>
                                                    <span className="font-mono font-black text-sm text-slate-950 dark:text-white">
                                                        ₱{Number(tenant.monthly_rent || 0).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wide">Balance</span>
                                                    {hasOverdue ? (
                                                        <span className="font-mono font-bold text-rose-700 dark:text-rose-400 text-sm">
                                                            ₱{Number(tenant.balance).toLocaleString()} due
                                                        </span>
                                                    ) : (
                                                        <span className="text-emerald-700 dark:text-emerald-400 font-bold font-mono text-sm">
                                                            Settled
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card Footer Actions */}
                                        <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 flex items-center gap-1.5">
                                            <button
                                                onClick={() => handleViewTenant(tenant)}
                                                className="flex-1 py-1.5 text-sm font-bold rounded-lg border border-slate-300 dark:border-zinc-700 bg-card hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-900 dark:text-zinc-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                            >
                                                <Eye className="w-4 h-4 text-slate-700 dark:text-zinc-300" />
                                                <span>View Details</span>
                                            </button>
                                            <button
                                                onClick={() => handleOpenModal(tenant, 'edit')}
                                                className="px-3 py-1.5 text-sm font-bold rounded-lg border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-900 dark:text-zinc-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <Edit className="w-4 h-4 text-slate-700 dark:text-zinc-300" />
                                                <span>Edit</span>
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* 5. RESIDENT DETAIL MODAL (Clean, High-Contrast Executive Drawer) */}
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
                                    <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 font-extrabold text-sm flex items-center justify-center border border-slate-300 dark:border-zinc-700 shadow-xs">
                                        {viewingTenant.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-base font-extrabold text-slate-950 dark:text-white">
                                                {viewingTenant.name}
                                            </h2>
                                            {(() => {
                                                const badge = getStatusBadge(viewingTenant.status);
                                                return (
                                                    <span className={`text-xs ${badge.className}`}>
                                                        {badge.label}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                        <p className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                                            Resident ID #{viewingTenant.id} • Registered {viewingTenant.created_at ? new Date(viewingTenant.created_at).toLocaleDateString() : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsViewModalOpen(false)}
                                    className="p-1.5 rounded-lg text-slate-700 hover:text-slate-950 dark:text-zinc-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 overflow-y-auto custom-scrollbar space-y-5">
                                
                                {/* Top 3 Financial KPI Tiles */}
                                <div className="grid grid-cols-3 gap-2.5">
                                    <div className="p-3 rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900/60">
                                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-zinc-300 block">Monthly Rent</span>
                                        <span className="text-lg font-black font-mono text-slate-950 dark:text-white mt-0.5 block">
                                            ₱{Number(viewingTenant.monthly_rent || 0).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900/60">
                                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-zinc-300 block">Current Balance</span>
                                        <span className={`text-lg font-black font-mono mt-0.5 block ${(Number(viewingTenant.balance) || 0) > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                                            ₱{Number(viewingTenant.balance || 0).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900/60">
                                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-zinc-300 block">Last Payment</span>
                                        <span className="text-xs font-bold text-slate-950 dark:text-zinc-100 mt-1 block truncate">
                                            {viewingTenant.last_payment_date}
                                        </span>
                                    </div>
                                </div>

                                {/* Information Sections */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Section 1: Contact & Personal Details */}
                                    <div className="p-4 rounded-xl border border-slate-300 dark:border-zinc-700 space-y-3">
                                        <h3 className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                                            <Users className="w-3.5 h-3.5 text-slate-700 dark:text-zinc-300" />
                                            <span>Personal Profile</span>
                                        </h3>
                                        <div className="space-y-2 text-xs">
                                            <div>
                                                <span className="text-[10px] font-extrabold uppercase text-slate-700 dark:text-zinc-300 block">Email Address</span>
                                                <a href={`mailto:${viewingTenant.email}`} className="font-bold text-slate-900 dark:text-zinc-100 hover:text-black dark:hover:text-white underline">
                                                    {viewingTenant.email}
                                                </a>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-extrabold uppercase text-slate-700 dark:text-zinc-300 block">Phone Number</span>
                                                <span className="font-mono font-bold text-slate-950 dark:text-white">
                                                    {viewingTenant.phone || 'None provided'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-extrabold uppercase text-slate-700 dark:text-zinc-300 block">Gender</span>
                                                <span className="text-slate-900 dark:text-zinc-100 font-bold">
                                                    {viewingTenant.gender || 'Not specified'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-extrabold uppercase text-slate-700 dark:text-zinc-300 block">Permanent Address</span>
                                                <span className="text-slate-900 dark:text-zinc-100 font-medium">
                                                    {viewingTenant.address || 'No address logged'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 2: Boarding House Placement */}
                                    <div className="p-4 rounded-xl border border-slate-300 dark:border-zinc-700 space-y-3">
                                        <h3 className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                                            <DoorOpen className="w-3.5 h-3.5 text-slate-700 dark:text-zinc-300" />
                                            <span>Boarding Placement</span>
                                        </h3>
                                        <div className="space-y-2 text-xs">
                                            <div>
                                                <span className="text-[10px] font-extrabold uppercase text-slate-700 dark:text-zinc-300 block">Assigned Room</span>
                                                <span className="font-black text-slate-950 dark:text-white font-mono">
                                                    {viewingTenant.room_number ? `Room ${viewingTenant.room_number}` : 'Unassigned'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-extrabold uppercase text-slate-700 dark:text-zinc-300 block">Assigned Bedspace</span>
                                                <span className="font-bold text-slate-950 dark:text-white">
                                                    {viewingTenant.bed_space || 'N/A'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-extrabold uppercase text-slate-700 dark:text-zinc-300 block">Move-In Date</span>
                                                <span className="text-slate-900 dark:text-zinc-100 font-bold">
                                                    {viewingTenant.date_moved_in || 'Pending move-in'}
                                                </span>
                                            </div>

                                        </div>
                                    </div>
                                </div>

                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-4 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-end shrink-0 bg-slate-50/50 dark:bg-zinc-900/20">
                                <div className="flex items-center gap-2">
                                    {viewingTenant.status === 'Pending' && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    setIsViewModalOpen(false);
                                                    handleUpdateStatusClick(viewingTenant, 'Approve');
                                                }}
                                                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                                <span>Approve</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsViewModalOpen(false);
                                                    handleUpdateStatusClick(viewingTenant, 'Reject');
                                                }}
                                                className="px-3.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 transition-colors cursor-pointer"
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
                                        className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-950 hover:bg-black dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-950 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
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
                                    <h2 className="text-base font-extrabold text-slate-950 dark:text-white">
                                        Edit Resident Profile
                                    </h2>
                                    <p className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                                        Update contact information, room placement, and status.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-1.5 rounded-lg text-slate-700 hover:text-slate-950 dark:text-zinc-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                                {error && (
                                    <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-bold">
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                                            Full Name <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            required
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 text-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-slate-400/30 dark:focus:ring-zinc-600/40"
                                            placeholder="e.g. Maria Santos"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                                                Email Address <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                required
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 text-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-slate-400/30 dark:focus:ring-zinc-600/40"
                                                placeholder="maria@example.com"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                                                Phone Number
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 text-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-slate-400/30 dark:focus:ring-zinc-600/40 font-mono"
                                                placeholder="+63 900 000 0000"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                                                Gender
                                            </label>
                                            <CustomSelect
                                                value={formData.gender}
                                                onChange={(val) => setFormData({ ...formData, gender: val })}
                                                options={["Not Specified", "Male", "Female", "Other"]}
                                                className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 text-slate-950 dark:text-white outline-none"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                                                Account Status
                                            </label>
                                            <CustomSelect
                                                value={formData.status}
                                                onChange={(val) => setFormData({ ...formData, status: val })}
                                                options={["Pending", "Active", "Declined", "Moved Out"]}
                                                className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 text-slate-950 dark:text-white outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                                            Permanent Address
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 text-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-slate-400/30 dark:focus:ring-zinc-600/40"
                                            placeholder="Provincial address or home town"
                                        />
                                    </div>

                                    {/* Boarding Placement Terms */}
                                    <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-900 dark:text-white block mb-2">
                                            Room Assignment & Terms
                                        </span>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
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
                                                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 text-slate-950 dark:text-white outline-none"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                                                    Monthly Rent (₱)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={formData.monthly_rent}
                                                    onChange={(e) => setFormData({ ...formData, monthly_rent: e.target.value })}
                                                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 text-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-slate-400/30 dark:focus:ring-zinc-600/40 font-mono"
                                                    placeholder="e.g. 3500"
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-3 space-y-1">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                                                Move-In Date
                                            </label>
                                            <input
                                                type="date"
                                                value={formData.date_moved_in}
                                                onChange={(e) => setFormData({ ...formData, date_moved_in: e.target.value })}
                                                className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 text-slate-950 dark:text-white outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-end gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-300 dark:border-zinc-700 bg-card hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-5 py-2 text-xs font-bold rounded-lg bg-slate-950 hover:bg-black dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-950 transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                                    >
                                        {isSubmitting ? (
                                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white dark:border-black/30 dark:border-t-black rounded-full animate-spin" />
                                        ) : (
                                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
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
                                    <h3 className="text-sm font-extrabold text-slate-950 dark:text-white">
                                        {confirmStatus.action === 'Approve' ? 'Approve Resident' : 'Decline Application'}
                                    </h3>
                                    <p className="text-xs font-medium text-slate-700 dark:text-zinc-300 mt-1 leading-relaxed">
                                        {confirmStatus.action === 'Approve'
                                            ? `Confirm onboarding approval for ${confirmStatus.name}? Their status will become Active.`
                                            : `Decline application for ${confirmStatus.name}? Their record will be flagged as Declined.`}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 flex items-center justify-end gap-2">
                                <button
                                    onClick={() => setConfirmStatus(null)}
                                    className="px-3.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-zinc-700 bg-card hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={executeStatusUpdate}
                                    disabled={isStatusUpdating !== null}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-lg text-white transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer ${confirmStatus.action === 'Approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
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

export default function AdminTenants() {
    return (
        <Suspense fallback={
            <div className="w-full h-[calc(100vh-6.2rem)] md:h-[calc(100vh-7.2rem)] lg:h-[calc(100dvh-7.2rem)] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-slate-300 dark:border-zinc-700 border-t-cyan-500 rounded-full animate-spin" />
            </div>
        }>
            <TenantsContent />
        </Suspense>
    );
}
