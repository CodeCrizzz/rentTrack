"use client";
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { toast } from 'sonner';
import { Bell, Calendar, Users, Clock, AlertCircle, Search } from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';

//  Updated Interface matching all your required fields
interface Tenant {
    id: number;
    name: string;
    email: string;
    phone: string;
    created_at: string;
    room_number: string | null;
    room_id: number | null;
    
    // New Fields
    gender?: string;
    address?: string;
    id_document?: string;
    bed_space?: string;
    date_moved_in?: string;
    contract_end_date?: string;
    monthly_rent?: number;
    payment_status?: 'Paid' | 'Unpaid' | 'Overdue' | 'No Bills Yet' | 'N/A';
    last_payment_date?: string;
    balance?: number;
    status: 'Active' | 'Inactive' | 'Moved Out' | 'Pending' | 'Declined';
}

interface Room {
    id: number;
    room_number: string;
    status: string;
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

export default function AdminTenants() {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [error, setError] = useState('');
    
    // --- MODAL & FORM STATES ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
    const [viewingTenant, setViewingTenant] = useState<Tenant | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState<number | null>(null);
    const [isStatusUpdating, setIsStatusUpdating] = useState<number | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        room_id: '' as string | number,
        address: '',
        gender: '',
        monthly_rent: '',
        date_moved_in: '',
        contract_end_date: '',
        status: 'Pending'
    });

    const fetchTenants = async () => {
        try {
            const { data } = await api.get('/admin/tenants');
            
            const enrichedData = data.map((t: any) => ({
                ...t,
                gender: t.gender || 'Not Specified',
                address: t.address || '',
                id_document: t.id_document ? 'Verified' : 'Pending',
                bed_space: t.bed_space || 'N/A',
                date_moved_in: t.date_moved_in ? new Date(t.date_moved_in).toISOString().split('T')[0] : '', 
                contract_end_date: t.contract_end_date ? new Date(t.contract_end_date).toISOString().split('T')[0] : '', 
                monthly_rent: t.monthly_rent || 0,
                payment_status: t.balance == null ? 'No Bills Yet' : t.balance > 0 ? 'Overdue' : 'Paid',
                last_payment_date: t.last_payment_date || 'N/A',
                balance: t.balance || 0,
                status: t.status || (t.room_number ? 'Active' : 'Pending')
            }));

            setTenants(enrichedData);
        } catch (err: any) {
            console.error("Failed to fetch tenants:", err);
            setError("Failed to load residents list.");
        }
    };

    const fetchRooms = async () => {
        try {
            const { data } = await api.get('/admin/rooms');
            setRooms(data);
        } catch (err: any) {
            console.error("Failed to fetch rooms:", err);
        }
    };

    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            await Promise.all([fetchTenants(), fetchRooms()]);
            setIsLoading(false);
        };
        init();
    }, []);

    const handleOpenModal = (tenant: Tenant, intention: 'approve' | 'edit' = 'edit') => {
        setEditingTenant(tenant);
        setFormData({
            name: tenant.name,
            email: tenant.email,
            phone: tenant.phone || '',
            password: '', 
            room_id: tenant.room_id?.toString() ?? '',
            address: tenant.address || '',
            gender: tenant.gender || '',
            monthly_rent: tenant.monthly_rent?.toString() || '',
            date_moved_in: tenant.date_moved_in || '',
            contract_end_date: tenant.contract_end_date || '',
            status: intention === 'approve' ? 'Active' : tenant.status
        });
        setError('');
        setIsModalOpen(true);
    };

    const handleViewTenant = (tenant: Tenant) => {
        setViewingTenant(tenant);
        setIsViewModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        
        try {
            if (editingTenant) {
                await api.put(`/admin/tenants/${editingTenant.id}`, formData);
                toast.success('Tenant updated successfully');
            }
            setIsModalOpen(false);
            fetchTenants(); 
        } catch (err: any) {
            const errMsg = err.response?.data?.message || "Operation failed. Please check your data.";
            setError(errMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteTenant = async (id: number) => {
        if (!window.confirm("Are you sure you want to remove this tenant? This action cannot be undone.")) return;
        
        setIsDeleting(id);
        setError('');
        
        try {
            await api.delete(`/admin/tenants/${id}`);
            toast.success('Tenant moved to trash');
            setTenants((prev) => prev.filter((tenant) => tenant.id !== id));
        } catch (err: any) {
            console.error("Failed to delete tenant:", err);
            const errMsg = "Failed to delete resident. They might have active dependencies (like payments).";
            setError(errMsg);
            toast.error(errMsg);
        } finally {
            setIsDeleting(null);
        }
    };

    const handleUpdateStatus = async (id: number, status: string) => {
        setIsStatusUpdating(id);
        setError('');
        try {
            await api.put(`/admin/tenants/${id}`, { status });
            fetchTenants();
        } catch (err: any) {
             console.error(`Failed to update status to ${status}:`, err);
             setError(`Failed to set status to ${status}.`);
        } finally {
             setIsStatusUpdating(null);
        }
    };

    const filteredTenants = tenants.filter(t => 
        (statusFilter === 'All' || t.status === statusFilter) &&
        (t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.room_number && t.room_number.toString().includes(searchQuery)))
    );

    const getTenantStatusStyles = (status: string) => {
        switch (status) {
            case 'Active': return {
                bg: 'bg-emerald-50 dark:bg-emerald-500/10',
                text: 'text-emerald-700 dark:text-emerald-400',
                border: 'border-emerald-200 dark:border-emerald-500/20',
                glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]',
                dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
            };
            case 'Pending': return {
                bg: 'bg-amber-50 dark:bg-amber-500/10',
                text: 'text-amber-700 dark:text-amber-400',
                border: 'border-amber-200 dark:border-amber-500/20',
                glow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]',
                dot: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
            };
            case 'Declined': return {
                bg: 'bg-rose-50 dark:bg-rose-500/10',
                text: 'text-rose-700 dark:text-rose-400',
                border: 'border-rose-200 dark:border-rose-500/20',
                glow: 'shadow-[0_0_15px_rgba(244,63,94,0.3)]',
                dot: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
            };
            case 'Moved Out': return {
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

    return (
        <div className="max-w-400 mx-auto pb-10 relative">
            {/* Ambient Background */}

            {/* Header */}
            <motion.div initial={{opacity:0, y:-20}} animate={{opacity:1, y:0}} className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-4">
                        Manage Tenants
                    </h1>
                    <p className="text-slate-500 dark:text-zinc-400 font-medium text-sm mt-1">Track resident profiles, room contracts, and applications.</p>
                </div>
            </motion.div>

            {/* Summary Cards */}
            <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: 0.1}} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 relative z-10">
                <div className="bg-card rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 flex flex-col justify-between shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-sm font-medium text-slate-500 dark:text-zinc-400">Active Tenants</h3>
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white flex items-baseline gap-2">
                            {tenants.filter(t => t.status === 'Active').length} <span className="text-lg">Active</span>
                        </div>
                    </div>
                </div>
                <div className="bg-card rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 flex flex-col justify-between shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-sm font-medium text-slate-500 dark:text-zinc-400">Pending Registrations</h3>
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                            <Clock className="w-5 h-5" />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white flex items-baseline gap-2">
                            {tenants.filter(t => t.status === 'Pending').length} <span className="text-lg">Pending</span>
                        </div>
                        <p className="text-xs font-semibold text-amber-600 mt-1">Awaiting approval</p>
                    </div>
                </div>
                <div className="bg-card rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 flex flex-col justify-between shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-sm font-medium text-slate-500 dark:text-zinc-400">Move-out Notices</h3>
                        <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white flex items-baseline gap-2">
                            {tenants.filter(t => t.status === 'Moved Out').length} <span className="text-lg">Notices</span>
                        </div>
                        <p className="text-xs font-semibold text-rose-600 mt-1">Total Moved Out</p>
                    </div>
                </div>
            </motion.div>

            {/* Filters */}
            <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: 0.2}} className="flex flex-col sm:flex-row gap-4 relative z-10 mb-8 bg-card p-3 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm">
                <div className="relative flex-1 max-w-sm">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <Search className="w-4 h-4" />
                    </div>
                    <input 
                        type="text" 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                        placeholder="Search tenant name.." 
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/50 border-none text-slate-900 dark:text-white text-sm focus:ring-0 outline-none" 
                    />
                </div>
                <div className="relative">
                    <CustomSelect 
                        value={statusFilter} 
                        onChange={(val) => setStatusFilter(val)} 
                        options={[
                            { value: "All", label: "Status: All" },
                            { value: "Pending", label: "Pending" },
                            { value: "Active", label: "Active" },
                            { value: "Declined", label: "Declined" },
                            { value: "Moved Out", label: "Moved Out" }
                        ]}
                        className="w-full sm:w-40 py-2.5 pl-4 pr-10 rounded-xl bg-card border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                </div>
            </motion.div>


            {/* Data Table */}
            {isLoading ? (
                <div className="flex items-center justify-center min-h-[40vh]">
                    <div className="relative flex flex-col items-center justify-center">
                        <div className="w-16 h-16 border-4 border-slate-200 dark:border-zinc-800 border-t-indigo-500 dark:border-t-indigo-500 rounded-full animate-spin relative z-10 shadow-[0_0_30px_rgba(99,102,241,0.3)]"></div>
                        <p className="text-slate-500 dark:text-zinc-400 font-bold text-xs uppercase tracking-[0.2em] mt-6 animate-pulse">Loading Residents...</p>
                    </div>
                </div>
            ) : (
                <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: 0.4}} className="bg-card rounded-2xl border border-slate-100 dark:border-zinc-800 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600 dark:text-zinc-400">
                            <thead className="bg-secondary/50 text-xs text-slate-500 dark:text-zinc-500 border-b border-slate-100 dark:border-zinc-800">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Tenant Name</th>
                                    <th className="px-6 py-4 font-semibold">Assigned Room</th>
                                    <th className="px-6 py-4 font-semibold">Contact Number</th>
                                    <th className="px-6 py-4 font-semibold">Email Address</th>
                                    <th className="px-6 py-4 font-semibold">Joined Date</th>
                                    <th className="px-6 py-4 font-semibold">Status</th>
                                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                                {filteredTenants.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                                            No tenants found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTenants.map((tenant) => {
                                        // Status Pill Logic to match mockup
                                        let pillClass = "px-2.5 py-1 text-[11px] font-bold rounded-md whitespace-nowrap ";
                                        let statusText: string = tenant.status;
                                        if (tenant.status === 'Active') {
                                            pillClass += "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400";
                                        } else if (tenant.status === 'Pending') {
                                            pillClass += "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400";
                                            statusText = "Pending Approval";
                                        } else if (tenant.status === 'Declined' || tenant.status === 'Inactive' || tenant.status === 'Moved Out') {
                                            pillClass += "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400";
                                        } else {
                                            pillClass += "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400";
                                        }

                                        return (
                                            <tr key={tenant.id} className="hover:bg-slate-50 dark:hover:bg-zinc-900/50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                                                    {tenant.name}
                                                </td>
                                                <td className="px-6 py-4 font-bold text-slate-700 dark:text-zinc-300">
                                                    {tenant.room_number ? `${tenant.room_number}` : (tenant.status === 'Pending' ? 'Pending' : 'None')}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {tenant.phone || 'N/A'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {tenant.email}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {tenant.date_moved_in ? new Date(tenant.date_moved_in).toLocaleDateString('en-US', {month: 'short', day: '2-digit', year: 'numeric'}) : (tenant.created_at ? new Date(tenant.created_at).toLocaleDateString('en-US', {month: 'short', day: '2-digit', year: 'numeric'}) : 'N/A')}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={pillClass}>{statusText}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {tenant.status === 'Pending' ? (
                                                        <div className="flex justify-end gap-2 items-center">
                                                            <button onClick={() => handleUpdateStatus(tenant.id, 'Active')} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors">Approve</button>
                                                            <button onClick={() => handleUpdateStatus(tenant.id, 'Declined')} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg transition-colors">Reject</button>
                                                            <button onClick={() => handleViewTenant(tenant)} className="text-slate-500 hover:text-slate-700 font-semibold text-xs ml-2">View</button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <button onClick={() => handleViewTenant(tenant)} className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold mr-3">View</button>
                                                            <button onClick={() => handleOpenModal(tenant, 'edit')} className="text-slate-500 hover:text-slate-700 font-semibold">Edit</button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}

            {/* Modals */}
            <AnimatePresence>
            {isModalOpen && (
                <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/60 backdrop-blur-md z-100 flex items-center justify-center p-4">
                    <motion.div initial={{scale:0.9, y:20, opacity:0}} animate={{scale:1, y:0, opacity:1}} exit={{scale:0.95, y:10, opacity:0}} transition={{type: "spring", damping: 25, stiffness: 300}} className="bg-card backdrop-blur-3xl rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.3)] border border-slate-200 dark:border-zinc-800 flex flex-col max-h-[90vh]">
                        <div className="px-8 py-6 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-card">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Edit Resident</h2>
                                <p className="text-xs font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest mt-1">Update profile and rental details</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 rounded-2xl bg-secondary border border-slate-200 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700 flex items-center justify-center text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-8">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest pl-1">Full Name <span className="text-rose-500">*</span></label>
                                    <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-secondary border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-inner" placeholder="e.g. John Doe" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest pl-1">Email Address <span className="text-rose-500">*</span></label>
                                        <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-secondary border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-inner" placeholder="john@example.com" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest pl-1">Phone Number</label>
                                        <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-secondary border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-inner" placeholder="+63 000 000 0000" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest pl-1">Gender</label>
                                        <div className="relative">
                                            <CustomSelect 
                                                value={formData.gender} 
                                                onChange={val => setFormData({...formData, gender: val})} 
                                                options={[
                                                    { value: "", label: "Not Specified" },
                                                    { value: "Male", label: "Male" },
                                                    { value: "Female", label: "Female" },
                                                    { value: "Other", label: "Other" }
                                                ]}
                                                className="w-full px-5 py-4 rounded-2xl bg-secondary border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-inner"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest pl-1">Tenant Status</label>
                                        <div className="relative">
                                            <CustomSelect 
                                                value={formData.status} 
                                                onChange={val => setFormData({...formData, status: val})} 
                                                options={["Pending", "Active", "Declined", "Moved Out"]}
                                                className="w-full px-5 py-4 rounded-2xl bg-secondary border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-inner"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest pl-1">Home Address</label>
                                    <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-secondary border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-inner" placeholder="123 Main St..." />
                                </div>

                                <div className="pt-6 pb-2 border-t border-slate-200 dark:border-zinc-800/80">
                                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Rental Details</h3>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest pl-1">Assigned Unit</label>
                                        <div className="relative">
                                            <CustomSelect 
                                                value={formData.room_id?.toString() || ''} 
                                                onChange={val => setFormData({...formData, room_id: val})} 
                                                options={[
                                                    { value: "", label: "Unassigned / Pending" },
                                                    ...rooms.map(room => ({
                                                        value: room.id.toString(),
                                                        label: `Room ${room.room_number} (${room.status})`
                                                    }))
                                                ]}
                                                className="w-full px-5 py-4 rounded-2xl bg-secondary border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-inner"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest pl-1">Monthly Rent (₱)</label>
                                        <input type="number" min="0" step="0.01" value={formData.monthly_rent} onChange={e => setFormData({...formData, monthly_rent: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-secondary border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all shadow-inner" placeholder="e.g. 5000" />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest pl-1">Move-in Date</label>
                                        <input type="date" value={formData.date_moved_in} onChange={e => setFormData({...formData, date_moved_in: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-secondary border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-inner" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest pl-1">Contract End Date</label>
                                        <input type="date" value={formData.contract_end_date} onChange={e => setFormData({...formData, contract_end_date: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-secondary border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-inner" />
                                    </div>
                                </div>
                            </div>
                        </form>
                        <div className="p-8 border-t border-slate-200 dark:border-zinc-800/80 flex flex-col-reverse sm:flex-row justify-end gap-3 bg-secondary/50">
                            <button type="button" onClick={() => { setIsModalOpen(false); setError(''); }} className="w-full sm:w-auto px-8 py-4 font-black text-slate-500 dark:text-zinc-400 bg-secondary hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-2xl transition-all uppercase tracking-widest text-xs">Cancel</button>
                            <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto px-8 py-4 font-black bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] flex items-center justify-center gap-2 uppercase tracking-widest text-xs disabled:opacity-70">
                                {isSubmitting ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : 'Save Changes'}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {isViewModalOpen && viewingTenant && (
                <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/60 backdrop-blur-md z-100 flex items-center justify-center p-4">
                    <motion.div initial={{scale:0.9, y:20, opacity:0}} animate={{scale:1, y:0, opacity:1}} exit={{scale:0.95, y:10, opacity:0}} transition={{type: "spring", damping: 25, stiffness: 300}} className="bg-card backdrop-blur-3xl rounded-[2.5rem] w-full max-w-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.3)] border border-slate-200 dark:border-zinc-800 flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-slate-200 dark:border-zinc-800 bg-card flex justify-between items-start gap-4">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-indigo-400 to-purple-500 text-white font-black text-2xl flex items-center justify-center shadow-lg">
                                    {viewingTenant.name.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{viewingTenant.name}</h2>
                                    <p className="text-xs font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest mt-1">Tenant ID: {viewingTenant.id}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {(() => {
                                    const style = getTenantStatusStyles(viewingTenant.status);
                                    return (
                                        <span className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl border flex items-center gap-2 shadow-sm ${style.bg} ${style.border} ${style.text}`}>
                                            <div className={`w-2 h-2 rounded-full animate-pulse ${style.dot}`}></div>
                                            {viewingTenant.status}
                                        </span>
                                    );
                                })()}
                                <button onClick={() => setIsViewModalOpen(false)} className="w-10 h-10 rounded-xl bg-secondary border border-slate-200 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700 flex items-center justify-center text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-8 overflow-y-auto custom-scrollbar w-full">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
                                {/* Contact Info */}
                                <div className="bg-secondary/50 border border-slate-200 dark:border-zinc-800 p-6 rounded-3xl shadow-inner relative overflow-hidden group">
                                    <h3 className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-4">Contact Information</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Email</p>
                                            <p className="font-bold text-slate-900 dark:text-white">{viewingTenant.email}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Phone</p>
                                            <p className="font-bold text-slate-900 dark:text-white">{viewingTenant.phone || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Address</p>
                                            <p className="font-bold text-slate-900 dark:text-white">{viewingTenant.address || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                                {/* Rental Info */}
                                <div className="bg-secondary/50 border border-slate-200 dark:border-zinc-800 p-6 rounded-3xl shadow-inner relative overflow-hidden group">
                                    <h3 className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-4">Rental Information</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Assigned Room</p>
                                            <p className="font-bold text-slate-900 dark:text-white">{viewingTenant.room_number ? `Room ${viewingTenant.room_number}` : 'Unassigned'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Move-In Date</p>
                                            <p className="font-bold text-slate-900 dark:text-white">{viewingTenant.date_moved_in || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Contract End Date</p>
                                            <p className="font-bold text-slate-900 dark:text-white">{viewingTenant.contract_end_date || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-3">
                                <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></span>
                                Financial Status
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <div className="bg-secondary/50 border border-slate-200 dark:border-zinc-800 p-6 rounded-3xl shadow-inner relative overflow-hidden group">
                                    <p className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-1">Monthly Rent</p>
                                    <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">₱{Number(viewingTenant.monthly_rent || 0).toLocaleString()}</p>
                                </div>
                                <div className="bg-secondary/50 border border-slate-200 dark:border-zinc-800 p-6 rounded-3xl shadow-inner relative overflow-hidden group">
                                    <p className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-1">Current Balance</p>
                                    <p className={`text-3xl font-black tracking-tighter ${viewingTenant.balance! > 0 ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-500 dark:text-emerald-400'}`}>₱{Number(viewingTenant.balance || 0).toLocaleString()}</p>
                                </div>
                                <div className="bg-secondary/50 border border-slate-200 dark:border-zinc-800 p-6 rounded-3xl shadow-inner relative overflow-hidden group">
                                    <p className="text-[10px] font-black text-slate-500 dark:text-zinc-500 uppercase tracking-widest mb-1">Last Payment</p>
                                    <p className="text-lg font-black text-slate-900 dark:text-white tracking-tight mt-1">{viewingTenant.last_payment_date}</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    );
}