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
import { LayoutDashboard, Building2, Users, CreditCard, Wrench, MessageSquare, Bell, Settings, User, RefreshCw, Calendar } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [adminName, setAdminName] = useState('Admin');
    const [adminEmail, setAdminEmail] = useState('admin@renttrack.com');
    const [unreadCount, setUnreadCount] = useState(0);
    const [pendingTenantsCount, setPendingTenantsCount] = useState(0);
    const [showAllNotifications, setShowAllNotifications] = useState(false);
    const [isAllRead, setIsAllRead] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [currentDate, setCurrentDate] = useState("");

    const fetchUnreadCount = async () => {
        try {
            const { data } = await api.get('/admin/chat/unread');
            setUnreadCount(data.unreadCount);
        } catch (error: any) {
            if (error.response?.status !== 401) {
                console.error('Failed to fetch unread count', error);
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
            if (error.response?.status !== 401) {
                console.warn('Pending tenant count endpoint not found. Defaulting to 0.');
            }
            setPendingTenantsCount(0); 
        }
    };

    useEffect(() => {
        const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
        setCurrentDate(new Date().toLocaleDateString(undefined, options));

        const userStr = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (userStr) {
            const user = JSON.parse(userStr);
            setAdminName(user.name);
            if (user.email) setAdminEmail(user.email);
        }
        
        if (!token) return;

        const fetchData = () => {
            fetchUnreadCount();
            fetchPendingTenantCount();
        };

        fetchData();
        const interval = setInterval(fetchData, 15000);
        return () => clearInterval(interval);
    }, [pathname]);

    useEffect(() => {
        const readUnread = parseInt(localStorage.getItem('admin_read_unreadCount') || '0');
        const readPending = parseInt(localStorage.getItem('admin_read_pendingCount') || '0');
        
        if (unreadCount > readUnread || pendingTenantsCount > readPending) {
            setIsAllRead(false);
        } else {
            setIsAllRead(true);
        }
    }, [unreadCount, pendingTenantsCount]);

    const handleMarkAllRead = () => {
        setIsAllRead(true);
        localStorage.setItem('admin_read_unreadCount', unreadCount.toString());
        localStorage.setItem('admin_read_pendingCount', pendingTenantsCount.toString());
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
    };

    const rawNavItems = [
        { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'Rooms', path: '/admin/rooms', icon: Building2 },
        { name: 'Manage Tenants', path: '/admin/tenants', icon: Users },
        { name: 'Billing', path: '/admin/billing', icon: CreditCard },
        { name: 'Requests', path: '/admin/requests', icon: Wrench },
        { name: 'Chat', path: '/admin/chat', icon: MessageSquare },
        { name: 'Settings', path: '/admin/settings', icon: Settings },
    ];

    const mappedNavItems = rawNavItems.map(item => {
        const isActive = pathname === item.path;
        let badgeCount = 0;
        let badgeColor: "rose" | "amber" | "indigo" | "blue" = "indigo";

        if (item.name === 'Manage Tenants' && pendingTenantsCount > 0) {
            badgeCount = pendingTenantsCount;
            badgeColor = "amber";
        }
        if (item.name === 'Chat' && unreadCount > 0) {
            badgeCount = unreadCount;
            badgeColor = "rose";
        }

        return {
            title: item.name,
            url: item.path,
            isActive,
            badgeCount,
            badgeColor,
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
                    navLabel="Platform Overview"
                    navItems={mappedNavItems}
                    user={{
                        name: adminName,
                        email: adminEmail,
                        avatar: "",
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
                                    {(!isAllRead && (unreadCount > 0 || pendingTenantsCount > 0)) && (
                                        <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold px-1 min-w-[20px] h-[20px] flex items-center justify-center rounded-full border-2 border-white dark:border-[#0a0a0a]">
                                            {(unreadCount + pendingTenantsCount) > 99 ? '99+' : (unreadCount + pendingTenantsCount)}
                                        </span>
                                    )}
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-80 p-0 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xl bg-card">
                                    <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-zinc-800">
                                        <span className="font-bold text-sm text-slate-800 dark:text-white">Notifications</span>
                                        <div className="flex gap-3 text-xs font-semibold">
                                            <button 
                                                onClick={handleMarkAllRead} 
                                                className="text-emerald-600 dark:text-emerald-400 hover:underline"
                                            >
                                                Mark all read
                                            </button>
                                        </div>
                                    </div>
                                    <div className={`overflow-y-auto transition-all duration-300 ease-in-out ${showAllNotifications ? 'max-h-[60vh]' : 'max-h-[150px]'}`}>
                                        {(!isAllRead && (unreadCount > 0 || pendingTenantsCount > 0)) ? (
                                            <div className="flex flex-col">
                                                {pendingTenantsCount > 0 && (
                                                    <div className="p-4 border-b border-slate-100 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => router.push('/admin/tenants')}>
                                                        <p className="text-sm font-semibold text-slate-800 dark:text-white">Pending Registrations</p>
                                                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">You have {pendingTenantsCount} new tenant registration{pendingTenantsCount > 1 ? 's' : ''} to review.</p>
                                                    </div>
                                                )}
                                                {unreadCount > 0 && (
                                                    <div className="p-4 border-b border-slate-100 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => router.push('/admin/chat')}>
                                                        <p className="text-sm font-semibold text-slate-800 dark:text-white">Unread Messages</p>
                                                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">You have {unreadCount} unread message{unreadCount > 1 ? 's' : ''}.</p>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="p-8 text-center text-slate-500 dark:text-zinc-400">
                                                <Bell className="w-8 h-8 mx-auto mb-3 opacity-20" />
                                                <p className="text-sm font-semibold">No new notifications</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3 border-t border-slate-100 dark:border-zinc-800 text-center bg-slate-50 dark:bg-white/[0.02]">
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
                        <div className="px-3 py-4 md:px-4 md:py-6 lg:px-5 lg:py-6 relative z-10">
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