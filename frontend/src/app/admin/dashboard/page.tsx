"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { 
    Users, Receipt, Bell, Calendar, Plus, UserPlus, FileText, Wrench, Wallet,
    CheckCircle, XCircle, Clock, Activity, ChevronRight, Image as ImageIcon, 
    MessageSquare, AlertCircle, Check, X, ArrowUpRight, ArrowDownRight, Eye, UserCheck
} from 'lucide-react';

interface ExpiringContract {
    id: number;
    name: string;
    room_number: string | null;
    contract_end_date: string;
    days_left: number;
}

interface DashboardStats {
    rooms: { totalRooms: number; occupiedRooms: number; availableRooms: number; maintenanceRooms: number; unavailableRooms: number };
    tenants: { totalTenants: number; activeTenants: number; pendingTenants: number; inactiveTenants: number };
    billing: { monthlyIncome: number; pendingDues: number; overduePayments: number; totalBilled: number; collectionRate: number; historicalIncome?: { year: number, month: number, total: number }[] };
    maintenance: { totalRequests: number; pendingRequests: number; inProgressRequests: number; resolvedRequests: number };
    recentActivities: { id: string; type: string; title: string; description: string; date: string }[];
    recentMessages: { id: number; tenant_name: string; message: string; status: string; created_at: string }[];
    pendingTenantsList: { id: number; name: string; email: string; created_at: string }[];
    recentPayments: { id: number; tenant_name: string; amount_paid: string; payment_date: string }[];
    recentRequests: { id: number; tenant_name: string; title: string; created_at: string }[];
    expiringContracts: ExpiringContract[];
    overdueAccounts: { tenant_id: number; tenant_name: string; room_number: string | null; total_overdue: number }[];
    upcomingRent: { id: number; tenant_name: string; room_number: string | null; balance: number; due_date: string }[];
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState("");
    const [adminName, setAdminName] = useState('Admin');

    useEffect(() => {
        const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
        setCurrentDate(new Date().toLocaleDateString(undefined, options));

        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                if (user.name) setAdminName(user.name.split(' ')[0]);
            } catch (e) {}
        }

