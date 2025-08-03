import { LorrigoLogo } from '@/components/logos/lorrigo-logo';

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 p-6 md:p-6">
      <div className="flex justify-between gap-2 w-full">
        <LorrigoLogo />
        {/* <PublicNavigation config={navigationConfig} /> */}
      </div>
      <div className="grid w-full lg:grid-cols-2 h-[calc(100vh-100px)]">{children} </div>
    </div>
  );
}
