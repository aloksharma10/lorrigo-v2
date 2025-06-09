'use client';

import { OrdersSkeleton } from '@/components/skeletons/orders-skeleton';

export default function Loading() {
  return (
    <div className="container mx-auto p-6">
      <OrdersSkeleton />
    </div>
  );
}
