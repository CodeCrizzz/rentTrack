"use client"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { ChevronsUpDownIcon, BadgeCheckIcon, LogOutIcon } from "lucide-react"
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
  const { isMobile } = useSidebar()
  const router = useRouter()
  const initials = user.name.charAt(0).toUpperCase()

  const handleProfileClick = () => {
    const basePath = user.role.toLowerCase().includes('admin') ? '/admin' : '/tenant'
    router.push(`${basePath}/profile`)
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="aria-expanded:bg-muted aria-expanded:text-muted-foreground transition-colors" />
            }
          >
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-500/30">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-bold">{user.name}</span>
              <span className="truncate text-[10px] uppercase font-black tracking-widest text-emerald-600 dark:text-emerald-400">
                {user.role}
              </span>
            </div>
            <ChevronsUpDownIcon className="ml-auto size-4 text-slate-500" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56 rounded-xl border border-slate-200 dark:border-white/10 shadow-lg dark:bg-zinc-950"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-3 px-3 py-2.5 text-left text-sm">
                  <Avatar className="h-9 w-9 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-500/30">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-bold">{user.name}</span>
                    <span className="truncate text-[10px] uppercase font-black tracking-widest text-emerald-600 dark:text-emerald-400">
                      {user.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-slate-200 dark:bg-white/10" />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={handleProfileClick} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg">
                <BadgeCheckIcon className="mr-2 h-4 w-4 text-cyan-500" />
                Account Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-slate-200 dark:bg-white/10" />
            <DropdownMenuItem 
              onClick={onLogout}
              className="cursor-pointer text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 rounded-lg font-bold transition-colors"
            >
              <LogOutIcon className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
