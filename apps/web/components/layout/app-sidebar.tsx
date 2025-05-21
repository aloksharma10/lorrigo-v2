"use client"

import * as React from "react"
import {
  IconHelp,
  IconInnerShadowTop,
  IconSearch,
  IconSettings,
} from "@tabler/icons-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@lorrigo/ui/components"
import { NavMain } from "./nav-main"
import { NavSecondary } from "./nav-secondary"
import { NavUser } from "./nav-user"
import { SELLER_ROUTES } from "@/lib/routes/seller"

const data = {
  user: {
    name: "Lorrigo",
    email: "noreply@lorrigo.com",
    avatar: "https://lorrigo.in/_next/static/media/lorrigologo.e54a51f3.svg",
  },
  seller : SELLER_ROUTES,
  navSecondary: [
    {
      title: "Settings",
      url: "/seller/settings",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: "/seller/get-help",
      icon: IconHelp,
    },
    {
      title: "Terms & Conditions",
      url: "/seller/terms-conditions",
      icon: IconHelp,
    },
  ],

}
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <span>
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">Lorrigo</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.seller}  group="seller"/>
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
