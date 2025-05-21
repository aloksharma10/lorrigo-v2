import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';

import { ChartAreaInteractive } from "./components/chart-area-interactive"
// import { DataTable } from "@/app/(examples)/dashboard/components/data-table"
import { SectionCards } from "./components/section-cards"
// import data from "@/app/(examples)/dashboard/data.json"


export default async function Dashboard() {
  const session = await getServerSession();

  if (!session) {
    redirect('/auth/signin');
  }

  return (
    <>
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <SectionCards />
          <div className="px-4 lg:px-6">
            <ChartAreaInteractive />
          </div>
          {/* <DataTable data={data} /> */}
        </div>
      </div>
    </>
  );
}
