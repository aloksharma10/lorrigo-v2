'use client';

import * as React from 'react';
import { IconBrightness, type Icon } from '@tabler/icons-react';
import { useTheme } from 'next-themes';

import { SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@lorrigo/ui/components';
import { Skeleton } from '@lorrigo/ui/components';
import { Switch } from '@lorrigo/ui/components';
import { useModalStore } from '@/modal/modal-store';
import { useDrawerStore } from '@/drawer/drawer-store';

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string;
    url: string;
    icon: Icon;
  }[];
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const { openDrawer } = useDrawerStore();
  const { openModal } = useModalStore();
  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title} className="flex flex-col items-center justify-center">
              <SidebarMenuButton asChild>
                <div
                  onClick={() => {
                    if (item.title === 'Settings') {
                      openModal('seller-settings', { type: item.url.split('/').pop(), title: item.title,  className: 'max-w-4xl p-4' });
                      // openDrawer('seller-settings', { side: "bottom", size: "screen" , className: "p-4"});
                    } else {
                      openModal('all-policies', { type: item.url.split('/').pop(), title: item.title, className: 'max-w-4xl p-4' });
                    }
                  }}
                >
                  <item.icon />
                  <span>{item.title}</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
            <SidebarMenuButton asChild>
              <label>
                <IconBrightness />
                <span>Dark Mode</span>
                {mounted ? (
                  <Switch
                    className="ml-auto"
                    checked={resolvedTheme !== 'light'}
                    onCheckedChange={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                  />
                ) : (
                  <Skeleton className="ml-auto h-4 w-8 rounded-full" />
                )}
              </label>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
