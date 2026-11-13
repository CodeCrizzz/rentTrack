"use client";
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { Moon } from "lucide-react";

import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from '@/components/app-sidebar';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { ThemeToggle } from '@/components/theme-toggle';
import TenantChatPopup from '@/components/tenant-chat-popup';
import { toast } from 'sonner';
import { 
  LayoutDashboard, Building2, CreditCard, Wrench, User, MessageSquare, 
  Bell, AlertTriangle, Clock, CheckCheck, ChevronRight, RefreshCw 
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
    const [tenantAvatar, setTenantAvatar] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const [chatUnread, setChatUnread] = useState(0);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [notifUnreadCount, setNotifUnreadCount] = useState(0);
    const [showAllNotifications, setShowAllNotifications] = useState(false);
    const [isAllRead, setIsAllRead] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleGlobalRefresh = async () => {
        setIsRefreshing(true);
        try {
            setRefreshKey(prev => prev + 1);
            await fetchNotificationsAndUnread();
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('renttrack-refresh-data'));
                window.dispatchEvent(new CustomEvent('renttrack_refresh_all'));
            }
            router.refresh();
            toast.success("Page refreshed");
        } catch {
            toast.error("Failed to refresh");
        } finally {
            setTimeout(() => {
                setIsRefreshing(false);
            }, 500);
        }
    };

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
            if (user.avatar || user.profile_picture) setTenantAvatar(user.avatar || user.profile_picture);
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
        api.post('/auth/logout').catch(() => {});
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
    };

    const rawNavItems = [
        { name: 'Dashboard', path: '/tenant/dashboard', icon: LayoutDashboard },
        { name: 'Rooms', path: '/tenant/rooms', icon: Building2 },
        { name: 'My Payments', path: '/tenant/payments', icon: CreditCard },
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
                <item.icon className={`w-5 h-5 shrink-0 transition-colors ${isActive ? '!text-white' : 'text-slate-400'}`} strokeWidth={isActive ? 2.2 : 1.8} />
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
            <div className="tenant-theme flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden selection:bg-indigo-500/30 selection:text-white">
                <AppSidebar 
                    navLabel=""
                    navItems={mappedNavItems}
                    user={{
                        name: tenantName,
                        email: tenantEmail,
                        avatar: tenantAvatar,
                        role: "Resident"
                    }}
                    onLogout={handleLogout}
                />

                <SidebarInset className="flex-1 flex flex-col relative w-full h-[100dvh] overflow-hidden bg-slate-950">
                    {/* Modern Top Header */}
                    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-800 bg-slate-950/95 backdrop-blur-2xl px-4 sm:px-6 lg:px-8 sticky top-0 z-20 shadow-none">
                        <div className="flex items-center gap-3 sm:gap-4 flex-1">
                            <SidebarTrigger className="-ml-2 text-slate-400 hover:text-white" />
                            <div className="h-5 w-px bg-slate-800 hidden sm:block" />
                            <div className="flex flex-col">
                                <h1 className="text-sm sm:text-lg font-black text-slate-100 leading-tight tracking-tight">
                                    {getPageTitle()}
                                </h1>
                                <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest hidden sm:block">
                                    Resident Portal
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleGlobalRefresh}
                                disabled={isRefreshing}
                                className="group p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-full transition-colors outline-none cursor-pointer disabled:opacity-60"
                                title="Refresh Page & Data"
                                aria-label="Refresh Page & Data"
                            >
                                <RefreshCw
                                    className={`w-5 h-5 transition-all duration-500 ${
                                        isRefreshing
                                            ? "animate-spin text-indigo-400"
                                            : "group-hover:rotate-180 group-active:scale-90"
                                    }`}
                                    strokeWidth={2}
                                />
                            </button>
                            <ThemeToggle />
                            <FullscreenToggle />
                            <DropdownMenu>
                                <DropdownMenuTrigger className="group relative p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-full transition-colors outline-none">
                                    <Bell className="w-5 h-5 group-hover:rotate-12 group-active:-rotate-12 group-active:scale-90 transition-all duration-200 origin-top" strokeWidth={2} />
                                    {(!isAllRead && unreadCount > 0) && (
                                        <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold px-1 min-w-[20px] h-[20px] flex items-center justify-center rounded-full border-2 border-slate-950">
                                            {unreadCount > 99 ? '99+' : unreadCount}
                                        </span>
                                    )}
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0 border border-slate-800 rounded-xl overflow-hidden shadow-xl bg-slate-900 text-slate-100">
                                    <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-slate-950/60">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm text-slate-100">Notifications</span>
                                            {unreadCount > 0 && (
                                                <span className="text-[10px] font-bold text-rose-400">
                                                    {unreadCount} new
                                                </span>
                                            )}
                                        </div>
                                        <button 
                                            onClick={handleMarkAllRead} 
                                            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 cursor-pointer"
                                        >
                                            <CheckCheck className="w-3.5 h-3.5" />
                                            <span>Mark all read</span>
                                        </button>
                                    </div>
                                    <div className={`overflow-y-auto divide-y divide-slate-800 transition-all duration-300 ease-in-out ${showAllNotifications ? 'max-h-[65vh]' : 'max-h-[340px]'}`}>
                                        {/* Unread Chat Messages */}
                                        {chatUnread > 0 && (
                                            <div 
                                                className="p-3.5 hover:bg-slate-800/50 transition-colors cursor-pointer flex items-start gap-3 bg-slate-800/30" 
                                                onClick={() => { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('open-tenant-chat')); }}
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                                                    <MessageSquare className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-1">
                                                        <p className="text-xs font-bold text-slate-100 truncate">New Admin Messages</p>
                                                        <span className="text-[10px] font-bold text-indigo-400">Chat</span>
                                                    </div>
                                                    <p className="text-xs text-slate-400 mt-0.5">You have {chatUnread} unread message{chatUnread > 1 ? 's' : ''}.</p>
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
                                                        className={`p-3.5 hover:bg-slate-800/50 transition-colors cursor-pointer flex items-start gap-3 ${
                                                            !notif.is_read ? 'bg-slate-800/30' : ''
                                                        }`}
                                                    >
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                                            isOverdue 
                                                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                                                                : isDue
                                                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                                : 'bg-slate-800 text-slate-300 border border-slate-700/60'
                                                        }`}>
                                                            {isOverdue ? <AlertTriangle className="w-4 h-4" /> : isDue ? <Clock className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between gap-1">
                                                                <p className={`text-xs font-bold truncate ${
                                                                    isOverdue ? 'text-rose-400' : isDue ? 'text-amber-400' : 'text-slate-100'
                                                                }`}>
                                                                    {notif.title}
                                                                </p>
                                                                {!notif.is_read && (
                                                                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                                                                )}
                                                            </div>
                                                            <p className="text-[11px] text-slate-300 mt-0.5 leading-snug line-clamp-2">
                                                                {notif.message}
                                                            </p>
                                                            <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400">
                                                                <span>{formattedDate}</span>
                                                                {(isDue || isOverdue) && (
                                                                    <span className="text-indigo-400 hover:text-indigo-300 font-medium hover:underline inline-flex items-center gap-0.5">
                                                                        Pay now <ChevronRight className="w-3 h-3" />
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : chatUnread === 0 && (
                                            <div className="p-8 text-center text-slate-400">
                                                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                                <p className="text-sm font-semibold text-slate-300">No new notifications</p>
                                                <p className="text-xs text-slate-400 mt-1">You are completely up to date.</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-2.5 border-t border-slate-800 text-center bg-slate-950/40">
                                        <button 
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setShowAllNotifications(!showAllNotifications);
                                            }}
                                            className="text-xs font-semibold text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
                                        >
                                            {showAllNotifications ? 'View fewer notifications' : 'View all notifications'}
                                        </button>
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>

                        </div>
                    </header>

                    {/* Main Content Area */}
                    <div className={`flex-1 flex flex-col ${pathname === '/tenant/dashboard' ? 'overflow-hidden h-full' : 'overflow-y-auto overflow-x-hidden custom-scrollbar'} bg-slate-950`}>
                        <div className={`px-3 pt-2 pb-2 md:px-4 md:pt-2.5 md:pb-2.5 lg:px-5 lg:pt-2.5 lg:pb-2.5 relative z-10 flex-1 flex flex-col ${pathname === '/tenant/dashboard' ? 'overflow-hidden h-full max-h-full' : ''}`}>
                            <AnimatePresence mode="wait">
                                <div key={`${pathname}-${refreshKey}`} className={`w-full flex-1 flex flex-col ${pathname === '/tenant/dashboard' ? 'overflow-hidden h-full max-h-full' : ''}`}>
                                    {children}
                                </div>
                            </AnimatePresence>
                        </div>
                    </div>
                </SidebarInset>

                {/* Facebook Messenger Desktop Style Floating Chat */}
                <TenantChatPopup />
            </div>
        </SidebarProvider>
    );
}