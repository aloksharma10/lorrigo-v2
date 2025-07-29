'use client';

import { useEffect, useMemo } from 'react';
import { IconHelp, IconSettings } from '@tabler/icons-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  ScrollArea,
  useSidebar,
  SidebarTrigger,
} from '@lorrigo/ui/components';

import { NavMain } from './nav-main';
import { NavSecondary } from './nav-secondary';
import { SELLER_ROUTES } from '@/lib/routes/seller';
import { ADMIN_ROUTES } from '@/lib/routes/admin';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';

// ------------------------------
// Time-based greeting function
function getTimeGreeting(name: string = 'there') {
  const hour = new Date().getHours();
  let greeting = '';

  if (hour >= 5 && hour < 12) greeting = `Good Morning, ${name} ☀️`;
  else if (hour >= 12 && hour < 14) greeting = `Good Noon, ${name} 🌞`;
  else if (hour >= 14 && hour < 17) greeting = `Good Afternoon, ${name} 🍵`;
  else if (hour >= 17 && hour < 21) greeting = `Good Evening, ${name}`;
  else if (hour >= 21 && hour < 24) greeting = `Good Night, ${name} 🌙`;
  else if (hour >= 0 && hour < 3) greeting = `Late Night Owl, ${name} 🦉`;
  else greeting = `Hi, ${name} 👋`;

  return greeting;
}
// ------------------------------

const navSecondaryLinks = [
  {
    title: 'Settings',
    url: '/seller/settings',
    icon: IconSettings,
  },
  // {
  //   title: 'Get Help',
  //   url: '/seller/get-help',
  //   icon: IconHelp,
  // },
  {
    title: 'Privacy Policy',
    url: '/privacy-policy',
    icon: IconHelp,
  },
  {
    title: 'Terms & Conditions',
    url: '/terms-conditions',
    icon: IconHelp,
  },
  {
    title: 'Shipment & Delivery',
    url: '/shipment-and-delivery',
    icon: IconHelp,
  },
  {
    title: 'Refund Policy',
    url: '/refund-policy',
    icon: IconHelp,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession();
  const user = session?.user;
  const isAdmin = user?.role === 'ADMIN';
  const { state, setOpenMobile, openMobile, isMobile  } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const pathname = usePathname();

  const firstName = useMemo(() => user?.name?.split(' ')[0] ?? 'there', [user?.name]);
  const greeting = useMemo(() => getTimeGreeting(firstName), [firstName]);


  useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      {/* Header */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <div className="flex items-center justify-between gap-2">
                {!isCollapsed && <span className="text-base font-semibold">{greeting}</span>}
                <SidebarTrigger className="-ml-1 bg-transparent" />
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Content */}
      <SidebarContent>
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <NavMain items={SELLER_ROUTES} group="seller" />
          {isAdmin && <NavMain items={ADMIN_ROUTES} group="admin" />}
        </ScrollArea>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter>
      <NavSecondary items={navSecondaryLinks} className="mt-auto" />

        {/* <NavUser
          user={{
            name: user?.name ?? 'User',
            email: user?.email ?? '',
            avatar: user?.image ?? 'https://lorrigo.in/_next/static/media/lorrigologo.e54a51f3.svg',
          }}
        /> */}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
