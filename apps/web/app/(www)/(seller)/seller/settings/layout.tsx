import type React from 'react';
import ClientTabs from '@/components/client-tabs';
import { SellerSettingsNavigation } from '@/components/settings/seller-settings-navigation';
import { SELLER_SETTINGS_TABS, generateSellerSettingsRoutes } from '@/lib/routes/seller';
import { Settings } from 'lucide-react';

export default async function SellerSettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-col">
      {/* Header */}
      <div className="border-b bg-background">
        <div className="mx-auto w-full px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold md:text-2xl">Settings</h1>
              <p className="text-muted-foreground text-sm">Manage your company, billing, notifications and integrations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main layout wrapper */}
      <div className="flex w-full">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden lg:block">
          <SellerSettingsNavigation navigationItems={SELLER_SETTINGS_TABS} />
        </aside>

        {/* Main content area */}
        <main className="w-full flex-1 pt-4 md:p-6 lg:p-8">
          {/* Mobile Navigation */}
          <div className="mb-6 lg:hidden">
            <ClientTabs menuItems={generateSellerSettingsRoutes()} />
          </div>

          {/* Settings Page Content */}
          <div className="w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}