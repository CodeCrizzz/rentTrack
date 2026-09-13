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
import { LayoutDashboard, Building2, Users, CreditCard, Wrench, MessageSquare, Bell, AlertCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const mockNotifications = [
    { id: 1, title: "New tenant registration", desc: "Juan dela Cruz applied for Room 101.", time: "10m ago", unread: true },
    { id: 2, title: "High-priority maintenance", desc: "Leaking pipe in Room 204.", time: "1h ago", unread: true },
    { id: 3, title: "Payment awaiting verification", desc: "Maria Clara submitted a payment of ₱4,500.", time: "2h ago", unread: false }
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [adminName, setAdminName] = useState('Admin');
    const [adminEmail, setAdminEmail] = useState('admin@renttrack.com');
    const [unreadCount, setUnreadCount] = useState(0);
    const [pendingTenantsCount, setPendingTenantsCount] = useState(0);

    const fetchUnreadCount = async () => {
        try {
            const { data } = await api.get('/admin/chat/unread');
            setUnreadCount(data.unreadCount);
        } catch (error) {
            console.error('Failed to fetch unread count', error);
        }
    };

    const fetchPendingTenantCount = async () => {
        try {
            const { data } = await api.get('/admin/tenants/pending-count');
            if (data && typeof data.pendingCount !== 'undefined') {
                setPendingTenantsCount(data.pendingCount);
            }
        } catch (error) {
            console.warn('Pending tenant count endpoint not found. Defaulting to 0.');
            setPendingTenantsCount(0); 
        }
    };

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            setAdminName(user.name);
            if (user.email) setAdminEmail(user.email);
        }
        
        const fetchData = () => {
            fetchUnreadCount();
            fetchPendingTenantCount();
        };

        fetchData();
        const interval = setInterval(fetchData, 15000);
        return () => clearInterval(interval);
    }, [pathname]);

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
            <div className="flex h-screen w-full bg-black text-slate-900 dark:text-zinc-50 overflow-hidden selection:bg-cyan-500/30">
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
                    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200/60 dark:border-white/5 bg-white dark:bg-[#0a0a0a] backdrop-blur-2xl px-4 sm:px-6 lg:px-8 sticky top-0 z-20 shadow-none">
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
                            <FullscreenToggle />
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="relative p-2 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors outline-none">
                                        <Bell className="w-5 h-5" strokeWidth={2} />
                                        {(unreadCount > 0 || pendingTenantsCount > 0) && (
                                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-[#0a0a0a]"></span>
                                        )}
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-80 p-0 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xl bg-white dark:bg-[#0a0a0a]">
                                    <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-zinc-800">
                                        <span className="font-bold text-sm text-slate-800 dark:text-white">Notifications</span>
                                        <div className="flex gap-3 text-xs font-semibold">
                                            <button className="text-emerald-600 dark:text-emerald-400 hover:underline">Mark all read</button>
                                        </div>
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto">
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
                                        <button className="text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white transition-colors">View all notifications</button>
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