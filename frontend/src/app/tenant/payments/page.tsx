"use client";

import { useEffect, useState, useRef, useMemo } from 'react';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    CreditCard, Calendar, Clock, CheckCircle2, 
    AlertCircle, Upload, FileText, Image as ImageIcon, 
    X, ArrowUpRight, TrendingUp, Wallet, ShieldCheck,
    Download, Filter, Search, RefreshCw, QrCode, Hash, Building2
} from 'lucide-react';
import { toast } from 'sonner';

const formatDate = (dateString: string | null | undefined, options?: Intl.DateTimeFormatOptions) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString(undefined, options || { month: 'short', day: 'numeric', year: 'numeric' });
};

const defaultBill = {
    month: "Current Period",
    dueDate: new Date().toISOString(),
    totalAmount: 0,
    amountPaid: 0,
    remainingBalance: 0,
    status: "Unpaid",
    breakdown: { rent: 0, water: 0, electricity: 0, other: 0, penalty: 0 },
    creationDay: 1
};

export default function TenantPayments() {
    const [payments, setPayments] = useState<any[]>([]);
    const [currentBill, setCurrentBill] = useState<any>(defaultBill);
    const [summary, setSummary] = useState({ monthTotal: 0, yearTotal: 0, txCount: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("All");
    const [sortBy, setSortBy] = useState("date_desc");

    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [viewReceiptUrl, setViewReceiptUrl] = useState<string | null>(null);

    const [payAmount, setPayAmount] = useState("");
    const [payMethod] = useState<'GCash'>('GCash');
    const [payRefNumber, setPayRefNumber] = useState("");
    const [payNotes, setPayNotes] = useState("");
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [proofPreview, setProofPreview] = useState<string | null>(null);
    const [fileError, setFileError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchPaymentData = async (showToast = false) => {
        if (showToast) setIsRefreshing(true);
        try {
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

            let mTotal = 0; 
            let yTotal = 0;

            fetchedPayments.forEach((p: any) => {
                if (p.status === 'Paid' || p.status === 'Approved' || p.status === 'Verified') {
                    const pDate = new Date(p.date || p.created_at);
                    if (pDate.getFullYear() === currentYear) {
                        yTotal += Number(p.amount || 0);
                        if (pDate.getMonth() === currentMonth) mTotal += Number(p.amount || 0);
                    }
                }
            });

            setSummary({ monthTotal: mTotal, yearTotal: yTotal, txCount: fetchedPayments.length });
            if (showToast) toast.success("Billing statements synchronized");
        } catch (error) {
            console.error("Critical error fetching payment data:", error);
            if (showToast) toast.error("Failed to sync payments");
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchPaymentData();
    }, []);

    const filteredPayments = useMemo(() => {
        return payments.filter(p => {
            const refNum = p.referenceNumber || p.id?.toString() || "";
            const desc = p.description || p.notes || "";
            const method = p.payment_method || p.method || "";
            const matchesSearch = !searchQuery || 
                refNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
                desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                method.toLowerCase().includes(searchQuery.toLowerCase());

            const isApproved = p.status === 'Paid' || p.status === 'Approved' || p.status === 'Verified';
            const isPending = p.status === 'Pending' || p.status === 'Pending Verification';
            const isRejected = p.status === 'Rejected';

            const matchesStatus = filterStatus === "All" || 
                (filterStatus === "Paid" && isApproved) ||
                (filterStatus === "Pending" && isPending) ||
                (filterStatus === "Rejected" && isRejected) ||
                p.status === filterStatus;

            return matchesSearch && matchesStatus;
        }).sort((a, b) => {
            const dateA = new Date(a.date || a.created_at).getTime();
            const dateB = new Date(b.date || b.created_at).getTime();
            if (sortBy === 'date_desc') return dateB - dateA;
            if (sortBy === 'date_asc') return dateA - dateB;
            if (sortBy === 'amount_desc') return Number(b.amount || 0) - Number(a.amount || 0);
            if (sortBy === 'amount_asc') return Number(a.amount || 0) - Number(b.amount || 0);
            return 0;
        });
    }, [payments, searchQuery, filterStatus, sortBy]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFileError("");
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            if (file.size > 5 * 1024 * 1024) {
                setFileError("File exceeds 5MB size limit.");
                return;
            }
            setProofFile(file);
            const objectUrl = URL.createObjectURL(file);
            setProofPreview(objectUrl);
        }
    };

    const handlePaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFileError("");
        if (Number(payAmount) <= 0) {
            setFileError("Amount must be greater than zero.");
            return;
        }

        const cleanRef = payRefNumber.trim();
        if (!cleanRef) {
            setFileError("GCash reference number is required.");
            return;
        }
        if (!/^\d+$/.test(cleanRef)) {
            setFileError("Reference number must contain only numeric digits (0-9).");
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('bill_id', currentBill?.id?.toString() || "");
            formData.append('amount_paid', payAmount);
            formData.append('payment_method', 'GCash');
            formData.append('notes', `Ref #${cleanRef}`);

            if (proofFile) {
                formData.append('proofOfPayment', proofFile);
            }

            const { data } = await api.post('/tenant/payments', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success("Payment proof submitted for administrative verification!");
            if (data.newPayment) {
                setPayments(prev => [data.newPayment, ...prev]);
                setSummary(prev => ({ ...prev, txCount: prev.txCount + 1 }));
            }
            if (data.updatedBill) setCurrentBill(data.updatedBill);
            else setCurrentBill((prev: any) => ({ ...prev, status: 'Pending Verification' }));

            setProofFile(null);
            setProofPreview(null);
            setPayAmount("");
            setPayRefNumber("");
            setPayNotes("");
            setIsPaymentModalOpen(false);
        } catch (error: any) {
            console.error("Payment submission failed:", error);
            const msg = error.response?.data?.message || "Failed to submit payment.";
            setFileError(msg);
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Skeleton Loader
    if (isLoading) {
        return (
            <div className="w-full space-y-4 font-sans text-slate-900 dark:text-zinc-100 animate-pulse">
                {/* Header Toolbar Skeleton */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-zinc-800/80">
                    <div>
                        <div className="h-7 w-64 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                        <div className="h-3.5 w-80 bg-slate-200 dark:bg-zinc-800 rounded-md mt-2"></div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-24 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                        <div className="h-8 w-32 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                    </div>
                </div>

                {/* Telemetry Ribbon (4 Tiles) Skeleton */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                            <div className="space-y-1.5 flex-1">
                                <div className="h-2.5 w-24 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                                <div className="h-6 w-32 bg-slate-200 dark:bg-zinc-800 rounded-md"></div>
                                <div className="h-2.5 w-20 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 shrink-0"></div>
                        </div>
                    ))}
                </div>

                {/* Main Workspace Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-1 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-3.5 h-[518px]">
                        <div className="h-4 w-36 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                        <div className="h-8 w-44 bg-slate-200 dark:bg-zinc-800 rounded-md"></div>
                        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="flex justify-between">
                                    <div className="h-3 w-20 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                                    <div className="h-3 w-16 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                                </div>
                            ))}
                        </div>
                        <div className="h-10 w-full bg-slate-200 dark:bg-zinc-800 rounded-xl mt-4"></div>
                    </div>

                    <div className="lg:col-span-2 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs flex flex-col justify-between h-[518px]">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-zinc-800">
                            <div className="h-4 w-40 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                            <div className="h-7 w-48 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                        </div>
                        <div className="space-y-2 my-2 flex-1">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-12 bg-slate-50 dark:bg-zinc-900/40 rounded-xl border border-slate-100 dark:border-zinc-800"></div>
                            ))}
                        </div>
                        <div className="h-4 w-32 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    // UI Render
    return (
        <div className="w-full flex-1 flex flex-col space-y-4 sm:space-y-5 font-sans text-slate-900 dark:text-zinc-100 min-h-[calc(100vh-6.2rem)] justify-between pb-1">
            
            {/* Header Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-zinc-800/80 shrink-0">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                            <CreditCard className="w-6 h-6 text-teal-600 shrink-0" />
                            <span>My Bills and Payments</span>
                        </h1>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
                        Review active billing statement breakdown, submit GCash payments, and track ledger history. For cash payments, please visit the admin office.
                    </p>
                </div>
            </div>

            {/*  Financial Telemetry Ribbon (4 Tiles) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 shrink-0">
                
                {/* Remaining Balance */}
                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-4 sm:p-4.5 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Current Balance</span>
                        <div className={`text-2xl sm:text-3xl font-black font-mono mt-0.5 leading-tight ${
                            currentBill.remainingBalance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                            ₱{Number(currentBill.remainingBalance || 0).toLocaleString()}
                        </div>
                        <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mt-1">
                            {currentBill.status || 'Active Statement'}
                        </div>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
                        <Wallet className="w-5.5 h-5.5" />
                    </div>
                </div>

                {/* Paid This Month */}
                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-4 sm:p-4.5 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Paid This Month</span>
                        <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 leading-tight">
                            ₱{summary.monthTotal.toLocaleString()}
                        </div>
                        <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mt-1">
                            Approved and recorded
                        </div>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                        <TrendingUp className="w-5.5 h-5.5" />
                    </div>
                </div>

                {/* Total Settled*/}
                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-4 sm:p-4.5 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Total Payments</span>
                        <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white mt-0.5 leading-tight">
                            ₱{summary.yearTotal.toLocaleString()}
                        </div>
                        <div className="text-xs font-semibold text-teal-600 dark:text-teal-400 mt-1">
                            {summary.txCount} total transaction{summary.txCount !== 1 ? 's' : ''}
                        </div>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5.5 h-5.5" />
                    </div>
                </div>

                {/*  Due Date */}
                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-4 sm:p-4.5 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Payment Due Date</span>
                        <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-0.5 leading-tight">
                            {formatDate(currentBill.dueDate, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 flex items-center justify-center shrink-0">
                        <Calendar className="w-5.5 h-5.5" />
                    </div>
                </div>

            </div>

            {/* Main Workspace Split: Statement Breakdown (Left) & Transaction Ledger (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 items-stretch">
                
                {/* Active Statement Breakdown Card */}
                <div className="lg:col-span-1 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start pb-3.5 border-b border-slate-100 dark:border-zinc-800">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Statement Period</span>
                                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-0.5">{currentBill.month}</h2>
                            </div>
                            <span className={`text-xs font-bold uppercase ${
                                currentBill.status === 'Paid' ? 'text-emerald-600 dark:text-emerald-400' :
                                currentBill.status === 'Pending Verification' ? 'text-amber-600 dark:text-amber-400' :
                                'text-rose-600 dark:text-rose-400'
                            }`}>
                                {currentBill.status}
                            </span>
                        </div>

                        <div className="my-4 py-2 space-y-3 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 dark:text-zinc-400 font-medium">Room rent</span>
                                <span className="font-mono font-bold text-slate-900 dark:text-zinc-100 text-sm sm:text-base">₱{(currentBill.breakdown?.rent || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 dark:text-zinc-400 font-medium">Water bill </span>
                                <span className="font-mono font-bold text-slate-900 dark:text-zinc-100 text-sm sm:text-base">₱{(currentBill.breakdown?.water || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 dark:text-zinc-400 font-medium">Electricity bill</span>
                                <span className="font-mono font-bold text-slate-900 dark:text-zinc-100 text-sm sm:text-base">₱{(currentBill.breakdown?.electricity || 0).toLocaleString()}</span>
                            </div>
                            {currentBill.breakdown?.penalty > 0 && (
                                <div className="flex justify-between items-center text-rose-600 dark:text-rose-400">
                                    <span className="font-medium">Late Penalty Surcharge</span>
                                    <span className="font-mono font-bold text-sm sm:text-base">+₱{currentBill.breakdown.penalty.toLocaleString()}</span>
                                </div>
                            )}

                            <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-between items-center font-bold">
                                <span className="text-sm sm:text-base text-slate-900 dark:text-white">Total Amount</span>
                                <span className="font-mono font-black text-slate-900 dark:text-white text-base sm:text-lg">₱{Number(currentBill.totalAmount || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
                                <span>Amount Paid</span>
                                <span className="font-mono font-bold">₱{Number(currentBill.amountPaid || 0).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-zinc-800">
                        {/* Remaining Balance */}
                        <div className="flex justify-between items-baseline mb-3.5">
                            <span className="text-sm font-bold text-slate-500 dark:text-zinc-400">Remaining Balance</span>
                            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                                ₱{Number(currentBill.remainingBalance || 0).toLocaleString()}
                            </span>
                        </div>

                        {/* Pay Button */}
                        <button
                            onClick={() => {
                                setPayAmount(currentBill.remainingBalance > 0 ? String(currentBill.remainingBalance) : "");
                                setPayRefNumber("");
                                setPayNotes("");
                                setProofFile(null);
                                setProofPreview(null);
                                setFileError("");
                                if (fileInputRef.current) fileInputRef.current.value = "";
                                setIsPaymentModalOpen(true);
                            }}
                            disabled={currentBill.remainingBalance <= 0}
                            className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-xs ${
                                currentBill.remainingBalance <= 0
                                    ? 'bg-slate-100 dark:bg-zinc-800 text-slate-400 cursor-not-allowed'
                                    : 'bg-teal-600 hover:bg-teal-700 text-white'
                            }`}
                        >
                            <CreditCard className="w-4.5 h-4.5" />
                            <span>{currentBill.remainingBalance <= 0 ? 'Statement Settled' : 'Pay Online with GCash'}</span>
                        </button>

                        {/* In-Person Cash Payment Advisory */}
                        <div className="mt-3 p-3 rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/40 flex items-start gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                                <Building2 className="w-3.5 h-3.5" />
                            </div>
                            <div className="space-y-0.5 text-xs">
                                <span className="font-bold text-slate-800 dark:text-zinc-200">Paying in Cash?</span>
                                <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                                    Cash payments are accepted in person at the <strong>Admin / Owner Office</strong>. Hand your cash directly to the administrator, who will issue your official receipt and record it into your ledger.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Transaction Ledger Table */}
                <div className="lg:col-span-2 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100 dark:border-zinc-800">
                            <div>
                                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Clock className="w-4.5 h-4.5 text-slate-500" />
                                    <span>Payment History & Verification</span>
                                </h2>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">Track your payments, upload receipts, and view verification status</p>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="relative w-full sm:w-52">
                                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                                    <input
                                        type="text"
                                        placeholder="Search reference #..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full py-2 pl-9 pr-3 text-xs sm:text-sm rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-teal-500 font-medium"
                                    />
                                </div>

                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="py-2 px-3 text-xs sm:text-sm font-medium rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 outline-none"
                                >
                                    <option value="All">All Status</option>
                                    <option value="Paid">Paid / Approved</option>
                                    <option value="Pending">Pending Verification</option>
                                    <option value="Rejected">Rejected</option>
                                </select>
                            </div>
                        </div>

                        <div className="my-2 overflow-y-auto custom-scrollbar h-[518px] max-h-[518px]">
                            {filteredPayments.length > 0 ? (
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead>
                                        <tr className="h-[40px] border-b border-slate-100 dark:border-zinc-800 text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 sticky top-0 bg-card z-10">
                                            <th className="py-2 px-3.5 bg-card">Date & Ref #</th>
                                            <th className="py-2 px-3.5 bg-card">Method</th>
                                            <th className="py-2 px-3.5 text-right bg-card">Amount</th>
                                            <th className="py-2 px-3.5 text-center bg-card">Status</th>
                                            <th className="py-2 px-3.5 text-right bg-card">Proof</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 font-sans">
                                        {filteredPayments.map((p: any, i: number) => {
                                            const proofImg = p.proof_image || p.proof_url || p.proofOfPayment;
                                            const rawMethod = p.payment_method || p.method || 'GCash';
                                            const isCash = String(rawMethod).toLowerCase() === 'cash';
                                            const isApproved = p.status === 'Paid' || p.status === 'Approved' || p.status === 'Verified';
                                            const isPending = p.status === 'Pending' || p.status === 'Pending Verification';
                                            return (
                                                <tr key={i} className="h-[53px] hover:bg-slate-50/50 dark:hover:bg-zinc-900/40 transition-colors">
                                                    <td className="py-1.5 px-3.5 whitespace-nowrap">
                                                        <p className="font-bold text-slate-900 dark:text-white text-sm sm:text-base leading-snug">{formatDate(p.date || p.created_at)}</p>
                                                        <p className="text-xs text-slate-400 dark:text-zinc-500 font-mono mt-0.5">#{p.referenceNumber || p.id || 'TX-AUTO'}</p>
                                                    </td>
                                                    <td className="py-1.5 px-3.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`p-1.5 rounded-lg text-xs font-bold shrink-0 ${
                                                                isCash
                                                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                                                                    : 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                                                            }`}>
                                                                {isCash ? <Building2 className="w-4 h-4" /> : <QrCode className="w-4 h-4" />}
                                                            </span>
                                                            <span className="font-bold text-slate-800 dark:text-zinc-200 text-sm sm:text-base">
                                                                {isCash ? 'Cash (Admin Office)' : 'GCash'}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-400 dark:text-zinc-500 truncate max-w-[160px] mt-0.5">
                                                            {p.description || p.notes || (isCash ? 'Handed in at Admin Office' : 'GCash Online Payment')}
                                                        </p>
                                                    </td>
                                                    <td className="py-1.5 px-3.5 text-right font-mono font-black text-slate-900 dark:text-white text-base sm:text-lg whitespace-nowrap">
                                                        ₱{Number(p.amount || 0).toLocaleString()}
                                                    </td>
                                                    <td className="py-1.5 px-3.5 text-center whitespace-nowrap">
                                                        <span className={`inline-block text-xs font-bold uppercase tracking-wide ${
                                                            isApproved ? 'text-emerald-600 dark:text-emerald-400' :
                                                            isPending ? 'text-amber-600 dark:text-amber-400' :
                                                            'text-rose-600 dark:text-rose-400'
                                                        }`}>
                                                            {p.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-1.5 px-3.5 text-right whitespace-nowrap">
                                                        {proofImg ? (
                                                            <button
                                                                onClick={() => setViewReceiptUrl(proofImg.startsWith('http') ? proofImg : `http://localhost:5000${proofImg.startsWith('/') ? proofImg : `/${proofImg}`}`)}
                                                                className="text-xs sm:text-sm font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1.5 ml-auto"
                                                            >
                                                                <ImageIcon className="w-4 h-4" />
                                                                <span>View</span>
                                                            </button>
                                                        ) : (
                                                            <span className={`text-xs font-mono ${
                                                                isCash
                                                                    ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                                                                    : 'text-slate-400 dark:text-zinc-500'
                                                            }`}>
                                                                {isCash ? 'Office Receipt' : 'No Receipt'}
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="h-[518px] flex flex-col items-center justify-center text-center text-slate-400">
                                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm font-semibold">No payment records found</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>

            {/* Submit Payment Proof Modal */}
            <AnimatePresence>
                {isPaymentModalOpen && (
                    <>
                        <div 
                            className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs z-50"
                            onClick={() => {
                                if (!isSubmitting) {
                                    setPayRefNumber("");
                                    setPayNotes("");
                                    setProofFile(null);
                                    setProofPreview(null);
                                    setFileError("");
                                    if (fileInputRef.current) fileInputRef.current.value = "";
                                    setIsPaymentModalOpen(false);
                                }
                            }}
                        />
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                            <div className="w-full max-w-lg bg-card rounded-2xl shadow-xl border border-slate-200 dark:border-zinc-800 overflow-hidden pointer-events-auto flex flex-col max-h-[92vh]">
                                <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-900/40 shrink-0">
                                    <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                        <QrCode className="w-4 h-4 text-teal-600" />
                                        <span>Submit GCash Payment</span>
                                    </h2>
                                    <button 
                                        onClick={() => {
                                            if (!isSubmitting) {
                                                setPayRefNumber("");
                                                setPayNotes("");
                                                setProofFile(null);
                                                setProofPreview(null);
                                                setFileError("");
                                                if (fileInputRef.current) fileInputRef.current.value = "";
                                                setIsPaymentModalOpen(false);
                                            }
                                        }}
                                        className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <form onSubmit={handlePaymentSubmit} className="p-5 space-y-4 overflow-y-auto">
                                    {fileError && (
                                        <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600 text-xs font-semibold border border-rose-200">
                                            {fileError}
                                        </div>
                                    )}

                                    {/* Active Bill Statement Breakdown Preview */}
                                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 space-y-3">
                                        <div className="flex justify-between items-start pb-2.5 border-b border-slate-200/80 dark:border-zinc-800">
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Statement Overview</span>
                                                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">{currentBill.month}</h3>
                                            </div>
                                            <span className={`text-[11px] font-bold uppercase ${
                                                currentBill.status === 'Paid' ? 'text-emerald-600 dark:text-emerald-400' :
                                                currentBill.status === 'Pending Verification' ? 'text-amber-600 dark:text-amber-400' :
                                                'text-rose-600 dark:text-rose-400'
                                            }`}>
                                                {currentBill.status}
                                            </span>
                                        </div>

                                        {/* Breakdown items */}
                                        <div className="space-y-1.5 text-xs">
                                            <div className="flex justify-between items-center text-slate-600 dark:text-zinc-400">
                                                <span>Room rent</span>
                                                <span className="font-mono font-bold text-slate-900 dark:text-zinc-100">₱{(currentBill.breakdown?.rent || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-slate-600 dark:text-zinc-400">
                                                <span>Water bill</span>
                                                <span className="font-mono font-bold text-slate-900 dark:text-zinc-100">₱{(currentBill.breakdown?.water || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-slate-600 dark:text-zinc-400">
                                                <span>Electricity bill</span>
                                                <span className="font-mono font-bold text-slate-900 dark:text-zinc-100">₱{(currentBill.breakdown?.electricity || 0).toLocaleString()}</span>
                                            </div>
                                            {currentBill.breakdown?.penalty > 0 && (
                                                <div className="flex justify-between items-center text-rose-600 dark:text-rose-400 font-semibold">
                                                    <span>Late Penalty charge</span>
                                                    <span className="font-mono font-bold">+₱{currentBill.breakdown.penalty.toLocaleString()}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Remaining balance callout */}
                                        <div className="pt-2.5 border-t border-slate-200/80 dark:border-zinc-800 flex justify-between items-baseline">
                                            <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Total amount to pay</span>
                                            <span className="text-xl sm:text-2xl font-black font-mono text-teal-600 dark:text-teal-400">
                                                ₱{Number(currentBill.remainingBalance || 0).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Payment Channel: GCash Online Only */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Payment Channel</label>
                                            <span className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500">Portal: GCash Only</span>
                                        </div>
                                        <div className="flex items-center justify-between p-2.5 rounded-xl border border-blue-200/80 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                                                    <QrCode className="w-4.5 h-4.5" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-extrabold text-slate-900 dark:text-white">GCash</span>
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                            Online Method
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 dark:text-zinc-400">Upload your GCash transaction screenshot and reference number below.</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* In-Person Cash Notice */}
                                        <div className="p-2.5 rounded-xl border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-950/20 flex items-start gap-2.5">
                                            <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                            <div className="text-[11px] text-amber-800 dark:text-amber-300 leading-snug">
                                                <span className="font-bold">Paying via Cash?</span>
                                                <p className="text-amber-700/90 dark:text-amber-400/90 mt-0.5 text-[10.5px]">
                                                    Visit the <strong>Admin / Owner Office</strong> to hand over cash in person. Only authorized administrators can accept cash payments and record them to your account.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Amount to Pay (₱)</label>
                                            {currentBill.remainingBalance > 0 && Number(payAmount) !== currentBill.remainingBalance && (
                                                <button
                                                    type="button"
                                                    onClick={() => setPayAmount(String(currentBill.remainingBalance))}
                                                    className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline"
                                                >
                                                    Pay Full (₱{Number(currentBill.remainingBalance).toLocaleString()})
                                                </button>
                                            )}
                                        </div>
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            placeholder="Enter amount (e.g. 3500)"
                                            value={payAmount}
                                            onChange={(e) => setPayAmount(e.target.value)}
                                            className="w-full py-2 px-3 text-xs font-mono font-bold rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-teal-500"
                                        />
                                    </div>

                                    {/* GCash: Reference Number */}
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                                GCash Reference Number
                                            </label>
                                        </div>
                                        <div className="relative">
                                            <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                required
                                                placeholder="e.g. 90812348123"
                                                value={payRefNumber}
                                                onKeyDown={(e) => {
                                                    // Allow functional/navigational keys (backspace, delete, tab, arrows)
                                                    if (
                                                        ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key) ||
                                                        ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase()))
                                                    ) {
                                                        return;
                                                    }
                                                    // Block any letter, punctuation, or special symbol
                                                    if (!/^[0-9]$/.test(e.key)) {
                                                        e.preventDefault();
                                                    }
                                                }}
                                                onChange={(e) => {
                                                    // Strictly strip any non-digit character (handles pasting and autofill)
                                                    const numericValue = e.target.value.replace(/\D/g, '');
                                                    setPayRefNumber(numericValue);
                                                }}
                                                className="w-full py-2 pl-8 pr-3 text-xs font-mono font-bold rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-teal-500 tracking-wider"
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                                            Must contain numeric digits only from your transaction receipt.
                                        </p>
                                    </div>

                                    {/* GCash: Proof of Payment Screenshot */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                                            Proof of Payment Screenshot (Max 5MB)
                                        </label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                                        />
                                        {proofPreview && (
                                            <div className="mt-2 rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-800 max-h-36">
                                                <img src={proofPreview} alt="Receipt preview" className="w-full h-auto object-cover" />
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full py-2.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-all shadow-xs disabled:opacity-50"
                                    >
                                        {isSubmitting ? 'Submitting...' : 'Upload & Submit for Verification'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </>
                )}
            </AnimatePresence>

            {/* Modal 2: View Receipt Modal */}
            <AnimatePresence>
                {viewReceiptUrl && (
                    <>
                        <div 
                            className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs z-50"
                            onClick={() => setViewReceiptUrl(null)}
                        />
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                            <div className="w-full max-w-lg bg-card rounded-2xl shadow-xl border border-slate-200 dark:border-zinc-800 overflow-hidden pointer-events-auto flex flex-col">
                                <div className="p-3.5 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-900/40">
                                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                        <ImageIcon className="w-4 h-4 text-teal-600" />
                                        <span>Payment Proof Screenshot</span>
                                    </span>
                                    <button onClick={() => setViewReceiptUrl(null)} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="p-4 flex items-center justify-center bg-black/10 max-h-[75vh] overflow-auto">
                                    <img src={viewReceiptUrl} alt="E-Receipt Proof" className="max-w-full max-h-full object-contain rounded-lg" />
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </AnimatePresence>

        </div>
    );
}