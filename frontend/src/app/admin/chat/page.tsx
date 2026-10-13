"use client";

import { useEffect, useState, useRef, useMemo } from 'react';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search, Send, MessageSquare, Clock, User, 
    Building2, RefreshCw, CheckCheck, Check, 
    Paperclip, Sparkles, ExternalLink, Wrench, 
    Receipt, ChevronRight, X, Phone, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface Conversation {
    id: number;
    name: string;
    room_number: string | null;
    last_message: string | null;
    last_message_time: string | null;
    unread_count: number | string;
    is_active?: boolean;
}

interface Message {
    id?: number;
    sender_id: number;
    receiver_id: number;
    message: string;
    sender_type: 'admin' | 'tenant';
    status: string;
    created_at: string;
}

const QUICK_RESPONSES = [
    "Thank you! Your payment has been received and verified in the system.",
    "Our maintenance technician has been scheduled to inspect your unit.",
    "Please check your updated billing invoice in your tenant portal.",
    "Noted on this, we'll follow up shortly."
];

export default function AdminChat() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedTenant, setSelectedTenant] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [searchFilter, setSearchFilter] = useState('');
    const [filterMode, setFilterMode] = useState<'all' | 'unread'>('all');
    const [showQuickTemplates, setShowQuickTemplates] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);

    // Fetch conversations
    const fetchConversations = async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const { data } = await api.get('/admin/chat/conversations');
            const enhancedData = data.map((c: any, i: number) => ({
                ...c,
                is_active: i % 2 === 0
            }));
            setConversations(enhancedData);
            if (silent) toast.success("Conversations synchronized");
            
            // Set initial tenant
            if (enhancedData.length > 0 && !selectedTenant) {
                const firstUnread = enhancedData.find((c: Conversation) => Number(c.unread_count) > 0);
                setSelectedTenant(firstUnread || enhancedData[0]);
            }
        } catch (error) {
            console.error("Failed to load conversations:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch messages for active tenant
    const fetchMessages = async (tenantId: number) => {
        try {
            const { data } = await api.get(`/admin/chat?tenant_id=${tenantId}`);
            setMessages(data || []);
            
            // Mark unread as 0 locally
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

    // Polling setup for active chat
    useEffect(() => {
        if (selectedTenant) {
            fetchMessages(selectedTenant.id);
            const interval = setInterval(() => {
                fetchMessages(selectedTenant.id);
                fetchConversations(true);
            }, 6000);
            return () => clearInterval(interval);
        }
    }, [selectedTenant?.id]);

    // Auto-scroll on new message
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages.length]);

    // Send Message
    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() || !selectedTenant || isSending) return;

        const textToSend = newMessage.trim();
        setIsSending(true);

        try {
            const res = await api.post('/admin/chat', { 
                message: textToSend,
                tenant_id: selectedTenant.id 
            });
            setMessages(prev => [...prev, res.data]);
            setNewMessage('');
            setShowQuickTemplates(false);
            toast.success("Message dispatched to resident");
            fetchConversations(true);
        } catch (error) {
            console.error("Failed to send message:", error);
            toast.error("Failed to send message.");
        } finally {
            setIsSending(false);
        }
    };

    const handleSelectTemplate = (template: string) => {
        setNewMessage(template);
        setShowQuickTemplates(false);
    };

    const formatTime = (dateString: string | null) => {
        if (!dateString) return '';
        const msgDate = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (msgDate.toDateString() === today.toDateString()) {
            return msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (msgDate.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return msgDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    };

    const filteredConversations = useMemo(() => {
        return conversations.filter(c => {
            if (filterMode === 'unread' && Number(c.unread_count) === 0) return false;
            if (searchFilter.trim()) {
                const q = searchFilter.toLowerCase().trim();
                const matchesName = c.name.toLowerCase().includes(q);
                const matchesRoom = c.room_number ? c.room_number.toLowerCase().includes(q) : false;
                const matchesMsg = c.last_message ? c.last_message.toLowerCase().includes(q) : false;
                if (!matchesName && !matchesRoom && !matchesMsg) return false;
            }
            return true;
        });
    }, [conversations, filterMode, searchFilter]);

    const totalUnread = conversations.reduce((acc, curr) => acc + Number(curr.unread_count), 0);

    if (isLoading) {
        return (
            <div className="w-full h-[calc(100vh-6.2rem)] md:h-[calc(100vh-7.2rem)] lg:h-[calc(100dvh-7.2rem)] flex flex-col font-sans text-slate-900 dark:text-zinc-100 overflow-hidden space-y-2.5 animate-pulse">
                {/* 1. Header Strip */}
                <div className="shrink-0 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="h-6 w-56 bg-slate-200 dark:bg-zinc-800 rounded-md"></div>
                            <div className="h-5 w-20 bg-slate-200 dark:bg-zinc-800 rounded-full"></div>
                        </div>
                        <div className="h-3.5 w-96 bg-slate-200 dark:bg-zinc-800 rounded-md mt-1.5"></div>
                    </div>
                    <div className="h-8 w-20 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                </div>

                {/* 2. Split Screen Container */}
                <div className="flex-1 min-h-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs flex">
                    {/* Left Sidebar */}
                    <div className="w-80 md:w-96 border-r border-slate-200 dark:border-zinc-800 flex flex-col bg-slate-50/50 dark:bg-zinc-900/40">
                        <div className="p-3 border-b border-slate-200 dark:border-zinc-800 space-y-2">
                            <div className="h-8 w-full bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                            <div className="flex gap-1">
                                <div className="h-6 flex-1 bg-slate-200 dark:bg-zinc-800 rounded-md"></div>
                                <div className="h-6 flex-1 bg-slate-200 dark:bg-zinc-800 rounded-md"></div>
                                <div className="h-6 flex-1 bg-slate-200 dark:bg-zinc-800 rounded-md"></div>
                            </div>
                        </div>
                        <div className="flex-1 p-2 space-y-1">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-zinc-800 shrink-0"></div>
                                    <div className="space-y-1.5 flex-1">
                                        <div className="flex justify-between">
                                            <div className="h-3.5 w-24 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                                            <div className="h-2.5 w-12 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                                        </div>
                                        <div className="h-2.5 w-36 bg-slate-100 dark:bg-zinc-800/60 rounded"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Chat Stream */}
                    <div className="flex-1 flex flex-col bg-card">
                        {/* Header */}
                        <div className="p-3 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-zinc-800"></div>
                                <div className="space-y-1">
                                    <div className="h-4 w-32 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                                    <div className="h-3 w-44 bg-slate-100 dark:bg-zinc-800/60 rounded"></div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <div className="h-7 w-20 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                                <div className="h-7 w-20 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                            </div>
                        </div>
                        {/* Message bubbles */}
                        <div className="flex-1 p-4 space-y-3">
                            <div className="flex gap-2 max-w-sm">
                                <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-zinc-800 shrink-0 mt-auto"></div>
                                <div className="h-14 w-64 bg-slate-100 dark:bg-zinc-800 rounded-2xl rounded-bl-xs"></div>
                            </div>
                            <div className="flex justify-end">
                                <div className="h-16 w-72 bg-teal-100 dark:bg-teal-950/40 rounded-2xl rounded-br-xs border border-teal-200/50 dark:border-teal-800/40"></div>
                            </div>
                            <div className="flex gap-2 max-w-sm">
                                <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-zinc-800 shrink-0 mt-auto"></div>
                                <div className="h-12 w-52 bg-slate-100 dark:bg-zinc-800 rounded-2xl rounded-bl-xs"></div>
                            </div>
                            <div className="flex justify-end">
                                <div className="h-12 w-60 bg-teal-100 dark:bg-teal-950/40 rounded-2xl rounded-br-xs border border-teal-200/50 dark:border-teal-800/40"></div>
                            </div>
                        </div>
                        {/* Input Footer */}
                        <div className="p-3 border-t border-slate-200 dark:border-zinc-800 space-y-2">
                            <div className="flex gap-1.5">
                                <div className="h-5 w-24 bg-slate-200 dark:bg-zinc-800 rounded-full"></div>
                                <div className="h-5 w-28 bg-slate-200 dark:bg-zinc-800 rounded-full"></div>
                                <div className="h-5 w-20 bg-slate-200 dark:bg-zinc-800 rounded-full"></div>
                            </div>
                            <div className="h-10 bg-slate-100 dark:bg-zinc-800 rounded-xl"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-[calc(100vh-6.2rem)] md:h-[calc(100vh-7.2rem)] lg:h-[calc(100dvh-7.2rem)] flex flex-col font-sans text-slate-900 dark:text-zinc-100 overflow-hidden space-y-2.5">
            
            {/* Header Strip */}
            <div className="shrink-0 flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                            Resident Messaging Center
                        </h1>
                        {totalUnread > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-500 text-white animate-pulse">
                                {totalUnread} Unread
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                        Direct bilateral messaging, repair confirmations, payment receipts, and resident inquiries.
                    </p>
                </div>
                <button
                    onClick={() => fetchConversations(true)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-zinc-800 bg-card hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5 shadow-xs"
                    title="Sync messages"
                >
                    <RefreshCw className="w-3.5 h-3.5 text-teal-600" />
                    <span>Sync</span>
                </button>
            </div>

            {/* Split Screen Container */}
            <div className="flex-1 min-h-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs flex">
                
                {/* LEFT COLUMN: Conversation Directory */}
                <div className="w-full sm:w-80 md:w-88 border-r border-slate-200 dark:border-zinc-800 flex flex-col shrink-0 bg-slate-50/40 dark:bg-zinc-900/30">
                    
                    {/* Search & Tabs Header */}
                    <div className="p-3 border-b border-slate-200 dark:border-zinc-800 space-y-2">
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search residents or rooms..."
                                value={searchFilter}
                                onChange={(e) => setSearchFilter(e.target.value)}
                                className="w-full py-1.5 pl-8 pr-3 text-xs rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                        </div>

                        {/* Quick filter pills */}
                        <div className="flex gap-1 text-[11px] font-semibold">
                            <button
                                onClick={() => setFilterMode('all')}
                                className={`px-2.5 py-1 rounded-md transition-all ${
                                    filterMode === 'all' 
                                        ? 'bg-teal-600 text-white font-bold' 
                                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200'
                                }`}
                            >
                                All ({conversations.length})
                            </button>
                            <button
                                onClick={() => setFilterMode('unread')}
                                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                                    filterMode === 'unread' 
                                        ? 'bg-teal-600 text-white font-bold' 
                                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200'
                                }`}
                            >
                                <span>Unread</span>
                                {totalUnread > 0 && (
                                    <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] flex items-center justify-center font-bold">
                                        {totalUnread}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Conversation List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {filteredConversations.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 text-xs">
                                <MessageSquare className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
                                <p>No conversations found.</p>
                            </div>
                        ) : (
                            filteredConversations.map(conv => {
                                const isSelected = selectedTenant?.id === conv.id;
                                const unread = Number(conv.unread_count);

                                return (
                                    <div
                                        key={conv.id}
                                        onClick={() => setSelectedTenant(conv)}
                                        className={`p-2.5 rounded-xl cursor-pointer transition-all border ${
                                            isSelected
                                                ? 'bg-teal-50/80 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/30 shadow-xs'
                                                : 'border-transparent hover:bg-white dark:hover:bg-zinc-800/50'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-1 mb-0.5">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                                                    {conv.name.charAt(0)}
                                                </div>
                                                <span className={`text-xs truncate ${isSelected ? 'font-black text-teal-900 dark:text-teal-200' : 'font-bold text-slate-900 dark:text-white'}`}>
                                                    {conv.name}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                                {formatTime(conv.last_message_time)}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-[11px] pl-7.5">
                                            <span className="font-semibold text-slate-500 dark:text-zinc-400">
                                                {conv.room_number ? `Room ${conv.room_number}` : 'No Unit'}
                                            </span>
                                            {unread > 0 && (
                                                <span className="px-1.5 py-0.2 rounded-full bg-teal-600 text-white font-mono text-[9px] font-bold">
                                                    {unread} new
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate pl-7.5 mt-0.5">
                                            {conv.last_message || 'No messages yet'}
                                        </p>
                                    </div>
                                );
                            })
                        )}
                    </div>

                </div>

                {/* RIGHT COLUMN: Active Chat Thread */}
                <div className="flex-1 flex flex-col bg-white dark:bg-zinc-950 overflow-hidden">
                    {selectedTenant ? (
                        <>
                            {/* Thread Header */}
                            <div className="p-3.5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-900/40 shrink-0">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-extrabold text-sm shadow-xs">
                                        {selectedTenant.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                                                {selectedTenant.name}
                                            </h3>
                                            <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-zinc-800 text-teal-600 dark:text-teal-400 border border-slate-200 dark:border-zinc-700">
                                                {selectedTenant.room_number ? `Room ${selectedTenant.room_number}` : 'Unit Unassigned'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                            <span>Active Resident Channel</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <a
                                        href="/admin/billing"
                                        className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 text-slate-600 dark:text-zinc-300 font-semibold flex items-center gap-1"
                                    >
                                        <Receipt className="w-3 h-3 text-teal-600" />
                                        <span>View Invoices</span>
                                    </a>
                                    <a
                                        href="/admin/requests"
                                        className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 text-slate-600 dark:text-zinc-300 font-semibold flex items-center gap-1"
                                    >
                                        <Wrench className="w-3 h-3 text-indigo-600" />
                                        <span>Work Orders</span>
                                    </a>
                                </div>
                            </div>

                            {/* Messages Body */}
                            <div 
                                ref={scrollRef} 
                                className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 bg-slate-50/20 dark:bg-zinc-900/10"
                            >
                                {messages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                                        <MessageSquare className="w-8 h-8 mb-2 opacity-30 text-teal-600" />
                                        <p className="font-semibold">No messages yet with {selectedTenant.name}.</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">Send a quick greeting or billing reminder below.</p>
                                    </div>
                                ) : (
                                    messages.map((msg, i) => {
                                        const isFromAdmin = msg.sender_type === 'admin' || msg.sender_id === 1;
                                        const timeStr = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                                        return (
                                            <div
                                                key={i}
                                                className={`flex flex-col ${isFromAdmin ? 'items-end' : 'items-start'}`}
                                            >
                                                <div className={`max-w-[80%] sm:max-w-[70%] rounded-2xl p-3 shadow-xs text-xs leading-relaxed ${
                                                    isFromAdmin
                                                        ? 'bg-teal-600 text-white rounded-tr-xs'
                                                        : 'bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 border border-slate-200/80 dark:border-zinc-800 rounded-tl-xs'
                                                }`}>
                                                    {msg.message.startsWith('[MAINTENANCE_REQUEST]') ? (
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-500 border-b border-white/10 pb-1">
                                                                <Wrench className="w-3 h-3" />
                                                                <span>Maintenance Issue Ticket</span>
                                                            </div>
                                                            <p className="font-bold">{msg.message.replace('[MAINTENANCE_REQUEST] ', '')}</p>
                                                        </div>
                                                    ) : (
                                                        <p className="whitespace-pre-wrap">{msg.message}</p>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 px-1 font-mono">
                                                    <span>{timeStr}</span>
                                                    {isFromAdmin && (
                                                        <CheckCheck className="w-3 h-3 text-teal-600 inline" />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Quick Responses Tray */}
                            {showQuickTemplates && (
                                <div className="border-t border-slate-200 dark:border-zinc-800 p-2.5 bg-slate-50 dark:bg-zinc-900/70 space-y-1 text-xs">
                                    <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-400 px-1">
                                        <span>Quick Response Presets</span>
                                        <button onClick={() => setShowQuickTemplates(false)} className="hover:text-slate-600">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                        {QUICK_RESPONSES.map((tmpl, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleSelectTemplate(tmpl)}
                                                className="text-left p-2 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-teal-500 text-slate-700 dark:text-zinc-300 text-[11px] transition-all truncate"
                                            >
                                                {tmpl}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Input Form */}
                            <div className="p-3 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0">
                                <form onSubmit={handleSend} className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowQuickTemplates(!showQuickTemplates)}
                                        className={`p-2 rounded-lg border text-xs font-semibold transition-colors flex items-center gap-1 ${
                                            showQuickTemplates
                                                ? 'bg-teal-50 border-teal-300 text-teal-700 dark:bg-teal-500/20'
                                                : 'border-slate-200 dark:border-zinc-800 hover:bg-slate-100 text-slate-600 dark:text-zinc-400'
                                        }`}
                                        title="Quick templates"
                                    >
                                        <Sparkles className="w-4 h-4 text-amber-500" />
                                        <span className="hidden sm:inline">Templates</span>
                                    </button>

                                    <input
                                        type="text"
                                        placeholder={`Reply to ${selectedTenant.name}...`}
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        className="flex-1 py-2 px-3 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    />

                                    <button
                                        type="submit"
                                        disabled={!newMessage.trim() || isSending}
                                        className="px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                                    >
                                        <Send className="w-3.5 h-3.5" />
                                        <span>Send</span>
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                            <MessageSquare className="w-10 h-10 mb-2 opacity-20" />
                            <p className="font-bold text-sm text-slate-700 dark:text-zinc-300">No conversation selected</p>
                            <p className="mt-0.5">Select a resident from the directory on the left.</p>
                        </div>
                    )}
                </div>

            </div>

        </div>
    );
}
