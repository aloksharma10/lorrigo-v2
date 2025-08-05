'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useDrawerStore } from '@/drawer/drawer-store';
import { DrawerProps, DrawerType } from '@/drawer/drawer-store';
import { DrawerSize, DrawerSide } from '@lorrigo/ui/components';

// Create context for drawer provider
const DrawerContext = createContext<{
  openDrawer: (type: DrawerType, props?: DrawerProps) => string;
  closeDrawer: (id: string) => void;
  closeAllDrawers: () => void;
} | null>(null);

export const useDrawer = () => {
  const context = useContext(DrawerContext);
  if (!context) {
    throw new Error('useDrawer must be used within a DrawerProvider');
  }
  return context;
};

export default function DrawerProvider({ children }: { children: React.ReactNode }) {
  // Use the store directly
  const drawers = useDrawerStore((state) => state.drawers);
  const drawerComponents = useDrawerStore((state) => state.drawerComponents);
  const openDrawer = useDrawerStore((state) => state.openDrawer);
  const closeDrawer = useDrawerStore((state) => state.closeDrawer);
  const closeAllDrawers = useDrawerStore((state) => state.closeAllDrawers);

  // Track which drawers are visible with local state
  const [visibleDrawers, setVisibleDrawers] = useState<Record<string, boolean>>({});

  // Update visible drawers when drawers change
  useEffect(() => {
    const newVisibleDrawers: Record<string, boolean> = {};

    drawers.forEach((drawer) => {
      // A drawer is visible if it's in entering or entered state
      newVisibleDrawers[drawer.id] = drawer.animationState === 'entering' || drawer.animationState === 'entered';
    });

    setVisibleDrawers(newVisibleDrawers);
  }, [drawers]);

  return (
    <DrawerContext.Provider value={{ openDrawer, closeDrawer, closeAllDrawers }}>
      {children}
      {drawers.map(({ id, type, props, animationState }) => {
        const DrawerComp = drawerComponents[type];
        if (!DrawerComp) {
          console.warn(`No drawer component registered for type: ${type}`);
          return null;
        }

        // Only render if the drawer is not in "exited" state
        if (animationState === 'exited') return null;

        // Extract size and side from props if available
        const { size = 'default', side = 'right', ...restProps } = props;

        return (
          <DrawerComp
            key={id}
            {...restProps}
            size={size as DrawerSize}
            side={side as DrawerSide}
            isOpen={visibleDrawers[id]}
            onClose={() => closeDrawer(id)}
            drawerId={id}
          />
        );
      })}
    </DrawerContext.Provider>
  );
}
