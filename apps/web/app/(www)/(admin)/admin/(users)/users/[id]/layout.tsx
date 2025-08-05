import type React from 'react';
import ClientTabs from '@/components/client-tabs';
import { SettingsHeader } from '@/components/settings/header';
import { SettingsNavigation } from '@/components/settings/settings-navigation';
import { USER_SETTINGS_TABS, generateUserSettingsRoutes } from '@/lib/routes/user-settings';

export default async function UserProfileLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id: userId } = await params;

  return (
    <div className="flex w-full flex-col">
      {/* Header */}
      <SettingsHeader id={userId} />

      {/* Main layout wrapper */}
      <div className="flex w-full">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden lg:block">
          <SettingsNavigation navigationItems={USER_SETTINGS_TABS} userId={userId} />
        </aside>

        {/* Main content area */}
        <main className="w-full flex-1 pt-4 md:p-6 lg:p-8">
          {/* Mobile Navigation */}
          <div className="mb-6 lg:hidden">
            <ClientTabs menuItems={generateUserSettingsRoutes(userId)} />
          </div>

          {/* Settings Page Content */}
          <div className="w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
