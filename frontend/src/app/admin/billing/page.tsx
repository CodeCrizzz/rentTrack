"use client";
import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import CustomSelect from '@/components/CustomSelect';

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

interface Tenant { id: number; name: string; room_id: number; }
interface Room { id: number; room_number: string; price: number; }

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.05 }
    }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function AdminBilling() {
    const [bills, setBills] = useState<Bill[]>([]);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");

    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isPayOpen, setIsPayOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);

    const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
    const [billDetails, setBillDetails] = useState<Bill | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const initialBillForm: BillFormData = {
        tenant_id: '',
        room_id: '',
        billing_month: '',
        due_date: '',
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

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [billsRes, tenantsRes, roomsRes] = await Promise.all([
                api.get('/admin/bills'),
                api.get('/admin/tenants'),
                api.get('/admin/rooms')
            ]);
            setBills(billsRes.data);
            setTenants(tenantsRes.data);
            setRooms(roomsRes.data);
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredBills = useMemo(() => {
        return bills.filter(bill => {
            const matchesSearch = bill.tenant_name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === "All" || bill.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [bills, searchQuery, statusFilter]);

    const handleTenantChange = (tenantId: string) => {
        const tenant = tenants.find(t => t.id === Number(tenantId));
        setBillForm({
            ...billForm,
            tenant_id: Number(tenantId),
            room_id: tenant?.room_id || '',
            rent_amount: rooms.find(r => r.id === tenant?.room_id)?.price || 0
        });
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBill) return;
        try {
            setIsSubmitting(true);
            await api.put(`/admin/bills/${selectedBill.id}`, billForm);
            setIsEditOpen(false);
            fetchData();
        } catch (error) {
            console.error("Edit bill failed:", error);
            alert("Failed to edit bill.");
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
            setIsPayOpen(false);
            setPaymentForm(initialPaymentForm);
            fetchData();
        } catch (error) {
            console.error("Payment failed:", error);
            alert("Failed to record payment.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const openViewModal = async (bill: Bill) => {
        setSelectedBill(bill);
        setIsViewOpen(true);
        setBillDetails(null);
        try {
            const { data } = await api.get(`/admin/bills/${bill.id}`);
            setBillDetails(data);
        } catch (error) {
            console.error("Fetch bill details failed");
        }
    };

    const openEditModal = (bill: Bill) => {
        setSelectedBill(bill);
        setBillForm({
            tenant_id: bill.tenant_id,
            room_id: bill.room_id || '',
            billing_month: bill.billing_month,
            due_date: new Date(bill.due_date).toISOString().split('T')[0],
            rent_amount: bill.rent_amount,
            water_charges: bill.water_charges,
            electricity_charges: bill.electricity_charges,
            other_fees: bill.other_fees,
            notes: bill.notes || ''
        });
        setIsEditOpen(true);
    };

    const openPayModal = (bill: Bill) => {
        setSelectedBill(bill);
        setPaymentForm({
            ...initialPaymentForm,
            amount_paid: Number(bill.balance) || ''
        });
        setIsPayOpen(true);
    };

    const handleDeleteBill = async (id: number) => {
        if (!confirm("Are you sure you want to delete this bill? This action cannot be undone.")) return;
        try {
            await api.delete(`/admin/bills/${id}`);
            fetchData();
        } catch (error) {
            console.error("Delete failed");
            alert("Failed to delete bill.");
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Paid': return {
                bg: 'bg-emerald-50 dark:bg-emerald-500/10',
                text: 'text-emerald-700 dark:text-emerald-400',
                border: 'border-emerald-200 dark:border-emerald-500/20',
                glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]',
                dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
            };
            case 'Unpaid': return {
                bg: 'bg-rose-50 dark:bg-rose-500/10',
                text: 'text-rose-700 dark:text-rose-400',
                border: 'border-rose-200 dark:border-rose-500/20',
                glow: 'shadow-[0_0_15px_rgba(244,63,94,0.2)]',
                dot: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
            };
            case 'Partial': return {
                bg: 'bg-amber-50 dark:bg-amber-500/10',
                text: 'text-amber-700 dark:text-amber-400',
                border: 'border-amber-200 dark:border-amber-500/20',
                glow: 'shadow-[0_0_15px_rgba(245,158,11,0.2)]',
                dot: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
            };
            case 'Overdue': return {
                bg: 'bg-rose-50 dark:bg-rose-500/10',
                text: 'text-rose-700 dark:text-rose-400',
                border: 'border-rose-200 dark:border-rose-500/20',
                glow: 'shadow-[0_0_15px_rgba(244,63,94,0.4)] animate-pulse',
                dot: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-pulse'
            };
            default: return {
                bg: 'bg-secondary/50',
                text: 'text-slate-600 dark:text-zinc-400',
                border: 'border-slate-200 dark:border-zinc-500/20',
                glow: '',
                dot: 'bg-slate-500'
            };
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto pb-10 relative">

            <motion.div initial={{opacity:0, y:-20}} animate={{opacity:1, y:0}} className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10 mb-8">
                <div>
                    <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-4">
                        Billing
                        {bills.filter(b => b.status === 'Unpaid' || b.status === 'Overdue').length > 0 && (
                            <span className="inline-flex items-center px-4 py-1.5 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-black uppercase tracking-widest animate-pulse">
                                {bills.filter(b => b.status === 'Unpaid' || b.status === 'Overdue').length} Unpaid
                            </span>
                        )}
                    </h1>
                    <p className="text-slate-500 dark:text-zinc-400 font-bold text-sm uppercase tracking-[0.2em] mt-2">Manage Invoices & Payments</p>
                </div>
            </motion.div>

            <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: 0.1}} className="flex flex-col md:flex-row gap-4 relative z-10 mb-8 bg-card backdrop-blur-2xl p-4 rounded-[2rem] border border-slate-200/60 dark:border-zinc-800/60 shadow-xl dark:shadow-2xl">
                <div className="relative flex-1 group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500 group-focus-within:text-emerald-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                    <input 
                        type="text" 
                        placeholder="Search by Tenant Name..." 
                        className="w-full pl-14 pr-6 py-4 rounded-2xl bg-card/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder-zinc-500 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-inner"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="relative w-full md:w-48 shrink-0">
                    <CustomSelect 
                        value={statusFilter}
                        onChange={(val) => setStatusFilter(val)}
                        options={[
                            { value: "All", label: "All Statuses" },
                            { value: "Paid", label: "Paid" },
                            { value: "Unpaid", label: "Unpaid" },
                            { value: "Partial", label: "Partial" },
                            { value: "Overdue", label: "Overdue" }
                        ]}
                        className="w-full py-4 pl-5 pr-10 rounded-2xl bg-card/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                </div>
            </motion.div>

            {isLoading ? (
                <div className="flex items-center justify-center min-h-[40vh]">
                    <div className="relative flex flex-col items-center justify-center">
                        <div className="w-16 h-16 border-4 border-slate-200 dark:border-zinc-800 border-t-emerald-500 dark:border-t-emerald-500 rounded-full animate-spin relative z-10 shadow-[0_0_30px_rgba(16,185,129,0.3)]"></div>
                        <p className="text-slate-500 dark:text-zinc-400 font-bold text-xs uppercase tracking-[0.2em] mt-6 animate-pulse">Loading Bills...</p>
                    </div>
                </div>
            ) : filteredBills.length === 0 ? (
                <motion.div initial={{opacity:0}} animate={{opacity:1}} className="bg-card backdrop-blur-2xl rounded-[2.5rem] border border-slate-200 dark:border-zinc-800 p-16 text-center shadow-2xl">
                    <div className="w-24 h-24 bg-secondary rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-slate-200 dark:border-zinc-800">
                        <svg className="w-10 h-10 text-emerald-500 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" /></svg>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">No billing records found</h3>
                    <p className="text-sm font-bold text-slate-500 dark:text-zinc-500">{searchQuery ? "Try adjusting your filters." : "All tenants are caught up!"}</p>
                </motion.div>
            ) : (
                <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredBills.map((b) => {
                        const sStyle = getStatusStyle(b.status);
                        
                        return (
                            <motion.div key={b.id} variants={itemVariants} className="relative group rounded-3xl p-[1px] overflow-hidden bg-gradient-to-b from-slate-200 to-slate-100 dark:from-white/10 dark:to-transparent hover:shadow-[0_0_40px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_0_40px_rgba(255,255,255,0.05)] transition-shadow duration-500">
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
                                <div className="h-full w-full bg-card backdrop-blur-3xl rounded-[23px] p-6 flex flex-col relative overflow-hidden transition-transform duration-500 group-hover:scale-[0.99]">
                                    
                                    <div className="flex justify-between items-start mb-5">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-black text-xl shadow-lg group-hover:scale-110 transition-transform duration-500">
                                            {b.tenant_name.charAt(0)}
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border bg-white/50 dark:bg-card/50 backdrop-blur-md ${sStyle.border}`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${sStyle.dot}`}></div>
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${sStyle.text}`}>{b.status}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mb-5 flex-1">
                                        <h3 className="font-black text-slate-900 dark:text-white text-xl leading-tight mb-1 truncate" title={b.tenant_name}>{b.tenant_name}</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Rm {b.room_number || 'N/A'}</span>
                                            <span className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">•</span>
                                            <span className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">{b.billing_month}</span>
                                        </div>
                                    </div>

                                    <div className="bg-secondary/50 rounded-2xl p-4 border border-slate-200 dark:border-zinc-800 mb-4 flex flex-col gap-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest">Total</span>
                                            <span className="font-bold text-slate-900 dark:text-white text-sm">₱ {Number(b.total_amount).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-t border-slate-200 dark:border-zinc-800/80 pt-3">
                                            <span className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest">Balance</span>
                                            <span className={`font-black text-lg ${Number(b.balance) > 0 ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-500 dark:text-emerald-400'}`}>₱ {Number(b.balance).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="text-center">
                                        <span className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Due: {new Date(b.due_date).toLocaleDateString()}</span>
                                    </div>

                                    <div className="absolute inset-0 bg-white/60 dark:bg-card/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 px-4">
                                        <button onClick={() => openViewModal(b)} className="flex-1 h-12 rounded-2xl bg-card border border-slate-200 dark:border-zinc-700 shadow-xl flex items-center justify-center text-slate-700 dark:text-zinc-300 hover:text-blue-500 hover:border-blue-500 transition-colors hover:scale-[1.02] active:scale-95 text-xs font-bold uppercase tracking-widest gap-2" title="View Details">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                        </button>
                                        {b.status !== 'Paid' && (
                                            <button onClick={() => openPayModal(b)} className="flex-1 h-12 rounded-2xl bg-emerald-500 border border-emerald-400 flex items-center justify-center text-white hover:bg-emerald-400 transition-colors hover:scale-[1.02] active:scale-95 text-xs font-bold uppercase tracking-widest gap-2" title="Record Payment">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                            </button>
                                        )}
                                    </div>
                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex flex-col gap-2">
                                        <button onClick={() => openEditModal(b)} className="w-8 h-8 rounded-full bg-card shadow-md border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-500 hover:text-indigo-500 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                                        <button onClick={() => handleDeleteBill(b.id)} className="w-8 h-8 rounded-full bg-card shadow-md border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-500 hover:text-rose-500 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>
            )}

            <AnimatePresence>
            {isViewOpen && selectedBill && (
                <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <motion.div initial={{scale:0.9, y:20, opacity:0}} animate={{scale:1, y:0, opacity:1}} exit={{scale:0.95, y:10, opacity:0}} transition={{type: "spring", damping: 25, stiffness: 300}} className="bg-linear-to-br from-white/80 to-slate-50/50 dark:from-background/80 dark:to-transparent backdrop-blur-3xl rounded-[2.5rem] w-full max-w-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.3)] border border-slate-200 dark:border-zinc-800 flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-slate-200 dark:border-zinc-800 bg-card/50 flex justify-between items-start gap-4">
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Invoice Details</h2>
                                <p className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest mt-2">{selectedBill.billing_month} • Due {new Date(selectedBill.due_date).toLocaleDateString()}</p>
                            </div>
                            <button onClick={() => setIsViewOpen(false)} className="w-10 h-10 rounded-xl bg-secondary border border-slate-200 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700 flex items-center justify-center text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors shrink-0">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        
                        <div className="p-8 overflow-y-auto custom-scrollbar w-full">
                            {!billDetails ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <div className="w-8 h-8 border-4 border-slate-200 dark:border-zinc-800 border-t-emerald-500 dark:border-t-emerald-500 rounded-full animate-spin"></div>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 bg-secondary/50 p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-inner">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-black text-2xl shadow-lg">
                                                {billDetails.tenant_name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-black text-2xl text-slate-900 dark:text-white">{billDetails.tenant_name}</p>
                                                <p className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest mt-1">Room {billDetails.room_number || 'N/A'}</p>
                                            </div>
                                        </div>
                                        <div className="text-left sm:text-right w-full sm:w-auto">
                                            <div className="mb-2">
                                                {(() => {
                                                    const sStyle = getStatusStyle(billDetails.status);
                                                    return (
                                                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${sStyle.bg} ${sStyle.border}`}>
                                                            <div className={`w-1.5 h-1.5 rounded-full ${sStyle.dot}`}></div>
                                                            <span className={`text-[9px] font-black uppercase tracking-widest ${sStyle.text}`}>{billDetails.status}</span>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                            <p className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Total Amount</p>
                                            <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">₱ {Number(billDetails.total_amount).toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div>
                                            <h3 className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-4">Charges Breakdown</h3>
                                            <div className="bg-secondary/30 rounded-2xl p-6 border border-slate-200 dark:border-zinc-800 space-y-4">
                                                <div className="flex justify-between items-center"><span className="text-sm font-bold text-slate-600 dark:text-zinc-400">Rent</span><span className="font-bold text-slate-900 dark:text-white text-sm">₱ {Number(billDetails.rent_amount).toLocaleString()}</span></div>
                                                <div className="flex justify-between items-center"><span className="text-sm font-bold text-slate-600 dark:text-zinc-400">Electricity</span><span className="font-bold text-slate-900 dark:text-white text-sm">₱ {Number(billDetails.electricity_charges).toLocaleString()}</span></div>
                                                <div className="flex justify-between items-center"><span className="text-sm font-bold text-slate-600 dark:text-zinc-400">Water</span><span className="font-bold text-slate-900 dark:text-white text-sm">₱ {Number(billDetails.water_charges).toLocaleString()}</span></div>
                                                <div className="flex justify-between items-center"><span className="text-sm font-bold text-slate-600 dark:text-zinc-400">Other Fees</span><span className="font-bold text-slate-900 dark:text-white text-sm">₱ {Number(billDetails.other_fees).toLocaleString()}</span></div>
                                                
                                                <div className="pt-4 mt-2 border-t border-slate-200 dark:border-zinc-800 border-dashed">
                                                    <div className="flex justify-between items-center"><span className="text-xs font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest">Subtotal</span><span className="font-black text-slate-900 dark:text-white text-lg">₱ {Number(billDetails.total_amount).toLocaleString()}</span></div>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-4">Payment Summary</h3>
                                            <div className="bg-emerald-50/50 dark:bg-emerald-500/5 rounded-2xl p-6 border border-emerald-100 dark:border-emerald-500/10 mb-6">
                                                <div className="flex justify-between items-center mb-3">
                                                    <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Total Paid</span>
                                                    <span className="font-black text-emerald-600 dark:text-emerald-300 text-lg">₱ {Number(billDetails.amount_paid).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center pt-3 border-t border-emerald-200/50 dark:border-emerald-500/20">
                                                    <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">Remaining Balance</span>
                                                    <span className="font-black text-rose-600 dark:text-rose-400 text-xl">₱ {Number(billDetails.balance).toLocaleString()}</span>
                                                </div>
                                            </div>

                                            <h3 className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-4">Transactions</h3>
                                            {billDetails.payments && billDetails.payments.length > 0 ? (
                                                <div className="space-y-3">
                                                    {billDetails.payments.map((p, idx) => (
                                                        <div key={idx} className="bg-secondary/50 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 flex justify-between items-center">
                                                            <div>
                                                                <p className="font-bold text-slate-900 dark:text-white text-sm">₱ {Number(p.amount_paid).toLocaleString()}</p>
                                                                <p className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest mt-1">{new Date(p.payment_date).toLocaleDateString()} • {p.payment_method}</p>
                                                            </div>
                                                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="bg-secondary/30 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 border-dashed text-center">
                                                    <p className="text-xs font-bold text-slate-500 dark:text-zinc-500">No payments recorded yet.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-slate-200 dark:border-zinc-800 bg-secondary/50 flex justify-end gap-3">
                            <button onClick={() => setIsViewOpen(false)} className="px-6 py-3.5 font-bold text-slate-500 dark:text-zinc-400 bg-secondary hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-xl transition-colors text-xs uppercase tracking-widest">Close</button>
                            {billDetails && billDetails.status !== 'Paid' && (
                                <button onClick={() => { setIsViewOpen(false); openPayModal(billDetails); }} className="px-6 py-3.5 font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] flex items-center justify-center gap-2 text-xs uppercase tracking-widest">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    Record Payment
                                </button>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {isPayOpen && selectedBill && (
                <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <motion.div initial={{scale:0.9, y:20, opacity:0}} animate={{scale:1, y:0, opacity:1}} exit={{scale:0.95, y:10, opacity:0}} transition={{type: "spring", damping: 25, stiffness: 300}} className="bg-linear-to-br from-white/80 to-slate-50/50 dark:from-background/80 dark:to-transparent backdrop-blur-3xl rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.3)] border border-slate-200 dark:border-zinc-800 flex flex-col">
                        <div className="px-8 py-6 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-card/50">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Record Payment</h2>
                                <p className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest mt-1">For {selectedBill.tenant_name}</p>
                            </div>
                            <button onClick={() => setIsPayOpen(false)} className="w-10 h-10 rounded-xl bg-secondary border border-slate-200 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700 flex items-center justify-center text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <form onSubmit={handlePaySubmit} className="p-8 flex flex-col gap-6">
                            <div className="bg-amber-50 dark:bg-amber-500/10 rounded-2xl p-6 border border-amber-200 dark:border-amber-500/20 text-center shadow-inner">
                                <p className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest mb-1">Remaining Balance</p>
                                <p className="text-4xl font-black text-amber-700 dark:text-amber-400">₱ {Number(selectedBill.balance).toLocaleString()}</p>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest pl-1">Amount Paid (₱)</label>
                                <input required type="number" step="0.01" max={Number(selectedBill.balance)} value={paymentForm.amount_paid} onChange={e => setPaymentForm({...paymentForm, amount_paid: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full px-5 py-4 rounded-2xl bg-secondary border border-slate-200 dark:border-zinc-800 text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-black text-xl outline-none shadow-inner transition-all text-center" />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest pl-1">Method</label>
                                    <div className="relative">
                                        <CustomSelect 
                                            value={paymentForm.payment_method} 
                                            onChange={val => setPaymentForm({...paymentForm, payment_method: val})} 
                                            options={["Cash", "GCash", "Bank Transfer", "Other"]}
                                            className="w-full px-5 py-4 rounded-2xl bg-secondary border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none shadow-inner transition-all text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest pl-1">Date</label>
                                    <input required type="date" value={paymentForm.payment_date} onChange={e => setPaymentForm({...paymentForm, payment_date: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-secondary border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none shadow-inner transition-all text-sm [color-scheme:light_dark]" />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 mt-2 border-t border-slate-200 dark:border-zinc-800/80">
                                <button type="button" onClick={() => setIsPayOpen(false)} className="px-6 py-4 font-black text-slate-500 dark:text-zinc-400 bg-secondary hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-2xl transition-all uppercase tracking-widest text-[10px] w-full sm:w-auto">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="px-6 py-4 font-black bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-2xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] uppercase tracking-widest text-[10px] w-full sm:w-auto flex justify-center items-center gap-2 disabled:opacity-70">
                                    {isSubmitting ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : 'Confirm Payment'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}

            {isEditOpen && (
                <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <motion.div initial={{scale:0.9, y:20, opacity:0}} animate={{scale:1, y:0, opacity:1}} exit={{scale:0.95, y:10, opacity:0}} transition={{type: "spring", damping: 25, stiffness: 300}} className="bg-linear-to-br from-white/80 to-slate-50/50 dark:from-background/80 dark:to-transparent backdrop-blur-3xl rounded-[2.5rem] w-full max-w-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.3)] border border-slate-200 dark:border-zinc-800 flex flex-col max-h-[90vh]">
                        <div className="px-8 py-6 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-card/50">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Edit Invoice</h2>
                            </div>
                            <button onClick={() => setIsEditOpen(false)} className="w-10 h-10 rounded-xl bg-secondary border border-slate-200 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700 flex items-center justify-center text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="flex flex-col overflow-hidden">
                            <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest pl-1">Tenant</label>
                                        <div className="relative">
                                            <CustomSelect 
                                                disabled 
                                                value={billForm.tenant_id?.toString() || ''} 
                                                onChange={(val) => handleTenantChange(val)} 
                                                options={[
                                                    { value: "", label: "Select Tenant" },
                                                    ...tenants.map(t => ({ value: t.id.toString(), label: `${t.name} (Rm ${rooms.find(r=>r.id===t.room_id)?.room_number})` }))
                                                ]}
                                                className="w-full px-5 py-4 rounded-2xl bg-secondary border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-500 font-bold outline-none shadow-inner opacity-70"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest pl-1">Billing Month</label>
                                            <input required type="text" placeholder="e.g. Mar 2026" value={billForm.billing_month} onChange={e => setBillForm({...billForm, billing_month: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-secondary border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none shadow-inner transition-all" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest pl-1">Due Date</label>
                                            <input required type="date" value={billForm.due_date} onChange={e => setBillForm({...billForm, due_date: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-secondary border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none shadow-inner transition-all [color-scheme:light_dark]" />
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-slate-200 dark:border-zinc-800 pt-6">
                                    <h3 className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-4">Charges (₱)</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest pl-1">Rent</label>
                                            <input required type="number" step="0.01" value={billForm.rent_amount} onChange={e => setBillForm({...billForm, rent_amount: parseFloat(e.target.value) || 0})} className="w-full px-4 py-3.5 rounded-xl bg-secondary border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none shadow-inner transition-all text-sm" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest pl-1">Water</label>
                                            <input required type="number" step="0.01" value={billForm.water_charges} onChange={e => setBillForm({...billForm, water_charges: parseFloat(e.target.value) || 0})} className="w-full px-4 py-3.5 rounded-xl bg-secondary border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none shadow-inner transition-all text-sm" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest pl-1">Electricity</label>
                                            <input required type="number" step="0.01" value={billForm.electricity_charges} onChange={e => setBillForm({...billForm, electricity_charges: parseFloat(e.target.value) || 0})} className="w-full px-4 py-3.5 rounded-xl bg-secondary border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none shadow-inner transition-all text-sm" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest pl-1">Other Fees</label>
                                            <input required type="number" step="0.01" value={billForm.other_fees} onChange={e => setBillForm({...billForm, other_fees: parseFloat(e.target.value) || 0})} className="w-full px-4 py-3.5 rounded-xl bg-secondary border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none shadow-inner transition-all text-sm" />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-indigo-50/50 dark:bg-indigo-500/10 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <span className="font-black text-indigo-600 dark:text-indigo-400 text-xs uppercase tracking-widest">Total Calculated Amount</span>
                                    <span className="text-3xl font-black text-indigo-700 dark:text-indigo-300">₱ {Number((Number(billForm.rent_amount) || 0) + (Number(billForm.water_charges) || 0) + (Number(billForm.electricity_charges) || 0) + (Number(billForm.other_fees) || 0)).toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="p-6 sm:p-8 border-t border-slate-200 dark:border-zinc-800 bg-secondary/50 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsEditOpen(false)} className="px-8 py-4 font-black text-slate-500 dark:text-zinc-400 bg-secondary hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-2xl transition-all uppercase tracking-widest text-[10px]">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="px-8 py-4 font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 disabled:opacity-70">
                                    {isSubmitting ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    );
}