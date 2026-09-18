"use client";
import { useEffect, useState } from 'react';
import { motion, Variants } from 'framer-motion';
import Link from 'next/link';
import api from '@/lib/api';
import CustomSelect from '@/components/CustomSelect';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, ComposedChart, Line, Legend, PieChart, Pie, Cell, Area } from "recharts";
import { 
    Users, Receipt, Calendar, Plus, FileText, Wrench, Wallet,
    ChevronRight, Check, X, ArrowUpRight, Eye, UserCheck
} from 'lucide-react';

interface ExpiringContract {
    id: number;
    name: string;
    room_number: string | null;
    contract_end_date: string;
    days_left: number;
}

interface DashboardStats {
    rooms: { totalRooms: number; occupiedRooms: number; availableRooms: number; partiallyOccupiedRooms: number; maintenanceRooms: number; unavailableRooms: number };
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

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#0a0a0a]/95 backdrop-blur-md border border-white/5 shadow-2xl rounded-2xl p-4 text-[13px] font-semibold text-white min-w-40">
                <p className="mb-3 text-slate-400">{label}</p>
                {payload.map((entry: any, index: number) => {
                    let color = entry.color;
                    if (entry.name === 'Collected') color = '#10b981';
                    if (entry.name === 'Outstanding') color = '#f43f5e';
                    if (entry.name === 'Billed') color = '#3b82f6';
                    
                    return (
                        <div key={`item-${index}`} className="flex justify-between items-center gap-6 py-1">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></span>
                                <span style={{ color }}>{entry.name}</span>
                            </div>
                            <span className="font-bold text-white">₱ {Number(entry.value).toLocaleString()}</span>
                        </div>
                    );
                })}
            </div>
        );
    }
    return null;
};

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: (customDelay: number = 0) => ({
        opacity: 1,
        transition: { staggerChildren: 0.1, delayChildren: customDelay }
    })
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

const slideLeftVariants: Variants = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

const scaleUpVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    show: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut" } }
};

