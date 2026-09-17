"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

export function AppSidebar({ 
  navLabel,
  navItems,
  user,
  onLogout,
  ...props 
}: React.ComponentProps<typeof Sidebar> & {
  navLabel: string
  navItems: any[]
  user: {
    name: string
    email: string
    avatar: string
    role: string
  }
  onLogout: () => void
}) {
  return (
    <Sidebar collapsible="icon" className="border-r border-slate-200/60 dark:border-white/5 bg-card" {...props}>
      <SidebarHeader className="mt-1 sm:mt-2 px-5 pt-2 pb-1 flex items-center justify-between border-b border-transparent group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:justify-center transition-all duration-300">
        <div className="w-32 h-32 sm:w-40 sm:h-40 group-data-[collapsible=icon]:!w-8 group-data-[collapsible=icon]:!h-8 rounded-xl flex items-center justify-center shrink-0 bg-transparent group-hover/logo:scale-105 transition-all duration-300 mx-auto">
            <img src="/images/renttrack_logo.png" alt="RentTrack Logo" className="w-full h-full object-contain drop-shadow-md scale-110 group-data-[collapsible=icon]:scale-100" />
        </div>
      </SidebarHeader>
      
      <SidebarContent className="pb-4 group-data-[collapsible=icon]:pb-2 custom-scrollbar">
        <NavMain label={navLabel} items={navItems} />
      </SidebarContent>
      
      <SidebarFooter className="p-2 border-t border-slate-200/60 dark:border-white/5 group-data-[collapsible=icon]:items-center">
        <NavUser user={user} onLogout={onLogout} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
