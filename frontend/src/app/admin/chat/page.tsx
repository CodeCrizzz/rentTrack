"use client";

import { useEffect, useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { 
    Search, Send, MessageSquare, Clock, User, 
    Building2, CheckCheck, Check, 
    Paperclip, ExternalLink, Wrench, 
    Receipt, ChevronRight, Phone, Video, MoreVertical,
    FileText, CreditCard, MessagesSquare, ShieldCheck,
    Users, AlertCircle, X, Download
} from 'lucide-react';
import { toast } from 'sonner';

interface MessageAttachment {
    title: string;
    type: string;
    size: string;
    url?: string;
}

interface ChatMessage {
    id: string | number;
    sender: 'admin' | 'tenant';
    text: string;
    time: string;
    date?: string;
    is_read?: boolean;
    attachment?: MessageAttachment;
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
    last_message_full?: string;
    status: 'Active' | 'Offline';
    messages: ChatMessage[];
}

// Palette for tenant single-letter avatars
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

const MOCKUP_CONVERSATIONS: ConversationItem[] = [
    {
        id: 1,
        name: "Maria Santos",
        role: "Tenant",
        category: "tenant",
        room_number: "Room 203",
        bed_space: "Bed 1 • Single Bedspace",
        email: "maria.santos@email.com",
        phone: "+63 912 345 6789",
        last_message: "Hi Admin, I have a question about...",
        last_message_time: "10:24 AM",
        unread_count: 2,
        is_online: true,
        total_messages: 12,
        last_message_full: "Oct 23, 2026 • 10:24 AM",
        status: "Active",
        messages: [
            {
                id: "m1",
                sender: "tenant",
                text: "Hi Admin, I have a question about my bill for this month.\nThere's an additional charge I'm not sure about.",
                time: "10:12 AM",
                date: "October 23, 2026"
            },
            {
                id: "m2",
                sender: "admin",
                text: "Hello Maria! I checked your bill and the charge is for the extra electricity usage. You can view the breakdown here:",
                attachment: {
                    title: "Bill Breakdown - Oct 2026",
                    type: "PDF",
                    size: "245 KB",
                    url: "#"
                },
                time: "10:18 AM",
                date: "October 23, 2026",
                is_read: true
            },
            {
                id: "m3",
                sender: "tenant",
                text: "Thank you for the quick response!\nThat makes sense now. 😊",
                time: "10:24 AM",
                date: "October 23, 2026"
            }
        ]
    },
    {
        id: 2,
        name: "Juan Dela Cruz",
        role: "Tenant",
        category: "tenant",
        room_number: "Room 102",
        bed_space: "Bed 2 • Double Bedspace",
        email: "juan.delacruz@email.com",
        phone: "+63 917 234 5678",
        last_message: "Thank you po! 🙏",
        last_message_time: "Yesterday",
        unread_count: 1,
        is_online: true,
        total_messages: 8,
        last_message_full: "Oct 22, 2026 • 3:45 PM",
        status: "Active",
        messages: [
            {
                id: "j1",
                sender: "admin",
                text: "Hi Juan, your payment receipt for October rent has been approved.",
                time: "3:30 PM",
                date: "October 22, 2026",
                is_read: true
            },
            {
                id: "j2",
                sender: "tenant",
                text: "Thank you po! 🙏",
                time: "3:45 PM",
                date: "October 22, 2026"
            }
        ]
    },
    {
        id: 3,
        name: "Ana Reyes",
        role: "Tenant",
        category: "tenant",
        room_number: "Room 204",
        bed_space: "Bed 1 • Single Bedspace",
        email: "ana.reyes@email.com",
        phone: "+63 918 345 6789",
        last_message: "Noted po. Will check it later.",
        last_message_time: "Yesterday",
        unread_count: 1,
        is_online: false,
        total_messages: 5,
        last_message_full: "Oct 22, 2026 • 1:15 PM",
        status: "Active",
        messages: [
            {
                id: "a1",
                sender: "admin",
                text: "Hi Ana, please review your revised lease agreement in the tenant portal.",
                time: "1:00 PM",
                date: "October 22, 2026",
                is_read: true
            },
            {
                id: "a2",
                sender: "tenant",
                text: "Noted po. Will check it later.",
                time: "1:15 PM",
                date: "October 22, 2026"
            }
        ]
    },
    {
        id: 4,
        name: "Group A (Room 201)",
        isGroup: true,
        role: "Room Group",
        category: "tenant",
        room_number: "Room 201",
        bed_space: "Quad Room • 4 Occupants",
        email: "room201-group@renttrack.internal",
        phone: "+63 900 201 0000",
        last_message: "Can someone check the water issue...",
        last_message_time: "Oct 21",
        unread_count: 3,
        is_online: true,
        total_messages: 19,
        last_message_full: "Oct 21, 2026 • 8:12 PM",
        status: "Active",
        messages: [
            {
                id: "g1",
                sender: "tenant",
                text: "Can someone check the water issue in our shower? The pressure dropped suddenly.",
                time: "8:12 PM",
                date: "October 21, 2026"
            }
        ]
    },
    {
        id: 5,
        name: "Mark Rivera",
        role: "Tenant",
        category: "tenant",
        room_number: "Room 105",
        bed_space: "Bed 1 • Private Room",
        email: "mark.rivera@email.com",
        phone: "+63 920 456 7890",
        last_message: "Payment verified. Thank you!",
        last_message_time: "Oct 20",
        unread_count: 0,
        is_online: false,
        total_messages: 6,
        last_message_full: "Oct 20, 2026 • 11:05 AM",
        status: "Active",
        messages: [
            {
                id: "mr1",
                sender: "admin",
                text: "Your GCash transaction Ref #GC-891024 has been verified.",
                time: "10:50 AM",
                date: "October 20, 2026",
                is_read: true
            },
            {
                id: "mr2",
                sender: "tenant",
                text: "Payment verified. Thank you!",
                time: "11:05 AM",
                date: "October 20, 2026"
            }
        ]
    },
    {
        id: 6,
        name: "Ella Cruz",
        role: "Tenant",
        category: "tenant",
        room_number: "Room 202",
        bed_space: "Bed 3 • 4-Bed Dorm",
        email: "ella.cruz@email.com",
        phone: "+63 922 567 8901",
        last_message: "May I ask if there are available beds...",
        last_message_time: "Oct 19",
        unread_count: 1,
        is_online: true,
        total_messages: 4,
        last_message_full: "Oct 19, 2026 • 4:20 PM",
        status: "Active",
        messages: [
            {
                id: "ec1",
                sender: "tenant",
                text: "May I ask if there are available beds in Room 205 for my friend next month?",
                time: "4:20 PM",
                date: "October 19, 2026"
            }
        ]
    },
    {
        id: 7,
        name: "Sofia Morales",
        role: "Tenant",
        category: "tenant",
        room_number: "Room 205",
        bed_space: "Bed 2 • Double Bedspace",
        email: "sofia.morales@email.com",
        phone: "+63 915 678 1234",
        last_message: "Are visitors allowed this weekend?",
        last_message_time: "Oct 18",
        unread_count: 0,
        is_online: true,
        total_messages: 9,
        last_message_full: "Oct 18, 2026 • 2:10 PM",
        status: "Active",
        messages: [
            {
                id: "sm1",
                sender: "tenant",
                text: "Hi Admin, just wanted to check if visitors are allowed this coming weekend?",
                time: "2:10 PM",
                date: "October 18, 2026"
            }
        ]
    },
    {
        id: 8,
        name: "Daniel Santos",
        role: "Tenant",
        category: "tenant",
        room_number: "Room 302",
        bed_space: "Bed 1 • Single Bedspace",
        email: "daniel.santos@email.com",
        phone: "+63 927 678 9012",
        last_message: "Okay, thank you sir!",
        last_message_time: "Oct 17",
        unread_count: 0,
        is_online: false,
        total_messages: 7,
        last_message_full: "Oct 17, 2026 • 9:30 AM",
        status: "Active",
        messages: [
            {
                id: "ds1",
                sender: "admin",
                text: "Daniel, please be reminded of the quiet hours policy from 10 PM.",
                time: "9:20 AM",
                date: "October 17, 2026",
                is_read: true
            },
            {
                id: "ds2",
                sender: "tenant",
                text: "Okay, thank you sir!",
                time: "9:30 AM",
                date: "October 17, 2026"
            }
        ]
    },
    {
        id: 9,
        name: "Group B (Room 301)",
        isGroup: true,
        role: "Room Group",
        category: "tenant",
        room_number: "Room 301",
        bed_space: "Double Room • 2 Occupants",
        email: "room301-group@renttrack.internal",
        phone: "+63 900 301 0000",
        last_message: "We'll be having a meeting tomorrow...",
        last_message_time: "Oct 16",
        unread_count: 2,
        is_online: true,
        total_messages: 11,
        last_message_full: "Oct 16, 2026 • 6:45 PM",
        status: "Active",
        messages: [
            {
                id: "gb1",
                sender: "tenant",
                text: "We'll be having a meeting tomorrow regarding room cleanliness schedule.",
                time: "6:45 PM",
                date: "October 16, 2026"
            }
        ]
    },
    {
        id: 10,
        name: "Lianne Garcia",
        role: "Tenant",
        category: "tenant",
        room_number: "Room 104",
        bed_space: "Bed 2 • Double Bedspace",
        email: "lianne.garcia@email.com",
        phone: "+63 929 789 0123",
        last_message: "Can you help me with my bill?",
        last_message_time: "Oct 15",
        unread_count: 0,
        is_online: false,
        total_messages: 3,
        last_message_full: "Oct 15, 2026 • 5:14 PM",
        status: "Active",
        messages: [
            {
                id: "lg1",
                sender: "tenant",
                text: "Can you help me with my bill?",
                time: "5:14 PM",
                date: "October 15, 2026"
            }
        ]
    }
];

export default function AdminChat() {
    const [conversations, setConversations] = useState<ConversationItem[]>(MOCKUP_CONVERSATIONS);
    const [selectedTenant, setSelectedTenant] = useState<ConversationItem>(MOCKUP_CONVERSATIONS[0]);
    const [newMessage, setNewMessage] = useState('');
    const [searchFilter, setSearchFilter] = useState('');
    const [isSending, setIsSending] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll on message updates
    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        scrollToBottom();
        const t = setTimeout(scrollToBottom, 50);
        return () => clearTimeout(t);
    }, [selectedTenant?.id, selectedTenant?.messages]);

    // Attempt to merge live database tenants if available
    useEffect(() => {
        const fetchLiveConversations = async () => {
            try {
                const { data } = await api.get('/admin/chat/conversations');
                if (Array.isArray(data) && data.length > 0) {
                    setConversations(prev => {
                        const merged = [...prev];
                        data.forEach((dbConv: any) => {
                            const existingIdx = merged.findIndex(c => String(c.id) === String(dbConv.id) || c.name.toLowerCase() === dbConv.name?.toLowerCase());
                            if (existingIdx !== -1) {
                                merged[existingIdx] = {
                                    ...merged[existingIdx],
                                    room_number: dbConv.room_number ? `Room ${dbConv.room_number}` : merged[existingIdx].room_number,
                                    is_online: Boolean(dbConv.is_active),
                                    unread_count: Number(dbConv.unread_count || 0)
                                };
                            }
                        });
                        return merged;
                    });
                }
            } catch {
                // Keep local mockup conversations intact if offline or unauthenticated
            }
        };

        fetchLiveConversations();
    }, []);

    // Filtered conversations (Tenants only)
    const filteredConversations = useMemo(() => {
        return conversations.filter(c => {
            if (c.category !== 'tenant') return false;
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
        setSelectedTenant(conv);
        // Clear unread count locally for clicked item
        setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));
    };

    // Send a message
    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() || isSending) return;

        const textToSend = newMessage.trim();
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const createdMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            sender: 'admin',
            text: textToSend,
            time: timeStr,
            date: 'Today',
            is_read: true
        };

        setIsSending(true);

        // Update active messages locally
        setSelectedTenant(prev => ({
            ...prev,
            last_message: textToSend,
            last_message_time: timeStr,
            total_messages: prev.total_messages + 1,
            messages: [...prev.messages, createdMsg]
        }));

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

        toast.success("Message Delivered", {
            description: `Sent to ${selectedTenant.name}.`
        });

        // Dispatch to backend API if numerical tenant ID exists
        if (typeof selectedTenant.id === 'number') {
            try {
                await api.post('/admin/chat', {
                    message: textToSend,
                    tenant_id: selectedTenant.id
                });
            } catch {
                // Silently keep local state if live API is unavailable
            }
        }
    };

    // Call Actions
    const handleVoiceCall = () => {
        toast.info("Voice Call", {
            description: `Initiating voice call with ${selectedTenant.name} (${selectedTenant.phone || 'No phone'})...`
        });
    };

    const handleVideoCall = () => {
        toast.info("Video Call", {
            description: `Starting video conference link with ${selectedTenant.name}...`
        });
    };

    return (
        <div className="w-full h-[calc(100vh-6.2rem)] md:h-[calc(100vh-7.2rem)] lg:h-[calc(100dvh-7.2rem)] flex flex-col font-sans text-slate-900 dark:text-zinc-100 overflow-hidden">
            
            {/* 3-Column Split Screen Container exactly matching the mockup */}
            <div className="flex-1 min-h-0 bg-white dark:bg-zinc-950 border border-slate-200/90 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs flex">
                
                {/* ========================================================
                    LEFT COLUMN: Conversations List (approx 290px - 320px)
                   ======================================================== */}
                <div className="w-full sm:w-72 md:w-80 lg:w-[310px] xl:w-[330px] border-r border-slate-200/80 dark:border-zinc-800 flex flex-col shrink-0 bg-white dark:bg-zinc-950">
                    
                    {/* Search Bar Header */}
                    <div className="p-3.5 border-b border-slate-100 dark:border-zinc-900 space-y-2.5">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search tenants..."
                                value={searchFilter}
                                onChange={(e) => setSearchFilter(e.target.value)}
                                className="w-full py-2 pl-9 pr-3.5 text-xs rounded-xl bg-slate-50/80 dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all"
                            />
                        </div>

                        {/* Tenants Pill (All and Staff removed) */}
                        <div className="flex items-center select-none">
                            <span className="py-1.5 px-3.5 rounded-lg text-xs font-bold bg-[#0062cc] text-white shadow-xs inline-flex items-center gap-1.5">
                                Tenants ({filteredConversations.length})
                            </span>
                        </div>
                    </div>

                    {/* Conversation Items List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {filteredConversations.map(conv => {
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
                                        ) : (
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-xs select-none ${getAvatarColor(conv.name)}`}>
                                                {conv.name.trim().charAt(0).toUpperCase()}
                                            </div>
                                        )}

                                        {conv.is_online && (
                                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-950" />
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
                                                <span className="min-w-4 h-4 px-1 rounded-full bg-[#0062cc] text-white text-[10px] font-bold flex items-center justify-center shadow-xs shrink-0">
                                                    {conv.unread_count}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ========================================================
                    CENTER COLUMN: Active Chat Canvas (flex-1)
                   ======================================================== */}
                <div className="flex-1 flex flex-col bg-white dark:bg-zinc-950 overflow-hidden min-h-0 relative border-r border-slate-200/80 dark:border-zinc-800">
                    
                    {/* Thread Header */}
                    <div className="p-3.5 sm:px-5 sm:py-3.5 border-b border-slate-200/80 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-950 shrink-0">
                        {/* Resident Info Left */}
                        <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                                {selectedTenant.isGroup ? (
                                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 text-[#0062cc] dark:text-blue-400 flex items-center justify-center shadow-xs">
                                        <Users className="w-5 h-5 stroke-[2.2]" />
                                    </div>
                                ) : (
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-xs select-none ${getAvatarColor(selectedTenant.name)}`}>
                                        {selectedTenant.name.trim().charAt(0).toUpperCase()}
                                    </div>
                                )}

                                {selectedTenant.is_online && (
                                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-950" />
                                )}
                            </div>

                            <div>
                                <h3 className="font-bold text-[15px] sm:text-base text-slate-900 dark:text-white leading-tight">
                                    {selectedTenant.name}
                                </h3>

                                <div className="flex items-center gap-2 text-xs mt-0.5">
                                    {/* Online indicator */}
                                    <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11.5px]">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        <span>Online</span>
                                    </div>

                                    <span className="text-slate-300 dark:text-zinc-600">•</span>

                                    {/* Room & Role */}
                                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400 text-[11.5px]">
                                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                        <span>{selectedTenant.room_number || "Room 203"}</span>
                                        <span className="text-slate-300 dark:text-zinc-600">•</span>
                                        <User className="w-3.5 h-3.5 text-slate-400" />
                                        <span>{selectedTenant.role || "Tenant"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Top Action Buttons Right: Phone, Video, More */}
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleVoiceCall}
                                className="w-9 h-9 rounded-xl border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                title="Voice call"
                            >
                                <Phone className="w-4 h-4" />
                            </button>

                            <button
                                type="button"
                                onClick={handleVideoCall}
                                className="w-9 h-9 rounded-xl border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                title="Video call"
                            >
                                <Video className="w-4 h-4" />
                            </button>

                            <button
                                type="button"
                                onClick={() => toast.info("Options", { description: "Conversation settings and export tools." })}
                                className="w-9 h-9 rounded-xl border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
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
                        {/* Messenger-style bottom alignment wrapper */}
                        <div className="mt-auto flex flex-col space-y-4 w-full">
                            {/* Centered Date Separator: October 23, 2026 */}
                            <div className="relative flex py-2 items-center select-none">
                                <div className="flex-grow border-t border-slate-100 dark:border-zinc-900"></div>
                                <span className="flex-shrink mx-4 text-xs font-medium text-slate-400 dark:text-zinc-500">
                                    October 23, 2026
                                </span>
                                <div className="flex-grow border-t border-slate-100 dark:border-zinc-900"></div>
                            </div>

                            {/* Message Bubbles */}
                            {selectedTenant.messages.map((msg) => {
                                const isFromAdmin = msg.sender === 'admin';

                                if (isFromAdmin) {
                                    return (
                                        <div key={msg.id} className="w-full flex justify-end">
                                            <div className="flex flex-col items-end max-w-[500px]">
                                                {/* Admin Outgoing Bubble (Vibrant Royal Blue) */}
                                                <div className="bg-[#0062cc] text-white rounded-2xl rounded-tr-xs p-4 shadow-xs text-[13px] leading-relaxed">
                                                    <p className="whitespace-pre-wrap">{msg.text}</p>

                                                    {/* Attachment Box (Bill Breakdown PDF) */}
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

                                // Incoming Resident Bubble (Soft Slate/Blue Card)
                                return (
                                    <div key={msg.id} className="w-full flex justify-start items-start gap-3">
                                        <div className="shrink-0 mt-0.5">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs select-none shadow-2xs ${getAvatarColor(selectedTenant.name)}`}>
                                                {selectedTenant.name.trim().charAt(0).toUpperCase()}
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-start max-w-[480px]">
                                            <div className="bg-[#f0f4fa] dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 rounded-2xl rounded-tl-xs px-4 py-3 shadow-2xs text-[13px] leading-relaxed border border-slate-100 dark:border-zinc-800/80">
                                                <p className="whitespace-pre-wrap">{msg.text}</p>
                                            </div>

                                            <span className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1 pl-1 font-sans">
                                                {msg.time}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Chat Input Bar */}
                    <div className="p-3.5 border-t border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0">
                        <form onSubmit={handleSend} className="flex items-center gap-2.5">
                            {/* Attachment Button */}
                            <button
                                type="button"
                                onClick={() => toast.info("Attach Document", { description: "Select invoice, photo, or document to send." })}
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
                </div>

                {/* ========================================================
                    RIGHT COLUMN: Details Panel (approx 290px - 320px)
                   ======================================================== */}
                <div className="hidden lg:flex w-72 xl:w-80 shrink-0 flex-col gap-3.5 p-4 bg-slate-50/50 dark:bg-zinc-900/30 overflow-y-auto custom-scrollbar">
                    
                    {/* Card 1: Tenant Profile Dossier */}
                    <div className="bg-white dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-xs flex flex-col items-center text-center">
                        {/* Large Avatar */}
                        <div className="relative">
                            {selectedTenant.isGroup ? (
                                <div className="w-18 h-18 rounded-full bg-blue-100 dark:bg-blue-900/50 text-[#0062cc] dark:text-blue-400 flex items-center justify-center shadow-sm">
                                    <Users className="w-9 h-9 stroke-[2]" />
                                </div>
                            ) : (
                                <div className={`w-18 h-18 rounded-full flex items-center justify-center font-bold text-2xl shadow-sm select-none ${getAvatarColor(selectedTenant.name)}`}>
                                    {selectedTenant.name.trim().charAt(0).toUpperCase()}
                                </div>
                            )}

                            {selectedTenant.is_online && (
                                <span className="absolute bottom-0 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-950" />
                            )}
                        </div>

                        {/* Name & Online Badge */}
                        <h3 className="font-bold text-base text-slate-900 dark:text-white mt-3 leading-tight">
                            {selectedTenant.name}
                        </h3>

                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-xs mt-1">
                            <User className="w-3.5 h-3.5" />
                            <span>Online</span>
                        </div>

                        {/* Room & Bed Details */}
                        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400 mt-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{selectedTenant.room_number || "Room 203"} • {selectedTenant.bed_space || "Bed 1 • Single Bedspace"}</span>
                        </div>

                        {/* Email & Phone List */}
                        <div className="w-full mt-4 space-y-2 border-t border-slate-100 dark:border-zinc-900 pt-3.5 text-xs text-slate-600 dark:text-zinc-300 text-left">
                            <div className="flex items-center gap-2.5 truncate">
                                <Search className="w-4 h-4 text-slate-400 shrink-0 opacity-0 pointer-events-none" />
                                <span className="sr-only">Contact</span>
                            </div>
                            <div className="flex items-center gap-2.5 truncate">
                                <div className="w-5 flex justify-center text-slate-400">
                                    <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                                        <rect width="20" height="16" x="2" y="4" rx="2" />
                                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                    </svg>
                                </div>
                                <span className="truncate text-slate-600 dark:text-zinc-300 font-medium">
                                    {selectedTenant.email || "maria.santos@email.com"}
                                </span>
                            </div>

                            <div className="flex items-center gap-2.5 truncate">
                                <div className="w-5 flex justify-center text-slate-400">
                                    <Phone className="w-4 h-4" />
                                </div>
                                <span className="truncate text-slate-600 dark:text-zinc-300 font-medium">
                                    {selectedTenant.phone || "+63 912 345 6789"}
                                </span>
                            </div>
                        </div>

                        {/* View Tenant Profile Button */}
                        <Link
                            href="/admin/tenants"
                            className="w-full mt-4 py-2 px-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/60 dark:hover:bg-blue-900/40 text-[#0062cc] dark:text-blue-400 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer select-none"
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
                            <Link
                                href="/admin/rooms"
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

                            <Link
                                href="/admin/billing"
                                className="w-full p-2 rounded-xl border border-slate-200/70 dark:border-zinc-800 hover:border-blue-300 hover:bg-blue-50/40 dark:hover:bg-zinc-900 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-zinc-200 transition-colors group cursor-pointer"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#0062cc] dark:text-blue-400 flex items-center justify-center shrink-0">
                                        <Receipt className="w-4 h-4 stroke-[2.2]" />
                                    </div>
                                    <span>Generate Bill</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                            </Link>

                            <Link
                                href="/admin/billing"
                                className="w-full p-2 rounded-xl border border-slate-200/70 dark:border-zinc-800 hover:border-blue-300 hover:bg-blue-50/40 dark:hover:bg-zinc-900 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-zinc-200 transition-colors group cursor-pointer"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#0062cc] dark:text-blue-400 flex items-center justify-center shrink-0">
                                        <CreditCard className="w-4 h-4 stroke-[2.2]" />
                                    </div>
                                    <span>Record Payment</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                            </Link>

                            <Link
                                href="/admin/requests"
                                className="w-full p-2 rounded-xl border border-slate-200/70 dark:border-zinc-800 hover:border-blue-300 hover:bg-blue-50/40 dark:hover:bg-zinc-900 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-zinc-200 transition-colors group cursor-pointer"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#0062cc] dark:text-blue-400 flex items-center justify-center shrink-0">
                                        <Wrench className="w-4 h-4 stroke-[2.2]" />
                                    </div>
                                    <span>Create Maintenance Request</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                        </div>
                    </div>

                    {/* Card 3: Conversation Info */}
                    <div className="bg-white dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 shadow-xs">
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white mb-3">
                            Conversation Info
                        </h4>

                        <div className="space-y-3 text-xs">
                            {/* Last Message */}
                            <div className="flex items-start gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-zinc-900 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                                    <MessageSquare className="w-4 h-4" />
                                </div>
                                <div>
                                    <span className="text-[11px] text-slate-400 block">Last Message</span>
                                    <span className="font-semibold text-slate-700 dark:text-zinc-200 block mt-0.5">
                                        {selectedTenant.last_message_full || "Oct 23, 2026 • 10:24 AM"}
                                    </span>
                                </div>
                            </div>

                            {/* Total Messages */}
                            <div className="flex items-start gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-zinc-900 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                                    <MessagesSquare className="w-4 h-4" />
                                </div>
                                <div>
                                    <span className="text-[11px] text-slate-400 block">Total Messages</span>
                                    <span className="font-semibold text-slate-700 dark:text-zinc-200 block mt-0.5">
                                        {selectedTenant.total_messages} messages
                                    </span>
                                </div>
                            </div>

                            {/* Status */}
                            <div className="flex items-start gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-zinc-900 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                                    <ShieldCheck className="w-4 h-4" />
                                </div>
                                <div>
                                    <span className="text-[11px] text-slate-400 block">Status</span>
                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold mt-0.5 border border-emerald-200/60 dark:border-emerald-800/40">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        <span>Active</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}
