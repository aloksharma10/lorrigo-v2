"use client"

import { ChartAreaInteractive } from "./components/chart-area-interactive"
// import { DataTable } from "@/app/(examples)/dashboard/components/data-table"
import { SectionCards } from "./components/section-cards"
import { useModal } from '@/modal/modal-provider';
import { Button } from '@lorrigo/ui/components';
// import data from "@/app/(examples)/dashboard/data.json"


export default function Dashboard() {
  // const session = await getServerSession();

  // if (!session) {
  //   redirect('/auth/signin');
  // }

  const { openModal, closeAllModals } = useModal()

  const handleOpenConfirmModal = () => {
    openModal("confirm", {
      title: "Confirm Action",
      description: "Are you sure you want to perform this action?",
      onConfirm: () => console.log("Confirmed!"),
    })
  }

  return (
    <>
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <SectionCards />
          <div className="px-4 lg:px-6">
            <ChartAreaInteractive />
          </div>
          <Button onClick={handleOpenConfirmModal}>Open Confirm Modal</Button>
          {/* <DataTable data={data} /> */}
        </div>
      </div>
    </>
  );
}
