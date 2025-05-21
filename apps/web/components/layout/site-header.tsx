import { Button, Input } from "@lorrigo/ui/components"
import { Separator } from "@lorrigo/ui/components"
import { SidebarTrigger } from "@lorrigo/ui/components"
import { ModeToggle } from "@/components/layout/mode-toggle"
import { Bell } from "lucide-react"

export function SiteHeader() {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <div className="ml-auto flex items-center gap-4">
          <Input
            placeholder="Search for AWB, Order ID, Customer Name, etc."
            className="w-72 mr-2 placeholder:text-sm placeholder:text-gray-500 placeholder:text-opacity-50"
          />
          <Button variant="secondary" size="icon"
            className="group/toggle size-4">
            <Bell size={10} />
            <span className="sr-only">Notifications</span>
          </Button>
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
