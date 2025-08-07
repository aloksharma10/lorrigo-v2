'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import {
  DialogFooter,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Button,
  toast,
  Checkbox,
  LoadingInput,
} from '@lorrigo/ui/components';

import { useModalStore } from '@/modal/modal-store';
import { pickupAddressRegistrationSchema } from '@lorrigo/utils';
import useFetchCityState from '@/lib/hooks/use-fetch-city-state';
import { Loader2, X } from 'lucide-react';
import { useHubOperations } from '@/lib/apis/hub';

export const SellerSettingsModal = () => {
  const router = useRouter();
  const { modals, closeModal, openModal } = useModalStore();
  const modal_props = modals.filter((modal) => modal.type === 'seller-settings')[0];
  const modal_id = modal_props!.id;
 

  const handleClose = () => {
    closeModal(modal_id);
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-6 py-4">
        <h2 className="text-xl font-semibold">Seller Settings</h2>
        <button onClick={handleClose} className="rounded-full p-1 hover:bg-neutral-100 ">
          <X className="h-5 w-5 text-neutral-500" />
        </button>
      </div>

      <Button onClick={() => openModal('seller-settings', { className: "max-w-screen-2xl p-4"})}>
        Open nested drawer
      </Button>
      
    </div>
  );
};
