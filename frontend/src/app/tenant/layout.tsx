"use client";
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import PageTransition from '@/components/PageTransition';
import api from '@/lib/api';
import { ThemeToggle } from "@/components/theme-toggle";

import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from '@/components/app-sidebar';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { LayoutDashboard, Building2, CreditCard, Wrench, User, MessageSquare, Bell, AlertCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const mockNotifications = [
    { id: 1, title: "Rent payment due soon", desc: "Your next rent payment of ₱10,000 is due on the 5th.", time: "1d ago", unread: true },
    { id: 2, title: "Maintenance update", desc: "Your request for leaking pipe has been resolved.", time: "2d ago", unread: false },
    { id: 3, title: "New message from admin", desc: "Please submit your ID requirements.", time: "3d ago", unread: false }
];

export default function TenantLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [tenantName, setTenantName] = useState('Tenant');
    const [tenantEmail, setTenantEmail] = useState('tenant@renttrack.com');
    const [unreadCount, setUnreadCount] = useState(0);
    const [showAllNotifications, setShowAllNotifications] = useState(false);

    const fetchUnreadCount = async () => {
        try {
            const { data } = await api.get('/tenant/chat/unread');
            setUnreadCount(data.unreadCount);
        } catch (error) {
            console.error('Failed to fetch unread count', error);
        }
    };

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            setTenantName(user.name);
            if (user.email) setTenantEmail(user.email);
        }

        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 15000);
        return () => clearInterval(interval);
    }, [pathname]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
    };

    const rawNavItems = [
        { name: 'Dashboard', path: '/tenant/dashboard', icon: LayoutDashboard },
        { name: 'Rooms', path: '/tenant/rooms', icon: Building2 },
        { name: 'My Payments', path: '/tenant/payments', icon: CreditCard },
        { name: 'Maintenance', path: '/tenant/requests', icon: Wrench },
        { name: 'My Profile', path: '/tenant/profile', icon: User },
        { name: 'Chat', path: '/tenant/chat', icon: MessageSquare },
    ];

    const mappedNavItems = rawNavItems.map(item => {
        const isActive = pathname === item.path;
        let badgeCount = 0;
        let badgeColor: "rose" | "amber" | "indigo" | "blue" = "blue";

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
            <div className="flex h-screen w-full bg-black text-slate-900 dark:text-zinc-50 overflow-hidden selection:bg-cyan-500/30">
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
                    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200/60 dark:border-white/5 bg-white dark:bg-[#0a0a0a] backdrop-blur-2xl px-4 sm:px-6 lg:px-8 sticky top-0 z-20 shadow-none">
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
                            <FullscreenToggle />
                            <DropdownMenu>
                                <DropdownMenuTrigger className="relative p-2 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors outline-none">
                                    <Bell className="w-5 h-5" strokeWidth={2} />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-[#0a0a0a]"></span>
                                    )}
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-80 p-0 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xl bg-white dark:bg-[#0a0a0a]">
                                    <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-zinc-800">
                                        <span className="font-bold text-sm text-slate-800 dark:text-white">Notifications</span>
                                        <div className="flex gap-3 text-xs font-semibold">
                                            <button className="text-emerald-600 dark:text-emerald-400 hover:underline">Mark all read</button>
                                        </div>
                                    </div>
                                    <div className={`overflow-y-auto transition-all duration-300 ease-in-out ${showAllNotifications ? 'max-h-[60vh]' : 'max-h-[300px]'}`}>
                                        {mockNotifications.map(notif => (
                                            <div key={notif.id} className={`p-4 border-b border-slate-100 dark:border-zinc-800/50 last:border-0 ${notif.unread ? 'bg-slate-50 dark:bg-white/[0.02]' : ''} flex items-start gap-3 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer`}>
                                                <div className={`mt-0.5 ${notif.unread ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                    <AlertCircle className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-sm text-slate-800 dark:text-white truncate">{notif.title}</p>
                                                    <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5 line-clamp-2">{notif.desc}</p>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase mt-2 block">{notif.time}</span>
                                                </div>
                                            </div>
                                        ))}
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
                            <ThemeToggle />
                        </div>
                    </header>

                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-zinc-700 bg-slate-50 dark:bg-black">
                        <div className="px-3 py-4 md:px-4 md:py-6 lg:px-5 lg:py-6 relative z-10">
                            <AnimatePresence mode="wait">
                                <PageTransition key={pathname}>
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