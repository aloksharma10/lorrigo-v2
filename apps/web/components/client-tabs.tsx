'use client';

import { useRef, useState, useEffect, ForwardRefExoticComponent, RefAttributes } from 'react';
import { ChevronLeft, ChevronRight, LucideProps } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, Button } from '@lorrigo/ui/components';
import { useRouter, usePathname } from 'next/navigation';

interface ClientTabsProps {
  menuItems: { name: string; path?: string; icon?: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>> }[];
  onValueChange?: (value: string) => void;
}

export default function ClientTabs({ menuItems, onValueChange }: ClientTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const tabsListRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  // Find the current path in menuItems, fallback to first item if not found
  const currentPath =
    menuItems.find((item) => item.path === pathname)?.path || menuItems[0]?.path || '';

  const handleValueChange = (value: string) => {
    if (value.includes("/")) {
      router.push(value, { scroll: false });
    } else {
      onValueChange?.(value);
    }
  };

  const checkScroll = () => {
    if (!tabsListRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = tabsListRef.current;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1); // -1 for rounding errors
  };

  const scroll = (direction: 'left' | 'right') => {
    if (!tabsListRef.current) return;

    const scrollAmount = 200; // Adjust scroll amount as needed
    const newScrollLeft =
      direction === 'left'
        ? tabsListRef.current.scrollLeft - scrollAmount
        : tabsListRef.current.scrollLeft + scrollAmount;

    tabsListRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth',
    });
  };

  // Check scroll on mount and when window resizes
  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  // Check scroll when tabs list is scrolled
  useEffect(() => {
    const tabsList = tabsListRef.current;
    if (tabsList) {
      tabsList.addEventListener('scroll', checkScroll);
      return () => tabsList.removeEventListener('scroll', checkScroll);
    }
  }, []);

  // Scroll active tab into view on mount and ensure first tab is visible on mobile
  useEffect(() => {
    if (tabsListRef.current) {
      // First ensure the scroll position is at the beginning
      tabsListRef.current.scrollLeft = 0;

      // Then scroll the active tab into view if it's not the first one
      const activeTab = tabsListRef.current.querySelector('[data-state="active"]');
      if (activeTab && !pathname.includes(menuItems[0]?.path || '')) {
        setTimeout(() => {
          activeTab.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center',
          });
        }, 100);
      }

      // Check scroll after scrolling
      setTimeout(checkScroll, 200);
    }
  }, [currentPath, pathname, menuItems]);

  return (
    <header className="border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between py-3">
        <div className="relative flex w-full items-center md:w-auto">
          {/* Left scroll button for mobile */}
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

          <div
            ref={tabsListRef}
            className="scrollbar-hide w-full overflow-x-auto px-1 md:w-auto"
            onScroll={checkScroll}
          >
            <Tabs defaultValue={currentPath} onValueChange={handleValueChange} className="w-full">
              <TabsList className="scrollbar-hide flex w-max min-w-full overflow-x-auto">
                {menuItems.map((item, index) => (
                  <TabsTrigger
                    key={index}
                    value={item.path || ''}
                    onClick={() => handleValueChange(item.path?.toLowerCase() || '')}
                    className={"whitespace-nowrap"}
                  >
                    {item.icon && <item.icon className="h-4 w-4" />}
                    {item.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Right scroll button for mobile */}
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
