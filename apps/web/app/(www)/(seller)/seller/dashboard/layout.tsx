import { Header } from '@/components/header';

const menuItems = [
  { name: 'Overview', path: '/seller/dashboard' },
  { name: 'Orders', path: '/seller/dashboard/orders' },
  { name: 'Shipments', path: '/seller/dashboard/shipments' },
  { name: 'NDR', path: '/seller/dashboard/ndr' },
  { name: 'RTO', path: '/seller/dashboard/rto' },
];

export default async function SellerDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Header menuItems={menuItems} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
