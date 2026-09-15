"use client"

import Link from "next/link"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
} from "@/components/ui/sidebar"

export function NavMain({
  label,
  items,
}: {
  label: string
  items: {
    title: string
    url: string
    icon?: React.ReactNode
    isActive?: boolean
    badgeCount?: number
    badgeColor?: "rose" | "amber" | "indigo" | "blue"
  }[]
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-2">
        {label}
      </SidebarGroupLabel>
      <SidebarMenu className="gap-1.5">
        {items.map((item) => {
          let badgeClasses = "bg-slate-500 text-white"
          if (item.badgeColor === "rose") badgeClasses = "bg-rose-500 text-white"
          if (item.badgeColor === "amber") badgeClasses = "bg-amber-500 text-amber-950 dark:text-amber-50"
          
          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton 
                render={<Link href={item.url} className="flex items-center gap-3" />}
                isActive={item.isActive}
                tooltip={item.title}
                className={`rounded-xl ${
                  item.isActive 
                    ? 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 font-bold ring-1 ring-cyan-500/20' 
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100/80 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white font-medium'
                }`}
              >
                {item.icon}
                <span>{item.title}</span>
              </SidebarMenuButton>
              
              {item.badgeCount && item.badgeCount > 0 ? (
                <SidebarMenuBadge className={`${badgeClasses} font-bold shadow-sm px-2 py-0.5 rounded-full text-[10px] ring-2 ring-white dark:ring-zinc-950 -ml-2`}>
                  {item.badgeCount}
                </SidebarMenuBadge>
              ) : null}
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
