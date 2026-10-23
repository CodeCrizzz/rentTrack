"use client";

import * as React from "react";
import { Building2, Home } from "lucide-react";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

export function AppSidebar({
  navLabel,
  navItems,
  user,
  onLogout,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  navLabel: string;
  navItems: any[];
  user: {
    name: string;
    email: string;
    avatar: string;
    role: string;
  };
  onLogout: () => void;
}) {
  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-slate-800/80 bg-[#081226] text-white"
      {...props}
    >
      {/* Top Header: Logo & Subtitle */}
      <SidebarHeader className="px-5 pt-5 pb-3 border-b border-white/5 transition-all duration-300">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0284c7] flex items-center justify-center shrink-0 shadow-md text-white">
            <Home className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden overflow-hidden">
            <div className="font-black text-white text-base tracking-tight leading-none">
              RentTrack
            </div>
            <div className="text-[10px] text-slate-400 font-medium tracking-normal mt-1 truncate">
              Boarding House Management System
            </div>
          </div>
        </div>
      </SidebarHeader>

      {/* Main Navigation */}
      <SidebarContent className="py-2 px-1 group-data-[collapsible=icon]:px-0 custom-scrollbar">
        <NavMain label={navLabel} items={navItems} />
      </SidebarContent>

      {/* Footer: Property Card & App Version */}
      <SidebarFooter className="p-3 border-t border-white/5 space-y-2.5">
        <div className="p-3 rounded-xl bg-[#0e1d3e] border border-blue-900/40 group-data-[collapsible=icon]:hidden">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">
                Riverside Boarding House
              </p>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                123 Santos St., San Pedro, Laguna
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span className="font-mono text-slate-500 group-data-[collapsible=icon]:hidden">
            v1.0.0
          </span>
          <NavUser user={user} onLogout={onLogout} />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
