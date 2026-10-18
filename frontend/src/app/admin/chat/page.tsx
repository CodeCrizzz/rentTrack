"use client";

import { useEffect, useState, useRef, useMemo } from 'react';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search, Send, MessageSquare, Clock, User, 
    Building2, CheckCheck, Check, 
    Paperclip, Sparkles, ExternalLink, Wrench, 
    Receipt, ChevronRight, ChevronDown, X, Phone, AlertCircle,
    Calendar, AlertTriangle, CheckCircle2, ZoomIn,
    Droplets, Zap, Wind, Hammer, Wifi, Tag
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
    status?: 'Active' | 'Offline';
    last_active_at?: string | null;
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
    { label: "Payment Received", text: "Thank you! Your payment has been received and verified in the system." },
    { label: "Technician Scheduled", text: "Our maintenance technician has been scheduled to inspect your unit." },
    { label: "Check Invoice", text: "Please check your updated billing invoice in your tenant portal." },
    { label: "Follow Up Shortly", text: "Noted on this, we'll follow up shortly." }
];

const formatRequestNumber = (id: any) => 'RT' + String(id || '').padStart(4, '0');

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

    // Maintenance Request Detail Card State
    const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
    const [isLoadingRequestDetails, setIsLoadingRequestDetails] = useState(false);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const isAtBottom = useRef(true);
    const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
    const selectedTenantRef = useRef<Conversation | null>(null);

    useEffect(() => {
        selectedTenantRef.current = selectedTenant;
    }, [selectedTenant]);

    // Fetch conversations
    const fetchConversations = async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const { data } = await api.get('/admin/chat/conversations');
            const currentSelected = selectedTenantRef.current;
            const enhancedData = data.map((c: any) => ({
                ...c,
                is_active: Boolean(c.is_active),
                // If this tenant is actively selected and viewed, its unread counter is 0
                unread_count: currentSelected?.id === c.id ? 0 : Number(c.unread_count || 0)
            }));
            setConversations(enhancedData);
            
            // Set initial tenant
            if (enhancedData.length > 0 && !currentSelected) {
                const firstUnread = enhancedData.find((c: Conversation) => Number(c.unread_count) > 0);
                const initial = firstUnread || enhancedData[0];
                setSelectedTenant(initial);
                setConversations(prev => prev.map(c => 
                    c.id === initial.id ? { ...c, unread_count: 0 } : c
                ));
            } else if (currentSelected) {
                // Keep selected tenant status and room synchronized with poll updates
                const updatedSelected = enhancedData.find((c: Conversation) => c.id === currentSelected.id);
                if (updatedSelected) {
                    setSelectedTenant(prev => prev ? {
                        ...prev,
                        ...updatedSelected,
                        unread_count: 0
                    } : null);
                }
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
            
            // Mark unread as 0 locally when viewing the message
            setConversations(prev => prev.map(c => 
                c.id === tenantId ? { ...c, unread_count: 0 } : c
            ));
        } catch (error) {
            console.error("Failed to fetch messages:", error);
        }
    };

    // Select tenant and immediately clear counter
    const handleSelectTenant = (conv: Conversation) => {
        setSelectedTenant(conv);
        isAtBottom.current = true;
        setShowScrollBottomBtn(false);
        setConversations(prev => prev.map(c => 
            c.id === conv.id ? { ...c, unread_count: 0 } : c
        ));
        fetchMessages(conv.id);
    };

    // Track scroll position so scrolling up is preserved during polling
    const handleScroll = () => {
        if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            const atBottom = scrollHeight - scrollTop - clientHeight < 80;
            isAtBottom.current = atBottom;
            setShowScrollBottomBtn(!atBottom);
        }
    };

    // Auto-scroll handler
    const scrollToBottom = (force = false) => {
        if (scrollRef.current && (force || isAtBottom.current)) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
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

    // When tenant changes, always scroll down to the newest messages
    useEffect(() => {
        isAtBottom.current = true;
        setShowScrollBottomBtn(false);
        scrollToBottom(true);
        const timer = setTimeout(() => scrollToBottom(true), 60);
        return () => clearTimeout(timer);
    }, [selectedTenant?.id]);

    // When messages update (sent or polled), only scroll if user was already at bottom
    useEffect(() => {
        if (isAtBottom.current) {
            scrollToBottom();
            const timer = setTimeout(() => scrollToBottom(), 60);
            return () => clearTimeout(timer);
        }
    }, [messages]);

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
            isAtBottom.current = true;
            setShowScrollBottomBtn(false);
            setTimeout(() => scrollToBottom(true), 50);
            toast.success("Message sent to resident");
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

    // Maintenance Request Helpers
    const getAttachmentUrl = (path: string | null) => {
        if (!path) return null;
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        return `http://${host}:5000${path.startsWith('/') ? path : `/${path}`}`;
    };

    const getCategoryIcon = (category: string) => {
        const cat = (category || '').toLowerCase();
        if (cat.includes('plumb') || cat.includes('water') || cat.includes('leak') || cat.includes('pipe')) return Droplets;
        if (cat.includes('electr') || cat.includes('power') || cat.includes('light') || cat.includes('plug')) return Zap;
        if (cat.includes('air') || cat.includes('hvac') || cat.includes('cool') || cat.includes('fan')) return Wind;
        if (cat.includes('carp') || cat.includes('door') || cat.includes('wood') || cat.includes('lock')) return Hammer;
        if (cat.includes('wifi') || cat.includes('net') || cat.includes('internet')) return Wifi;
        return Wrench;
    };

    const parseMaintenanceMessage = (text: string) => {
        if (!text.startsWith('[MAINTENANCE_REQUEST')) return null;
        const matchWithId = text.match(/^\[MAINTENANCE_REQUEST[#:]([0-9]+)\]\s*(.*)$/i);
        if (matchWithId) {
            return {
                id: parseInt(matchWithId[1], 10),
                title: matchWithId[2]?.trim() || 'Maintenance Request'
            };
        }
        const matchWithoutId = text.match(/^\[MAINTENANCE_REQUEST\]\s*(.*)$/i);
        if (matchWithoutId) {
            return {
                id: null,
                title: matchWithoutId[1]?.trim() || 'Maintenance Request'
            };
        }
        return null;
    };

    const handleOpenMaintenanceCard = async (title: string, id: number | null, msg: Message) => {
        const initialFallback: any = {
            id: id || '—',
            title: title,
            tenant_name: selectedTenant?.name || 'Resident',
            room_number: selectedTenant?.room_number || null,
            created_at: msg.created_at,
            status: 'Pending',
            priority: 'Normal',
            category: 'General Maintenance',
            description: 'Fetching work order record from maintenance database...',
            attachment_url: null,
            assigned_to: null,
            scheduled_date: null,
            admin_notes: null
        };

        setSelectedRequest(initialFallback);
        setIsLoadingRequestDetails(true);

        try {
            const { data } = await api.get('/admin/requests');
            let matched: any = null;
            if (id) {
                matched = data.find((r: any) => Number(r.id) === Number(id));
            }
            if (!matched && selectedTenant) {
                matched = data.find((r: any) => 
                    Number(r.tenant_id) === Number(selectedTenant.id) && 
                    r.title.toLowerCase().trim() === title.toLowerCase().trim()
                );
                if (!matched) {
                    const tenantReqs = data.filter((r: any) => Number(r.tenant_id) === Number(selectedTenant.id));
                    if (tenantReqs.length > 0) {
                        matched = tenantReqs[0];
                    }
                }
            }

            if (matched) {
                setSelectedRequest(matched);
            } else {
                setSelectedRequest({
                    ...initialFallback,
                    description: `Maintenance request logged via tenant direct chat channel. Work order can be tracked in the Maintenance Requests ledger.`
                });
            }
        } catch (err) {
            console.error("Failed to load request details:", err);
        } finally {
            setIsLoadingRequestDetails(false);
        }
    };

    const handleUpdateRequestStatus = async (reqId: number | string, newStatus: string) => {
        if (!reqId || reqId === '—') return;
        setIsUpdatingStatus(true);
        try {
            const payload: any = { status: newStatus };
            if (newStatus === 'Resolved') payload.date_resolved = new Date().toISOString();
            
            await api.put(`/admin/requests/${reqId}`, payload);
            toast.success(`Request #${formatRequestNumber(reqId)} status set to ${newStatus}`);
            setSelectedRequest((prev: any) => prev ? { ...prev, ...payload } : null);
        } catch (err) {
            console.error("Failed to update status:", err);
            toast.error("Failed to update request status");
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleAcknowledgeInChat = (reqTitle: string) => {
        const text = `Hi ${selectedTenant?.name || 'there'}, your maintenance request regarding "${reqTitle}" has been received and logged. Our team is coordinating the repair.`;
        setNewMessage(text);
        setSelectedRequest(null);
        toast.info("Acknowledgment message copied to chat composer");
    };

    const filteredConversations = useMemo(() => {
        return conversations.filter(c => {
            if (filterMode === 'unread' && Number(c.unread_count) === 0) return false;
            if (searchFilter.trim()) {
                const q = searchFilter.toLowerCase().trim();
                const matchesName = c.name.toLowerCase().includes(q);
                const matchesRoom = c.room_number ? c.room_number.toLowerCase().includes(q) : false;
                if (!matchesName && !matchesRoom) return false;
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
                                <div key={i} className="p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-800 shrink-0"></div>
                                    <div className="space-y-1.5 flex-1">
                                        <div className="h-3.5 w-28 bg-slate-200 dark:bg-zinc-800 rounded"></div>
                                        <div className="h-2.5 w-16 bg-slate-100 dark:bg-zinc-800/60 rounded"></div>
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
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-teal-600 text-white">
                                {totalUnread} Unread
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                        Direct bilateral messaging, repair confirmations, payment receipts, and resident inquiries.
                    </p>
                </div>
            </div>

            {/* Split Screen Container */}
            <div className="flex-1 min-h-0 bg-card border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs flex">
                
                {/* LEFT COLUMN: Conversation Directory (compact width) */}
                <div className="w-full sm:w-60 md:w-64 border-r border-slate-200 dark:border-zinc-800 flex flex-col shrink-0 bg-slate-50/40 dark:bg-zinc-900/30">
                    
                    {/* Search & Tabs Header */}
                    <div className="p-2.5 border-b border-slate-200 dark:border-zinc-800 space-y-2">
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search residents..."
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
                                    <span className="w-4 h-4 rounded-full bg-teal-600 text-white text-[9px] flex items-center justify-center font-bold">
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
                                const unread = Number(conv.unread_count) || 0;

                                return (
                                    <div
                                        key={conv.id}
                                        onClick={() => handleSelectTenant(conv)}
                                        className={`p-2.5 rounded-xl cursor-pointer transition-all border flex items-center justify-between gap-2.5 ${
                                            isSelected
                                                ? 'bg-teal-50/90 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/30 shadow-xs'
                                                : 'border-transparent hover:bg-white dark:hover:bg-zinc-800/50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                            <div className="relative shrink-0">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                                                    isSelected 
                                                        ? 'bg-teal-600 text-white shadow-2xs' 
                                                        : 'bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                                                }`}>
                                                    {conv.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span 
                                                    title={conv.is_active ? 'Active' : 'Offline'}
                                                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-900 ${
                                                        conv.is_active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-zinc-600'
                                                    }`} 
                                                />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className={`text-xs truncate ${
                                                    isSelected 
                                                        ? 'font-black text-teal-950 dark:text-teal-200' 
                                                        : unread > 0 
                                                            ? 'font-black text-slate-950 dark:text-white' 
                                                            : 'font-bold text-slate-800 dark:text-zinc-200'
                                                }`}>
                                                    {conv.name}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[11px] truncate mt-0.5">
                                                    <span className={`truncate ${
                                                        isSelected 
                                                            ? 'font-bold text-teal-700 dark:text-teal-400' 
                                                            : 'font-semibold text-slate-500 dark:text-zinc-400'
                                                    }`}>
                                                        {conv.room_number ? `Room ${conv.room_number}` : 'No Unit'}
                                                    </span>
                                                    <span className="text-slate-300 dark:text-zinc-600">•</span>
                                                    <span className={`font-semibold shrink-0 flex items-center gap-1 ${
                                                        conv.is_active 
                                                            ? 'text-emerald-600 dark:text-emerald-400' 
                                                            : 'text-slate-400 dark:text-zinc-500'
                                                    }`}>
                                                        {conv.is_active ? 'Active' : 'Offline'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Chat Counter (Unread badge - removed when viewed) */}
                                        {unread > 0 && (
                                            <span className="min-w-5 h-5 px-1.5 rounded-full bg-teal-600 text-white font-mono text-[10px] font-black flex items-center justify-center shadow-xs shrink-0">
                                                {unread}
                                            </span>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                </div>

                {/* RIGHT COLUMN: Active Chat Thread */}
                <div className="flex-1 flex flex-col bg-white dark:bg-zinc-950 overflow-hidden min-h-0 relative">
                    {selectedTenant ? (
                        <>
                            {/* Thread Header */}
                            <div className="p-3.5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-900/40 shrink-0">
                                <div className="flex items-center gap-2.5">
                                    <div className="relative shrink-0">
                                        <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-extrabold text-sm shadow-xs">
                                            {selectedTenant.name.charAt(0)}
                                        </div>
                                        <span 
                                            title={selectedTenant.is_active ? 'Active' : 'Offline'}
                                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-950 ${
                                                selectedTenant.is_active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-zinc-600'
                                            }`}
                                        />
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
                                        <div className="flex items-center gap-1.5 text-[11px] mt-0.5">
                                            {selectedTenant.is_active ? (
                                                <>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Active</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-600"></span>
                                                    <span className="font-medium text-slate-400 dark:text-zinc-500">Offline</span>
                                                </>
                                            )}
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
                                onScroll={handleScroll}
                                className="flex-1 overflow-y-scroll chat-scrollbar p-4 bg-slate-50/20 dark:bg-zinc-900/10 min-h-0"
                            >
                                {messages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                                        <MessageSquare className="w-8 h-8 mb-2 opacity-30 text-teal-600" />
                                        <p className="font-semibold">No messages yet with {selectedTenant.name}.</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">Send a quick greeting or billing reminder below.</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col min-h-full space-y-3.5">
                                        {/* Dynamic spacer that pushes messages down when short, shrinks to 0 when long so all past messages are scrollable */}
                                        <div className="flex-1 min-h-0" />

                                        {messages.map((msg, i) => {
                                            const isFromAdmin = msg.sender_type === 'admin' || msg.sender_id === 1;
                                            const timeStr = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                                            return (
                                                <div 
                                                    key={msg.id || i}
                                                    className={`w-full flex ${isFromAdmin ? 'justify-end' : 'justify-start'}`}
                                                >
                                                    {(() => {
                                                        const parsedMaint = parseMaintenanceMessage(msg.message);
                                                        if (parsedMaint) {
                                                            return (
                                                                <div className={`flex flex-col ${isFromAdmin ? 'items-end' : 'items-start'} my-1`}>
                                                                    <div className="w-[300px] sm:w-[330px] max-w-full rounded-2xl bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 shadow-md overflow-hidden select-none">
                                                                        {/* Solid Header Bar */}
                                                                        <div className="bg-slate-900 dark:bg-zinc-800 px-4 py-3 flex items-center justify-between">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-6 h-6 rounded-md bg-slate-800 dark:bg-zinc-700 text-slate-200 flex items-center justify-center shadow-xs">
                                                                                    <Wrench className="w-3.5 h-3.5 stroke-[2.5]" />
                                                                                </div>
                                                                                <span className="text-xs font-bold uppercase tracking-wider text-white">
                                                                                    Maintenance Request
                                                                                </span>
                                                                            </div>
                                                                            <div className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-300 dark:text-zinc-400 bg-slate-800 dark:bg-zinc-700 px-2 py-0.5 rounded border border-slate-700 dark:border-zinc-600">
                                                                                <Clock className="w-3 h-3 text-slate-400" />
                                                                                <span>{timeStr}</span>
                                                                            </div>
                                                                        </div>

                                                                        {/* Content Body */}
                                                                        <div className="p-4 space-y-3.5">
                                                                            <h4 className="text-[15px] sm:text-base font-bold text-slate-900 dark:text-white leading-snug tracking-tight break-words">
                                                                                {parsedMaint.title}
                                                                            </h4>

                                                                            {/* Action CTA Button */}
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleOpenMaintenanceCard(parsedMaint.title, parsedMaint.id, msg)}
                                                                                className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-xs font-bold flex items-center justify-between shadow-xs transition-colors cursor-pointer group"
                                                                            >
                                                                                <span>View Request Details</span>
                                                                                <span className="w-6 h-6 rounded-lg bg-teal-700 flex items-center justify-center text-white group-hover:bg-teal-800 transition-colors">
                                                                                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                                                                </span>
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }

                                                        return (
                                                            <div className={`flex flex-col ${isFromAdmin ? 'items-end' : 'items-start'} max-w-[80%] sm:max-w-[70%]`}>
                                                                <div className={`rounded-2xl p-3 shadow-xs text-xs leading-relaxed ${
                                                                    isFromAdmin
                                                                        ? 'bg-teal-600 text-white rounded-tr-xs'
                                                                        : 'bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 border border-slate-200/80 dark:border-zinc-800 rounded-tl-xs'
                                                                }`}>
                                                                    <p className="whitespace-pre-wrap">{msg.message}</p>
                                                                </div>

                                                                <div className={`flex items-center gap-1 text-[10px] text-slate-400 mt-1 px-1 font-mono ${isFromAdmin ? 'justify-end' : 'justify-start'}`}>
                                                                    <span>{timeStr}</span>
                                                                    {isFromAdmin && (
                                                                        <CheckCheck className="w-3 h-3 text-teal-600 inline" />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Recommended Chat Section with Floating Latest Button right at the top */}
                            <div className="relative shrink-0">
                                {/* Floating Jump to Bottom Button - anchored directly at the top of the recommended chat */}
                                {showScrollBottomBtn && (
                                    <div className="absolute -top-10 right-6 z-20">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                isAtBottom.current = true;
                                                setShowScrollBottomBtn(false);
                                                scrollToBottom(true);
                                            }}
                                            className="px-3 py-1.5 rounded-full bg-teal-600 hover:bg-teal-700 text-white shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-1.5 text-xs font-bold cursor-pointer select-none"
                                            title="Scroll to latest messages"
                                        >
                                            <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
                                            <span>Latest</span>
                                        </button>
                                    </div>
                                )}

                                {/* Suggested Chat Responses Strip (above the chatbar - fits cleanly without any slidebar) */}
                                <div className="px-3.5 py-2 border-t border-slate-200/80 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/60 flex flex-wrap items-center gap-1.5 select-none">
                                    {QUICK_RESPONSES.map((tmpl, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setNewMessage(tmpl.text)}
                                            className="px-2.5 py-1 rounded-full text-xs font-medium bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-teal-500 hover:text-teal-700 dark:hover:border-teal-500 dark:hover:text-teal-300 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer shadow-2xs"
                                            title={`Insert: "${tmpl.text}"`}
                                        >
                                            {tmpl.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Input Form */}
                            <div className="p-3 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0">
                                <form onSubmit={handleSend} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder={`Reply to ${selectedTenant.name}...`}
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        className="flex-1 py-2 px-3.5 text-xs rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    />

                                    <button
                                        type="submit"
                                        disabled={!newMessage.trim() || isSending}
                                        className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer shrink-0"
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

            {/* POPUP CARD: TENANT'S MAINTENANCE REQUEST MODAL */}
            <AnimatePresence>
                {selectedRequest && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) setSelectedRequest(null);
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 10 }}
                            className="bg-card border border-slate-300 dark:border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-900 dark:text-zinc-100 font-sans"
                        >
                            {/* 1. Header Bar with Request # & Resident Info */}
                            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-zinc-800 flex items-start justify-between gap-3 bg-slate-50/90 dark:bg-zinc-900/80">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-md bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-300/60 dark:border-teal-500/30">
                                            {selectedRequest.id && selectedRequest.id !== '—' ? formatRequestNumber(selectedRequest.id) : 'WORK ORDER'}
                                        </span>
                                        <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                                            {selectedRequest.created_at ? new Date(selectedRequest.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                                        </span>
                                    </div>
                                    <h2 className="text-lg sm:text-xl font-black text-slate-950 dark:text-white tracking-tight break-words">
                                        {selectedRequest.title}
                                    </h2>
                                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-700 dark:text-zinc-300 mt-1">
                                        <span className="flex items-center gap-1 text-slate-950 dark:text-white">
                                            <User className="w-3.5 h-3.5 text-slate-600 dark:text-zinc-400" />
                                            {selectedRequest.tenant_name || selectedTenant?.name || 'Resident'}
                                        </span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            <Building2 className="w-3.5 h-3.5 text-slate-600 dark:text-zinc-400" />
                                            {selectedRequest.room_number ? `Room ${selectedRequest.room_number}` : (selectedTenant?.room_number ? `Room ${selectedTenant.room_number}` : 'Common Property')}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setSelectedRequest(null)}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                                    title="Close popup"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* 2. Scrollable Body Content */}
                            <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar space-y-4">
                                
                                {/* Status & Priority Badge Strip */}
                                <div className="grid grid-cols-3 gap-2.5 text-xs">
                                    {/* Category */}
                                    <div className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 flex flex-col justify-between">
                                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Category</span>
                                        <div className="font-extrabold text-slate-950 dark:text-white mt-1 flex items-center gap-1.5 truncate">
                                            {(() => {
                                                const CatIcon = getCategoryIcon(selectedRequest.category);
                                                return <CatIcon className="w-4 h-4 text-slate-700 dark:text-zinc-300 shrink-0" />;
                                            })()}
                                            <span className="truncate">{selectedRequest.category || 'General'}</span>
                                        </div>
                                    </div>

                                    {/* Priority */}
                                    <div className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 flex flex-col justify-between">
                                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Priority</span>
                                        <div className="mt-1">
                                            {(() => {
                                                const prio = selectedRequest.priority || 'Normal';
                                                const isHigh = prio === 'High';
                                                return (
                                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-bold text-xs ${
                                                        isHigh 
                                                            ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-300/60 dark:border-rose-500/30'
                                                            : 'bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200'
                                                    }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${isHigh ? 'bg-rose-500 animate-ping' : 'bg-slate-500'}`} />
                                                        {prio}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    {/* Lifecycle Status */}
                                    <div className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 flex flex-col justify-between">
                                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Current Status</span>
                                        <div className="mt-1">
                                            {(() => {
                                                const st = selectedRequest.status || 'Pending';
                                                const isPending = st === 'Pending';
                                                const isInProgress = st === 'In Progress';
                                                return (
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-bold text-xs ${
                                                        isPending 
                                                            ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white border border-slate-300 dark:border-zinc-700'
                                                            : isInProgress
                                                                ? 'bg-teal-50 dark:bg-teal-500/10 text-teal-800 dark:text-teal-300 border border-teal-300/70 dark:border-teal-500/40'
                                                                : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-300/70 dark:border-emerald-500/40'
                                                    }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${isPending ? 'bg-teal-600 animate-pulse' : isInProgress ? 'bg-teal-500' : 'bg-emerald-500'}`} />
                                                        {st}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                {/* Detailed Issue Statement */}
                                <div className="space-y-1.5">
                                    <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300 block">
                                        Tenant's Stated Issue
                                    </span>
                                    <div className="bg-slate-50/90 dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 text-sm font-medium text-slate-900 dark:text-zinc-100 leading-relaxed whitespace-pre-wrap">
                                        {selectedRequest.description || 'No detailed written description provided by resident.'}
                                    </div>
                                </div>

                                {/* Attached Photo Proof (if available) */}
                                {getAttachmentUrl(selectedRequest.attachment_url) && (
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                                            <span className="flex items-center gap-1.5">
                                                <Paperclip className="w-3.5 h-3.5 text-teal-600" />
                                                <span>Attached Photo Proof</span>
                                            </span>
                                            <span className="text-[11px] text-slate-500 font-semibold lowercase">click to inspect full photo</span>
                                        </div>
                                        <div 
                                            onClick={() => setLightboxImage(getAttachmentUrl(selectedRequest.attachment_url))}
                                            className="relative rounded-xl overflow-hidden border border-slate-300 dark:border-zinc-700 bg-black cursor-zoom-in group max-h-52 flex items-center justify-center"
                                        >
                                            <img
                                                src={getAttachmentUrl(selectedRequest.attachment_url)!}
                                                alt="Maintenance Proof"
                                                className="max-h-52 w-full object-contain group-hover:opacity-90 transition-opacity"
                                            />
                                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                <span className="px-3 py-1.5 rounded-lg bg-black/75 text-white text-xs font-bold flex items-center gap-1.5">
                                                    <ZoomIn className="w-4 h-4" />
                                                    <span>Inspect Photo</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Repair & Schedule Info */}
                                <div className="bg-slate-50/80 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-xl p-3 grid grid-cols-2 gap-3 text-xs">
                                    <div>
                                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">Assigned Technician</span>
                                        <span className="font-extrabold text-sm text-slate-950 dark:text-white mt-0.5 block">
                                            {selectedRequest.assigned_to || <span className="text-slate-500 font-semibold italic">Unassigned (Awaiting Review)</span>}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">Scheduled Repair Date</span>
                                        <span className="font-mono font-bold text-sm text-slate-900 dark:text-zinc-100 mt-0.5 block">
                                            {selectedRequest.scheduled_date ? new Date(selectedRequest.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                        </span>
                                    </div>
                                    {selectedRequest.admin_notes && (
                                        <div className="col-span-2 pt-2 border-t border-slate-200 dark:border-zinc-800">
                                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">Internal Notes</span>
                                            <p className="text-xs text-slate-800 dark:text-zinc-200 font-medium italic mt-0.5">
                                                {selectedRequest.admin_notes}
                                            </p>
                                        </div>
                                    )}
                                </div>

                            </div>

                            {/* 3. Action Footer */}
                            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/90 dark:bg-zinc-900/80 flex flex-wrap items-center justify-between gap-2.5">
                                {/* Left Quick Action: Acknowledge in Chat */}
                                <button
                                    type="button"
                                    onClick={() => handleAcknowledgeInChat(selectedRequest.title)}
                                    className="px-3.5 py-2 text-xs font-bold rounded-lg border border-slate-300 dark:border-zinc-700 bg-card hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                                    title="Draft an acknowledgment message to the tenant"
                                >
                                    <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                                    <span>Acknowledge in Chat</span>
                                </button>

                                <div className="flex items-center gap-2">
                                    {/* Quick Status Buttons if valid ID exists */}
                                    {selectedRequest.id && selectedRequest.id !== '—' && selectedRequest.status === 'Pending' && (
                                        <button
                                            type="button"
                                            disabled={isUpdatingStatus}
                                            onClick={() => handleUpdateRequestStatus(selectedRequest.id, 'In Progress')}
                                            className="px-3.5 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                                        >
                                            Start Repair
                                        </button>
                                    )}

                                    {selectedRequest.id && selectedRequest.id !== '—' && selectedRequest.status === 'In Progress' && (
                                        <button
                                            type="button"
                                            disabled={isUpdatingStatus}
                                            onClick={() => handleUpdateRequestStatus(selectedRequest.id, 'Resolved')}
                                            className="px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                                        >
                                            Mark Resolved
                                        </button>
                                    )}

                                    {/* Direct Link to Requests Page */}
                                    <a
                                        href="/admin/requests"
                                        className="px-3.5 py-2 text-xs font-bold rounded-lg bg-teal-700 hover:bg-teal-800 text-white transition-colors flex items-center gap-1.5 shadow-xs"
                                    >
                                        <span>Open in Work Orders</span>
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </a>

                                    <button
                                        type="button"
                                        onClick={() => setSelectedRequest(null)}
                                        className="px-3.5 py-2 text-xs font-bold rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 transition-colors cursor-pointer"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>

                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* LIGHTBOX IMAGE VIEWER */}
            <AnimatePresence>
                {lightboxImage && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/85 backdrop-blur-md z-60 flex items-center justify-center p-4">
                        <div className="relative max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl bg-black border border-zinc-800">
                            <button onClick={() => setLightboxImage(null)} className="absolute top-3 right-3 p-2 bg-black/60 rounded-full text-white hover:bg-black cursor-pointer">
                                <X className="w-5 h-5" />
                            </button>
                            <img src={lightboxImage} alt="Attachment Full" className="max-w-full max-h-[80vh] object-contain" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
