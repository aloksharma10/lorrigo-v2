import TermsAndConditions from '@/components/policies/terms-conditions';

export default function TermsAndConditionsPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 id="terms-and-conditions" className="mb-4 text-3xl font-bold">
        <span>Terms & Conditions</span>
      </h1>
      <TermsAndConditions />
    </div>
  );
}
