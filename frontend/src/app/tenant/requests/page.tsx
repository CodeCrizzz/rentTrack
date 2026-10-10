"use client";
import { useEffect, useState, useRef, useMemo } from 'react';
import api from '@/lib/api';
import { motion, AnimatePresence, type Variants } from 'framer-motion';

// --- Interfaces & Helpers ---
interface Request {
    id: number;
    title: string;
    description: string;
    category: string;
    priority: string;
    status: string;
    created_at: string;
    admin_notes: string | null;
    image_url?: string | null;
    schedule?: string | null;
}

const formatDate = (dateString: string | null | undefined, options?: Intl.DateTimeFormatOptions) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString(undefined, options || { month: 'short', day: 'numeric', year: 'numeric' });
};

const getPriorityWeight = (priority: string) => {
    switch(priority) { case 'Urgent': return 4; case 'High': return 3; case 'Medium': return 2; case 'Low': return 1; default: return 0; }
};

export default function TenantMaintenance() {
    // --- Real Database State ---
    const [requests, setRequests] = useState<Request[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // --- Form State ---
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('Plumbing');
    const [priority, setPriority] = useState('Medium');
    const [schedule, setSchedule] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Filters, Search, Sort, Pagination ---
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("All");
    const [filterCategory, setFilterCategory] = useState("All");
    const [filterPriority, setFilterPriority] = useState("All");
    const [sortBy, setSortBy] = useState("date_desc");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 7;

    // --- Modal State ---
    const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
    const [viewImageUrl, setViewImageUrl] = useState<string | null>(null);

    // --- FETCH REAL DATA ---
    const fetchMyRequests = async () => {
        try {
            setIsLoading(true);
            const { data } = await api.get('/requests/my-requests');
            setRequests(data || []);
        } catch (error) {
            console.error("Failed to fetch requests:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMyRequests();
    }, []);

    // --- Derived Data for Summary & Table ---
    const summary = useMemo(() => {
        let pending = 0, progress = 0, resolved = 0;
        requests.forEach(r => {
            if (r.status === 'Pending') pending++;
            else if (r.status === 'In Progress') progress++;
            else if (r.status === 'Resolved') resolved++;
        });
        return { total: requests.length, pending, progress, resolved };
    }, [requests]);

    const filteredRequests = useMemo(() => {
        return requests.filter(r => {
            const matchesSearch = r.id.toString().includes(searchQuery) || r.title.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = filterStatus === "All" || r.status === filterStatus;
            const matchesCat = filterCategory === "All" || r.category === filterCategory;
            const matchesPri = filterPriority === "All" || r.priority === filterPriority;
            return matchesSearch && matchesStatus && matchesCat && matchesPri;
        }).sort((a, b) => {
            if (sortBy === 'date_desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            if (sortBy === 'date_asc') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            if (sortBy === 'priority_desc') return getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
            return 0;
        });
    }, [requests, searchQuery, filterStatus, filterCategory, filterPriority, sortBy]);

    const paginatedRequests = filteredRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);

    // --- HANDLERS ---
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormError("");
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            if (file.size > 5 * 1024 * 1024) return setFormError("Image exceeds 5MB limit.");
            setImageFile(file);
        }
    };

    const handleClearForm = () => {
        setTitle(''); setDescription(''); setCategory('Plumbing'); setPriority('Medium'); setSchedule(''); setImageFile(null); setFormError("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");
        if (!title.trim() || !description.trim()) return setFormError("Title and description are required.");
        
        try {
            setIsSubmitting(true);
            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            formData.append('category', category);
            formData.append('priority', priority);
            if (schedule) formData.append('schedule', schedule); 
            if (imageFile) formData.append('attachment', imageFile);

            await api.post('/requests', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            handleClearForm();
            await fetchMyRequests();
        } catch (error: any) {
            console.error("Failed to submit request:", error);
            setFormError(error.response?.data?.message || "Failed to submit request.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelRequest = async (id: number) => {
        try {
            await api.put(`/requests/${id}/cancel`);
            setRequests(prev => prev.map(req => req.id === id ? { ...req, status: 'Cancelled' } : req));
            setSelectedRequest(null);
        } catch (error) {
            console.error("Failed to cancel request", error);
        }
    };

    // --- UI Helpers ---
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Pending': return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400';
            case 'In Progress': return 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400';
            case 'Resolved': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400';
            case 'Cancelled': return 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400';
            default: return 'bg-slate-100 text-slate-700 dark:bg-zinc-500/10 dark:text-zinc-400';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'Urgent': return 'text-rose-600 dark:text-rose-400'; 
            case 'High': return 'text-orange-600 dark:text-orange-400'; 
            case 'Medium': return 'text-amber-600 dark:text-amber-400'; 
            case 'Low': return 'text-emerald-600 dark:text-emerald-400'; 
            default: return 'text-slate-600 dark:text-zinc-400';
        }
    };

    const containerVariants: Variants = { 
        hidden: { opacity: 0 }, 
        show: { opacity: 1, transition: { staggerChildren: 0.1 } } 
    };
    const itemVariants: Variants = { 
        hidden: { opacity: 0, y: 10 }, 
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } 
    };

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="w-full min-h-[calc(100vh-6rem)] flex flex-col font-sans text-slate-900 dark:text-white">
            
            {/* Header */}
            <motion.div variants={itemVariants} className="mb-8">
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    Facility Support
                </h1>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Submit maintenance requests and track their progress.</p>
            </motion.div>

            {/* Summary Dashboard */}
            <motion.div variants={itemVariants} className="grid grid-cols-4 gap-4 bg-card rounded-xl border border-slate-200 dark:border-zinc-800 p-6 shadow-sm mb-8">
                <div className="text-center sm:text-left border-r border-slate-200 dark:border-zinc-800 pr-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total</p>
                    <p className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white mt-1">{summary.total}</p>
                </div>
                <div className="text-center sm:text-left border-r border-slate-200 dark:border-zinc-800 px-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Pending</p>
                    <p className="text-2xl sm:text-3xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">{summary.pending}</p>
                </div>
                <div className="text-center sm:text-left border-r border-slate-200 dark:border-zinc-800 px-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">In Progress</p>
                    <p className="text-2xl sm:text-3xl font-black font-mono text-blue-600 dark:text-blue-400 mt-1">{summary.progress}</p>
                </div>
                <div className="text-center sm:text-left pl-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Resolved</p>
                    <p className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">{summary.resolved}</p>
                </div>
            </motion.div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Form Section */}
                <motion.div variants={itemVariants} className="col-span-1 lg:col-span-4 bg-card rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col h-fit overflow-hidden">
                    <div className="p-5 border-b border-slate-200 dark:border-zinc-800 bg-secondary/50 flex justify-between items-center">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg> 
                            File Request
                        </h2>
                        <button onClick={handleClearForm} className="text-xs font-bold uppercase text-slate-500 hover:text-rose-500 transition-colors">Clear</button>
                    </div>

                    <form id="maintenance-form" onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
                        {formError && <div className="p-3 bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 rounded-lg text-sm font-medium border border-rose-200 dark:border-rose-500/20">{formError}</div>}
                        
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-1.5">Issue Title</label>
                            <input type="text" required placeholder="E.g. Leaking Faucet" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-500 text-slate-900 dark:text-white" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-1.5">Category</label>
                                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-500 cursor-pointer text-slate-900 dark:text-white">
                                    <option value="Plumbing">Plumbing</option>
                                    <option value="Electrical">Electrical</option>
                                    <option value="Furniture">Furniture</option>
                                    <option value="Internet">Internet</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-1.5">Priority</label>
                                <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-500 cursor-pointer text-slate-900 dark:text-white">
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                    <option value="Urgent">Urgent</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-1.5">Description</label>
                            <textarea required rows={3} placeholder="Explain the issue..." value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-500 resize-none text-slate-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-zinc-300 mb-1.5">Pref. Schedule <span className="normal-case opacity-70 text-xs font-normal">(Optional)</span></label>
                            <input type="text" placeholder="E.g. Tomorrow morning" value={schedule} onChange={(e) => setSchedule(e.target.value)} className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-500 text-slate-900 dark:text-white" />
                        </div>
                        <div>
                            <div className="w-full border-2 border-dashed border-slate-200 dark:border-zinc-700 rounded-lg p-5 flex flex-col items-center cursor-pointer bg-secondary/30 hover:bg-secondary/50 transition-colors" onClick={() => fileInputRef.current?.click()}>
                                {imageFile ? (
                                    <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400 truncate w-full text-center">{imageFile.name}</span>
                                ) : (
                                    <span className="text-sm font-medium text-slate-500 flex flex-col items-center gap-2">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg> 
                                        Attach Image (Max 5MB)
                                    </span>
                                )}
                                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                            </div>
                        </div>

                        <button type="submit" form="maintenance-form" disabled={isSubmitting} className="w-full py-3 text-sm font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white mt-2 transition-colors disabled:opacity-70 flex items-center justify-center gap-2">
                            {isSubmitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                            {isSubmitting ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </form>
                </motion.div>

                {/* History Table */}
                <motion.div variants={itemVariants} className="col-span-1 lg:col-span-8 bg-card rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col min-h-[400px]">
                    
                    {/* Toolbar */}
                    <div className="p-5 border-b border-slate-200 dark:border-zinc-800 bg-secondary/50 rounded-t-xl flex flex-wrap gap-3 justify-between items-center">
                        <div className="relative flex-1 min-w-[200px]">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            <input type="text" placeholder="Search requests..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-indigo-500" />
                        </div>
                        
                        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500">
                            <option value="All">All Status</option>
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Resolved">Resolved</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                        
                        <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500">
                            <option value="All">All Categories</option>
                            <option value="Plumbing">Plumbing</option>
                            <option value="Electrical">Electrical</option>
                            <option value="Furniture">Furniture</option>
                            <option value="Internet">Internet</option>
                            <option value="Other">Other</option>
                        </select>

                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500">
                            <option value="date_desc">Newest First</option>
                            <option value="date_asc">Oldest First</option>
                            <option value="priority_desc">Priority (High-Low)</option>
                        </select>
                    </div>

                    {/* Table */}
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead className="bg-secondary/30">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest border-b border-slate-200 dark:border-zinc-800">ID / Date</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest border-b border-slate-200 dark:border-zinc-800">Issue</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest text-center border-b border-slate-200 dark:border-zinc-800">Priority</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest text-center border-b border-slate-200 dark:border-zinc-800">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest text-right border-b border-slate-200 dark:border-zinc-800">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50">
                                {isLoading ? (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-zinc-400">Loading requests...</td></tr>
                                ) : paginatedRequests.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-zinc-400">No requests match your filters.</td></tr>
                                ) : (
                                    paginatedRequests.map((r) => (
                                        <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-sm text-slate-900 dark:text-white">#{r.id.toString().padStart(4, '0')}</p>
                                                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{formatDate(r.created_at)}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[200px]" title={r.title}>{r.title}</p>
                                                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{r.category}</p>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`text-sm font-bold ${getPriorityColor(r.priority)}`}>{r.priority}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded ${getStatusColor(r.status)}`}>{r.status}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => setSelectedRequest(r)} className="p-1.5 rounded-md hover:bg-secondary text-slate-500 hover:text-indigo-600 transition-colors inline-block" title="View Details">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="p-4 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-secondary/30">
                        <span className="text-sm text-slate-500 dark:text-zinc-400">Page {currentPage} of {totalPages || 1}</span>
                        <div className="flex gap-2">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 bg-white dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-800 text-sm disabled:opacity-50 hover:bg-slate-50 transition-colors">Prev</button>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="px-3 py-1.5 bg-white dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-800 text-sm disabled:opacity-50 hover:bg-slate-50 transition-colors">Next</button>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* --- MODALS --- */}
            <AnimatePresence>
                {selectedRequest && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" 
                            onClick={() => setSelectedRequest(null)} 
                        />
                        <div className="fixed inset-0 flex items-center justify-center p-4 z-[101] pointer-events-none">
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} 
                                className="w-full max-w-lg bg-card rounded-xl shadow-xl border border-slate-200 dark:border-zinc-800 overflow-hidden pointer-events-auto flex flex-col max-h-[85vh]"
                            >
                                <div className="p-5 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-secondary/50">
                                    <div>
                                        <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">Request #{selectedRequest.id}</h2>
                                    </div>
                                    <button onClick={() => setSelectedRequest(null)} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500 transition-colors">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                    </button>
                                </div>
                                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedRequest.title}</h3>
                                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded ${getStatusColor(selectedRequest.status)}`}>{selectedRequest.status}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 bg-secondary px-2 py-1 rounded">{selectedRequest.category}</span>
                                            <span className={`text-xs font-bold ${getPriorityColor(selectedRequest.priority)}`}>{selectedRequest.priority} Priority</span>
                                        </div>
                                    </div>
                                    <div className="bg-secondary/30 p-4 rounded-lg text-sm leading-relaxed border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300">
                                        <p className="font-bold text-slate-500 text-xs uppercase tracking-widest mb-2">Description</p>
                                        {selectedRequest.description}
                                    </div>
                                    
                                    {/* Timeline */}
                                    <div className="border-l-2 border-slate-200 dark:border-zinc-800 ml-2 pl-4 py-1 space-y-4">
                                        <div className="relative">
                                            <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-zinc-600"></div>
                                            <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">{formatDate(selectedRequest.created_at)}</p>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white">Request Submitted</p>
                                        </div>
                                        {selectedRequest.status !== 'Pending' && selectedRequest.status !== 'Cancelled' && (
                                            <div className="relative">
                                                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                                                <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">Admin</p>
                                                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">In Progress</p>
                                                {selectedRequest.admin_notes && <p className="text-sm italic text-slate-600 dark:text-zinc-400 mt-1 bg-secondary/50 p-2 rounded">"{selectedRequest.admin_notes}"</p>}
                                            </div>
                                        )}
                                        {selectedRequest.status === 'Resolved' && (
                                            <div className="relative">
                                                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                                                <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">Admin</p>
                                                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Resolved</p>
                                            </div>
                                        )}
                                    </div>

                                    {selectedRequest.image_url && (
                                        <div>
                                            <p className="font-bold text-slate-500 text-xs uppercase tracking-widest mb-2">Attached Image</p>
                                            <img onClick={() => setViewImageUrl(selectedRequest.image_url || null)} src={selectedRequest.image_url} alt="Proof" className="w-32 h-32 object-cover rounded-lg cursor-zoom-in border border-slate-200 dark:border-zinc-800 hover:opacity-80 transition-opacity" />
                                        </div>
                                    )}
                                </div>
                                {selectedRequest.status === 'Pending' && (
                                    <div className="p-5 border-t border-slate-200 dark:border-zinc-800 bg-secondary/30">
                                        <button onClick={() => handleCancelRequest(selectedRequest.id)} className="w-full py-2.5 text-sm font-bold rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 transition-colors border border-rose-200 dark:border-rose-500/20">
                                            Cancel Request
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    </>
                )}
                {viewImageUrl && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200]" onClick={() => setViewImageUrl(null)} />
                        <div className="fixed inset-0 flex items-center justify-center p-4 z-[201] pointer-events-none">
                            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative pointer-events-auto">
                                <button onClick={() => setViewImageUrl(null)} className="absolute -top-12 right-0 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                                <img src={viewImageUrl} alt="Full size" className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-white/10" />
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>
        </motion.div>
    );
}