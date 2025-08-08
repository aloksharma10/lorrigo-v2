'use client';

import { cn } from '@lorrigo/ui/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  Home,
  Palette,
  MessageSquare,
  Globe,
  Grid3X3,
  Check,
  Video,
  LinkIcon,
  Lock,
  Settings,
  BadgeIndianRupee,
  CreditCard,
} from 'lucide-react';
import type { SellerSettingsTab } from '@/lib/routes/seller';

const iconMap = {
  Home,
  BadgeIndianRupee,
  Bell,
  Palette,
  MessageSquare,
  Globe,
  Grid3X3,
  Check,
  Video,
  Link: LinkIcon,
  Lock,
  Settings,
  CreditCard,
} as const;

interface SellerSettingsNavigationProps {
  navigationItems: SellerSettingsTab[];
}

export function SellerSettingsNavigation({ navigationItems }: SellerSettingsNavigationProps) {
  const pathname = usePathname();

  // Extract the tab segment from the pathname
  const pathSegments = pathname.split('/').filter(Boolean);
  const activeTabSegment = pathSegments[pathSegments.length - 1] || '';

  return (
    <nav className="bg-background border-border w-full border-r lg:w-80">
      <div className="space-y-1 p-4">
        {navigationItems?.map((item) => {
          const Icon = iconMap[item.iconName as keyof typeof iconMap];
          const isActive = activeTabSegment === item.id;

          return (
            <Link
              key={item.id}
              href={`/seller/settings/${item.id}`}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                isActive && 'bg-accent text-accent-foreground'
              )}
            >
              {Icon && <Icon className="h-5 w-5 shrink-0" />}
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}