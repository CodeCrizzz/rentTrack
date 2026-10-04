"use client";
import { useEffect, useState, useRef } from 'react';
import api from '@/lib/api';
import AdminLoader from '@/components/AdminLoader';
import { Search, Paperclip } from 'lucide-react';

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
    sender_id: number;
    receiver_id: number;
    message: string;
    sender_type: 'admin' | 'tenant';
    status: string;
    created_at: string;
}

export default function AdminChat() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedTenant, setSelectedTenant] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [searchFilter, setSearchFilter] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    const fetchConversations = async (showLoader = false) => {
        if (showLoader) setIsLoading(true);
        try {
            const { data } = await api.get('/admin/chat/conversations');
            // Mock active status for UI demonstration
            const enhancedData = data.map((c: any, i: number) => ({
                ...c,
                is_active: i % 2 === 0
            }));
            setConversations(enhancedData);
            
            if (enhancedData.length > 0 && !selectedTenant) {
                const firstUnread = enhancedData.find((c: Conversation) => Number(c.unread_count) > 0);
                setSelectedTenant(firstUnread || enhancedData[0]);
            }
        } catch (error) {
            console.error("Failed to fetch conversations:", error);
        } finally {
            if (showLoader) setIsLoading(false);
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
        fetchConversations(true);
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

    const filteredConversations = conversations.filter(c => 
        c.name.toLowerCase().includes(searchFilter.toLowerCase()) || 
        (c.room_number && c.room_number.toLowerCase().includes(searchFilter.toLowerCase()))
    );

    const totalUnread = conversations.reduce((acc, curr) => acc + Number(curr.unread_count), 0);

    if (isLoading) {
        return (
            <div className="w-full h-[calc(100vh-6rem)] md:h-[calc(100vh-8rem)] flex border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-transparent mb-6">
                {/* Left Pane Skeleton */}
                <div className="w-full md:w-[340px] bg-transparent border-r border-slate-200 dark:border-zinc-800 flex flex-col shrink-0">
                    <div className="flex justify-between items-center p-6">
                        <div className="h-7 w-24 bg-slate-200 dark:bg-zinc-800 rounded-md animate-pulse"></div>
                    </div>
                    <div className="px-6 pb-4">
                        <div className="h-10 w-full bg-slate-200 dark:bg-zinc-800 rounded-lg animate-pulse"></div>
                    </div>
                    <div className="flex-1 px-3 space-y-1">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3 p-3">
                                <div className="w-11 h-11 rounded-full bg-slate-200 dark:bg-zinc-800 animate-pulse shrink-0"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-slate-200 dark:bg-zinc-800 rounded w-1/2 animate-pulse"></div>
                                    <div className="h-3 bg-slate-200 dark:bg-zinc-800 rounded w-3/4 animate-pulse"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                {/* Right Pane Skeleton */}
                <div className="hidden md:flex flex-1 bg-transparent flex-col overflow-hidden">
                    <div className="flex justify-between items-center p-6 border-b border-slate-50 dark:border-zinc-800/50 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-zinc-800 animate-pulse shrink-0"></div>
                            <div className="flex flex-col gap-2">
                                <div className="h-4 bg-slate-200 dark:bg-zinc-800 rounded w-32 animate-pulse"></div>
                                <div className="h-3 bg-slate-200 dark:bg-zinc-800 rounded w-20 animate-pulse"></div>
                            </div>
                        </div>
                        <div className="h-8 w-20 bg-slate-200 dark:bg-zinc-800 rounded-lg animate-pulse"></div>
                    </div>
                    <div className="flex-1 p-6 flex flex-col gap-6">
                        <div className="flex items-start gap-3 w-full">
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-800 animate-pulse shrink-0"></div>
                            <div className="h-16 bg-slate-200 dark:bg-zinc-800 rounded-2xl rounded-tl-sm w-64 animate-pulse"></div>
                        </div>
                        <div className="flex items-end flex-col w-full">
                            <div className="h-12 bg-slate-200 dark:bg-zinc-800 rounded-2xl rounded-tr-sm w-48 animate-pulse"></div>
                        </div>
                        <div className="flex items-start gap-3 w-full">
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-800 animate-pulse shrink-0"></div>
                            <div className="h-20 bg-slate-200 dark:bg-zinc-800 rounded-2xl rounded-tl-sm w-72 animate-pulse"></div>
                        </div>
                    </div>
                    <div className="p-4 border-t border-slate-50 dark:border-zinc-800/50 shrink-0">
                        <div className="flex gap-3 items-center">
                            <div className="w-11 h-11 rounded-xl bg-slate-200 dark:bg-zinc-800 animate-pulse shrink-0"></div>
                            <div className="flex-1 h-12 bg-slate-200 dark:bg-zinc-800 rounded-xl animate-pulse"></div>
                            <div className="w-20 h-12 bg-slate-200 dark:bg-zinc-800 rounded-xl animate-pulse shrink-0"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-[calc(100vh-6rem)] md:h-[calc(100vh-8rem)] flex border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-transparent mb-6">
            
            {/* Left Pane: Chat List */}
            <div className="w-full md:w-[340px] bg-transparent border-r border-slate-200 dark:border-zinc-800 flex flex-col shrink-0">
                {/* Header */}
                <div className="flex justify-between items-center p-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Messages</h2>
                    {totalUnread > 0 && (
                        <span className="px-2.5 py-1 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-md text-xs font-semibold">
                            {totalUnread} Unread
                        </span>
                    )}
                </div>

                {/* Search */}
                <div className="px-6 pb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-zinc-500" />
                        <input 
                            type="text" 
                            placeholder="Search tenants..." 
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-teal-100 dark:bg-teal-900/40 border-none rounded-lg text-sm text-slate-800 dark:text-zinc-200 outline-none placeholder:text-teal-700/50 dark:placeholder:text-teal-400/50 focus:bg-teal-200 dark:focus:bg-teal-900/60 transition-colors"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-3 pb-3 space-y-1">
                    {filteredConversations.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 dark:text-zinc-500 text-sm">No tenants found.</div>
                    ) : (
                        filteredConversations.map(conv => {
                            const isSelected = selectedTenant?.id === conv.id;
                            const unread = Number(conv.unread_count);
                            const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.name)}&background=0F9D83&color=fff`;

                            return (
                                <div 
                                    key={conv.id}
                                    onClick={() => setSelectedTenant(conv)}
                                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${isSelected ? 'bg-teal-100 dark:bg-teal-900/40 border border-teal-200 dark:border-teal-800/50' : 'hover:bg-slate-50 dark:hover:bg-zinc-800/40 border border-transparent'}`}
                                >
                                    <div className="relative w-11 h-11 shrink-0">
                                        <img src={avatarUrl} alt={conv.name} className="w-full h-full rounded-full object-cover shadow-sm" />
                                        {conv.is_active && (
                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-card"></div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <h4 className="font-semibold text-slate-900 dark:text-white text-sm truncate">{conv.name}</h4>
                                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 shrink-0 pl-2">{formatTime(conv.last_message_time)}</span>
                                        </div>
                                        <div className="flex justify-between items-center gap-2">
                                            <p className={`text-xs truncate ${unread > 0 ? 'text-slate-700 dark:text-zinc-300 font-medium' : 'text-slate-500 dark:text-zinc-500'}`}>
                                                {conv.last_message || 'No messages'}
                                            </p>
                                            {unread > 0 && (
                                                <span className="w-4 h-4 bg-[#0F9D83] rounded-full flex items-center justify-center text-[9px] text-white font-bold shrink-0">
                                                    {unread}
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

            {/* Right Pane: Chat Area */}
            <div className="hidden md:flex flex-1 bg-transparent flex-col overflow-hidden">
                {selectedTenant ? (
                    <>
                        {/* Chat Header */}
                        <div className="flex justify-between items-center p-6 border-b border-slate-50 dark:border-zinc-800/50 shrink-0">
                            <div className="flex items-center gap-3">
                                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedTenant.name)}&background=0F9D83&color=fff`} alt={selectedTenant.name} className="w-10 h-10 rounded-full object-cover shadow-sm" />
                                <div className="flex flex-col">
                                    <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight">{selectedTenant.name}</h3>
                                    <span className="text-xs text-[#0F9D83] dark:text-teal-400 font-medium mt-0.5">
                                        Room {selectedTenant.room_number || 'N/A'} • {selectedTenant.is_active ? 'Active Now' : 'Offline'}
                                    </span>
                                </div>
                            </div>
                            <button className="px-4 py-2 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
                                Room Info
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col gap-5">
                            <div className="text-center text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider my-2">
                                TODAY, {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            
                            {messages.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-zinc-500 opacity-60">
                                    <div className="text-4xl mb-2">💬</div>
                                    <p className="text-sm font-medium">No messages yet.</p>
                                </div>
                            ) : (
                                messages.map((msg, index) => {
                                    const isFromAdmin = msg.sender_type === 'admin' || msg.sender_id === 1;
                                    const timeStr = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                    const avatarUrl = isFromAdmin ? null : `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedTenant.name)}&background=0F9D83&color=fff`;
                                    
                                    // Mocking an attachment for visual parity with the design screenshot
                                    const isMockAttachment = msg.message.toLowerCase().includes('gcash') || msg.message.toLowerCase().includes('receipt');

                                    if (isFromAdmin) {
                                        return (
                                            <div key={index} className="flex flex-col items-end">
                                                <div className="bg-[#0F9D83] text-white p-4 rounded-2xl rounded-tr-sm text-sm max-w-[75%] shadow-sm leading-relaxed">
                                                    {msg.message}
                                                </div>
                                                <div className="flex items-center justify-end gap-2 mt-1 mr-1">
                                                    <span className="text-[10px] text-slate-400 dark:text-zinc-500">{timeStr}</span>
                                                    <span className="text-[10px] text-[#0F9D83] dark:text-teal-400 font-bold">{msg.status === 'read' ? 'Seen' : 'Sent'}</span>
                                                </div>
                                            </div>
                                        );
                                    } else {
                                        return (
                                            <div key={index} className="flex items-start gap-3">
                                                <img src={avatarUrl!} alt={selectedTenant.name} className="w-8 h-8 rounded-full object-cover shrink-0 mt-1" />
                                                <div className="flex flex-col items-start">
                                                    {isMockAttachment ? (
                                                        <div className="bg-teal-100 dark:bg-teal-900/40 border border-teal-200 dark:border-teal-800/50 p-3 rounded-2xl rounded-tl-sm w-[280px] flex items-center gap-4 mb-1">
                                                            <div className="w-14 h-14 bg-white dark:bg-zinc-900 rounded-lg overflow-hidden shrink-0">
                                                                <img src="/images/leaking-pipe.jpg" alt="Attachment" className="w-full h-full object-cover opacity-80" />
                                                            </div>
                                                            <div className="flex flex-col overflow-hidden">
                                                                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate">Gcash_Receipt_Oct.jpg</span>
                                                                <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">482 KB • Click to zoom</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="bg-teal-100 dark:bg-teal-900/40 text-slate-800 dark:text-zinc-200 p-4 rounded-2xl rounded-tl-sm text-sm max-w-[75%] leading-relaxed">
                                                            {msg.message}
                                                        </div>
                                                    )}
                                                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1 ml-1">{timeStr}</span>
                                                </div>
                                            </div>
                                        );
                                    }
                                })
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-4 border-t border-slate-50 dark:border-zinc-800/50 shrink-0">
                            <form onSubmit={handleSend} className="flex gap-3 items-center">
                                <button type="button" className="w-11 h-11 rounded-xl bg-teal-100 dark:bg-teal-900/40 hover:bg-teal-200 dark:hover:bg-teal-900/60 flex items-center justify-center text-teal-700 dark:text-teal-400 transition-colors shrink-0">
                                    <Paperclip className="w-5 h-5" />
                                </button>
                                <input 
                                    type="text" 
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder={`Type your message to ${selectedTenant.name} here...`} 
                                    className="flex-1 bg-teal-100 dark:bg-teal-900/40 border-none rounded-xl py-3.5 px-4 text-sm text-slate-800 dark:text-white placeholder:text-teal-700/50 dark:placeholder:text-teal-400/50 outline-none focus:bg-teal-200 dark:focus:bg-teal-900/60 transition-colors"
                                />
                                <button 
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className="px-7 py-3.5 bg-[#0F9D83] text-white rounded-xl text-sm font-semibold hover:bg-[#0d856f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                                >
                                    Send
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-zinc-500">
                        <div className="text-5xl mb-4 opacity-50">📬</div>
                        <h2 className="text-lg font-bold text-slate-700 dark:text-zinc-300">Select a conversation</h2>
                        <p className="text-sm mt-1">Choose a resident from the sidebar to view messages.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
