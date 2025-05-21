"use client"

import { useModal } from "@/modal/modal-provider"
import { Button } from "@lorrigo/ui/components"

export default function Home() {
  const { openModal, closeAllModals } = useModal()

  const handleOpenConfirmModal = () => {
    openModal("confirm", {
      title: "Confirm Action",
      description: "Are you sure you want to perform this action?",
      onConfirm: () => console.log("Confirmed!"),
    })
  }

  const handleOpenFormModal = () => {
    openModal("form", {
      title: "User Information",
      description: "Please fill out your information",
      fields: [
        { name: "name", label: "Name", required: true },
        { name: "email", label: "Email", type: "email", required: true },
      ],
      onSubmit: (data) => console.log("Form submitted:", data),
    })
  }

  const handleOpenMobileDrawer = () => {
    openModal("form", {
      title: "Mobile Drawer Example",
      description: "This will appear as a drawer on mobile devices",
      fields: [{ name: "feedback", label: "Feedback", required: true }],
      onSubmit: (data) => console.log("Feedback submitted:", data),
    })
  }

  const handleOpenDesktopOnly = () => {
    openModal("confirm", {
      title: "Desktop Only Modal",
      description: "This modal will always appear as a dialog, even on mobile devices",
      onConfirm: () => console.log("Desktop action confirmed!"),
      desktopOnly: true,
    })
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 gap-4">
      <h1 className="text-3xl font-bold mb-8">Enhanced Modal System</h1>

      <div className="flex flex-col gap-4 w-full max-w-md">
        <Button onClick={handleOpenConfirmModal}>Open Confirm Modal</Button>
        <Button onClick={handleOpenFormModal}>Open Form Modal</Button>
        <Button onClick={handleOpenMobileDrawer}>Open Mobile Drawer</Button>
        <Button onClick={handleOpenDesktopOnly}>Open Desktop-Only Modal</Button>
        <Button variant="destructive" onClick={closeAllModals}>
          Close All Modals
        </Button>
      </div>
    </main>
  )
}
