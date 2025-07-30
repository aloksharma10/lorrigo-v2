import ClientTabs from '@/components/client-tabs';

const menuItems = [
  { name: 'Overview', path: '/seller/dashboard', iconName: 'Home' },
  { name: 'Orders', path: '/seller/dashboard/orders', iconName: 'Box' },
  { name: 'Shipments', path: '/seller/dashboard/shipments', iconName: 'Truck' },
  { name: 'NDR', path: '/seller/dashboard/ndr', iconName: 'AlertTriangle' },
  { name: 'RTO', path: '/seller/dashboard/rto', iconName: 'RotateCcw' },
];

export default async function SellerDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      {/* <Header menuItems={menuItems} /> // TODO: Not needed for now */}
      <ClientTabs menuItems={menuItems} />
      {children}
    </div>
  );
}
