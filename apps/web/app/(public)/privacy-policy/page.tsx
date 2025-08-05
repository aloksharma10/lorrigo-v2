import PrivacyPolicy from '@/components/policies/privacy';

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 id="privacy-policy" className="mb-4 text-3xl font-bold">
        <span>Privacy Policy</span>
      </h1>
      <PrivacyPolicy />
    </div>
  );
}
