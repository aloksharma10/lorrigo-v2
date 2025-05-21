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

export const Header = ({
   menuItems
}: {
   menuItems: { name: string, path: string }[]
}) => {
   const pathname = usePathname();
   return (
      <header className="bg-white border-b border-gray-200">
         <div className="py-3 flex justify-between items-center">
            <div className="flex items-center">
               <NavigationMenu>
                  <NavigationMenuList className="space-x-2">
                     {menuItems.map((item) => (
                        <NavigationMenuItem key={item.name}>
                           <Link
                              href={item.path}
                              className={cn(
                                 "flex h-9 items-center gap-1 px-4 py-2 text-sm font-medium transition-colors hover:text-primary",
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

            <div className="flex items-center space-x-4">
               <Button variant="outline" size="sm">Account</Button>
            </div>
         </div>
      </header>
   );
};