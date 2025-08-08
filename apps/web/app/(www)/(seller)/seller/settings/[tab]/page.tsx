import { redirect } from 'next/navigation';
import { SellerSettingsPage } from '@/components/settings/seller-settings';
import { SELLER_SETTINGS_TABS } from '@/lib/routes/seller';

export default async function SellerSettingsTabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  const validTabs = new Set(SELLER_SETTINGS_TABS.map((t) => t.id));
  if (!validTabs.has(tab)) {
    redirect('/seller/settings/general');
  }

  return (
    <div className="w-full">
      <SellerSettingsPage initialTab={tab} />
    </div>
  );
}