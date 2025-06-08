'use client';

import { useEffect } from 'react';
import { create } from 'zustand';

// Import your modal components
import { ConfirmModal } from '@/components/modals/confirm-modal';
import { ImageModal } from '@/components/modals/image-modal';
import { useModalStore } from './modal-store';
import { AddPickupLocationModal } from '@/components/modals/add-pickup-location';
import { CreatePlanModal } from '@/components/modals/create-plan-modal';
import { AssignPlanModal } from '@/components/modals/assign-plan-modal';
import { CreateCourierModal } from '@/components/modals/create-courier-modal';
import { CreateChannelModal } from '@/components/modals/create-channel-modal';

// Store to track registered modals
interface ModalRegistryState {
  isRegistered: boolean;
  setRegistered: (value: boolean) => void;
}

const useModalRegistryStore = create<ModalRegistryState>((set) => ({
  isRegistered: false,
  setRegistered: (value) => set({ isRegistered: value }),
}));

export function ModalRegistry() {
  // Use the store directly instead of getState()
  const registerModal = useModalStore((state) => state.registerModal);
  const { isRegistered, setRegistered } = useModalRegistryStore();

  useEffect(() => {
    if (!isRegistered) {
      // Register all your modal components here
      registerModal('confirm', ConfirmModal);
      registerModal('image', ImageModal);
      registerModal('seller:add-pickup-location', AddPickupLocationModal);
      registerModal('create-plan', CreatePlanModal);
      registerModal('assign-plan', AssignPlanModal);
      registerModal('create-courier', CreateCourierModal);
      registerModal('create-channel', CreateChannelModal);

      setRegistered(true);
      console.log('Modal components registered successfully');
    }
  }, [isRegistered, registerModal, setRegistered]);

  return null;
}
