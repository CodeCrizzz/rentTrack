"use client";

import { useEffect, useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { 
    Search, Send, User, 
    Building2, CheckCheck, 
    Paperclip, Wrench, 
    ChevronRight,
    FileText,
    Users, Download,
    MessageSquare,
    Phone, Video, MoreVertical,
    Mail, ExternalLink, CreditCard,
    Flame, Zap, Clock, CheckCircle2, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

interface MessageAttachment {
    title: string;
    type: string;
    size: string;
    url?: string;
}

interface MaintenanceTicketInfo {
    id: number;
    request_number: string;
    title: string;
    description?: string;
    category: string;
    priority: string;
    status: string;
    room_number?: string;
    attachment_url?: string;
    assigned_to?: string;
    created_at?: string;
}

interface ChatMessage {
    id: string | number;
    sender: 'admin' | 'tenant';
    text: string;
    time: string;
    date?: string;
    timestamp?: number;
    is_read?: boolean;
    attachment?: MessageAttachment;
    maintenanceTicket?: MaintenanceTicketInfo;
}

interface ConversationItem {
    id: number | string;
    name: string;
    avatar?: string;
    isGroup?: boolean;
    isTeam?: boolean;
    role?: string;
    category: 'tenant' | 'staff' | 'all';
    room_number?: string;
    bed_space?: string;
    email?: string;
    phone?: string;
    last_message: string;
    last_message_time: string;
    unread_count: number;
    is_online: boolean;
    total_messages: number;
    status: 'Active' | 'Offline';
    messages: ChatMessage[];
}

// Palette for single-letter avatars
const getAvatarColor = (name: string) => {
    const palette = [
        "bg-[#0062cc] text-white", // Solid royal blue
        "bg-[#2563eb] text-white", // Blue
        "bg-[#0284c7] text-white", // Sky blue
        "bg-[#4f46e5] text-white", // Indigo
        "bg-[#0d9488] text-white", // Teal
        "bg-[#6366f1] text-white"  // Violet
    ];
    let code = 0;
    for (let i = 0; i < name.length; i++) {
        code = name.charCodeAt(i) + ((code << 5) - code);
    }
    return palette[Math.abs(code) % palette.length];
};

// Format timestamp into short display time
const formatMessageTime = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        if (diffDays === 1) return 'Yesterday';
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
        return '';
    }
};

// Format timestamp into date separator label
const formatDateLabel = (dateStr: string | null | undefined): string => {
    if (!dateStr) return 'Today';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch {
        return 'Today';
    }
};

// Format maintenance ticket number consistently with Maintenance Requests page
const formatTicketNumber = (req: any): string => {
    if (req?.request_number) return String(req.request_number);
    const year = req?.created_at ? new Date(req.created_at).getFullYear() : new Date().getFullYear();
    return `MR-${year}-${String(req?.id || 0).padStart(4, '0')}`;
};

// Normalize ticket priority
const normalizeTicketPriority = (p?: string): 'High' | 'Medium' | 'Low' => {
    const val = (p || '').trim().toLowerCase();
    if (val === 'high' || val === 'urgent' || val === 'emergency') return 'High';
    if (val === 'low') return 'Low';
    return 'Medium';
};

// Normalize ticket status
const normalizeTicketStatus = (s?: string): 'Pending' | 'In Progress' | 'Resolved' | 'Cancelled' => {
    const val = (s || '').trim().toLowerCase();
    if (val === 'in progress') return 'In Progress';
    if (val === 'resolved' || val === 'completed') return 'Resolved';
    if (val === 'cancelled') return 'Cancelled';
    return 'Pending';
};

