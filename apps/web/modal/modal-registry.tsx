"use client"

import { useEffect } from "react"
import { create } from "zustand"

// Import your modal components
import { ConfirmModal } from "@/components/modals/confirm-modal"
import { FormModal } from "@/components/modals/form-modal"
import { ImageModal } from "@/components/modals/image-modal"
import { useModalStore } from "./modal-store"

// Store to track registered modals
interface ModalRegistryState {
  isRegistered: boolean
  setRegistered: (value: boolean) => void
}

const useModalRegistryStore = create<ModalRegistryState>((set) => ({
  isRegistered: false,
  setRegistered: (value) => set({ isRegistered: value }),
}))

export function ModalRegistry() {
  // Use the store directly instead of getState()
  const registerModal = useModalStore((state) => state.registerModal)
  const { isRegistered, setRegistered } = useModalRegistryStore()

  useEffect(() => {
    if (!isRegistered) {
      // Register all your modal components here
      registerModal("confirm", ConfirmModal)
      registerModal("form", FormModal)
      registerModal("image", ImageModal)

      setRegistered(true)
      console.log("Modal components registered successfully")
    }
  }, [isRegistered, registerModal, setRegistered])

  return null
}
