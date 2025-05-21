"use client"

import { Dialog, DialogContent } from "@lorrigo/ui/components"
import Image from "next/image"

interface ImageModalProps {
  isOpen: boolean
  onClose: () => void
  modalId: string
  src: string
  alt: string
  width?: number
  height?: number
}

export function ImageModal({ isOpen, onClose, src, alt, width = 800, height = 600 }: ImageModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[80vw] p-0 overflow-hidden">
        <div className="relative w-full h-full max-h-[80vh]">
          <Image
            src={src || "/placeholder.svg"}
            alt={alt}
            width={width}
            height={height}
            className="object-contain w-full h-full"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
