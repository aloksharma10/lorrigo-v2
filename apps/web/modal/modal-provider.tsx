"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useModalStore } from "./modal-store"
import { Modal } from "@lorrigo/ui/components"

// Define types for our modal system
type ModalType = string
type ModalProps = Record<string, unknown>

// Create context for modal provider
const ModalContext = createContext<{
  openModal: (type: ModalType, props?: ModalProps) => string
  closeModal: (id: string) => void
  closeAllModals: () => void
} | null>(null)

export const useModal = () => {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider")
  }
  return context
}

export function ModalProvider({ children }: { children: React.ReactNode }) {
  // Use the store directly
  const modals = useModalStore((state) => state.modals)
  const modalComponents = useModalStore((state) => state.modalComponents)
  const openModal = useModalStore((state) => state.openModal)
  const closeModal = useModalStore((state) => state.closeModal)
  const closeAllModals = useModalStore((state) => state.closeAllModals)

  // Track which modals are visible with local state
  const [visibleModals, setVisibleModals] = useState<Record<string, boolean>>({})

  // Update visible modals when modals change
  useEffect(() => {
    const newVisibleModals: Record<string, boolean> = {}

    modals.forEach((modal) => {
      // A modal is visible if it's in entering or entered state
      newVisibleModals[modal.id] = modal.animationState === "entering" || modal.animationState === "entered"
    })

    setVisibleModals(newVisibleModals)
  }, [modals])

  return (
    <ModalContext.Provider value={{ openModal, closeModal, closeAllModals }}>
      {children}
      {modals.map(({ id, type, props, animationState }) => {
        const ModalComponent = modalComponents[type]
        if (!ModalComponent) {
          console.warn(`No modal component registered for type: ${type}`)
          return null
        }

        // Only render if the modal is not in "exited" state
        if (animationState === "exited") return null

        return (
          <Modal
            key={id}
            showModal={visibleModals[id]}
            setShowModal={(isOpen) => {
              if (!isOpen) closeModal(id)
            }}
            onClose={() => closeModal(id)}
            className={props.className as string}
            desktopOnly={props.desktopOnly as boolean}
            preventDefaultClose={props.preventDefaultClose as boolean}
          >
            <ModalComponent {...props} modalId={id} onClose={() => closeModal(id)} />
          </Modal>
        )
      })}
    </ModalContext.Provider>
  )
}
