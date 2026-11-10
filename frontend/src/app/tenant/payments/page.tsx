"use client";

import { useEffect, useState, useMemo, useRef } from 'react';
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

const resolveQrUrl = (url?: string | null): string => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
        return url;
    }
    const base = process.env.NEXT_PUBLIC_API_URL
        ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, "")
        : typeof window !== "undefined"
            ? `http://${window.location.hostname}:5000`
            : "http://localhost:5000";
    return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
};

const defaultBill = {
    month: "No bill yet",
    dueDate: null,
    totalAmount: 0,
    amountPaid: 0,
    remainingBalance: 0,
    status: "No bill yet",
    breakdown: { rent: 0, water: 0, electricity: 0, other: 0, penalty: 0 },
    creationDay: 1,
    hasBill: false
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

    const [ownerQrCode, setOwnerQrCode] = useState<string>("");
    const [viewingPayment, setViewingPayment] = useState<any | null>(null);
    const [isCompletingPayment, setIsCompletingPayment] = useState(false);
    const [paymentSuccessData, setPaymentSuccessData] = useState<any | null>(null);
    const isProcessingRef = useRef(false);

    const hasActiveBill = Boolean(
        currentBill && 
        (currentBill.id || currentBill.invoice_number) && 
        currentBill.status !== 'Clear' &&
        currentBill.status?.toLowerCase() !== 'no bill yet' &&
        currentBill.hasBill !== false
    );

    const statementPeriodMonth = hasActiveBill ? (currentBill.month || "No bill yet") : "No bill yet";
    const statementPeriodStatus = hasActiveBill ? currentBill.status : "No bill yet";

    // Strictly display the owner's uploaded QR code
    const activeQrUrl = ownerQrCode ? resolveQrUrl(ownerQrCode) : "";

    const startPaymentSession = (method = 'QR Ph') => {
        if (typeof window !== 'undefined' && currentBill?.id) {
            const sessionData = {
                billId: currentBill.id,
                amount: currentBill.remainingBalance,
                method: method,
                startedAt: Date.now()
            };
            try {
                sessionStorage.setItem('renttrack_pending_qrph_bill', JSON.stringify(sessionData));
                sessionStorage.setItem('renttrack_pending_gcash_bill', JSON.stringify(sessionData));
                localStorage.setItem('renttrack_pending_qrph_bill', JSON.stringify(sessionData));
                localStorage.setItem('renttrack_pending_gcash_bill', JSON.stringify(sessionData));
            } catch (e) {}
        }
    };

    const fetchPaymentData = async (showToast = false) => {
        if (showToast) setIsRefreshing(true);
        try {
            const [billResponse, paymentsResponse, qrResponse] = await Promise.all([
                api.get('/tenant/bill/current').catch(() => ({ data: null })),
                api.get('/tenant/payments').catch(() => ({ data: [] })),
                api.get('/tenant/qrph-qr').catch(() => api.get('/tenant/gcash-qr')).catch(() => ({ data: null }))
            ]);

            if (billResponse.data) setCurrentBill(billResponse.data);
            const qrVal = qrResponse?.data?.qrphQrCode || qrResponse?.data?.gcashQrCode;
            if (qrVal !== undefined) {
                setOwnerQrCode(qrVal || "");
            }

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

    const handleDownloadQr = async () => {
        const qrUrl = activeQrUrl;
        if (!qrUrl) {
            toast.error("No owner QR Ph code available to download");
            return;
        }

        startPaymentSession('QR Ph');
        try {
            if (qrUrl.startsWith("data:")) {
                const link = document.createElement("a");
                link.href = qrUrl;
                link.download = "owner-qrph-payment-code.png";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                const response = await fetch(qrUrl);
                const blob = await response.blob();
                const blobUrl = window.URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = blobUrl;
                link.download = "owner-qrph-payment-code.png";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(blobUrl);
            }
            toast.success("Owner's QR Ph Code downloaded successfully", {
                description: "Open your mobile banking app > Scan QR > Upload from Gallery."
            });
        } catch (err) {
            window.open(qrUrl, "_blank");
        }
    };

    const autoSettlePayment = async (targetBillId: number, targetAmount: number, targetMethod = 'QR Ph') => {
        if (isCompletingPayment || isProcessingRef.current) return;
        if (!targetBillId) return;

        try {
            setIsCompletingPayment(true);
            isProcessingRef.current = true;
            const { data } = await api.post('/tenant/pay/qrph', {
                bill_id: targetBillId,
                amount: targetAmount,
                payment_method: targetMethod || 'QR Ph'
            });

            if (typeof window !== 'undefined') {
                sessionStorage.removeItem('renttrack_pending_qrph_bill');
                sessionStorage.removeItem('renttrack_pending_gcash_bill');
                localStorage.removeItem('renttrack_pending_qrph_bill');
                localStorage.removeItem('renttrack_pending_gcash_bill');
            }

            setPaymentSuccessData(data);
            setIsPaymentModalOpen(true);
            await fetchPaymentData();
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('renttrack-refresh-counts'));
                window.dispatchEvent(new Event('renttrack-refresh-data'));
            }
            toast.success("Payment Successful! Statement marked as Paid.");
        } catch (error: any) {
            console.error("Auto-settle payment error:", error);
            if (error.response?.data?.message?.includes('already been completely settled')) {
                if (typeof window !== 'undefined') {
                    sessionStorage.removeItem('renttrack_pending_qrph_bill');
                    sessionStorage.removeItem('renttrack_pending_gcash_bill');
                    localStorage.removeItem('renttrack_pending_qrph_bill');
                    localStorage.removeItem('renttrack_pending_gcash_bill');
                }
                await fetchPaymentData();
            }
        } finally {
            setIsCompletingPayment(false);
            isProcessingRef.current = false;
        }
    };

    // Automatically detect when tenant returns from QR Ph / mobile banking payment
    useEffect(() => {
        const checkPendingGcashPayment = async () => {
            if (typeof window === 'undefined' || isProcessingRef.current || isCompletingPayment) return;
            const pendingRaw = sessionStorage.getItem('renttrack_pending_qrph_bill') || 
                               sessionStorage.getItem('renttrack_pending_gcash_bill') || 
                               localStorage.getItem('renttrack_pending_qrph_bill') || 
                               localStorage.getItem('renttrack_pending_gcash_bill');
            if (!pendingRaw) return;

            try {
                const pending = JSON.parse(pendingRaw);
                // Verify pending record was created within the last 30 minutes
                if (pending && pending.billId && (Date.now() - pending.startedAt < 30 * 60 * 1000)) {
                    sessionStorage.removeItem('renttrack_pending_qrph_bill');
                    sessionStorage.removeItem('renttrack_pending_gcash_bill');
                    localStorage.removeItem('renttrack_pending_qrph_bill');
                    localStorage.removeItem('renttrack_pending_gcash_bill');
                    await autoSettlePayment(pending.billId, pending.amount, pending.method || 'QR Ph');
                } else {
                    sessionStorage.removeItem('renttrack_pending_qrph_bill');
                    sessionStorage.removeItem('renttrack_pending_gcash_bill');
                    localStorage.removeItem('renttrack_pending_qrph_bill');
                    localStorage.removeItem('renttrack_pending_gcash_bill');
                }
            } catch (err) {
                console.error("Error auto-verifying QR Ph return payment:", err);
            }
        };

        checkPendingGcashPayment();

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                checkPendingGcashPayment();
            }
        };

        window.addEventListener('focus', checkPendingGcashPayment);
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            window.removeEventListener('focus', checkPendingGcashPayment);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, []);

    useEffect(() => {
        fetchPaymentData();
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsPaymentModalOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const filteredPayments = useMemo(() => {
        return payments.filter(p => {
            const isApproved = p.status === 'Paid' || p.status === 'Approved' || p.status === 'Verified' || !p.status;
            const isPendingOrRejected = p.status === 'Pending' || p.status === 'Pending Verification' || p.status === 'Rejected';
            if (!isApproved || isPendingOrRejected) return false;

            const refNum = p.reference_number || p.referenceNumber || p.id?.toString() || "";
            const desc = p.description || p.notes || "";
            const method = p.payment_method || p.method || "";
            const matchesSearch = !searchQuery || 
                refNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
                desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                method.toLowerCase().includes(searchQuery.toLowerCase());

            return matchesSearch;
        }).sort((a, b) => {
            const dateA = new Date(a.date || a.created_at).getTime();
            const dateB = new Date(b.date || b.created_at).getTime();
            if (sortBy === 'date_desc') return dateB - dateA;
            if (sortBy === 'date_asc') return dateA - dateB;
            if (sortBy === 'amount_desc') return Number(b.amount || 0) - Number(a.amount || 0);
            if (sortBy === 'amount_asc') return Number(a.amount || 0) - Number(b.amount || 0);
            return 0;
        });
    }, [payments, searchQuery, sortBy]);

    // Skeleton Loader
    if (isLoading) {
        return (
            <div className="w-full space-y-4 font-sans text-slate-900 dark:text-white animate-pulse">
                {/* Header Toolbar Skeleton */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-[#1E2638]">
                    <div>
                        <div className="h-7 w-64 bg-slate-100 dark:bg-[#182032] rounded-lg"></div>
                        <div className="h-3.5 w-80 bg-slate-100 dark:bg-[#182032] rounded-md mt-2"></div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-24 bg-slate-100 dark:bg-[#182032] rounded-lg"></div>
                        <div className="h-8 w-32 bg-slate-100 dark:bg-[#182032] rounded-lg"></div>
                    </div>
                </div>

                {/* Telemetry Ribbon (4 Tiles) Skeleton */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white dark:bg-[#111625] border border-slate-200 dark:border-[#1E2638] rounded-xl p-3.5 shadow-xs flex items-center justify-between">
                            <div className="space-y-1.5 flex-1">
                                <div className="h-2.5 w-24 bg-slate-100 dark:bg-[#182032] rounded"></div>
                                <div className="h-6 w-32 bg-slate-100 dark:bg-[#182032] rounded-md"></div>
                                <div className="h-2.5 w-20 bg-slate-100 dark:bg-[#182032] rounded"></div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 shrink-0"></div>
                        </div>
                    ))}
                </div>

                {/* Main Workspace Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-1 bg-white dark:bg-[#111625] border border-slate-200 dark:border-[#1E2638] rounded-xl p-5 shadow-xs space-y-3.5 h-[518px]">
                        <div className="h-4 w-36 bg-slate-100 dark:bg-[#182032] rounded"></div>
                        <div className="h-8 w-44 bg-slate-100 dark:bg-[#182032] rounded-md"></div>
                        <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-[#1E2638]">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="flex justify-between">
                                    <div className="h-3 w-20 bg-slate-100 dark:bg-[#182032] rounded"></div>
                                    <div className="h-3 w-16 bg-slate-100 dark:bg-[#182032] rounded"></div>
                                </div>
                            ))}
                        </div>
                        <div className="h-10 w-full bg-slate-100 dark:bg-[#182032] rounded-xl mt-4"></div>
                    </div>

                    <div className="lg:col-span-2 bg-white dark:bg-[#111625] border border-slate-200 dark:border-[#1E2638] rounded-xl p-5 shadow-xs flex flex-col justify-between h-[518px]">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-[#1E2638]">
                            <div className="h-4 w-40 bg-slate-100 dark:bg-[#182032] rounded"></div>
                            <div className="h-7 w-48 bg-slate-100 dark:bg-[#182032] rounded-lg"></div>
                        </div>
                        <div className="space-y-2 my-2 flex-1">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-12 bg-slate-50 dark:bg-zinc-900/40 rounded-xl border border-slate-200 dark:border-[#1E2638]"></div>
                            ))}
                        </div>
                        <div className="h-4 w-32 bg-slate-100 dark:bg-[#182032] rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    // UI Render
    return (
        <div className="w-full flex-1 flex flex-col space-y-4 sm:space-y-5 font-sans text-slate-900 dark:text-white min-h-[calc(100vh-6.2rem)] justify-between pb-1">
            
            {/* Header Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-[#1E2638]/80 shrink-0">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                            <CreditCard className="w-6 h-6 text-sky-600 dark:text-[#38bdf8] shrink-0" />
                            <span>My Bills and Payments</span>
                        </h1>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Review active billing statement breakdown, pay online via QR Ph (GCash, Maya, Bank Transfer), and track ledger history. For cash payments, please visit the admin office.
                    </p>
                </div>
            </div>

            {/*  Financial Telemetry Ribbon (4 Tiles) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 shrink-0">
                
                {/* Remaining Balance */}
                <div className="bg-white dark:bg-[#111625] border border-slate-200 dark:border-[#1E2638] rounded-xl sm:rounded-2xl p-4 sm:p-4.5 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Current Balance</span>
                        <div className={`text-2xl sm:text-3xl font-black font-mono mt-0.5 leading-tight ${
                            hasActiveBill && currentBill.remainingBalance > 0 ? 'text-rose-600 dark:text-[#f43f5e]' : 'text-emerald-600 dark:text-[#10b981]'
                        }`}>
                            ₱{Number(currentBill.remainingBalance || 0).toLocaleString()}
                        </div>
                        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1">
                            {hasActiveBill ? (currentBill.status || 'Active Statement') : 'No bill yet'}
                        </div>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-[#182032] border border-slate-200 dark:border-[#243048] text-sky-600 dark:text-[#38bdf8] flex items-center justify-center shrink-0 shadow-sm">
                        <Wallet className="w-5.5 h-5.5" />
                    </div>
                </div>

                {/* Paid This Month */}
                <div className="bg-white dark:bg-[#111625] border border-slate-200 dark:border-[#1E2638] rounded-xl sm:rounded-2xl p-4 sm:p-4.5 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Paid This Month</span>
                        <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-[#10b981] mt-0.5 leading-tight">
                            ₱{summary.monthTotal.toLocaleString()}
                        </div>
                        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1">
                            Approved and recorded
                        </div>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-[#182032] border border-slate-200 dark:border-[#243048] text-emerald-600 dark:text-[#10b981] flex items-center justify-center shrink-0 shadow-sm">
                        <TrendingUp className="w-5.5 h-5.5" />
                    </div>
                </div>

                {/* Total Settled*/}
                <div className="bg-white dark:bg-[#111625] border border-slate-200 dark:border-[#1E2638] rounded-xl sm:rounded-2xl p-4 sm:p-4.5 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Payments</span>
                        <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white mt-0.5 leading-tight">
                            ₱{summary.yearTotal.toLocaleString()}
                        </div>
                        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1">
                            {summary.txCount} total transaction{summary.txCount !== 1 ? 's' : ''}
                        </div>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-[#182032] border border-slate-200 dark:border-[#243048] text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 shadow-sm">
                        <CheckCircle2 className="w-5.5 h-5.5" />
                    </div>
                </div>

                {/*  Due Date */}
                <div className="bg-white dark:bg-[#111625] border border-slate-200 dark:border-[#1E2638] rounded-xl sm:rounded-2xl p-4 sm:p-4.5 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Payment Due Date</span>
                        <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-0.5 leading-tight">
                            {hasActiveBill && currentBill.dueDate ? formatDate(currentBill.dueDate, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No bill yet'}
                        </div>
                        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1">
                            {hasActiveBill ? 'Due on 15th of each month' : 'No active bill'}
                        </div>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-[#182032] border border-slate-200 dark:border-[#243048] text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 shadow-sm">
                        <Calendar className="w-5.5 h-5.5" />
                    </div>
                </div>

            </div>

            {/* Main Workspace Split: Statement Breakdown (Left) & Transaction Ledger (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 items-stretch">
                
                {/* Active Statement Breakdown Card */}
                <div className="lg:col-span-1 bg-white dark:bg-[#111625] border border-slate-200 dark:border-[#1E2638] rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start pb-3.5 border-b border-slate-200 dark:border-[#1E2638]">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Statement Period</span>
                                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-0.5">{statementPeriodMonth}</h2>
                            </div>
                            <span className={`text-xs font-bold uppercase ${
                                !hasActiveBill ? 'text-slate-500 dark:text-slate-400' : currentBill.status === 'Paid' ? 'text-emerald-600 dark:text-[#10b981]' :
                                currentBill.status === 'Pending Verification' ? 'text-amber-600 dark:text-amber-400' :
                                'text-rose-600 dark:text-[#f43f5e]'
                            }`}>
                                {statementPeriodStatus}
                            </span>
                        </div>

                        <div className="my-4 py-2 space-y-3 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 dark:text-slate-400 font-medium">Room rent</span>
                                <span className="font-mono font-bold text-slate-900 dark:text-white text-sm sm:text-base">₱{(currentBill.breakdown?.rent || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 dark:text-slate-400 font-medium">Water bill </span>
                                <span className="font-mono font-bold text-slate-900 dark:text-white text-sm sm:text-base">₱{(currentBill.breakdown?.water || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 dark:text-slate-400 font-medium">Electricity bill</span>
                                <span className="font-mono font-bold text-slate-900 dark:text-white text-sm sm:text-base">₱{(currentBill.breakdown?.electricity || 0).toLocaleString()}</span>
                            </div>
                            {currentBill.breakdown?.penalty > 0 && (
                                <div className="flex justify-between items-center text-rose-600 dark:text-[#f43f5e]">
                                    <span className="font-medium">Late Penalty Surcharge</span>
                                    <span className="font-mono font-bold text-sm sm:text-base">+₱{currentBill.breakdown.penalty.toLocaleString()}</span>
                                </div>
                            )}

                            <div className="pt-3 border-t border-slate-200 dark:border-[#1E2638] flex justify-between items-center font-bold">
                                <span className="text-sm sm:text-base text-slate-900 dark:text-white">Total Amount</span>
                                <span className="font-mono font-black text-slate-900 dark:text-white text-base sm:text-lg">₱{Number(currentBill.totalAmount || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm text-emerald-600 dark:text-[#10b981] font-semibold">
                                <span>Amount Paid</span>
                                <span className="font-mono font-bold">₱{Number(currentBill.amountPaid || 0).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-200 dark:border-[#1E2638]">
                        {/* Remaining Balance */}
                        <div className="flex justify-between items-baseline mb-3.5">
                            <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Remaining Balance</span>
                            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                                ₱{Number(currentBill.remainingBalance || 0).toLocaleString()}
                            </span>
                        </div>

                        {/* In-Person Cash Payment Advisory */}
                        <div className="mb-3 p-3 rounded-xl border border-slate-200 dark:border-[#1E2638] bg-slate-50 dark:bg-[#0f1422] flex items-start gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-[#182032] border border-slate-200 dark:border-[#243048] text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                                <Building2 className="w-3.5 h-3.5 text-sky-600 dark:text-[#38bdf8]" />
                            </div>
                            <div className="space-y-0.5 text-xs">
                                <span className="font-bold text-slate-900 dark:text-white">Paying in Cash?</span>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Cash payments are accepted in person at the <strong className="text-slate-600 dark:text-slate-300">Admin Office</strong>. Hand your cash directly to the administrator, who will issue your official receipt and record it into your ledger.
                                </p>
                            </div>
                        </div>

                        {/* Pay Button */}
                        <button
                            onClick={() => {
                                api.get('/tenant/qrph-qr')
                                    .catch(() => api.get('/tenant/gcash-qr'))
                                    .then((res) => {
                                        const qrVal = res?.data?.qrphQrCode || res?.data?.gcashQrCode;
                                        if (qrVal !== undefined) {
                                            setOwnerQrCode(qrVal || "");
                                        }
                                    })
                                    .catch(() => {});
                                startPaymentSession('QR Ph');
                                setIsPaymentModalOpen(true);
                            }}
                            disabled={!hasActiveBill || currentBill.remainingBalance <= 0}
                            className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                !hasActiveBill || currentBill.remainingBalance <= 0
                                    ? 'bg-slate-100 dark:bg-[#182032] text-slate-500 border border-slate-200 dark:border-[#1E2638] cursor-not-allowed'
                                    : 'bg-[#0066FF] hover:bg-blue-600 text-white shadow-md'
                            }`}
                        >
                            <CreditCard className="w-4.5 h-4.5" />
                            <span>{!hasActiveBill ? 'No bill yet' : currentBill.remainingBalance <= 0 ? 'Statement Settled' : 'Pay Online via QR Ph'}</span>
                        </button>
                        <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 mt-1.5 font-medium">
                            Scan with GCash, Maya, BPI, BDO & any banking app
                        </p>
                    </div>
                </div>

                {/* Transaction Ledger Table */}
                <div className="lg:col-span-2 bg-white dark:bg-[#111625] border border-slate-200 dark:border-[#1E2638] rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-200 dark:border-[#1E2638]">
                            <div>
                                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <Clock className="w-4.5 h-4.5 text-sky-600 dark:text-[#38bdf8]" />
                                    <span>Payment History</span>
                                </h2>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">Track and view your settled payments</p>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="relative w-full sm:w-52">
                                    <Search className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute left-3 top-2.5" />
                                    <input
                                        type="text"
                                        placeholder="Search reference #..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full py-2 pl-9 pr-3 text-xs sm:text-sm rounded-lg bg-slate-50 dark:bg-[#0f1422] border border-slate-200 dark:border-[#1E2638] text-slate-900 dark:text-white placeholder:text-slate-500 outline-none focus:border-slate-600 font-medium"
                                    />
                                </div>

                                <span className="text-xs font-semibold text-emerald-600 dark:text-[#10b981] flex items-center gap-1.5 shrink-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
                                    Status: Paid
                                </span>
                            </div>
                        </div>

                        <div className="my-2 overflow-y-auto custom-scrollbar h-[518px] max-h-[518px]">
                            {filteredPayments.length > 0 ? (
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead>
                                        <tr className="h-[40px] border-b border-slate-200 dark:border-[#1E2638] text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 sticky top-0 bg-white dark:bg-[#111625] z-10">
                                            <th className="py-2 px-3.5 bg-white dark:bg-[#111625]">Date</th>
                                            <th className="py-2 px-3.5 bg-white dark:bg-[#111625]">Reference</th>
                                            <th className="py-2 px-3.5 bg-white dark:bg-[#111625]">Method</th>
                                            <th className="py-2 px-3.5 text-right bg-white dark:bg-[#111625]">Amount</th>
                                            <th className="py-2 px-3.5 text-center bg-white dark:bg-[#111625]">Status</th>
                                            <th className="py-2 px-3.5 text-right bg-white dark:bg-[#111625]">Proof</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-[#1E2638]/60 font-sans">
                                        {filteredPayments.map((p: any, i: number) => {
                                            const proofImg = p.proof_image || p.proof_url || p.proofOfPayment;
                                            const rawMethod = p.payment_method || p.method || 'QR Ph';
                                            const isCash = String(rawMethod).toLowerCase() === 'cash';
                                            const isQrPh = String(rawMethod).toLowerCase().includes('qrph') || String(rawMethod).toLowerCase().includes('qr ph');
                                            const displayMethod = isCash ? 'Cash (Admin Office)' : isQrPh ? 'QR Ph' : rawMethod;
                                            const isApproved = p.status === 'Paid' || p.status === 'Approved' || p.status === 'Verified';
                                            const isPending = p.status === 'Pending' || p.status === 'Pending Verification';
                                            const refNumber = p.reference_number || p.referenceNumber || (p.notes ? p.notes.replace(/^Ref[:#]?\s*/i, '') : `REF-${p.id}`);
                                            return (
                                                <tr key={i} className="h-[53px] hover:bg-slate-50 dark:hover:bg-[#161e31] transition-colors">
                                                    {/* Date */}
                                                    <td className="py-1.5 px-3.5 whitespace-nowrap font-medium text-slate-900 dark:text-white text-xs sm:text-sm">
                                                        {formatDate(p.date || p.created_at)}
                                                    </td>

                                                    {/* Reference */}
                                                    <td className="py-1.5 px-3.5 whitespace-nowrap">
                                                        <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-300">
                                                            {refNumber}
                                                        </span>
                                                    </td>

                                                    {/* Method */}
                                                    <td className="py-1.5 px-3.5 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <span className="p-1.5 rounded-lg text-xs font-bold shrink-0 bg-slate-100 dark:bg-[#182032] border border-slate-200 dark:border-[#243048] text-sky-600 dark:text-[#38bdf8]">
                                                                {isCash ? <Building2 className="w-4 h-4" /> : <QrCode className="w-4 h-4" />}
                                                            </span>
                                                            <span className="font-bold text-slate-700 dark:text-slate-200 text-xs sm:text-sm">
                                                                {displayMethod}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-1.5 px-3.5 text-right font-mono font-black text-slate-900 dark:text-white text-base sm:text-lg whitespace-nowrap">
                                                        ₱{Number(p.amount || 0).toLocaleString()}
                                                    </td>
                                                    <td className="py-1.5 px-3.5 text-center whitespace-nowrap">
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-600 dark:text-[#10b981]">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
                                                            Paid
                                                        </span>
                                                    </td>
                                                    <td className="py-1.5 px-3.5 text-right whitespace-nowrap">
                                                        <button
                                                            onClick={() => setViewingPayment(p)}
                                                            className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:underline flex items-center gap-1.5 ml-auto cursor-pointer"
                                                        >
                                                            {isCash ? <FileText className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                                                            <span>View</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="h-[518px] flex flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400">
                                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm font-semibold">No payment records found</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>

            {/* GCash Payment Modal (Statement Overview on Left + QR Code & Download on Right -> Payment Complete Card) */}
            <AnimatePresence>
                {isPaymentModalOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs z-50"
                            onClick={() => {
                                setIsPaymentModalOpen(false);
                                setPaymentSuccessData(null);
                            }}
                        />
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                                transition={{ duration: 0.16, ease: "easeOut" }}
                                className="w-full max-w-2xl sm:max-w-3xl bg-white dark:bg-[#111625] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#1E2638] overflow-hidden pointer-events-auto p-5 sm:p-6 space-y-4 text-slate-900 dark:text-white"
                            >
                                {paymentSuccessData ? (
                                    /* Pop-up Card Message: Payment Complete (Automatically Marked as Paid) */
                                    <div className="py-4 px-2 sm:px-4 flex flex-col items-center text-center space-y-4">
                                        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-lg animate-in zoom-in-75 duration-300">
                                            <CheckCircle2 className="w-10 h-10" />
                                        </div>

                                        <div>
                                            <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                                QR Ph National Standard Settlement
                                            </span>
                                            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">
                                                Payment Successful!
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                                                Your payment has been received and your billing statement balance has been automatically marked as <strong className="text-emerald-600 dark:text-emerald-400 font-bold">Paid</strong>.
                                            </p>
                                        </div>

                                        {/* Receipt Details Box */}
                                        <div className="w-full max-w-md p-4 rounded-xl bg-slate-50 dark:bg-[#0f1422] border border-slate-200 dark:border-[#1E2638] space-y-2.5 text-xs text-left">
                                            <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                                                <span>Amount Paid</span>
                                                <span className="font-mono font-black text-slate-900 dark:text-white text-base">
                                                    ₱{Number(paymentSuccessData.amount_paid || 0).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                                                <span>QR Ph Reference No.</span>
                                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                                    {paymentSuccessData.reference_number}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                                                <span>Billing Period</span>
                                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                    {paymentSuccessData.billing_month || statementPeriodMonth}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                                                <span>Payment Method</span>
                                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                    QR Ph (GCash, Maya & Philippine Banks)
                                                </span>
                                            </div>
                                            <div className="pt-2 border-t border-slate-200 dark:border-[#1E2638] flex justify-between items-center font-bold">
                                                <span className="text-slate-600 dark:text-slate-300">Statement Status</span>
                                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                    Paid & Settled
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPaymentSuccessData(null);
                                                setIsPaymentModalOpen(false);
                                            }}
                                            className="w-full max-w-md py-3 rounded-xl text-xs sm:text-sm font-bold bg-[#0066FF] hover:bg-blue-600 text-white transition-all shadow-md flex items-center justify-center cursor-pointer"
                                        >
                                            Done (View Updated Statement)
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {/* Modal Header with Close Button */}
                                        <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-[#1E2638]">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-800/40 text-sky-600 dark:text-[#38bdf8] flex items-center justify-center">
                                                    <QrCode className="w-4.5 h-4.5" />
                                                </div>
                                                <div>
                                                    <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                                                        <span>QR Ph National Online Payment</span>
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                            Universal
                                                        </span>
                                                    </h3>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                                        One interoperable QR code for GCash, Maya, BDO, BPI, GoTyme, and all PH mobile banking apps
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setIsPaymentModalOpen(false);
                                                    setPaymentSuccessData(null);
                                                }}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                                aria-label="Close modal"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>

                                        {/* Supported Apps Pill Strip */}
                                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0f1422] border border-slate-200 dark:border-[#1E2638] flex flex-wrap items-center gap-1.5 text-[11px]">
                                            <span className="font-bold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                                Scan with Any App:
                                            </span>
                                            {['GCash', 'Maya', 'BDO', 'BPI', 'UnionBank', 'GoTyme', 'SeaBank', 'Landbank', '+ All QR Ph Banks'].map((app) => (
                                                <span key={app} className="px-2 py-0.5 rounded-md font-semibold bg-white dark:bg-[#182032] border border-slate-200 dark:border-[#243048] text-slate-700 dark:text-slate-200 text-[10px]">
                                                    {app}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Two-Column Split: Statement Overview (Left) & QR Ph Code (Right) */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                                            {/* Left: Statement Overview Card */}
                                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0f1422] border border-slate-200 dark:border-[#1E2638] flex flex-col justify-between space-y-3">
                                                <div>
                                                    <div className="flex justify-between items-start pb-2.5 border-b border-slate-200/80 dark:border-zinc-800">
                                                        <div>
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Statement Overview</span>
                                                            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">{statementPeriodMonth}</h4>
                                                        </div>
                                                        <span className={`text-[11px] font-bold uppercase ${
                                                            !hasActiveBill ? 'text-slate-500 dark:text-slate-400' : currentBill.status === 'Paid' ? 'text-emerald-600 dark:text-emerald-400' :
                                                            currentBill.status === 'Pending Verification' ? 'text-amber-600 dark:text-amber-400' :
                                                            'text-rose-600 dark:text-rose-400'
                                                        }`}>
                                                            {statementPeriodStatus}
                                                        </span>
                                                    </div>

                                                    {/* Breakdown items */}
                                                    <div className="space-y-2 text-xs py-2">
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
                                                        {currentBill.breakdown?.other > 0 && (
                                                            <div className="flex justify-between items-center text-slate-600 dark:text-zinc-400">
                                                                <span>Other charges</span>
                                                                <span className="font-mono font-bold text-slate-900 dark:text-zinc-100">₱{currentBill.breakdown.other.toLocaleString()}</span>
                                                            </div>
                                                        )}
                                                        {currentBill.breakdown?.penalty > 0 && (
                                                            <div className="flex justify-between items-center text-rose-600 dark:text-rose-400 font-semibold">
                                                                <span>Late Penalty charge</span>
                                                                <span className="font-mono font-bold">+₱{currentBill.breakdown.penalty.toLocaleString()}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Remaining balance callout */}
                                                <div className="pt-2.5 border-t border-slate-200 dark:border-[#1E2638] flex justify-between items-baseline">
                                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Total amount to pay</span>
                                                    <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white">
                                                        ₱{Number(currentBill.remainingBalance || 0).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Right: Owner's Uploaded QR Code Display Card */}
                                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0f1422] border border-slate-200 dark:border-[#1E2638] flex flex-col items-center justify-between text-center space-y-3">
                                                <div className="w-full space-y-2">
                                                    <div className="flex items-center justify-center gap-1.5 pb-2 border-b border-slate-200/80 dark:border-zinc-800">
                                                        <QrCode className="w-3.5 h-3.5 text-sky-600 dark:text-[#38bdf8]" />
                                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-200">
                                                            Owner's QR Ph Code
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center justify-center pt-1">
                                                        {activeQrUrl ? (
                                                            <div 
                                                                className="w-full max-w-[210px] flex flex-col items-center justify-center rounded-xl overflow-hidden bg-white p-2.5 border border-slate-200 dark:border-zinc-800 shadow-xs"
                                                            >
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img
                                                                    src={activeQrUrl}
                                                                    alt="Owner's QR Ph Payment Code"
                                                                    className="w-full h-auto max-h-[190px] object-contain rounded-lg select-none"
                                                                />
                                                                <span className="text-[10px] text-slate-500 font-semibold mt-1.5">
                                                                    Owner's Official QR Ph Code
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <div className="w-full py-10 px-4 rounded-xl border border-dashed border-slate-300 dark:border-zinc-800 flex flex-col items-center justify-center text-center">
                                                                <QrCode className="w-10 h-10 text-slate-300 dark:text-zinc-700 mb-2" />
                                                                <p className="text-xs font-bold text-slate-700 dark:text-zinc-200">
                                                                    Owner QR Code Not Available
                                                                </p>
                                                                <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1 max-w-[220px]">
                                                                    The property owner has not uploaded an official QR Ph payment code yet. Please contact management or pay in cash at the Admin Office.
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {activeQrUrl && (
                                                        <button
                                                            type="button"
                                                            onClick={handleDownloadQr}
                                                            className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                                                        >
                                                            <Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                                                            <span>Download QR Code</span>
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="w-full space-y-1.5 pt-2 border-t border-slate-200/80 dark:border-zinc-800 text-center">
                                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                        Amount to Pay: <span className="font-mono text-emerald-600 dark:text-emerald-400">₱{Number(currentBill.remainingBalance || 0).toLocaleString()}</span>
                                                    </p>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                                        Scan this official QR code using GCash, Maya, or any Philippine banking app. When you return to RentTrack, your payment will automatically be updated.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>

            {/* View Payment Statement & Receipt Modal */}
            <AnimatePresence>
                {viewingPayment && (() => {
                    const proofImg = viewingPayment.proof_image || viewingPayment.proof_url || viewingPayment.proofOfPayment;
                    const rawMethod = viewingPayment.payment_method || viewingPayment.method || 'QR Ph';
                    const isCash = String(rawMethod).toLowerCase() === 'cash';
                    const isQrPh = String(rawMethod).toLowerCase().includes('qrph') || String(rawMethod).toLowerCase().includes('qr ph');
                    const isApproved = viewingPayment.status === 'Paid' || viewingPayment.status === 'Approved' || viewingPayment.status === 'Verified';
                    const isPending = viewingPayment.status === 'Pending' || viewingPayment.status === 'Pending Verification';
                    
                    const statementMonth = viewingPayment.billing_month || viewingPayment.description?.replace(/^Payment for /i, '') || "Statement Overview";
                    const rentVal = Number(viewingPayment.rent_amount ?? currentBill.breakdown?.rent ?? 0);
                    const waterVal = Number(viewingPayment.water_charges ?? currentBill.breakdown?.water ?? 0);
                    const electricityVal = Number(viewingPayment.electricity_charges ?? currentBill.breakdown?.electricity ?? 0);
                    const otherVal = Number(viewingPayment.other_fees ?? 0);
                    const statementTotal = Number(viewingPayment.bill_total ?? currentBill.totalAmount ?? viewingPayment.amount);

                    return (
                        <>
                            <div 
                                className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs z-50"
                                onClick={() => setViewingPayment(null)}
                            />
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                                <div className="w-full max-w-lg bg-white dark:bg-[#111625] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#1E2638] overflow-hidden pointer-events-auto flex flex-col max-h-[90vh] text-slate-900 dark:text-white">
                                    {/* Modal Header */}
                                    <div className="p-4 border-b border-slate-200 dark:border-[#1E2638] flex justify-between items-center bg-slate-50/50 dark:bg-zinc-900/40 shrink-0">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 ${
                                                isCash ? 'bg-emerald-600' : 'bg-blue-600'
                                            }`}>
                                                {isCash ? <Building2 className="w-4.5 h-4.5" /> : <QrCode className="w-4.5 h-4.5" />}
                                            </div>
                                            <div>
                                                <h2 className="text-sm font-black text-slate-900 dark:text-white">
                                                    {isCash ? 'Cash Payment Statement' : isQrPh ? 'QR Ph Payment & Receipt' : `${rawMethod} Payment & Receipt`}
                                                </h2>
                                                <p className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono">
                                                    Ref #{viewingPayment.reference_number || viewingPayment.referenceNumber || viewingPayment.id || 'N/A'} • {formatDate(viewingPayment.date || viewingPayment.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setViewingPayment(null)} 
                                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1E2638] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Modal Content */}
                                    <div className="p-5 space-y-4 overflow-y-auto">
                                        {/* Tenants Statement Overview */}
                                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0f1422] border border-slate-200 dark:border-[#1E2638] space-y-3">
                                            <div className="flex justify-between items-start pb-2.5 border-b border-slate-200/80 dark:border-zinc-800">
                                                <div>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Statement Overview</span>
                                                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">{statementMonth}</h3>
                                                </div>
                                                <span className={`text-[11px] font-bold uppercase ${
                                                    isApproved ? 'text-emerald-600 dark:text-emerald-400' :
                                                    isPending ? 'text-amber-600 dark:text-amber-400' :
                                                    'text-rose-600 dark:text-rose-400'
                                                }`}>
                                                    {viewingPayment.status}
                                                </span>
                                            </div>

                                            {/* Breakdown items */}
                                            <div className="space-y-1.5 text-xs">
                                                <div className="flex justify-between items-center text-slate-600 dark:text-zinc-400">
                                                    <span>Room rent</span>
                                                    <span className="font-mono font-bold text-slate-900 dark:text-zinc-100">₱{rentVal.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-slate-600 dark:text-zinc-400">
                                                    <span>Water bill</span>
                                                    <span className="font-mono font-bold text-slate-900 dark:text-zinc-100">₱{waterVal.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-slate-600 dark:text-zinc-400">
                                                    <span>Electricity bill</span>
                                                    <span className="font-mono font-bold text-slate-900 dark:text-zinc-100">₱{electricityVal.toLocaleString()}</span>
                                                </div>
                                                {otherVal > 0 && (
                                                    <div className="flex justify-between items-center text-rose-600 dark:text-rose-400 font-semibold">
                                                        <span>Other / Surcharges</span>
                                                        <span className="font-mono font-bold">+₱{otherVal.toLocaleString()}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Statement Total & Amount Paid in this Record */}
                                            <div className="pt-2.5 border-t border-slate-200/80 dark:border-zinc-800 space-y-1.5">
                                                {statementTotal > 0 && (
                                                    <div className="flex justify-between items-center text-xs text-slate-500 dark:text-zinc-400">
                                                        <span>Total Statement Amount</span>
                                                        <span className="font-mono font-bold text-slate-700 dark:text-zinc-300">₱{statementTotal.toLocaleString()}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-baseline pt-1">
                                                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">Amount Paid</span>
                                                    <span className="text-xl font-black font-mono text-slate-900 dark:text-white">
                                                        ₱{Number(viewingPayment.amount || 0).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Method & Verification / Receipt */}
                                        {isCash ? (
                                            /* Cash Payment Info - NO UPLOADED IMAGE */
                                            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#1E2638] bg-slate-50 dark:bg-[#0f1422] flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#182032] border border-slate-200 dark:border-[#243048] text-sky-600 dark:text-[#38bdf8] flex items-center justify-center shrink-0 mt-0.5">
                                                    <ShieldCheck className="w-4.5 h-4.5" />
                                                </div>
                                                <div className="space-y-0.5 text-xs">
                                                    <span className="font-bold text-slate-900 dark:text-white">Official In-Person Cash Payment</span>
                                                    <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed">
                                                        Handed in directly at the <strong>Admin Office</strong>. Official physical receipt was verified and recorded into your account ledger.
                                                    </p>
                                                    {(viewingPayment.reference_number || viewingPayment.referenceNumber) && (
                                                        <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono mt-1">
                                                            Ref #: <span className="font-bold text-slate-900 dark:text-white">{viewingPayment.reference_number || viewingPayment.referenceNumber}</span>
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            /* Online / QR Ph Payment Info & Uploaded Receipt Image */
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                                                        <ImageIcon className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
                                                        <span>{isQrPh ? 'QR Ph Payment Receipt' : 'Uploaded Payment Receipt'}</span>
                                                    </span>
                                                    {proofImg && (
                                                        <a
                                                            href={proofImg.startsWith('http') ? proofImg : `http://localhost:5000${proofImg.startsWith('/') ? proofImg : `/${proofImg}`}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[11px] font-bold text-zinc-900 dark:text-white hover:underline flex items-center gap-1"
                                                        >
                                                            <ArrowUpRight className="w-3 h-3" />
                                                            <span>Open Full Size</span>
                                                        </a>
                                                    )}
                                                </div>

                                                {proofImg ? (
                                                    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-[#1E2638] bg-slate-50 dark:bg-[#0c101c] flex items-center justify-center max-h-64 p-2">
                                                        <img 
                                                            src={proofImg.startsWith('http') ? proofImg : `http://localhost:5000${proofImg.startsWith('/') ? proofImg : `/${proofImg}`}`} 
                                                            alt="Payment Receipt" 
                                                            className="max-w-full max-h-60 object-contain rounded-lg" 
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 text-center text-xs text-slate-400 dark:text-zinc-500">
                                                        No uploaded receipt screenshot was attached with this {isQrPh ? 'QR Ph' : rawMethod} payment.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    );
                })()}
            </AnimatePresence>

        </div>
    );
}