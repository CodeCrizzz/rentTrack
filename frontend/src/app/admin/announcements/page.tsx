"use client";
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { Skeleton } from "@/components/ui/skeleton";
import { 
    Plus, Trash2, Megaphone, Info, AlertTriangle, CheckCircle, Bell
} from 'lucide-react';

interface Announcement {
    id: number;
    title: string;
    content: string;
    type: string;
    created_at: string;
    created_by_name: string;
}

export default function AdminAnnouncements() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showModal, setShowModal] = useState(false);

    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [newType, setNewType] = useState('Info');

    const fetchAnnouncements = async () => {
        try {
            const { data } = await api.get('/admin/announcements');
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

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { data } = await api.post('/admin/announcements', {
                title: newTitle,
                content: newContent,
                type: newType
            });
            setAnnouncements([data.announcement, ...announcements]);
            setShowModal(false);
            setNewTitle('');
            setNewContent('');
            setNewType('Info');
        } catch (error) {
            console.error("Failed to create announcement:", error);
            alert("Failed to create announcement. Check console for details.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this announcement?')) return;
        try {
            await api.delete(`/admin/announcements/${id}`);
            setAnnouncements(announcements.filter(a => a.id !== id));
        } catch (error) {
            console.error("Failed to delete announcement:", error);
            alert("Failed to delete announcement.");
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'Alert': return <AlertTriangle className="w-5 h-5 text-rose-500" />;
            case 'Event': return <Megaphone className="w-5 h-5 text-indigo-500" />;
            case 'Success': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
            default: return <Info className="w-5 h-5 text-cyan-500" />;
        }
    };

    if (isLoading) {
        return (
            <div className="max-w-[1600px] mx-auto w-full h-full min-h-[70vh] flex flex-col pt-4 space-y-8 animate-in fade-in duration-500">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-2">
                            <Skeleton className="h-10 w-[200px] md:w-[300px] bg-slate-200 dark:bg-zinc-800" />
                            <Skeleton className="h-4 w-[150px] md:w-[200px] bg-slate-200 dark:bg-zinc-800" />
                        </div>
                        <Skeleton className="h-10 w-[100px] md:w-[120px] rounded-full bg-slate-200 dark:bg-zinc-800" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-[120px] md:h-[140px] w-full rounded-2xl bg-slate-200 dark:bg-zinc-800" />
                    ))}
                </div>
                <div className="flex-1 w-full rounded-[2.5rem] bg-slate-200/50 dark:bg-zinc-800/50 border border-slate-200/60 dark:border-zinc-800/60 p-6 md:p-8 space-y-6">
                    <div className="flex items-center justify-between mb-8">
                        <Skeleton className="h-8 w-[150px] bg-slate-200 dark:bg-zinc-800" />
                        <Skeleton className="h-8 w-[200px] rounded-full bg-slate-200 dark:bg-zinc-800" />
                    </div>
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full rounded-xl bg-slate-200 dark:bg-zinc-800" />
                        ))}
                    </div>
                </div>
                <span className="sr-only">Loading Announcements</span>
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full flex flex-col h-[calc(100vh-9rem)] text-slate-900 dark:text-white">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2 border-b border-slate-200 dark:border-white/5 pb-6 mb-6 shrink-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                        <Bell className="w-8 h-8 text-emerald-500" />
                        Notice Board
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Broadcast messages to all your tenants.</p>
                </div>
                <button 
                    onClick={() => setShowModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
                >
                    <Plus className="w-5 h-5" />
                    New Announcement
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-6">
                {announcements.length === 0 ? (
                    <div className="text-center py-20 bg-card rounded-2xl border border-slate-100 dark:border-zinc-800">
                        <Megaphone className="w-12 h-12 text-slate-300 dark:text-zinc-600 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-700 dark:text-zinc-300">No Announcements</h3>
                        <p className="text-sm text-slate-500 dark:text-zinc-500 mt-1">Create one to notify your tenants about news or updates.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                        {announcements.map((ann) => (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={ann.id} 
                                className="bg-card rounded-2xl border border-slate-100 dark:border-zinc-800 p-5 md:p-6 shadow-sm relative group overflow-hidden flex flex-col h-full"
                            >
                                <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <button onClick={() => handleDelete(ann.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors bg-card shadow-sm border border-slate-100 dark:border-zinc-800">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="shrink-0 p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                        {getTypeIcon(ann.type)}
                                    </div>
                                    <div className="flex-1 min-w-0 pr-8">
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white truncate">{ann.title}</h3>
                                        <div className="flex items-center mt-1.5">
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-zinc-300">
                                                {ann.type}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex-1 text-sm text-slate-600 dark:text-zinc-300 whitespace-pre-line leading-relaxed mb-6">
                                    <p className="line-clamp-4">{ann.content}</p>
                                </div>
                                
                                <div className="mt-auto pt-4 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wide">
                                    <span className="flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                        {ann.created_by_name || 'Admin'}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                        {new Date(ann.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden"
                        >
                            <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50 dark:bg-white/[0.02]">
                                <h2 className="font-bold text-lg text-slate-800 dark:text-white">Create Announcement</h2>
                                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">&times;</button>
                            </div>
                            <form onSubmit={handleCreate} className="p-6 space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">Title</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={newTitle}
                                        onChange={(e) => setNewTitle(e.target.value)}
                                        className="w-full bg-background border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                        placeholder="e.g. Scheduled Water Interruption"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">Type</label>
                                    <select 
                                        value={newType}
                                        onChange={(e) => setNewType(e.target.value)}
                                        className="w-full bg-background border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                    >
                                        <option value="Info">Info</option>
                                        <option value="Event">Event</option>
                                        <option value="Alert">Alert</option>
                                        <option value="Success">Success</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">Message</label>
                                    <textarea 
                                        required
                                        value={newContent}
                                        onChange={(e) => setNewContent(e.target.value)}
                                        rows={5}
                                        className="w-full bg-background border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
                                        placeholder="Type your message here..."
                                    ></textarea>
                                </div>
                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-zinc-800">
                                    <button 
                                        type="button" 
                                        onClick={() => setShowModal(false)}
                                        className="px-5 py-2 text-sm font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={isSubmitting}
                                        className="px-5 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors shadow-md disabled:opacity-50 flex items-center justify-center min-w-[100px]"
                                    >
                                        {isSubmitting ? 'Posting...' : 'Post Notice'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
