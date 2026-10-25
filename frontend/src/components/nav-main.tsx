"use client"

import Link from "next/link"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { ChevronRightIcon } from "lucide-react"

export interface NavMainItem {
  title: string
  url: string
  icon?: React.ReactNode
  isActive?: boolean
  badgeCount?: number
  badgeColor?: string
  items?: {
    title: string
    url: string
  }[]
}

export function NavMain({
  label = "",
  items,
}: {
  label?: string
  items: NavMainItem[]
}) {
  return (
    <SidebarGroup className="p-0">
      {label && (
        <SidebarGroupLabel className="text-slate-400 font-semibold tracking-wider uppercase text-[10px] px-3.5 mb-1">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarMenu className="gap-1.5 px-2">
        {items.map((item) => {
          const hasSubItems = item.items && item.items.length > 0;

          if (hasSubItems) {
            return (
              <Collapsible
                key={item.title}
                defaultOpen={item.isActive}
                className="group/collapsible"
                render={<SidebarMenuItem />}
              >
                <CollapsibleTrigger
                  render={
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={item.isActive}
                      className={
                        item.isActive
                          ? "!bg-[#0062cc] !text-white font-bold shadow-xs hover:!bg-[#0052ad] rounded-xl h-11 px-3.5"
                          : "text-slate-200 hover:bg-white/10 hover:text-white font-medium rounded-xl h-11 px-3.5 transition-colors"
                      }
                    />
                  }
                >
                  {item.icon}
                  <span className="flex-1 text-left text-sm">{item.title}</span>
                  {item.badgeCount && item.badgeCount > 0 ? (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white leading-none mr-1">
                      {item.badgeCount}
                    </span>
                  ) : null}
                  <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90 size-4 text-slate-400" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub className="border-l border-white/15 ml-5 pl-2.5 my-1 space-y-1">
                    {item.items?.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton
                          render={<Link href={subItem.url} />}
                          className="text-slate-300 hover:text-white hover:bg-white/10 rounded-lg text-xs font-medium py-1.5"
                        >
                          <span>{subItem.title}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </Collapsible>
            );
          }

          // Single menu item without sub-items
          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                render={<Link href={item.url} />}
                tooltip={item.title}
                isActive={item.isActive}
                className={
                  item.isActive
                    ? "!bg-[#0062cc] !text-white font-bold shadow-xs hover:!bg-[#0052ad] rounded-xl h-11 px-3.5"
                    : "text-slate-200 hover:bg-white/10 hover:text-white font-medium rounded-xl h-11 px-3.5 transition-colors"
                }
              >
                {item.icon}
                <span className="flex-1 truncate text-sm">{item.title}</span>
                {item.badgeCount && item.badgeCount > 0 ? (
                  <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white leading-none">
                    {item.badgeCount}
                  </span>
                ) : null}
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
