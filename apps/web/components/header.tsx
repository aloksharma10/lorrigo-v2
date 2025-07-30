'use client';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
  Button,
} from '@lorrigo/ui/components';
import { cn } from '@lorrigo/ui/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export const Header = ({ menuItems }: { menuItems: { name: string; path: string, icon?: LucideIcon }[] }) => {
  const pathname = usePathname();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftShadow, setShowLeftShadow] = useState(false);
  const [showRightShadow, setShowRightShadow] = useState(false);

  const checkScrollPosition = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftShadow(scrollLeft > 0);
      setShowRightShadow(scrollLeft < scrollWidth - clientWidth);
    }
  };

  useEffect(() => {
    checkScrollPosition();
    window.addEventListener('resize', checkScrollPosition);
    return () => window.removeEventListener('resize', checkScrollPosition);
  }, []);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  return (
    <header className="border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between py-3">
        <div className="relative flex w-full items-center md:w-auto">
          {/* Left shadow and arrow */}
          {showLeftShadow && (
            <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 flex items-center md:hidden">
              <div className="flex h-full w-8 items-center bg-gradient-to-r from-white to-transparent dark:from-gray-900">
                <button
                  onClick={scrollLeft}
                  className="pointer-events-auto rounded-full bg-white p-1 shadow-md transition-colors hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>
          )}

          {/* Right shadow and arrow */}
          {showRightShadow && (
            <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 flex items-center justify-end md:hidden">
              <div className="flex h-full w-8 items-center justify-end bg-gradient-to-l from-white to-transparent dark:from-gray-900">
                <button
                  onClick={scrollRight}
                  className="pointer-events-auto rounded-full bg-white p-1 shadow-md transition-colors hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>
          )}

          {/* Scrollable navigation container */}
          <div
            ref={scrollContainerRef}
            className="scrollbar-hide w-full overflow-x-auto"
            onScroll={checkScrollPosition}
          >
            <NavigationMenu>
              <NavigationMenuList className="flex w-full">
                {menuItems.map((item) => (
                  <NavigationMenuItem key={item.name} className="flex-shrink-0">
                    <Link
                      href={item.path}
                      className={cn(
                        'hover:text-primary flex h-9 items-center gap-1 whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors',
                        'hover:border-primary/50 border-b-2 border-transparent',
                        'data-[active=true]:border-primary data-[active=true]:text-primary'
                      )}
                      data-active={pathname === item.path}
                    >
                      {item.icon && <item.icon className="h-4 w-4" />}
                      <span>{item.name}</span>
                    </Link>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>
          </div>
        </div>

        {/* <div className="flex items-center space-x-4">
               <Button variant="outline" size="sm">Account</Button>
            </div> */}
      </div>
    </header>
  );
};
