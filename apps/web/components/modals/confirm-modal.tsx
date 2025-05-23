'use client';

import { useModal } from '@/modal/modal-provider';
import { Button } from '@lorrigo/ui/components';
import { X } from 'lucide-react';

interface ConfirmModalProps {
  title: string;
  description: string;
  onConfirm: () => void;
  onClose: () => void;
  confirmText?: string;
  cancelText?: string;
  modalId?: string;
}

export function ConfirmModal({
  title,
  description,
  onConfirm,
  onClose,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
}: ConfirmModalProps) {
  const { openModal, closeAllModals } = useModal();

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleOpenFormModal = () => {
    openModal('seller:new-order', {
      title: 'User Information',
      description: 'Please fill out your information',
      fields: [
        { name: 'name', label: 'Name', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
      ],
      onSubmit: (data: any) => console.log('Form submitted:', data),
    });
  };

  return (
    <div className="flex flex-col p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        <button onClick={onClose} className="rounded-full p-1 hover:bg-neutral-100">
          <X className="h-5 w-5 text-neutral-500" />
        </button>
      </div>

      <p className="mt-2 text-neutral-600">{description}</p>

      <div className="mt-6 flex justify-end space-x-2">
        <Button variant="outline" onClick={onClose}>
          {cancelText}
        </Button>
        <Button onClick={handleConfirm}>{confirmText}</Button>
        <Button onClick={handleOpenFormModal}>Open Form Modal</Button>
      </div>
    </div>
  );
}
