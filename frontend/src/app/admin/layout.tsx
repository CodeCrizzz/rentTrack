"use client";
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { Moon } from "lucide-react";
import { toast } from 'sonner';

import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from '@/components/app-sidebar';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { Home, Building2, Users, Calculator, Wrench, MessageSquareMore, Bell, Settings, User, RefreshCw, Calendar, Cctv, UserPlus, CheckCheck, Clock, Bed, Receipt, Activity } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AdminNotification {
    id: number;
    title: string;
    message: string;
    type: string;
    link: string | null;
    is_read: boolean;
    created_at: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [adminName, setAdminName] = useState('Admin');
    const [adminEmail, setAdminEmail] = useState('admin@renttrack.com');
    const [adminAvatar, setAdminAvatar] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const [pendingTenantsCount, setPendingTenantsCount] = useState(0);
    const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);
    const [notifUnreadCount, setNotifUnreadCount] = useState(0);
    const [showAllNotifications, setShowAllNotifications] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [currentDate, setCurrentDate] = useState("");

    const fetchUnreadCount = async () => {
        try {
            const { data } = await api.get('/admin/chat/unread');
            setUnreadCount(data.unreadCount);
        } catch (error: any) {
            if (error.code === 'ERR_NETWORK') {
                console.warn('Network error: Backend might be unreachable', error.message);
            } else if (error.response?.status !== 401) {
                console.warn('Failed to fetch unread count', error);
            }
        }
    };

    const fetchPendingTenantCount = async () => {
        try {
            const { data } = await api.get('/admin/tenants/pending-count');
            if (data && typeof data.pendingCount !== 'undefined') {
                setPendingTenantsCount(data.pendingCount);
            }
        } catch (error: any) {
            if (error.code === 'ERR_NETWORK') {
                console.warn('Network error: Backend might be unreachable', error.message);
            } else if (error.response?.status !== 401) {
                console.warn('Pending tenant count endpoint not found. Defaulting to 0.');
            }
            setPendingTenantsCount(0); 
        }
    };

    const fetchPendingPaymentsCount = async () => {
        try {
            const { data } = await api.get('/admin/bills/payments/pending-count');
            if (data && typeof data.pendingCount !== 'undefined') {
                setPendingPaymentsCount(data.pendingCount);
            }
        } catch (error: any) {
            if (error.code === 'ERR_NETWORK') {
                console.warn('Network error: Backend might be unreachable', error.message);
            } else if (error.response?.status !== 401) {
                console.warn('Failed to fetch pending payments count', error);
            }
            setPendingPaymentsCount(0);
        }
    };

    const fetchAdminNotifications = async () => {
        try {
            const { data } = await api.get('/admin/notifications');
            if (data && Array.isArray(data.notifications)) {
                setNotifications(data.notifications);
                setNotifUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0);
            }
        } catch (error: any) {
            if (error.code === 'ERR_NETWORK') {
                console.warn('Network error: Backend might be unreachable', error.message);
            } else if (error.response?.status !== 401) {
                console.warn('Failed to fetch admin notifications', error);
            }
        }
    };

    useEffect(() => {
        const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
        setCurrentDate(new Date().toLocaleDateString(undefined, options));

        const userStr = localStorage.getItem('user');
        const token = localStorage.getItem('token');

        if (!token || !userStr) {
            router.replace('/login');
            return;
        }

        try {
            const user = JSON.parse(userStr);
            if (user.role !== 'admin') {
                toast.error("Access restricted: Administrator privileges required.");
                router.replace('/tenant/dashboard');
                return;
            }
            setAdminName(user.name);
            if (user.email) setAdminEmail(user.email);
            if (user.avatar) setAdminAvatar(user.avatar);
        } catch (e) {
            router.replace('/login');
            return;
        }

        const fetchData = () => {
            fetchUnreadCount();
            fetchPendingTenantCount();
            fetchPendingPaymentsCount();
            fetchAdminNotifications();
        };

        fetchData();
        const interval = setInterval(fetchData, 15000);
        return () => clearInterval(interval);
    }, [pathname, router]);

    const handleMarkAllRead = async () => {
        try {
            await api.post('/admin/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setNotifUnreadCount(0);
        } catch (err) {
            console.error('Failed to mark all admin notifications read:', err);
        }
    };

    const handleNotificationClick = async (notif: AdminNotification) => {
        try {
            if (!notif.is_read) {
                await api.patch(`/admin/notifications/${notif.id}/read`);
                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
                setNotifUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (err) {
            console.error('Failed to mark notification read:', err);
        }

        if (notif.link) {
            router.push(notif.link);
        } else if (notif.type === 'account_approval') {
            router.push('/admin/tenants');
        } else if (notif.type === 'payment_verification') {
            router.push('/admin/billing');
        } else if (notif.type === 'maintenance_request') {
            router.push('/admin/requests');
        } else if (notif.type === 'chat_message') {
            router.push('/admin/chat');
        }
    };

    const formatTimeAgo = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24) return `${diffHours}h ago`;
            const diffDays = Math.floor(diffHours / 24);
            if (diffDays < 7) return `${diffDays}d ago`;
            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        } catch {
            return '';
        }
    };

    const handleLogout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (e) {}
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
    };

    const rawNavItems = [
        { name: 'Dashboard', path: '/admin/dashboard', icon: Home },
        { name: 'Rooms', path: '/admin/rooms', icon: Bed },
        { name: 'Tenants', path: '/admin/tenants', icon: Users },
        { name: 'Bills and Payments', path: '/admin/billing', icon: Calculator },
        { name: 'Maintenance Requests', path: '/admin/requests', icon: Wrench },
        { name: 'Messages', path: '/admin/chat', icon: MessageSquareMore },
        { name: 'CCTV Monitoring', path: '/admin/cctv', icon: Cctv },
        { name: 'Activity Logs', path: '/admin/activity-logs', icon: Activity },
        { name: 'Settings', path: '/admin/settings', icon: Settings },
    ];

    const mappedNavItems = rawNavItems.map(item => {
        const isActive = pathname === item.path || (item.path !== '/admin/dashboard' && pathname.startsWith(item.path));
        let badgeCount = 0;

        if (item.name === 'Tenants' && pendingTenantsCount > 0) {
            badgeCount = pendingTenantsCount;
        }
        if (item.name === 'Messages' && unreadCount > 0) {
            badgeCount = unreadCount;
        }
        if (item.name === 'Bills and Payments' && pendingPaymentsCount > 0) {
            badgeCount = pendingPaymentsCount;
        }

        return {
            title: item.name,
            url: item.path,
            isActive,
            badgeCount,
            badgeColor: "rose" as const,
            icon: (
                <item.icon className={`w-5 h-5 shrink-0 transition-colors ${isActive ? '!text-white' : 'text-slate-300'}`} strokeWidth={isActive ? 2.2 : 1.8} />
            )
        }
    });

    const getPageTitle = () => {
        const path = pathname.split('/').pop();
        if (!path) return 'Dashboard';
        if (path === 'billing') return 'Bills and Payments';
        if (path === 'requests') return 'Maintenance Requests';
        if (path === 'cctv') return 'CCTV Monitoring';
        if (path === 'activity-logs') return 'Activity Logs';
        return path.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    return (
        <SidebarProvider>
            <div className="flex h-screen w-full bg-background text-foreground overflow-hidden selection:bg-zinc-200 dark:selection:bg-zinc-800 selection:text-zinc-950 dark:selection:text-white">
                <AppSidebar 
                    navLabel=""
                    navItems={mappedNavItems}
                    user={{
                        name: adminName,
                        email: adminEmail,
                        avatar: adminAvatar,
                        role: "Master Admin"
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
                                    Admin Portal
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {currentDate && (
                                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 mr-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-slate-600 dark:text-zinc-300">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
                                    {currentDate}
                                </div>
                            )}
                            <button 
                                onClick={() => {
                                    setRefreshKey(prev => prev + 1);
                                    fetchUnreadCount();
                                    fetchPendingTenantCount();
                                    fetchPendingPaymentsCount();
                                }} 
                                className="group p-2 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors outline-none"
                                title="Refresh Page"
                            >
                                <RefreshCw className="w-5 h-5 group-hover:rotate-180 group-active:scale-90 transition-all duration-500" strokeWidth={2} />
                            </button>
                            <FullscreenToggle />
                            <DropdownMenu>
                                <DropdownMenuTrigger className="group relative p-2 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors outline-none cursor-pointer">
                                    <Bell className="w-5 h-5 group-hover:rotate-12 group-active:-rotate-12 group-active:scale-90 transition-all duration-200 origin-top" strokeWidth={2} />
                                    {notifUnreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold px-1 min-w-[20px] h-[20px] flex items-center justify-center rounded-full border-2 border-white dark:border-[#0a0a0a]">
                                            {notifUnreadCount > 99 ? '99+' : notifUnreadCount}
                                        </span>
                                    )}
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xl bg-card">
                                    <div className="flex items-center justify-between p-3.5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm text-slate-800 dark:text-white">Offline Activity Catch-up</span>
                                            {notifUnreadCount > 0 && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30">
                                                    {notifUnreadCount} new
                                                </span>
                                            )}
                                        </div>
                                        {notifications.length > 0 && (
                                            <button 
                                                onClick={handleMarkAllRead} 
                                                className="text-xs font-semibold text-zinc-900 dark:text-white hover:underline flex items-center gap-1 cursor-pointer"
                                            >
                                                <CheckCheck className="w-3.5 h-3.5" />
                                                <span>Mark all read</span>
                                            </button>
                                        )}
                                    </div>
                                    <div className={`overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800 transition-all duration-300 ease-in-out ${showAllNotifications ? 'max-h-[65vh]' : 'max-h-[360px]'}`}>
                                        {notifications.length > 0 ? (
                                            notifications.map((notif) => (
                                                <div
                                                    key={notif.id}
                                                    onClick={() => handleNotificationClick(notif)}
                                                    className={`p-3.5 hover:bg-slate-50 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer flex items-start gap-3 ${
                                                        !notif.is_read ? 'bg-slate-50/80 dark:bg-zinc-800/30' : ''
                                                    }`}
                                                >
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                                        notif.type === 'account_approval'
                                                            ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                                                            : notif.type === 'payment_verification'
                                                            ? 'bg-cyan-100 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400'
                                                            : notif.type === 'maintenance_request'
                                                            ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                                                            : notif.type === 'chat_message'
                                                            ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                                                            : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300'
                                                    }`}>
                                                        {notif.type === 'account_approval' && <UserPlus className="w-4 h-4" />}
                                                        {notif.type === 'payment_verification' && <Receipt className="w-4 h-4" />}
                                                        {notif.type === 'maintenance_request' && <Wrench className="w-4 h-4" />}
                                                        {notif.type === 'chat_message' && <MessageSquareMore className="w-4 h-4" />}
                                                        {!['account_approval', 'payment_verification', 'maintenance_request', 'chat_message'].includes(notif.type) && <Bell className="w-4 h-4" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                                {notif.title}
                                                            </p>
                                                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 whitespace-nowrap">
                                                                {formatTimeAgo(notif.created_at)}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5 line-clamp-2">
                                                            {notif.message}
                                                        </p>
                                                    </div>
                                                    {!notif.is_read && (
                                                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-8 text-center text-slate-500 dark:text-zinc-400">
                                                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                                <p className="text-sm font-semibold text-slate-700 dark:text-zinc-300">No new notifications</p>
                                                <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
                                                    No tenant activity occurred while you were offline.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    {notifications.length > 5 && (
                                        <div className="p-2.5 border-t border-slate-100 dark:border-zinc-800 text-center bg-slate-50 dark:bg-white/[0.02]">
                                            <button 
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setShowAllNotifications(!showAllNotifications);
                                                }}
                                                className="text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                                            >
                                                {showAllNotifications ? 'View fewer notifications' : `View all (${notifications.length})`}
                                            </button>
                                        </div>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>

                        </div>
                    </header>

                    {/* Main Content Area */}
                    {(() => {
                        const isManageRooms = pathname?.startsWith('/admin/rooms');
                        const isManageTenants = pathname?.startsWith('/admin/tenants');
                        const isNoPageScroll = isManageRooms || isManageTenants;
                        return (
                            <div className={`flex-1 flex flex-col ${isNoPageScroll ? 'overflow-hidden' : 'overflow-y-auto'} overflow-x-hidden ${isNoPageScroll ? '' : 'custom-scrollbar'} bg-[#f4f7fb] dark:bg-zinc-950`}>
                                <div className={`px-4 pt-3 pb-2 sm:px-5 sm:pt-3.5 sm:pb-2.5 lg:px-6 lg:pt-3.5 lg:pb-2.5 relative ${isNoPageScroll ? 'h-full flex-1 flex flex-col min-h-0 overflow-hidden' : ''}`}>
                                    <AnimatePresence mode="wait">
                                        <div key={`${pathname}-${refreshKey}`} className={`w-full flex-1 flex flex-col ${isNoPageScroll ? 'h-full min-h-0 overflow-hidden' : ''}`}>
                                            {children}
                                        </div>
                                    </AnimatePresence>
                                </div>
                            </div>
                        );
                    })()}
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
}