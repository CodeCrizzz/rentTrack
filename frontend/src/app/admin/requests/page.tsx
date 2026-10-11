"use client";
import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Search, Wrench, AlertTriangle, Calendar, User, AlignLeft, Settings, X, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface MaintenanceRequest {
    id: number;
    title: string;
    description: string;
    category: string;
    priority: string;
    status: string;
    created_at: string;
    assigned_to: string | null;
    admin_notes: string | null;
    scheduled_date: string | null;
    date_resolved: string | null;
    tenant_name: string;
    room_number: string | null;
    attachment_url: string | null;
}

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
};

export default function AdminRequests() {
    const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    
    const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [editForm, setEditForm] = useState({
        status: '',
        priority: '',
        assigned_to: '',
        admin_notes: '',
        scheduled_date: ''
    });

    const fetchRequests = async () => {
        setIsLoading(true);
        try {
            const { data } = await api.get('/admin/requests');
            setRequests(data);
        } catch (error) {
            console.error("Failed to fetch requests", error);
            toast.error("Failed to load maintenance requests");
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
                req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                req.tenant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (req.room_number && req.room_number.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesStatus = statusFilter === "All" || req.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [requests, searchQuery, statusFilter]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRequest) return;
        setIsSubmitting(true);
        try {
            const updateData: any = { ...editForm };
            if (editForm.status === 'Resolved' && selectedRequest.status !== 'Resolved') {
                updateData.date_resolved = new Date().toISOString();
            }
            await api.put(`/admin/requests/${selectedRequest.id}`, updateData);
            toast.success("Request updated successfully");
            setIsEditModalOpen(false);
            fetchRequests();
        } catch (error) {
            console.error("Update failed", error);
            toast.error("Failed to update request");
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (req: MaintenanceRequest) => {
        setSelectedRequest(req);
        setEditForm({
            status: req.status || 'Pending',
            priority: req.priority || 'Normal',
            assigned_to: req.assigned_to || '',
            admin_notes: req.admin_notes || '',
            scheduled_date: req.scheduled_date ? new Date(req.scheduled_date).toISOString().split('T')[0] : ''
        });
        setIsEditModalOpen(true);
    };

    const openViewModal = (req: MaintenanceRequest) => {
        setSelectedRequest(req);
        setIsViewModalOpen(true);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-500/30';
            case 'In Progress': return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-500/30';
            case 'Resolved': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30';
            case 'Cancelled': return 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400 border-slate-200 dark:border-slate-500/30';
            default: return 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400 border-slate-200 dark:border-slate-500/30';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'High': return 'text-rose-600 dark:text-rose-400';
            case 'Normal': return 'text-amber-600 dark:text-amber-400';
            case 'Low': return 'text-emerald-600 dark:text-emerald-400';
            default: return 'text-slate-600 dark:text-slate-400';
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Maintenance</h1>
                    <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1 font-medium">Manage tenant repair and maintenance requests</p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search requests..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none transition-all dark:text-white"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {['All', 'Pending', 'In Progress', 'Resolved'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                                statusFilter === status 
                                ? 'bg-teal-600 text-white shadow-md shadow-teal-500/20' 
                                : 'bg-white dark:bg-zinc-900/50 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800'
                            }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full"></div>
                </div>
            ) : filteredRequests.length === 0 ? (
                <div className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-2xl p-12 text-center">
                    <Wrench className="w-12 h-12 text-slate-300 dark:text-zinc-600 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">No requests found</h3>
                    <p className="text-slate-500 dark:text-zinc-400 mt-1 text-sm font-medium">Try adjusting your filters or search query.</p>
                </div>
            ) : (
                <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredRequests.map(req => (
                        <motion.div key={req.id} variants={itemVariants} className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-black/50 transition-all group flex flex-col cursor-pointer relative" onClick={() => openViewModal(req)}>
                            <div className="flex justify-between items-start mb-4">
                                <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${getStatusColor(req.status)}`}>
                                    {req.status}
                                </span>
                                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded text-xs font-bold">
                                    <AlertTriangle className={`w-3.5 h-3.5 ${getPriorityColor(req.priority)}`} />
                                    <span className="text-slate-700 dark:text-zinc-300">{req.priority}</span>
                                </div>
                            </div>
                            
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2 line-clamp-1">{req.title}</h3>
                            <p className="text-sm font-medium text-slate-500 dark:text-zinc-400 line-clamp-2 mb-4 flex-1">
                                {req.description}
                            </p>
                            
                            <div className="space-y-2 mt-auto pt-4 border-t border-slate-100 dark:border-zinc-800/50">
                                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-zinc-400">
                                    <div className="flex items-center gap-1.5">
                                        <User className="w-3.5 h-3.5 text-slate-400" />
                                        <span>{req.tenant_name} (Rm {req.room_number || 'N/A'})</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                        <span>{new Date(req.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="absolute inset-0 bg-slate-900/5 dark:bg-black/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[1px]">
                                <button onClick={(e) => { e.stopPropagation(); openViewModal(req); }} className="px-4 py-2 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white rounded-lg text-sm font-bold shadow-md hover:scale-105 transition-transform">
                                    View
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); openEditModal(req); }} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-bold shadow-md shadow-teal-500/20 hover:scale-105 transition-transform">
                                    Manage
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            )}

            <AnimatePresence>
                {isViewModalOpen && selectedRequest && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsViewModalOpen(false)} className="absolute inset-0 bg-slate-900/20 dark:bg-black/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 flex flex-col max-h-[90vh]">
                            <div className="flex justify-between items-start p-6 border-b border-slate-100 dark:border-zinc-800 shrink-0">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{selectedRequest.title}</h2>
                                    <div className="flex items-center gap-3 mt-2">
                                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${getStatusColor(selectedRequest.status)}`}>
                                            {selectedRequest.status}
                                        </span>
                                        <span className="text-sm font-medium text-slate-500 dark:text-zinc-400">
                                            {selectedRequest.category} • Filed on {new Date(selectedRequest.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <button onClick={() => setIsViewModalOpen(false)} className="p-2 bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 rounded-full hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl border border-slate-100 dark:border-zinc-800/80">
                                        <p className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Tenant Details</p>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedRequest.tenant_name}</p>
                                        <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">Room {selectedRequest.room_number || 'N/A'}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl border border-slate-100 dark:border-zinc-800/80">
                                        <p className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Priority</p>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <AlertTriangle className={`w-4 h-4 ${getPriorityColor(selectedRequest.priority)}`} />
                                            <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedRequest.priority}</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                        <AlignLeft className="w-4 h-4 text-teal-600" />
                                        Description
                                    </h4>
                                    <div className="p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl border border-slate-100 dark:border-zinc-800/80 text-sm font-medium text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                        {selectedRequest.description}
                                    </div>
                                </div>
                                
                                {selectedRequest.attachment_url && (
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                            <ExternalLink className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                            Attachment
                                        </h4>
                                        <a href={`http://localhost:5000${selectedRequest.attachment_url}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-sm font-bold rounded-xl border border-indigo-100 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
                                            View Attached File
                                        </a>
                                    </div>
                                )}

                                {selectedRequest.admin_notes && (
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                            <Settings className="w-4 h-4 text-amber-600" />
                                            Admin Notes
                                        </h4>
                                        <div className="p-4 bg-amber-50 dark:bg-amber-500/10 rounded-2xl border border-amber-100 dark:border-amber-500/20 text-sm font-medium text-amber-900 dark:text-amber-200 leading-relaxed whitespace-pre-wrap">
                                            {selectedRequest.admin_notes}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 flex justify-end gap-3 shrink-0">
                                <button onClick={() => { setIsViewModalOpen(false); openEditModal(selectedRequest); }} className="px-6 py-2.5 bg-teal-600 text-white font-bold text-sm rounded-xl hover:bg-teal-700 transition-colors shadow-md shadow-teal-500/20">
                                    Manage Request
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {isEditModalOpen && selectedRequest && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !isSubmitting && setIsEditModalOpen(false)} className="absolute inset-0 bg-slate-900/20 dark:bg-black/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center shrink-0">
                                <h2 className="text-xl font-black text-slate-900 dark:text-white">Manage Request</h2>
                                <button onClick={() => !isSubmitting && setIsEditModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 bg-slate-100 dark:bg-zinc-800 rounded-full transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleUpdate} className="flex flex-col min-h-0">
                                <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                                    
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider">Status</label>
                                        <select 
                                            value={editForm.status}
                                            onChange={e => setEditForm({...editForm, status: e.target.value})}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none transition-all dark:text-white"
                                        >
                                            <option value="Pending">Pending</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Resolved">Resolved</option>
                                            <option value="Cancelled">Cancelled</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider">Priority</label>
                                        <select 
                                            value={editForm.priority}
                                            onChange={e => setEditForm({...editForm, priority: e.target.value})}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none transition-all dark:text-white"
                                        >
                                            <option value="Low">Low</option>
                                            <option value="Normal">Normal</option>
                                            <option value="High">High</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider">Assigned To (Optional)</label>
                                        <input 
                                            type="text" 
                                            value={editForm.assigned_to}
                                            onChange={e => setEditForm({...editForm, assigned_to: e.target.value})}
                                            placeholder="E.g., John (Plumber)"
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none transition-all dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider">Scheduled Date (Optional)</label>
                                        <input 
                                            type="date" 
                                            value={editForm.scheduled_date}
                                            onChange={e => setEditForm({...editForm, scheduled_date: e.target.value})}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none transition-all dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-2 uppercase tracking-wider">Admin Notes</label>
                                        <textarea 
                                            value={editForm.admin_notes}
                                            onChange={e => setEditForm({...editForm, admin_notes: e.target.value})}
                                            placeholder="Add private notes or updates..."
                                            rows={3}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none transition-all dark:text-white resize-none"
                                        />
                                    </div>

                                </div>
                                <div className="p-6 border-t border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 flex justify-end gap-3 shrink-0">
                                    <button type="button" onClick={() => setIsEditModalOpen(false)} disabled={isSubmitting} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 text-sm font-bold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors shadow-md shadow-teal-500/20 disabled:opacity-50 flex items-center gap-2">
                                        {isSubmitting ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Saving...
                                            </>
                                        ) : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