// Clean raw [MAINTENANCE_REQUEST#...] tag for conversation list previews
const cleanPreviewMessage = (raw?: string | null): string => {
    if (!raw) return 'No messages yet';
    if (/^\[MAINTENANCE_REQUEST/i.test(raw)) {
        const title = raw.replace(/^\[MAINTENANCE_REQUEST(?:#\d+)?\]\s*/i, '').trim();
        return `Maintenance Ticket: ${title || 'Issue Reported'}`;
    }
    return raw;
};

// Resolve relative upload paths against backend origin
const resolveUploadUrl = (url?: string | null): string | undefined => {
    if (!url) return undefined;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
    const base = process.env.NEXT_PUBLIC_API_URL
        ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, '')
        : typeof window !== 'undefined'
            ? `http://${window.location.hostname}:5000`
            : 'http://localhost:5000';
    return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default function AdminChat() {
    const router = useRouter();
    const [conversations, setConversations] = useState<ConversationItem[]>([]);
    const [selectedTenant, setSelectedTenant] = useState<ConversationItem | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [searchFilter, setSearchFilter] = useState('');
    const [categoryTab, setCategoryTab] = useState<'all' | 'tenant' | 'staff'>('all');
    const [isSending, setIsSending] = useState(false);
    const [isLoadingConversations, setIsLoadingConversations] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const prevMsgCountRef = useRef<number>(0);
    const prevTenantIdRef = useRef<number | string | null>(null);

    // Auto-scroll when switching conversations or when new items arrive
    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        const currentTenantId = selectedTenant?.id ?? null;
        const currentCount = selectedTenant?.messages.length ?? 0;
        const switchedTenant = currentTenantId !== prevTenantIdRef.current;
        const hasNewMessages = currentCount > prevMsgCountRef.current;

        prevTenantIdRef.current = currentTenantId;
        prevMsgCountRef.current = currentCount;

        if (switchedTenant || hasNewMessages) {
            scrollToBottom();
            const t = setTimeout(scrollToBottom, 50);
            return () => clearTimeout(t);
        }
    }, [selectedTenant?.id, selectedTenant?.messages.length]);

    // Fetch conversations from API (enriched with latest maintenance tickets if needed)
    useEffect(() => {
        const fetchConversations = async () => {
            setIsLoadingConversations(true);
            try {
                const [convRes, reqRes] = await Promise.all([
                    api.get('/admin/chat/conversations'),
                    api.get('/admin/requests').catch(() => ({ data: [] })),
                ]);
                const data = convRes.data;
                const allRequests = Array.isArray(reqRes.data) ? reqRes.data : [];

                if (Array.isArray(data) && data.length > 0) {
                    const mapped: ConversationItem[] = data.map((c: any) => {
                        const tenantReqs = allRequests.filter((r: any) => Number(r.tenant_id) === Number(c.id));
                        const latestReq = tenantReqs[0]; // ordered DESC by created_at

                        let rawLastMsg: string | null = c.last_message || null;
                        let rawLastTime: string | null = c.last_message_time || null;

                        if (latestReq?.created_at) {
                            const reqTime = new Date(latestReq.created_at).getTime();
                            const msgTime = rawLastTime ? new Date(rawLastTime).getTime() : 0;
                            if (!rawLastMsg || reqTime > msgTime) {
                                rawLastMsg = `Maintenance Ticket: ${latestReq.title || 'Issue Reported'}`;
                                rawLastTime = latestReq.created_at;
                            }
                        }

                        const roomDetails = [c.room_type, c.rental_type].filter(Boolean).join(' • ');

                        return {
                            id: c.id,
                            name: c.name || 'Tenant',
                            role: c.role === 'staff' ? 'Staff' : 'Tenant',
                            category: (c.role === 'staff' ? 'staff' : 'tenant') as 'tenant' | 'staff',
                            room_number: c.room_number ? `Room ${c.room_number}` : undefined,
                            bed_space: roomDetails || undefined,
                            email: c.email || '',
                            phone: c.phone || '',
                            last_message: cleanPreviewMessage(rawLastMsg),
                            last_message_time: formatMessageTime(rawLastTime),
                            unread_count: Number(c.unread_count || 0),
                            is_online: Boolean(c.is_active),
                            total_messages: 0,
                            status: c.is_active ? 'Active' : 'Offline',
                            messages: [],
                        };
                    });
                    setConversations(mapped);
                    if (mapped.length > 0) {
                        setSelectedTenant(mapped[0]);
                    }
                }
            } catch {
                // Silently handle
            } finally {
                setIsLoadingConversations(false);
            }
        };

        fetchConversations();
    }, []);

    // Fetch messages AND requested maintenance tickets for the selected tenant
    useEffect(() => {
        if (!selectedTenant || typeof selectedTenant.id !== 'number') return;

        const targetTenantId = selectedTenant.id;
        const targetTenantName = (selectedTenant.name || '').trim().toLowerCase();

        const fetchMessagesAndTickets = async (silent = false) => {
            if (!silent) setIsLoadingMessages(true);
            try {
                const [chatRes, reqRes] = await Promise.all([
                    api.get('/admin/chat', { params: { tenant_id: targetTenantId } }).catch(() => ({ data: [] })),
                    api.get('/admin/requests').catch(() => ({ data: [] })),
                ]);

                const rawMessages = Array.isArray(chatRes.data) ? chatRes.data : [];
                const allRequests = Array.isArray(reqRes.data) ? reqRes.data : [];

                // All maintenance requests belonging to this tenant
                const tenantRequests = allRequests.filter((req: any) => {
                    if (req.tenant_id !== undefined && req.tenant_id !== null) {
                        return Number(req.tenant_id) === targetTenantId;
                    }
                    const rName = String(req.tenant_name || '').trim().toLowerCase();
                    return Boolean(targetTenantName && rName === targetTenantName);
                });

                const requestsById = new Map<number, any>();
                for (const r of tenantRequests) {
                    requestsById.set(Number(r.id), r);
                }

                const matchedRequestIds = new Set<number>();

                const toTicketInfo = (req: any): MaintenanceTicketInfo => ({
                    id: Number(req.id),
                    request_number: formatTicketNumber(req),
                    title: req.title || 'Maintenance Request',
                    description: req.description || '',
                    category: req.category || 'General',
                    priority: req.priority || 'Medium',
                    status: req.status || 'Pending',
                    room_number: req.room_number ? String(req.room_number) : undefined,
                    attachment_url: resolveUploadUrl(req.attachment_url || req.image_url),
                    assigned_to: req.assigned_to || undefined,
                    created_at: req.created_at,
                });

                // 1. Map chat messages (enriching any [MAINTENANCE_REQUEST#...] message with live ticket details)
                const mappedMessages: ChatMessage[] = rawMessages.map((msg: any) => {
                    const rawText = String(msg.message || '');
                    const createdTs = msg.created_at ? new Date(msg.created_at).getTime() : Date.now();
                    const ticketMatch = rawText.match(/^\[MAINTENANCE_REQUEST(?:#(\d+))?\]\s*([\s\S]*)$/i);

                    let ticketInfo: MaintenanceTicketInfo | undefined;
                    let cleanText = rawText;

                    if (ticketMatch) {
                        const parsedId = ticketMatch[1] ? Number(ticketMatch[1]) : null;
                        const parsedTitle = (ticketMatch[2] || '').trim() || 'Maintenance Request';
                        cleanText = parsedTitle;

                        let matchedReq = parsedId ? requestsById.get(parsedId) : undefined;
                        if (!matchedReq) {
                            matchedReq = tenantRequests.find(
                                (r: any) =>
                                    !matchedRequestIds.has(Number(r.id)) &&
                                    String(r.title || '').trim().toLowerCase() === parsedTitle.toLowerCase()
                            );
                        }

                        if (matchedReq) {
                            matchedRequestIds.add(Number(matchedReq.id));
                            ticketInfo = toTicketInfo(matchedReq);
                        } else {
                            ticketInfo = {
                                id: parsedId || 0,
                                request_number: parsedId
                                    ? `MR-${new Date(createdTs).getFullYear()}-${String(parsedId).padStart(4, '0')}`
                                    : 'MR-TICKET',
                                title: parsedTitle,
                                category: 'Maintenance',
                                priority: 'Medium',
                                status: 'Pending',
                                created_at: msg.created_at,
                            };
                        }
                    }

                    return {
                        id: msg.id,
                        sender: msg.sender_type === 'admin' ? 'admin' : 'tenant',
                        text: cleanText,
                        time: new Date(createdTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        date: formatDateLabel(msg.created_at),
                        timestamp: createdTs,
                        is_read: msg.status === 'read',
                        attachment: msg.attachment_url ? {
                            title: msg.file_name || 'Attachment',
                            type: msg.file_type || 'File',
                            size: '',
                            url: resolveUploadUrl(msg.attachment_url),
                        } : undefined,
                        maintenanceTicket: ticketInfo,
                    };
                });

                // 2. Include any requested maintenance tickets not yet represented by a chat tag message
                const standaloneTicketMessages: ChatMessage[] = tenantRequests
                    .filter((req: any) => !matchedRequestIds.has(Number(req.id)))
                    .map((req: any) => {
                        const createdTs = req.created_at ? new Date(req.created_at).getTime() : Date.now();
                        return {
                            id: `maintenance-ticket-${req.id}`,
                            sender: 'tenant' as const,
                            text: req.title || 'Maintenance Request',
                            time: new Date(createdTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            date: formatDateLabel(req.created_at),
                            timestamp: createdTs,
                            is_read: true,
                            maintenanceTicket: toTicketInfo(req),
                        };
                    });

                // 3. Merge and sort chronologically ascending
                const combined = [...mappedMessages, ...standaloneTicketMessages].sort(
                    (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
                );

                setSelectedTenant(prev =>
                    prev && prev.id === targetTenantId
                        ? { ...prev, messages: combined, total_messages: combined.length }
                        : prev
                );
            } catch {
                // Keep messages empty if API fails
            } finally {
                if (!silent) setIsLoadingMessages(false);
            }
        };

        fetchMessagesAndTickets(false);
        const pollTimer = setInterval(() => fetchMessagesAndTickets(true), 5000);
        return () => clearInterval(pollTimer);
    }, [selectedTenant?.id]);

    // Counts for Category Tabs
    const allCount = conversations.length;
    const tenantCount = conversations.filter(c => c.category === 'tenant').length;
    const staffCount = conversations.filter(c => c.category === 'staff').length;

    // Filtered conversations list
    const filteredConversations = useMemo(() => {
        return conversations.filter(c => {
            if (categoryTab === 'tenant' && c.category !== 'tenant') return false;
            if (categoryTab === 'staff' && c.category !== 'staff') return false;
            if (searchFilter.trim()) {
                const q = searchFilter.toLowerCase().trim();
                const matchesName = c.name.toLowerCase().includes(q);
                const matchesRoom = c.room_number ? c.room_number.toLowerCase().includes(q) : false;
                const matchesMsg = c.last_message.toLowerCase().includes(q);
                if (!matchesName && !matchesRoom && !matchesMsg) return false;
            }
            return true;
        });
    }, [conversations, categoryTab, searchFilter]);

    // Select a conversation
    const handleSelectConversation = (conv: ConversationItem) => {
        setSelectedTenant(conv);
        setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));
    };

    // Send a message
    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!selectedTenant || !newMessage.trim() || isSending) return;

        const textToSend = newMessage.trim();
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const createdMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            sender: 'admin',
            text: textToSend,
            time: timeStr,
            date: formatDateLabel(now.toISOString()),
            timestamp: now.getTime(),
            is_read: true
        };

        setIsSending(true);

        setSelectedTenant(prev => prev ? ({
            ...prev,
            last_message: textToSend,
            last_message_time: timeStr,
            total_messages: prev.total_messages + 1,
            messages: [...prev.messages, createdMsg]
        }) : prev);

        setConversations(prev => prev.map(c => {
            if (c.id === selectedTenant.id) {
                return {
                    ...c,
                    last_message: textToSend,
                    last_message_time: timeStr,
                    total_messages: c.total_messages + 1,
                    messages: [...c.messages, createdMsg]
                };
            }
            return c;
        }));

        setNewMessage('');
        setIsSending(false);

        // Dispatch to backend API
        if (typeof selectedTenant.id === 'number') {
            try {
                await api.post('/admin/chat', {
                    message: textToSend,
                    tenant_id: selectedTenant.id
                });
            } catch {
                // Keep local state
            }
        }
    };

    // View Request Maintenance handler
    const handleViewMaintenanceRequest = async () => {
        if (!selectedTenant) {
            toast.warning('no maintenance request for this tenant');
            return;
        }

        try {
            const { data: requestsList } = await api.get('/admin/requests');

            if (!Array.isArray(requestsList) || requestsList.length === 0) {
                toast.warning('no maintenance request for this tenant');
                return;
            }

            const targetTenantId = typeof selectedTenant.id === 'number' ? selectedTenant.id : parseInt(String(selectedTenant.id));
            const targetName = (selectedTenant.name || '').trim().toLowerCase();
            const targetRoom = (selectedTenant.room_number || '').replace(/\D/g, '');

            const foundRequest = requestsList.find((req: any) => {
                if (targetTenantId && Number(req.tenant_id) === targetTenantId) {
                    return true;
                }
                const reqName = String(req.tenant_name || '').trim().toLowerCase();
                const reqRoom = String(req.room_number || '').replace(/\D/g, '');
                
                const nameMatches = Boolean(targetName && (reqName === targetName || reqName.includes(targetName) || targetName.includes(reqName)));
                const roomMatches = Boolean(targetRoom && reqRoom && targetRoom === reqRoom);

                return nameMatches || roomMatches;
            });

            if (!foundRequest) {
                toast.warning('no maintenance request for this tenant');
                return;
            }

            router.push(`/admin/requests?tenant=${encodeURIComponent(foundRequest.tenant_name || selectedTenant.name)}&requestId=${foundRequest.id}`);
        } catch {
            toast.warning('no maintenance request for this tenant');
        }
    };

    // Group messages by date for date separators
    const groupedMessages = useMemo(() => {
        if (!selectedTenant) return [];
        const groups: { date: string; messages: ChatMessage[] }[] = [];
        let currentDate = '';

        for (const msg of selectedTenant.messages) {
            const msgDate = msg.date || 'Today';
            if (msgDate !== currentDate) {
                currentDate = msgDate;
                groups.push({ date: msgDate, messages: [msg] });
            } else {
                groups[groups.length - 1].messages.push(msg);
            }
        }
        return groups;
    }, [selectedTenant?.messages]);

    return (
        <div suppressHydrationWarning className="w-full h-[calc(100vh-6.2rem)] md:h-[calc(100vh-7.2rem)] lg:h-[calc(100dvh-7.2rem)] flex flex-col font-sans text-slate-900 dark:text-zinc-100 overflow-hidden">
            
            {/* 3-Column Split Screen Container */}
            <div className="flex-1 min-h-0 bg-white dark:bg-zinc-950 border border-slate-200/90 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs flex">
                
                {/* ========================================================
                    LEFT COLUMN: Conversations List
                   ======================================================== */}
                <div className="w-full sm:w-72 md:w-80 lg:w-[310px] xl:w-[330px] border-r border-slate-200/80 dark:border-zinc-800 flex flex-col shrink-0 bg-white dark:bg-zinc-950">
                    
                    {/* Search Bar & Category Filter Tabs Header */}
                    <div className="p-3.5 border-b border-slate-100 dark:border-zinc-900 space-y-2.5">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search conversations..."
                                value={searchFilter}
                                onChange={(e) => setSearchFilter(e.target.value)}
                                className="w-full py-2 pl-9 pr-3.5 text-xs rounded-xl bg-slate-50/80 dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all"
                            />
                        </div>

                        {/* Category Filter Tabs (All | Tenants | Staff) */}
                        <div className="flex items-center gap-1.5 select-none pt-0.5">
                            <button
                                type="button"
                                onClick={() => setCategoryTab('all')}
                                className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                    categoryTab === 'all'
                                        ? 'bg-[#0062cc] text-white shadow-xs'
                                        : 'bg-slate-100 hover:bg-slate-200/70 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                                }`}
                            >
                                All ({allCount})
                            </button>
                            <button
                                type="button"
                                onClick={() => setCategoryTab('tenant')}
                                className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                    categoryTab === 'tenant'
                                        ? 'bg-[#0062cc] text-white shadow-xs'
                                        : 'bg-slate-100 hover:bg-slate-200/70 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                                }`}
                            >
                                Tenants ({tenantCount})
                            </button>
                            <button
                                type="button"
                                onClick={() => setCategoryTab('staff')}
                                className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                    categoryTab === 'staff'
                                        ? 'bg-[#0062cc] text-white shadow-xs'
                                        : 'bg-slate-100 hover:bg-slate-200/70 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                                }`}
                            >
                                Staff ({staffCount})
                            </button>
                        </div>
                    </div>

                    {/* Conversation Items List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {isLoadingConversations ? (
                            <div className="flex items-center justify-center py-16">
                                <div className="w-6 h-6 border-2 border-slate-200 dark:border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
                            </div>
                        ) : filteredConversations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-zinc-500">
                                <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
                                <p className="text-xs font-medium">No conversations found</p>
                            </div>
                        ) : (
                            filteredConversations.map(conv => {
                                const isSelected = selectedTenant?.id === conv.id;

                                return (
                                    <div
                                        key={conv.id}
                                        onClick={() => handleSelectConversation(conv)}
                                        className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-center gap-3 select-none ${
                                            isSelected
                                                ? 'bg-[#edf5ff] dark:bg-blue-950/40 text-slate-900 dark:text-white'
                                                : 'hover:bg-slate-50 dark:hover:bg-zinc-900/60 text-slate-700 dark:text-zinc-300'
                                        }`}
                                    >
                                        {/* Avatar with Online Status */}
                                        <div className="relative shrink-0">
                                            {conv.isGroup ? (
                                                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 text-[#0062cc] dark:text-blue-400 flex items-center justify-center shadow-xs">
                                                    <Users className="w-5 h-5 stroke-[2.2]" />
                                                </div>
                                            ) : conv.isTeam ? (
                                                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 text-[#0062cc] dark:text-blue-400 flex items-center justify-center shadow-xs">
                                                    <Wrench className="w-5 h-5 stroke-[2.2]" />
                                                </div>
                                            ) : (
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-xs select-none ${getAvatarColor(conv.name)}`}>
                                                    {conv.name.trim().charAt(0).toUpperCase()}
                                                </div>
                                            )}

                                            {conv.is_online && (
                                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-950" />
                                            )}
                                        </div>

                                        {/* Name, Snippet, Time & Counter */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-1 leading-tight">
                                                <span className={`text-[13px] truncate ${
                                                    isSelected 
                                                        ? 'font-bold text-slate-950 dark:text-white' 
                                                        : conv.unread_count > 0 
                                                            ? 'font-bold text-slate-900 dark:text-zinc-100' 
                                                            : 'font-semibold text-slate-800 dark:text-zinc-200'
                                                }`}>
                                                    {conv.name}
                                                </span>
                                                <span className={`text-[11px] shrink-0 font-medium ${
                                                    isSelected ? 'text-[#0062cc] dark:text-blue-400' : 'text-slate-400 dark:text-zinc-500'
                                                }`}>
                                                    {conv.last_message_time}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between gap-2 mt-1">
                                                <p className="text-xs text-slate-500 dark:text-zinc-400 truncate">
                                                    {conv.last_message}
                                                </p>

                                                {conv.unread_count > 0 && (
                                                    <span className="min-w-4.5 h-4.5 px-1 rounded-full bg-[#0062cc] text-white text-[10px] font-bold flex items-center justify-center shadow-xs shrink-0">
                                                        {conv.unread_count}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* ========================================================
                    CENTER COLUMN: Active Chat Canvas (flex-1)
                   ======================================================== */}
                <div className="flex-1 flex flex-col bg-white dark:bg-zinc-950 overflow-hidden min-h-0 relative border-r border-slate-200/80 dark:border-zinc-800">
                    
                    {selectedTenant ? (
                        <>
                            {/* Thread Header */}
                            <div className="p-3.5 sm:px-5 sm:py-3.5 border-b border-slate-200/80 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-950 shrink-0">
                                {/* Resident Info Left */}
                                <div className="flex items-center gap-3">
                                    <div className="relative shrink-0">
                                        {selectedTenant.isGroup ? (
                                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 text-[#0062cc] dark:text-blue-400 flex items-center justify-center shadow-xs">
                                                <Users className="w-5 h-5 stroke-[2.2]" />
                                            </div>
                                        ) : selectedTenant.isTeam ? (
                                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 text-[#0062cc] dark:text-blue-400 flex items-center justify-center shadow-xs">
                                                <Wrench className="w-5 h-5 stroke-[2.2]" />
                                            </div>
                                        ) : (
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-xs select-none ${getAvatarColor(selectedTenant.name)}`}>
                                                {selectedTenant.name.trim().charAt(0).toUpperCase()}
                                            </div>
                                        )}

                                        {selectedTenant.is_online && (
                                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-950" />
                                        )}
                                    </div>

                                    <div>
                                        <h3 className="font-bold text-[15px] sm:text-base text-slate-900 dark:text-white leading-tight">
                                            {selectedTenant.name}
                                        </h3>

                                        <div className="flex items-center gap-2 text-xs mt-0.5">
                                            {/* Online / Offline status */}
                                            {selectedTenant.is_online ? (
                                                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11.5px]">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                    <span>Online</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 text-slate-400 dark:text-zinc-500 font-semibold text-[11.5px]">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-600"></span>
                                                    <span>Offline</span>
                                                </div>
                                            )}

                                            <span className="text-slate-300 dark:text-zinc-600">•</span>

                                            {/* Room & Role */}
                                            <div className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400 text-[11.5px]">
                                                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                                <span>{selectedTenant.room_number || "—"}</span>
                                                <span className="text-slate-300 dark:text-zinc-600">•</span>
                                                <User className="w-3.5 h-3.5 text-slate-400" />
                                                <span>{selectedTenant.role || "Tenant"}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Call, Video & More Buttons on Right */}
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => toast.info(`Starting voice call with ${selectedTenant.name}...`)}
                                        className="w-8 h-8 rounded-lg border border-slate-200/80 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-850 flex items-center justify-center text-slate-600 dark:text-zinc-400 transition-colors cursor-pointer"
                                        title="Phone call"
                                    >
                                        <Phone className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => toast.info(`Starting video call with ${selectedTenant.name}...`)}
                                        className="w-8 h-8 rounded-lg border border-slate-200/80 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-850 flex items-center justify-center text-slate-600 dark:text-zinc-400 transition-colors cursor-pointer"
                                        title="Video call"
                                    >
                                        <Video className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => toast.info("Options", { description: "Conversation options" })}
                                        className="w-8 h-8 rounded-lg border border-slate-200/80 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-850 flex items-center justify-center text-slate-600 dark:text-zinc-400 transition-colors cursor-pointer"
                                        title="More options"
                                    >
                                        <MoreVertical className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Messages Body */}
                            <div 
                                ref={scrollRef} 
                                className="flex-1 overflow-y-auto chat-scrollbar p-5 flex flex-col min-h-0 bg-white dark:bg-zinc-950"
                            >
                                {isLoadingMessages ? (
                                    <div className="flex-1 flex items-center justify-center">
                                        <div className="w-6 h-6 border-2 border-slate-200 dark:border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
                                    </div>
                                ) : selectedTenant.messages.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-zinc-500">
                                        <MessageSquare className="w-10 h-10 mb-2 opacity-30" />
                                        <p className="text-xs font-medium">No messages yet</p>
                                        <p className="text-[11px] mt-0.5">Send a message to start a conversation.</p>
                                    </div>
                                ) : (
                                    <div className="mt-auto flex flex-col space-y-4 w-full">
                                        {groupedMessages.map((group, gi) => (
                                            <div key={gi}>
                                                {/* Date Separator */}
                                                <div className="relative flex py-2 items-center select-none my-1">
                                                    <div className="flex-grow border-t border-slate-100 dark:border-zinc-900"></div>
                                                    <span className="flex-shrink mx-4 text-xs font-medium text-slate-400 dark:text-zinc-500">
                                                        {group.date}
                                                    </span>
                                                    <div className="flex-grow border-t border-slate-100 dark:border-zinc-900"></div>
                                                </div>

                                                {/* Message Bubbles */}
                                                {group.messages.map((msg) => {
                                                    const isFromAdmin = msg.sender === 'admin';

                                                    if (isFromAdmin) {
                                                        return (
                                                            <div key={msg.id} className="w-full flex justify-end mb-4">
                                                                <div className="flex flex-col items-end max-w-[500px]">
                                                                    {/* Admin Outgoing Bubble */}
                                                                    <div className="bg-[#0062cc] text-white rounded-2xl rounded-tr-xs p-4 shadow-xs text-[13px] leading-relaxed">
                                                                        <p className="whitespace-pre-wrap">{msg.text}</p>

                                                                        {/* Attachment Box */}
                                                                        {msg.attachment && (
                                                                            <div className="mt-3 bg-white dark:bg-zinc-900 rounded-xl p-3 flex items-center justify-between gap-3 border border-blue-200/40 dark:border-zinc-800 shadow-xs text-slate-900 dark:text-white cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-850 transition-colors">
                                                                                <div className="flex items-center gap-3 min-w-0">
                                                                                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#0062cc] dark:text-blue-400 flex items-center justify-center shrink-0">
                                                                                        <FileText className="w-5 h-5 stroke-[2.2]" />
                                                                                    </div>
                                                                                    <div className="min-w-0">
                                                                                        <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                                                                            {msg.attachment.title}
                                                                                        </h4>
                                                                                        <span className="text-[11px] text-slate-400 font-medium">
                                                                                            {msg.attachment.type} • {msg.attachment.size}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>

                                                                                <Download className="w-4 h-4 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 shrink-0" />
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Timestamp & Read Receipt */}
                                                                    <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-zinc-500 mt-1 pr-1 font-sans">
                                                                        <CheckCheck className="w-3.5 h-3.5 text-[#0062cc] dark:text-blue-400" />
                                                                        <span>{msg.time}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    // Incoming Resident Maintenance Ticket Card
                                                    if (msg.maintenanceTicket) {
                                                        const ticket = msg.maintenanceTicket;
                                                        const normPriority = normalizeTicketPriority(ticket.priority);
                                                        const normStatus = normalizeTicketStatus(ticket.status);

                                                        return (
                                                            <div key={msg.id} className="w-full flex justify-start items-start gap-2.5 mb-4">
                                                                <div className="shrink-0 mt-0.5">
                                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs select-none shadow-2xs ${getAvatarColor(selectedTenant.name)}`}>
                                                                        {selectedTenant.name.trim().charAt(0).toUpperCase()}
                                                                    </div>
                                                                </div>

                                                                <div className="flex flex-col items-start max-w-[460px] w-full sm:w-[370px]">
                                                                    <div className="w-full bg-white dark:bg-zinc-900 rounded-2xl rounded-tl-xs border border-slate-200/90 dark:border-zinc-800 shadow-xs overflow-hidden">
                                                                        {/* Ticket Header */}
                                                                        <div className="px-3.5 py-2.5 bg-slate-50/80 dark:bg-zinc-900/80 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                                                                            <div className="flex items-center gap-2 min-w-0">
                                                                                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#0062cc] dark:text-blue-400 flex items-center justify-center shrink-0">
                                                                                    <Wrench className="w-3.5 h-3.5 stroke-[2.2]" />
                                                                                </div>
                                                                                <div className="min-w-0">
                                                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block leading-none">
                                                                                        Requested Maintenance Ticket
                                                                                    </span>
                                                                                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-white leading-tight mt-0.5 block truncate">
                                                                                        {ticket.request_number}
                                                                                    </span>
                                                                                </div>
                                                                            </div>

                                                                            {/* Status - Colored text only */}
                                                                            <div className="shrink-0">
                                                                                {normStatus === 'Pending' && (
                                                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                                                                                        <Clock className="w-3 h-3" /> Pending
                                                                                    </span>
                                                                                )}
                                                                                {normStatus === 'In Progress' && (
                                                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                                                                                        <User className="w-3 h-3" /> In Progress
                                                                                    </span>
                                                                                )}
                                                                                {normStatus === 'Resolved' && (
                                                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                                                                        <CheckCircle2 className="w-3 h-3" /> Resolved
                                                                                    </span>
                                                                                )}
                                                                                {normStatus === 'Cancelled' && (
                                                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                                                                                        Cancelled
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        {/* Ticket Body */}
                                                                        <div className="p-3.5 space-y-2">
                                                                            <h4 className="font-bold text-[13px] text-slate-900 dark:text-white leading-snug">
                                                                                {ticket.title}
                                                                            </h4>

                                                                            {ticket.description && (
                                                                                <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed line-clamp-3 whitespace-pre-wrap">
                                                                                    {ticket.description}
                                                                                </p>
                                                                            )}

                                                                            {/* Category, Priority & Room */}
                                                                            <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1 pt-0.5 text-[11px]">
                                                                                <span className="font-semibold text-slate-600 dark:text-zinc-300">
                                                                                    {ticket.category}
                                                                                </span>
                                                                                <span className="text-slate-300 dark:text-zinc-700">•</span>
                                                                                {normPriority === 'High' && (
                                                                                    <span className="inline-flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400">
                                                                                        <Flame className="w-3 h-3 fill-current" /> High Priority
                                                                                    </span>
                                                                                )}
                                                                                {normPriority === 'Medium' && (
                                                                                    <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                                                                                        <Zap className="w-3 h-3 fill-current" /> Medium Priority
                                                                                    </span>
                                                                                )}
                                                                                {normPriority === 'Low' && (
                                                                                    <span className="inline-flex items-center font-bold text-teal-600 dark:text-teal-400">
                                                                                        Low Priority
                                                                                    </span>
                                                                                )}
                                                                                {(ticket.room_number || selectedTenant.room_number) && (
                                                                                    <>
                                                                                        <span className="text-slate-300 dark:text-zinc-700">•</span>
                                                                                        <span className="text-slate-500 dark:text-zinc-400 font-medium">
                                                                                            {ticket.room_number ? `Room ${ticket.room_number}` : selectedTenant.room_number}
                                                                                        </span>
                                                                                    </>
                                                                                )}
                                                                            </div>

                                                                            {/* Optional Attached Issue Photo */}
                                                                            {ticket.attachment_url && (
                                                                                <div className="pt-1">
                                                                                    <img
                                                                                        src={ticket.attachment_url}
                                                                                        alt={ticket.title}
                                                                                        className="w-full max-h-40 object-cover rounded-xl border border-slate-200/80 dark:border-zinc-800"
                                                                                    />
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* Interactive Footer to Open Ticket */}
                                                                        {ticket.id > 0 && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    router.push(
                                                                                        `/admin/requests?tenant=${encodeURIComponent(selectedTenant.name)}&requestId=${ticket.id}`
                                                                                    )
                                                                                }
                                                                                className="w-full px-3.5 py-2 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/40 dark:bg-zinc-900/40 hover:bg-blue-50/60 dark:hover:bg-blue-950/30 text-xs font-bold text-[#0062cc] dark:text-blue-400 flex items-center justify-between transition-colors cursor-pointer"
                                                                            >
                                                                                <span>View Maintenance Ticket</span>
                                                                                <ArrowRight className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        )}
                                                                    </div>

                                                                    <span className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1 pl-1 font-sans">
                                                                        {msg.time}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    // Incoming Resident Bubble
                                                    return (
                                                        <div key={msg.id} className="w-full flex justify-start items-start gap-2.5 mb-4">
                                                            <div className="shrink-0 mt-0.5">
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs select-none shadow-2xs ${getAvatarColor(selectedTenant.name)}`}>
                                                                    {selectedTenant.name.trim().charAt(0).toUpperCase()}
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col items-start max-w-[480px]">
                                                                <div className="bg-[#f0f2f5] dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 rounded-2xl rounded-tl-xs px-4 py-3 shadow-2xs text-[13px] leading-relaxed border border-slate-100 dark:border-zinc-800/80">
                                                                    <p className="whitespace-pre-wrap">{msg.text}</p>
                                                                    {msg.attachment && (
                                                                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-zinc-800">
                                                                            {msg.attachment.type.startsWith('image/') || msg.attachment.url?.match(/\.(png|jpe?g|gif|webp|svg)$/i) ? (
                                                                                <a href={msg.attachment.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border border-slate-200 dark:border-zinc-700">
                                                                                    <img src={msg.attachment.url} alt={msg.attachment.title} className="max-h-60 max-w-full rounded-lg object-contain bg-black/5 dark:bg-black/20" />
                                                                                </a>
                                                                            ) : (
                                                                                <a href={msg.attachment.url} download={msg.attachment.title} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors">
                                                                                    <FileText className="w-4 h-4 text-[#0062cc]" />
                                                                                    <span className="truncate max-w-[200px]">{msg.attachment.title}</span>
                                                                                    <Download className="w-3.5 h-3.5 opacity-70 ml-1" />
                                                                                </a>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <span className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1 pl-1 font-sans">
                                                                    {msg.time}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Chat Input Bar */}
                            <div className="p-3.5 border-t border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0">
                                <form onSubmit={handleSend} className="flex items-center gap-2.5">
                                    {/* Attachment Button */}
                                    <button
                                        type="button"
                                        onClick={() => toast.info("Attach Document", { description: "Select file or photo to send." })}
                                        className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                                        title="Attach file"
                                    >
                                        <Paperclip className="w-4 h-4" />
                                    </button>

                                    {/* Message Input */}
                                    <input
                                        type="text"
                                        placeholder="Type a message..."
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        className="flex-1 py-2.5 px-4 text-xs rounded-xl bg-slate-50/70 dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all"
                                    />

                                    {/* Send Button */}
                                    <button
                                        type="submit"
                                        disabled={!newMessage.trim() || isSending}
                                        className="w-9 h-9 rounded-xl bg-[#0062cc] hover:bg-[#0052ad] text-white flex items-center justify-center shadow-xs transition-colors cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                                        title="Send message"
                                    >
                                        <Send className="w-4 h-4 ml-0.5" />
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        /* No conversation selected placeholder */
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-zinc-500">
                            <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
                            <p className="text-sm font-bold text-slate-600 dark:text-zinc-300">
                                {isLoadingConversations ? 'Loading conversations...' : 'Select a conversation'}
                            </p>
                            <p className="text-xs mt-0.5">Choose a tenant from the list to start messaging.</p>
                        </div>
                    )}
                </div>

                {/* ========================================================
                    RIGHT COLUMN: Details Panel
                   ======================================================== */}
                <div className="hidden lg:flex w-72 xl:w-80 shrink-0 flex-col gap-3.5 p-4 bg-slate-50/50 dark:bg-zinc-900/30 overflow-y-auto custom-scrollbar">

                    {selectedTenant && (
                        <>
                            {/* Card 1: Resident / Tenant Profile */}
                            <div className="bg-white dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 shadow-xs space-y-3.5">
                                {/* Avatar + Name + Status + Room */}
                                <div className="flex items-start gap-3">
                                    <div className="relative shrink-0">
                                        {selectedTenant.isGroup ? (
                                            <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/50 text-[#0062cc] dark:text-blue-400 flex items-center justify-center shadow-xs">
                                                <Users className="w-7 h-7 stroke-[2.2]" />
                                            </div>
                                        ) : selectedTenant.isTeam ? (
                                            <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/50 text-[#0062cc] dark:text-blue-400 flex items-center justify-center shadow-xs">
                                                <Wrench className="w-7 h-7 stroke-[2.2]" />
                                            </div>
                                        ) : (
                                            <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl shadow-xs select-none ${getAvatarColor(selectedTenant.name)}`}>
                                                {selectedTenant.name.trim().charAt(0).toUpperCase()}
                                            </div>
                                        )}

                                        {selectedTenant.is_online && (
                                            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-950" />
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-bold text-base text-slate-900 dark:text-white truncate leading-tight">
                                            {selectedTenant.name}
                                        </h3>

                                        {/* Online / Offline badge */}
                                        <div className="flex items-center gap-1.5 mt-1">
                                            {selectedTenant.is_online ? (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                    Online
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                                    Offline
                                                </span>
                                            )}
                                        </div>

                                        {/* Room & Bedspace info */}
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 mt-1.5 truncate">
                                            <Building2 className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                            <span className="truncate">
                                                {selectedTenant.room_number || "Room —"} {selectedTenant.bed_space ? `• ${selectedTenant.bed_space}` : ""}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Contact Info (Email & Phone) */}
                                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-900 text-xs">
                                    <div className="flex items-center gap-2.5 text-slate-600 dark:text-zinc-300">
                                        <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                                        <span className="truncate">{selectedTenant.email || "No email registered"}</span>
                                    </div>
                                    <div className="flex items-center gap-2.5 text-slate-600 dark:text-zinc-300">
                                        <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                                        <span className="truncate">{selectedTenant.phone || "No phone registered"}</span>
                                    </div>
                                </div>

                                {/* View Tenant Profile Button */}
                                <Link
                                    href={`/admin/tenants?tenant=${encodeURIComponent(selectedTenant.name)}`}
                                    className="w-full py-2 px-3 border border-[#0062cc] text-[#0062cc] hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>View Tenant Profile</span>
                                </Link>
                            </div>

                            {/* Card 2: Quick Actions */}
                            <div className="bg-white dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 shadow-xs">
                                <h4 className="font-bold text-xs text-slate-900 dark:text-white mb-2.5">
                                    Quick Actions
                                </h4>

                                <div className="space-y-1.5">
                                    {/* View Room Details */}
                                    <Link
                                        href={`/admin/rooms${selectedTenant.room_number ? `?search=${encodeURIComponent(selectedTenant.room_number.replace(/\D/g, ''))}` : ''}`}
                                        className="w-full p-2 rounded-xl border border-slate-200/70 dark:border-zinc-800 hover:border-blue-300 hover:bg-blue-50/40 dark:hover:bg-zinc-900 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-zinc-200 transition-colors group cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#0062cc] dark:text-blue-400 flex items-center justify-center shrink-0">
                                                <FileText className="w-4 h-4 stroke-[2.2]" />
                                            </div>
                                            <span>View Room Details</span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                                    </Link>

                                    {/* View Payment History */}
                                    <Link
                                        href={`/admin/billing?tenant=${encodeURIComponent(selectedTenant.name)}&tenantId=${encodeURIComponent(String(selectedTenant.id))}&history=true`}
                                        className="w-full p-2 rounded-xl border border-slate-200/70 dark:border-zinc-800 hover:border-blue-300 hover:bg-blue-50/40 dark:hover:bg-zinc-900 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-zinc-200 transition-colors group cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#0062cc] dark:text-blue-400 flex items-center justify-center shrink-0">
                                                <CreditCard className="w-4 h-4 stroke-[2.2]" />
                                            </div>
                                            <span>View Payment History</span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                                    </Link>

                                    {/* View Request Maintenance */}
                                    <button
                                        type="button"
                                        onClick={handleViewMaintenanceRequest}
                                        className="w-full p-2 rounded-xl border border-slate-200/70 dark:border-zinc-800 hover:border-blue-300 hover:bg-blue-50/40 dark:hover:bg-zinc-900 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-zinc-200 transition-colors group cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#0062cc] dark:text-blue-400 flex items-center justify-center shrink-0">
                                                <Wrench className="w-4 h-4 stroke-[2.2]" />
                                            </div>
                                            <span>View Request Maintenance</span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                </div>

            </div>
        </div>
    );
}
