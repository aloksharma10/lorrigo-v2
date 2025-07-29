// Keep the same structure but ensure iconName matches the iconMap keys
export const USER_SETTINGS_TABS: UserSettingsTab[] = [
  { id: "home", name: "Home", iconName: "Home" },
  { id: "remittance", name: "Remittance", iconName: "HandCoins" },
  { id: "billing", name: "Billing", iconName: "BadgeIndianRupee" },
  { id: "notifications", name: "Notifications", iconName: "Bell" },
  { id: "appearance", name: "Appearance", iconName: "Palette" },
  { id: "messages", name: "Messages & media", iconName: "MessageSquare" },
  { id: "language", name: "Language & region", iconName: "Globe" },
  { id: "accessibility", name: "Accessibility", iconName: "Grid3X3" },
  { id: "mark-read", name: "Mark as read", iconName: "Check" },
  { id: "audio-video", name: "Audio & video", iconName: "Video" },
  { id: "connected", name: "Connected accounts", iconName: "Link" },
  { id: "privacy", name: "Privacy & visibility", iconName: "Lock" },
  { id: "advanced", name: "Advanced", iconName: "Settings" },
]

export type UserSettingsTab = {
  id: string
  name: string
  iconName: string
}

export function generateUserSettingsRoutes(userId: string) {
  return USER_SETTINGS_TABS.map((tab) => ({
    id: tab.id,
    name: tab.name,
    path: `/admin/users/${userId}/${tab.id}`,
    iconName: tab.iconName, // Pass iconName instead of icon component
  }))
}
