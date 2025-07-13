import type React from 'react';
import { create } from 'zustand';

export type ModalType =
  | 'confirm'
  | 'image'
  | 'seller:new-order'
  | 'seller:add-pickup-location'
  | 'assign-plan'
  | 'create-courier'
  | 'create-channel'
  | 'cancel-shipment'
  | 'pickup-schedule'
  | 'recharge-wallet'
  | 'ndr-action'
  | 'bulk-upload-status'
  | 'bulk-orders-operations'
  | 'billing-cycle'
  | 'weight-dispute-csv'
  | 'dispute-actions-csv'
  | 'manual-billing';

// Modal props interface
export interface ModalProps {
  [key: string]: any;
}

// export type ModalType = "wallet" | "addPickupLocation" | "payForInvoice" | "addSeller" | "addCustomer" | "schedulePickup" | "cancelOrder" | "cloneOrder" | "trackModal" | "editOrder" | "downloadLabel" | "downloadManifest" | "ndrOrder" | "ndrRTOrder" | "BulkHubUpload" | "BulkPincodeUpload" | 'downloadLabels'  | "BulkPickupUpdate" | 'cancelBulkOrder' | "downloadManifests" | "updateShopifyOrders" | "ViewUserDocsAdmin" | "ClientBillingUpload" | "adminRemittanceManage" | "cloneB2BOrder" | "editB2BOrder" | "addB2BCustomer" | "completeKyc" | 'alert-kyc' | 'alert-payment' | "downloadB2BLabel" | "downloadB2BManifest" | "BulkShipNow" | "B2BClientBillingUpload" | "B2BShipNow" | "raiseDisputeManage" | "disputeDetails" | "DisputeUpload" | "bulkPickupSchedule" | "sellerRemittanceConfig";

interface ModalData {}
type ModalComponent = React.ComponentType<any>;

// Modal animation states
export type ModalAnimationState = 'entering' | 'entered' | 'exiting' | 'exited';

// Modal store state interface
interface ModalState {
  modals: Array<{
    id: string;
    type: ModalType;
    props: ModalProps;
    animationState: ModalAnimationState;
  }>;
  modalComponents: Record<ModalType, ModalComponent>;
  registerModal: (type: ModalType, component: ModalComponent) => void;
  openModal: (type: ModalType, props?: ModalProps) => string;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
  setModalAnimationState: (id: string, state: ModalAnimationState) => void;
}

// Animation timing in ms
const ANIMATION_DURATION = 300;

// Create and export Zustand store
export const useModalStore = create<ModalState>((set, get) => ({
  modals: [],
  modalComponents: {
    confirm: undefined as unknown as ModalComponent,
    image: undefined as unknown as ModalComponent,
    'seller:new-order': undefined as unknown as ModalComponent,
    'seller:add-pickup-location': undefined as unknown as ModalComponent,
    'assign-plan': undefined as unknown as ModalComponent,
    'create-courier': undefined as unknown as ModalComponent,
    'create-channel': undefined as unknown as ModalComponent,
    'cancel-shipment': undefined as unknown as ModalComponent,
    'pickup-schedule': undefined as unknown as ModalComponent,
    'recharge-wallet': undefined as unknown as ModalComponent,
    'ndr-action': undefined as unknown as ModalComponent,
    'bulk-upload-status': undefined as unknown as ModalComponent,
    'bulk-orders-operations': undefined as unknown as ModalComponent,
    'billing-cycle': undefined as unknown as ModalComponent,
    'weight-dispute-csv': undefined as unknown as ModalComponent,
    'dispute-actions-csv': undefined as unknown as ModalComponent,
    'manual-billing': undefined as unknown as ModalComponent,
  },
  registerModal: (type, component) =>
    set((state) => ({
      modalComponents: { ...state.modalComponents, [type]: component },
    })),
  openModal: (type, props = {}) => {
    const id = `${type}-${Date.now()}`;
    set((state) => ({
      modals: [...state.modals, { id, type, props, animationState: 'entering' }],
    }));

    // Set animation state to "entered" after animation completes
    setTimeout(() => {
      get().setModalAnimationState(id, 'entered');
    }, ANIMATION_DURATION);

    return id;
  },
  closeModal: (id) => {
    // First set animation state to "exiting"
    get().setModalAnimationState(id, 'exiting');

    // Then remove modal after animation completes
    setTimeout(() => {
      set((state) => ({
        modals: state.modals.filter((modal) => modal.id !== id),
      }));
    }, ANIMATION_DURATION);
  },
  closeAllModals: () => {
    // Get all modal IDs
    const modalIds = get().modals.map((modal) => modal.id);

    // Set all modals to exiting state
    modalIds.forEach((id) => get().setModalAnimationState(id, 'exiting'));

    // Remove all modals after animation completes
    setTimeout(() => {
      set({ modals: [] });
    }, ANIMATION_DURATION);
  },
  setModalAnimationState: (id, animationState) =>
    set((state) => ({
      modals: state.modals.map((modal) => (modal.id === id ? { ...modal, animationState } : modal)),
    })),
}));
