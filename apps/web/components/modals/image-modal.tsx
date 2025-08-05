'use client';

import { Dialog, DialogContent } from '@lorrigo/ui/components';
import Image from 'next/image';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  modalId: string;
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

export function ImageModal({ isOpen, onClose, src, alt, width = 800, height = 600 }: ImageModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-[80vw]">
        <div className="relative h-full max-h-[80vh] w-full">
          <Image src={src || '/placeholder.svg'} alt={alt} width={width} height={height} className="h-full w-full object-contain" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
