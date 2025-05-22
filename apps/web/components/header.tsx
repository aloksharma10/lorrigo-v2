"use client"
import {
   NavigationMenu,
   NavigationMenuContent,
   NavigationMenuItem,
   NavigationMenuLink,
   NavigationMenuList,
   NavigationMenuTrigger,
   navigationMenuTriggerStyle,
   Button
} from "@lorrigo/ui/components";
import { cn } from "@lorrigo/ui/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const Header = ({
   menuItems
}: {
   menuItems: { name: string, path: string }[]
}) => {
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
         <div className="py-3 flex justify-between items-center">
            <div className="relative flex items-center w-full md:w-auto">
               {/* Left shadow and arrow */}
               {showLeftShadow && (
                  <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center pointer-events-none md:hidden">
                     <div className="bg-gradient-to-r from-white dark:from-gray-900 to-transparent w-8 h-full flex items-center">
                        <button
                           onClick={scrollLeft}
                           className="pointer-events-auto p-1 rounded-full bg-white dark:bg-gray-900 shadow-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                           aria-label="Scroll left"
                        >
                           <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        </button>
                     </div>
                  </div>
               )}

               {/* Right shadow and arrow */}
               {showRightShadow && (
                  <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center justify-end pointer-events-none md:hidden">
                     <div className="bg-gradient-to-l from-white dark:from-gray-900 to-transparent w-8 h-full flex items-center justify-end">
                        <button
                           onClick={scrollRight}
                           className="pointer-events-auto p-1 rounded-full bg-white dark:bg-gray-900 shadow-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
                  className="overflow-x-auto scrollbar-hide pl-8 lg:pl-3 w-full md:w-auto"
                  onScroll={checkScrollPosition}
               >
                  <NavigationMenu>
                     <NavigationMenuList className="flex px-8 w-full md:px-0">
                        {menuItems.map((item) => (
                           <NavigationMenuItem key={item.name} className="flex-shrink-0">
                              <Link
                                 href={item.path}
                                 className={cn(
                                    "flex h-9 items-center gap-1 px-4 py-2 text-sm font-medium transition-colors hover:text-primary whitespace-nowrap",
                                    "border-b-2 border-transparent hover:border-primary/50",
                                    "data-[active=true]:border-primary data-[active=true]:text-primary"
                                 )}
                                 data-active={pathname === item.path}
                              >
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