"use client";
import { useEffect, useState, useRef } from 'react';
import api from '@/lib/api';
import { motion, Variants } from 'framer-motion';

interface Conversation {
    id: number;
    name: string;
    room_number: string | null;
    last_message: string | null;
    last_message_time: string | null;
    unread_count: number | string;
}

interface Message {
    sender_id: number;
    receiver_id: number;
    message: string;
    sender_type: 'admin' | 'tenant';
    status: string;
    created_at: string;
}

const listVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.05 }
    }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const messageVariants: Variants = {
    hidden: { opacity: 0, y: 10, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 400, damping: 25 } }
};

export default function AdminChat() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedTenant, setSelectedTenant] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [searchFilter, setSearchFilter] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    const fetchConversations = async () => {
        try {
            const { data } = await api.get('/admin/chat/conversations');
            setConversations(data);
            
            if (data.length > 0 && !selectedTenant) {
                const firstUnread = data.find((c: Conversation) => Number(c.unread_count) > 0);
                setSelectedTenant(firstUnread || data[0]);
            }
        } catch (error) {
            console.error("Failed to fetch conversations:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMessages = async (tenantId: number) => {
        try {
            const { data } = await api.get(`/admin/chat?tenant_id=${tenantId}`);
            setMessages(data);
            
            setConversations(prev => prev.map(c => 
                c.id === tenantId ? { ...c, unread_count: 0 } : c
            ));
        } catch (error) {
            console.error("Failed to fetch messages:", error);
        }
    };

    useEffect(() => {
        fetchConversations();
    }, []);

    // Polling for the active conversation setup
    useEffect(() => {
        if (selectedTenant) {
            fetchMessages(selectedTenant.id);
            const interval = setInterval(() => {
                fetchMessages(selectedTenant.id);
                fetchConversations(); 
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [selectedTenant]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedTenant) return;
        try {
            const res = await api.post('/admin/chat', { 
                message: newMessage,
                tenant_id: selectedTenant.id 
            });
            setMessages([...messages, res.data]);
            setNewMessage('');
            fetchConversations();
        } catch (error) {
            console.error("Failed to send message:", error);
        }
    };

    const formatTime = (dateString: string | null) => {
        if (!dateString) return '';
        const msgDate = new Date(dateString);
        const today = new Date();
        
        if (msgDate.toDateString() === today.toDateString()) {
            return msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            return msgDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    };

    const filteredConversations = conversations.filter(c => 
        c.name.toLowerCase().includes(searchFilter.toLowerCase()) || 
        (c.room_number && c.room_number.toLowerCase().includes(searchFilter.toLowerCase()))
    );

    return (
        <div className="max-w-[1600px] mx-auto h-[calc(100vh-6rem)] md:h-[calc(100vh-8rem)] flex flex-col relative pb-4 md:pb-8">
            {/* Ambient Background */}

            <motion.div initial={{opacity:0, y:-20}} animate={{opacity:1, y:0}} className="mb-6 flex items-center justify-between relative z-10">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter">Messages</h1>
                    <p className="text-slate-500 dark:text-zinc-400 font-bold text-xs uppercase tracking-[0.2em] mt-2">Direct communication with residents</p>
                </div>
            </motion.div>

            <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:0.1}} className="flex-1 bg-card backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-slate-200/60 dark:border-zinc-800/60 overflow-hidden flex relative z-10">

                {/* Sidebar Contacts */}
                <div className={`w-full md:w-[380px] border-r border-slate-200 dark:border-zinc-800/80 flex flex-col bg-card/50 ${selectedTenant ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-6 border-b border-slate-200 dark:border-zinc-800/80">
                        <div className="relative group">
                            <input 
                                type="text" 
                                placeholder="Search tenant or room..." 
                                value={searchFilter}
                                onChange={(e) => setSearchFilter(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-card/60 border border-slate-200 dark:border-zinc-800 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 text-slate-900 dark:text-white shadow-inner" 
                            />
                            <svg className="w-5 h-5 text-slate-400 dark:text-zinc-500 absolute left-4 top-4 group-focus-within:text-emerald-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                        {isLoading ? (
                            <div className="p-10 text-center flex flex-col items-center gap-4">
                                <div className="w-8 h-8 border-4 border-slate-200 dark:border-zinc-800 border-t-emerald-500 dark:border-t-emerald-500 rounded-full animate-spin"></div>
                                <span className="font-bold text-slate-500 dark:text-zinc-500 text-xs uppercase tracking-widest animate-pulse">Loading Chats...</span>
                            </div>
                        ) : filteredConversations.length === 0 ? (
                            <div className="p-10 text-center font-bold text-slate-500 dark:text-zinc-500 text-xs uppercase tracking-widest">No conversations found.</div>
                        ) : (
                            <motion.div variants={listVariants} initial="hidden" animate="show" className="flex flex-col gap-2">
                                {filteredConversations.map(conv => {
                                    const unreadCount = Number(conv.unread_count);
                                    const isSelected = selectedTenant?.id === conv.id;
                                    
                                    return (
                                        <motion.div 
                                            variants={itemVariants}
                                            key={conv.id} 
                                            onClick={() => setSelectedTenant(conv)}
                                            className={`p-4 rounded-2xl cursor-pointer relative group transition-all duration-300 ${isSelected ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 shadow-sm' : 'hover:bg-slate-100 dark:hover:bg-zinc-800/60 border border-transparent hover:border-slate-200 dark:hover:border-zinc-700'}`}
                                        >
                                            {isSelected && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1/2 bg-emerald-500 rounded-r-full shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>}
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shadow-lg transition-colors ${isSelected ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white' : 'bg-card text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700'}`}>
                                                        {conv.name.charAt(0)}
                                                    </div>
                                                    {unreadCount > 0 && (
                                                        <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-[0_0_10px_rgba(244,63,94,0.6)] animate-bounce">
                                                            {unreadCount}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <h4 className={`font-black text-sm truncate ${isSelected ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>{conv.name}</h4>
                                                        <span className={`text-[9px] uppercase tracking-wider font-bold shrink-0 ml-2 ${unreadCount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-zinc-500'}`}>
                                                            {formatTime(conv.last_message_time)}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center gap-2">
                                                        <p className={`text-xs truncate ${unreadCount > 0 ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-500 dark:text-zinc-400 font-medium'}`}>
                                                            {conv.last_message ? conv.last_message : <span className="italic opacity-60">No messages yet</span>}
                                                        </p>
                                                        <span className="text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase shrink-0 px-2 py-0.5 rounded-full border border-slate-200 dark:border-zinc-700 bg-card/50">
                                                            Rm {conv.room_number || 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* Chat Window */}
                <div className={`flex-1 flex flex-col bg-transparent relative ${!selectedTenant ? 'hidden md:flex' : 'flex'}`}>
                    {selectedTenant ? (
                        <>
                            <div className="px-6 py-5 border-b border-slate-200 dark:border-zinc-800/80 flex justify-between items-center bg-card/60 backdrop-blur-xl z-10">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setSelectedTenant(null)} className="md:hidden w-10 h-10 rounded-xl bg-card border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white shadow-sm transition-colors">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
                                    </button>
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center font-black text-xl">
                                        {selectedTenant.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-900 dark:text-white leading-tight text-xl">{selectedTenant.name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                                                <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Active</span>
                                            </span>
                                            <span className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Room {selectedTenant.room_number || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div 
                                ref={scrollRef} 
                                className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth relative z-0 p-6 md:p-8"
                            >
                                <div className="min-h-full flex flex-col justify-end space-y-6">
                                {messages.length === 0 ? (
                                    <motion.div initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} className="h-full flex items-center justify-center flex-col gap-4 opacity-50 py-20">
                                        <div className="w-20 h-20 bg-card border border-slate-200 dark:border-zinc-800 rounded-3xl flex items-center justify-center text-4xl shadow-xl transform -rotate-6">
                                            💬
                                        </div>
                                        <div className="text-center">
                                            <div className="text-slate-900 dark:text-white font-black text-lg mb-1">No message history</div>
                                            <div className="text-slate-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-widest">Send a message to start the conversation</div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-6 flex flex-col">
                                    {messages.map((msg, index) => {
                                        const isFromAdmin = msg.sender_type === 'admin' || msg.sender_id === 1;
                                        
                                        // Status display logic
                                        let statusText = 'SENT';
                                        if (msg.status === 'delivered') statusText = 'DELIVERED';
                                        if (msg.status === 'read') statusText = 'SEEN';

                                        return (
                                            <motion.div variants={messageVariants} key={index} className={`flex ${isFromAdmin ? 'justify-end' : 'justify-start'}`}>
                                                <div className="relative max-w-[80%] md:max-w-[70%]">
                                                    <div className={`
                                                        ${isFromAdmin 
                                                            ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white rounded-[1.5rem] rounded-tr-sm shadow-[0_5px_15px_rgba(16,185,129,0.2)]' 
                                                            : 'bg-card border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white rounded-[1.5rem] rounded-tl-sm shadow-sm'
                                                        } 
                                                        px-5 py-4 text-sm font-bold leading-relaxed
                                                    `}>
                                                        {msg.message}
                                                    </div>
                                                    <div className={`flex items-center gap-2 mt-2 ${isFromAdmin ? 'justify-end mr-1' : 'ml-1'}`}>
                                                        <p className={`text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest`}>
                                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                        {isFromAdmin && (
                                                            <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest">
                                                                <span className={statusText === 'SEEN' ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400 dark:text-zinc-600'}>
                                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                                                </span>
                                                                <span className={statusText === 'SEEN' ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400 dark:text-zinc-600'}>{statusText}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                    </motion.div>
                                )}
                                </div>
                            </div>

                            <div className="p-4 md:p-6 bg-card/60 backdrop-blur-xl border-t border-slate-200 dark:border-zinc-800/80 z-10">
                                <form onSubmit={handleSend} className="flex gap-3 items-center bg-card p-2 rounded-2xl border border-slate-200 dark:border-zinc-800 focus-within:border-emerald-500/50 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all shadow-inner">
                                    <input 
                                        type="text" 
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder={`Message ${selectedTenant.name}...`} 
                                        className="flex-1 bg-transparent border-none text-sm font-bold text-slate-900 dark:text-white px-4 py-2 outline-none placeholder:text-slate-400 dark:placeholder:text-zinc-600" 
                                        autoFocus
                                    />
                                    <button 
                                        type="submit" 
                                        disabled={!newMessage.trim()}
                                        className="px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:from-emerald-400 hover:to-teal-400 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:shadow-none flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                                        <span className="hidden sm:inline">Send</span>
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 dark:text-zinc-500 gap-6 opacity-80 relative z-10 py-10">
                            <motion.div initial={{scale:0.8, opacity:0}} animate={{scale:1, opacity:1}} transition={{type:"spring", bounce:0.5}} className="w-32 h-32 bg-card border border-slate-200 dark:border-zinc-800 rounded-[2rem] flex items-center justify-center text-5xl shadow-2xl relative">
                                📬
                                <div className="absolute -top-3 -right-3 w-8 h-8 bg-emerald-500 rounded-full animate-pulse border-4 border-white dark:border-[#0a0a0a]"></div>
                            </motion.div>
                            <div className="text-center">
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Select a conversation</h2>
                                <p className="font-bold text-slate-500 dark:text-zinc-400 text-sm">Choose a resident from the sidebar to view messages.</p>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}