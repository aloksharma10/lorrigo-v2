import { Button } from '@lorrigo/ui/components';
import { Input } from '@lorrigo/ui/components';
import { Separator } from '@lorrigo/ui/components';
import { SidebarTrigger } from '@lorrigo/ui/components';
import { IndianRupee, Search, Bell } from 'lucide-react';
import { ModeToggle } from './mode-toggle';
import ActionTooltip from '../action-tooltip';
import HoverCardToolTip from '../hover-card-tooltip';

interface SiteHeaderProps {
  walletBalance?: number;
}

export function SiteHeader({ walletBalance = 5000 }: SiteHeaderProps) {
  return (
    <header className="h-(--header-height) group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) flex shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
        <div className="ml-auto flex items-center gap-4">
          {/* Search input for larger screens */}
          <Input
            placeholder="Search for AWB, Order ID, Customer Name, etc."
            className="mr-2 hidden w-72 placeholder:text-sm placeholder:text-gray-500 placeholder:text-opacity-50 lg:block"
          />

          {/* Search icon for small screens */}
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Search className="h-4 w-4" />
            <span className="sr-only">Search</span>
          </Button>

          {/* Wallet balance with INR symbol */}
          <HoverCardToolTip
            triggerComponent={
              <div className="bg-secondary/50 flex items-center rounded-md border px-3 py-1">
                <IndianRupee className="text-muted-foreground mr-1.5 h-3.5 w-3.5" />
                <span className="text-secondary-foreground text-sm font-medium">
                  {walletBalance.toLocaleString('en-IN')}
                </span>
              </div>
            }
            className="w-64 text-center text-sm"
          >
            <div className="grid grid-cols-2 gap-2">
              <p>Usable Amount:</p>
              <p>₹-50,156.59</p>
              <p>Total Amount:</p>
              <p>₹-50,156.59</p>
              <p>Hold Amount:</p>
              <p>₹59729.78</p>
            </div>
          </HoverCardToolTip>

          <Button variant="secondary" size="icon" className="group/toggle size-8">
            <Bell size={16} />
            <span className="sr-only">Notifications</span>
          </Button>

          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
