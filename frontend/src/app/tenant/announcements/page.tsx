"use client";
import { useEffect, useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import api from '@/lib/api';
import { Megaphone, Info, AlertTriangle, CheckCircle, Bell, Calendar, User } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";

interface Announcement {
    id: number;
    title: string;
    content: string;
    type: string;
    created_at: string;
    created_by_name: string;
}

export default function TenantAnnouncements() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

    const fetchAnnouncements = async () => {
        try {
            const { data } = await api.get('/tenant/announcements');
            setAnnouncements(data);
        } catch (error) {
            console.error("Failed to fetch announcements:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const getTypeDetails = (type: string) => {
        switch (type) {
            case 'Alert': return { icon: AlertTriangle, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10' };
            case 'Event': return { icon: Megaphone, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10' };
            case 'Success': return { icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' };
            default: return { icon: Info, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-500/10' };
        }
    };

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

    if (isLoading) {
        return (
            <div className="w-full flex flex-col font-sans">
                <div className="mb-8">
                    <Skeleton className="h-8 w-64 bg-slate-200 dark:bg-zinc-800 mb-2" />
                    <Skeleton className="h-4 w-96 bg-slate-200 dark:bg-zinc-800" />
                </div>
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-32 w-full rounded-2xl bg-slate-200 dark:bg-zinc-800" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="w-full h-[calc(100vh-6.5rem)] md:h-[calc(100vh-7.5rem)] flex flex-col font-sans text-slate-900 dark:text-white overflow-hidden pb-4">
            {/* Header */}
            <motion.div variants={itemVariants} className="mb-6 shrink-0">
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                        <Bell className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    Notice Board
                </h1>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-2">Important updates and announcements from the management.</p>
            </motion.div>

            {/* Grid */}
            <motion.div variants={itemVariants} className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 items-start content-start">
                {announcements.length === 0 ? (
                    <div className="col-span-full text-center py-20 bg-card rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-zinc-800 flex items-center justify-center mb-4">
                            <Megaphone className="w-8 h-8 text-slate-400 dark:text-zinc-500" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">No Announcements</h3>
                        <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Check back later for news or updates.</p>
                    </div>
                ) : (
                    <AnimatePresence>
                        {announcements.map((ann, index) => {
                            const details = getTypeDetails(ann.type);
                            const Icon = details.icon;
                            
                            return (
                                <motion.div 
                                    variants={itemVariants}
                                    key={ann.id} 
                                    className="bg-card rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4 h-full"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${details.bg}`}>
                                            <Icon className={`w-6 h-6 ${details.color}`} />
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${details.bg} ${details.color}`}>
                                            {ann.type}
                                        </span>
                                    </div>
                                    
                                    <div className="flex-1 flex flex-col min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1">{ann.title}</h3>
                                            {index === 0 && (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500 text-white shadow-sm tracking-widest leading-none shrink-0">New</span>
                                            )}
                                        </div>
                                        
                                        <div className="bg-slate-50 dark:bg-zinc-900/50 rounded-xl p-4 border border-slate-100 dark:border-zinc-800/50 mb-4 flex-1 flex flex-col items-start">
                                            <div className="text-sm font-medium text-slate-600 dark:text-zinc-300 leading-relaxed line-clamp-3">
                                                {ann.content}
                                            </div>
                                            {ann.content.length > 120 && (
                                                <button 
                                                    onClick={() => setSelectedAnnouncement(ann)}
                                                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline mt-2"
                                                >
                                                    View Full Text
                                                </button>
                                            )}
                                        </div>
                                        
                                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-500 dark:text-zinc-400 mt-auto">
                                            <div className="flex items-center gap-1.5">
                                                <User className="w-3.5 h-3.5" />
                                                {ann.created_by_name || 'Admin'}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {new Date(ann.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                )}
            </motion.div>

            {/* Modal */}
            <AnimatePresence>
                {selectedAnnouncement && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-5 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-start bg-secondary/50">
                                <div>
                                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider mb-3 inline-block ${getTypeDetails(selectedAnnouncement.type).bg} ${getTypeDetails(selectedAnnouncement.type).color}`}>
                                        {selectedAnnouncement.type}
                                    </span>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                                        {selectedAnnouncement.title}
                                    </h3>
                                </div>
                                <button onClick={() => setSelectedAnnouncement(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto custom-scrollbar">
                                <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-6 pb-6 border-b border-slate-100 dark:border-zinc-800/50">
                                    <div className="flex items-center gap-1.5">
                                        <User className="w-4 h-4" />
                                        {selectedAnnouncement.created_by_name || 'Admin'}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="w-4 h-4" />
                                        {new Date(selectedAnnouncement.created_at).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                                    </div>
                                </div>
                                <div className="text-sm font-medium text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                    {selectedAnnouncement.content}
                                </div>
                            </div>
                            <div className="p-5 border-t border-slate-200 dark:border-zinc-800 bg-secondary/50 flex justify-end">
                                <button 
                                    onClick={() => setSelectedAnnouncement(null)}
                                    className="px-5 py-2.5 rounded-xl text-sm font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
