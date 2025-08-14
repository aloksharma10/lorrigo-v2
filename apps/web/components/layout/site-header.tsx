'use client';

import { Button, useSidebar, SidebarTrigger, Badge } from '@lorrigo/ui/components';
import { Input } from '@lorrigo/ui/components';
import { Separator } from '@lorrigo/ui/components';
import { Avatar, AvatarFallback, AvatarImage } from '@lorrigo/ui/components';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@lorrigo/ui/components';
import { IndianRupee, Search, Plus, User, Settings, LogOut } from 'lucide-react';
import HoverCardToolTip from '../hover-card-tooltip';
import { useWalletOperations } from '@/lib/apis/wallet';
import { useModalStore } from '@/modal/modal-store';
import { currencyFormatter } from '@lorrigo/utils';
import { useSession, signOut } from 'next-auth/react';
import { LorrigoLogo } from '@/components/logos/lorrigo-logo';
import Link from 'next/link';
import { useUserOperations } from '@/lib/apis/users';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export function SiteHeader() {
  const { getWalletBalance } = useWalletOperations();
  const { openModal } = useModalStore();
  const { data: session } = useSession();
  const router = useRouter();
  // Get wallet balance from API
  const { data: walletData, isLoading } = getWalletBalance;
  const walletBalance = walletData?.balance || 0;
  const holdAmount = walletData?.hold_amount || 0;
  const usableAmount = walletData?.usable_amount || 0;

  const { isMobile } = useSidebar();
  const { getMyProfile } = useUserOperations();
  const { data: myProfile } = getMyProfile;

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Open recharge wallet modal
  const handleRechargeWallet = () => {
    openModal('recharge-wallet', {
      onSuccess: () => {
        // Wallet balance will be automatically refreshed due to query invalidation
      },
    });
  };

  // Handle sign out
  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  // Get user initials for avatar fallback
  const getUserInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header
      className={`sticky top-0 z-40 flex h-[var(--header-height)] shrink-0 items-center gap-2 rounded-t-xl border-b transition-all duration-600 ease-in-out ${
        isScrolled
          ? 'bg-background'
          : 'bg-background/95 supports-[backdrop-filter]:bg-background/60 backdrop-blur'
      }`}
    >
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        {isMobile && <SidebarTrigger className="-ml-1" />}

        <LorrigoLogo />
        <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />

        <div className="ml-auto flex items-center gap-4">
          {/* Search input for larger screens */}
          <Input
            type="search"
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
                <div className="bg-secondary/50 hover:bg-secondary/70 flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1 transition-colors">
                  <Link href="/seller/wallet" className="flex items-center gap-2">
                    <IndianRupee className="text-muted-foreground mr-1.5 h-3.5 w-3.5" />
                    <span className="text-secondary-foreground text-sm font-medium">{isLoading ? 'Loading...' : currencyFormatter(walletBalance)}</span>
                  </Link>
                  <Separator orientation="vertical" className="text-muted-foreground data-[orientation=vertical]:h-4" />
                  <Plus className="h-3.5 w-3.5 lg:hidden" onClick={handleRechargeWallet} />
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

            <Button size="sm" className="hidden h-8 items-center gap-1 px-2 py-0 lg:flex" onClick={handleRechargeWallet}>
              <Plus className="h-3.5 w-3.5" />
              <span className="text-xs">Recharge</span>
            </Button>
          </div>

          {/* User Profile Avatar Dropdown */}
          {session?.user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session.user.image || ''} alt={session.user.name || ''} />
                    <AvatarFallback className="text-xs font-medium">{getUserInitials(session.user.name)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none flex items-center justify-between gap-2">
                      {session.user.name} <Badge variant="status_success" className='ml-auto'>{myProfile?.user.plan?.name}</Badge>
                    </p>
                    <p className="text-muted-foreground text-xs leading-none">{session.user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {/* <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem> */}
                  <DropdownMenuItem onClick={() => router.push('/seller/settings/general')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}