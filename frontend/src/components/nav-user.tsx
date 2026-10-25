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
import { ChevronsUpDownIcon, BadgeCheckIcon, LogOutIcon, UserIcon } from "lucide-react"
import { useRouter } from "next/navigation"

export function NavUser({
  user,
  onLogout,
}: {
  user: {
    name: string
    email: string
    avatar?: string
    role?: string
  }
  onLogout?: () => void
}) {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const initials = user.name ? user.name.charAt(0).toUpperCase() : "U"

  const handleProfile = () => {
    const basePath = user.role?.toLowerCase().includes("admin") ? "/admin" : "/tenant"
    router.push(`${basePath}/profile`)
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground border border-slate-200/80 dark:border-zinc-800/80 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800/60"
              />
            }
          >
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage src={user.avatar || ""} alt={user.name} />
              <AvatarFallback className="rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
              <span className="truncate font-bold text-xs text-slate-900 dark:text-white">
                {user.name}
              </span>
              <span className="truncate text-[10px] text-slate-500 dark:text-zinc-400 font-semibold tracking-wide uppercase">
                {user.role || user.email}
              </span>
            </div>
            <ChevronsUpDownIcon className="ml-auto size-4 text-slate-400" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56 rounded-xl shadow-lg border border-slate-200 dark:border-zinc-800"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={6}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2.5 px-2 py-2 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar || ""} alt={user.name} />
                    <AvatarFallback className="rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                    <span className="truncate font-bold text-xs text-slate-900 dark:text-white">
                      {user.name}
                    </span>
                    <span className="truncate text-[10px] text-slate-500 dark:text-zinc-400">
                      {user.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={handleProfile} className="cursor-pointer gap-2 text-xs font-medium">
                <UserIcon className="size-4 text-slate-500" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleProfile} className="cursor-pointer gap-2 text-xs font-medium">
                <BadgeCheckIcon className="size-4 text-slate-500" />
                Account Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onLogout?.()} 
              className="cursor-pointer gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400 focus:text-rose-600 dark:focus:text-rose-400"
            >
              <LogOutIcon className="size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
