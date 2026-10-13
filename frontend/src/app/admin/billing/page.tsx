"use client";
import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import CustomSelect from '@/components/CustomSelect';
import {
    Receipt,
    CreditCard,
    DollarSign,
    Clock,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Search,
    Plus,
    RefreshCw,
    List,
    LayoutGrid,
    Eye,
    Edit,
    Trash2,
    Calendar,
    ArrowUpRight,
    Building2,
    User,
    Check,
    X,
    Printer,
    Zap,
    Droplets,
    Home,
    Layers,
    ShieldCheck,
    TrendingUp,
    ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

export interface Bill {
    id: number;
    tenant_id: number;
    tenant_name: string;
    room_id: number | null;
    room_number: string | null;
    billing_month: string;
    due_date: string;
    rent_amount: number;
    water_charges: number;
    electricity_charges: number;
    other_fees: number;
    total_amount: number;
    amount_paid: number;
    balance: number;
    status: string;
    notes: string | null;
    created_at?: string;
    payments?: any[];
}

export interface BillFormData {
    tenant_id: number | '';
    room_id: number | '';
    billing_month: string;
    due_date: string;
    rent_amount: number;
    water_charges: number;
    electricity_charges: number;
    other_fees: number;
    notes: string;
}

export interface PaymentFormData {
    amount_paid: number | '';
    payment_date: string;
    payment_method: string;
    notes: string;
}

interface Tenant { 
    id: number; 
    name: string; 
    room_id: number | null; 
    room_number?: string;
}

interface Room { 
    id: number; 
    room_number: string; 
    price: number; 
}

interface PendingPayment {
    id: number;
    bill_id: number;
    amount_paid: string;
    payment_date: string;
    payment_method: string;
    notes: string;
    receipt_url: string;
    status: string;
    billing_month: string;
    bill_total: string;
    bill_balance: string;
    tenant_name: string;
    room_number: string;
}

interface DetailedBill extends Bill {
    tenant_email?: string;
    tenant_phone?: string;
}

const cardVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } }
};

