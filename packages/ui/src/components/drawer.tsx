'use client';

import { cn } from '@lorrigo/ui/lib/utils';
import { ComponentProps } from 'react';
import { ContentProps, Drawer } from 'vaul';

export type DrawerSize =
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | 'full';

export type DrawerSide = 'right' | 'left' | 'top' | 'bottom';

function getDrawerWidth(size: DrawerSize): string {
  switch (size) {
    case 'xs':
      return 'md:w-[300px]';
    case 'sm':
      return 'md:w-[400px]';
    case 'md':
      return 'md:w-[540px]';
    case 'lg': // greater-mid
      return 'md:w-[680px]'; 
    case 'xl':
      return 'md:w-[1080px]';
    case 'full':
      return 'md:w-[90vw]';
    default:
      return 'md:w-[540px]';
  }
}

function getDrawerPosition(side: DrawerSide): string {
  switch (side) {
    case 'left':
      return 'left-2 top-2 bottom-2';
    case 'top':
      return 'top-2 left-2 right-2';
    case 'bottom':
      return 'bottom-2 left-2 right-2';
    case 'right':
    default:
      return 'right-2 top-2 bottom-2';
  }
}

function getDrawerTransform(side: DrawerSide): string {
  switch (side) {
    case 'left':
      return 'calc(-100% - 8px)';
    case 'top':
      return 'calc(-100% - 8px)';
    case 'bottom':
      return 'calc(100% + 8px)';
    case 'right':
    default:
      return 'calc(100% + 8px)';
  }
}

function getDrawerDimension(side: DrawerSide): string {
  switch (side) {
    case 'top':
    case 'bottom':
      return 'h-[calc(100%-16px)] w-full';
    case 'left':
    case 'right':
    default:
      return 'w-[calc(100%-16px)]';
  }
}

function SheetRoot({
  children,
  contentProps,
  nested = false,
  size = 'lg',
  side = 'right',
  ...rest
}: {
  contentProps?: ContentProps;
  nested?: boolean;
  size?: DrawerSize;
  side?: DrawerSide;
} & ComponentProps<typeof Drawer.Root>) {
  const RootComponent = nested ? Drawer.NestedRoot : Drawer.Root;
  return (
    <RootComponent direction={side} handleOnly {...rest}>
      <Drawer.Portal>
        <Drawer.Overlay className="backdrop-blur-xs fixed inset-0 z-50 bg-neutral-50/15 bg-opacity-10" />

        <Drawer.Content
          {...contentProps}
          onPointerDownOutside={(e) => {
            // Don't dismiss when clicking inside a toast
            if (e.target instanceof Element && e.target.closest('[data-sonner-toast]')) e.preventDefault();

            contentProps?.onPointerDownOutside?.(e);
          }}
          className={cn(
            'fixed z-50 flex flex-col',
            'rounded-lg border border-neutral-200 bg-white outline-none dark:border-neutral-800 dark:bg-stone-900',
            getDrawerPosition(side),
            getDrawerDimension(side),
            getDrawerWidth(size),
            contentProps?.className
          )}
          // className={cn(
          //   "fixed z-10 flex outline-none",
          //   getDrawerPosition(side),
          //   getDrawerDimension(side),
          //   getDrawerWidth(size),
          //   contentProps?.className,
          // )}
          style={
            {
              '--initial-transform': getDrawerTransform(side),
              // "user-select": "auto", // Override default user-select: none from Vaul
              ...contentProps?.style,
            } as React.CSSProperties
          }
        >
          <div className="scrollbar-hide flex size-full grow flex-col overflow-y-auto rounded-lg bg-white dark:bg-stone-900">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </RootComponent>
  );
}

function Title({ className, ...rest }: ComponentProps<typeof Drawer.Title>) {
  return <Drawer.Title className={cn('text-xl font-medium text-zinc-900 dark:text-white', className)} {...rest} />;
}

function Description(props: ComponentProps<typeof Drawer.Description>) {
  return <Drawer.Description {...props} />;
}

function Close(props: ComponentProps<typeof Drawer.Close>) {
  return <Drawer.Close {...props} />;
}

export const DrawerComponent = Object.assign(SheetRoot, {
  Title,
  Description,
  Close,
});
