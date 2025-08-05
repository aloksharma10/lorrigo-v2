'use client';

import { useRef, useState, useEffect, type ForwardRefExoticComponent, type RefAttributes, useMemo } from 'react';
import { Box, ChevronLeft, ChevronRight, FileText, type LucideProps } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, Button } from '@lorrigo/ui/components';
import { useRouter, usePathname } from 'next/navigation';
import {
  Bell,
  Menu,
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
  User,
  CreditCard,
  AlertTriangle,
  HandCoins,
  FilePlus,
  PackageCheck,
  Truck,
  CheckCircle,
  RotateCcw,
  List,
} from 'lucide-react';

// Icon mapping to convert string names to components
const iconMap = {
  Home,
  BadgeIndianRupee,
  Bell,
  Menu,
  Palette,
  MessageSquare,
  Globe,
  Grid3X3,
  Check,
  Video,
  Link: LinkIcon,
  Lock,
  Settings,
  User,
  CreditCard,
  AlertTriangle,
  HandCoins,
  FilePlus,
  PackageCheck,
  Truck,
  CheckCircle,
  RotateCcw,
  List,
  Box,
  FileText,
} as const;

interface ClientTabsProps {
  menuItems: {
    name: string;
    path?: string;
    iconName?: string; // Changed from icon to iconName
    icon?: ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>>;
  }[];
  onValueChange?: (value: string) => void;
}

export default function ClientTabs({ menuItems, onValueChange }: ClientTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const tabsListRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  // Memoized mapping of iconName to icon component
  const processedMenuItems = useMemo(
    () =>
      menuItems.map((item) => ({
        ...item,
        icon: item.iconName ? iconMap[item.iconName as keyof typeof iconMap] : item.icon,
      })),
    [menuItems]
  );

  // Active tab value
  const currentPath = processedMenuItems.find((item) => item.path === pathname)?.path || processedMenuItems[0]?.path || '';

  // Route/tab change
  const handleValueChange = (value: string) => {
    if (value.includes('/')) {
      router.push(value, { scroll: false });
    } else {
      onValueChange?.(value);
    }
  };

  const checkScroll = () => {
    if (!tabsListRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = tabsListRef.current;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (!tabsListRef.current) return;
    const scrollAmount = 200;
    const newScrollLeft = direction === 'left' ? tabsListRef.current.scrollLeft - scrollAmount : tabsListRef.current.scrollLeft + scrollAmount;

    tabsListRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  useEffect(() => {
    const tabsList = tabsListRef.current;
    if (tabsList) {
      tabsList.addEventListener('scroll', checkScroll);
      return () => tabsList.removeEventListener('scroll', checkScroll);
    }
  }, []);

  useEffect(() => {
    if (tabsListRef.current) {
      tabsListRef.current.scrollLeft = 0;
      const activeTab = tabsListRef.current.querySelector('[data-state="active"]');
      if (activeTab && !pathname.includes(processedMenuItems[0]?.path || '')) {
        setTimeout(() => {
          activeTab.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center',
          });
        }, 100);
      }
      setTimeout(checkScroll, 200);
    }
  }, [currentPath, pathname, processedMenuItems]);

  return (
    <header className="dark:border-gray-800">
      <div className="flex items-center justify-between py-3">
        <div className="relative flex w-full items-center md:w-auto">
          {/* Left scroll button */}
          {showLeftArrow && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="bg-background/80 absolute left-0 top-1/2 z-20 h-8 w-8 -translate-y-1/2 backdrop-blur-sm"
                onClick={() => scroll('left')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="from-background pointer-events-none absolute left-0 top-0 z-10 h-full w-8 bg-gradient-to-r to-transparent" />
            </>
          )}

          {/* Scrollable tab list */}
          <div ref={tabsListRef} className="scrollbar-hide w-full overflow-x-auto md:w-auto" onScroll={checkScroll}>
            <Tabs value={currentPath} onValueChange={handleValueChange} className="w-full">
              <TabsList className="scrollbar-hide inline-flex w-max gap-4 overflow-x-auto whitespace-nowrap px-1">
                {processedMenuItems.map((item, index) => (
                  <TabsTrigger
                    key={index}
                    value={item.path || ''}
                    onClick={() => handleValueChange(item.path?.toLowerCase() || '')}
                    className="whitespace-nowrap"
                  >
                    {item.icon && <item.icon className="mr-1 h-4 w-4" />}
                    {item.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Right scroll button */}
          {showRightArrow && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="bg-background/80 absolute right-0 top-1/2 z-20 h-8 w-8 -translate-y-1/2 backdrop-blur-sm"
                onClick={() => scroll('right')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <div className="from-background pointer-events-none absolute right-0 top-0 z-10 h-full w-8 bg-gradient-to-l to-transparent" />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