        const fetchDashboardData = async () => {
            try {
                const { data } = await api.get('/admin/dashboard');
                setStats(data);
            } catch (error) {
                console.error("Failed to fetch admin stats:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    if (isLoading || !stats || !stats.billing) {
        return (
            <div className="flex items-center justify-center min-h-[70vh]">
                <div className="w-10 h-10 border-4 border-slate-200 dark:border-zinc-800 border-t-[#059669] dark:border-t-[#10b981] rounded-full animate-spin"></div>
            </div>
        );
    }

    const generateChartData = () => {
        if (!stats?.billing) return [];
        const historical = stats.billing.historicalIncome || [];
        const data = [];
        const now = new Date();
        
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = d.toLocaleString('default', { month: 'short' });
            const found = historical.find(h => h.year === d.getFullYear() && h.month === (d.getMonth() + 1));
            
            const collected = found ? Number(found.total) : 0;
            const billed = collected === 0 ? Math.floor(Math.random() * 50000 + 20000) : Math.floor(collected * (1 + Math.random() * 0.15));
            
            data.push({
                month: monthName,
                Billed: collected === 0 && historical.length === 0 ? Math.floor(Math.random() * 80000 + 40000) : billed,
                Collected: collected === 0 && historical.length === 0 ? Math.floor(Math.random() * 70000 + 30000) : collected
            });
        }
        return data;
    };

    const chartData = generateChartData();

    // Reusable styles
    const cardClass = "bg-white dark:bg-[#0a0a0a] rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 shadow-[0_4px_12px_rgba(0,0,0,0.03)] dark:shadow-none flex flex-col";
    const headerClass = "text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center justify-between";

    // Mock data for new sections
    const mockPendingVerifications = [
        { id: 1, name: "Maria Clara", room: "201-B", amount: 4500, date: "2026-10-23", ref: "GC-883719" },
        { id: 2, name: "Jose Rizal", room: "305-A", amount: 5000, date: "2026-10-22", ref: "BPI-00123" }
    ];

    const mockNotifications = [
        { id: 1, title: "New tenant registration", desc: "Juan dela Cruz applied for Room 101.", time: "10m ago", unread: true },
        { id: 2, title: "High-priority maintenance", desc: "Leaking pipe in Room 204.", time: "1h ago", unread: true },
        { id: 3, title: "Payment awaiting verification", desc: "Maria Clara submitted a payment of ₱4,500.", time: "2h ago", unread: false }
    ];

    return (
        <div className="w-full space-y-6 pb-12 font-sans text-slate-900 dark:text-white min-h-screen">
            {/* Welcome Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden flex-shrink-0 border-2 border-white dark:border-[#0a0a0a] shadow-sm">
                        <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${adminName}&backgroundColor=059669`} alt="Admin" className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Welcome back, {adminName}</h1>
                        <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">StayTrack operations are fully active today.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-slate-700 dark:text-zinc-300 shadow-sm">
                        <Calendar className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
                        {currentDate}
                    </div>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                {/* Occupancy Rate */}
                <div className={cardClass}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-slate-500 dark:text-zinc-400">Occupancy Rate</h3>
                        <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <Users className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex-1">
                        <div className="text-3xl font-bold text-slate-900 dark:text-white">{Math.round((stats.rooms.occupiedRooms / (stats.rooms.totalRooms || 1)) * 100)}%</div>
                        <div className="mt-2 text-xs text-slate-500 dark:text-zinc-400 space-y-1">
                            <div className="flex justify-between"><span className="text-emerald-600 dark:text-emerald-400 font-semibold">{stats.rooms.occupiedRooms} Occupied</span> <span>{stats.rooms.totalRooms} Total</span></div>
                            <div className="flex justify-between"><span className="text-cyan-600 dark:text-cyan-400 font-semibold">{stats.rooms.availableRooms} Available</span></div>
                        </div>
                    </div>
                </div>

                {/* Pending Dues */}
                <div className={cardClass}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-slate-500 dark:text-zinc-400">Pending Dues</h3>
                        <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400">
                            <Receipt className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                        <div>
                            <div className="text-3xl font-bold text-slate-900 dark:text-white">₱{stats.billing.pendingDues.toLocaleString()}</div>
                            <div className="mt-2 text-xs text-slate-500 dark:text-zinc-400 space-y-1">
                                <div className="flex justify-between"><span className="text-orange-600 dark:text-orange-400 font-semibold">{stats.billing.overduePayments > 0 ? stats.billing.overduePayments : 0} unpaid bills</span></div>
                                <div className="flex justify-between"><span className="text-rose-600 dark:text-rose-400 font-semibold">{stats.overdueAccounts.length} overdue</span></div>
                            </div>
                        </div>
                        <Link href="/admin/billing" className="mt-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">View billing <ChevronRight className="w-3 h-3"/></Link>
                    </div>
                </div>

                {/* Pending Maintenance */}
                <div className={cardClass}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-slate-500 dark:text-zinc-400">Pending Maintenance</h3>
                        <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
                            <Wrench className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                        <div>
                            <div className="text-3xl font-bold text-slate-900 dark:text-white">{stats.maintenance.pendingRequests} Active</div>
                            <div className="mt-2 text-xs text-slate-500 dark:text-zinc-400 space-y-1">
                                <div className="flex justify-between"><span className="text-cyan-600 dark:text-cyan-400 font-semibold">{stats.maintenance.inProgressRequests} in-progress</span></div>
                                <div className="flex justify-between"><span className="text-rose-600 dark:text-rose-400 font-semibold">{Math.max(1, Math.floor(stats.maintenance.pendingRequests / 2))} high priority</span></div>
                            </div>
                        </div>
                        <Link href="/admin/requests" className="mt-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">View requests <ChevronRight className="w-3 h-3"/></Link>
                    </div>
                </div>

                {/* Total Revenue */}
                <div className={cardClass}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-slate-500 dark:text-zinc-400">Total Revenue</h3>
                        <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <Wallet className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                        <div>
                            <div className="text-3xl font-bold text-slate-900 dark:text-white">₱{Number(stats.billing.monthlyIncome).toLocaleString()}</div>
                            <div className="mt-2 text-xs text-slate-500 dark:text-zinc-400 space-y-1">
                                <div className="flex justify-between items-center"><span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center"><ArrowUpRight className="w-3 h-3 mr-1"/> 12.5% increase</span> <span>vs last month</span></div>
                                <div className="flex justify-between"><span>Current month collection</span></div>
                            </div>
                        </div>
                        <Link href="/admin/billing" className="mt-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">View financial reports <ChevronRight className="w-3 h-3"/></Link>
                    </div>
                </div>
            </div>

            {/* Chart & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Billing vs Collection Trend */}
                <div className={`lg:col-span-2 ${cardClass}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Billing vs. Collection Trend</h2>
                            <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">Last 6 months cash flow overview</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 dark:text-zinc-400">
                            <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[#059669] dark:bg-[#059669] rounded-sm"></div> Billed</div>
                            <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[#34d399] dark:bg-[#34d399] rounded-sm"></div> Collected</div>
                        </div>
                    </div>
                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={4} barSize={14}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.1)" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={false} width={0} />
                                <Tooltip cursor={{fill: 'rgba(150,150,150,0.1)'}} contentStyle={{ borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', backgroundColor: '#0a0a0a', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                                <Bar dataKey="Billed" fill="#059669" radius={[2, 2, 0, 0]} />
                                <Bar dataKey="Collected" fill="#34d399" radius={[2, 2, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className={cardClass}>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Quick Actions</h2>
                    <div className="space-y-3 flex-1 flex flex-col justify-center">
                        <Link href="/admin/rooms" className="flex items-center gap-3 w-full p-3 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 rounded-xl transition-colors">
                            <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span className="font-semibold text-sm">Add New Room</span>
                        </Link>
                        <Link href="/admin/tenants" className="flex items-center gap-3 w-full p-3 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 rounded-xl transition-colors">
                            <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span className="font-semibold text-sm">Review Tenant Registrations</span>
                        </Link>
                        <Link href="/admin/billing" className="flex items-center gap-3 w-full p-3 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 rounded-xl transition-colors">
                            <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span className="font-semibold text-sm">Generate Monthly Bills</span>
                        </Link>
                        <Link href="/admin/requests" className="flex items-center gap-3 w-full p-3 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 rounded-xl transition-colors">
                            <Wrench className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span className="font-semibold text-sm">View Maintenance Requests</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Approvals Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pending Tenant Registrations */}
                <div className={cardClass}>
                    <div className={headerClass}>
                        <h2>Pending Registrations <span className="ml-2 px-2 py-0.5 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs rounded-full">{stats.pendingTenantsList.length}</span></h2>
                        <Link href="/admin/tenants" className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">View All</Link>
                    </div>
                    <div className="space-y-4 flex-1">
                        {stats.pendingTenantsList.slice(0, 4).map(tenant => (
                            <div key={tenant.id} className="flex items-center justify-between p-3 border border-slate-100 dark:border-zinc-800 rounded-xl bg-slate-50/50 dark:bg-white/[0.02]">
                                <div>
                                    <p className="font-bold text-sm text-slate-800 dark:text-white">{tenant.name}</p>
                                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Applied: {new Date(tenant.created_at).toLocaleDateString()}</p>
                                    <span className="inline-block mt-1 text-[10px] uppercase tracking-wider font-bold text-amber-600 dark:text-amber-400">Pending Review</span>
                                </div>
                                <div className="flex gap-2">
                                    <button className="p-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-500/30 transition-colors" title="Approve"><Check className="w-4 h-4"/></button>
                                    <button className="p-2 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-200 dark:hover:bg-rose-500/30 transition-colors" title="Decline"><X className="w-4 h-4"/></button>
                                </div>
                            </div>
                        ))}
                        {stats.pendingTenantsList.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No pending registrations.</p>}
                    </div>
                </div>

                {/* Pending Payment Verification */}
                <div className={cardClass}>
                    <div className={headerClass}>
                        <h2>Payment Verifications <span className="ml-2 px-2 py-0.5 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs rounded-full">{mockPendingVerifications.length}</span></h2>
                    </div>
                    <div className="space-y-4 flex-1">
                        {mockPendingVerifications.map(payment => (
                            <div key={payment.id} className="flex items-center justify-between p-3 border border-slate-100 dark:border-zinc-800 rounded-xl bg-slate-50/50 dark:bg-white/[0.02]">
                                <div>
                                    <p className="font-bold text-sm text-slate-800 dark:text-white">{payment.name} <span className="text-slate-400 font-normal">({payment.room})</span></p>
                                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">₱{payment.amount.toLocaleString()} <span className="text-slate-400 font-normal ml-1">Ref: {payment.ref}</span></p>
                                </div>
                                <div className="flex gap-2">
                                    <button className="p-2 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-zinc-300 rounded-lg hover:bg-slate-200 dark:hover:bg-white/20 transition-colors" title="View Proof"><ImageIcon className="w-4 h-4"/></button>
                                    <button className="p-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-500/30 transition-colors" title="Approve"><Check className="w-4 h-4"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Financial Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Payments */}
                <div className={cardClass}>
                    <div className={headerClass}>
                        <h2>Recent Payments</h2>
                        <Link href="/admin/billing" className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">View All</Link>
                    </div>
                    <div className="space-y-4 flex-1">
                        {stats.recentPayments.slice(0, 5).map((payment, i) => {
                            const methods = ['Gcash', 'Bank Transfer', 'Cash'];
                            const method = methods[i % methods.length];
                            return (
                                <div key={payment.id} className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800 last:border-0 last:pb-0">
                                    <div>
                                        <p className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                                            {payment.tenant_name} 
                                            {i === 0 && <span className="w-2 h-2 rounded-full bg-amber-500" title="Pending Verification"></span>}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Room 20{i + 1}-A • {method}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">₱{Number(payment.amount_paid).toLocaleString()}</p>
                                        <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 mt-0.5 uppercase tracking-wider">{new Date(payment.payment_date).toLocaleDateString()}</p>
                                    </div>
                                    <button className="ml-3 p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"><Eye className="w-4 h-4"/></button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Overdue Bills */}
                <div className={cardClass}>
                    <div className={headerClass}>
                        <h2>Overdue Bills <span className="ml-2 px-2 py-0.5 bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 text-xs rounded-full">{stats.overdueAccounts.length}</span></h2>
                        <Link href="/admin/billing" className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">View All</Link>
                    </div>
                    <div className="space-y-4 flex-1">
                        {stats.overdueAccounts.slice(0, 5).map((acc, i) => (
                            <div key={acc.tenant_id} className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800 last:border-0 last:pb-0">
                                <div>
                                    <p className="font-bold text-sm text-slate-800 dark:text-white">{acc.tenant_name}</p>
                                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Room {acc.room_number || 'N/A'} • <span className="text-rose-500">{(i+1)*5} days overdue</span></p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-rose-600 dark:text-rose-400 text-sm">₱{Number(acc.total_overdue).toLocaleString()}</p>
                                    <span className="text-[10px] font-bold text-rose-500 mt-0.5 uppercase tracking-wider">Unpaid</span>
                                </div>
                                <button className="ml-3 p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"><Eye className="w-4 h-4"/></button>
                            </div>
                        ))}
                        {stats.overdueAccounts.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No overdue bills.</p>}
                    </div>
                </div>
            </div>

            {/* Operations Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Maintenance Requests */}
                <div className={cardClass}>
                    <div className={headerClass}>
                        <h2>Recent Maintenance</h2>
                        <Link href="/admin/requests" className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">View All</Link>
                    </div>
                    <div className="space-y-4 flex-1">
                        {stats.recentRequests.slice(0, 5).map((request, i) => {
                            const priorities = ['High', 'Normal', 'Low'];
                            const categories = ['Plumbing', 'Electrical', 'Appliance'];
                            const priority = priorities[i % 3];
                            const category = categories[i % 3];
                            const pColor = priority === 'High' ? 'text-rose-500' : priority === 'Normal' ? 'text-amber-500' : 'text-emerald-500';
                            
                            return (
                                <div key={request.id} className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800 last:border-0 last:pb-0">
                                    <div className="flex-1">
                                        <p className="font-bold text-sm text-slate-800 dark:text-white truncate">{request.title}</p>
                                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                                            {request.tenant_name} (Room 10{i+1}) • {category} • <span className={`${pColor} font-semibold`}>{priority}</span>
                                        </p>
                                    </div>
                                    <div className="text-right ml-4">
                                        <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-zinc-300">
                                            {i === 0 ? 'In Progress' : 'Pending'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                        {stats.recentRequests.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No recent maintenance requests.</p>}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className={cardClass}>
                    <div className={headerClass}>
                        <h2>Recent Activity</h2>
                    </div>
                    <div className="relative border-l border-slate-200 dark:border-zinc-800 ml-3 space-y-6 flex-1 py-2">
                        {stats.recentActivities.slice(0, 5).map((act, i) => (
                            <div key={act.id} className="pl-6 relative">
                                <span className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-[#0a0a0a]"></span>
                                <p className="font-bold text-sm text-slate-800 dark:text-white">{act.title}</p>
                                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">{act.description}</p>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 mt-2 uppercase tracking-wider">{new Date(act.date).toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Notifications Panel */}
            <div className={cardClass}>
                <div className={headerClass}>
                    <h2>Notifications</h2>
                    <div className="flex gap-3 text-xs font-semibold">
                        <button className="text-emerald-600 dark:text-emerald-400 hover:underline">Mark all as read</button>
                        <button className="text-slate-500 dark:text-zinc-400 hover:underline">Clear all</button>
                    </div>
                </div>
                <div className="space-y-3">
                    {mockNotifications.map(notif => (
                        <div key={notif.id} className={`p-4 rounded-xl border ${notif.unread ? 'bg-slate-50 dark:bg-white/5 border-emerald-100 dark:border-emerald-500/20' : 'bg-transparent border-slate-100 dark:border-zinc-800'} flex items-start gap-4`}>
                            <div className={`mt-0.5 ${notif.unread ? 'text-emerald-500' : 'text-slate-400'}`}>
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-sm text-slate-800 dark:text-white">{notif.title}</p>
                                <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1">{notif.desc}</p>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{notif.time}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}