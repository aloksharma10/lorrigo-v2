'use client';

import { useEffect } from 'react';
import { create } from 'zustand';
import { useDrawerStore } from './drawer-store';

// Import your drawer components
import CloneOrder from '@/components/drawer/clone-order';
import EditOrder from '@/components/drawer/edit-order';
// Import other drawer components as needed

// Store to track registered drawers
interface DrawerRegistryState {
  isRegistered: boolean;
  setRegistered: (value: boolean) => void;
}

const useDrawerRegistryStore = create<DrawerRegistryState>((set) => ({
  isRegistered: false,
  setRegistered: (value) => set({ isRegistered: value }),
}));

export function DrawerRegistry() {
  // Use the store directly
  const registerDrawer = useDrawerStore((state) => state.registerDrawer);
  const { isRegistered, setRegistered } = useDrawerRegistryStore();

  useEffect(() => {
    if (!isRegistered) {
      // Register all your drawer components here
      registerDrawer('clone-order', CloneOrder);
      registerDrawer('edit-order', EditOrder);
      // Register other drawer components as needed

      setRegistered(true);
      console.log('Drawer components registered successfully');
    }
  }, [isRegistered, registerDrawer, setRegistered]);

  return null;
}
