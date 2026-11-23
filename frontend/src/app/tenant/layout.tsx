"use client";
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import api from '@/lib/api';

import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { ThemeToggle } from '@/components/theme-toggle';
import TenantChatPopup from '@/components/tenant-chat-popup';
import { toast } from 'sonner';
import { 
  Home, DoorOpen, CreditCard, User, MessageSquare, 
  Bell, AlertTriangle, Clock, CheckCheck, ChevronRight, RefreshCw, LogOut
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PORTAL_TABS = [
  { id: "overview", label: "My Home", icon: Home, path: "/tenant/overview" },
  { id: "room", label: "My Room", icon: DoorOpen, path: "/tenant/my_room" },
  { id: "payments", label: "Bills & Payments", icon: CreditCard, path: "/tenant/bill_and_payment" },
] as const;

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
            router.push('/tenant/bill_and_payment');
        } else {
            router.push('/tenant/overview');
        }
    };

    const handleLogout = () => {
        api.post('/auth/logout').catch(() => {});
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
    };

    const isOnProfile = pathname === "/tenant/profile";

    const tenantInitials = tenantName
        ? tenantName.trim().charAt(0).toUpperCase()
        : "R";

    return (
        <div className="tenant-theme flex h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden selection:bg-indigo-500/30 selection:text-indigo-950 dark:selection:text-white">
            <div className="flex-1 flex flex-col relative w-full h-[100dvh] overflow-hidden bg-slate-50 dark:bg-slate-950">
                {/* Modern Top Header */}
                <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl px-5 sm:px-10 md:px-14 lg:px-20 xl:px-28 sticky top-0 z-20 shadow-none">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <div
                            role="tablist"
                            aria-label="Tenant portal sections"
                            className="inline-flex items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs overflow-x-auto max-w-full"
                        >
                            {PORTAL_TABS.map((tab) => {
                                const isActive =
                                    pathname === tab.path ||
                                    (tab.id === "overview" && pathname === "/tenant");
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={isActive}
                                        onClick={() => router.push(tab.path)}
                                        className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                                            isActive
                                                ? "bg-indigo-600 text-white shadow-sm"
                                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800"
                                        }`}
                                    >
                                        <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={handleGlobalRefresh}
                                disabled={isRefreshing}
                                className="group p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full transition-colors outline-none cursor-pointer disabled:opacity-60"
                                title="Refresh Page & Data"
                                aria-label="Refresh Page & Data"
                            >
                                <RefreshCw
                                    className={`w-5 h-5 transition-all duration-500 ${
                                        isRefreshing
                                            ? "animate-spin text-indigo-600 dark:text-indigo-400"
                                            : "group-hover:rotate-180 group-active:scale-90"
                                    }`}
                                    strokeWidth={2}
                                />
                            </button>
                            <ThemeToggle />
                            <FullscreenToggle />
                            <DropdownMenu>
                                <DropdownMenuTrigger className="group relative p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full transition-colors outline-none">
                                    <Bell className="w-5 h-5 group-hover:rotate-12 group-active:-rotate-12 group-active:scale-90 transition-all duration-200 origin-top" strokeWidth={2} />
                                    {(!isAllRead && unreadCount > 0) && (
                                        <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold px-1 min-w-[20px] h-[20px] flex items-center justify-center rounded-full border-2 border-white dark:border-slate-950">
                                            {unreadCount > 99 ? '99+' : unreadCount}
                                        </span>
                                    )}
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                                    <div className="flex items-center justify-between p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">Notifications</span>
                                            {unreadCount > 0 && (
                                                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                                                    {unreadCount} new
                                                </span>
                                            )}
                                        </div>
                                        <button 
                                            onClick={handleMarkAllRead} 
                                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline flex items-center gap-1 cursor-pointer"
                                        >
                                            <CheckCheck className="w-3.5 h-3.5" />
                                            <span>Mark all read</span>
                                        </button>
                                    </div>
                                    <div className={`overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 transition-all duration-300 ease-in-out ${showAllNotifications ? 'max-h-[65vh]' : 'max-h-[340px]'}`}>
                                        {/* Unread Chat Messages */}
                                        {chatUnread > 0 && (
                                            <div 
                                                className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer flex items-start gap-3 bg-indigo-50/50 dark:bg-slate-800/30" 
                                                onClick={() => { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('open-tenant-chat')); }}
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                                                    <MessageSquare className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-1">
                                                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">New Admin Messages</p>
                                                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">Chat</span>
                                                    </div>
                                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">You have {chatUnread} unread message{chatUnread > 1 ? 's' : ''}.</p>
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
                                                        className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer flex items-start gap-3 ${
                                                            !notif.is_read ? 'bg-indigo-50/50 dark:bg-slate-800/30' : ''
                                                        }`}
                                                    >
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                                            isOverdue 
                                                                ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20' 
                                                                : isDue
                                                                ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
                                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60'
                                                        }`}>
                                                            {isOverdue ? <AlertTriangle className="w-4 h-4" /> : isDue ? <Clock className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between gap-1">
                                                                <p className={`text-xs font-bold truncate ${
                                                                    isOverdue ? 'text-rose-600 dark:text-rose-400' : isDue ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-slate-100'
                                                                }`}>
                                                                    {notif.title}
                                                                </p>
                                                                {!notif.is_read && (
                                                                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                                                                )}
                                                            </div>
                                                            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug line-clamp-2">
                                                                {notif.message}
                                                            </p>
                                                            <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                                                                <span>{formattedDate}</span>
                                                                {(isDue || isOverdue) && (
                                                                    <span className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium hover:underline inline-flex items-center gap-0.5">
                                                                        Pay now <ChevronRight className="w-3 h-3" />
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : chatUnread === 0 && (
                                            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                                                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No new notifications</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">You are completely up to date.</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 text-center bg-slate-50 dark:bg-slate-950/40">
                                        <button 
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setShowAllNotifications(!showAllNotifications);
                                            }}
                                            className="text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors cursor-pointer"
                                        >
                                            {showAllNotifications ? 'View fewer notifications' : 'View all notifications'}
                                        </button>
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* User Account & Logout Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    className={`flex items-center gap-2 p-1 pr-2.5 rounded-full border transition-colors outline-none cursor-pointer ${
                                        isOnProfile
                                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                            : "border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800"
                                    }`}
                                >
                                    {tenantAvatar ? (
                                        <img
                                            src={tenantAvatar}
                                            alt={tenantName}
                                            className={`w-7 h-7 rounded-full object-cover border ${
                                                isOnProfile ? "border-white/40" : "border-indigo-500/30"
                                            }`}
                                        />
                                    ) : (
                                        <div
                                            className={`w-7 h-7 rounded-full font-bold text-xs flex items-center justify-center ${
                                                isOnProfile
                                                    ? "bg-white text-indigo-600"
                                                    : "bg-indigo-600 text-white"
                                            }`}
                                        >
                                            {tenantInitials}
                                        </div>
                                    )}
                                    <span
                                        className={`text-xs font-bold hidden sm:inline max-w-[110px] truncate ${
                                            isOnProfile
                                                ? "text-white"
                                                : "text-slate-800 dark:text-slate-200"
                                        }`}
                                    >
                                        {tenantName}
                                    </span>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 p-1.5 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{tenantName}</p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{tenantEmail}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => router.push('/tenant/profile')}
                                        className={`w-full mt-1 flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                            isOnProfile
                                                ? "bg-indigo-600 text-white"
                                                : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                                        }`}
                                    >
                                        <User className={`w-4 h-4 ${isOnProfile ? "text-white" : "text-slate-500 dark:text-slate-400"}`} />
                                        <span>My Profile</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        className="w-full mt-0.5 flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        <span>Log out</span>
                                    </button>
                                </DropdownMenuContent>
                            </DropdownMenu>

                        </div>
                    </header>

                    {/* Main Content Area */}
                    <div className="flex-1 h-full flex flex-col min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar bg-slate-50 dark:bg-slate-950">
                        <div className="px-5 pt-3 pb-2 sm:px-10 md:px-14 md:pt-3.5 md:pb-2 lg:px-20 xl:px-28 relative z-10 flex-1 h-full flex flex-col min-h-0">
                            <AnimatePresence mode="wait">
                                <div key={`${pathname}-${refreshKey}`} className="w-full flex-1 h-full flex flex-col min-h-0">
                                    {children}
                                </div>
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Facebook Messenger Desktop Style Floating Chat */}
                <TenantChatPopup />
            </div>
    );
}