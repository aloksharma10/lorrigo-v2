import { cookies } from 'next/headers';

import { SidebarInset, SidebarProvider } from '@lorrigo/ui/components';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { SiteHeader } from '@/components/layout/site-header';

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true';

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)',
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="@container/main relative flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 px-4 md:p-8">
            {/* <BackButton  showLabel={false} className="absolute top-0 left-12 w-min bg-primary/90 text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground dark:bg-primary/90 dark:text-primary-foreground dark:hover:bg-primary/90 dark:hover:text-primary-foreground" /> */}
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
