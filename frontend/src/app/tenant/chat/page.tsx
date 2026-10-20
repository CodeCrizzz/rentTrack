"use client";
import { useEffect, useState, useRef } from 'react';
import api from '@/lib/api';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// --- MESSAGE DATA STRUCTURE ---
interface ChatMessage {
    id?: number;
    message: string;
    sender_type: 'tenant' | 'admin';
    created_at: string;
    status?: 'Sent' | 'Delivered' | 'Seen';
}

export default function TenantChat() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    
    const scrollRef = useRef<HTMLDivElement>(null);
    const isAtBottom = useRef(true);

    // --- MAINTENANCE MODAL STATE ---
    const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
    const [maintenanceTitle, setMaintenanceTitle] = useState('');
    const [maintenanceDesc, setMaintenanceDesc] = useState('');
    const [maintenanceCategory, setMaintenanceCategory] = useState('Plumbing');
    const [maintenancePriority, setMaintenancePriority] = useState('Medium');
    const [maintenanceImage, setMaintenanceImage] = useState<File | null>(null);
    const [isSubmittingMaintenance, setIsSubmittingMaintenance] = useState(false);

    const closeMaintenanceModal = () => {
        setShowMaintenanceModal(false);
        setMaintenanceTitle('');
        setMaintenanceDesc('');
        setMaintenanceCategory('Plumbing');
        setMaintenancePriority('Medium');
        setMaintenanceImage(null);
    };

    const handleMaintenanceSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!maintenanceTitle.trim() || !maintenanceDesc.trim()) return;
        try {
            setIsSubmittingMaintenance(true);
            const formData = new FormData();
            formData.append('title', maintenanceTitle);
            formData.append('description', maintenanceDesc);
            formData.append('category', maintenanceCategory);
            formData.append('priority', maintenancePriority);
            if (maintenanceImage) formData.append('attachment', maintenanceImage);

            const res = await api.post('/requests', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            // Format special message with request ID if available
            const newReqId = res.data?.request?.id;
            const specialMessage = newReqId 
                ? `[MAINTENANCE_REQUEST#${newReqId}] ${maintenanceTitle}` 
                : `[MAINTENANCE_REQUEST] ${maintenanceTitle}`;
            
            // Send the message
            await api.post('/tenant/chat', { message: specialMessage });
            fetchMessages();

            closeMaintenanceModal();
        } catch (error) {
            console.error("Failed to submit maintenance:", error);
        } finally {
            setIsSubmittingMaintenance(false);
        }
    };

    // --- HANDLE MANUAL SCROLL ---
    const handleScroll = () => {
        if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            isAtBottom.current = scrollHeight - scrollTop - clientHeight < 100;
        }
    };

    // --- FETCH MESSAGES ---
    const fetchMessages = async () => {
        try {
            const { data } = await api.get('/tenant/chat');
            // Ensure status exists for UI purposes
            const formattedData = data.map((msg: any, index: number) => {
                let mockStatus = 'Seen';
                if (msg.sender_type === 'tenant' && index === data.length - 1) {
                    mockStatus = 'Delivered'; // Admin is mocked as online
                }
                return {
                    ...msg,
                    status: msg.status || mockStatus
                };
            });
            setMessages(formattedData);
        } catch (error) {
            console.error("Failed to fetch messages:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Real-time polling
    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 3000); // Poll every 3 seconds
        return () => clearInterval(interval);
    }, []);

    // --- AUTO SCROLL TO BOTTOM ---
    useEffect(() => {
        if (isAtBottom.current && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            const timer = setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [messages]);

    // --- SEND MESSAGE ---
    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        // Optimistic UI update for instant feedback
        const optimisticMsg: ChatMessage = {
            message: newMessage,
            sender_type: 'tenant',
            created_at: new Date().toISOString(),
            status: 'Sent'
        };
        
        setMessages(prev => [...prev, optimisticMsg]);
        setNewMessage('');
        
        // Force scroll to bottom when tenant sends a message
        isAtBottom.current = true;
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }

        try {
            await api.post('/tenant/chat', { message: optimisticMsg.message });
            fetchMessages();
        } catch (error) {
            console.error("Failed to send message:", error);
        }
    };

    // --- FORMAT TIME ---
    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="w-full h-[calc(100vh-6.5rem)] md:h-[calc(100vh-7.5rem)] flex flex-col font-sans text-slate-900 dark:text-white overflow-hidden">
            
            {/* Header */}
            <motion.div variants={itemVariants} className="mb-6 shrink-0 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        Chat Support
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Message the admin for assistance.</p>
                </div>
                <button 
                    onClick={() => setShowMaintenanceModal(true)}
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-colors shadow-sm"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    Request Maintenance
                </button>
            </motion.div>

            {/* Chat Container */}
            <motion.div variants={itemVariants} className="flex-1 bg-card rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col overflow-hidden min-h-0">
                
                {/* 1. CHAT HEADER */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-zinc-800 bg-secondary/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-200 font-bold text-lg">
                            BA
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                Boarding Admin
                            </h2>
                            <p className="text-xs font-medium text-slate-600 dark:text-zinc-400 flex items-center gap-1.5">
                                <span className="relative flex h-2 w-2">
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-900 dark:bg-white"></span>
                                </span>
                                Online
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2. CHAT WINDOW (Messages) */}
                <div 
                    ref={scrollRef} 
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar flex flex-col"
                >
                    <div className="flex-1 min-h-0"></div>
                    <AnimatePresence mode="popLayout">
                        {isLoading ? (
                            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center gap-4">
                                <div className="text-sm text-slate-500 dark:text-zinc-400">Loading messages...</div>
                            </motion.div>
                        ) : messages.length === 0 ? (
                            <motion.div key="empty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="h-full flex items-center justify-center">
                                <div className="text-center max-w-sm">
                                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">How can we help?</h4>
                                    <p className="text-sm text-slate-500 dark:text-zinc-400">Send a message to our boarding admin team. We typically reply quickly.</p>
                                </div>
                            </motion.div>
                        ) : (
                            messages.map((msg, index) => (
                                <motion.div 
                                    key={index} 
                                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ duration: 0.2 }}
                                    className={`flex w-full ${msg.sender_type === 'tenant' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`flex flex-col max-w-[85%] sm:max-w-[70%] lg:max-w-[60%] ${msg.sender_type === 'tenant' ? 'items-end' : 'items-start'} group`}>
                                        
                                        {/* Message Bubble */}
                                        <div className="relative flex items-end gap-2">
                                            {msg.sender_type === 'admin' && (
                                                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 flex-shrink-0 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-zinc-200">
                                                    BA
                                                </div>
                                            )}
                                            <div className={`px-4 py-3 text-sm leading-relaxed ${
                                                msg.sender_type === 'tenant' 
                                                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 rounded-2xl rounded-br-sm' 
                                                    : 'bg-secondary text-slate-900 dark:text-white rounded-2xl rounded-bl-sm border border-slate-200 dark:border-zinc-800'
                                            }`}>
                                                {msg.message.startsWith('[MAINTENANCE_REQUEST') ? (
                                                    <div className="flex flex-col gap-2 min-w-[200px]">
                                                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-80 border-b border-white/20 pb-2 mb-1">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                                            Maintenance Request
                                                        </div>
                                                        <span className="font-semibold text-base">{msg.message.replace(/^\[MAINTENANCE_REQUEST(#[0-9]+)?\]\s*/i, '')}</span>
                                                        <a href="/tenant/rooms" className="inline-flex items-center gap-1 text-xs font-medium mt-1 hover:underline">
                                                            View in Rooms <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                                        </a>
                                                    </div>
                                                ) : (
                                                    msg.message
                                                )}
                                            </div>
                                        </div>

                                        {/* Message Details (Time & Status) */}
                                        <div className={`flex items-center gap-1.5 mt-1.5 text-xs text-slate-500 dark:text-zinc-400 ${msg.sender_type === 'tenant' ? 'justify-end pr-1' : 'justify-start pl-11'}`}>
                                            <span>{formatTime(msg.created_at)}</span>
                                            
                                            {/* Status Indicator (Only show for sent messages) */}
                                            {msg.sender_type === 'tenant' && (
                                                <div className="flex items-center">
                                                    <span className={`flex items-center gap-1.5 ${msg.status?.toLowerCase() === 'seen' ? 'text-zinc-900 dark:text-white font-bold' : 'text-slate-400'}`}>
                                                        {msg.status?.toLowerCase() === 'sent' && <><span className="text-[10px] font-bold uppercase tracking-wide">Sent</span><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg></>}
                                                        {msg.status?.toLowerCase() === 'delivered' && <><span className="text-[10px] font-bold uppercase tracking-wide">Delivered</span><div className="flex -space-x-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg></div></>}
                                                        {msg.status?.toLowerCase() === 'seen' && <><span className="text-[10px] font-bold uppercase tracking-wide">Seen</span><div className="flex -space-x-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg></div></>}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>

                {/* 3. SEND MESSAGE SECTION */}
                <div className="p-4 border-t border-slate-200 dark:border-zinc-800 bg-secondary/50 shrink-0">
                    <form onSubmit={handleSend} className="flex gap-3 items-end w-full">
                        {/* Text Input Container */}
                        <div className="flex-1 relative bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 focus-within:border-zinc-400 dark:focus-within:border-zinc-600 transition-colors flex items-center min-h-[48px] overflow-hidden">
                            <input 
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type your message..." 
                                className="w-full bg-transparent border-none text-sm text-slate-900 dark:text-white px-4 py-3 outline-none"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        if (newMessage.trim() && !isLoading) {
                                        }
                                    }
                                }}
                            />
                        </div>

                        {/* Send Button */}
                        <button 
                            type="submit" 
                            disabled={!newMessage.trim() || isLoading}
                            className="w-12 h-12 flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 rounded-xl transition-colors disabled:opacity-50 shrink-0"
                        >
                            <svg className="w-5 h-5 -ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path></svg>
                        </button>
                    </form>
                </div>
            </motion.div>

            {/* Maintenance Request Modal */}
            <AnimatePresence>
                {showMaintenanceModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-card border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-5 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center bg-secondary/50">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <svg className="w-5 h-5 text-slate-500 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                    Request Maintenance
                                </h3>
                                <button onClick={closeMaintenanceModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>
                            <div className="p-5 overflow-y-auto">
                                <form id="maintenanceForm" onSubmit={handleMaintenanceSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1">Issue Title</label>
                                        <input 
                                            type="text" 
                                            value={maintenanceTitle}
                                            onChange={e => setMaintenanceTitle(e.target.value)}
                                            placeholder="e.g. Leaking Faucet"
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1">Description</label>
                                        <textarea 
                                            value={maintenanceDesc}
                                            onChange={e => setMaintenanceDesc(e.target.value)}
                                            placeholder="Describe the issue in detail..."
                                            rows={3}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:border-zinc-400 dark:focus:border-zinc-600 resize-none"
                                            required
                                        ></textarea>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1">Category</label>
                                            <Select value={maintenanceCategory} onValueChange={val => setMaintenanceCategory(val || 'Plumbing')}>
                                                <SelectTrigger className="w-full px-4 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-zinc-400 focus:border-zinc-400 h-[42px] outline-none transition-colors hover:bg-slate-100 dark:hover:bg-zinc-800/80">
                                                    <SelectValue placeholder="Select Category" />
                                                </SelectTrigger>
                                                <SelectContent alignItemWithTrigger={false} className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-xl shadow-lg">
                                                    <SelectItem value="Plumbing" className="rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 text-sm">Plumbing</SelectItem>
                                                    <SelectItem value="Electrical" className="rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 text-sm">Electrical</SelectItem>
                                                    <SelectItem value="Appliance" className="rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 text-sm">Appliance</SelectItem>
                                                    <SelectItem value="Structural" className="rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 text-sm">Structural</SelectItem>
                                                    <SelectItem value="Other" className="rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 text-sm">Other</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1">Priority</label>
                                            <Select value={maintenancePriority} onValueChange={val => setMaintenancePriority(val || 'Medium')}>
                                                <SelectTrigger className="w-full px-4 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-zinc-400 focus:border-zinc-400 h-[42px] outline-none transition-colors hover:bg-slate-100 dark:hover:bg-zinc-800/80">
                                                    <SelectValue placeholder="Select Priority" />
                                                </SelectTrigger>
                                                <SelectContent alignItemWithTrigger={false} className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-xl shadow-lg">
                                                    <SelectItem value="Low" className="rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 text-sm">Low</SelectItem>
                                                    <SelectItem value="Medium" className="rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 text-sm">Medium</SelectItem>
                                                    <SelectItem value="High" className="rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 text-sm">High</SelectItem>
                                                    <SelectItem value="Urgent" className="rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 text-sm">Urgent</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1">Upload Image (Optional)</label>
                                        <input 
                                            type="file" 
                                            accept="image/*"
                                            onChange={e => setMaintenanceImage(e.target.files?.[0] || null)}
                                            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-zinc-100 file:text-zinc-900 hover:file:bg-zinc-200 dark:file:bg-zinc-800 dark:file:text-white cursor-pointer border border-slate-200 dark:border-zinc-800 rounded-xl p-1 bg-slate-50 dark:bg-zinc-900/50"
                                        />
                                        {maintenanceImage && (
                                            <div className="mt-3 relative rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 w-full h-32 bg-slate-100 dark:bg-zinc-900">
                                                <img 
                                                    src={URL.createObjectURL(maintenanceImage)} 
                                                    alt="Preview" 
                                                    className="w-full h-full object-cover"
                                                />
                                                <button 
                                                    type="button" 
                                                    onClick={() => setMaintenanceImage(null)}
                                                    className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </form>
                            </div>
                            <div className="p-5 border-t border-slate-200 dark:border-zinc-800 bg-secondary/50 flex justify-end gap-3">
                                <button 
                                    onClick={closeMaintenanceModal}
                                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                                    disabled={isSubmittingMaintenance}
                                >
                                    Cancel
                                </button>
                                <button 
                                    form="maintenanceForm"
                                    type="submit"
                                    className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-xs disabled:opacity-50"
                                    disabled={isSubmittingMaintenance}
                                >
                                    {isSubmittingMaintenance ? 'Submitting...' : 'Submit Request'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}