"use client";
import { useEffect, useState, useRef } from 'react';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

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

    return (
        /* --- VIEWPORT  CONTAINER --- */
        <div className="flex-1 flex flex-col relative w-full h-full bg-slate-50 dark:bg-[#050505] text-neutral-900 dark:text-neutral-100 font-sans transition-colors duration-300 overflow-hidden">
            {/* Custom Texture */}
            <style>{`
                .glass-noise {
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
                    opacity: 0.04;
                    mix-blend-mode: overlay;
                    pointer-events: none;
                }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

                                    
            {/* ---> MAIN CHAT CONTAINER <--- */}
            <motion.div 
                initial="hidden" 
                animate="visible" 
                variants={{
                    hidden: { opacity: 0, y: 10 },
                    visible: { 
                        opacity: 1, 
                        y: 0,
                        transition: { 
                            type: "spring",
                            stiffness: 80,
                            damping: 20,
                            mass: 1,
                            staggerChildren: 0.15 
                        } 
                    }
                }}
                className="flex-1 flex flex-col w-full h-full"
            >

                {/* --- MAIN CHAT INTERFACE --- */}
                <motion.div 
                    variants={{
                        hidden: { opacity: 0 },
                        visible: { opacity: 1 }
                    }}
                    className="flex-1 flex flex-col relative overflow-hidden min-h-0"
                >
                    
                    {/* 1. CHAT HEADER */}
                    <div className="relative z-10 flex items-center justify-between pt-3 pb-3 px-4 sm:px-8 border-b border-slate-200/50 dark:border-white/10 bg-linear-to-b from-white/80 to-white/40 dark:from-[#050505]/80 dark:to-[#050505]/40 backdrop-blur-2xl shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="w-14 h-14 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-blue-600 flex items-center justify-center text-white font-black text-2xl sm:text-xl shadow-lg shadow-indigo-500/30">
                                    BA
                                </div>
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                    Boarding Admin
                                    <svg className="w-5 h-5 sm:w-4 sm:h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </h2>
                                <p className="text-sm sm:text-xs font-medium text-emerald-500 tracking-wide flex items-center gap-2 sm:gap-1.5 mt-1 sm:mt-0.5">
                                    <span className="relative flex h-2.5 w-2.5 sm:h-2 sm:w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-2 sm:w-2 bg-emerald-500"></span>
                                    </span>
                                    Online right now
                                </p>
                            </div>
                        </div>
                        <div className="hidden sm:flex gap-2">
                            <button className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 transition-colors text-slate-600 dark:text-neutral-300">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                            </button>
                            <button className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 transition-colors text-slate-600 dark:text-neutral-300">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                            </button>
                            <button className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 transition-colors text-slate-600 dark:text-neutral-300">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                            </button>
                        </div>
                    </div>

                    {/* 2. CHAT WINDOW (Messages) */}
                    <div 
                        ref={scrollRef} 
                        onScroll={handleScroll}
                        className="relative z-10 flex-1 overflow-y-auto p-6 sm:p-10 space-y-6 scrollbar-hide scroll-smooth"
                    >
                        <AnimatePresence mode="popLayout">
                            {isLoading ? (
                                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center gap-4">
                                    <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Syncing Messages...</span>
                                </motion.div>
                            ) : messages.length === 0 ? (
                                <motion.div key="empty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="h-full flex items-center justify-center">
                                    <div className="flex flex-col items-center max-w-sm text-center p-8">
                                        <div className="w-24 h-24 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 dark:from-blue-500/10 dark:to-purple-500/10 rounded-full flex items-center justify-center mb-6 shadow-inner relative">
                                            <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl animate-pulse"></div>
                                            <svg className="w-10 h-10 text-blue-600 dark:text-blue-400 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                                        </div>
                                        <h4 className="text-2xl sm:text-xl font-bold text-slate-900 dark:text-white mb-2">How can we help?</h4>
                                        <p className="text-base sm:text-sm text-slate-500 dark:text-neutral-400">Send a message to our boarding admin team. We typically reply within a few minutes.</p>
                                    </div>
                                </motion.div>
                            ) : (
                                messages.map((msg, index) => (
                                    <motion.div 
                                        key={index} 
                                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        transition={{ duration: 0.3 }}
                                        className={`flex w-full ${msg.sender_type === 'tenant' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`flex flex-col max-w-[85%] sm:max-w-[70%] lg:max-w-[60%] ${msg.sender_type === 'tenant' ? 'items-end' : 'items-start'} group`}>
                                            
                                            {/* Message Bubble */}
                                            <div className="relative flex items-center gap-2">
                                                {msg.sender_type === 'admin' && (
                                                    <div className="w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex-shrink-0 flex items-center justify-center text-xs sm:text-[10px] font-bold text-white shadow-sm mt-auto mb-1">
                                                        BA
                                                    </div>
                                                )}
                                                <div className={`px-5 py-4 sm:py-3.5 text-base sm:text-[15px] leading-relaxed shadow-sm ${
                                                    msg.sender_type === 'tenant' 
                                                        ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl rounded-br-[4px]' 
                                                        : 'bg-linear-to-br from-white/80 to-neutral-50/50 dark:from-white/[0.1] dark:to-white/[0.02] text-slate-800 dark:text-white rounded-2xl rounded-bl-[4px] border border-slate-100 dark:border-white/5'
                                                }`}>
                                                    {msg.message}
                                                </div>
                                            </div>

                                            {/* Message Details (Time & Status) */}
                                            <div className={`flex items-center gap-2 mt-2 sm:mt-1.5 text-sm sm:text-xs font-medium text-slate-400 dark:text-neutral-500 ${msg.sender_type === 'tenant' ? 'justify-end pr-1' : 'justify-start pl-14 sm:pl-11'}`}>
                                                <span>{formatTime(msg.created_at)}</span>
                                                
                                                {/* Status Indicator (Only show for sent messages) */}
                                                {msg.sender_type === 'tenant' && (
                                                    <div className="flex items-center">
                                                        <span className={`flex items-center gap-0.5 ${msg.status === 'Seen' ? 'text-blue-500' : 'text-slate-400'}`}>
                                                            {/* Checkmarks */}
                                                            {msg.status === 'Sent' && <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>}
                                                            {msg.status === 'Delivered' && <div className="flex -space-x-2"><svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg><svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg></div>}
                                                            {msg.status === 'Seen' && <div className="flex -space-x-2 text-blue-500"><svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg><svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg></div>}
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
                    <div className="relative z-10 p-4 sm:p-6 bg-linear-to-t from-white/80 to-white/40 dark:from-[#050505]/80 dark:to-[#050505]/40 border-t border-slate-200/50 dark:border-white/5 backdrop-blur-2xl shrink-0">
                        <form onSubmit={handleSend} className="flex gap-2 sm:gap-3 items-end max-w-4xl mx-auto relative">
                            
                            {/* Upload Attachment Button */}
                            <button type="button" className="mb-1 p-2 sm:p-3 text-slate-400 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-full transition-colors shrink-0">
                                <svg className="w-7 h-7 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                            </button>

                            {/* Text Input Container */}
                            <div className="flex-1 relative bg-slate-100/80 dark:bg-white/5 rounded-3xl sm:rounded-[1.5rem] border border-transparent focus-within:border-blue-500/30 focus-within:bg-white dark:focus-within:bg-[#121214] transition-all shadow-sm flex items-center min-h-[60px] sm:min-h-[56px] overflow-hidden">
                                <input 
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type your message..." 
                                    className="w-full bg-transparent border-none text-base sm:text-[15px] text-slate-900 dark:text-white px-5 py-4 outline-none placeholder:text-slate-400 dark:placeholder:text-neutral-500"
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
                                className="mb-1 w-14 h-14 sm:w-12 sm:h-12 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all shadow-[0_4px_14px_0_rgb(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0 shrink-0"
                            >
                                <svg className="w-6 h-6 sm:w-5 sm:h-5 translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                            </button>
                        </form>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}