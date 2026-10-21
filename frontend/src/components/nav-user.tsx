"use client"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { LogOut, Settings } from "lucide-react"
import { useRouter } from "next/navigation"

export function NavUser({
  user,
  onLogout,
}: {
  user: {
    name: string
    email: string
    avatar: string
    role: string
  }
  onLogout: () => void
}) {
  const router = useRouter()
  const initials = user.name ? user.name.charAt(0).toUpperCase() : "U"

  const handleProfileClick = () => {
    const basePath = user.role.toLowerCase().includes('admin') ? '/admin' : '/tenant'
    router.push(`${basePath}/profile`)
  }

  return (
    <div className="flex flex-col w-full">
      {/* Account Name Card */}
      <div
        onClick={handleProfileClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleProfileClick()
          }
        }}
        title="View Account Profile"
        className="flex items-center gap-3 p-2 rounded-xl bg-slate-100/70 hover:bg-slate-200/70 dark:bg-zinc-800/50 dark:hover:bg-zinc-800/90 border border-slate-200/70 dark:border-white/5 transition-all duration-200 cursor-pointer group-data-[collapsible=icon]:p-1.5 group-data-[collapsible=icon]:justify-center select-none"
      >
        <Avatar className="h-8 w-8 rounded-lg shrink-0">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback className="rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold border border-zinc-300 dark:border-zinc-700 text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="grid flex-1 text-left text-sm leading-tight min-w-0 group-data-[collapsible=icon]:hidden">
          <span className="truncate font-bold text-slate-900 dark:text-white text-xs">
            {user.name}
          </span>
          <span className="truncate text-[10px] uppercase font-bold tracking-widest text-slate-500 dark:text-zinc-400">
            {user.role}
          </span>
        </div>
      </div>

      {/* Actions Row: Log out & Account Settings beside each other */}
      <div className="grid grid-cols-2 gap-1.5 w-full mt-2 group-data-[collapsible=icon]:grid-cols-1 group-data-[collapsible=icon]:gap-1">
        <button
          type="button"
          onClick={onLogout}
          title="Log out"
          className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold text-white bg-red-800 hover:bg-red-900 dark:bg-red-800/90 dark:hover:bg-red-700 border border-red-900/80 dark:border-red-700 transition-all duration-200 cursor-pointer shadow-xs active:scale-95 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0 text-white stroke-[2.5]" />
          <span className="truncate group-data-[collapsible=icon]:hidden">Log out</span>
        </button>

        <button
          type="button"
          onClick={handleProfileClick}
          title="Account Settings"
          className="flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-zinc-200 bg-white hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-200/80 dark:border-zinc-700/80 transition-all duration-200 cursor-pointer shadow-xs active:scale-95 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center"
        >
          <Settings className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-zinc-400" />
          <span className="truncate group-data-[collapsible=icon]:hidden">Account Settings</span>
        </button>
      </div>
    </div>
  )
}
