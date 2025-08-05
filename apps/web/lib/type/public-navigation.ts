import type React from 'react';
export interface NavigationItem {
  title: string;
  href?: string;
  type: 'link' | 'dropdown' | 'mega';
  content?: NavigationContent;
}

export interface NavigationContent {
  featured?: {
    title: string;
    description: string;
    href: string;
  };
  links?: Array<{
    title: string;
    href: string;
    description?: string;
  }>;
  sections?: Array<{
    title: string;
    links: Array<{
      title: string;
      href: string;
      description?: string;
      icon?: any;
    }>;
  }>;
}

export interface NavigationConfig {
  items: NavigationItem[];
  brand?: {
    title: string;
    description: string;
    href: string;
    logo: string;
  };
  className?: string;
  viewport?: boolean;
}