export default function AdminBilling() {
    const [bills, setBills] = useState<Bill[]>([]);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
    const [allPayments, setAllPayments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Active Tab & View Mode
    const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<'All' | 'Pending Verification' | 'Overdue' | 'Partial' | 'Unpaid' | 'Paid'>('All');
    const [monthFilter, setMonthFilter] = useState("All");
    const [roomFilter, setRoomFilter] = useState("All Rooms");
    const [sortFilter, setSortFilter] = useState("Newest First");

    // Modals
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isPayOpen, setIsPayOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
    const [isGenerateConfirmOpen, setIsGenerateConfirmOpen] = useState(false);

    // Selected items & forms
    const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
    const [billDetails, setBillDetails] = useState<DetailedBill | null>(null);
    const [currentVerifyIndex, setCurrentVerifyIndex] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const initialBillForm: BillFormData = {
        tenant_id: '',
        room_id: '',
        billing_month: '',
        due_date: new Date().toISOString().split('T')[0],
        rent_amount: 0,
        water_charges: 0,
        electricity_charges: 0,
        other_fees: 0,
        notes: ''
    };
    const [billForm, setBillForm] = useState<BillFormData>(initialBillForm);

    const initialPaymentForm: PaymentFormData = {
        amount_paid: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'Cash',
        notes: ''
    };
    const [paymentForm, setPaymentForm] = useState<PaymentFormData>(initialPaymentForm);

    // --- DATA FETCHING ---
    const fetchData = async (showToast = false) => {
        if (showToast) setIsRefreshing(true);
        try {
            const [billsRes, tenantsRes, roomsRes, pendingRes, paymentsRes] = await Promise.all([
                api.get('/admin/bills'),
                api.get('/admin/tenants'),
                api.get('/admin/rooms'),
                api.get('/admin/bills/payments/pending'),
                api.get('/admin/bills/payments')
            ]);
            setBills(billsRes.data);
            setTenants(tenantsRes.data);
            setRooms(roomsRes.data);
            setPendingPayments(pendingRes.data);
            setAllPayments(paymentsRes.data);
            if (showToast) toast.success("Billing ledgers synchronized");
        } catch (error) {
            console.error("Failed to fetch billing data:", error);
            if (showToast) toast.error("Failed to sync billing data");
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- MONTH OPTIONS ---
    const uniqueMonths = useMemo(() => {
        const months = Array.from(new Set(bills.map(b => b.billing_month))).filter(Boolean);
        return months.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    }, [bills]);

    const monthOptions = useMemo(() => {
        return [
            { value: "All", label: "All Months" },
            ...uniqueMonths.map(m => ({ value: m, label: m }))
        ];
    }, [uniqueMonths]);

    // --- ROOM OPTIONS ---
    const uniqueRooms = useMemo(() => {
        const roomNumbers = Array.from(new Set(rooms.map(r => r.room_number))).filter(Boolean);
        return ["All Rooms", ...roomNumbers.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map(r => `Room ${r}`)];
    }, [rooms]);

    // --- METRICS COMPUTATION ---
    const metrics = useMemo(() => {
        const totalInvoiced = bills.reduce((acc, b) => acc + (Number(b.total_amount) || 0), 0);
        const totalCollected = bills.reduce((acc, b) => acc + (Number(b.amount_paid) || 0), 0);
        const totalBalance = bills.reduce((acc, b) => acc + (Number(b.balance) || 0), 0);
        const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;
        
        const overdueBills = bills.filter(b => b.status === 'Overdue');
        const overdueAmount = overdueBills.reduce((acc, b) => acc + (Number(b.balance) || 0), 0);
        const overdueCount = overdueBills.length;

        const pendingVerificationCount = pendingPayments.length;
        const paidCount = bills.filter(b => b.status === 'Paid').length;
        const partialCount = bills.filter(b => b.status === 'Partial').length;
        const unpaidCount = bills.filter(b => b.status === 'Unpaid').length;

        return {
            totalInvoiced,
            totalCollected,
            totalBalance,
            collectionRate,
            overdueAmount,
            overdueCount,
            pendingVerificationCount,
            paidCount,
            partialCount,
            unpaidCount
        };
    }, [bills, pendingPayments]);

    // --- FILTERED INVOICES ---
    const filteredBills = useMemo(() => {
        return bills.filter(bill => {
            // Status Category
            if (statusFilter !== 'All' && bill.status !== statusFilter) return false;

            // Month Filter
            if (monthFilter !== 'All' && bill.billing_month !== monthFilter) return false;

            // Room Filter
            if (roomFilter !== 'All Rooms') {
                const targetRoom = roomFilter.replace('Room ', '').trim();
                if (bill.room_number !== targetRoom) return false;
            }

            // Search Query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchTenant = bill.tenant_name?.toLowerCase().includes(q);
                const matchRoom = bill.room_number?.toString().toLowerCase().includes(q);
                const matchNotes = bill.notes ? bill.notes.toLowerCase().includes(q) : false;
                const matchMonth = bill.billing_month?.toLowerCase().includes(q);
                if (!matchTenant && !matchRoom && !matchNotes && !matchMonth) return false;
            }

            return true;
        }).sort((a, b) => {
            if (sortFilter === 'Highest Balance') return (Number(b.balance) || 0) - (Number(a.balance) || 0);
            if (sortFilter === 'Highest Total') return (Number(b.total_amount) || 0) - (Number(a.total_amount) || 0);
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
    }, [bills, statusFilter, monthFilter, roomFilter, searchQuery, sortFilter]);

    // --- FILTERED PAYMENTS ---
    const filteredPayments = useMemo(() => {
        return allPayments.filter(payment => {
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchTenant = payment.tenant_name?.toLowerCase().includes(q);
                const matchRoom = payment.room_number?.toString().toLowerCase().includes(q);
                const matchMethod = payment.payment_method?.toLowerCase().includes(q);
                const matchMonth = payment.billing_month?.toLowerCase().includes(q);
                if (!matchTenant && !matchRoom && !matchMethod && !matchMonth) return false;
            }
            return true;
        });
    }, [allPayments, searchQuery]);

    // --- FORM HANDLERS ---
    const handleTenantSelect = (tenantIdStr: string) => {
        const tenantId = Number(tenantIdStr);
        const tenant = tenants.find(t => t.id === tenantId);
        const room = rooms.find(r => r.id === tenant?.room_id);
        const defaultRent = room?.price || 0;

        setBillForm({
            ...billForm,
            tenant_id: tenantId,
            room_id: tenant?.room_id || '',
            rent_amount: Number(defaultRent)
        });
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!billForm.tenant_id) {
            toast.error("Please select a tenant");
            return;
        }

        try {
            setIsSubmitting(true);
            await api.post('/admin/bills', billForm);
            toast.success("Billing invoice issued successfully");
            setIsCreateOpen(false);
            setBillForm(initialBillForm);
            fetchData();
        } catch (error: any) {
            console.error("Create bill error:", error);
            toast.error(error.response?.data?.message || "Failed to create invoice.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBill) return;

        try {
            setIsSubmitting(true);
            await api.put(`/admin/bills/${selectedBill.id}`, billForm);
            toast.success("Invoice updated successfully");
            setIsEditOpen(false);
            fetchData();
        } catch (error: any) {
            console.error("Edit bill error:", error);
            toast.error("Failed to update invoice.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePaySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBill) return;

        try {
            setIsSubmitting(true);
            await api.post(`/admin/bills/${selectedBill.id}/pay`, paymentForm);
            toast.success("Payment recorded into ledger");
            setIsPayOpen(false);
            setPaymentForm(initialPaymentForm);
            fetchData();
        } catch (error: any) {
            console.error("Payment error:", error);
            toast.error(error.response?.data?.message || "Failed to record payment.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteBill = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this invoice? This will remove all associated charges.")) return;
        try {
            await api.delete(`/admin/bills/${id}`);
            toast.success("Invoice deleted successfully");
            fetchData();
        } catch (error: any) {
            console.error("Delete invoice error:", error);
            toast.error("Failed to delete invoice.");
        }
    };

    const handleGenerateMonthly = async () => {
        try {
            setIsSubmitting(true);
            await api.post('/admin/bills/generate');
            toast.success("Monthly billing invoices generated for all active residents!");
            setIsGenerateConfirmOpen(false);
            fetchData();
        } catch (error: any) {
            console.error("Auto generate bills error:", error);
            toast.error(error.response?.data?.message || "Failed to generate monthly bills.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVerifyPayment = async (paymentId: number, action: 'approve' | 'reject') => {
        try {
            await api.post(`/admin/bills/payments/${paymentId}/verify`, { action });
            toast.success(`Payment verified: ${action === 'approve' ? 'Approved' : 'Rejected'}`);
            fetchData();
            if (pendingPayments.length <= 1) {
                setIsVerifyModalOpen(false);
            }
        } catch (error) {
            console.error("Verification error:", error);
            toast.error(`Failed to ${action} payment verification.`);
        }
    };

    // --- MODAL OPENERS ---
    const openViewModal = async (bill: Bill) => {
        setSelectedBill(bill);
        setBillDetails(null);
        setIsViewOpen(true);
        try {
            const { data } = await api.get(`/admin/bills/${bill.id}`);
            setBillDetails(data);
        } catch (error) {
            console.error("Error fetching bill details:", error);
            toast.error("Failed to load invoice statement details.");
        }
    };

    const openEditModal = (bill: Bill) => {
        setSelectedBill(bill);
        setBillForm({
            tenant_id: bill.tenant_id,
            room_id: bill.room_id || '',
            billing_month: bill.billing_month,
            due_date: bill.due_date ? new Date(bill.due_date).toISOString().split('T')[0] : '',
            rent_amount: Number(bill.rent_amount) || 0,
            water_charges: Number(bill.water_charges) || 0,
            electricity_charges: Number(bill.electricity_charges) || 0,
            other_fees: Number(bill.other_fees) || 0,
            notes: bill.notes || ''
        });
        setIsEditOpen(true);
    };

    const openPayModal = (bill: Bill) => {
        setSelectedBill(bill);
        setPaymentForm({
            amount_paid: Number(bill.balance) || '',
            payment_date: new Date().toISOString().split('T')[0],
            payment_method: 'Cash',
            notes: ''
        });
        setIsPayOpen(true);
    };

    // Status Badge Helpers
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Paid':
                return {
                    label: 'Paid',
                    className: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20',
                    dot: 'bg-emerald-500'
                };
            case 'Partial':
                return {
                    label: 'Partial',
                    className: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200/50 dark:border-blue-500/20',
                    dot: 'bg-blue-500'
                };
            case 'Pending Verification':
                return {
                    label: 'Pending Verification',
                    className: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/20',
                    dot: 'bg-amber-500 animate-pulse'
                };
            case 'Overdue':
                return {
                    label: 'Overdue',
                    className: 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200/50 dark:border-rose-500/20',
                    dot: 'bg-rose-500 animate-pulse'
                };
            default:
                return {
                    label: 'Unpaid',
                    className: 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700',
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
                            <div className="h-6 w-48 bg-slate-200 dark:bg-zinc-800 rounded-md"></div>
                            <div className="h-5 w-20 bg-slate-200 dark:bg-zinc-800 rounded-full"></div>
                        </div>
                        <div className="h-3.5 w-80 bg-slate-200 dark:bg-zinc-800 rounded-md mt-1.5"></div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="h-8 w-28 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                        <div className="h-8 w-20 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                        <div className="h-8 w-32 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                        <div className="h-8 w-32 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                    </div>
                </div>

                {/* 2. Executive Financial Metric Ribbon (4 Tiles) */}
                <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3 shadow-xs flex items-center justify-between">
                            <div className="space-y-1.5 flex-1">
                                <div className="h-2.5 w-24 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                                <div className="h-6 w-32 bg-slate-200 dark:bg-zinc-800 rounded-md"></div>
                                <div className="h-2.5 w-24 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 shrink-0"></div>
                        </div>
                    ))}
                </div>

                {/* 3. Navigation Tab Bar & Quick Filters */}
                <div className="shrink-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-2 shadow-xs">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                        <div className="flex items-center gap-1 overflow-x-auto">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-7 w-32 bg-slate-100 dark:bg-zinc-800 rounded-md"></div>
                            ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="h-7 w-40 bg-slate-100 dark:bg-zinc-800 rounded-lg"></div>
                            <div className="h-7 w-28 bg-slate-100 dark:bg-zinc-800 rounded-lg"></div>
                            <div className="h-7 w-28 bg-slate-100 dark:bg-zinc-800 rounded-lg"></div>
                            <div className="h-7 w-28 bg-slate-100 dark:bg-zinc-800 rounded-lg"></div>
                        </div>
                    </div>
                </div>

                {/* 4. Main Ledger Table */}
                <div className="flex-1 min-h-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs flex flex-col">
                    <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                        <table className="w-full min-w-full text-left text-xs border-collapse">
                            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-zinc-800 shadow-xs">
                                <tr className="h-10 text-slate-700 dark:text-zinc-300 uppercase tracking-wider text-[11px] font-bold">
                                    <th className="py-2.5 px-4"><div className="h-3 w-28 bg-slate-200 dark:bg-zinc-700 rounded"></div></th>
                                    <th className="py-2.5 px-4"><div className="h-3 w-28 bg-slate-200 dark:bg-zinc-700 rounded"></div></th>
                                    <th className="py-2.5 px-3 text-right"><div className="h-3 w-16 bg-slate-200 dark:bg-zinc-700 rounded ml-auto"></div></th>
                                    <th className="py-2.5 px-3 text-right"><div className="h-3 w-16 bg-slate-200 dark:bg-zinc-700 rounded ml-auto"></div></th>
                                    <th className="py-2.5 px-3 text-right"><div className="h-3 w-16 bg-slate-200 dark:bg-zinc-700 rounded ml-auto"></div></th>
                                    <th className="py-2.5 px-3 text-center"><div className="h-3 w-16 bg-slate-200 dark:bg-zinc-700 rounded mx-auto"></div></th>
                                    <th className="py-2.5 px-3"><div className="h-3 w-20 bg-slate-200 dark:bg-zinc-700 rounded"></div></th>
                                    <th className="py-2.5 px-4 text-right"><div className="h-3 w-20 bg-slate-200 dark:bg-zinc-700 rounded ml-auto"></div></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 font-sans">
                                {[...Array(7)].map((_, i) => (
                                    <tr key={i} className="h-12">
                                        <td className="py-2 px-4">
                                            <div className="flex items-center gap-2">
                                                <div className="h-4 w-20 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                                                <div className="h-3.5 w-16 bg-slate-100 dark:bg-zinc-800/60 rounded"></div>
                                            </div>
                                        </td>
                                        <td className="py-2 px-4">
                                            <div className="space-y-1">
                                                <div className="h-3.5 w-24 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                                                <div className="h-3 w-16 bg-slate-100 dark:bg-zinc-800/60 rounded"></div>
                                            </div>
                                        </td>
                                        <td className="py-2 px-3 text-right"><div className="h-4 w-16 bg-slate-100 dark:bg-zinc-800 rounded ml-auto"></div></td>
                                        <td className="py-2 px-3 text-right"><div className="h-4 w-16 bg-slate-100 dark:bg-zinc-800 rounded ml-auto"></div></td>
                                        <td className="py-2 px-3 text-right"><div className="h-4 w-16 bg-slate-100 dark:bg-zinc-800 rounded ml-auto"></div></td>
                                        <td className="py-2 px-3 text-center"><div className="h-5 w-20 bg-slate-100 dark:bg-zinc-800 rounded-full mx-auto"></div></td>
                                        <td className="py-2 px-3"><div className="h-3.5 w-20 bg-slate-100 dark:bg-zinc-800 rounded"></div></td>
                                        <td className="py-2 px-4 text-right"><div className="h-6 w-24 bg-slate-100 dark:bg-zinc-800 rounded-lg ml-auto"></div></td>
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
                            Bills and Payments
                        </h1>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">
                            {filteredBills.length} records
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                        Financial ledger, automated rent invoices, utility submeters, and GCash/Maya online verification.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* View Switcher for Invoices Tab */}
                    {activeTab === 'invoices' && (
                        <div className="flex items-center bg-slate-100 dark:bg-zinc-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-zinc-700/80 text-xs font-semibold">
                            <button
                                onClick={() => setViewMode('table')}
                                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${viewMode === 'table' ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs font-bold' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'}`}
                                title="Ledger table view"
                            >
                                <List className="w-3.5 h-3.5" />
                                <span>Table</span>
                            </button>
                            <button
                                onClick={() => setViewMode('cards')}
                                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${viewMode === 'cards' ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs font-bold' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'}`}
                                title="Statement cards view"
                            >
                                <LayoutGrid className="w-3.5 h-3.5" />
                                <span>Cards</span>
                            </button>
                        </div>
                    )}

                    {/* Auto-Generate Button */}
                    <button
                        onClick={() => setIsGenerateConfirmOpen(true)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-800 bg-card hover:bg-slate-50 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5 shadow-xs"
                        title="Auto-generate monthly billing for all active tenants"
                    >
                        <Layers className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="hidden sm:inline">Batch Invoicing</span>
                    </button>

                    {/* Refresh Sync Button */}
                    <button
                        onClick={() => fetchData(true)}
                        disabled={isRefreshing}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-800 bg-card hover:bg-slate-50 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5 shadow-xs"
                        title="Sync billing records"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-teal-600' : ''}`} />
                        <span>{isRefreshing ? 'Syncing...' : 'Sync'}</span>
                    </button>

                    {/* Create Single Bill Button */}
                    <button
                        onClick={() => {
                            setBillForm(initialBillForm);
                            setIsCreateOpen(true);
                        }}
                        className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-all flex items-center gap-1.5 shadow-xs shadow-teal-600/20"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Issue Bill</span>
                    </button>
                </div>
            </div>

            {/* 2. Executive Metric Ribbon (4 High-Density KPI Tiles) */}
            <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                
                {/* Metric 1: Total Receivables */}
                <motion.div variants={cardVariants} initial="hidden" animate="show" className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Gross Receivables</span>
                        <div className="text-xl font-extrabold font-mono text-slate-900 dark:text-white mt-0.5 flex items-baseline gap-1.5">
                            ₱{metrics.totalInvoiced.toLocaleString()}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mt-0.5">
                            {bills.length} total bills issued
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-500/10 border border-teal-200/50 dark:border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
                        <Receipt className="w-5 h-5" />
                    </div>
                </motion.div>

                {/* Metric 2: Collected Revenue */}
                <motion.div variants={cardVariants} initial="hidden" animate="show" className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Realized Income</span>
                        <div className="text-xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-baseline gap-1.5">
                            ₱{metrics.totalCollected.toLocaleString()}
                        </div>
                        <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            <span>{metrics.collectionRate}% collected</span>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                        <DollarSign className="w-5 h-5" />
                    </div>
                </motion.div>

                {/* Metric 3: GCash / Maya Verification */}
                <motion.div 
                    variants={cardVariants} 
                    initial="hidden" 
                    animate="show" 
                    onClick={() => {
                        if (metrics.pendingVerificationCount > 0) {
                            setCurrentVerifyIndex(0);
                            setIsVerifyModalOpen(true);
                        }
                    }}
                    className={`bg-card border rounded-xl p-3 shadow-xs flex items-center justify-between transition-all ${
                        metrics.pendingVerificationCount > 0 
                            ? 'border-amber-300 dark:border-amber-500/40 hover:bg-amber-50/40 dark:hover:bg-amber-500/5 cursor-pointer' 
                            : 'border-slate-200 dark:border-zinc-800'
                    }`}
                >
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">E-Receipt Triage</span>
                            {metrics.pendingVerificationCount > 0 && (
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                            )}
                        </div>
                        <div className="text-xl font-extrabold font-mono text-amber-600 dark:text-amber-400 mt-0.5 flex items-baseline gap-1.5">
                            {metrics.pendingVerificationCount} Pending
                        </div>
                        <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                            {metrics.pendingVerificationCount > 0 ? 'Click to inspect & approve' : 'All digital receipts verified'}
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                        <Clock className="w-5 h-5" />
                    </div>
                </motion.div>

                {/* Metric 4: Arrears / Past Due */}
                <motion.div variants={cardVariants} initial="hidden" animate="show" className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Outstanding Arrears</span>
                        <div className="text-xl font-extrabold font-mono text-rose-600 dark:text-rose-400 mt-0.5 flex items-baseline gap-1.5">
                            ₱{metrics.totalBalance.toLocaleString()}
                        </div>
                        <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-0.5 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{metrics.overdueCount} bills overdue</span>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200/50 dark:border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                </motion.div>

            </div>

            {/* 3. Triage Category Tabs & Filter Toolbar */}
            <div className="shrink-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-2 shadow-xs space-y-2">
                
                {/* Top Row: Main Tab Navigation (Invoices vs Payments) & Triage Pills */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-800/80 pb-2">
                    {/* Primary Mode Tabs */}
                    <div className="flex items-center bg-slate-100 dark:bg-zinc-800/90 p-0.5 rounded-lg border border-slate-200 dark:border-zinc-700/80 text-xs font-bold">
                        <button
                            onClick={() => setActiveTab('invoices')}
                            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                                activeTab === 'invoices' 
                                    ? 'bg-white dark:bg-zinc-900 text-teal-600 dark:text-teal-400 shadow-xs font-black' 
                                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>Invoices & Dues</span>
                            <span className="text-[10px] px-1.5 py-0.2 bg-teal-50 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 rounded-full font-mono">
                                {bills.length}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('payments')}
                            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                                activeTab === 'payments' 
                                    ? 'bg-white dark:bg-zinc-900 text-teal-600 dark:text-teal-400 shadow-xs font-black' 
                                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Payment Journal</span>
                            <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-full font-mono">
                                {allPayments.length}
                            </span>
                        </button>
                    </div>

                    {/* Status Triage Filter Pills (when in Invoices mode) */}
                    {activeTab === 'invoices' && (
                        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar text-xs">
                            {[
                                { key: 'All', label: 'All Invoices', count: bills.length },
                                { key: 'Pending Verification', label: 'Verification', count: metrics.pendingVerificationCount, alert: metrics.pendingVerificationCount > 0 },
                                { key: 'Overdue', label: 'Overdue', count: metrics.overdueCount, alert: metrics.overdueCount > 0 },
                                { key: 'Partial', label: 'Partial', count: metrics.partialCount },
                                { key: 'Unpaid', label: 'Unpaid', count: metrics.unpaidCount },
                                { key: 'Paid', label: 'Paid', count: metrics.paidCount }
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
                    )}
                </div>

                {/* Bottom Row: Search & Filters */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                    
                    {/* Search Field */}
                    <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                        <input
                            type="text"
                            placeholder={activeTab === 'invoices' ? "Filter tenant name, room, or notes..." : "Search payment records..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full py-1.5 pl-8 pr-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    {/* Invoice Selectors */}
                    {activeTab === 'invoices' && (
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Month Selector */}
                            <div className="w-36">
                                <CustomSelect
                                    value={monthFilter}
                                    onChange={(val) => setMonthFilter(val)}
                                    options={monthOptions}
                                    className="py-1.5 px-3 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300"
                                />
                            </div>

                            {/* Room Selector */}
                            <div className="w-32">
                                <CustomSelect
                                    value={roomFilter}
                                    onChange={(val) => setRoomFilter(val)}
                                    options={uniqueRooms}
                                    className="py-1.5 px-3 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300"
                                />
                            </div>

                            {/* Sort Selector */}
                            <div className="w-36">
                                <CustomSelect
                                    value={sortFilter}
                                    onChange={(val) => setSortFilter(val)}
                                    options={["Newest First", "Oldest First", "Highest Balance", "Highest Total"]}
                                    className="py-1.5 px-3 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300"
                                />
                            </div>
                        </div>
                    )}
                </div>

            </div>

            {/* 4. Main Content Area (Locked 1-page layout with inner scrollbar) */}
            <div className="flex-1 min-h-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs flex flex-col">
                
                {activeTab === 'invoices' ? (
                    viewMode === 'table' ? (
                        /* INVOICES TABLE */
                        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                            <table className="w-full min-w-full text-left text-xs border-collapse">
                                <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-zinc-800 shadow-xs">
                                    <tr className="h-[40px] text-slate-700 dark:text-zinc-300 uppercase tracking-wider text-[11px] font-bold">
                                        <th className="py-2.5 px-4 bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Tenant & Room</th>
                                        <th className="py-2.5 px-3 bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Period & Due</th>
                                        <th className="py-2.5 px-3 text-right bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Rent</th>
                                        <th className="py-2.5 px-3 text-right bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Water</th>
                                        <th className="py-2.5 px-3 text-right bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Power</th>
                                        <th className="py-2.5 px-3 text-right bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Gross Total</th>
                                        <th className="py-2.5 px-3 text-right bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Paid</th>
                                        <th className="py-2.5 px-3 text-right bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Balance</th>
                                        <th className="py-2.5 px-3 text-center bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Status</th>
                                        <th className="py-2.5 px-4 text-right bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 font-sans">
                                    {filteredBills.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="py-12 text-center text-slate-400 dark:text-zinc-500">
                                                <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                                <p className="font-semibold text-sm">No billing records found matching your filters.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredBills.map(bill => {
                                            const status = getStatusBadge(bill.status);
                                            const isOverdue = bill.status === 'Overdue';

                                            return (
                                                <tr 
                                                    key={bill.id} 
                                                    className="h-[48px] hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors group"
                                                >
                                                    {/* Tenant & Room */}
                                                    <td className="py-2 px-4 whitespace-nowrap">
                                                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                                            <span>{bill.tenant_name}</span>
                                                        </div>
                                                        <div className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                                                            {bill.room_number ? `Room ${bill.room_number}` : 'No Room Assigned'}
                                                        </div>
                                                    </td>

                                                    {/* Period & Due Date */}
                                                    <td className="py-2 px-3 whitespace-nowrap">
                                                        <div className="font-semibold text-slate-800 dark:text-zinc-200">
                                                            {bill.billing_month}
                                                        </div>
                                                        <div className={`text-[11px] font-mono ${isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-400 dark:text-zinc-500'}`}>
                                                            Due {bill.due_date ? new Date(bill.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
                                                        </div>
                                                    </td>

                                                    {/* Base Rent */}
                                                    <td className="py-2 px-3 text-right font-mono text-slate-700 dark:text-zinc-300">
                                                        ₱{Number(bill.rent_amount).toLocaleString()}
                                                    </td>

                                                    {/* Water */}
                                                    <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-zinc-400">
                                                        ₱{Number(bill.water_charges).toLocaleString()}
                                                    </td>

                                                    {/* Power */}
                                                    <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-zinc-400">
                                                        ₱{Number(bill.electricity_charges).toLocaleString()}
                                                    </td>

                                                    {/* Total Due */}
                                                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                                                        ₱{Number(bill.total_amount).toLocaleString()}
                                                    </td>

                                                    {/* Amount Paid */}
                                                    <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                                                        ₱{Number(bill.amount_paid).toLocaleString()}
                                                    </td>

                                                    {/* Outstanding Balance */}
                                                    <td className="py-2 px-3 text-right font-mono font-bold whitespace-nowrap">
                                                        <span className={Number(bill.balance) > 0 ? (isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400') : 'text-slate-400 dark:text-zinc-500'}>
                                                            ₱{Number(bill.balance).toLocaleString()}
                                                        </span>
                                                    </td>

                                                    {/* Status Badge */}
                                                    <td className="py-2 px-3 text-center whitespace-nowrap">
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${status.className}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
                                                            {status.label}
                                                        </span>
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="py-2 px-4 text-right whitespace-nowrap">
                                                        <div className="flex items-center justify-end gap-1">
                                                            {/* View Statement */}
                                                            <button
                                                                onClick={() => openViewModal(bill)}
                                                                className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                                                                title="View Statement"
                                                            >
                                                                <Eye className="w-3.5 h-3.5" />
                                                            </button>

                                                            {/* Record Payment */}
                                                            {bill.status !== 'Paid' && (
                                                                <button
                                                                    onClick={() => openPayModal(bill)}
                                                                    className="px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20 text-[11px] font-bold transition-colors flex items-center gap-1"
                                                                    title="Record Payment"
                                                                >
                                                                    <DollarSign className="w-3 h-3" />
                                                                    <span>Pay</span>
                                                                </button>
                                                            )}

                                                            {/* Edit Charges */}
                                                            <button
                                                                onClick={() => openEditModal(bill)}
                                                                className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400 hover:text-indigo-600 transition-colors"
                                                                title="Edit Charges"
                                                            >
                                                                <Edit className="w-3.5 h-3.5" />
                                                            </button>

                                                            {/* Delete Bill */}
                                                            <button
                                                                onClick={() => handleDeleteBill(bill.id)}
                                                                className="p-1.5 rounded-md hover:bg-rose-100 dark:hover:bg-rose-500/20 text-slate-400 hover:text-rose-600 transition-colors"
                                                                title="Delete Bill"
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
                        /* INVOICES STATEMENT CARDS GRID */
                        <div className="overflow-y-auto flex-1 p-3 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {filteredBills.length === 0 ? (
                                    <div className="col-span-full py-12 text-center text-slate-400 dark:text-zinc-500">
                                        <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                        <p className="font-semibold text-sm">No billing records found matching your filters.</p>
                                    </div>
                                ) : (
                                    filteredBills.map(bill => {
                                        const status = getStatusBadge(bill.status);
                                        return (
                                            <div 
                                                key={bill.id} 
                                                className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between"
                                            >
                                                <div>
                                                    <div className="flex items-start justify-between gap-2 mb-2">
                                                        <div>
                                                            <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                                                                {bill.tenant_name}
                                                            </span>
                                                            <div className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                                                                {bill.room_number ? `Room ${bill.room_number}` : 'No Room'} · {bill.billing_month}
                                                            </div>
                                                        </div>
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${status.className}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
                                                            {status.label}
                                                        </span>
                                                    </div>

                                                    {/* Cost breakdown pill */}
                                                    <div className="bg-slate-50 dark:bg-zinc-900/60 rounded-lg p-2.5 border border-slate-100 dark:border-zinc-800 space-y-1 mb-3 text-xs">
                                                        <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                                                            <span>Base Rent</span>
                                                            <span className="font-mono font-bold text-slate-900 dark:text-white">₱{Number(bill.rent_amount).toLocaleString()}</span>
                                                        </div>
                                                        {(Number(bill.water_charges) > 0 || Number(bill.electricity_charges) > 0) && (
                                                            <div className="flex justify-between text-slate-500 dark:text-zinc-500 text-[11px]">
                                                                <span>Utilities (Water+Elec)</span>
                                                                <span className="font-mono">₱{(Number(bill.water_charges) + Number(bill.electricity_charges)).toLocaleString()}</span>
                                                            </div>
                                                        )}
                                                        <div className="pt-1 border-t border-slate-200 dark:border-zinc-800 flex justify-between font-bold">
                                                            <span className="text-slate-700 dark:text-zinc-300">Remaining Balance</span>
                                                            <span className={`font-mono text-sm ${Number(bill.balance) > 0 ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                                ₱{Number(bill.balance).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Card Footer Actions */}
                                                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                                                    <span className="text-[10px] text-slate-400 font-mono">
                                                        Due: {bill.due_date ? new Date(bill.due_date).toLocaleDateString() : 'N/A'}
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => openViewModal(bill)}
                                                            className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                                            title="View Statement"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </button>
                                                        {bill.status !== 'Paid' && (
                                                            <button
                                                                onClick={() => openPayModal(bill)}
                                                                className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold"
                                                            >
                                                                Pay
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )
                ) : (
                    /* PAYMENTS AUDIT JOURNAL TABLE */
                    <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                        <table className="w-full min-w-full text-left text-xs border-collapse">
                            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-zinc-800 shadow-xs">
                                <tr className="h-[40px] text-slate-700 dark:text-zinc-300 uppercase tracking-wider text-[11px] font-bold">
                                    <th className="py-2.5 px-4 bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Payment Date</th>
                                    <th className="py-2.5 px-4 bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Resident Name</th>
                                    <th className="py-2.5 px-3 bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Room</th>
                                    <th className="py-2.5 px-3 bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Billing Period</th>
                                    <th className="py-2.5 px-3 bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Payment Method</th>
                                    <th className="py-2.5 px-4 text-right bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Amount Paid</th>
                                    <th className="py-2.5 px-3 text-center bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Audit Status</th>
                                    <th className="py-2.5 px-4 bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700">Reference / Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 font-sans">
                                {filteredPayments.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-zinc-500">
                                            <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                            <p className="font-semibold text-sm">No payment records found in the ledger.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredPayments.map(payment => (
                                        <tr 
                                            key={payment.id} 
                                            className="h-[46px] hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                                        >
                                            {/* Date */}
                                            <td className="py-2 px-4 whitespace-nowrap font-mono text-slate-800 dark:text-zinc-200">
                                                {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                            </td>

                                            {/* Tenant Name */}
                                            <td className="py-2 px-4 whitespace-nowrap font-bold text-slate-900 dark:text-white">
                                                {payment.tenant_name}
                                            </td>

                                            {/* Room */}
                                            <td className="py-2 px-3 whitespace-nowrap text-slate-600 dark:text-zinc-400 font-semibold">
                                                {payment.room_number ? `Room ${payment.room_number}` : 'N/A'}
                                            </td>

                                            {/* Month */}
                                            <td className="py-2 px-3 whitespace-nowrap text-slate-600 dark:text-zinc-400">
                                                {payment.billing_month}
                                            </td>

                                            {/* Method */}
                                            <td className="py-2 px-3 whitespace-nowrap">
                                                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                                                    {payment.payment_method || 'Cash'}
                                                </span>
                                            </td>

                                            {/* Amount Paid */}
                                            <td className="py-2 px-4 text-right whitespace-nowrap font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                                                ₱{Number(payment.amount_paid).toLocaleString()}
                                            </td>

                                            {/* Status */}
                                            <td className="py-2 px-3 text-center whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                    payment.status === 'Approved' || payment.status === 'Verified' || !payment.status
                                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20'
                                                        : payment.status === 'Rejected'
                                                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200/50 dark:border-rose-500/20'
                                                            : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/20'
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                                        payment.status === 'Approved' || payment.status === 'Verified' || !payment.status ? 'bg-emerald-500' : payment.status === 'Rejected' ? 'bg-rose-500' : 'bg-amber-500'
                                                    }`}></span>
                                                    {payment.status || 'Verified'}
                                                </span>
                                            </td>

                                            {/* Notes / Receipt */}
                                            <td className="py-2 px-4 text-slate-500 dark:text-zinc-400 text-xs truncate max-w-xs">
                                                {payment.notes || '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

            </div>

            {/* ============================================================== */}
            {/* 5. MODALS & SLIDE-OVERS */}
            {/* ============================================================== */}
            <AnimatePresence>

                {/* MODAL 1: VIEW STATEMENT DETAILS */}
                {isViewOpen && selectedBill && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3">
                        <motion.div initial={{ scale: 0.96, y: 8, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh]">
                            
                            {/* Modal Header */}
                            <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-slate-50/80 dark:bg-zinc-900/60">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                                            Statement of Account
                                        </h2>
                                        <span className="text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 font-mono font-bold">
                                            INV-#{selectedBill.id}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                                        Period: {selectedBill.billing_month} · Due Date: {selectedBill.due_date ? new Date(selectedBill.due_date).toLocaleDateString() : 'N/A'}
                                    </p>
                                </div>
                                <button onClick={() => setIsViewOpen(false)} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-5 overflow-y-auto custom-scrollbar space-y-4">
                                {!billDetails ? (
                                    <div className="py-12 flex justify-center">
                                        <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Resident Card */}
                                        <div className="bg-slate-50 dark:bg-zinc-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                                            <div>
                                                <div className="text-xs font-bold uppercase text-slate-400">Resident Information</div>
                                                <div className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">{billDetails.tenant_name}</div>
                                                <div className="text-xs text-slate-500 dark:text-zinc-400">{billDetails.tenant_email || 'No email registered'} · {billDetails.tenant_phone || 'No phone registered'}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs font-bold uppercase text-slate-400">Room Unit</div>
                                                <div className="text-base font-extrabold text-teal-600 dark:text-teal-400 mt-0.5">{billDetails.room_number ? `Room ${billDetails.room_number}` : 'N/A'}</div>
                                            </div>
                                        </div>

                                        {/* Charges Breakdown */}
                                        <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                                            <div className="bg-slate-100 dark:bg-zinc-800/80 px-3.5 py-2 text-xs font-bold uppercase text-slate-700 dark:text-zinc-300">
                                                Itemized Charges
                                            </div>
                                            <div className="p-3.5 space-y-2 text-xs">
                                                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-zinc-800/50">
                                                    <span className="text-slate-600 dark:text-zinc-400 flex items-center gap-1.5"><Home className="w-3.5 h-3.5 text-indigo-500" /> Room Rent</span>
                                                    <span className="font-mono font-bold">₱{Number(billDetails.rent_amount).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-zinc-800/50">
                                                    <span className="text-slate-600 dark:text-zinc-400 flex items-center gap-1.5"><Droplets className="w-3.5 h-3.5 text-blue-500" /> Water Charges (Fixed)</span>
                                                    <span className="font-mono font-bold">₱{Number(billDetails.water_charges).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-zinc-800/50">
                                                    <span className="text-slate-600 dark:text-zinc-400 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-500" /> Electricity Charges (Submeter)</span>
                                                    <span className="font-mono font-bold">₱{Number(billDetails.electricity_charges).toLocaleString()}</span>
                                                </div>
                                                {Number(billDetails.other_fees) > 0 && (
                                                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-zinc-800/50">
                                                        <span className="text-slate-600 dark:text-zinc-400">Other Maintenance Fees</span>
                                                        <span className="font-mono font-bold">₱{Number(billDetails.other_fees).toLocaleString()}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between pt-2 text-sm font-extrabold">
                                                    <span>Gross Invoice Total</span>
                                                    <span className="font-mono text-slate-900 dark:text-white">₱{Number(billDetails.total_amount).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Financial Status Summary */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-emerald-50 dark:bg-emerald-500/10 p-3 rounded-xl border border-emerald-200/50 dark:border-emerald-500/20">
                                                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Total Paid</div>
                                                <div className="text-lg font-mono font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5">₱{Number(billDetails.amount_paid).toLocaleString()}</div>
                                            </div>
                                            <div className="bg-rose-50 dark:bg-rose-500/10 p-3 rounded-xl border border-rose-200/50 dark:border-rose-500/20">
                                                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">Remaining Balance</div>
                                                <div className="text-lg font-mono font-extrabold text-rose-700 dark:text-rose-300 mt-0.5">₱{Number(billDetails.balance).toLocaleString()}</div>
                                            </div>
                                        </div>

                                        {/* Payments History on this Bill */}
                                        <div className="space-y-1.5">
                                            <div className="text-xs font-bold uppercase text-slate-400">Recorded Payments for this Invoice</div>
                                            {billDetails.payments && billDetails.payments.length > 0 ? (
                                                <div className="divide-y divide-slate-100 dark:divide-zinc-800 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                                                    {billDetails.payments.map((p, idx) => (
                                                        <div key={idx} className="p-2.5 flex justify-between items-center text-xs">
                                                            <div>
                                                                <span className="font-bold text-slate-800 dark:text-zinc-200">{p.payment_method}</span>
                                                                <span className="text-slate-400 ml-2">· {new Date(p.payment_date).toLocaleDateString()}</span>
                                                                {p.notes && <div className="text-[11px] text-slate-500 italic mt-0.5">{p.notes}</div>}
                                                            </div>
                                                            <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                                +₱{Number(p.amount_paid).toLocaleString()}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800">
                                                    No payments recorded yet for this invoice.
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-3.5 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/60 flex justify-between items-center">
                                <button
                                    onClick={() => window.print()}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5"
                                >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span>Print Statement</span>
                                </button>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setIsViewOpen(false)}
                                        className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300"
                                    >
                                        Close
                                    </button>
                                    {billDetails && Number(billDetails.balance) > 0 && (
                                        <button
                                            onClick={() => {
                                                setIsViewOpen(false);
                                                openPayModal(billDetails);
                                            }}
                                            className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1"
                                        >
                                            <DollarSign className="w-3.5 h-3.5" />
                                            <span>Record Payment</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                        </motion.div>
                    </motion.div>
                )}

                {/* MODAL 2: RECORD PAYMENT */}
                {isPayOpen && selectedBill && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3">
                        <motion.div initial={{ scale: 0.96, y: 8, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
                            
                            <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-slate-50/80 dark:bg-zinc-900/60">
                                <div>
                                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Record Resident Payment</h2>
                                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{selectedBill.tenant_name} · Room {selectedBill.room_number || 'N/A'}</p>
                                </div>
                                <button onClick={() => setIsPayOpen(false)} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handlePaySubmit} className="p-5 space-y-4">
                                {/* Balance highlight */}
                                <div className="bg-amber-50 dark:bg-amber-500/10 p-3 rounded-xl border border-amber-200/50 dark:border-amber-500/20 flex justify-between items-center">
                                    <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase">Current Balance</span>
                                    <span className="text-xl font-mono font-black text-amber-700 dark:text-amber-400">₱{Number(selectedBill.balance).toLocaleString()}</span>
                                </div>

                                {/* Amount Paid Field with Quick Fill Buttons */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center text-xs">
                                        <label className="font-bold text-slate-700 dark:text-zinc-300">Amount Paid (₱)</label>
                                        <div className="flex gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => setPaymentForm({ ...paymentForm, amount_paid: Number(selectedBill.balance) })}
                                                className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold"
                                            >
                                                Full (100%)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPaymentForm({ ...paymentForm, amount_paid: Math.round(Number(selectedBill.balance) / 2) })}
                                                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 text-[10px] font-bold"
                                            >
                                                50%
                                            </button>
                                        </div>
                                    </div>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        max={Number(selectedBill.balance)}
                                        value={paymentForm.amount_paid}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, amount_paid: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                                        className="w-full px-3 py-2 text-base font-mono font-bold rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500 text-right"
                                    />
                                </div>

                                {/* Method & Date */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Payment Method</label>
                                        <CustomSelect
                                            value={paymentForm.payment_method}
                                            onChange={(val) => setPaymentForm({ ...paymentForm, payment_method: val })}
                                            options={["Cash", "GCash", "Maya", "Bank Transfer", "Other"]}
                                            className="py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 font-semibold"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Payment Date</label>
                                        <input
                                            required
                                            type="date"
                                            value={paymentForm.payment_date}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                                            className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                                        />
                                    </div>
                                </div>

                                {/* Notes */}
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Notes / Reference No.</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. GCash Ref #1289381..."
                                        value={paymentForm.notes}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                                        className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    />
                                </div>

                                {/* Remaining Balance Preview */}
                                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex justify-between items-center text-xs">
                                    <span className="text-slate-500">Remaining After Payment:</span>
                                    <span className="font-mono font-extrabold text-slate-900 dark:text-white">
                                        ₱{Math.max(0, Number(selectedBill.balance) - (Number(paymentForm.amount_paid) || 0)).toLocaleString()}
                                    </span>
                                </div>

                                {/* Buttons */}
                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsPayOpen(false)}
                                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs"
                                    >
                                        {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                        <span>Confirm Payment</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}

                {/* MODAL 3: ISSUE / CREATE INVOICE */}
                {isCreateOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3">
                        <motion.div initial={{ scale: 0.96, y: 8, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
                            
                            <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-slate-50/80 dark:bg-zinc-900/60">
                                <div>
                                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Issue Single Invoice</h2>
                                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Generate a billing invoice with itemized utility charges.</p>
                                </div>
                                <button onClick={() => setIsCreateOpen(false)} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* Tenant Selection */}
                                    <div className="space-y-1 sm:col-span-2">
                                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Resident / Tenant</label>
                                        <CustomSelect
                                            value={billForm.tenant_id?.toString() || ''}
                                            onChange={(val) => handleTenantSelect(val)}
                                            options={[
                                                { value: "", label: "Select Resident" },
                                                ...tenants.map(t => ({
                                                    value: t.id.toString(),
                                                    label: `${t.name} (Rm ${rooms.find(r => r.id === t.room_id)?.room_number || 'N/A'})`
                                                }))
                                            ]}
                                            className="py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 font-semibold"
                                        />
                                    </div>

                                    {/* Billing Month */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Billing Month</label>
                                        <input
                                            required
                                            type="text"
                                            placeholder="e.g. October 2026"
                                            value={billForm.billing_month}
                                            onChange={(e) => setBillForm({ ...billForm, billing_month: e.target.value })}
                                            className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                                        />
                                    </div>

                                    {/* Due Date */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Due Date</label>
                                        <input
                                            required
                                            type="date"
                                            value={billForm.due_date}
                                            onChange={(e) => setBillForm({ ...billForm, due_date: e.target.value })}
                                            className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                                        />
                                    </div>
                                </div>

                                {/* Charges Breakdown */}
                                <div className="border border-slate-200 dark:border-zinc-800 rounded-xl p-3 bg-slate-50/50 dark:bg-zinc-900/40 space-y-3">
                                    <div className="text-xs font-bold uppercase text-slate-500">Itemized Charges (₱)</div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                        <div className="space-y-1">
                                            <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">Base Rent</label>
                                            <input
                                                required
                                                type="number"
                                                step="0.01"
                                                value={billForm.rent_amount}
                                                onChange={(e) => setBillForm({ ...billForm, rent_amount: parseFloat(e.target.value) || 0 })}
                                                className="w-full py-1.5 px-2 text-xs font-mono font-bold rounded-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-right"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">Water</label>
                                            <input
                                                required
                                                type="number"
                                                step="0.01"
                                                value={billForm.water_charges}
                                                onChange={(e) => setBillForm({ ...billForm, water_charges: parseFloat(e.target.value) || 0 })}
                                                className="w-full py-1.5 px-2 text-xs font-mono font-bold rounded-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-right"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">Electricity</label>
                                            <input
                                                required
                                                type="number"
                                                step="0.01"
                                                value={billForm.electricity_charges}
                                                onChange={(e) => setBillForm({ ...billForm, electricity_charges: parseFloat(e.target.value) || 0 })}
                                                className="w-full py-1.5 px-2 text-xs font-mono font-bold rounded-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-right"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">Other Fees</label>
                                            <input
                                                required
                                                type="number"
                                                step="0.01"
                                                value={billForm.other_fees}
                                                onChange={(e) => setBillForm({ ...billForm, other_fees: parseFloat(e.target.value) || 0 })}
                                                className="w-full py-1.5 px-2 text-xs font-mono font-bold rounded-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-right"
                                            />
                                        </div>
                                    </div>

                                    {/* Live Total Calculation */}
                                    <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-center text-xs">
                                        <span className="font-bold text-slate-700 dark:text-zinc-300">Calculated Invoice Total:</span>
                                        <span className="text-base font-mono font-extrabold text-teal-600 dark:text-teal-400">
                                            ₱{(
                                                (Number(billForm.rent_amount) || 0) +
                                                (Number(billForm.water_charges) || 0) +
                                                (Number(billForm.electricity_charges) || 0) +
                                                (Number(billForm.other_fees) || 0)
                                            ).toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Notes / Remarks</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Submeter kWh meter reading attached..."
                                        value={billForm.notes}
                                        onChange={(e) => setBillForm({ ...billForm, notes: e.target.value })}
                                        className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 font-semibold text-slate-900 dark:text-white"
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateOpen(false)}
                                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-4 py-2 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5 shadow-xs"
                                    >
                                        {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                        <span>Create Invoice</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}

                {/* MODAL 4: EDIT INVOICE */}
                {isEditOpen && selectedBill && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3">
                        <motion.div initial={{ scale: 0.96, y: 8, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
                            
                            <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-slate-50/80 dark:bg-zinc-900/60">
                                <div>
                                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Edit Invoice Charges</h2>
                                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">INV-#{selectedBill.id} for {selectedBill.tenant_name}</p>
                                </div>
                                <button onClick={() => setIsEditOpen(false)} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Billing Month</label>
                                        <input
                                            required
                                            type="text"
                                            value={billForm.billing_month}
                                            onChange={(e) => setBillForm({ ...billForm, billing_month: e.target.value })}
                                            className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 font-semibold"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Due Date</label>
                                        <input
                                            required
                                            type="date"
                                            value={billForm.due_date}
                                            onChange={(e) => setBillForm({ ...billForm, due_date: e.target.value })}
                                            className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 font-semibold"
                                        />
                                    </div>
                                </div>

                                <div className="border border-slate-200 dark:border-zinc-800 rounded-xl p-3 bg-slate-50/50 dark:bg-zinc-900/40 space-y-3">
                                    <div className="text-xs font-bold uppercase text-slate-500">Adjust Charges (₱)</div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                        <div className="space-y-1">
                                            <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">Rent</label>
                                            <input
                                                required
                                                type="number"
                                                step="0.01"
                                                value={billForm.rent_amount}
                                                onChange={(e) => setBillForm({ ...billForm, rent_amount: parseFloat(e.target.value) || 0 })}
                                                className="w-full py-1.5 px-2 text-xs font-mono font-bold rounded-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-right"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">Water</label>
                                            <input
                                                required
                                                type="number"
                                                step="0.01"
                                                value={billForm.water_charges}
                                                onChange={(e) => setBillForm({ ...billForm, water_charges: parseFloat(e.target.value) || 0 })}
                                                className="w-full py-1.5 px-2 text-xs font-mono font-bold rounded-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-right"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">Electricity</label>
                                            <input
                                                required
                                                type="number"
                                                step="0.01"
                                                value={billForm.electricity_charges}
                                                onChange={(e) => setBillForm({ ...billForm, electricity_charges: parseFloat(e.target.value) || 0 })}
                                                className="w-full py-1.5 px-2 text-xs font-mono font-bold rounded-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-right"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">Other</label>
                                            <input
                                                required
                                                type="number"
                                                step="0.01"
                                                value={billForm.other_fees}
                                                onChange={(e) => setBillForm({ ...billForm, other_fees: parseFloat(e.target.value) || 0 })}
                                                className="w-full py-1.5 px-2 text-xs font-mono font-bold rounded-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-right"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Notes / Remarks</label>
                                    <input
                                        type="text"
                                        value={billForm.notes}
                                        onChange={(e) => setBillForm({ ...billForm, notes: e.target.value })}
                                        className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 font-semibold"
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditOpen(false)}
                                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-xs"
                                    >
                                        {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                        <span>Save Changes</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}

                {/* MODAL 5: VERIFY ONLINE E-RECEIPTS (GCASH / MAYA) */}
                {isVerifyModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3">
                        <motion.div initial={{ scale: 0.96, y: 8, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                            
                            <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-slate-50/80 dark:bg-zinc-900/60">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="w-5 h-5 text-amber-500" />
                                    <div>
                                        <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                                            Digital Receipt Verification
                                        </h2>
                                        <p className="text-xs text-slate-500 dark:text-zinc-400">
                                            {pendingPayments.length} submission{pendingPayments.length !== 1 ? 's' : ''} awaiting review
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setIsVerifyModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
                                {pendingPayments.length === 0 ? (
                                    <div className="py-12 text-center text-slate-400">
                                        <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
                                        <p className="font-bold text-sm">All caught up! No pending receipts.</p>
                                    </div>
                                ) : (
                                    (() => {
                                        const safeIndex = Math.max(0, Math.min(currentVerifyIndex, pendingPayments.length - 1));
                                        const payment = pendingPayments[safeIndex];

                                        return (
                                            <div className="space-y-4">
                                                {/* Carousel Controls */}
                                                <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                                                    <span>Submission {safeIndex + 1} of {pendingPayments.length}</span>
                                                    <div className="flex gap-1.5">
                                                        <button
                                                            disabled={safeIndex === 0}
                                                            onClick={() => setCurrentVerifyIndex(safeIndex - 1)}
                                                            className="px-2.5 py-1 bg-slate-100 dark:bg-zinc-800 rounded disabled:opacity-40"
                                                        >
                                                            Previous
                                                        </button>
                                                        <button
                                                            disabled={safeIndex === pendingPayments.length - 1}
                                                            onClick={() => setCurrentVerifyIndex(safeIndex + 1)}
                                                            className="px-2.5 py-1 bg-slate-100 dark:bg-zinc-800 rounded disabled:opacity-40"
                                                        >
                                                            Next
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Split details & image */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-3">
                                                        <div className="bg-slate-50 dark:bg-zinc-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-2 text-xs">
                                                            <div>
                                                                <span className="text-[10px] uppercase font-bold text-slate-400">Resident</span>
                                                                <div className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">{payment.tenant_name}</div>
                                                                <div className="text-slate-500">Room {payment.room_number || 'N/A'} · {payment.billing_month}</div>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                                                                <div>
                                                                    <span className="text-[10px] uppercase font-bold text-slate-400">Payment Method</span>
                                                                    <div className="font-bold text-slate-800 dark:text-zinc-200">{payment.payment_method}</div>
                                                                </div>
                                                                <div>
                                                                    <span className="text-[10px] uppercase font-bold text-slate-400">Payment Date</span>
                                                                    <div className="font-bold text-slate-800 dark:text-zinc-200">{new Date(payment.payment_date).toLocaleDateString()}</div>
                                                                </div>
                                                            </div>

                                                            <div className="pt-2 border-t border-slate-100 dark:border-zinc-800">
                                                                <span className="text-[10px] uppercase font-bold text-slate-400">Amount Claimed</span>
                                                                <div className="text-2xl font-mono font-black text-emerald-600 dark:text-emerald-400">
                                                                    ₱{Number(payment.amount_paid).toLocaleString()}
                                                                </div>
                                                                <div className="text-[11px] text-slate-500">Bill Total: ₱{Number(payment.bill_total).toLocaleString()}</div>
                                                            </div>

                                                            {payment.notes && (
                                                                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800">
                                                                    <span className="text-[10px] uppercase font-bold text-slate-400">Tenant Note / Reference</span>
                                                                    <div className="italic text-slate-700 dark:text-zinc-300 mt-0.5">{payment.notes}</div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    handleVerifyPayment(payment.id, 'approve');
                                                                    if (safeIndex > 0) setCurrentVerifyIndex(safeIndex - 1);
                                                                }}
                                                                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                                <span>Approve Payment</span>
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    handleVerifyPayment(payment.id, 'reject');
                                                                    if (safeIndex > 0) setCurrentVerifyIndex(safeIndex - 1);
                                                                }}
                                                                className="flex-1 py-2.5 rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 font-bold text-xs flex items-center justify-center gap-1.5"
                                                            >
                                                                <X className="w-4 h-4" />
                                                                <span>Reject Proof</span>
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Receipt Preview */}
                                                    <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-slate-100 dark:bg-zinc-900 flex items-center justify-center min-h-[260px]">
                                                        {payment.receipt_url ? (
                                                            <img
                                                                src={`http://localhost:5000${payment.receipt_url}`}
                                                                alt="Payment Receipt"
                                                                className="max-h-[340px] max-w-full object-contain cursor-zoom-in"
                                                                onClick={() => window.open(`http://localhost:5000${payment.receipt_url}`, '_blank')}
                                                                title="Click to view full receipt"
                                                            />
                                                        ) : (
                                                            <div className="text-xs text-slate-400 font-semibold p-4 text-center">
                                                                No uploaded screenshot attachment found.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* MODAL 6: CONFIRM BATCH INVOICING */}
                {isGenerateConfirmOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3">
                        <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                    <Layers className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Batch Generate Monthly Bills</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Automated rent invoices for all active residents.</p>
                                </div>
                            </div>

                            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                                This will automatically generate a monthly rental bill for all active residents who do not yet have an invoice for the current calendar month. Existing invoices will not be duplicated.
                            </p>

                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                                <button
                                    onClick={() => setIsGenerateConfirmOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleGenerateMonthly}
                                    disabled={isSubmitting}
                                    className="px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
                                >
                                    {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                    <span>Generate Invoices</span>
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

            </AnimatePresence>

        </div>
    );
}
