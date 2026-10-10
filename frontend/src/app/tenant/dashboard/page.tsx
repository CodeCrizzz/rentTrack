"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

function AnimatedBalance({ value }: { value: number }) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        if (value > 0) {
            let start = 0;
            const end = value;
            const duration = 1000; 
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
    
    const [userName, setUserName] = useState('');
    const [isMounted, setIsMounted] = useState(false);
    const [selectedYear, setSelectedYear] = useState('This Year');
    const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
    const router = useRouter();

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

    useEffect(() => {
        setIsMounted(true);
        
        if (typeof window !== 'undefined') {
            const userStr = localStorage.getItem('user');
            if (userStr) setUserName(JSON.parse(userStr).name);
        }

        const fetchDashboardData = async () => {
            try {
                const [dashboardRes, unreadRes, announcementsRes] = await Promise.all([
                    api.get('/tenant/dashboard'),
                    api.get('/tenant/chat/unread').catch(() => ({ data: { unreadCount: 0 } })),
                    api.get('/tenant/announcements').catch(() => ({ data: [] }))
                ]);
                const { data } = dashboardRes;
                setTenantData({
                    balanceDue: parseFloat(data.balanceDue) || 0,
                    status: data.status || 'Pending',
                    roomNumber: data.roomNumber,
                    recentTransactions: data.recentTransactions.map((tx: any) => ({
                        id: tx.id,
                        type: tx.amount_paid ? 'payment' : 'charge',
                        description: tx.billing_month ? `${tx.billing_month} Bill` : 'Payment Received',
                        date: (tx.payment_date || tx.created_at) ? new Date(tx.payment_date || tx.created_at).toLocaleDateString() : 'N/A',
                        amount: parseFloat(tx.amount_paid || tx.total_amount),
                        status: tx.status
                    })),
                    unreadCount: unreadRes.data?.unreadCount || 0,
                    announcements: announcementsRes.data || []
                });
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            }
        };

        fetchDashboardData();
    }, []);

    if (!isMounted) return null; 

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

    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const daysUntilDue = Math.ceil((nextMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const totalPaid = tenantData.recentTransactions
        .filter((tx: any) => tx.type === 'payment' && tx.status === 'Paid')
        .reduce((sum: number, tx: any) => sum + tx.amount, 0);

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="w-full h-[calc(100vh-6.5rem)] md:h-[calc(100vh-7.5rem)] flex flex-col font-sans text-slate-900 dark:text-white">
            
            {/* Header & Unit Status */}
            <motion.div variants={itemVariants} className="mb-6 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        Welcome back, {userName.split(' ')[0] || 'Resident'}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Here is your account overview and recent activity.</p>
                </div>

                {/* Sleek Minimal Unit Status */}
                <div className="flex flex-col md:items-end justify-center py-1">
                    <p className="text-sm font-bold text-slate-600 dark:text-zinc-400 mb-1 flex items-center gap-2 uppercase tracking-widest">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                        Assigned Room
                    </p>
                    <div className="flex items-center gap-3">
                        <span className="text-3xl font-black text-slate-900 dark:text-white leading-none tracking-tight">
                            {tenantData.status === 'Active' ? tenantData.roomNumber : 'Pending'}
                        </span>
                        
                        <div className="flex items-center gap-3 h-full">
                            <div className="w-px h-6 bg-slate-300 dark:bg-zinc-700 rounded-full"></div>
                            <div className={`flex items-center gap-1 text-sm font-black tracking-widest uppercase ${
                                tenantData.status === 'Active' ? 'text-emerald-500' : 'text-amber-500'
                            }`}>
                                {tenantData.status === 'Active' && (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                )}
                                {tenantData.status || 'Pending'}
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>            
            {/* Summary Cards */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 shrink-0">
                {/* Balance Card */}
                <div 
                    className="bg-teal-50 dark:bg-teal-500/10 border border-teal-100 dark:border-teal-500/20 rounded-xl p-5 md:p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all h-full"
                >
                    <div className="absolute top-1/2 left-1/2 opacity-[0.07] transform -translate-x-1/2 -translate-y-1/2 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500 pointer-events-none">
                        <svg className="w-48 h-48 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <div className="z-10">
                        <div className="flex justify-between items-start mb-3">
                            <p className="text-sm font-medium text-teal-600 dark:text-teal-400">Total Outstanding</p>
                            <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            </div>
                        </div>
                        <h3 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white mb-2 leading-none">
                            <AnimatedBalance value={tenantData.balanceDue} />
                        </h3>
                        <p className="text-[10px] md:text-xs font-bold text-slate-600 dark:text-zinc-300">Next payment due in {daysUntilDue} days ({nextMonth.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})</p>
                    </div>
                    
                    <button 
                        onClick={(e) => { e.stopPropagation(); router.push('/tenant/payments'); }}
                        disabled={tenantData.balanceDue === 0}
                        className={`mt-4 w-full py-2 px-4 font-bold rounded-lg transition-colors text-xs md:text-sm flex items-center justify-center gap-2 z-10 relative ${
                            tenantData.balanceDue === 0 
                            ? 'bg-teal-100/50 dark:bg-teal-900/20 text-teal-500 dark:text-teal-600 cursor-not-allowed border border-teal-200 dark:border-teal-800/50' 
                            : 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm'
                        }`}
                    >
                        {tenantData.balanceDue === 0 ? 'Account Settled' : 'Make Payment'}
                    </button>
                </div>

                {/* Total Paid Card */}
                <div 
                    className="bg-teal-50 dark:bg-teal-500/10 border border-teal-100 dark:border-teal-500/20 rounded-xl p-5 md:p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group cursor-pointer hover:shadow-md transition-all h-full" 
                    onClick={() => router.push('/tenant/payments')}
                >
                    <div className="absolute top-1/2 left-1/2 opacity-[0.07] transform -translate-x-1/2 -translate-y-1/2 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500 pointer-events-none">
                        <svg className="w-48 h-48 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                    </div>
                    <div className="z-10">
                        <div className="flex justify-between items-start mb-3">
                            <p className="text-sm font-medium text-teal-600 dark:text-teal-400">Total Paid</p>
                            <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                            </div>
                        </div>
                        <div className="flex items-end gap-1 mb-2">
                            <h3 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white leading-none">
                                <span className="text-xl lg:text-2xl mr-1 text-teal-600/50 dark:text-teal-400/50">₱</span>
                                {totalPaid.toLocaleString()}
                            </h3>
                        </div>
                        <p className="text-[10px] md:text-xs font-bold text-slate-600 dark:text-zinc-300">
                            Sum of recent completed payments
                        </p>
                    </div>
                    <div className="text-xs font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1 mt-4 group-hover:translate-x-1 transition-transform z-10 relative">
                        View Receipts <span aria-hidden="true">&rarr;</span>
                    </div>
                </div>

                {/* Announcement Card */}
                <div 
                    className="bg-teal-50 dark:bg-teal-500/10 border border-teal-100 dark:border-teal-500/20 rounded-xl p-5 md:p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group cursor-pointer hover:shadow-md transition-all h-full" 
                    onClick={() => router.push('/tenant/announcements')}
                >
                    <div className="absolute top-1/2 left-1/2 opacity-[0.07] transform -translate-x-1/2 -translate-y-1/2 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500 pointer-events-none">
                        <svg className="w-48 h-48 text-teal-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                        </svg>
                    </div>
                    <div className="z-10">
                        <div className="flex justify-between items-start mb-3">
                            <p className="text-sm font-medium text-teal-600 dark:text-teal-400">Announcement</p>
                            <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
                                <svg className="w-4 h-4 text-teal-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                                </svg>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 mb-1">
                            {tenantData.announcements && tenantData.announcements.length > 0 && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-teal-600 text-white shadow-sm leading-none">New</span>
                            )}
                            <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white line-clamp-1">
                                {tenantData.announcements && tenantData.announcements.length > 0 ? tenantData.announcements[0].title : 'No Announcements'}
                            </h3>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-zinc-300 line-clamp-2 mt-1">
                            {tenantData.announcements && tenantData.announcements.length > 0 ? tenantData.announcements[0].content : 'You are all caught up on the latest news.'}
                        </p>
                    </div>
                    <div className="text-xs font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform mt-4 z-10 relative">
                        View Announcements <span aria-hidden="true">&rarr;</span>
                    </div>
                </div>
            </motion.div>

            {/* Bottom Section */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6 flex-1 min-h-0 overflow-hidden">
                
                {/* Utility Expenses Chart */}
                <div className="bg-card rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col min-h-0 lg:col-span-3 xl:col-span-3">
                    <div className="p-4 md:p-5 border-b border-slate-200 dark:border-zinc-800 bg-secondary/50 rounded-t-xl shrink-0 flex justify-between items-center">
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">Utility Expenses</h2>
                            <p className="text-[10px] md:text-xs font-medium text-slate-500 dark:text-zinc-400 mt-1">Yearly breakdown</p>
                        </div>
                        <div className="relative z-10">
                            <button 
                                onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                                className="flex items-center justify-between gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600 text-xs font-bold text-slate-700 dark:text-zinc-300 rounded-lg px-3 py-1.5 min-w-[120px] outline-none transition-all duration-200 shadow-sm"
                            >
                                <div className="flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                    {selectedYear}
                                </div>
                                <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isYearDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </button>
                            
                            <AnimatePresence>
                                {isYearDropdownOpen && (
                                    <>
                                        <div 
                                            className="fixed inset-0 z-40"
                                            onClick={() => setIsYearDropdownOpen(false)}
                                        />
                                        <motion.div 
                                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                            className="absolute right-0 top-full mt-1.5 w-[140px] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-slate-200 dark:border-zinc-700 rounded-xl shadow-xl overflow-hidden z-50 p-1.5"
                                        >
                                            {['This Year', 'Last Year'].map((year) => (
                                                <button
                                                    key={year}
                                                    onClick={() => {
                                                        setSelectedYear(year);
                                                        setIsYearDropdownOpen(false);
                                                    }}
                                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                                                        selectedYear === year 
                                                        ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400' 
                                                        : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white'
                                                    }`}
                                                >
                                                    {year}
                                                    {selectedYear === year && (
                                                        <motion.svg layoutId="checkIcon" className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></motion.svg>
                                                    )}
                                                </button>
                                            ))}
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                    <div className="p-4 md:p-5 flex-1 min-h-0 relative">
                        <div className="absolute inset-4 md:inset-5">
                            <ChartContainer 
                                config={{
                                    water: { label: "Water", color: "var(--color-blue-500)" },
                                    electricity: { label: "Electricity", color: "var(--color-amber-500)" }
                                }}
                                className="h-full w-full"
                            >
                                <BarChart data={utilityData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10 dark:opacity-20" />
                                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} className="text-[9px] md:text-[10px] font-bold text-slate-500" />
                                    <YAxis width={35} tickFormatter={(val) => `₱${val}`} tickLine={false} axisLine={false} tickMargin={5} className="text-[9px] md:text-[10px] font-bold text-slate-500" />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="electricity" fill="var(--color-amber-500)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                    <Bar dataKey="water" fill="var(--color-blue-500)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                </BarChart>
                            </ChartContainer>
                        </div>
                    </div>
                </div>
                
                {/* Recent Payments Table */}
                <div className="bg-card rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col min-h-0">
                    <div className="p-4 md:p-5 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-secondary/50 rounded-t-xl shrink-0">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">Recent Transactions</h2>
                        <Link href="/tenant/payments" className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline">
                            View All
                        </Link>
                    </div>
                    <div className="p-0 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                        {tenantData.recentTransactions && tenantData.recentTransactions.length > 0 ? (
                            <table className="w-full text-left border-collapse relative">
                                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50">
                                    {tenantData.recentTransactions.map((tx: any, i) => (
                                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                                            <td className="px-4 py-3 md:px-5 md:py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                                        tx.type === 'payment' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 
                                                        'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                                                    }`}>
                                                        {tx.type === 'payment' ? (
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                                        ) : (
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs md:text-sm font-bold text-slate-900 dark:text-white truncate max-w-[150px] sm:max-w-[200px]">{tx.description}</p>
                                                        <p className="text-[10px] md:text-xs font-medium text-slate-500 dark:text-zinc-400">{tx.date}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 md:px-5 md:py-4 text-right">
                                                <p className={`text-xs md:text-sm font-black ${tx.type === 'payment' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                                                    {tx.type === 'payment' ? '-' : ''}₱{tx.amount.toLocaleString()}
                                                </p>
                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase mt-1 ${
                                                    tx.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 
                                                    tx.status === 'Pending' ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' : 
                                                    'bg-slate-100 text-slate-700 dark:bg-zinc-500/10 dark:text-zinc-400'
                                                }`}>
                                                    {tx.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center h-full">
                                <div className="w-10 h-10 md:w-12 md:h-12 bg-secondary rounded-full flex items-center justify-center text-slate-400 mb-3 md:mb-4">
                                    <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                </div>
                                <h3 className="text-xs md:text-sm font-bold text-slate-900 dark:text-white">No Transactions Yet</h3>
                                <p className="text-[10px] md:text-xs font-medium text-slate-500 mt-1 max-w-[200px]">Payments and invoices will appear here once they are processed.</p>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}