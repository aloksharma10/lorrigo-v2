import RefundPolicy from '@/components/policies/refund';

export default function RefundPolicyPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 id="refund-policy" className="mb-4 text-3xl font-bold">
        <span>Refund Policy</span>
      </h1>
      <RefundPolicy />
    </div>
  );
}
