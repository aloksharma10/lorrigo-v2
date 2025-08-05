import type { NavigationConfig } from '@/lib/type/public-navigation';

export const navigationConfig: NavigationConfig = {
  brand: {
    logo: '/lorrigo-logo.png',
    title: 'Lorrigo Logistics',
    description: 'One Platform, All Carriers',
    href: '/',
  },
  items: [
    {
      title: 'Home',
      type: 'mega',
      content: {
        links: [
          {
            title: 'Introduction',
            href: '/docs',
            description: 'Re-usable components built using Radix UI and Tailwind CSS.',
          },
          {
            title: 'Installation',
            href: '/docs/installation',
            description: 'How to install dependencies and structure your app.',
          },
          {
            title: 'Typography',
            href: '/docs/primitives/typography',
            description: 'Styles for headings, paragraphs, lists...etc',
          },
        ],
      },
    },
    {
      title: 'Components',
      type: 'dropdown',
      content: {
        links: [
          {
            title: 'Alert Dialog',
            href: '/docs/primitives/alert-dialog',
            description: 'A modal dialog that interrupts the user with important content and expects a response.',
          },
          {
            title: 'Hover Card',
            href: '/docs/primitives/hover-card',
            description: 'For sighted users to preview content available behind a link.',
          },
          {
            title: 'Progress',
            href: '/docs/primitives/progress',
            description: 'Displays an indicator showing the completion progress of a task, typically displayed as a progress bar.',
          },
          {
            title: 'Scroll-area',
            href: '/docs/primitives/scroll-area',
            description: 'Visually or semantically separates content.',
          },
          {
            title: 'Tabs',
            href: '/docs/primitives/tabs',
            description: 'A set of layered sections of content—known as tab panels—that are displayed one at a time.',
          },
          {
            title: 'Tooltip',
            href: '/docs/primitives/tooltip',
            description: 'A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it.',
          },
        ],
      },
    },
    {
      title: 'Docs',
      type: 'link',
      href: '/docs',
    },
    {
      title: 'List',
      type: 'dropdown',
      content: {
        links: [
          {
            title: 'Components',
            href: '/components',
            description: 'Browse all components in the library.',
          },
          {
            title: 'Documentation',
            href: '/documentation',
            description: 'Learn how to use the library.',
          },
          {
            title: 'Blog',
            href: '/blog',
            description: 'Read our latest blog posts.',
          },
        ],
      },
    },
    {
      title: 'Simple',
      type: 'dropdown',
      content: {
        links: [
          { title: 'Components', href: '/components' },
          { title: 'Documentation', href: '/docs' },
          { title: 'Blocks', href: '/blocks' },
        ],
      },
    },
  ],
};
