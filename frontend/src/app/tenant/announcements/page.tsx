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
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="w-full min-h-[calc(100vh-6rem)] flex flex-col font-sans text-slate-900 dark:text-white pb-8">
            {/* Header */}
            <motion.div variants={itemVariants} className="mb-8">
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                        <Bell className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    Notice Board
                </h1>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-2">Important updates and announcements from the management.</p>
            </motion.div>

            {/* List */}
            <motion.div variants={itemVariants} className="flex-1 space-y-4">
                {announcements.length === 0 ? (
                    <div className="text-center py-20 bg-card rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-zinc-800 flex items-center justify-center mb-4">
                            <Megaphone className="w-8 h-8 text-slate-400 dark:text-zinc-500" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">No Announcements</h3>
                        <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Check back later for news or updates.</p>
                    </div>
                ) : (
                    <AnimatePresence>
                        {announcements.map((ann) => {
                            const details = getTypeDetails(ann.type);
                            const Icon = details.icon;
                            
                            return (
                                <motion.div 
                                    variants={itemVariants}
                                    key={ann.id} 
                                    className="bg-card rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row gap-5"
                                >
                                    <div className="shrink-0 flex items-start">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${details.bg}`}>
                                            <Icon className={`w-6 h-6 ${details.color}`} />
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate pr-4">{ann.title}</h3>
                                            <span className={`self-start sm:self-auto px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${details.bg} ${details.color}`}>
                                                {ann.type}
                                            </span>
                                        </div>
                                        
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 text-xs font-semibold text-slate-500 dark:text-zinc-400">
                                            <div className="flex items-center gap-1.5">
                                                <User className="w-3.5 h-3.5" />
                                                {ann.created_by_name || 'Admin'}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {new Date(ann.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                                            </div>
                                        </div>
                                        
                                        <div className="text-sm font-medium text-slate-600 dark:text-zinc-300 leading-relaxed bg-slate-50 dark:bg-zinc-900/50 rounded-xl p-4 border border-slate-100 dark:border-zinc-800/50">
                                            {ann.content}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                )}
            </motion.div>
        </motion.div>
    );
}
