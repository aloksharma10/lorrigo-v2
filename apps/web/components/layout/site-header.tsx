'use client';
import { Button, useSidebar } from '@lorrigo/ui/components';
import { Input } from '@lorrigo/ui/components';
import { Separator } from '@lorrigo/ui/components';
import { SidebarTrigger } from '@lorrigo/ui/components';
import { IndianRupee, Search, Plus } from 'lucide-react';
// import { ModeToggle } from './mode-toggle';
import HoverCardToolTip from '../hover-card-tooltip';
import { useWalletOperations } from '@/lib/apis/wallet';
import { useModalStore } from '@/modal/modal-store';
import { currencyFormatter } from '@lorrigo/utils';

export function SiteHeader() {
  const { getWalletBalance } = useWalletOperations();
  const { openModal } = useModalStore();
  const { isMobile } = useSidebar();

  // Get wallet balance from API
  const { data: walletData, isLoading } = getWalletBalance;
  const walletBalance = walletData?.balance || 0;
  const holdAmount = walletData?.hold_amount || 0;
  const usableAmount = walletData?.usable_amount || 0;

  // Open recharge wallet modal
  const handleRechargeWallet = () => {
    openModal('recharge-wallet', {
      onSuccess: () => {
        // Wallet balance will be automatically refreshed due to query invalidation
      },
    });
  };

  return (
    <header className="h-(--header-height) group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) flex shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
        <div className="ml-auto flex items-center gap-4">
          {/* Search input for larger screens */}
          <Input
            // onClick={(e) => {
            //   e.stopPropagation();
            //   if (isMobile) {
            //     console.log('search');
            //     // openModal('search-modal');
            //   }
            // }}
            type='search'
            size="sm"
            placeholder="Search for AWB, Order ID, Customer Name, etc."
            className="mr-2 hidden w-72 placeholder:text-sm placeholder:text-gray-500 placeholder:text-opacity-50 lg:block"
          />

          {/* Search icon for small screens */}
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Search className="h-4 w-4" />
            <span className="sr-only">Search</span>
          </Button>

          {/* Wallet balance with INR symbol and recharge button */}
          <div className="flex items-center gap-2">
            <HoverCardToolTip
              triggerComponent={
                <div onClick={handleRechargeWallet} className="bg-secondary/50 flex items-center rounded-md border px-3 py-1 gap-2 cursor-pointer">
                  <IndianRupee className="text-muted-foreground mr-1.5 h-3.5 w-3.5" />
                  <span className="text-secondary-foreground text-sm font-medium">
                    {isLoading ? 'Loading...' : currencyFormatter(walletBalance)}
                  </span>
                  <Separator orientation="vertical" className="data-[orientation=vertical]:h-4 text-muted-foreground" />
                  <Plus className="h-3.5 w-3.5" />
                </div>
              }
              className="w-64 text-center text-sm"
            >
              <div className="grid grid-cols-2 gap-2">
                <p>Usable Amount:</p>
                <p>{currencyFormatter(usableAmount)}</p>
                <p>Total Amount:</p>
                <p>{currencyFormatter(walletBalance)}</p>
                <p>Hold Amount:</p>
                <p>{currencyFormatter(holdAmount)}</p>
              </div>
            </HoverCardToolTip>

            <Button
              variant="outline"
              size="sm"
              className="hidden lg:flex h-8 items-center gap-1 px-2 py-0"
              onClick={handleRechargeWallet}
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="text-xs">Recharge</span>
            </Button>
          </div>

          {/* <Button variant="secondary" size="icon" className="group/toggle size-8">
            <Bell size={16} />
            <span className="sr-only">Notifications</span>
          </Button> */}

          {/* <ModeToggle /> */}
        </div>
      </div>
    </header>
  );
}
