"use client";
import { useEffect, useState, useRef } from 'react';
import api from '@/lib/api';
import { motion, AnimatePresence, type Variants } from 'framer-motion';

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
            const formattedData = data.map((msg: any) => ({
                ...msg,
                status: msg.status || 'Seen' // Defaulting to Seen for the UI mockup
            }));
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
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="w-full h-[calc(100vh-6rem)] flex flex-col font-sans text-slate-900 dark:text-white">
            
            {/* Header */}
            <motion.div variants={itemVariants} className="mb-6 shrink-0">
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    Chat Support
                </h1>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Message the admin for assistance.</p>
            </motion.div>

            {/* Chat Container */}
            <motion.div variants={itemVariants} className="flex-1 bg-card rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col overflow-hidden min-h-0">
                
                {/* 1. CHAT HEADER */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-zinc-800 bg-secondary/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg">
                            BA
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                Boarding Admin
                            </h2>
                            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
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
                    className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
                >
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
                                                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex-shrink-0 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                                    BA
                                                </div>
                                            )}
                                            <div className={`px-4 py-3 text-sm leading-relaxed ${
                                                msg.sender_type === 'tenant' 
                                                    ? 'bg-indigo-600 text-white rounded-2xl rounded-br-sm' 
                                                    : 'bg-secondary text-slate-900 dark:text-white rounded-2xl rounded-bl-sm border border-slate-200 dark:border-zinc-800'
                                            }`}>
                                                {msg.message}
                                            </div>
                                        </div>

                                        {/* Message Details (Time & Status) */}
                                        <div className={`flex items-center gap-1.5 mt-1.5 text-xs text-slate-500 dark:text-zinc-400 ${msg.sender_type === 'tenant' ? 'justify-end pr-1' : 'justify-start pl-11'}`}>
                                            <span>{formatTime(msg.created_at)}</span>
                                            
                                            {/* Status Indicator (Only show for sent messages) */}
                                            {msg.sender_type === 'tenant' && (
                                                <div className="flex items-center">
                                                    <span className={`flex items-center ${msg.status === 'Seen' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                                                        {msg.status === 'Sent' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>}
                                                        {msg.status === 'Delivered' && <div className="flex -space-x-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg></div>}
                                                        {msg.status === 'Seen' && <div className="flex -space-x-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg></div>}
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
                        <div className="flex-1 relative bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 focus-within:border-indigo-500 transition-colors flex items-center min-h-[48px] overflow-hidden">
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
                            className="w-12 h-12 flex items-center justify-center bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 shrink-0"
                        >
                            <svg className="w-5 h-5 translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                        </button>
                    </form>
                </div>
            </motion.div>
        </motion.div>
    );
}