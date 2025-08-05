import ShipmentAndDeliveryPolicy from '@/components/policies/shipment-delivery';

export default function ShipmentAndDeliveryPolicyPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 id="shipment-and-delivery" className="mb-4 text-3xl font-bold">
        <span>Shipment & Delivery Policy</span>
      </h1>
      <ShipmentAndDeliveryPolicy />
    </div>
  );
}
