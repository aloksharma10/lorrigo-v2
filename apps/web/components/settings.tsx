"use client"

import { useState } from "react"
import {Button, Card, CardContent, Label, Input, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@lorrigo/ui/components"
import { SettingsNavigation } from "./settings-navigation"

export default function SettingsPage() {
  const [urls, setUrls] = useState(["https://shadcn.com", "http://twitter.com/shadcn"])
  const [activeSection, setActiveSection] = useState("messages")

  const addUrl = () => {
    setUrls([...urls, ""])
  }

  const updateUrl = (index: number, value: string) => {
    const newUrls = [...urls]
    newUrls[index] = value
    setUrls(newUrls)
  }

  const removeUrl = (index: number) => {
    setUrls(urls.filter((_, i) => i !== index))
  }

  const renderContent = () => {
    switch (activeSection) {
      case "messages":
        return (
          <div className="space-y-8">
            {/* Username */}
            <div className="space-y-3">
              <Label htmlFor="username" className="font-medium">
                Username
              </Label>
              <Input id="username" defaultValue="shadcn" className="bg-background" />
              <p className="text-muted-foreground text-sm">
                This is your public display name. It can be your real name or a pseudonym. You can only change this once
                every 30 days.
              </p>
            </div>

            {/* Email */}
            <div className="space-y-3">
              <Label htmlFor="email" className="font-medium">
                Email
              </Label>
              <Select>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select a verified email to display" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email1">example@email.com</SelectItem>
                  <SelectItem value="email2">another@email.com</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-sm">
                You can manage verified email addresses in your email settings.
              </p>
            </div>

            {/* Bio */}
            <div className="space-y-3">
              <Label htmlFor="bio" className="font-medium">
                Bio
              </Label>
              <Textarea id="bio" defaultValue="I own a computer." className="bg-background min-h-[100px] resize-none" />
              <p className="text-muted-foreground text-sm">
                You can @mention other users and organizations to link to them.
              </p>
            </div>

            {/* URLs */}
            <div className="space-y-4">
              <div>
                <Label className="font-medium">URLs</Label>
                <p className="text-muted-foreground text-sm mt-1">
                  Add links to your website, blog, or social media profiles.
                </p>
              </div>

              <div className="space-y-3">
                {urls.map((url, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={url}
                      onChange={(e) => updateUrl(index, e.target.value)}
                      placeholder="https://example.com"
                      className="bg-background"
                    />
                    {urls.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeUrl(index)}
                        className="shrink-0"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}

                <Button type="button" variant="outline" onClick={addUrl}>
                  Add URL
                </Button>
              </div>
            </div>

            {/* Update Button */}
            <div className="pt-4">
              <Button>Update profile</Button>
            </div>
          </div>
        )
      default:
        return (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Select a section from the navigation to view its settings.</p>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Navigation Sidebar */}
        <div className="hidden lg:block">
          <SettingsNavigation activeItem={activeSection} onItemClick={setActiveSection} />
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="p-4 md:p-6 lg:p-8">
            <div className="max-w-2xl mx-auto">
              {/* Header */}
              {/* <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold mb-2">Settings</h1>
                  <p className="text-muted-foreground text-sm md:text-base">
                    Manage your account settings and set e-mail preferences.
                  </p>
                </div>
                <ThemeToggle />
              </div> */}

              {/* Mobile Navigation */}
              <div className="lg:hidden mb-6">
                <Card>
                  <CardContent className="p-4">
                    <SettingsNavigation activeItem={activeSection} onItemClick={setActiveSection} />
                  </CardContent>
                </Card>
              </div>

              {/* Settings Form */}
              <Card>
                <CardContent className="p-6 md:p-8">{renderContent()}</CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
