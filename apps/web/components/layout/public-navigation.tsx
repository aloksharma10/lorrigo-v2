"use client"

import type * as React from "react"
import Link from "next/link"

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@lorrigo/ui/components"
import { cn } from "@lorrigo/ui/lib/utils"
import type { NavigationConfig, NavigationContent } from "@/lib/type/public-navigation"
import Image from "next/image"

interface PublicNavigationProps {
  config: NavigationConfig
}

export function PublicNavigation({ config }: PublicNavigationProps) {
  const { items, brand, className, viewport = false } = config

  return (
    <NavigationMenu viewport={viewport} className={cn("z-2", className)}>
      <NavigationMenuList>
        {items.map((item, index) => (
          <NavigationMenuItem key={`${item.title}-${index}`}>
            {item.type === "link" ? (
              <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                <Link href={item.href || "#"}>{item.title}</Link>
              </NavigationMenuLink>
            ) : (
              <>
                <NavigationMenuTrigger>{item.title}</NavigationMenuTrigger>
                <NavigationMenuContent>{renderNavigationContent(item.content, item.type, brand)}</NavigationMenuContent>
              </>
            )}
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  )
}

function renderNavigationContent(
  content: NavigationContent | undefined,
  type: "dropdown" | "mega",
  brand?: NavigationConfig["brand"],
) {
  if (!content) return null

  if (type === "mega") {
    return (
      <ul className="grid gap-2 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
        {brand && (
          <li className="row-span-3">
            <NavigationMenuLink asChild>
              <Link
                className="from-muted/50 to-muted flex h-full w-full flex-col justify-end rounded-md bg-gradient-to-b p-6 no-underline outline-none select-none focus:shadow-md"
                href={brand.href}
              >
                <Image src={brand.logo} alt={brand.title} width={100} height={100} className="mb-2" />
                <div className="text-lg font-medium">{brand.title}</div>
                <p className="text-muted-foreground text-sm leading-tight">{brand.description}</p>
              </Link>
            </NavigationMenuLink>
          </li>
        )}
        {content.links?.map((link, index) => (
          <ListItem key={`${link.title}-${index}`} href={link.href} title={link.title}>
            {link.description}
          </ListItem>
        ))}
      </ul>
    )
  }

  if (type === "dropdown") {
    const gridCols = content.sections ? "md:grid-cols-2" : "grid-cols-1"
    const width = content.sections ? "w-[400px] md:w-[500px] lg:w-[600px]" : "w-[300px]"

    return (
      <ul className={cn("grid gap-4", width, gridCols)}>
        {content.sections ? (
          content.sections.map((section, sectionIndex) => (
            <li key={`section-${sectionIndex}`}>
              {section.links.map((link, linkIndex) => (
                <NavigationMenuLink key={`${link.title}-${linkIndex}`} asChild>
                  <Link href={link.href} className="flex items-center gap-2">
                    {link.icon && <link.icon className="h-4 w-4" />}
                    <div>
                      <div className="font-medium">{link.title}</div>
                      {link.description && <div className="text-muted-foreground text-sm">{link.description}</div>}
                    </div>
                  </Link>
                </NavigationMenuLink>
              ))}
            </li>
          ))
        ) : (
          <li>
            {content.links?.map((link, index) => (
              <NavigationMenuLink key={`${link.title}-${index}`} asChild>
                <Link href={link.href}>
                  <div>
                    <div className="font-medium">{link.title}</div>
                    {link.description && <div className="text-muted-foreground text-sm">{link.description}</div>}
                  </div>
                </Link>
              </NavigationMenuLink>
            ))}
          </li>
        )}
      </ul>
    )
  }

  return null
}

function ListItem({
  title,
  children,
  href,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"li"> & {
  href: string
  title: string
  children?: React.ReactNode
}) {
  return (
    <li {...props}>
      <NavigationMenuLink asChild>
        <Link
          href={href}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className,
          )}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
          {children && <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">{children}</p>}
        </Link>
      </NavigationMenuLink>
    </li>
  )
}
