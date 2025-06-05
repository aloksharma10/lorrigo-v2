import ShippingChargesTab from "@/components/tables/billing/shipping-charges-tab";

interface PageProps {
   params: Promise<{
      tab: string;
   }>;
   searchParams: Promise<{
      page?: string;
      pageSize?: string;
      sort?: string;
      filters?: string;
      search?: string;
      dateFrom?: string;
      dateTo?: string;
   }>;
}

// Force dynamic rendering with no caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ShippingChargesPage({ searchParams }: PageProps) {
   const queryParams = await searchParams;

   const { page = '0', pageSize = '15', sort, filters, search, dateFrom, dateTo } = queryParams;

   // Parse parameters
   const parsedParams = {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      sort: sort ? JSON.parse(sort) : [],
      filters: filters ? JSON.parse(filters) : [],
      globalFilter: search || '',
      dateRange:
         dateFrom && dateTo
            ? {
               from: new Date(dateFrom),
               to: new Date(dateTo),
            }
            : {
               from: new Date(new Date().setDate(new Date().getDate() - 30)),
               to: new Date(),
            },
      //  status: "",
   };

   return (
      <div className="px-4 space-y-4 pt-4">
         <ShippingChargesTab initialParams={parsedParams} />
      </div>
   );
}
