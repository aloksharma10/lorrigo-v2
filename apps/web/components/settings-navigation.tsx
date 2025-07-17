"use client"

import type React from "react"

import { useState } from "react"
import { cn } from "@lorrigo/ui/lib/utils"
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
  Link,
  Lock,
  Settings,
} from "lucide-react"

interface NavigationItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  active?: boolean
}

const navigationItems: NavigationItem[] = [
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "navigation", label: "Navigation", icon: Menu },
  { id: "home", label: "Home", icon: Home },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "messages", label: "Messages & media", icon: MessageSquare, active: true },
  { id: "language", label: "Language & region", icon: Globe },
  { id: "accessibility", label: "Accessibility", icon: Grid3X3 },
  { id: "mark-read", label: "Mark as read", icon: Check },
  { id: "audio-video", label: "Audio & video", icon: Video },
  { id: "connected", label: "Connected accounts", icon: Link },
  { id: "privacy", label: "Privacy & visibility", icon: Lock },
  { id: "advanced", label: "Advanced", icon: Settings },
]

interface SettingsNavigationProps {
  activeItem?: string
  onItemClick?: (itemId: string) => void
}

export function SettingsNavigation({ activeItem = "messages", onItemClick }: SettingsNavigationProps) {
  const [selectedItem, setSelectedItem] = useState(activeItem)

  const handleItemClick = (itemId: string) => {
    setSelectedItem(itemId)
    onItemClick?.(itemId)
  }

  return (
    <nav className="w-full lg:w-80 bg-background border-r border-border">
      <div className="p-4 space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isActive = selectedItem === item.id

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                isActive && "bg-accent text-accent-foreground",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
