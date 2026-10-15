"use client";
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import PageTransition from '@/components/PageTransition';
import api from '@/lib/api';
import { Moon } from "lucide-react";

import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from '@/components/app-sidebar';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { 
  LayoutDashboard, Building2, CreditCard, Wrench, User, MessageSquare, 
  Bell, Settings, RefreshCw, AlertTriangle, Clock, CheckCheck, ChevronRight 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function TenantLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [tenantName, setTenantName] = useState('Tenant');
    const [tenantEmail, setTenantEmail] = useState('tenant@renttrack.com');
    const [unreadCount, setUnreadCount] = useState(0);
    const [chatUnread, setChatUnread] = useState(0);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [notifUnreadCount, setNotifUnreadCount] = useState(0);
    const [showAllNotifications, setShowAllNotifications] = useState(false);
    const [isAllRead, setIsAllRead] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    const fetchNotificationsAndUnread = async () => {
        try {
            const [chatRes, notifRes] = await Promise.all([
                api.get('/tenant/chat/unread').catch(() => ({ data: { unreadCount: 0 } })),
                api.get('/tenant/notifications').catch(() => ({ data: { unreadCount: 0, notifications: [] } }))
            ]);
            const cUnread = chatRes.data?.unreadCount || 0;
            const nUnread = notifRes.data?.unreadCount || 0;
            const notifs = notifRes.data?.notifications || [];

            setChatUnread(cUnread);
            setNotifUnreadCount(nUnread);
            setNotifications(notifs);
            const total = cUnread + nUnread;
            setUnreadCount(total);
            setIsAllRead(total === 0);
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
    };

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        const token = localStorage.getItem('token');

        if (!token || !userStr) {
            router.replace('/login');
            return;
        }

        try {
            const user = JSON.parse(userStr);
            if (user.role !== 'tenant') {
                router.replace('/admin/dashboard');
                return;
            }
            setTenantName(user.name);
            if (user.email) setTenantEmail(user.email);
        } catch (e) {
            router.replace('/login');
            return;
        }

        fetchNotificationsAndUnread();
        const interval = setInterval(fetchNotificationsAndUnread, 15000);
        return () => clearInterval(interval);
    }, [pathname, router]);

    const handleMarkAllRead = async () => {
        try {
            await api.post('/tenant/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setNotifUnreadCount(0);
            setUnreadCount(chatUnread);
            setIsAllRead(chatUnread === 0);
            localStorage.setItem('tenant_read_unreadCount', (chatUnread + notifUnreadCount).toString());
        } catch (err) {
            console.error('Failed to mark all read', err);
        }
    };

    const handleNotificationClick = async (notif: any) => {
        try {
            if (!notif.is_read) {
                await api.patch(`/tenant/notifications/${notif.id}/read`);
                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
                setNotifUnreadCount(prev => Math.max(0, prev - 1));
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (err) {
            console.error('Failed to mark notification as read', err);
        }

        if (notif.type === 'billing_due' || notif.type === 'billing_overdue') {
            router.push('/tenant/payments');
        } else {
            router.push('/tenant/dashboard');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
    };

    const rawNavItems = [
        { name: 'Dashboard', path: '/tenant/dashboard', icon: LayoutDashboard },
        { name: 'Rooms', path: '/tenant/rooms', icon: Building2 },
        { name: 'My Payments', path: '/tenant/payments', icon: CreditCard },
        { name: 'Chat', path: '/tenant/chat', icon: MessageSquare },
        { name: 'Announcements', path: '/tenant/announcements', icon: Bell },
        { name: 'Settings', path: '/tenant/settings', icon: Settings },
    ];

    const mappedNavItems = rawNavItems.map(item => {
        const isActive = pathname === item.path;
        let badgeCount = 0;

        if (item.name === 'Chat' && unreadCount > 0) {
            badgeCount = unreadCount;
        }

        return {
            title: item.name,
            url: item.path,
            isActive,
            badgeCount,
            badgeColor: "rose" as const,
            icon: (
                <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400 dark:text-zinc-500'}`} strokeWidth={isActive ? 2.5 : 2} />
            )
        }
    });

    const getPageTitle = () => {
        const path = pathname.split('/').pop();
        if (!path) return 'Dashboard';
        return path.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    return (
        <SidebarProvider>
            <div className="flex h-screen w-full bg-background text-foreground overflow-hidden selection:bg-cyan-500/30">
                <AppSidebar 
                    navLabel="Resident Portal"
                    navItems={mappedNavItems}
                    user={{
                        name: tenantName,
                        email: tenantEmail,
                        avatar: "",
                        role: "Resident"
                    }}
                    onLogout={handleLogout}
                />

                <SidebarInset className="flex-1 flex flex-col relative w-full h-[100dvh] overflow-hidden bg-transparent">
                    {/* Modern Top Header */}
                    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-background/95 backdrop-blur-2xl px-4 sm:px-6 lg:px-8 sticky top-0 z-20 shadow-none">
                        <div className="flex items-center gap-3 sm:gap-4 flex-1">
                            <SidebarTrigger className="-ml-2 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white" />
                            <div className="h-5 w-px bg-slate-200 dark:bg-zinc-800 hidden sm:block" />
                            <div className="flex flex-col">
                                <h1 className="text-sm sm:text-lg font-black text-slate-900 dark:text-white leading-tight tracking-tight">
                                    {getPageTitle()}
                                </h1>
                                <p className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest hidden sm:block">
                                    Resident Portal
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => {
                                    setRefreshKey(prev => prev + 1);
                                    fetchNotificationsAndUnread();
                                }} 
                                className="group p-2 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors outline-none"
                                title="Refresh Page"
                            >
                                <RefreshCw className="w-5 h-5 group-hover:rotate-180 group-active:scale-90 transition-all duration-500" strokeWidth={2} />
                            </button>
                            <FullscreenToggle />
                            <DropdownMenu>
                                <DropdownMenuTrigger className="group relative p-2 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors outline-none">
                                    <Bell className="w-5 h-5 group-hover:rotate-12 group-active:-rotate-12 group-active:scale-90 transition-all duration-200 origin-top" strokeWidth={2} />
                                    {(!isAllRead && unreadCount > 0) && (
                                        <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold px-1 min-w-[20px] h-[20px] flex items-center justify-center rounded-full border-2 border-white dark:border-[#0a0a0a]">
                                            {unreadCount > 99 ? '99+' : unreadCount}
                                        </span>
                                    )}
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xl bg-card">
                                    <div className="flex items-center justify-between p-3.5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm text-slate-800 dark:text-white">Notifications</span>
                                            {unreadCount > 0 && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30">
                                                    {unreadCount} new
                                                </span>
                                            )}
                                        </div>
                                        <button 
                                            onClick={handleMarkAllRead} 
                                            className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                                        >
                                            <CheckCheck className="w-3.5 h-3.5" />
                                            <span>Mark all read</span>
                                        </button>
                                    </div>
                                    <div className={`overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800 transition-all duration-300 ease-in-out ${showAllNotifications ? 'max-h-[65vh]' : 'max-h-[340px]'}`}>
                                        {/* Unread Chat Messages */}
                                        {chatUnread > 0 && (
                                            <div 
                                                className="p-3.5 hover:bg-slate-50 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer flex items-start gap-3 bg-teal-50/20 dark:bg-teal-900/10" 
                                                onClick={() => router.push('/tenant/chat')}
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                                                    <MessageSquare className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-1">
                                                        <p className="text-xs font-bold text-slate-800 dark:text-white truncate">New Admin Messages</p>
                                                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400">Chat</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">You have {chatUnread} unread message{chatUnread > 1 ? 's' : ''}.</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* System Reminders and Notifications */}
                                        {notifications.length > 0 ? (
                                            notifications.map((notif) => {
                                                const isOverdue = notif.type === 'billing_overdue';
                                                const isDue = notif.type === 'billing_due';
                                                const formattedDate = new Date(notif.created_at).toLocaleDateString(undefined, { 
                                                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                                                });

                                                return (
                                                    <div 
                                                        key={notif.id}
                                                        onClick={() => handleNotificationClick(notif)}
                                                        className={`p-3.5 hover:bg-slate-50 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer flex items-start gap-3 ${
                                                            !notif.is_read ? 'bg-slate-50/80 dark:bg-zinc-900/40' : ''
                                                        }`}
                                                    >
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                                            isOverdue 
                                                                ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/30' 
                                                                : isDue
                                                                ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30'
                                                                : 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-200/50 dark:border-cyan-900/30'
                                                        }`}>
                                                            {isOverdue ? <AlertTriangle className="w-4 h-4" /> : isDue ? <Clock className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between gap-1">
                                                                <p className={`text-xs font-bold truncate ${
                                                                    isOverdue ? 'text-rose-600 dark:text-rose-400' : isDue ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-white'
                                                                }`}>
                                                                    {notif.title}
                                                                </p>
                                                                {!notif.is_read && (
                                                                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                                                                )}
                                                            </div>
                                                            <p className="text-[11px] text-slate-600 dark:text-zinc-300 mt-0.5 leading-snug line-clamp-2">
                                                                {notif.message}
                                                            </p>
                                                            <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400 dark:text-zinc-500">
                                                                <span>{formattedDate}</span>
                                                                {(isDue || isOverdue) && (
                                                                    <span className="text-teal-600 dark:text-teal-400 font-medium hover:underline inline-flex items-center gap-0.5">
                                                                        Pay now <ChevronRight className="w-3 h-3" />
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : chatUnread === 0 && (
                                            <div className="p-8 text-center text-slate-500 dark:text-zinc-400">
                                                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                                <p className="text-sm font-semibold">No new notifications</p>
                                                <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">You are completely up to date.</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-2.5 border-t border-slate-100 dark:border-zinc-800 text-center bg-slate-50 dark:bg-white/[0.02]">
                                        <button 
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setShowAllNotifications(!showAllNotifications);
                                            }}
                                            className="text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white transition-colors"
                                        >
                                            {showAllNotifications ? 'View fewer notifications' : 'View all notifications'}
                                        </button>
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>

                        </div>
                    </header>

                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar bg-background">
                        <div className="px-3 pt-3 pb-2 md:px-4 md:pt-4 md:pb-3 lg:px-5 lg:pt-5 lg:pb-3 relative z-10 flex-1 flex flex-col">
                            <AnimatePresence mode="wait">
                                <PageTransition key={`${pathname}-${refreshKey}`}>
                                    {children}
                                </PageTransition>
                            </AnimatePresence>
                        </div>
                    </div>
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
}