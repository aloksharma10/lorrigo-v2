'use client';

import type React from 'react';

import { ChevronRight, LucideProps, type LucideIcon } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { Button, Collapsible, CollapsibleContent, CollapsibleTrigger } from '@lorrigo/ui/components';
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
  SidebarMenuBadge,
  useSidebar,
} from '@lorrigo/ui/components';
import { Popover, PopoverContent, PopoverTrigger } from '@lorrigo/ui/components';
import { Badge } from '@lorrigo/ui/components';
import Link from 'next/link';
import LoadingIndicator from '../loading-spinner';
import { ForwardRefExoticComponent, RefAttributes, useCallback } from 'react';

export function NavMain({
  items,
  group,
}: {
  items: {
    title: string;
    url?: string;
    icon: ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>>;
    isActive?: boolean;
    un_dev?: boolean;
    items?: {
      icon: ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>>;
      title: string;
      url: string;
      un_dev?: boolean;
    }[];
  }[];
  group: string;
}) {
  const { isMobile, state } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();

  const isCollapsed = !isMobile && state === 'collapsed';

  // Helper function to check if a route is active
  const isRouteActive = useCallback(
    (url?: string, items?: { url: string }[]) => {
      if (!url && !items) return false;

      // Check main URL
      if (url && pathname === url) return true;

      // Check sub-items
      if (items) {
        return items.some((item) => pathname === item.url);
      }

      return false;
    },
    [pathname]
  );

  // Safe render function to prevent errors
  const safeRender = useCallback((content: React.ReactNode, fallback?: React.ReactNode) => {
    try {
      return content;
    } catch (error) {
      console.error('Error rendering sidebar item:', error);
      return fallback || null;
    }
  }, []);

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="capitalize">{group}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const hasDropdown = item.items && item.items.length > 0;
          const isActive = isRouteActive(item.url, item.items);
          const isDisabled = item.un_dev;

          // When sidebar is expanded, use Collapsible for dropdowns
          if (!isCollapsed) {
            return safeRender(
              <Collapsible key={item.title} asChild defaultOpen={isActive}>
                <SidebarMenuItem>
                  {hasDropdown ? (
                    <>
                      <CollapsibleTrigger asChild disabled={isDisabled}>
                        <SidebarMenuButton tooltip={item.title} className={isDisabled ? 'cursor-not-allowed opacity-50' : ''}>
                          <item.icon className="size-4" />
                          <span>{item.title}</span>
                          {isDisabled && (
                            <Badge variant="secondary" className="ml-auto text-xs">
                              Coming Soon
                            </Badge>
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <SidebarMenuAction className="transition-transform data-[state=open]:rotate-90">
                        <ChevronRight className="size-4" />
                      </SidebarMenuAction>
                    </>
                  ) : (
                    <>
                      {isDisabled ? (
                        <SidebarMenuButton tooltip={item.title} className="cursor-not-allowed opacity-50" data-active={isActive}>
                          <item.icon className="size-4" />
                          <span>{item.title}</span>
                          <Badge variant="secondary" className="ml-auto text-xs">
                            Coming Soon
                          </Badge>
                        </SidebarMenuButton>
                      ) : (
                        <SidebarMenuButton asChild tooltip={item.title} data-active={isActive}>
                          <Link href={item.url || '#'} prefetch={false}>
                            <item.icon className="size-4" />
                            <span>{item.title}</span>
                            <LoadingIndicator className="ml-auto size-4" />
                          </Link>
                        </SidebarMenuButton>
                      )}
                    </>
                  )}

                  {hasDropdown && (
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items?.map((subItem) => {
                          const isSubActive = pathname === subItem.url;
                          const isSubDisabled = subItem.un_dev;

                          return safeRender(
                            <SidebarMenuSubItem key={subItem.title}>
                              {isSubDisabled ? (
                                <SidebarMenuSubButton className="cursor-not-allowed opacity-50" data-active={isSubActive}>
                                  {subItem.icon && <subItem.icon className="size-4" />}
                                  <span>{subItem.title}</span>
                                  <Badge variant="secondary" className="ml-auto text-xs">
                                    Coming Soon
                                  </Badge>
                                </SidebarMenuSubButton>
                              ) : (
                                <SidebarMenuSubButton asChild data-active={isSubActive}>
                                  <Link href={subItem.url} className="flex w-full flex-row justify-start">
                                    <div className="flex w-full flex-row items-center justify-start gap-2">
                                      {subItem.icon && <subItem.icon className="size-4" />}
                                      <span>{subItem.title}</span>
                                      <LoadingIndicator className="ml-auto size-4" />
                                    </div>
                                  </Link>
                                </SidebarMenuSubButton>
                              )}
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  )}
                </SidebarMenuItem>
              </Collapsible>
            );
          }

          // When sidebar is collapsed, use Popover for dropdowns
          return safeRender(
            <SidebarMenuItem key={item.title}>
              {hasDropdown ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <SidebarMenuButton tooltip={item.title} className={isDisabled ? 'cursor-not-allowed opacity-50' : ''} disabled={isDisabled}>
                      <item.icon className="size-4" />
                      <span className="sr-only">{item.title}</span>
                    </SidebarMenuButton>
                  </PopoverTrigger>
                  {isDisabled && (
                    <SidebarMenuBadge>
                      <Badge variant="secondary" className="text-xs">
                        CS
                      </Badge>
                    </SidebarMenuBadge>
                  )}
                  <PopoverContent side="right" align="start" className="w-48 p-0" sideOffset={5}>
                    <div className="p-4 text-sm font-medium">{item.title}</div>
                    <div className="py-1">
                      {item.items?.map((subItem) => {
                        const isSubActive = pathname === subItem.url;
                        const isSubDisabled = subItem.un_dev;

                        return safeRender(
                          <div key={subItem.title}>
                            {isSubDisabled ? (
                              <div className="flex cursor-not-allowed items-center justify-between px-4 py-2 text-sm opacity-50">
                                <span>{subItem.title}</span>
                                <Badge variant="secondary" className="text-xs">
                                  Coming Soon
                                </Badge>
                              </div>
                            ) : (
                              <Link
                                href={subItem.url}
                                className={`hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex items-center gap-2 px-4 py-2 text-sm ${
                                  isSubActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''
                                }`}
                              >
                                {subItem.icon && <subItem.icon className="size-4" />}
                                <span>{subItem.title}</span>
                                <LoadingIndicator className="ml-auto size-4" />
                              </Link>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <>
                  {isDisabled ? (
                    <SidebarMenuButton tooltip={item.title} className="cursor-not-allowed opacity-50" data-active={isActive}>
                      <item.icon className="size-4" />
                      <span className="sr-only">{item.title}</span>
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton asChild tooltip={item.title} data-active={isActive}>
                      <Link href={item.url || '#'}>
                        <item.icon className="size-4" />
                        <span className="sr-only">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                  {isDisabled && (
                    <SidebarMenuBadge>
                      <Badge variant="secondary" className="text-xs">
                        CS
                      </Badge>
                    </SidebarMenuBadge>
                  )}
                </>
              )}
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
