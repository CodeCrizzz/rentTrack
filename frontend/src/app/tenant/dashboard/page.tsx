"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { 
    CreditCard, Building2, Bell, CheckCircle2, 
    ArrowUpRight, Clock, Droplets, Zap, ShieldCheck,
    Calendar, AlertCircle, Wrench, ChevronRight, RefreshCw,
    Wallet, TrendingUp, BedDouble
} from 'lucide-react';
import { toast } from 'sonner';

function AnimatedBalance({ value }: { value: number }) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        if (value > 0) {
            let start = 0;
            const end = value;
            const duration = 800; 
            const increment = end / (duration / 16); 
            
            const timer = setInterval(() => {
                start += increment;
                if (start >= end) {
                    setDisplayValue(end);
                    clearInterval(timer);
                } else {
                    setDisplayValue(Math.floor(start));
                }
            }, 16);
            return () => clearInterval(timer);
        } else {
            setDisplayValue(0);
        }
    }, [value]);

    return <>₱{displayValue.toLocaleString()}</>;
}

export default function TenantDashboard() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [userName, setUserName] = useState('Resident');
    const [selectedYear, setSelectedYear] = useState<'This Year' | 'Last Year'>('This Year');
    const [currentBill, setCurrentBill] = useState<any>(null);

    const [tenantData, setTenantData] = useState<{
        balanceDue: number;
        recentTransactions: any[];
        status: string;
        roomNumber: string | null;
        unreadCount: number;
        announcements: any[];
    }>({
        balanceDue: 0,
        recentTransactions: [],
        status: 'Pending',
        roomNumber: null,
        unreadCount: 0,
        announcements: []
    });

    const utilityData = selectedYear === 'This Year' ? [
        { month: 'Jan', water: 450, electricity: 1200 },
        { month: 'Feb', water: 420, electricity: 1100 },
        { month: 'Mar', water: 480, electricity: 1350 },
        { month: 'Apr', water: 500, electricity: 1800 },
        { month: 'May', water: 550, electricity: 2100 },
        { month: 'Jun', water: 490, electricity: 1950 },
        { month: 'Jul', water: 510, electricity: 2000 },
        { month: 'Aug', water: 530, electricity: 2200 },
        { month: 'Sep', water: 520, electricity: 2150 },
        { month: 'Oct', water: 500, electricity: 2050 },
        { month: 'Nov', water: 480, electricity: 1900 },
        { month: 'Dec', water: 460, electricity: 1800 },
    ] : [
        { month: 'Jan', water: 400, electricity: 1000 },
        { month: 'Feb', water: 410, electricity: 1050 },
        { month: 'Mar', water: 430, electricity: 1200 },
        { month: 'Apr', water: 460, electricity: 1500 },
        { month: 'May', water: 480, electricity: 1800 },
        { month: 'Jun', water: 470, electricity: 1750 },
        { month: 'Jul', water: 490, electricity: 1850 },
        { month: 'Aug', water: 500, electricity: 1900 },
        { month: 'Sep', water: 490, electricity: 1800 },
        { month: 'Oct', water: 480, electricity: 1700 },
        { month: 'Nov', water: 450, electricity: 1500 },
        { month: 'Dec', water: 440, electricity: 1400 },
    ];

    const fetchDashboardData = async (showToast = false) => {
        if (showToast) setIsRefreshing(true);
        try {
            const [dashboardRes, unreadRes, announcementsRes, currentBillRes] = await Promise.all([
                api.get('/tenant/dashboard'),
                api.get('/tenant/chat/unread').catch(() => ({ data: { unreadCount: 0 } })),
                api.get('/tenant/announcements').catch(() => ({ data: [] })),
                api.get('/tenant/bill/current').catch(() => ({ data: null }))
            ]);
            const { data } = dashboardRes;
            if (currentBillRes?.data) {
                setCurrentBill(currentBillRes.data);
            }
            setTenantData({
                balanceDue: parseFloat(data.balanceDue) || 0,
                status: data.status || 'Pending',
                roomNumber: data.roomNumber,
                recentTransactions: (data.recentTransactions || []).map((tx: any) => ({
                    id: tx.id,
                    type: tx.amount_paid ? 'payment' : 'charge',
                    description: tx.billing_month ? `${tx.billing_month} Statement` : (tx.description || 'Payment Received'),
                    date: (tx.payment_date || tx.created_at) ? new Date(tx.payment_date || tx.created_at).toLocaleDateString() : 'N/A',
                    amount: parseFloat(tx.amount_paid || tx.total_amount || 0),
                    status: tx.status
                })),
                unreadCount: unreadRes.data?.unreadCount || 0,
                announcements: announcementsRes.data || []
            });
            if (showToast) toast.success("Resident overview synchronized");
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
            if (showToast) toast.error("Could not sync overview");
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        setIsMounted(true);
        if (typeof window !== 'undefined') {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    const parsed = JSON.parse(userStr);
                    if (parsed.name) setUserName(parsed.name);
                } catch (e) {}
            }
        }
        fetchDashboardData();
    }, []);

    const today = new Date();
    const billDueDate = currentBill?.dueDate ? new Date(currentBill.dueDate) : new Date(today.getFullYear(), today.getMonth() + 1, 5);
    const daysUntilDue = Math.ceil((billDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const isOverdue = currentBill && currentBill.remainingBalance > 0 && (
        currentBill.status === 'Overdue' || daysUntilDue < 0
    );
    const isDueSoon = currentBill && currentBill.remainingBalance > 0 && !isOverdue && daysUntilDue <= 3;

    const totalPaidThisYear = (tenantData.recentTransactions || [])
        .filter((tx: any) => tx.type === 'payment' && (tx.status === 'Paid' || tx.status === 'Approved'))
        .reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0);

    const latestAnnouncement = tenantData.announcements && tenantData.announcements.length > 0 ? tenantData.announcements[0] : null;

    // ==========================================
    // 1:1 SKELETON LOADER
    // ==========================================
    if (isLoading || !isMounted) {
        return (
            <div className="w-full space-y-4 font-sans text-slate-900 dark:text-zinc-100 animate-pulse">
                {/* 1. Header Skeleton */}
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

                {/* 2. 4 Telemetry Ribbon Cards Skeleton */}
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

                {/* Notice Board Banner Skeleton */}
                <div className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs space-y-3">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-zinc-800">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-zinc-800"></div>
                            <div className="space-y-1">
                                <div className="h-3 w-28 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                                <div className="h-4 w-48 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                            </div>
                        </div>
                        <div className="h-4 w-24 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                    </div>
                    <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/40">
                        <div className="h-3 w-full bg-slate-200 dark:bg-zinc-800/60 rounded"></div>
                        <div className="h-3 w-5/6 bg-slate-200 dark:bg-zinc-800/60 rounded"></div>
                    </div>
                </div>

                {/* 3. Main Split Section Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Chart Box Skeleton */}
                    <div className="lg:col-span-2 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs flex flex-col justify-between h-[380px]">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-zinc-800">
                            <div className="space-y-1">
                                <div className="h-4 w-40 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                                <div className="h-3 w-56 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                            </div>
                            <div className="h-7 w-28 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                        </div>
                        <div className="flex-1 my-4 flex items-end gap-3 px-2">
                            {[...Array(12)].map((_, i) => (
                                <div key={i} className="flex-1 bg-slate-100 dark:bg-zinc-800/60 rounded-t-lg" style={{ height: `${25 + (i * 11) % 65}%` }}></div>
                            ))}
                        </div>
                        <div className="flex justify-center gap-6 pt-2 border-t border-slate-100 dark:border-zinc-800">
                            <div className="h-3 w-24 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                            <div className="h-3 w-24 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                        </div>
                    </div>

                    {/* Recent Transactions Skeleton */}
                    <div className="lg:col-span-1 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs flex flex-col justify-between h-[380px]">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-zinc-800">
                            <div className="h-4 w-36 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                            <div className="h-3.5 w-16 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                        </div>
                        <div className="space-y-2.5 my-auto">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="p-2.5 rounded-lg border border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/30 flex items-center justify-between">
                                    <div className="space-y-1 flex-1">
                                        <div className="h-3 w-32 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                                        <div className="h-2.5 w-20 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                                    </div>
                                    <div className="h-4 w-16 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                                </div>
                            ))}
                        </div>
                        <div className="h-3 w-28 bg-slate-200 dark:bg-zinc-800 rounded mx-auto mt-2"></div>
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
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            Welcome back, {userName.split(' ')[0] || 'Resident'}
                        </h1>
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-mono font-bold ${
                            tenantData.status === 'Active'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-amber-600 dark:text-amber-400'
                        }`}>
                            <span className={`w-2 h-2 rounded-full ${tenantData.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                            <span>{tenantData.status === 'Active' ? `Unit ${tenantData.roomNumber || 'Assigned'}` : 'Application Pending'}</span>
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                        Overview of active rent dues, facility submeter utility breakdown, and community advisories.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fetchDashboardData(true)}
                        disabled={isRefreshing}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-800 bg-card hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-zinc-950 dark:text-white' : 'text-slate-500 dark:text-zinc-400'}`} />
                        <span>Sync</span>
                    </button>

                    <Link
                        href="/tenant/payments"
                        className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-zinc-900 hover:bg-zinc-850 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 transition-all flex items-center gap-1.5 shadow-xs"
                    >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Manage Billing</span>
                    </Link>
                </div>
            </div>

            {/* Notification Alert Banner: Payment Overdue or Due Soon */}
            {isOverdue && (
                <div className="bg-rose-50/90 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/40 flex items-center justify-center shrink-0 mt-0.5">
                            <AlertCircle className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-rose-700 dark:text-rose-300">Action Required &bull; Rental Payment Overdue</span>
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/40">
                                    {currentBill.month}
                                </span>
                            </div>
                            <p className="text-xs text-rose-600/90 dark:text-rose-400/90 mt-0.5">
                                Your balance of <strong className="font-mono font-bold">₱{Number(currentBill.remainingBalance).toLocaleString()}</strong> was due on {currentBill.dueDate}. Please settle your invoice immediately to prevent late penalties.
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/tenant/payments"
                        className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-all shrink-0 self-start sm:self-center shadow-xs flex items-center gap-1.5"
                    >
                        <span>Settle Overdue Bill</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            )}

            {!isOverdue && isDueSoon && (
                <div className="bg-amber-50/90 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-900/40 flex items-center justify-center shrink-0 mt-0.5">
                            <Clock className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-amber-700 dark:text-amber-300">Payment Reminder &bull; Invoice Due Soon</span>
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40">
                                    {currentBill.month}
                                </span>
                            </div>
                            <p className="text-xs text-amber-600/90 dark:text-amber-400/90 mt-0.5">
                                Your statement balance of <strong className="font-mono font-bold">₱{Number(currentBill.remainingBalance).toLocaleString()}</strong> is due on {currentBill.dueDate}. Settle early to keep your account clear.
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/tenant/payments"
                        className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-all shrink-0 self-start sm:self-center shadow-xs flex items-center gap-1.5"
                    >
                        <span>View & Pay Invoice</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            )}

            {/* 2. Resident Telemetry Ribbon (4 Cards) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                
                {/* Tile 1: Outstanding Balance */}
                <div 
                    onClick={() => router.push('/tenant/payments')}
                    className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-600 transition-all group"
                >
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Total Outstanding</span>
                        <div className={`text-xl font-black font-mono mt-0.5 leading-tight ${
                            tenantData.balanceDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                        }`}>
                            <AnimatedBalance value={tenantData.balanceDue} />
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1">
                            {tenantData.balanceDue > 0 ? (
                                <span className="text-amber-600 dark:text-amber-400 font-bold">Due in {daysUntilDue} days</span>
                            ) : (
                                <span className="text-slate-700 dark:text-zinc-300 font-bold">Account Settled</span>
                            )}
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Wallet className="w-5 h-5" />
                    </div>
                </div>

                {/* Tile 2: Total Paid This Year */}
                <div 
                    onClick={() => router.push('/tenant/payments')}
                    className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-600 transition-all group"
                >
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Paid YTD</span>
                        <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-0.5 leading-tight">
                            ₱{totalPaidThisYear.toLocaleString()}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 mt-0.5">
                            Verified on ledger
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                </div>

                {/* Tile 3: Assigned Suite / Bed Space */}
                <div 
                    onClick={() => router.push('/tenant/rooms')}
                    className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-600 transition-all group"
                >
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Assigned Suite</span>
                        <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-0.5 leading-tight">
                            {tenantData.status === 'Active' ? `Room ${tenantData.roomNumber}` : 'Pending'}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 mt-0.5">
                            {tenantData.status === 'Active' ? 'Active occupancy' : 'Awaiting room selection'}
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Building2 className="w-5 h-5" />
                    </div>
                </div>

                {/* Tile 4: Notice Board */}
                <div 
                    onClick={() => {
                        const el = document.getElementById('community-notice-board');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-600 transition-all group"
                >
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Notice Board</span>
                        <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-0.5 leading-tight">
                            {tenantData.announcements.length} Bulletin{tenantData.announcements.length !== 1 ? 's' : ''}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 mt-0.5 truncate max-w-[150px]">
                            {latestAnnouncement ? latestAnnouncement.title : 'No active alerts'}
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Bell className="w-5 h-5" />
                    </div>
                </div>

            </div>

            {/* Community Notice Board (Entire Announcement Displayed) */}
            {latestAnnouncement && (
                <div id="community-notice-board" className="bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 flex items-center justify-center shrink-0">
                                <Bell className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Notice Board</span>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700/60">
                                        {latestAnnouncement.type || 'Notice'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                        {new Date(latestAnnouncement.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <h2 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                                    {latestAnnouncement.title}
                                </h2>
                            </div>
                        </div>

                        <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 self-start sm:self-center">
                            {tenantData.announcements.length} Active Bulletin{tenantData.announcements.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {/* ENTIRE ANNOUNCEMENT TEXT */}
                    <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-zinc-900/40 border border-slate-100 dark:border-zinc-800/60 text-xs sm:text-sm text-slate-700 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap break-words">
                        {latestAnnouncement.content}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-500 font-semibold pt-1">
                        <span>Issued by: {latestAnnouncement.created_by_name || 'Property Management'}</span>
                        <span className="text-slate-600 dark:text-zinc-400 font-medium">Official Notice</span>
                    </div>
                </div>
            )}

            {/* 3. Main Workspace Split: Utility Consumption Chart & Recent Ledger */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                
                {/* Utility Consumption Breakdown Chart */}
                <div className="lg:col-span-2 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs flex flex-col justify-between h-[390px]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800">
                        <div>
                            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                <Zap className="w-4 h-4 text-slate-600 dark:text-zinc-400" />
                                <span>Submeter Utility Breakdown</span>
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                                Monthly Electricity (₱14.50/kWh) and Water (₱150 flat/resident) expenses.
                            </p>
                        </div>

                        {/* Year Selector Pill */}
                        <div className="flex items-center bg-slate-100 dark:bg-zinc-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-zinc-700/80 text-xs font-semibold shrink-0">
                            <button
                                onClick={() => setSelectedYear('This Year')}
                                className={`px-2.5 py-1 rounded-md transition-all ${
                                    selectedYear === 'This Year'
                                        ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white font-bold shadow-xs'
                                        : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
                                }`}
                            >
                                This Year
                            </button>
                            <button
                                onClick={() => setSelectedYear('Last Year')}
                                className={`px-2.5 py-1 rounded-md transition-all ${
                                    selectedYear === 'Last Year'
                                        ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white font-bold shadow-xs'
                                        : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
                                }`}
                            >
                                Last Year
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 my-3 relative min-h-0">
                        <div className="absolute inset-0">
                            <ChartContainer 
                                config={{
                                    water: { label: "Water Tariff", color: "#a1a1aa" },
                                    electricity: { label: "Electric Submeter", color: "#ffffff" }
                                }}
                                className="h-full w-full"
                            >
                                <BarChart data={utilityData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10 dark:opacity-20" />
                                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} className="text-[10px] font-bold text-slate-500 dark:text-zinc-400" />
                                    <YAxis width={45} tickFormatter={(val) => `₱${val}`} tickLine={false} axisLine={false} tickMargin={5} className="text-[10px] font-bold text-slate-500 dark:text-zinc-400" />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="electricity" fill="currentColor" className="text-zinc-900 dark:text-white" radius={[4, 4, 0, 0]} maxBarSize={32} />
                                    <Bar dataKey="water" fill="currentColor" className="text-zinc-400 dark:text-zinc-500" radius={[4, 4, 0, 0]} maxBarSize={32} />
                                </BarChart>
                            </ChartContainer>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800 text-xs">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-zinc-900 dark:bg-white"></span>
                                <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-400">Electricity Submeter</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-zinc-400 dark:bg-zinc-500"></span>
                                <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-400">Water Tariff</span>
                            </div>
                        </div>

                        <span className="text-[11px] font-mono font-semibold text-slate-400 dark:text-zinc-500 hidden sm:inline">
                            Avg. ₱{(utilityData.reduce((acc, d) => acc + d.water + d.electricity, 0) / utilityData.length).toFixed(0)}/mo
                        </span>
                    </div>
                </div>

                {/* Recent Transactions Ledger */}
                <div className="lg:col-span-1 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs flex flex-col justify-between h-[390px]">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-zinc-800">
                        <div>
                            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
                                <span>Recent Ledger</span>
                            </h2>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">Payment receipts & billings</p>
                        </div>
                        <Link href="/tenant/payments" className="text-xs font-bold text-zinc-900 dark:text-white hover:underline flex items-center gap-0.5">
                            <span>All History</span>
                            <ArrowUpRight className="w-3 h-3" />
                        </Link>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar my-2 space-y-2">
                        {tenantData.recentTransactions && tenantData.recentTransactions.length > 0 ? (
                            tenantData.recentTransactions.slice(0, 5).map((tx: any, i) => (
                                <div key={i} className="p-2.5 rounded-lg border border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/40 flex items-center justify-between">
                                    <div className="min-w-0 pr-2">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                tx.status === 'Paid' || tx.status === 'Approved' ? 'bg-zinc-900 dark:bg-white' :
                                                tx.status === 'Pending' ? 'bg-amber-500' : 'bg-rose-500'
                                            }`}></span>
                                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[140px]">{tx.description}</p>
                                        </div>
                                        <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono mt-0.5">{tx.date}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xs font-mono font-extrabold text-slate-900 dark:text-white">
                                            ₱{tx.amount.toLocaleString()}
                                        </p>
                                        <span className={`text-[9px] font-bold uppercase ${
                                            tx.status === 'Paid' || tx.status === 'Approved' ? 'text-zinc-900 dark:text-zinc-300' :
                                            tx.status === 'Pending' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-zinc-400'
                                        }`}>
                                            {tx.status}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400 dark:text-zinc-500">
                                <Clock className="w-8 h-8 opacity-40 mb-2" />
                                <p className="text-xs font-semibold">No recent transactions recorded</p>
                                <p className="text-[10px] text-slate-500 dark:text-zinc-500 mt-1">Invoices and payment receipts will display here</p>
                            </div>
                        )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex justify-between items-center text-[11px] text-slate-400 dark:text-zinc-500 font-mono">
                        <span>Total Records: {tenantData.recentTransactions.length}</span>
                        <Link href="/tenant/payments" className="text-zinc-900 dark:text-white font-bold hover:underline">
                            Submit Proof &rarr;
                        </Link>
                    </div>
                </div>

            </div>

        </div>
    );
}