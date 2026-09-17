"use client";
import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { toast } from 'sonner';
import CustomSelect from '@/components/CustomSelect';

interface Request {
    id: number;
    title: string;
    description: string;
    category: string;
    priority: string;
    status: string;
    created_at: string;
    assigned_to: string | null;
    admin_notes: string | null;
    tenant_name: string;
    room_number: string | null;
    scheduled_date: string | null;
    date_resolved: string | null;
}

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function AdminRequests() {
    const [requests, setRequests] = useState<Request[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters and Search
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [priorityFilter, setPriorityFilter] = useState('All');
    const [categoryFilter, setCategoryFilter] = useState('All');

    // Modals
    const [viewModalReq, setViewModalReq] = useState<Request | null>(null);
    const [updateModalReq, setUpdateModalReq] = useState<Request | null>(null);

    // Update Form State
    const [updateStatus, setUpdateStatus] = useState('');
    const [updatePriority, setUpdatePriority] = useState('');
    const [updateAssigned, setUpdateAssigned] = useState('');
    const [updateNotes, setUpdateNotes] = useState('');
    const [updateScheduledDate, setUpdateScheduledDate] = useState('');
    const [updateDateResolved, setUpdateDateResolved] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    const fetchRequests = async () => {
        try {
            setIsLoading(true);
            const { data } = await api.get('/requests');
            setRequests(data);
        } catch (error) {
            console.error("Failed to fetch requests:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const filteredRequests = useMemo(() => {
        return requests.filter(req => {
            const matchesSearch = 
                req.tenant_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                req.title.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesStatus = statusFilter === 'All' || req.status === statusFilter;
            const matchesPriority = priorityFilter === 'All' || req.priority === priorityFilter;
            const matchesCategory = categoryFilter === 'All' || req.category === categoryFilter;
            return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
        });
    }, [requests, searchTerm, statusFilter, priorityFilter, categoryFilter]);

    const openUpdateModal = (req: Request) => {
        setUpdateModalReq(req);
        setUpdateStatus(req.status);
        setUpdatePriority(req.priority);
        setUpdateAssigned(req.assigned_to || '');
        setUpdateNotes(req.admin_notes || '');
        setUpdateScheduledDate(req.scheduled_date ? new Date(req.scheduled_date).toISOString().split('T')[0] : '');
        setUpdateDateResolved(req.date_resolved ? new Date(req.date_resolved).toISOString().split('T')[0] : '');
    };

    const handleUpdateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!updateModalReq) return;
        
        try {
            setIsUpdating(true);
            await api.put(`/requests/${updateModalReq.id}`, {
                status: updateStatus,
                priority: updatePriority,
                assigned_to: updateAssigned,
                admin_notes: updateNotes,
                scheduled_date: updateScheduledDate || null,
                date_resolved: updateDateResolved || null
            });
            toast.success('Request updated successfully');
            await fetchRequests();
            setUpdateModalReq(null);
        } catch (error: any) {
            console.error("Failed to update request:", error);
            toast.error(error.response?.data?.message || "Failed to update request");
        } finally {
            setIsUpdating(false);
        }
    };

    // Dark Mode Badges
    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Pending': return {
                bg: 'bg-amber-50 dark:bg-amber-500/10',
                text: 'text-amber-700 dark:text-amber-400',
                border: 'border-amber-200 dark:border-amber-500/20',
                glow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]',
                dot: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
            };
            case 'In Progress': return {
                bg: 'bg-blue-50 dark:bg-blue-500/10',
                text: 'text-blue-700 dark:text-blue-400',
                border: 'border-blue-200 dark:border-blue-500/20',
                glow: 'shadow-[0_0_15px_rgba(59,130,246,0.3)]',
                dot: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]'
            };
            case 'Resolved': return {
                bg: 'bg-emerald-50 dark:bg-emerald-500/10',
                text: 'text-emerald-700 dark:text-emerald-400',
                border: 'border-emerald-200 dark:border-emerald-500/20',
                glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]',
                dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
            };
            case 'Cancelled': return {
                bg: 'bg-secondary/50',
                text: 'text-slate-600 dark:text-zinc-400',
                border: 'border-slate-200 dark:border-zinc-500/20',
                glow: '',
                dot: 'bg-slate-500'
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

    const getPriorityStyle = (priority: string) => {
        switch (priority) {
            case 'Urgent': return {
                bg: 'bg-rose-50 dark:bg-rose-500/10',
                text: 'text-rose-700 dark:text-rose-400',
                border: 'border-rose-200 dark:border-rose-500/20',
                glow: 'shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse',
                dot: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse'
            };
            case 'High': return {
                bg: 'bg-orange-50 dark:bg-orange-500/10',
                text: 'text-orange-700 dark:text-orange-400',
                border: 'border-orange-200 dark:border-orange-500/20',
                glow: 'shadow-[0_0_15px_rgba(249,115,22,0.2)]',
                dot: 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]'
            };
            case 'Medium': return {
                bg: 'bg-amber-50 dark:bg-amber-500/10',
                text: 'text-amber-700 dark:text-amber-400',
                border: 'border-amber-200 dark:border-amber-500/20',
                glow: '',
                dot: 'bg-amber-500'
            };
            case 'Low': return {
                bg: 'bg-blue-50 dark:bg-blue-500/10',
                text: 'text-blue-700 dark:text-blue-400',
                border: 'border-blue-200 dark:border-blue-500/20',
                glow: '',
                dot: 'bg-blue-500'
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

    const getCategoryIcon = (category: string) => {
        switch(category) {
            case 'Plumbing': return <svg className="w-5 h-5 text-blue-500 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12 6a3.75 3.75 0 1 0 0 7.5A3.75 3.75 0 0 0 12 6Z" /></svg>;
            case 'Electrical': return <svg className="w-5 h-5 text-amber-500 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>;
            case 'Furniture': return <svg className="w-5 h-5 text-purple-500 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h12A2.25 2.25 0 0 1 20.25 6v12A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18V6Z" /></svg>;
            default: return <svg className="w-5 h-5 text-orange-500 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75a4.5 4.5 0 0 1-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.651a2.25 2.25 0 0 1-3.266.13l-.337-.337a2.25 2.25 0 0 1 .13-3.266l8.651-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 0 1 8.954-.464Z" /></svg>;
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto pb-10 relative">
            {/* Ambient Background */}

            <motion.div initial={{opacity:0, y:-20}} animate={{opacity:1, y:0}} className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10 mb-8">
                <div>
                    <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-4">
                        Maintenance
                        {requests.filter(r => r.status === 'Pending').length > 0 && (
                            <span className="inline-flex items-center px-4 py-1.5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-widest animate-pulse">
                                {requests.filter(r => r.status === 'Pending').length} Pending
                            </span>
                        )}
                        {requests.filter(r => r.priority === 'Urgent').length > 0 && (
                            <span className="inline-flex items-center px-4 py-1.5 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-black uppercase tracking-widest animate-pulse">
                                {requests.filter(r => r.priority === 'Urgent').length} Urgent
                            </span>
                        )}
                    </h1>
                    <p className="text-slate-500 dark:text-zinc-400 font-bold text-sm uppercase tracking-[0.2em] mt-2">Track & Manage Tenant Requests</p>
                </div>
            </motion.div>

            {/* Filters */}
            <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: 0.1}} className="flex flex-col xl:flex-row gap-4 relative z-10 mb-8 bg-card backdrop-blur-2xl p-4 rounded-[2rem] border border-slate-200/60 dark:border-zinc-800/60 shadow-xl dark:shadow-2xl">
                <div className="relative group flex-1">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500 group-focus-within:text-blue-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                    <input 
                        type="text" 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        placeholder="Search issue or tenant..." 
                        className="w-full pl-14 pr-6 py-4 rounded-2xl bg-card/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder-zinc-500 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner" 
                    />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 shrink-0">
                    <div className="relative w-full sm:w-40">
                        <CustomSelect 
                            value={statusFilter} 
                            onChange={(val) => setStatusFilter(val)} 
                            options={[
                                { value: "All", label: "All Statuses" },
                                { value: "Pending", label: "Pending" },
                                { value: "In Progress", label: "In Progress" },
                                { value: "Resolved", label: "Resolved" },
                                { value: "Cancelled", label: "Cancelled" }
                            ]}
                            className="w-full py-4 pl-5 pr-10 rounded-2xl bg-card/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>

                    <div className="relative w-full sm:w-40">
                        <CustomSelect 
                            value={priorityFilter} 
                            onChange={(val) => setPriorityFilter(val)} 
                            options={[
                                { value: "All", label: "All Priorities" },
                                { value: "Urgent", label: "Urgent" },
                                { value: "High", label: "High" },
                                { value: "Medium", label: "Medium" },
                                { value: "Low", label: "Low" },
                                { value: "Normal", label: "Normal" }
                            ]}
                            className="w-full py-4 pl-5 pr-10 rounded-2xl bg-card/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>

                    <div className="relative w-full sm:w-40">
                        <CustomSelect 
                            value={categoryFilter} 
                            onChange={(val) => setCategoryFilter(val)} 
                            options={[
                                { value: "All", label: "All Categories" },
                                { value: "Plumbing", label: "Plumbing" },
                                { value: "Electrical", label: "Electrical" },
                                { value: "Furniture", label: "Furniture" },
                                { value: "Other", label: "Other" }
                            ]}
                            className="w-full py-4 pl-5 pr-10 rounded-2xl bg-card/50 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>
                </div>
            </motion.div>

            {/* Request Cards Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center min-h-[40vh]">
                    <div className="relative flex flex-col items-center justify-center">
                        <div className="w-16 h-16 border-4 border-slate-200 dark:border-zinc-800 border-t-blue-500 dark:border-t-blue-500 rounded-full animate-spin relative z-10 shadow-[0_0_30px_rgba(59,130,246,0.3)]"></div>
                        <p className="text-slate-500 dark:text-zinc-400 font-bold text-xs uppercase tracking-[0.2em] mt-6 animate-pulse">Loading Requests...</p>
                    </div>
                </div>
            ) : filteredRequests.length === 0 ? (
                <motion.div initial={{opacity:0}} animate={{opacity:1}} className="bg-card backdrop-blur-2xl rounded-[2.5rem] border border-slate-200 dark:border-zinc-800 p-16 text-center shadow-2xl">
                    <div className="w-24 h-24 bg-secondary rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-slate-200 dark:border-zinc-800">
                        <svg className="w-10 h-10 text-emerald-500 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" /></svg>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">No maintenance requests found</h3>
                    <p className="text-sm font-bold text-slate-500 dark:text-zinc-500">{searchTerm ? "Try adjusting your filters." : "Everything is running smoothly!"}</p>
                </motion.div>
            ) : (
                <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredRequests.map((req) => {
                        const sStyle = getStatusStyle(req.status);
                        const pStyle = getPriorityStyle(req.priority);
                        
                        return (
                            <motion.div key={req.id} variants={itemVariants} className="relative group rounded-3xl p-[1px] overflow-hidden bg-gradient-to-b from-slate-200 to-slate-100 dark:from-white/10 dark:to-transparent hover:shadow-[0_0_40px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_0_40px_rgba(255,255,255,0.05)] transition-shadow duration-500">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
                                <div className="h-full w-full bg-card backdrop-blur-3xl rounded-[23px] p-6 flex flex-col relative overflow-hidden transition-transform duration-500 group-hover:scale-[0.99]">
                                    
                                    {/* Top Row: Category Icon & Badges */}
                                    <div className="flex justify-between items-start mb-5">
                                        <div className="w-12 h-12 rounded-2xl bg-secondary/80 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform duration-500">
                                            {getCategoryIcon(req.category)}
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border bg-white/50 dark:bg-card/50 backdrop-blur-md ${sStyle.border}`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${sStyle.dot}`}></div>
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${sStyle.text}`}>{req.status}</span>
                                            </div>
                                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border bg-white/50 dark:bg-card/50 backdrop-blur-md ${pStyle.border}`}>
                                                <svg className={`w-3 h-3 ${pStyle.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${pStyle.text}`}>{req.priority}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Title & Description */}
                                    <div className="mb-6 flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">#{req.id}</span>
                                            <span className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">•</span>
                                            <span className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">{new Date(req.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <h3 className="font-black text-slate-900 dark:text-white text-xl leading-tight mb-2 line-clamp-2">{req.title}</h3>
                                        <p className="text-xs font-bold text-slate-500 dark:text-zinc-400 line-clamp-2">{req.description}</p>
                                    </div>

                                    {/* Tenant Info */}
                                    <div className="bg-secondary/50 rounded-2xl p-4 border border-slate-200 dark:border-zinc-800 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-black text-xs shadow-md">
                                            {req.tenant_name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 dark:text-white text-sm leading-none">{req.tenant_name}</p>
                                            <p className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest mt-1">Room {req.room_number || 'N/A'}</p>
                                        </div>
                                    </div>

                                    {/* Action Hover Overlay */}
                                    <div className="absolute inset-0 bg-white/60 dark:bg-card/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                                        <button onClick={() => setViewModalReq(req)} className="w-12 h-12 rounded-2xl bg-card border border-slate-200 dark:border-zinc-700 shadow-xl flex items-center justify-center text-slate-700 dark:text-zinc-300 hover:text-blue-500 hover:border-blue-500 transition-colors hover:scale-110 active:scale-95" title="View Details">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                        </button>
                                        <button onClick={() => openUpdateModal(req)} className="w-12 h-12 rounded-2xl bg-card border border-slate-200 dark:border-zinc-700 shadow-xl flex items-center justify-center text-slate-700 dark:text-zinc-300 hover:text-indigo-500 hover:border-indigo-500 transition-colors hover:scale-110 active:scale-95" title="Update Status">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>
            )}

            {/* Modals */}
            <AnimatePresence>
            {/* View Modal */}
            {viewModalReq && (
                <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <motion.div initial={{scale:0.9, y:20, opacity:0}} animate={{scale:1, y:0, opacity:1}} exit={{scale:0.95, y:10, opacity:0}} transition={{type: "spring", damping: 25, stiffness: 300}} className="bg-linear-to-br from-white/80 to-slate-50/50 dark:from-background/80 dark:to-transparent backdrop-blur-3xl rounded-[2.5rem] w-full max-w-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.3)] border border-slate-200 dark:border-zinc-800 flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-slate-200 dark:border-zinc-800 bg-card/50 flex justify-between items-start gap-4">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest bg-secondary px-3 py-1 rounded-lg">Req #{viewModalReq.id}</span>
                                    {(() => {
                                        const sStyle = getStatusStyle(viewModalReq.status);
                                        return (
                                            <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border ${sStyle.bg} ${sStyle.border}`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${sStyle.dot}`}></div>
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${sStyle.text}`}>{viewModalReq.status}</span>
                                            </div>
                                        );
                                    })()}
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{viewModalReq.title}</h2>
                            </div>
                            <button onClick={() => setViewModalReq(null)} className="w-10 h-10 rounded-xl bg-secondary border border-slate-200 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700 flex items-center justify-center text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors shrink-0">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        
                        <div className="p-8 overflow-y-auto custom-scrollbar w-full">
                            
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                                <div className="bg-secondary/50 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl shadow-inner">
                                    <p className="text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                        Reported By
                                    </p>
                                    <p className="font-bold text-slate-900 dark:text-white text-base">{viewModalReq.tenant_name}</p>
                                    <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-500 mt-0.5">Room {viewModalReq.room_number || 'N/A'}</p>
                                </div>
                                <div className="bg-secondary/50 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl shadow-inner">
                                    <p className="text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                        Date Reported
                                    </p>
                                    <p className="font-bold text-slate-900 dark:text-white text-base">{new Date(viewModalReq.created_at).toLocaleDateString()}</p>
                                </div>
                                <div className="bg-secondary/50 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl shadow-inner">
                                    <p className="text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path></svg>
                                        Category
                                    </p>
                                    <p className="font-bold text-slate-900 dark:text-white text-base">{viewModalReq.category}</p>
                                </div>
                            </div>

                            <div className="mb-8">
                                <h3 className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-3">Description</h3>
                                <div className="bg-secondary/30 border border-slate-200 dark:border-zinc-800 border-dashed rounded-2xl p-6 text-sm font-medium text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                    {viewModalReq.description}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div>
                                    <h3 className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-3">Assigned Staff</h3>
                                    <div className="bg-secondary/50 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 font-bold text-slate-900 dark:text-white text-sm">
                                        {viewModalReq.assigned_to ? (
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-700 flex items-center justify-center text-xs">
                                                    👷
                                                </div>
                                                {viewModalReq.assigned_to}
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 dark:text-zinc-500 italic">Not assigned yet</span>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-3">Scheduling</h3>
                                    <div className="bg-secondary/50 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 font-bold text-sm space-y-3">
                                        <div className="flex justify-between items-center border-b border-slate-200 dark:border-zinc-800 pb-2">
                                            <span className="text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-widest">Scheduled</span>
                                            <span className="text-slate-900 dark:text-white">{viewModalReq.scheduled_date ? new Date(viewModalReq.scheduled_date).toLocaleDateString() : <span className="text-slate-400 italic">Not set</span>}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-widest">Resolved</span>
                                            <span className="text-slate-900 dark:text-white">{viewModalReq.date_resolved ? new Date(viewModalReq.date_resolved).toLocaleDateString() : <span className="text-slate-400 italic">Not set</span>}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <h3 className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-3">Admin Notes</h3>
                                <div className="bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/10 rounded-2xl p-5 text-sm font-medium text-slate-700 dark:text-zinc-300 leading-relaxed">
                                    {viewModalReq.admin_notes ? viewModalReq.admin_notes : <span className="text-slate-400 dark:text-zinc-500 italic">No notes added.</span>}
                                </div>
                            </div>

                        </div>

                        <div className="p-6 border-t border-slate-200 dark:border-zinc-800 bg-secondary/50 flex justify-end gap-3">
                            <button onClick={() => setViewModalReq(null)} className="px-6 py-3.5 font-bold text-slate-500 dark:text-zinc-400 bg-secondary hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-xl transition-colors text-xs uppercase tracking-widest">Close</button>
                            <button onClick={() => { const req = viewModalReq; setViewModalReq(null); openUpdateModal(req); }} className="px-6 py-3.5 font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] flex items-center justify-center gap-2 text-xs uppercase tracking-widest">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                Edit Request
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {/* Update Modal */}
            {updateModalReq && (
                <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <motion.div initial={{scale:0.9, y:20, opacity:0}} animate={{scale:1, y:0, opacity:1}} exit={{scale:0.95, y:10, opacity:0}} transition={{type: "spring", damping: 25, stiffness: 300}} className="bg-linear-to-br from-white/80 to-slate-50/50 dark:from-background/80 dark:to-transparent backdrop-blur-3xl rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.3)] border border-slate-200 dark:border-zinc-800 flex flex-col max-h-[90vh]">
                        <div className="px-8 py-6 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-card/50">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Update Request</h2>
                                <p className="text-xs font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest mt-1">Req #{updateModalReq.id}</p>
                            </div>
                            <button onClick={() => setUpdateModalReq(null)} className="w-12 h-12 rounded-2xl bg-secondary border border-slate-200 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700 flex items-center justify-center text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <form onSubmit={handleUpdateSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-8">
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest pl-1">Status</label>
                                        <div className="relative">
                                            <CustomSelect 
                                                value={updateStatus} 
                                                onChange={val => setUpdateStatus(val)} 
                                                options={["Pending", "In Progress", "Resolved", "Cancelled"]}
                                                className="w-full px-5 py-4 rounded-2xl bg-secondary border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-inner"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest pl-1">Priority</label>
                                        <div className="relative">
                                            <CustomSelect 
                                                value={updatePriority} 
                                                onChange={val => setUpdatePriority(val)} 
                                                options={["Urgent", "High", "Medium", "Low", "Normal"]}
                                                className="w-full px-5 py-4 rounded-2xl bg-secondary border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-inner"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest pl-1">Assigned Staff</label>
                                    <input type="text" value={updateAssigned} onChange={e => setUpdateAssigned(e.target.value)} placeholder="e.g. John Doe (Plumber)" className="w-full px-5 py-4 rounded-2xl bg-secondary border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-inner placeholder-zinc-500" />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest pl-1">Scheduled Date</label>
                                        <input type="date" value={updateScheduledDate} onChange={e => setUpdateScheduledDate(e.target.value)} className="w-full px-5 py-4 rounded-2xl bg-secondary border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-inner [color-scheme:light_dark]" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest pl-1">Date Resolved</label>
                                        <input type="date" value={updateDateResolved} onChange={e => setUpdateDateResolved(e.target.value)} className="w-full px-5 py-4 rounded-2xl bg-secondary border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-inner [color-scheme:light_dark]" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest pl-1">Admin Notes</label>
                                    <textarea rows={4} value={updateNotes} onChange={e => setUpdateNotes(e.target.value)} placeholder="Add any internal notes, spare parts used, or resolution details here..." className="w-full px-5 py-4 rounded-2xl bg-secondary border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-inner resize-none placeholder-zinc-500 custom-scrollbar" />
                                </div>
                            </div>
                        </form>
                        <div className="p-8 border-t border-slate-200 dark:border-zinc-800/80 flex flex-col-reverse sm:flex-row justify-end gap-3 bg-secondary/50">
                            <button type="button" onClick={() => setUpdateModalReq(null)} className="w-full sm:w-auto px-8 py-4 font-black text-slate-500 dark:text-zinc-400 bg-secondary hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-2xl transition-all uppercase tracking-widest text-xs">Cancel</button>
                            <button type="submit" disabled={isUpdating} className="w-full sm:w-auto px-8 py-4 font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] flex items-center justify-center gap-2 uppercase tracking-widest text-xs disabled:opacity-70">
                                {isUpdating ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : 'Save Changes'}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    );
}