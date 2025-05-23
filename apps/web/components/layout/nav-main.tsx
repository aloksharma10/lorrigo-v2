'use client';
import { ChevronRight, type LucideIcon } from 'lucide-react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@lorrigo/ui/components';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@lorrigo/ui/components';
import { Popover, PopoverContent, PopoverTrigger } from '@lorrigo/ui/components';
import Link from 'next/link';

export function NavMain({
  items,
  group,
}: {
  items: {
    title: string;
    url?: string;
    icon: LucideIcon;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
  group: string;
}) {
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="capitalize">{group}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const hasDropdown = item.items && item.items.length > 0;

          // When sidebar is expanded, use Collapsible for dropdowns
          if (!isCollapsed) {
            return (
              <Collapsible key={item.title} asChild defaultOpen={item.isActive}>
                <SidebarMenuItem>
                  {hasDropdown ? (
                    <CollapsibleTrigger asChild>
                      <div className="flex w-full cursor-pointer items-center justify-between">
                        <SidebarMenuButton tooltip={item.title} asChild>
                          <div className="flex items-center gap-2">
                            <item.icon className="size-4" />
                            <span>{item.title}</span>
                          </div>
                        </SidebarMenuButton>
                        <SidebarMenuAction className="transition-transform data-[state=open]:rotate-90">
                          <ChevronRight className="size-4" />
                        </SidebarMenuAction>
                      </div>
                    </CollapsibleTrigger>
                  ) : (
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <Link href={item.url || '#'}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}

                  {hasDropdown && (
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items?.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton asChild>
                              <a href={subItem.url}>
                                <span>{subItem.title}</span>
                              </a>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  )}
                </SidebarMenuItem>
              </Collapsible>
            );
          }

          // When sidebar is collapsed, use Popover for dropdowns
          return (
            <SidebarMenuItem key={item.title}>
              {hasDropdown ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <SidebarMenuButton tooltip={item.title}>
                      <item.icon className="size-4" />
                      <span className="sr-only">{item.title}</span>
                    </SidebarMenuButton>
                  </PopoverTrigger>
                  <PopoverContent side="right" align="start" className="w-48 p-0" sideOffset={5}>
                    <div className="py-1">
                      {item.items?.map((subItem) => (
                        <a
                          key={subItem.title}
                          href={subItem.url}
                          className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex items-center px-4 py-2 text-sm"
                        >
                          {subItem.title}
                        </a>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <SidebarMenuButton asChild tooltip={item.title}>
                  <a href={item.url || '#'}>
                    <item.icon className="size-4" />
                    <span className="sr-only">{item.title}</span>
                  </a>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
