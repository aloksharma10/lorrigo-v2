'use client';

import { useEffect } from 'react';
import { create } from 'zustand';

// Import your modal components
import { ConfirmModal } from '@/components/modals/confirm-modal';
import { ImageModal } from '@/components/modals/image-modal';
import { useModalStore } from './modal-store';
import { AddPickupLocationModal } from '@/components/modals/add-pickup-location';
import { AssignPlanModal } from '@/components/modals/assign-plan-modal';
import { CreateCourierModal } from '@/components/modals/create-courier-modal';
import { CreateChannelModal } from '@/components/modals/create-channel-modal';
import { CancelShipmentModal } from '@/components/modals/cancel-shipment-modal';
import { PickupScheduleModal } from '@/components/modals/pickup-schedule-modal';
import { RechargeWalletModal } from '@/components/modals/recharge-wallet-modal';
import { NDRActionModal } from '@/components/modals/ndr-action-modal';
import { BulkOrdersOperationsModal } from '@/components/modals/bulk-operations-modal';
import { BillingCycleModal } from '@/components/modals/billing-cycle-modal';
import { WeightDisputeCSVModal } from '@/components/modals/weight-dispute-csv-modal';
import { DisputeActionsCSVModal } from '@/components/modals/dispute-actions-csv-modal';
import { ManualBillingModal } from '@/components/modals/manual-billing-modal';
import { RemittanceDetailModal } from '@/components/modals/remittance-detail-modal';

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
      registerModal('assign-plan', AssignPlanModal);
      registerModal('create-courier', CreateCourierModal);
      registerModal('create-channel', CreateChannelModal);
      registerModal('cancel-shipment', CancelShipmentModal);
      registerModal('pickup-schedule', PickupScheduleModal);
      registerModal('recharge-wallet', RechargeWalletModal);
      registerModal('ndr-action', NDRActionModal);
      registerModal('bulk-orders-operations', BulkOrdersOperationsModal);
      registerModal('billing-cycle', BillingCycleModal);
      registerModal('weight-dispute-csv', WeightDisputeCSVModal);
      registerModal('dispute-actions-csv', DisputeActionsCSVModal);
      registerModal('manual-billing', ManualBillingModal);
      registerModal('remittance-detail', RemittanceDetailModal);

      setRegistered(true);
      console.log('Modal components registered successfully');
    }
  }, [isRegistered, registerModal, setRegistered]);

  return null;
}
