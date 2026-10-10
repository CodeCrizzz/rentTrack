"use client";
import { useEffect, useState, useRef, useMemo } from 'react';
import api from '@/lib/api';
import { motion, AnimatePresence, type Variants } from 'framer-motion';

const formatDate = (dateString: string | null | undefined, options?: Intl.DateTimeFormatOptions) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString(undefined, options || { month: 'short', day: 'numeric', year: 'numeric' });
};

// Default empty state while loading
const defaultBill = {
    month: "Loading...",
    dueDate: new Date().toISOString(),
    totalAmount: 0,
    amountPaid: 0,
    remainingBalance: 0,
    status: "Loading",
    breakdown: { rent: 0, water: 0, electricity: 0, other: 0, penalty: 0 },
    creationDay: 1
};

export default function TenantPayments() {
    const [payments, setPayments] = useState<any[]>([]);
    const [currentBill, setCurrentBill] = useState<any>(defaultBill);
    const [summary, setSummary] = useState({ monthTotal: 0, yearTotal: 0, txCount: 0 });
    const [, setIsLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("All");
    const [sortBy, setSortBy] = useState("date_desc");

    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [viewReceiptUrl, setViewReceiptUrl] = useState<string | null>(null);

    const [payAmount, setPayAmount] = useState("");
    const [payMethod, setPayMethod] = useState<'GCash' | 'Bank Transfer' | 'Cash'>('GCash');
    const [payNotes, setPayNotes] = useState("");
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchPaymentData = async () => {
            try {
                setIsLoading(true);
                const [billResponse, paymentsResponse] = await Promise.all([
                    api.get('/tenant/bill/current').catch(() => ({ data: null })),
                    api.get('/tenant/payments').catch(() => ({ data: [] }))
                ]);

                if (billResponse.data) setCurrentBill(billResponse.data);

                const fetchedPayments = paymentsResponse.data || [];
                setPayments(fetchedPayments);

                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();

                let mTotal = 0; let yTotal = 0;

                fetchedPayments.forEach((p: any) => {
                    if (p.status === 'Paid' || p.status === 'Approved') {
                        const pDate = new Date(p.date || p.created_at);
                        if (pDate.getFullYear() === currentYear) {
                            yTotal += Number(p.amount);
                            if (pDate.getMonth() === currentMonth) mTotal += Number(p.amount);
                        }
                    }
                });

                setSummary({ monthTotal: mTotal, yearTotal: yTotal, txCount: fetchedPayments.length });
            } catch (error) {
                console.error("Critical error fetching data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPaymentData();
    }, []);

    const filteredPayments = useMemo(() => {
        return payments.filter(p => {
            const refNum = p.referenceNumber || p.id?.toString() || "";
            const desc = p.description || "";
            const matchesSearch = refNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
                desc.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = filterStatus === "All" || p.status === filterStatus;
            return matchesSearch && matchesStatus;
        }).sort((a, b) => {
            const dateA = new Date(a.date || a.created_at).getTime();
            const dateB = new Date(b.date || b.created_at).getTime();
            if (sortBy === 'date_desc') return dateB - dateA;
            if (sortBy === 'date_asc') return dateA - dateB;
            if (sortBy === 'amount_desc') return Number(b.amount) - Number(a.amount);
            if (sortBy === 'amount_asc') return Number(a.amount) - Number(b.amount);
            return 0;
        });
    }, [payments, searchQuery, filterStatus, sortBy]);

    const handlePaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFileError("");
        if (Number(payAmount) <= 0) return setFileError("Amount must be greater than zero.");
        if (proofFile && proofFile.size > 5 * 1024 * 1024) return setFileError("File exceeds 5MB limit.");

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('bill_id', currentBill?.id?.toString() || "");
            formData.append('amount_paid', payAmount);
            formData.append('payment_method', payMethod);
            formData.append('notes', payNotes);
            if (proofFile) formData.append('proofOfPayment', proofFile);

            const { data } = await api.post('/tenant/payments', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (data.newPayment) {
                setPayments(prev => [data.newPayment, ...prev]);
                setSummary(prev => ({ ...prev, txCount: prev.txCount + 1 }));
            }
            if (data.updatedBill) setCurrentBill(data.updatedBill);
            else setCurrentBill((prev: any) => ({ ...prev, status: 'Pending Verification' }));

            setProofFile(null); setPayAmount(""); setPayNotes(""); setIsPaymentModalOpen(false);
        } catch (error: any) {
            console.error("Payment submission failed:", error);
            setFileError(error.response?.data?.message || "Failed to submit payment. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFileError("");
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            if (file.size > 5 * 1024 * 1024) return setFileError("File exceeds 5MB limit.");
            setProofFile(file);
        }
    };

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
    };

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="w-full h-[calc(100vh-6.5rem)] md:h-[calc(100vh-7.5rem)] flex flex-col font-sans text-slate-900 dark:text-white overflow-hidden">
            
            {/* Header */}
            <motion.div variants={itemVariants} className="mb-8">
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    Payment Center
                </h1>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Manage your bills, view payment history, and submit payments.</p>
            </motion.div>

            {/* Top Cards: Current Bill & Summary */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 shrink-0">
                {/* Current Bill */}
                <div className="lg:col-span-2 bg-card rounded-xl border border-slate-200 dark:border-zinc-800 p-6 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">Current Bill</p>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white">{currentBill.month}</h3>
                            </div>
                            <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-widest rounded bg-secondary border border-slate-200 dark:border-zinc-700 ${
                                currentBill.status === 'Paid' ? 'text-emerald-600 dark:text-emerald-400' :
                                currentBill.status === 'Overdue' ? 'text-rose-600 dark:text-rose-400' :
                                currentBill.status === 'Pending Verification' ? 'text-amber-600 dark:text-amber-400' :
                                'text-slate-600 dark:text-zinc-400'
                            }`}>
                                {currentBill.status}
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-6 mb-6 border-b border-slate-100 dark:border-zinc-800/50 pb-6">
                            <div>
                                <p className="text-sm font-medium text-slate-500 dark:text-zinc-400 mb-1">Remaining Balance</p>
                                <p className={`text-4xl font-black ${currentBill.status === 'Overdue' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                                    ₱{currentBill.remainingBalance.toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500 dark:text-zinc-400 mb-1">Amount Paid</p>
                                <p className="text-2xl font-bold text-slate-700 dark:text-zinc-300">
                                    ₱{currentBill.amountPaid.toLocaleString()}
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-between items-center text-sm font-medium text-slate-500 dark:text-zinc-400 mb-6">
                            <span>Due Date: {formatDate(currentBill.dueDate, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            <span>Total Billed: ₱{(currentBill.totalAmount || 0).toLocaleString()}</span>
                        </div>
                    </div>
                    
                    <button
                        onClick={() => setIsPaymentModalOpen(true)}
                        disabled={currentBill.remainingBalance <= 0 || currentBill.status === 'Pending Verification'}
                        className={`w-full py-3 font-bold rounded-lg transition-colors text-sm flex items-center justify-center gap-2 ${
                            currentBill.remainingBalance <= 0 || currentBill.status === 'Pending Verification'
                                ? 'bg-secondary text-slate-400 dark:text-zinc-500 cursor-not-allowed border border-slate-200 dark:border-zinc-800'
                                : 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm'
                        }`}
                    >
                        {currentBill.remainingBalance <= 0 ? 'Fully Paid' : 'Pay Now'}
                    </button>
                </div>

                {/* Breakdown & Stats */}
                <div className="flex flex-col gap-6">
                    <div className="bg-card rounded-xl border border-slate-200 dark:border-zinc-800 p-6 shadow-sm flex-1">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2-2v14a2 2 0 002 2z"></path></svg> 
                            Bill Breakdown
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm"><span className="text-slate-500 dark:text-zinc-400">Rent</span><span className="font-medium text-slate-900 dark:text-white">₱{(currentBill.breakdown?.rent || 0).toLocaleString()}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-slate-500 dark:text-zinc-400">Water</span><span className="font-medium text-slate-900 dark:text-white">₱{(currentBill.breakdown?.water || 0).toLocaleString()}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-slate-500 dark:text-zinc-400">Power</span><span className="font-medium text-slate-900 dark:text-white">₱{(currentBill.breakdown?.electricity || 0).toLocaleString()}</span></div>
                            {currentBill.breakdown?.penalty > 0 && (
                                <div className="flex justify-between text-sm"><span className="text-rose-500">Penalty</span><span className="font-medium text-rose-500">₱{currentBill.breakdown.penalty.toLocaleString()}</span></div>
                            )}
                        </div>
                    </div>
                    
                    <div className="bg-card rounded-xl border border-slate-200 dark:border-zinc-800 p-6 shadow-sm flex-1">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg> 
                            Payment Summary
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm"><span className="text-slate-500 dark:text-zinc-400">This Month</span><span className="font-medium text-emerald-600 dark:text-emerald-400">₱{summary.monthTotal.toLocaleString()}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-slate-500 dark:text-zinc-400">This Year</span><span className="font-medium text-emerald-600 dark:text-emerald-400">₱{summary.yearTotal.toLocaleString()}</span></div>
                            <div className="flex justify-between text-sm pt-3 border-t border-slate-100 dark:border-zinc-800/50"><span className="text-slate-500 dark:text-zinc-400">Total Transactions</span><span className="font-medium text-slate-900 dark:text-white">{summary.txCount}</span></div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Payment History Table */}
            <motion.div variants={itemVariants} className="bg-card rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col flex-1 min-h-0">
                {/* Header & Controls */}
                <div className="p-6 border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-secondary/50 rounded-t-xl">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        Payment History
                    </h2>
                    
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-48">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500" />
                        </div>
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500">
                            <option value="All">All Status</option>
                            <option value="Paid">Paid</option>
                            <option value="Pending">Pending</option>
                            <option value="Rejected">Rejected</option>
                        </select>
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500">
                            <option value="date_desc">Newest First</option>
                            <option value="date_asc">Oldest First</option>
                            <option value="amount_desc">Amount (High-Low)</option>
                            <option value="amount_asc">Amount (Low-High)</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-auto custom-scrollbar flex-1">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-zinc-800">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest bg-secondary/50">Date / Ref</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest bg-secondary/50">Method & Desc</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest text-right bg-secondary/50">Amount</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest text-center bg-secondary/50">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest text-center bg-secondary/50">Receipt</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50">
                            {filteredPayments.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-zinc-400">No transactions match your filters.</td>
                                </tr>
                            ) : (
                                filteredPayments.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-sm text-slate-900 dark:text-white">{formatDate(p.date)}</p>
                                            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{p.referenceNumber}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-secondary border border-slate-200 dark:border-zinc-800 flex items-center justify-center shrink-0">
                                                    {p.method?.includes('GCash') ? <span className="text-xs font-black text-blue-600 dark:text-blue-400">G</span> : <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{p.description}</p>
                                                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{p.method}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <p className="text-sm font-black text-slate-900 dark:text-white">₱{Number(p.amount).toLocaleString()}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                ['Paid', 'Approved'].includes(p.status) ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
                                                ['Pending', 'Pending Verification'].includes(p.status) ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' :
                                                ['Overdue', 'Rejected'].includes(p.status) ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400' :
                                                'bg-slate-100 text-slate-700 dark:bg-zinc-500/10 dark:text-zinc-400'
                                            }`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {p.hasReceipt ? (
                                                <button onClick={() => setViewReceiptUrl(p.receiptUrl)} className="p-1.5 rounded-md hover:bg-secondary text-slate-500 hover:text-indigo-600 transition-colors inline-block">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                                </button>
                                            ) : <span className="text-xs text-slate-400 italic">N/A</span>}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* --- Modals --- */}
            <AnimatePresence>
                {isPaymentModalOpen && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" onClick={() => !isSubmitting && setIsPaymentModalOpen(false)} />
                        <div className="fixed inset-0 flex items-center justify-center p-4 z-[101] pointer-events-none">
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md bg-card rounded-xl shadow-xl border border-slate-200 dark:border-zinc-800 overflow-hidden pointer-events-auto flex flex-col">
                                <div className="p-5 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-secondary/50">
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Submit Payment</h2>
                                        <p className="text-sm text-slate-500 dark:text-zinc-400">Paying for {currentBill.month} Bill</p>
                                    </div>
                                    <button onClick={() => !isSubmitting && setIsPaymentModalOpen(false)} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500 transition-colors">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                    </button>
                                </div>
                                <form onSubmit={handlePaymentSubmit} className="p-5 flex flex-col gap-4">
                                    {fileError && <div className="p-3 bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 rounded-lg text-sm font-medium border border-rose-200 dark:border-rose-500/20">{fileError}</div>}
                                    
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-1.5">Amount</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₱</span>
                                            <input type="number" required min="1" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg py-2 pl-8 pr-3 text-sm outline-none focus:border-indigo-500 text-slate-900 dark:text-white" />
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-1.5">Method</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['GCash', 'Bank', 'Cash'].map((m) => (
                                                <button key={m} type="button" onClick={() => setPayMethod(m as any)} className={`py-2 rounded-lg text-sm font-medium border ${payMethod === m || (payMethod === 'Bank Transfer' && m === 'Bank') ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/30 dark:text-indigo-400' : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400'}`}>
                                                    {m}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-1.5">Notes (Optional)</label>
                                        <textarea rows={2} value={payNotes} onChange={(e) => setPayNotes(e.target.value)} className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg py-2 px-3 text-sm outline-none resize-none text-slate-900 dark:text-white focus:border-indigo-500" />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-1.5">Proof of Payment</label>
                                        <div className="w-full border-2 border-dashed border-slate-200 dark:border-zinc-700 rounded-lg p-6 flex flex-col items-center cursor-pointer bg-secondary/30 hover:bg-secondary/50 transition-colors" onClick={() => fileInputRef.current?.click()}>
                                            {proofFile ? (
                                                <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400 truncate w-full text-center">{proofFile?.name}</span>
                                            ) : (
                                                <div className="flex flex-col items-center text-slate-500">
                                                    <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                                                    <span className="text-sm font-medium">Click to upload receipt</span>
                                                </div>
                                            )}
                                            <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                                        </div>
                                    </div>
                                    
                                    <button type="submit" disabled={isSubmitting} className="w-full py-2.5 text-sm font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white mt-2 transition-colors disabled:opacity-70">
                                        {isSubmitting ? 'Processing...' : 'Submit Payment'}
                                    </button>
                                </form>
                            </motion.div>
                        </div>
                    </>
                )}
                {viewReceiptUrl && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200]" onClick={() => setViewReceiptUrl(null)} />
                        <div className="fixed inset-0 flex items-center justify-center p-4 z-[201] pointer-events-none">
                            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative pointer-events-auto flex flex-col items-center">
                                <button onClick={() => setViewReceiptUrl(null)} className="absolute -top-12 right-0 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                                <img src={viewReceiptUrl || undefined} alt="Receipt" className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-white/10" />
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>
        </motion.div>
    );
}