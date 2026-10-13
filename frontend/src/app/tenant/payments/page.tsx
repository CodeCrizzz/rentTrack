"use client";

import { useEffect, useState, useRef, useMemo } from 'react';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    CreditCard, Calendar, Clock, CheckCircle2, 
    AlertCircle, Upload, FileText, Image as ImageIcon, 
    X, ArrowUpRight, TrendingUp, Wallet, ShieldCheck,
    Download, Filter, Search, RefreshCw, QrCode
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
    const [payMethod, setPayMethod] = useState<'GCash' | 'Bank Transfer' | 'Cash'>('GCash');
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
                if (p.status === 'Paid' || p.status === 'Approved') {
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
            const desc = p.description || "";
            const matchesSearch = !searchQuery || 
                refNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
                desc.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = filterStatus === "All" || p.status === filterStatus;
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
            setPayNotes("");
            setIsPaymentModalOpen(false);
        } catch (error: any) {
            console.error("Payment submission failed:", error);
            const msg = error.response?.data?.message || "Failed to submit payment proof.";
            setFileError(msg);
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ==========================================
    // 1:1 SKELETON LOADER
    // ==========================================
    if (isLoading) {
        return (
            <div className="w-full space-y-4 font-sans text-slate-900 dark:text-zinc-100 animate-pulse">
                {/* 1. Header Toolbar Skeleton */}
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

                {/* 2. Telemetry Ribbon (4 Tiles) Skeleton */}
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

                {/* 3. Main Workspace Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-1 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-3.5 h-[390px]">
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

                    <div className="lg:col-span-2 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs flex flex-col justify-between h-[390px]">
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

    // ==========================================
    // REAL UI RENDER
    // ==========================================
    return (
        <div className="w-full space-y-4 font-sans text-slate-900 dark:text-zinc-100">
            
            {/* 1. Header Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-zinc-800/80">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-teal-600" />
                            <span>Resident Billing & Payment Portal</span>
                        </h1>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                            currentBill.remainingBalance <= 0
                                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20'
                                : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-500/20'
                        }`}>
                            <span className={`w-2 h-2 rounded-full ${currentBill.remainingBalance <= 0 ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></span>
                            <span>{currentBill.remainingBalance <= 0 ? 'Balance Clear' : 'Payment Due'}</span>
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                        Review active billing statement breakdown, upload GCash or bank receipts, and review ledger.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fetchPaymentData(true)}
                        disabled={isRefreshing}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-800 bg-card hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-teal-600' : 'text-slate-500'}`} />
                        <span>Sync</span>
                    </button>

                    <button
                        onClick={() => setIsPaymentModalOpen(true)}
                        disabled={currentBill.remainingBalance <= 0}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-xs ${
                            currentBill.remainingBalance <= 0
                                ? 'bg-slate-100 dark:bg-zinc-800 text-slate-400 cursor-not-allowed'
                                : 'bg-teal-600 hover:bg-teal-700 text-white'
                        }`}
                    >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Submit Payment Proof</span>
                    </button>
                </div>
            </div>

            {/* 2. Financial Telemetry Ribbon (4 Tiles) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                
                {/* Tile 1: Remaining Balance */}
                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Balance</span>
                        <div className={`text-xl font-black font-mono mt-0.5 leading-tight ${
                            currentBill.remainingBalance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                            ₱{Number(currentBill.remainingBalance || 0).toLocaleString()}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500 mt-0.5">
                            {currentBill.status || 'Active Statement'}
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
                        <Wallet className="w-5 h-5" />
                    </div>
                </div>

                {/* Tile 2: Paid This Month */}
                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Paid This Month</span>
                        <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 leading-tight">
                            ₱{summary.monthTotal.toLocaleString()}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500 mt-0.5">
                            Approved and recorded
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                </div>

                {/* Tile 3: Net Settled (YTD) */}
                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Settled YTD</span>
                        <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-0.5 leading-tight">
                            ₱{summary.yearTotal.toLocaleString()}
                        </div>
                        <div className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 mt-0.5">
                            {summary.txCount} total transaction{summary.txCount !== 1 ? 's' : ''}
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                </div>

                {/* Tile 4: Due Date */}
                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment Due Date</span>
                        <div className="text-sm font-extrabold font-mono text-slate-900 dark:text-white mt-1 leading-tight">
                            {formatDate(currentBill.dueDate, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500 mt-0.5">
                            Day 5 recurring cycle
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 flex items-center justify-center shrink-0">
                        <Calendar className="w-5 h-5" />
                    </div>
                </div>

            </div>

            {/* 3. Main Workspace Split: Statement Breakdown (Left) & Transaction Ledger (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                
                {/* Active Statement Breakdown Card */}
                <div className="lg:col-span-1 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start pb-3 border-b border-slate-100 dark:border-zinc-800">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Statement Period</span>
                                <h2 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">{currentBill.month}</h2>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                currentBill.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
                                currentBill.status === 'Pending Verification' ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' :
                                'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                            }`}>
                                {currentBill.status}
                            </span>
                        </div>

                        <div className="my-3 py-2 space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Suite Base Rent</span>
                                <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">₱{(currentBill.breakdown?.rent || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Water Tariff (Fixed)</span>
                                <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">₱{(currentBill.breakdown?.water || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Electric Submeter (kWh)</span>
                                <span className="font-mono font-bold text-slate-800 dark:text-zinc-200">₱{(currentBill.breakdown?.electricity || 0).toLocaleString()}</span>
                            </div>
                            {currentBill.breakdown?.penalty > 0 && (
                                <div className="flex justify-between text-rose-600">
                                    <span>Late Penalty Surcharge</span>
                                    <span className="font-mono font-bold">+₱{currentBill.breakdown.penalty.toLocaleString()}</span>
                                </div>
                            )}

                            <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex justify-between font-bold text-sm">
                                <span>Total Invoiced</span>
                                <span className="font-mono text-slate-900 dark:text-white">₱{Number(currentBill.totalAmount || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xs text-emerald-600 font-semibold">
                                <span>Amount Settled</span>
                                <span className="font-mono">-₱{Number(currentBill.amountPaid || 0).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-zinc-800">
                        <div className="flex justify-between items-baseline mb-3">
                            <span className="text-xs font-bold text-slate-500">Remaining Balance</span>
                            <span className="text-xl font-black font-mono text-slate-900 dark:text-white">
                                ₱{Number(currentBill.remainingBalance || 0).toLocaleString()}
                            </span>
                        </div>

                        <button
                            onClick={() => setIsPaymentModalOpen(true)}
                            disabled={currentBill.remainingBalance <= 0}
                            className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                                currentBill.remainingBalance <= 0
                                    ? 'bg-slate-100 dark:bg-zinc-800 text-slate-400 cursor-not-allowed'
                                    : 'bg-teal-600 hover:bg-teal-700 text-white shadow-xs'
                            }`}
                        >
                            <QrCode className="w-4 h-4" />
                            <span>{currentBill.remainingBalance <= 0 ? 'Statement Settled' : 'Pay via GCash / Maya'}</span>
                        </button>
                    </div>
                </div>

                {/* Transaction Ledger Table */}
                <div className="lg:col-span-2 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800">
                            <div>
                                <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <Clock className="w-4 h-4 text-slate-500" />
                                    <span>Payment Ledger & Verification Logs</span>
                                </h2>
                                <p className="text-[11px] text-slate-500">E-Receipt submissions and historical verifications</p>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="relative w-full sm:w-48">
                                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                                    <input
                                        type="text"
                                        placeholder="Search reference #..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full py-1.5 pl-7 pr-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-teal-500"
                                    />
                                </div>

                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="py-1.5 px-2.5 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 outline-none"
                                >
                                    <option value="All">All Status</option>
                                    <option value="Paid">Paid / Approved</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Rejected">Rejected</option>
                                </select>
                            </div>
                        </div>

                        <div className="my-2 overflow-y-auto custom-scrollbar max-h-[260px]">
                            {filteredPayments.length > 0 ? (
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            <th className="py-2.5 px-3">Date & Ref</th>
                                            <th className="py-2.5 px-3">Method</th>
                                            <th className="py-2.5 px-3 text-right">Amount</th>
                                            <th className="py-2.5 px-3 text-center">Status</th>
                                            <th className="py-2.5 px-3 text-right">Proof</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 font-sans">
                                        {filteredPayments.map((p: any, i: number) => {
                                            const proofImg = p.proof_image || p.proof_url || p.proofOfPayment;
                                            return (
                                                <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/40 transition-colors">
                                                    <td className="py-2.5 px-3">
                                                        <p className="font-bold text-slate-900 dark:text-white">{formatDate(p.date || p.created_at)}</p>
                                                        <p className="text-[10px] text-slate-400 font-mono">#{p.referenceNumber || p.id || 'TX-AUTO'}</p>
                                                    </td>
                                                    <td className="py-2.5 px-3">
                                                        <span className="font-semibold text-slate-700 dark:text-zinc-300">{p.payment_method || 'GCash'}</span>
                                                        <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{p.description || p.notes || 'Monthly Dues'}</p>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right font-mono font-extrabold text-slate-900 dark:text-white">
                                                        ₱{Number(p.amount || 0).toLocaleString()}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center">
                                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                            p.status === 'Paid' || p.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
                                                            p.status === 'Pending' ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' :
                                                            'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                                                        }`}>
                                                            {p.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right">
                                                        {proofImg ? (
                                                            <button
                                                                onClick={() => setViewReceiptUrl(proofImg.startsWith('http') ? proofImg : `http://localhost:5000${proofImg.startsWith('/') ? proofImg : `/${proofImg}`}`)}
                                                                className="text-xs font-bold text-teal-600 hover:underline flex items-center gap-1 ml-auto"
                                                            >
                                                                <ImageIcon className="w-3.5 h-3.5" />
                                                                <span>View</span>
                                                            </button>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-400">Cash Ref</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="py-12 text-center text-slate-400">
                                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                    <p className="text-xs font-semibold">No payment records found</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 text-[11px] text-slate-400 font-mono flex justify-between items-center">
                        <span>Showing {filteredPayments.length} of {payments.length} transactions</span>
                        <span className="text-teal-600 font-bold">Official Digital Ledger</span>
                    </div>
                </div>

            </div>

            {/* Modal 1: Submit Payment Proof */}
            <AnimatePresence>
                {isPaymentModalOpen && (
                    <>
                        <div 
                            className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs z-50"
                            onClick={() => !isSubmitting && setIsPaymentModalOpen(false)}
                        />
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                            <div className="w-full max-w-md bg-card rounded-2xl shadow-xl border border-slate-200 dark:border-zinc-800 overflow-hidden pointer-events-auto flex flex-col">
                                <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-900/40">
                                    <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                        <Upload className="w-4 h-4 text-teal-600" />
                                        <span>Submit Payment Verification</span>
                                    </h2>
                                    <button 
                                        onClick={() => !isSubmitting && setIsPaymentModalOpen(false)}
                                        className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <form onSubmit={handlePaymentSubmit} className="p-5 space-y-4">
                                    {fileError && (
                                        <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600 text-xs font-semibold border border-rose-200">
                                            {fileError}
                                        </div>
                                    )}

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Amount Paid (₱)</label>
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

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Payment Channel</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {(['GCash', 'Bank Transfer', 'Cash'] as const).map(method => (
                                                <button
                                                    key={method}
                                                    type="button"
                                                    onClick={() => setPayMethod(method)}
                                                    className={`py-2 px-2 rounded-lg text-xs font-bold border transition-all text-center ${
                                                        payMethod === method
                                                            ? 'border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300'
                                                            : 'border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400'
                                                    }`}
                                                >
                                                    {method}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Reference No. / Notes</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. GCash Ref 90812348123"
                                            value={payNotes}
                                            onChange={(e) => setPayNotes(e.target.value)}
                                            className="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white outline-none focus:border-teal-500"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Proof of Payment Screenshot (Max 5MB)</label>
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
                                        {isSubmitting ? 'Submitting Proof...' : 'Upload & Submit for Verification'}
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