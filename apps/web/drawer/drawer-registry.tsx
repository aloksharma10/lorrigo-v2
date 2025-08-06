'use client';

import { useEffect } from 'react';
import { create } from 'zustand';
import { useDrawerStore } from './drawer-store';
import CloneOrder from '@/components/drawer/clone-order';
import EditOrder from '@/components/drawer/edit-order';
import RaiseDispute from '@/components/drawer/raise-dispute';
import CourierRates from '@/components/drawer/courier-rates';

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
      registerDrawer('raise-dispute', RaiseDispute);
      registerDrawer('courier-rates', CourierRates);
      // Register other drawer components as needed

      setRegistered(true);
    }
  }, [isRegistered, registerDrawer, setRegistered]);

  return null;
}
