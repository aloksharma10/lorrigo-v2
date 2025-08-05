import { LorrigoLogo } from '@/components/logos/lorrigo-logo';

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 p-6 md:p-6">
      <div className="flex w-full justify-between gap-2">
        <LorrigoLogo />
        {/* <PublicNavigation config={navigationConfig} /> */}
      </div>
      <div className="grid h-[calc(100vh-100px)] w-full lg:grid-cols-2">{children} </div>
    </div>
  );
}
