"use client";
import { useEffect, useState, useRef, useMemo } from 'react';
import api from '@/lib/api';
import { motion, AnimatePresence, Variants } from 'framer-motion';

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
    const [filterPriority] = useState("All");
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
            case 'Pending': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
            case 'In Progress': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
            case 'Resolved': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
            case 'Cancelled': return 'bg-red-500/10 text-red-600 border-red-500/20';
            default: return 'bg-neutral-500/10 text-neutral-600 border-neutral-500/20';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'Urgent': return 'text-red-500'; case 'High': return 'text-orange-500'; case 'Medium': return 'text-amber-500'; case 'Low': return 'text-emerald-500'; default: return 'text-neutral-500';
        }
    };

    const containerVariants: Variants = { 
        hidden: { opacity: 0 }, 
        visible: { opacity: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.1, delayChildren: 0.05 } } 
    };
    const itemVariants: Variants = { 
        hidden: { opacity: 0, y: 20, filter: "blur(12px)" }, 
        visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } } 
    };

    return (
        <div className="flex-1 flex flex-col w-full text-neutral-900 dark:text-neutral-100 font-sans bg-transparent pb-16">
            {/* Page Transition Overlay */}
            <motion.div initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.5, ease: "easeInOut" }} className="absolute inset-0 z-[9999] bg-slate-50 dark:bg-[#050505] pointer-events-none" />
                                                <motion.div initial="hidden" animate="visible" variants={containerVariants} className="max-w-[1600px] mx-auto w-full h-full flex flex-col min-h-0 gap-1 sm:gap-5 pt-0 px-3 sm:px-8 pb-2 sm:pb-4 relative z-10">
                
                {/* --- HEADER --- */}
                <motion.header variants={itemVariants} className="sticky top-0 z-40 shrink-0 flex flex-row items-center justify-between h-14 bg-linear-to-b from-white/80 to-white/40 dark:from-[#050505]/80 dark:to-[#050505]/40 backdrop-blur-2xl -mx-3 px-4 sm:mx-0 sm:px-0 mb-1 sm:mb-0 transition-all">
                    <div className="flex flex-row items-center gap-2 sm:gap-4 h-full">
                        <h1 className="text-xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-neutral-900 via-indigo-800 to-neutral-900 dark:from-white dark:via-indigo-200 dark:to-white leading-none">
                            Facility Support
                        </h1>
                    </div>
                </motion.header>

                {/* --- SUMMARY DASHBOARD --- */}
                <motion.div variants={itemVariants} className="shrink-0 relative rounded-xl sm:rounded-2xl bg-white dark:bg-[#121212] backdrop-blur-2xl shadow-xl shadow-indigo-500/5 border border-neutral-200/50 dark:border-white/5 p-2 sm:p-4 overflow-hidden">
                                        <div className="relative z-10 grid grid-cols-4 divide-x divide-neutral-200/50 dark:divide-white/10">
                        <div className="px-1.5 sm:px-6 text-center sm:text-left"><p className="text-[9px] sm:text-xs font-bold text-neutral-500 uppercase tracking-widest">Total</p><p className="text-lg sm:text-3xl font-black font-mono leading-none mt-0.5 sm:mt-1">{summary.total}</p></div>
                        <div className="px-1.5 sm:px-6 text-center sm:text-left"><p className="text-[9px] sm:text-xs font-bold text-neutral-500 uppercase tracking-widest">Pending</p><p className="text-lg sm:text-3xl font-black font-mono text-amber-500 leading-none mt-0.5 sm:mt-1">{summary.pending}</p></div>
                        <div className="px-1.5 sm:px-6 text-center sm:text-left"><p className="text-[9px] sm:text-xs font-bold text-neutral-500 uppercase tracking-widest">In Progress</p><p className="text-lg sm:text-3xl font-black font-mono text-blue-500 leading-none mt-0.5 sm:mt-1">{summary.progress}</p></div>
                        <div className="px-1.5 sm:px-6 text-center sm:text-left"><p className="text-[9px] sm:text-xs font-bold text-neutral-500 uppercase tracking-widest">Resolved</p><p className="text-lg sm:text-3xl font-black font-mono text-emerald-500 leading-none mt-0.5 sm:mt-1">{summary.resolved}</p></div>
                    </div>
                </motion.div>

                {/* MAIN CONTENT GRID */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
                    {/* NEW REQUEST FORM */}
                    <motion.div variants={itemVariants} className="col-span-1 lg:col-span-4 relative rounded-xl sm:rounded-[2rem] bg-white dark:bg-[#121212] backdrop-blur-2xl shadow-xl shadow-indigo-500/5 border border-neutral-200/50 dark:border-white/5 overflow-hidden flex flex-col h-fit">
                                                <div className="relative z-10 shrink-0 p-4 sm:p-5 border-b border-neutral-200/50 dark:border-white/10 bg-neutral-50/50 dark:bg-[#18181a] backdrop-blur-2xl flex justify-between items-center">
                            <h2 className="text-base sm:text-lg font-bold flex items-center gap-1.5 sm:gap-2"><svg className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg> File Request</h2>
                            <button onClick={handleClearForm} className="text-xs font-bold uppercase tracking-widest text-neutral-500 hover:text-red-500 transition-colors">Clear</button>
                        </div>

                        <div className="relative z-10 flex-1 overflow-y-auto p-4 sm:p-5 [ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden overscroll-contain">
                            <form id="maintenance-form" onSubmit={handleSubmit} className="flex flex-col gap-3 sm:gap-4">
                                {formError && <div className="p-2.5 sm:p-3 bg-red-500/10 rounded-xl text-red-500 text-xs sm:text-sm font-bold">{formError}</div>}
                                
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5 ml-1">Issue Title</label>
                                    <input type="text" required placeholder="E.g. Leaking Faucet" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-white dark:bg-black/20 border border-neutral-200 dark:border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all shadow-sm text-neutral-900 dark:text-white" />
                                </div>
                                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5 ml-1">Category</label>
                                        <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-white dark:bg-black/20 border border-neutral-200 dark:border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all shadow-sm cursor-pointer text-neutral-900 dark:text-white">
                                            <option value="Plumbing" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Plumbing</option>
                                            <option value="Electrical" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Electrical</option>
                                            <option value="Furniture" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Furniture</option>
                                            <option value="Internet" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Internet</option>
                                            <option value="Other" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5 ml-1">Priority</label>
                                        <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full bg-white dark:bg-black/20 border border-neutral-200 dark:border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all shadow-sm cursor-pointer text-neutral-900 dark:text-white">
                                            <option value="Low" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Low</option>
                                            <option value="Medium" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Medium</option>
                                            <option value="High" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">High</option>
                                            <option value="Urgent" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Urgent</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5 ml-1">Description</label>
                                    <textarea required rows={3} placeholder="Explain the issue..." value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-white dark:bg-black/20 border border-neutral-200 dark:border-white/10 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all shadow-sm resize-none text-neutral-900 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1.5 ml-1">Pref. Schedule <span className="normal-case opacity-70">(Opt)</span></label>
                                    <input type="text" placeholder="E.g. Tomorrow morning" value={schedule} onChange={(e) => setSchedule(e.target.value)} className="w-full bg-white dark:bg-black/20 border border-neutral-200 dark:border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all shadow-sm text-neutral-900 dark:text-white" />
                                </div>
                                <div className="mt-1">
                                    <div className="w-full border-2 border-dashed border-neutral-200 dark:border-white/10 hover:border-indigo-400 rounded-xl p-3 sm:p-5 flex flex-col items-center cursor-pointer bg-neutral-50/50 dark:bg-white/[0.02] transition-colors" onClick={() => fileInputRef.current?.click()}>
                                        {imageFile ? (
                                            <span className="text-xs font-bold text-indigo-500 truncate px-2">{imageFile.name}</span>
                                        ) : (
                                            <span className="text-xs font-bold text-neutral-400 flex items-center gap-1.5 sm:gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg> Attach Image (Max 5MB)</span>
                                        )}
                                        <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                    </div>
                                </div>
                            </form>
                        </div>
                        
                        <div className="relative z-10 shrink-0 p-4 sm:p-5 border-t border-neutral-200/50 dark:border-white/10 bg-neutral-50/50 dark:bg-[#18181a] backdrop-blur-2xl">
                            <button type="submit" form="maintenance-form" disabled={isSubmitting} className={`w-full py-2.5 sm:py-3.5 text-xs sm:text-sm font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${isSubmitting ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 active:scale-95'}`}>
                                {isSubmitting && <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-current/30 border-t-current rounded-full animate-spin"></div>}
                                {isSubmitting ? 'Submitting...' : 'Submit Request'}
                            </button>
                        </div>
                    </motion.div>

                    {/* HISTORY TABLE & FILTERS (Right Side) */}
                    <motion.div variants={itemVariants} className="col-span-1 lg:col-span-8 relative bg-white dark:bg-[#121212] rounded-xl sm:rounded-[2rem] border border-neutral-200/50 dark:border-white/5 backdrop-blur-2xl shadow-xl shadow-indigo-500/5 flex flex-col min-h-[400px] sm:min-h-[650px] overflow-hidden">
                        
                        {/*-- Toolbar --*/}
                        <div className="relative z-10 shrink-0 p-3 sm:p-4 border-b border-neutral-200/50 dark:border-white/10 bg-neutral-50/50 dark:bg-[#18181a] backdrop-blur-2xl flex flex-wrap lg:flex-nowrap items-center gap-2 sm:gap-3 justify-between">
                            
                            <div className="relative flex-1 min-w-[130px] lg:flex-none lg:w-48 h-9 sm:h-10 flex items-center">
                                <svg className="absolute left-2.5 sm:left-3.5 w-3 h-3 sm:w-4 sm:h-4 text-neutral-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-full bg-white dark:bg-black/20 border border-neutral-200 dark:border-white/10 rounded-lg sm:rounded-xl pl-8 sm:pl-10 pr-2 sm:pr-3 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 text-neutral-900 dark:text-white m-0" />
                            </div>
                            
                            <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }} className="flex-1 min-w-[90px] lg:flex-none h-9 sm:h-10 bg-white dark:bg-black/20 border border-neutral-200 dark:border-white/10 rounded-lg sm:rounded-xl px-2 sm:px-3 text-xs sm:text-sm outline-none cursor-pointer text-neutral-900 dark:text-white shrink-0 m-0">
                                <option value="All" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Status</option>
                                <option value="Pending" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Pending</option>
                                <option value="In Progress" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">In Progress</option>
                                <option value="Resolved" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Resolved</option>
                                <option value="Cancelled" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Cancelled</option>
                            </select>
                            
                            <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }} className="flex-1 min-w-[100px] lg:flex-none h-9 sm:h-10 bg-white dark:bg-black/20 border border-neutral-200 dark:border-white/10 rounded-lg sm:rounded-xl px-2 sm:px-3 text-xs sm:text-sm outline-none cursor-pointer text-neutral-900 dark:text-white shrink-0 m-0">
                                <option value="All" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Category</option>
                                <option value="Plumbing" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Plumbing</option>
                                <option value="Electrical" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Electrical</option>
                                <option value="Furniture" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Furniture</option>
                                <option value="Internet" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Internet</option>
                                <option value="Other" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Other</option>
                            </select>

                            <div className="w-full lg:w-auto flex items-center justify-between lg:justify-end lg:ml-auto gap-2 sm:gap-3 shrink-0">
                                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="flex-1 lg:flex-none h-9 sm:h-10 bg-white dark:bg-black/20 border border-neutral-200 dark:border-white/10 rounded-lg sm:rounded-xl px-2 sm:px-3 text-xs sm:text-sm outline-none cursor-pointer text-neutral-900 dark:text-white shrink-0 m-0">
                                    <option value="date_desc" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Newest</option>
                                    <option value="date_asc" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Oldest</option>
                                    <option value="priority_desc" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Priority</option>
                                </select>
                            </div>
                        </div>

                        {/*-- Table / Mobile Cards Body --*/}
                        <div className="relative z-10 flex-1 overflow-y-auto overflow-x-auto overscroll-contain scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700">
                            {/* Desktop Table View */}
                            <table className="hidden lg:table w-full text-left border-collapse min-w-[700px]">
                                <thead className="sticky top-0 z-20 bg-linear-to-b from-white/90 to-white/70 dark:from-[#121212]/90 dark:to-[#0a0a0a]/90 backdrop-blur-2xl shadow-sm">
                                    <tr>
                                        <th className="px-4 py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest">ID / Date</th>
                                        <th className="px-4 py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest">Issue</th>
                                        <th className="px-4 py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest text-center">Priority</th>
                                        <th className="px-4 py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest text-center">Status</th>
                                        <th className="px-4 py-4 text-xs font-bold text-neutral-400 uppercase tracking-widest text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-200/30 dark:divide-white/5">
                                    {isLoading ? (
                                        <tr><td colSpan={5} className="px-4 py-20 text-center"><div className="w-10 h-10 mx-auto border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div></td></tr>
                                    ) : paginatedRequests.length === 0 ? (
                                        <tr><td colSpan={5} className="px-4 py-20 text-center text-neutral-500 text-sm">No requests found.</td></tr>
                                    ) : (
                                        paginatedRequests.map((r) => (
                                            <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="group hover:bg-white/40 dark:hover:bg-white/[0.02] transition-all duration-300">
                                                <td className="px-4 py-3 align-middle">
                                                    <p className="font-bold text-sm text-neutral-900 dark:text-white">#{r.id.toString().padStart(4, '0')}</p>
                                                    <p className="text-xs font-mono text-neutral-400 mt-0.5">{formatDate(r.created_at)}</p>
                                                </td>
                                                <td className="px-4 py-3 align-middle min-w-0">
                                                    <p className="text-base font-bold truncate max-w-[200px] text-neutral-900 dark:text-white" title={r.title}>{r.title}</p>
                                                    <p className="text-xs text-neutral-500 mt-0.5">{r.category}</p>
                                                </td>
                                                <td className="px-4 py-3 align-middle text-center">
                                                    <span className={`text-sm font-bold ${getPriorityColor(r.priority)}`}>{r.priority}</span>
                                                </td>
                                                <td className="px-4 py-3 align-middle text-center">
                                                    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-bold uppercase tracking-widest rounded-full border ${getStatusColor(r.status)}`}>{r.status}</span>
                                                </td>
                                                <td className="px-4 py-3 align-middle text-right">
                                                    <button onClick={() => setSelectedRequest(r)} className="p-1.5 rounded bg-neutral-100 dark:bg-white/5 hover:text-indigo-600 transition-colors text-neutral-500" title="View Details">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                                    </button>
                                                </td>
                                            </motion.tr>
                                        ))
                                    )}
                                </tbody>
                            </table>

                            {/* Responsive Mobile Cards View */}
                            <div className="block lg:hidden space-y-3 px-3 py-2">
                                {isLoading ? (
                                    <div className="py-12 text-center"><div className="w-8 h-8 mx-auto border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div></div>
                                ) : paginatedRequests.length === 0 ? (
                                    <div className="py-12 text-center text-neutral-500 text-xs">No requests found.</div>
                                ) : (
                                    paginatedRequests.map((r) => (
                                        <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl bg-white dark:bg-[#121212] border border-white/40 dark:border-white/5 flex flex-col gap-3 relative overflow-hidden">
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r-full"></div>
                                            <div className="flex justify-between items-start pl-1">
                                                <div>
                                                    <p className="font-bold text-xs text-neutral-900 dark:text-white">#{r.id.toString().padStart(4, '0')}</p>
                                                    <p className="text-[10px] font-mono text-neutral-400 mt-0.5">{formatDate(r.created_at)}</p>
                                                </div>
                                                <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded-full border ${getStatusColor(r.status)}`}>
                                                    {r.status}
                                                </span>
                                            </div>
                                            <div className="pl-1">
                                                <h4 className="text-sm font-bold text-neutral-900 dark:text-white truncate" title={r.title}>{r.title}</h4>
                                                <p className="text-[10px] text-neutral-500 mt-0.5">{r.category}</p>
                                            </div>
                                            <div className="flex justify-between items-center border-t border-neutral-200/30 dark:border-white/5 pt-2.5 pl-1">
                                                <div>
                                                    <span className={`text-[10px] font-bold ${getPriorityColor(r.priority)}`}>{r.priority} Priority</span>
                                                </div>
                                                <button onClick={() => setSelectedRequest(r)} className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs border border-indigo-200/50 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/30 transition-colors">
                                                    View Details
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Pagination Footer */}
                        <div className="relative z-10 shrink-0 p-3 sm:p-4 border-t border-neutral-200/50 dark:border-white/10 bg-neutral-50/50 dark:bg-[#18181a] backdrop-blur-2xl flex justify-between items-center">
                            <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-2">Page {currentPage} of {totalPages || 1}</span>
                            <div className="flex gap-2">
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-2.5 py-1.5 bg-white dark:bg-white/5 rounded-xl border border-neutral-200 dark:border-white/10 text-xs disabled:opacity-50 text-neutral-900 dark:text-white">Prev</button>
                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="px-2.5 py-1.5 bg-white dark:bg-white/5 rounded-xl border border-neutral-200 dark:border-white/10 text-xs disabled:opacity-50 text-neutral-900 dark:text-white">Next</button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </motion.div>

            {/* --- MODALS --- */}
            <AnimatePresence>
                {selectedRequest && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                            className="fixed inset-0 bg-neutral-900/60 dark:bg-black/70 backdrop-blur-sm z-[100]" 
                            onClick={() => setSelectedRequest(null)} 
                        />
                        <div className="fixed inset-0 flex items-center justify-center p-4 z-[101] pointer-events-none">
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} 
                                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                className="w-full max-w-lg bg-white dark:bg-[#18181B] rounded-3xl sm:rounded-4xl shadow-2xl border border-neutral-200 dark:border-white/10 overflow-hidden pointer-events-auto flex flex-col max-h-[85vh]"
                            >
                                <div className="p-4 sm:p-6 border-b border-neutral-100 dark:border-white/5 flex justify-between items-center bg-neutral-50/50 dark:bg-white/[0.02] shrink-0">
                                    <div>
                                        <h2 className="text-sm sm:text-lg font-bold flex items-center gap-2 text-neutral-900 dark:text-white">Request #{selectedRequest.id}</h2>
                                        <span className={`inline-flex mt-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1 text-[9px] sm:text-xs font-bold uppercase tracking-widest rounded-full border ${getStatusColor(selectedRequest.status)}`}>{selectedRequest.status}</span>
                                    </div>
                                    <button onClick={() => setSelectedRequest(null)} className="p-1.5 rounded-full hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-500 transition-colors">
                                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                    </button>
                                </div>
                                <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto [ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden overscroll-contain">
                                    <div>
                                        <h3 className="text-base sm:text-xl font-bold text-neutral-900 dark:text-white">{selectedRequest.title}</h3>
                                        <div className="flex items-center gap-2 sm:gap-3 mt-1.5">
                                            <span className="text-[10px] sm:text-xs font-bold text-neutral-500 bg-neutral-100 dark:bg-white/5 px-2 py-0.5 rounded">{selectedRequest.category}</span>
                                            <span className={`text-[10px] sm:text-xs font-bold ${getPriorityColor(selectedRequest.priority)}`}>{selectedRequest.priority} Priority</span>
                                        </div>
                                    </div>
                                    <div className="bg-neutral-50 dark:bg-black/20 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-xs sm:text-base leading-relaxed border border-neutral-100 dark:border-white/5 text-neutral-900 dark:text-white">
                                        <p className="font-semibold text-neutral-500 text-[10px] sm:text-xs uppercase tracking-widest mb-1">Description</p>
                                        {selectedRequest.description}
                                    </div>
                                    
                                    {/* Timeline Simulator */}
                                    <div className="border-l-2 border-indigo-500/30 ml-2 pl-3 sm:pl-4 py-1 space-y-3 sm:space-y-4">
                                        <div className="relative">
                                            <div className="absolute -left-[15px] sm:-left-[21px] top-1 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-indigo-500"></div>
                                            <p className="text-[10px] sm:text-xs font-bold text-neutral-400">{formatDate(selectedRequest.created_at)}</p>
                                            <p className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white">Request Submitted</p>
                                        </div>
                                        {selectedRequest.status !== 'Pending' && selectedRequest.status !== 'Cancelled' && (
                                            <div className="relative">
                                                <div className="absolute -left-[15px] sm:-left-[21px] top-1 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-blue-500"></div>
                                                <p className="text-[10px] sm:text-xs font-bold text-neutral-400">Admin</p>
                                                <p className="text-xs sm:text-sm font-semibold text-blue-500 dark:text-blue-400">In Progress</p>
                                                {selectedRequest.admin_notes && <p className="text-[10px] sm:text-xs italic text-neutral-500 mt-0.5 sm:mt-1">"{selectedRequest.admin_notes}"</p>}
                                            </div>
                                        )}
                                        {selectedRequest.status === 'Resolved' && (
                                            <div className="relative">
                                                <div className="absolute -left-[15px] sm:-left-[21px] top-1 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500"></div>
                                                <p className="text-[10px] sm:text-xs font-bold text-neutral-400">Admin</p>
                                                <p className="text-xs sm:text-sm font-semibold text-emerald-500">Resolved</p>
                                            </div>
                                        )}
                                    </div>

                                    {selectedRequest.image_url && (
                                        <div>
                                            <p className="font-semibold text-neutral-500 text-[10px] sm:text-xs uppercase tracking-widest mb-1.5 sm:mb-2">Attached Image</p>
                                            <img onClick={() => setViewImageUrl(selectedRequest.image_url || null)} src={selectedRequest.image_url} alt="Proof" className="w-20 sm:w-32 h-20 sm:h-32 object-cover rounded-xl cursor-zoom-in border border-neutral-200 dark:border-white/10 hover:opacity-80 transition-opacity" />
                                        </div>
                                    )}
                                </div>
                                {selectedRequest.status === 'Pending' && (
                                    <div className="p-3 sm:p-5 border-t border-neutral-100 dark:border-white/5 shrink-0 bg-neutral-50/50 dark:bg-white/[0.02]">
                                        <button onClick={() => handleCancelRequest(selectedRequest.id)} className="w-full py-2 sm:py-3 text-xs sm:text-sm font-bold uppercase tracking-widest rounded-lg sm:rounded-xl bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors border border-red-500/20">
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
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200]" onClick={() => setViewImageUrl(null)} />
                        <div className="fixed inset-0 flex items-center justify-center p-4 z-[201] pointer-events-none">
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative pointer-events-auto">
                                <button onClick={() => setViewImageUrl(null)} className="absolute -top-10 sm:-top-12 right-0 p-1.5 sm:p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-colors"><svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                                <img src={viewImageUrl} alt="Full size" className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10" />
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}