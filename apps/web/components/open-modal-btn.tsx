'use client';
import { ModalType, useModal } from '@/modal/modal-provider';
import { Button } from '@lorrigo/ui/components';
import { ReactElement } from 'react';

export default function OpenModalBtn({
  modalType,
  children,
  className,
  icon: Icon,
  ...props
}: {
  modalType: ModalType;
  children: React.ReactNode;
  className?: string;
  icon: ReactElement<any, any>;
}) {
  const { openModal } = useModal();

  const handleOpenFormModal = () => {
    openModal(modalType, {
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
    <Button variant="outline" size="sm" className="gap-2" onClick={handleOpenFormModal} {...props}>
      {Icon}
      <span>{children}</span>
    </Button>
  );
}
