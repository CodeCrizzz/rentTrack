"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { motion, Variants } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export default function TenantDashboard() {
    const [tenantData, setTenantData] = useState<{
        balanceDue: number;
        recentTransactions: any[];
        status: string;
        roomNumber: string | null;
        unreadCount: number;
    }>({
        balanceDue: 0,
        recentTransactions: [],
        status: 'Pending',
        roomNumber: null,
        unreadCount: 0
    });
    
    const [userName, setUserName] = useState('');
    const [displayBalance, setDisplayBalance] = useState(0);
    const [isMounted, setIsMounted] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const router = useRouter();

    useEffect(() => {
        setIsMounted(true);
        const timer = setTimeout(() => setIsVisible(true), 50);
        
        if (typeof window !== 'undefined') {
            const userStr = localStorage.getItem('user');
            if (userStr) setUserName(JSON.parse(userStr).name);
        }

        const fetchDashboardData = async () => {
            try {
                const [dashboardRes, unreadRes] = await Promise.all([
                    api.get('/tenant/dashboard'),
                    api.get('/tenant/chat/unread').catch(() => ({ data: { unreadCount: 0 } }))
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
                    unreadCount: unreadRes.data?.unreadCount || 0
                });
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            }
        };

        fetchDashboardData();
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (tenantData.balanceDue > 0) {
            let start = 0;
            const end = tenantData.balanceDue;
            const duration = 1000; 
            const increment = end / (duration / 16); 
            
            const timer = setInterval(() => {
                start += increment;
                if (start >= end) {
                    setDisplayBalance(end);
                    clearInterval(timer);
                } else {
                    setDisplayBalance(Math.floor(start));
                }
            }, 16);
            return () => clearInterval(timer);
        } else {
            setDisplayBalance(0);
        }
    }, [tenantData.balanceDue]);

    if (!isMounted) return null; 
    return (
        <div className="flex-1 flex flex-col w-full text-neutral-900 dark:text-neutral-100 font-sans bg-transparent">
            {/* Page Transition Overlay */}
            <motion.div initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.5, ease: "easeInOut" }} className="absolute inset-0 z-[9999] bg-slate-50 dark:bg-[#050505] pointer-events-none" />
                                                {/* Main Wrapper */}
            <div className="max-w-8xl mx-auto w-full h-full flex flex-col gap-1.5 sm:gap-6 pt-0 px-3 sm:px-8 pb-3 sm:pb-6 relative z-10">  
                {/* --- HEADER --- */}
                <header className={`sticky top-0 z-40 shrink-0 flex flex-row items-center justify-between h-14 bg-linear-to-b from-white/80 to-white/40 dark:from-[#050505]/80 dark:to-[#050505]/40 backdrop-blur-2xl -mx-3 px-4 sm:mx-0 sm:px-0 mb-1 sm:mb-0 transition-all duration-300 ease-out transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                    <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-neutral-900 via-indigo-800 to-neutral-900 dark:from-white dark:via-indigo-200 dark:to-white drop-shadow-sm leading-none">
                        Welcome, {userName.split(' ')[0] || 'Resident'}
                    </h1>
                </header>

                {/* --- BENTO GRID LAYOUT --- */}
                <div className={`shrink-0 grid grid-cols-12 gap-2.5 sm:gap-6 transition-all duration-300 ease-out delay-150 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    {/* HERO CARD: Billing & Balance */}
                    <div className="col-span-12 md:col-span-7 lg:col-span-8 relative rounded-2xl sm:rounded-[2rem] bg-white dark:bg-[#121212] backdrop-blur-2xl shadow-xl shadow-indigo-500/5 border border-neutral-200/50 dark:border-white/5 overflow-hidden flex flex-col justify-between p-4 sm:p-8 lg:p-10 min-h-0">
                                                <div className="absolute top-0 right-0 -mr-10 sm:-mr-20 -mt-10 sm:-mt-20 w-32 sm:w-72 h-32 sm:h-72 bg-indigo-50 dark:bg-indigo-500/5 rounded-full blur-xl sm:blur-3xl pointer-events-none z-0"></div>

                        <div className="relative z-10">
                            <h3 className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1.5 sm:mb-2">Total Outstanding</h3>
                            <div className="flex items-baseline gap-0.5 sm:gap-1">
                                <span className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tighter text-neutral-900 dark:text-white font-mono break-all leading-none">
                                    ₱{displayBalance.toLocaleString()}
                                </span>
                                <span className="text-lg sm:text-2xl lg:text-3xl font-medium text-neutral-400 dark:text-neutral-500">.00</span>
                            </div>
                        </div>

                        <div className="relative z-10 mt-4 sm:mt-12 flex flex-col sm:flex-row gap-3 sm:gap-6 items-start sm:items-center justify-between border-t border-neutral-200/50 dark:border-white/10 pt-3 sm:pt-8">
                            <p className="text-xs sm:text-sm font-medium text-neutral-500 dark:text-neutral-400 w-full sm:max-w-xs leading-tight sm:leading-relaxed">
                                Your next billing cycle generates on the 1st of the month.
                            </p>
                            
                            <button 
                                onClick={() => router.push('/tenant/payments')}
                                disabled={tenantData.balanceDue === 0}
                                className={`w-full sm:w-auto px-3 sm:px-8 py-2.5 sm:py-3.5 font-bold rounded-xl sm:rounded-2xl transition-all duration-300 flex items-center justify-center gap-1.5 backdrop-blur-md text-xs sm:text-base ${
                                    tenantData.balanceDue === 0 ? 'bg-white/50 dark:bg-[#181818]/50 text-neutral-400 cursor-not-allowed border border-neutral-200/50 dark:border-white/5' :
                                    'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 border border-indigo-500'
                                }`}
                            >
                                {tenantData.balanceDue === 0 ? 'Account Settled' : 'Make Payment'}
                            </button>
                        </div>
                    </div>

                    {/* SIDE CARDS */}
                    <div className="col-span-12 md:col-span-5 lg:col-span-4 flex flex-col gap-2.5 sm:gap-6">
                        {/* Status Card */}
                        <div className="relative bg-white dark:bg-[#121212] p-3 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-neutral-200/50 dark:border-white/5 backdrop-blur-2xl shadow-xl shadow-indigo-500/5 flex-1 flex flex-col justify-center overflow-hidden">
                                                        <div className="relative z-10 flex items-center justify-between mb-1.5 sm:mb-4">
                                <div className="p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                                    <svg className="w-3.5 h-3.5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                                </div>
                                <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">Unit Status</span>
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                                    <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full animate-pulse ${tenantData.status === 'Active' ? 'bg-emerald-500' : 'bg-orange-500'}`}></span>
                                    <p className="text-base sm:text-2xl font-bold leading-none">{tenantData.status || 'Pending'}</p>
                                </div>
                                <p className="text-xs sm:text-sm font-medium text-neutral-500 dark:text-neutral-400 leading-tight mt-1">
                                    {tenantData.roomNumber ? `Room ${tenantData.roomNumber}` : 'Awaiting assignment'}
                                </p>
                            </div>
                        </div>

                        {/* Messages Card */}
                        <div className="relative bg-white dark:bg-[#121212] p-3 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-neutral-200/50 dark:border-white/5 backdrop-blur-2xl shadow-xl shadow-indigo-500/5 flex-1 flex flex-col justify-center hover:bg-white/80 dark:hover:bg-[#181818]/80 hover:border-indigo-200 dark:hover:border-indigo-500/30 cursor-pointer group transition-all duration-300 overflow-hidden">
                                                        <div className="relative z-10 flex items-center justify-between mb-1.5 sm:mb-4">
                                <div className="p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                                    <svg className="w-3.5 h-3.5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                                </div>
                                <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">Messages</span>
                            </div>
                            <div className="relative z-10">
                                <p className="text-base sm:text-2xl font-bold mb-1 leading-none">{tenantData.unreadCount || 0} Unread</p>
                                <Link href="/tenant/chat" className="inline-flex items-center text-xs sm:text-sm font-bold text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                                    Open Inbox <svg className="w-3 h-3 sm:w-4 sm:h-4 ml-1 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- BOTTOM ROW --- */}
                <div className={`grid grid-cols-1 lg:grid-cols-2 gap-2.5 sm:gap-6 transition-all duration-300 ease-out delay-300 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    
                    {/* TRANSACTIONS SECTION */}
                    <div className="flex flex-col relative bg-white dark:bg-[#121212] rounded-2xl sm:rounded-[2rem] border border-neutral-200/50 dark:border-white/5 backdrop-blur-2xl shadow-xl shadow-indigo-500/5 overflow-hidden">
                        <div className="relative z-10 shrink-0 p-3.5 sm:p-6 lg:px-8 border-b border-neutral-200/50 dark:border-white/10 bg-neutral-50/50 dark:bg-[#18181a] backdrop-blur-2xl flex justify-between items-center">
                            <div>
                                <h2 className="text-base sm:text-lg font-bold leading-none">Recent Payments</h2>
                                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-1 sm:mt-1.5">Your latest transactions.</p>
                            </div>
                            <Link href="/tenant/payments" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors">
                                View Full History <span aria-hidden="true">&rarr;</span>
                            </Link>
                        </div>

                        <div className="relative z-10 p-2 sm:p-4">
                            {tenantData.recentTransactions && tenantData.recentTransactions.length > 0 ? (
                                <div className="space-y-1.5 pb-4">
                                    {tenantData.recentTransactions.slice(0, 3).map((tx: any, i) => (
                                        <div key={i} className="group relative flex items-center justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl hover:bg-white/40 dark:hover:bg-white/5 transition-all duration-300 cursor-default gap-2">
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 bg-indigo-500 rounded-r-full transition-all duration-300 group-hover:h-3/4 opacity-0 group-hover:opacity-100"></div>

                                            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm ${
                                                    tx.type === 'payment' ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 group-hover:border-emerald-500/40' : 
                                                    tx.type === 'charge' ? 'bg-red-50 dark:bg-red-500/10 border border-red-200/50 dark:border-red-500/20 text-red-600 dark:text-red-400 group-hover:border-red-500/40' : 
                                                    'bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200/50 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 group-hover:border-indigo-500/40'
                                                }`}>
                                                    {tx.type === 'payment' && <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>}
                                                    {tx.type === 'charge' && <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">{tx.description}</p>
                                                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-500 mt-0.5">{tx.date}</p>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className={`text-xs sm:text-base font-black tracking-tight font-mono ${tx.type === 'payment' ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-900 dark:text-neutral-100'}`}>
                                                    {tx.type === 'payment' ? '-' : ''}₱{tx.amount.toLocaleString()}
                                                </p>
                                                <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${
                                                    tx.status === 'Paid' ? 'text-emerald-500' : 
                                                    tx.status === 'Pending' ? 'text-orange-500' : 'text-indigo-500'
                                                }`}>{tx.status}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-10 h-full px-4 text-center">
                                    <div className="w-14 h-14 sm:w-20 sm:h-20 bg-white/50 dark:bg-white/5 rounded-2xl sm:rounded-4xl flex items-center justify-center text-neutral-400 dark:text-neutral-500 mx-auto mb-4 sm:mb-6 shadow-inner border border-neutral-200/50 dark:border-white/5 backdrop-blur-md">
                                        <svg className="w-7 h-7 sm:w-10 sm:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                    </div>
                                    <h3 className="text-sm sm:text-lg font-bold text-neutral-900 dark:text-white">No Transactions Yet</h3>
                                    <p className="text-xs sm:text-sm font-medium text-neutral-500 mt-1.5 sm:mt-2 max-w-xs mx-auto leading-relaxed">Payments and invoices will appear here once they are processed.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* CHART SECTION */}
                    <div className="flex flex-col relative bg-white dark:bg-[#121212] rounded-2xl sm:rounded-[2rem] border border-neutral-200/50 dark:border-white/5 backdrop-blur-2xl shadow-xl shadow-indigo-500/5 overflow-hidden">
                        <div className="relative z-10 shrink-0 p-3.5 sm:p-6 lg:px-8 border-b border-neutral-200/50 dark:border-white/10 bg-neutral-50/50 dark:bg-[#18181a] backdrop-blur-2xl flex justify-between items-center">
                            <div>
                                <h2 className="text-base sm:text-lg font-bold leading-none">Utility Expenses</h2>
                                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-1 sm:mt-1.5">Last 6 months breakdown.</p>
                            </div>
                        </div>
                        <div className="relative z-10 p-4 sm:p-6 lg:p-8 flex-1 min-h-[300px]">
                            <ChartContainer 
                                config={{
                                    water: { label: "Water", color: "var(--color-blue-500)" },
                                    electricity: { label: "Electricity", color: "var(--color-amber-500)" }
                                }}
                                className="h-full w-full"
                            >
                                <BarChart data={[
                                    { month: 'Jan', water: 450, electricity: 1200 },
                                    { month: 'Feb', water: 420, electricity: 1100 },
                                    { month: 'Mar', water: 480, electricity: 1350 },
                                    { month: 'Apr', water: 500, electricity: 1800 },
                                    { month: 'May', water: 550, electricity: 2100 },
                                    { month: 'Jun', water: 490, electricity: 1950 },
                                ]}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10 dark:opacity-20" />
                                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} className="text-xs font-bold text-neutral-500" />
                                    <YAxis tickFormatter={(val) => `₱${val}`} tickLine={false} axisLine={false} tickMargin={10} className="text-xs font-bold text-neutral-500" />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="electricity" fill="var(--color-amber-500)" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="water" fill="var(--color-blue-500)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ChartContainer>
                        </div>
                    </div>
                </div>


            </div>
        </div>
    );
}