export default function AdminDashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [cashflowData, setCashflowData] = useState<any[]>([]);
    const [dateRange, setDateRange] = useState("last_6_months");
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

    useEffect(() => {
        const fetchCashFlow = async () => {
            try {
                const { data } = await api.get(`/admin/cashflow?range=${dateRange}`);
                setCashflowData(data);
            } catch (error) {
                console.error("Failed to fetch cash flow data:", error);
            }
        };
        fetchCashFlow();
    }, [dateRange]);

    if (isLoading || !stats || !stats.billing) {
        return (
            <div className="flex items-center justify-center min-h-[70vh]">
                <div className="w-10 h-10 border-4 border-slate-200 dark:border-zinc-800 border-t-[#059669] dark:border-t-[#10b981] rounded-full animate-spin"></div>
            </div>
        );
    }



    const cardClass = "bg-card rounded-2xl border border-slate-100 dark:border-zinc-800 p-7 shadow-[0_4px_12px_rgba(0,0,0,0.03)] dark:shadow-none flex flex-col min-h-[220px]";
    const statCardClass = "bg-card rounded-2xl border border-slate-100 dark:border-zinc-800 p-7 shadow-[0_4px_12px_rgba(0,0,0,0.03)] dark:shadow-none flex flex-col min-h-[220px] relative overflow-hidden";
    const listCardClass = `bg-card rounded-2xl border border-slate-100 dark:border-zinc-800 p-7 shadow-[0_4px_12px_rgba(0,0,0,0.03)] dark:shadow-none flex flex-col h-[450px]`;
    const headerClass = "text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center justify-between";


    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="w-full space-y-6 pb-1 font-sans text-slate-900 dark:text-white min-h-screen">
            {/* Welcome Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden shrink-0 border-2 border-white dark:border-[#0a0a0a] shadow-sm">
                        <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${adminName}&backgroundColor=059669`} alt="Admin" className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Welcome back, {adminName}</h1>
                        <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">RentTrack operations are fully active today.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-slate-700 dark:text-zinc-300 shadow-sm">
                        <Calendar className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
                        {currentDate}
                    </div>
                </div>
            </div>



            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                {/* Room Occupancy */}
                <div className={statCardClass}>
                    {/* Decorative Background Shapes */}
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-emerald-500/10 dark:bg-emerald-500/10 rounded-full pointer-events-none"></div>
                    
                    <motion.div custom={0.0} variants={containerVariants} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="relative z-10 h-full w-full flex flex-col">
                    <motion.div variants={slideLeftVariants} className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-slate-500 dark:text-zinc-400">Room Occupancy Rate</h3>
                        <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <Users className="w-4 h-4" />
                        </div>
                    </motion.div>
                    <motion.div variants={scaleUpVariants} className="flex-1 flex gap-4 items-center mt-2">
                        <div className="relative w-28 h-28 shrink-0">
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-sm font-bold text-slate-900 dark:text-white">
                                    {Math.round((stats.rooms.occupiedRooms / (stats.rooms.totalRooms || 1)) * 100)}%
                               </span>
                            </div>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'Occupied', value: stats.rooms.occupiedRooms, color: '#10b981' },
                                            { name: 'Available', value: stats.rooms.availableRooms, color: '#0ea5e9' },
                                            { name: 'Partial', value: stats.rooms.partiallyOccupiedRooms, color: '#f59e0b' },
                                            { name: 'Maintenance', value: stats.rooms.maintenanceRooms, color: '#f43f5e' },
                                            { name: 'Unavailable', value: stats.rooms.unavailableRooms, color: '#64748b' }
                                        ].filter(item => item.value > 0)}
                                        innerRadius={36}
                                        outerRadius={55}
                                        paddingAngle={2}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {
                                            [
                                                { name: 'Occupied', value: stats.rooms.occupiedRooms, color: '#10b981' },
                                                { name: 'Available', value: stats.rooms.availableRooms, color: '#0ea5e9' },
                                                { name: 'Partial', value: stats.rooms.partiallyOccupiedRooms, color: '#f59e0b' },
                                                { name: 'Maintenance', value: stats.rooms.maintenanceRooms, color: '#f43f5e' },
                                                { name: 'Unavailable', value: stats.rooms.unavailableRooms, color: '#64748b' }
                                            ].filter(item => item.value > 0).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))
                                        }
                                    </Pie>
                                    <Tooltip 
                                        formatter={(value: any, name: any) => [`${value} Room${value !== 1 ? 's' : ''} (${Math.round((value / (stats.rooms.totalRooms || 1)) * 100)}%)`, name === 'Partial' ? 'Partially Occupied' : name]}
                                        contentStyle={{ borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#0a0a0a', color: '#fff', fontSize: '11px', padding: '4px 8px' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex-1 space-y-1 text-xs text-slate-500 dark:text-zinc-400">
                            <div className="flex justify-between items-center"><span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>Occupied</span> <span className="font-bold text-slate-700 dark:text-zinc-300">{stats.rooms.occupiedRooms}</span></div>
                            <div className="flex justify-between items-center"><span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0"></span>Available</span> <span className="font-bold text-slate-700 dark:text-zinc-300">{stats.rooms.availableRooms}</span></div>
                            <div className="flex justify-between items-center"><span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>Partial</span> <span className="font-bold text-slate-700 dark:text-zinc-300">{stats.rooms.partiallyOccupiedRooms}</span></div>
                            <div className="flex justify-between items-center"><span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>Maint.</span> <span className="font-bold text-slate-700 dark:text-zinc-300">{stats.rooms.maintenanceRooms}</span></div>
                            <div className="flex justify-between items-center"><span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0"></span>Unavail.</span> <span className="font-bold text-slate-700 dark:text-zinc-300">{stats.rooms.unavailableRooms}</span></div>
                            <div className="flex justify-between items-center pt-1 mt-1 border-t border-slate-100 dark:border-zinc-800"><span>Total</span> <span className="font-bold text-slate-700 dark:text-zinc-300">{stats.rooms.totalRooms}</span></div>
                        </div>
                    </motion.div>
                </motion.div>
                </div>

                {/* Pending Dues */}
                <div className={statCardClass}>
                    {/* Decorative Background Shapes */}
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-orange-500/10 dark:bg-orange-500/10 rounded-full pointer-events-none"></div>
                    
                    <motion.div custom={0.5} variants={containerVariants} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="relative z-10 h-full w-full flex flex-col">
                    <motion.div variants={slideLeftVariants} className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-slate-500 dark:text-zinc-400">Pending Dues</h3>
                        <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400">
                            <Receipt className="w-4 h-4" />
                        </div>
                    </motion.div>
                    <div className="flex-1 flex flex-col justify-between">
                        <motion.div variants={scaleUpVariants}>
                            <div className="text-3xl font-bold text-slate-900 dark:text-white">₱{stats.billing.pendingDues.toLocaleString()}</div>
                            <div className="mt-2 text-xs text-slate-500 dark:text-zinc-400 space-y-1">
                                <div className="flex justify-between"><span className="text-orange-600 dark:text-orange-400 font-semibold">{stats.billing.overduePayments > 0 ? stats.billing.overduePayments : 0} unpaid bills</span></div>
                                <div className="flex justify-between"><span className="text-rose-600 dark:text-rose-400 font-semibold">{stats.overdueAccounts.length} overdue</span></div>
                            </div>
                        </motion.div>
                        <motion.div variants={itemVariants}>
                            <Link href="/admin/billing" className="mt-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">View billing <ChevronRight className="w-3 h-3"/></Link>
                        </motion.div>
                    </div>
                </motion.div>
                </div>

                {/* Pending Maintenance */}
                <div className={statCardClass}>
                    {/* Decorative Background Shapes */}
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-rose-500/10 dark:bg-rose-500/10 rounded-full pointer-events-none"></div>
                    
                    <motion.div custom={1.0} variants={containerVariants} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="relative z-10 h-full w-full flex flex-col">
                    <motion.div variants={slideLeftVariants} className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-slate-500 dark:text-zinc-400">Pending Maintenance</h3>
                        <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
                            <Wrench className="w-4 h-4" />
                        </div>
                    </motion.div>
                    <div className="flex-1 flex flex-col justify-between">
                        <motion.div variants={scaleUpVariants}>
                            <div className="text-3xl font-bold text-slate-900 dark:text-white">{stats.maintenance.pendingRequests} Active</div>
                            <div className="mt-2 text-xs text-slate-500 dark:text-zinc-400 space-y-1">
                                <div className="flex justify-between"><span className="text-cyan-600 dark:text-cyan-400 font-semibold">{stats.maintenance.inProgressRequests} in-progress</span></div>
                                <div className="flex justify-between"><span className="text-rose-600 dark:text-rose-400 font-semibold">{Math.max(1, Math.floor(stats.maintenance.pendingRequests / 2))} high priority</span></div>
                            </div>
                        </motion.div>
                        <motion.div variants={itemVariants}>
                            <Link href="/admin/requests" className="mt-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">View requests <ChevronRight className="w-3 h-3"/></Link>
                        </motion.div>
                    </div>
                </motion.div>
                </div>

                {/* Total Revenue */}
                <div className={statCardClass}>
                    {/* Decorative Background Shapes */}
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-emerald-500/10 dark:bg-emerald-500/10 rounded-full pointer-events-none"></div>
                    
                    <motion.div custom={1.5} variants={containerVariants} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="relative z-10 h-full w-full flex flex-col">
                    <motion.div variants={slideLeftVariants} className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-slate-500 dark:text-zinc-400">Total Revenue</h3>
                        <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <Wallet className="w-4 h-4" />
                        </div>
                    </motion.div>
                    <div className="flex-1 flex flex-col justify-between">
                        <motion.div variants={scaleUpVariants}>
                            <div className="text-3xl font-bold text-slate-900 dark:text-white">₱{Number(stats.billing.monthlyIncome).toLocaleString()}</div>
                            <div className="mt-2 text-xs text-slate-500 dark:text-zinc-400 space-y-1">
                                <div className="flex items-center gap-1.5"><span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center"><ArrowUpRight className="w-3 h-3 mr-1"/> 12.5% increase</span> <span>vs last month</span></div>
                                <div className="flex justify-between"><span>Current month collection</span></div>
                            </div>
                        </motion.div>
                        <motion.div variants={itemVariants}>
                            <Link href="/admin/billing" className="mt-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">View financial reports <ChevronRight className="w-3 h-3"/></Link>
                        </motion.div>
                    </div>
                </motion.div>
                </div>
            </div>

            {/* Chart & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Cash Flow Overview */}
                <div className={`lg:col-span-3 ${cardClass}`}>
                    <motion.div variants={itemVariants} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="h-full w-full flex flex-col">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Cash Flow Overview</h2>
                                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">Bills, collections, and unpaid balances</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <CustomSelect 
                                    value={dateRange} 
                                    onChange={(val) => setDateRange(val)}
                                    options={[
                                        { value: "last_6_months", label: "Last 6 Months" },
                                        { value: "last_12_months", label: "Last 12 Months" },
                                        { value: "this_year", label: "This Year" },
                                        { value: "last_year", label: "Last Year" }
                                    ]}
                                    className="w-40 bg-secondary border border-slate-200 dark:border-zinc-800 text-sm font-semibold text-slate-700 dark:text-zinc-300 rounded-xl pl-4 pr-10 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20"
                                />
                            </div>
                        </div>
                        <div className="flex-1 min-h-[380px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={cashflowData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }} barGap={8} barSize={16}>
                                    <defs>
                                        <linearGradient id="colorBilled" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#34d399"/>
                                            <stop offset="100%" stopColor="#059669"/>
                                        </linearGradient>
                                        <linearGradient id="colorOutstanding" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#fb7185"/>
                                            <stop offset="100%" stopColor="#e11d48"/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(150,150,150,0.15)" />
                                    <XAxis dataKey="month" scale="point" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 13, fontWeight: 600 }} dy={12} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 13, fontWeight: 600 }} tickFormatter={(value) => value === 0 ? '0' : `₱ ${value >= 1000 ? (value / 1000) + 'k' : value}`} width={60} ticks={[0, 5000, 10000, 15000, 20000, 25000, 30000, 35000, 40000, 45000, 50000]} domain={[0, 50000]} />
                                    <Tooltip 
                                        cursor={{fill: 'rgba(150,150,150,0.05)'}} 
                                        content={<CustomTooltip />} 
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '13px', fontWeight: 600 }} iconType="circle" />
                                    <Area type="monotone" dataKey="billed" name="Billed" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorBilled)" activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} />
                                    <Bar dataKey="collected" name="Collected" fill="url(#colorCollected)" radius={[8, 8, 0, 0]} />
                                    <Bar dataKey="outstanding" name="Outstanding" fill="url(#colorOutstanding)" radius={[8, 8, 0, 0]} />
                                </ComposedChart> 
                            </ResponsiveContainer>
                        </div>
                    </motion.div>
                </div>

                {/* Recent Activity */}
                <div className={`lg:col-span-1 ${cardClass}`}>
                    <motion.div variants={itemVariants} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="h-full w-full flex flex-col">
                        <div className={headerClass}>
                            <h2>Recent Activity</h2>
                        </div>
                        <div className="flex-1 overflow-y-auto max-h-[380px] pr-2 -mr-2 custom-scrollbar">
                            <div className="relative border-l border-slate-200 dark:border-zinc-800 ml-3 space-y-6 py-2">
                                {stats.recentActivities.map((act) => (
                                    <div key={act.id} className="pl-6 relative">
                                        <span className="absolute -left-[6.5px] top-1 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-[#0a0a0a]"></span>
                                        <p className="font-bold text-sm text-slate-800 dark:text-white">{act.title}</p>
                                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">{act.description}</p>
                                        <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 mt-2 uppercase tracking-wider">{new Date(act.date).toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Approvals Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pending Tenant Registrations */}
                <div className={listCardClass}>
                    <motion.div variants={itemVariants} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="h-full w-full flex flex-col">
                    <div className={headerClass}>
                        <h2>Pending Registrations <span className="ml-2 px-2 py-0.5 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs rounded-full">{stats.pendingTenantsList.length}</span></h2>
                        <Link href="/admin/tenants" className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">View All</Link>
                    </div>
                    <div className="space-y-4 flex-1 overflow-y-auto pr-2 -mr-2 custom-scrollbar">
                        {stats.pendingTenantsList.slice(0, 5).map(tenant => (
                            <div key={tenant.id} className="flex items-center justify-between p-3 border border-slate-100 dark:border-zinc-800 rounded-xl bg-slate-50/50 dark:bg-white/5">
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
                </motion.div>
                </div>
                {/* Pending Payment Verification */}
                <div className={listCardClass}>
                    <motion.div variants={itemVariants} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="h-full w-full flex flex-col">
                    <div className={headerClass}>
                        <h2>Payment Verifications <span className="ml-2 px-2 py-0.5 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs rounded-full">0</span></h2>
                    </div>
                    <div className="space-y-4 flex-1 overflow-y-auto pr-2 -mr-2 custom-scrollbar">
                        <p className="text-sm text-slate-500 text-center py-4">No pending payment verifications.</p>
                    </div>
                </motion.div>
                </div>

            </div>

            {/* Financial Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Payments */}
                <div className={listCardClass}>
                    <motion.div variants={itemVariants} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="h-full w-full flex flex-col">
                    <div className={headerClass}>
                        <h2>Recent Payments</h2>
                        <Link href="/admin/billing" className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">View All</Link>
                    </div>
                    <div className="space-y-4 flex-1 overflow-y-auto pr-2 -mr-2 custom-scrollbar">
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
                </motion.div>
                </div>

                {/* Overdue Bills */}
                <div className={listCardClass}>
                    <motion.div variants={itemVariants} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="h-full w-full flex flex-col">
                    <div className={headerClass}>
                        <h2>Overdue Bills <span className="ml-2 px-2 py-0.5 bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 text-xs rounded-full">{stats.overdueAccounts.length}</span></h2>
                        <Link href="/admin/billing" className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">View All</Link>
                    </div>
                    <div className="space-y-4 flex-1 overflow-y-auto pr-2 -mr-2 custom-scrollbar">
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
                </motion.div>
                </div>
            </div>

            {/* Operations Row */}
            <div className="grid grid-cols-1 gap-6">
                {/* Recent Maintenance Requests */}
                <div className={listCardClass}>
                    <motion.div variants={itemVariants} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="h-full w-full flex flex-col">
                    <div className={headerClass}>
                        <h2>Recent Maintenance</h2>
                        <Link href="/admin/requests" className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">View All</Link>
                    </div>
                    <div className="space-y-4 flex-1 overflow-y-auto pr-2 -mr-2 custom-scrollbar">
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
                </motion.div>
                </div>
            </div>
        </motion.div>
    );
}