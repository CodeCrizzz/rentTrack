"use client"

import * as React from "react"
import { LogOut as LogOutIcon } from "lucide-react"
import { useRouter } from "next/navigation"

import { NavMain, type NavMainItem } from "@/components/nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar"

export interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  navLabel?: string
  navItems?: NavMainItem[]
  user?: {
    name: string
    email: string
    avatar?: string
    role?: string
  }
  onLogout?: () => void
  teams?: {
    name: string
    logo: React.ReactNode
    plan: string
  }[]
}

export function AppSidebar({
  navLabel = "",
  navItems,
  user,
  onLogout,
  ...props
}: AppSidebarProps) {
  const router = useRouter()
  const currentUser = user || {
    name: "Admin",
    email: "admin@renttrack.com",
    avatar: "",
    role: "Master Admin",
  }

  const initials = currentUser.name
    ? currentUser.name
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U"

  const handleProfileClick = () => {
    const basePath = currentUser.role?.toLowerCase().includes("admin")
      ? "/admin"
      : "/tenant"
    router.push(`${basePath}/profile`)
  }

  return (
    <Sidebar
      collapsible="icon"
      className="!bg-[#07152b] !border-r !border-[#0d2242] text-white"
      {...props}
    >
      {/* Navigation List starting at the top */}
      <SidebarContent className="!bg-[#07152b] text-white pt-4 pb-2 px-1 custom-scrollbar">
        {navItems && navItems.length > 0 && (
          <NavMain label={navLabel} items={navItems} />
        )}
      </SidebarContent>

      {/* Footer: User account & Log out button */}
      <SidebarFooter className="!bg-[#07152b] !border-t-0 p-3 pt-0 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:pt-0">
        <div className="border-t border-[#0d2242] pt-3 group-data-[collapsible=icon]:pt-2">
          {/* User Account: Profile in the left, Name in the right */}
          <div
            onClick={handleProfileClick}
            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-colors text-left group cursor-pointer outline-none select-none group-data-[collapsible=icon]:p-1 group-data-[collapsible=icon]:justify-center"
            title={`${currentUser.name} (${currentUser.role || "User"}) - View Profile`}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                handleProfileClick()
              }
            }}
          >
            {/* User Profile (Avatar) in the left */}
            <div className="relative shrink-0">
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-10 h-10 rounded-xl object-cover border border-blue-400/30 group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 border border-blue-400/30 flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
                  {initials}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#07152b] rounded-full" />
            </div>

            {/* Name in the right */}
            <div className="grid flex-1 text-left min-w-0 group-data-[collapsible=icon]:hidden">
              <span className="truncate font-bold text-white text-xs sm:text-sm leading-tight group-hover:text-blue-300 transition-colors">
                {currentUser.name}
              </span>
              <span className="truncate text-[11px] text-blue-200/60 font-medium leading-tight mt-0.5">
                {currentUser.role || currentUser.email || "Account"}
              </span>
            </div>
          </div>

          {/* Below the user profile is a log out button */}
          <button
            type="button"
            onClick={onLogout}
            className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-600/30 border border-rose-500/20 hover:border-rose-500/40 transition-all cursor-pointer group active:scale-[0.98] group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:mt-1.5"
            title="Log out"
          >
            <LogOutIcon className="w-4 h-4 shrink-0 transition-transform group-hover:-translate-x-0.5" />
            <span className="group-data-[collapsible=icon]:hidden">Log out</span>
          </button>

          {/* Version */}
          <div className="text-[10px] text-blue-300/30 font-medium text-center mt-2 pb-0.5 group-data-[collapsible=icon]:hidden">
            v1.0.0
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
