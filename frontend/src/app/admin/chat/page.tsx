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
    Phone, MoreVertical,
    Mail, ExternalLink, CreditCard,
    Flame, Zap, Clock, CheckCircle2, ArrowRight,
    X, File, Bell
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
    if (/\[MAINTENANCE_REQUEST/i.test(raw)) {
        if (raw.toLowerCase().includes('here is the updated status')) {
            const statusMatch = raw.match(/Status:\s*([^\n\r]+)/i);
            const statusStr = statusMatch ? ` (${statusMatch[1].trim()})` : '';
            return `Maintenance Status Updated${statusStr}`;
        }
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
    const [isSending, setIsSending] = useState(false);
    const [isLoadingConversations, setIsLoadingConversations] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);

    // Latest community announcement pinned under the thread header name
    const [latestAnnouncement, setLatestAnnouncement] = useState<{
        id?: number | string;
        title: string;
        content?: string;
        created_at?: string;
        created_by_name?: string;
    } | null>(null);

    // Quick Action: post an announcement straight from the chat screen
    const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
    const [announcementText, setAnnouncementText] = useState('');
    const [isPostingAnnouncement, setIsPostingAnnouncement] = useState(false);

    // Attachment file upload state
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 25 MB attachment size limit for chat
    const MAX_FILE_SIZE_MB = 25;
    const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

    const formatFileSize = (bytes: number) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > MAX_FILE_SIZE_BYTES) {
            toast.error('File Exceeds Size Limit', {
                description: `Chat attachments cannot exceed ${MAX_FILE_SIZE_MB} MB. Your selected file is ${(file.size / (1024 * 1024)).toFixed(1)} MB.`
            });
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setSelectedFile(file);
        if (file.type.startsWith('image/')) {
            setFilePreviewUrl(URL.createObjectURL(file));
        } else {
            setFilePreviewUrl(null);
        }
    };

    const handleRemoveSelectedFile = () => {
        if (filePreviewUrl) {
            URL.revokeObjectURL(filePreviewUrl);
        }
        setSelectedFile(null);
        setFilePreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    useEffect(() => {
        return () => {
            if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
        };
    }, [filePreviewUrl]);

    // Keep the pinned announcement under the thread header up to date
    useEffect(() => {
        let cancelled = false;
        const fetchLatestAnnouncement = async () => {
            try {
                const { data } = await api.get('/admin/announcements');
                if (cancelled) return;
                setLatestAnnouncement(Array.isArray(data) && data.length > 0 ? data[0] : null);
            } catch {
                // Keep whatever announcement is already on screen
            }
        };
        fetchLatestAnnouncement();
        const interval = setInterval(fetchLatestAnnouncement, 60000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, []);

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

                        const roomDetails = [c.rental_type].filter(Boolean).join(' • ');

                        return {
                            id: c.id,
                            name: c.name || 'Tenant',
                            role: 'Tenant',
                            category: 'tenant',
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
                    const ticketMatch = rawText.match(/\[MAINTENANCE_REQUEST(?:#(\d+))?\]\s*([^\n\r]*)/i);

                    let ticketInfo: MaintenanceTicketInfo | undefined;
                    let cleanText = rawText;

                    if (ticketMatch) {
                        const ticketStart = ticketMatch.index ?? 0;
                        const prefix = rawText.substring(0, ticketStart).trim();
                        const ticketSection = rawText.substring(ticketStart);
                        const parsedId = ticketMatch[1] ? Number(ticketMatch[1]) : null;
                        const parsedTitle = (ticketMatch[2] || '').trim() || 'Maintenance Request';
                        const statusMatch = ticketSection.match(/^Status:\s*([^\n\r]+)/im);
                        const parsedStatus = statusMatch ? statusMatch[1].trim() : undefined;

                        cleanText = prefix || parsedTitle;

                        let matchedReq = parsedId ? requestsById.get(parsedId) : undefined;
                        if (!matchedReq) {
                            matchedReq = tenantRequests.find(
                                (r: any) =>
                                    !matchedRequestIds.has(Number(r.id)) &&
                                    String(r.title || '').trim().toLowerCase() === parsedTitle.toLowerCase()
                            );
                        }

                        if (matchedReq) {
                            if (msg.sender_type !== 'admin') {
                                matchedRequestIds.add(Number(matchedReq.id));
                            }
                            ticketInfo = {
                                ...toTicketInfo(matchedReq),
                                status: parsedStatus || matchedReq.status,
                            };
                        } else {
                            ticketInfo = {
                                id: parsedId || 0,
                                request_number: parsedId
                                    ? `MR-${new Date(createdTs).getFullYear()}-${String(parsedId).padStart(4, '0')}`
                                    : 'MR-TICKET',
                                title: parsedTitle,
                                category: 'Maintenance',
                                priority: 'Medium',
                                status: parsedStatus || 'Pending',
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
                        attachment: msg.attachment_url && !(msg.sender_type === 'admin' && ticketInfo) ? {
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

    // Filtered conversations list
    const filteredConversations = useMemo(() => {
        return conversations.filter(c => {
            if (searchFilter.trim()) {
                const q = searchFilter.toLowerCase().trim();
                const matchesName = c.name.toLowerCase().includes(q);
                const matchesRoom = c.room_number ? c.room_number.toLowerCase().includes(q) : false;
                const matchesMsg = c.last_message.toLowerCase().includes(q);
                if (!matchesName && !matchesRoom && !matchesMsg) return false;
            }
            return true;
        });
    }, [conversations, searchFilter]);

    // Select a conversation
    const handleSelectConversation = (conv: ConversationItem) => {
        handleRemoveSelectedFile();
        setSelectedTenant(conv);
        setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));
    };

    // Send a message
    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!selectedTenant || (!newMessage.trim() && !selectedFile) || isSending) return;

        const textToSend = newMessage.trim();
        const fileToSend = selectedFile;
        const filePreview = filePreviewUrl;
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const createdMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            sender: 'admin',
            text: textToSend || (fileToSend ? `Sent attachment: ${fileToSend.name}` : ''),
            time: timeStr,
            date: formatDateLabel(now.toISOString()),
            timestamp: now.getTime(),
            is_read: true,
            attachment: fileToSend ? {
                title: fileToSend.name,
                type: fileToSend.type || 'File',
                size: formatFileSize(fileToSend.size),
                url: filePreview || undefined
            } : undefined
        };

        setIsSending(true);

        setSelectedTenant(prev => prev ? ({
            ...prev,
            last_message: createdMsg.text,
            last_message_time: timeStr,
            total_messages: prev.total_messages + 1,
            messages: [...prev.messages, createdMsg]
        }) : prev);

        setConversations(prev => prev.map(c => {
            if (c.id === selectedTenant.id) {
                return {
                    ...c,
                    last_message: createdMsg.text,
                    last_message_time: timeStr,
                    total_messages: c.total_messages + 1,
                    messages: [...c.messages, createdMsg]
                };
            }
            return c;
        }));

        setNewMessage('');
        handleRemoveSelectedFile();

        // Dispatch to backend API
        if (typeof selectedTenant.id === 'number') {
            try {
                if (fileToSend) {
                    const formData = new FormData();
                    if (textToSend) formData.append('message', textToSend);
                    formData.append('tenant_id', String(selectedTenant.id));
                    formData.append('file', fileToSend);

                    const res = await api.post('/admin/chat', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });

                    if (res.data && res.data.attachment_url) {
                        const serverUrl = resolveUploadUrl(res.data.attachment_url);
                        setSelectedTenant(prev => {
                            if (!prev) return prev;
                            return {
                                ...prev,
                                messages: prev.messages.map(m => m.id === createdMsg.id ? {
                                    ...m,
                                    attachment: m.attachment ? { ...m.attachment, url: serverUrl } : undefined
                                } : m)
                            };
                        });
                    }
                } else {
                    await api.post('/admin/chat', {
                        message: textToSend,
                        tenant_id: selectedTenant.id
                    });
                }
            } catch (err: any) {
                console.error('Failed to send message:', err);
                const msg = err.response?.data?.message || 'Failed to send message';
                toast.error('Send Error', { description: msg });
            } finally {
                setIsSending(false);
            }
        } else {
            setIsSending(false);
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

    // --- PUBLISH ANNOUNCEMENT ---
    const handlePostAnnouncement = async (e: React.FormEvent) => {
        e.preventDefault();
        const text = announcementText.trim();
        if (!text) {
            toast.warning('Empty Announcement', {
                description: 'Please enter announcement text before submitting.'
            });
            return;
        }

        setIsPostingAnnouncement(true);
        try {
            const firstLine = text.split('\n')[0];
            const title = firstLine.length > 60 ? `${firstLine.slice(0, 57)}...` : firstLine;
            const { data } = await api.post('/admin/announcements', {
                title,
                content: text,
                type: 'General'
            });
            const created = data.announcement || data;
            setLatestAnnouncement(created);
            setAnnouncementText('');
            setShowAnnouncementModal(false);
            toast.success('Announcement Published', {
                description: 'Notice posted to the community bulletin board.'
            });
        } catch (err) {
            console.error('Failed to post announcement:', err);
            toast.error('Publishing Failed', {
                description: 'Could not post the announcement to the community board.'
            });
        } finally {
            setIsPostingAnnouncement(false);
        }
    };

    // Group messages by date for date separators
    const groupedMessages = useMemo(() => {        if (!selectedTenant) return [];
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
                    
                    {/* Search Bar Header */}
                    <div className="p-3.5 border-b border-slate-100 dark:border-zinc-900">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search conversations..."
                                value={searchFilter}
                                onChange={(e) => setSearchFilter(e.target.value)}
                                className="w-full py-2.5 pl-9 pr-3.5 text-sm sm:text-base rounded-xl bg-slate-50/80 dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all"
                            />
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
                                <p className="text-sm font-medium">No conversations found</p>
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
                                                <span className={`text-sm sm:text-base truncate ${
                                                    isSelected 
                                                        ? 'font-bold text-slate-950 dark:text-white' 
                                                        : conv.unread_count > 0 
                                                            ? 'font-bold text-slate-900 dark:text-zinc-100' 
                                                            : 'font-semibold text-slate-800 dark:text-zinc-200'
                                                }`}>
                                                    {conv.name}
                                                </span>
                                                <span className={`text-xs shrink-0 font-semibold ${
                                                    isSelected ? 'text-[#0062cc] dark:text-blue-400' : 'text-slate-400 dark:text-zinc-500'
                                                }`}>
                                                    {conv.last_message_time}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between gap-2 mt-1">
                                                <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 truncate">
                                                    {conv.last_message}
                                                </p>

                                                {conv.unread_count > 0 && (
                                                    <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#0062cc] text-white text-xs font-bold flex items-center justify-center shadow-xs shrink-0">
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
                                        <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
                                            {selectedTenant.name}
                                        </h3>

                                        <div className="flex items-center gap-2 text-xs sm:text-sm mt-0.5">
                                            {/* Online / Offline status */}
                                            {selectedTenant.is_online ? (
                                                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-xs sm:text-sm">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                                    <span>Online</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 text-slate-400 dark:text-zinc-500 font-semibold text-xs sm:text-sm">
                                                    <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-zinc-600"></span>
                                                    <span>Offline</span>
                                                </div>
                                            )}

                                            <span className="text-slate-300 dark:text-zinc-600">•</span>

                                            {/* Room & Role */}
                                            <div className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">
                                                <Building2 className="w-4 h-4 text-slate-400" />
                                                <span>{selectedTenant.room_number || "—"}</span>
                                                <span className="text-slate-300 dark:text-zinc-600">•</span>
                                                <User className="w-4 h-4 text-slate-400" />
                                                <span>{selectedTenant.role || "Tenant"}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Conversation Options */}
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => toast.info("Conversation Active", { description: `Direct messaging channel with ${selectedTenant.name}.` })}
                                        className="w-8 h-8 rounded-lg border border-slate-200/80 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-850 flex items-center justify-center text-slate-600 dark:text-zinc-400 transition-colors cursor-pointer"
                                        title="Options"
                                    >
                                        <MoreVertical className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Pinned community announcement, shown under the thread name */}
                            {latestAnnouncement && (
                                <div className="shrink-0 border-b border-slate-200/80 dark:border-zinc-800 bg-[#f6f8fb] dark:bg-zinc-900/60 px-4 sm:px-5 py-2.5 flex items-start gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 flex items-center justify-center shrink-0 mt-0.5">
                                        <Bell className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-slate-200/80 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-300/60 dark:border-zinc-700">
                                                Announcement
                                            </span>
                                            <span className="text-xs font-bold text-slate-800 dark:text-zinc-100 truncate max-w-full">
                                                {latestAnnouncement.title}
                                            </span>
                                            {latestAnnouncement.created_at && (
                                                <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                                                    {new Date(latestAnnouncement.created_at).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                        {latestAnnouncement.content &&
                                            latestAnnouncement.content.trim() !== latestAnnouncement.title?.trim() && (
                                            <p className="text-[11px] leading-snug text-slate-600 dark:text-zinc-400 mt-0.5 line-clamp-2 whitespace-pre-wrap break-words">
                                                {latestAnnouncement.content}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

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
                                        <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
                                        <p className="text-base font-bold text-slate-600 dark:text-zinc-300">No messages yet</p>
                                        <p className="text-sm font-medium mt-1">Send a message to start a conversation.</p>
                                    </div>
                                ) : (
                                    <div className="mt-auto flex flex-col space-y-4 w-full">
                                        {groupedMessages.map((group, gi) => (
                                            <div key={gi}>
                                                {/* Date Separator */}
                                                <div className="relative flex py-2 items-center select-none my-1">
                                                    <div className="flex-grow border-t border-slate-100 dark:border-zinc-900"></div>
                                                    <span className="flex-shrink mx-4 text-xs sm:text-sm font-bold text-slate-400 dark:text-zinc-500">
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
                                                                    <div className="bg-[#0062cc] text-white rounded-2xl rounded-tr-xs p-4 shadow-xs text-sm sm:text-base leading-relaxed">
                                                                        <p className="whitespace-pre-wrap">{msg.text}</p>

                                                                        {/* Maintenance Ticket Card inside Outgoing Bubble */}
                                                                        {msg.maintenanceTicket && (
                                                                            <div className="mt-3 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white rounded-xl border border-white/20 dark:border-zinc-800 p-3 shadow-xs text-left">
                                                                                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-zinc-800">
                                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                                        <div className="w-7 h-7 rounded-md bg-blue-50 dark:bg-blue-950/60 text-[#0062cc] dark:text-blue-400 flex items-center justify-center shrink-0">
                                                                                            <Wrench className="w-4 h-4 stroke-[2.2]" />
                                                                                        </div>
                                                                                        <div className="min-w-0">
                                                                                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block leading-none">
                                                                                                Updated Ticket
                                                                                            </span>
                                                                                            <span className="text-sm font-mono font-bold text-slate-900 dark:text-white leading-tight mt-0.5 block truncate">
                                                                                                {msg.maintenanceTicket.request_number}
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>
                                                                                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
                                                                                        normalizeTicketStatus(msg.maintenanceTicket.status) === 'Resolved'
                                                                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                                                                                            : normalizeTicketStatus(msg.maintenanceTicket.status) === 'In Progress'
                                                                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                                                                                            : normalizeTicketStatus(msg.maintenanceTicket.status) === 'Cancelled'
                                                                                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                                                                                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                                                                                    }`}>
                                                                                        {normalizeTicketStatus(msg.maintenanceTicket.status)}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="pt-2">
                                                                                    <h5 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                                                                                        {msg.maintenanceTicket.title}
                                                                                    </h5>
                                                                                    {msg.maintenanceTicket.description && (
                                                                                        <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mt-1 line-clamp-2">
                                                                                            {msg.maintenanceTicket.description}
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                                {msg.maintenanceTicket.id > 0 && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() =>
                                                                                            router.push(
                                                                                                `/admin/requests?tenant=${encodeURIComponent(selectedTenant.name)}&requestId=${msg.maintenanceTicket?.id}`
                                                                                            )
                                                                                        }
                                                                                        className="mt-2.5 w-full pt-2 border-t border-slate-100 dark:border-zinc-800 text-xs sm:text-sm font-bold text-[#0062cc] dark:text-blue-400 flex items-center justify-between hover:underline cursor-pointer"
                                                                                    >
                                                                                        <span>View Maintenance Ticket</span>
                                                                                        <ArrowRight className="w-4 h-4" />
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        )}

                                                                        {/* Attachment Box */}
                                                                        {msg.attachment && (
                                                                            <div className="mt-2.5">
                                                                                {msg.attachment.type.startsWith('image/') || msg.attachment.url?.match(/\.(png|jpe?g|gif|webp|svg)$/i) ? (
                                                                                    <a href={msg.attachment.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-white/20 hover:opacity-95 transition-opacity">
                                                                                        <img src={msg.attachment.url} alt={msg.attachment.title} className="max-h-60 max-w-full rounded-xl object-contain bg-black/20" />
                                                                                    </a>
                                                                                ) : (
                                                                                    <a href={msg.attachment.url} download={msg.attachment.title} target="_blank" rel="noopener noreferrer" className="bg-white/10 hover:bg-white/20 text-white rounded-xl p-2.5 flex items-center justify-between gap-3 border border-white/20 transition-colors">
                                                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                                                            <FileText className="w-4 h-4 text-white shrink-0" />
                                                                                            <div className="min-w-0">
                                                                                                <p className="truncate max-w-[200px] text-xs sm:text-sm font-semibold leading-tight">{msg.attachment.title}</p>
                                                                                                {msg.attachment.size && <span className="text-xs text-white/70">{msg.attachment.size}</span>}
                                                                                            </div>
                                                                                        </div>
                                                                                        <Download className="w-4 h-4 opacity-80 shrink-0 ml-2" />
                                                                                    </a>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Timestamp & Read Receipt */}
                                                                    <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-zinc-500 mt-1 pr-1 font-sans">
                                                                        <CheckCheck className="w-4 h-4 text-[#0062cc] dark:text-blue-400" />
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
                                                                                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#0062cc] dark:text-blue-400 flex items-center justify-center shrink-0">
                                                                                    <Wrench className="w-4 h-4 stroke-[2.2]" />
                                                                                </div>
                                                                                <div className="min-w-0">
                                                                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block leading-none">
                                                                                        Requested Maintenance Ticket
                                                                                    </span>
                                                                                    <span className="text-sm font-mono font-bold text-slate-900 dark:text-white leading-tight mt-0.5 block truncate">
                                                                                        {ticket.request_number}
                                                                                    </span>
                                                                                </div>
                                                                            </div>

                                                                            {/* Status - Colored text only */}
                                                                            <div className="shrink-0">
                                                                                {normStatus === 'Pending' && (
                                                                                    <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400">
                                                                                        <Clock className="w-3.5 h-3.5" /> Pending
                                                                                    </span>
                                                                                )}
                                                                                {normStatus === 'In Progress' && (
                                                                                    <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400">
                                                                                        <User className="w-3.5 h-3.5" /> In Progress
                                                                                    </span>
                                                                                )}
                                                                                {normStatus === 'Resolved' && (
                                                                                    <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                                                                                    </span>
                                                                                )}
                                                                                {normStatus === 'Cancelled' && (
                                                                                    <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400">
                                                                                        Cancelled
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        {/* Ticket Body */}
                                                                        <div className="p-3.5 space-y-2">
                                                                            <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-snug">
                                                                                {ticket.title}
                                                                            </h4>

                                                                            {ticket.description && (
                                                                                <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed line-clamp-3 whitespace-pre-wrap">
                                                                                    {ticket.description}
                                                                                </p>
                                                                            )}

                                                                            {/* Category, Priority & Room */}
                                                                            <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1 pt-0.5 text-xs">
                                                                                <span className="font-semibold text-slate-600 dark:text-zinc-300">
                                                                                    {ticket.category}
                                                                                </span>
                                                                                <span className="text-slate-300 dark:text-zinc-700">•</span>
                                                                                {normPriority === 'High' && (
                                                                                    <span className="inline-flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400">
                                                                                        <Flame className="w-3.5 h-3.5 fill-current" /> High Priority
                                                                                    </span>
                                                                                )}
                                                                                {normPriority === 'Medium' && (
                                                                                    <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                                                                                        <Zap className="w-3.5 h-3.5 fill-current" /> Medium Priority
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
                                                                                className="w-full px-3.5 py-2.5 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/40 dark:bg-zinc-900/40 hover:bg-blue-50/60 dark:hover:bg-blue-950/30 text-xs sm:text-sm font-bold text-[#0062cc] dark:text-blue-400 flex items-center justify-between transition-colors cursor-pointer"
                                                                            >
                                                                                <span>View Maintenance Ticket</span>
                                                                                <ArrowRight className="w-4 h-4" />
                                                                            </button>
                                                                        )}
                                                                    </div>

                                                                    <span className="text-xs text-slate-400 dark:text-zinc-500 mt-1 pl-1 font-sans">
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
                                                                <div className="bg-[#f0f2f5] dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 rounded-2xl rounded-tl-xs px-4 py-3 shadow-2xs text-sm sm:text-base leading-relaxed border border-slate-100 dark:border-zinc-800/80">
                                                                    <p className="whitespace-pre-wrap">{msg.text}</p>
                                                                    {msg.attachment && (
                                                                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-zinc-800">
                                                                            {msg.attachment.type.startsWith('image/') || msg.attachment.url?.match(/\.(png|jpe?g|gif|webp|svg)$/i) ? (
                                                                                <a href={msg.attachment.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border border-slate-200 dark:border-zinc-700">
                                                                                    <img src={msg.attachment.url} alt={msg.attachment.title} className="max-h-60 max-w-full rounded-lg object-contain bg-black/5 dark:bg-black/20" />
                                                                                </a>
                                                                            ) : (
                                                                                <a href={msg.attachment.url} download={msg.attachment.title} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs sm:text-sm font-semibold hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors">
                                                                                    <FileText className="w-4 h-4 text-[#0062cc]" />
                                                                                    <span className="truncate max-w-[200px]">{msg.attachment.title}</span>
                                                                                    <Download className="w-3.5 h-3.5 opacity-70 ml-1" />
                                                                                </a>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <span className="text-xs text-slate-400 dark:text-zinc-500 mt-1 pl-1 font-sans">
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
                                {/* Hidden file input to open file manager */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    onChange={handleFileSelect}
                                    accept="*/*"
                                />

                                {/* Selected Attachment Preview Banner */}
                                {selectedFile && (
                                    <div className="mb-2.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 flex items-center justify-between gap-3 shadow-2xs">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            {filePreviewUrl ? (
                                                <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-700 bg-black/5 shrink-0">
                                                    <img src={filePreviewUrl} alt={selectedFile.name} className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#0062cc] dark:text-blue-400 flex items-center justify-center border border-blue-200/50 dark:border-blue-900/50 shrink-0">
                                                    <FileText className="w-5 h-5 stroke-[2]" />
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate max-w-[240px] sm:max-w-md">
                                                    {selectedFile.name}
                                                </p>
                                                <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 dark:text-zinc-400 font-semibold">
                                                    <span className="font-mono">{formatFileSize(selectedFile.size)}</span>
                                                    <span>•</span>
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">Max {MAX_FILE_SIZE_MB} MB</span>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleRemoveSelectedFile}
                                            className="w-7 h-7 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                                            title="Remove attachment"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}

                                <form onSubmit={handleSend} className="flex items-center gap-2.5">
                                    {/* Attachment Button (Hair pin / Paperclip icon) */}
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isSending}
                                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                                            selectedFile
                                                ? "bg-blue-50 text-[#0062cc] dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40"
                                                : "text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800"
                                        }`}
                                        title={`Attach image or file (Max ${MAX_FILE_SIZE_MB} MB)`}
                                    >
                                        <Paperclip className="w-4 h-4" />
                                    </button>

                                    {/* Message Input */}
                                    <input
                                        type="text"
                                        placeholder={selectedFile ? "Add a message with this file (optional)..." : "Type a message..."}
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        className="flex-1 py-3 px-4 text-sm sm:text-base rounded-xl bg-slate-50/70 dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all"
                                    />

                                    {/* Send Button */}
                                    <button
                                        type="submit"
                                        disabled={(!newMessage.trim() && !selectedFile) || isSending}
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
                            <MessageSquare className="w-14 h-14 mb-3 opacity-30" />
                            <p className="text-base sm:text-lg font-bold text-slate-600 dark:text-zinc-300">
                                {isLoadingConversations ? 'Loading conversations...' : 'Select a conversation'}
                            </p>
                            <p className="text-sm font-medium mt-1">Choose a tenant from the list to start messaging.</p>
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
                                        <h3 className="font-bold text-lg sm:text-xl text-slate-900 dark:text-white truncate leading-tight">
                                            {selectedTenant.name}
                                        </h3>

                                        {/* Online / Offline badge */}
                                        <div className="flex items-center gap-1.5 mt-1.5">
                                            {selectedTenant.is_online ? (
                                                <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                    Online
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-500 dark:text-zinc-400">
                                                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                                                    Offline
                                                </span>
                                            )}
                                        </div>

                                        {/* Room & Bedspace info */}
                                        <div className="flex items-center gap-1.5 text-sm sm:text-base text-slate-500 dark:text-zinc-400 mt-2 truncate">
                                            <Building2 className="w-4 h-4 shrink-0 text-slate-400" />
                                            <span className="truncate">
                                                {selectedTenant.room_number || "Room —"} {selectedTenant.bed_space ? `• ${selectedTenant.bed_space}` : ""}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Contact Info (Email & Phone) */}
                                <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-zinc-900 text-sm sm:text-base">
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
                                    className="w-full py-2.5 px-3 border border-[#0062cc] text-[#0062cc] hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    <span>View Tenant Profile</span>
                                </Link>
                            </div>

                            {/* Card 2: Quick Actions */}
                            <div className="bg-white dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 shadow-xs">
                                <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white mb-3">
                                    Quick Actions
                                </h4>

                                <div className="space-y-2">
                                    {/* View Room Details */}
                                    <Link
                                        href={`/admin/rooms${selectedTenant.room_number ? `?search=${encodeURIComponent(selectedTenant.room_number.replace(/\D/g, ''))}` : ''}`}
                                        className="w-full p-2.5 rounded-xl border border-slate-200/70 dark:border-zinc-800 hover:border-blue-300 hover:bg-blue-50/40 dark:hover:bg-zinc-900 flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-zinc-200 transition-colors group cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#0062cc] dark:text-blue-400 flex items-center justify-center shrink-0">
                                                <FileText className="w-4 h-4 stroke-[2.2]" />
                                            </div>
                                            <span>View Room Details</span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                                    </Link>

                                    {/* View Payment History */}
                                    <Link
                                        href={`/admin/billing?tenant=${encodeURIComponent(selectedTenant.name)}&tenantId=${encodeURIComponent(String(selectedTenant.id))}&history=true`}
                                        className="w-full p-2.5 rounded-xl border border-slate-200/70 dark:border-zinc-800 hover:border-blue-300 hover:bg-blue-50/40 dark:hover:bg-zinc-900 flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-zinc-200 transition-colors group cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#0062cc] dark:text-blue-400 flex items-center justify-center shrink-0">
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
                                        className="w-full p-2.5 rounded-xl border border-slate-200/70 dark:border-zinc-800 hover:border-blue-300 hover:bg-blue-50/40 dark:hover:bg-zinc-900 flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-zinc-200 transition-colors group cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#0062cc] dark:text-blue-400 flex items-center justify-center shrink-0">
                                                <Wrench className="w-4 h-4 stroke-[2.2]" />
                                            </div>
                                            <span>View Request Maintenance</span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                                    </button>

                                    {/* Post Announcement */}
                                    <button
                                        type="button"
                                        onClick={() => setShowAnnouncementModal(true)}
                                        className="w-full p-2.5 rounded-xl border border-slate-200/70 dark:border-zinc-800 hover:border-blue-300 hover:bg-blue-50/40 dark:hover:bg-zinc-900 flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-zinc-200 transition-colors group cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#0062cc] dark:text-blue-400 flex items-center justify-center shrink-0">
                                                <Bell className="w-4 h-4 stroke-[2.2]" />
                                            </div>
                                            <span>Post Announcement</span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                </div>

            </div>

            {/* Post Announcement Modal */}
            {showAnnouncementModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Bell className="w-5 h-5 text-[#0062cc] dark:text-blue-400" />
                                Post Announcement
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowAnnouncementModal(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handlePostAnnouncement}>
                            <div className="p-5">
                                <label className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                                    Message
                                </label>
                                <textarea
                                    value={announcementText}
                                    onChange={(e) => setAnnouncementText(e.target.value)}
                                    rows={5}
                                    placeholder="e.g. Water interruption on Saturday, 8:00 AM to 12:00 PM."
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:border-[#0062cc] dark:focus:border-blue-500 resize-none"
                                    required
                                />
                                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
                                    The first line becomes the headline every tenant sees.
                                </p>
                            </div>

                            <div className="p-5 border-t border-slate-200 dark:border-zinc-800 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAnnouncementModal(false)}
                                    disabled={isPostingAnnouncement}
                                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isPostingAnnouncement}
                                    className="px-5 py-2.5 rounded-xl bg-[#0062cc] hover:bg-[#0052a8] text-white text-sm font-bold transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    {isPostingAnnouncement ? 'Publishing...' : 'Publish'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
