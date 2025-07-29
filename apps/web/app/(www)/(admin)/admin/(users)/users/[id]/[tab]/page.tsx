import { UserProfileForm } from "@/components/settings/user-profile-form";
import { BankAccountsManager } from "@/components/settings/bank-accounts-manager";
import { TransactionHistoryTable } from "@/components/tables/billing/transaction-history-table";
import { WeightDisputesTable } from "@/components/tables/billing/weight-disputes-table";
import { getUserProfileById } from "@/lib/actions/users";

export default async function RemittancePage({ params }: { params: Promise<{ id: string, tab: string }> }) {
  const { id, tab } = await params;

  if (tab === 'transactions') {
    return <TransactionHistoryTable userId={id as string} />
  }

  if (tab === 'disputes') {
    return <WeightDisputesTable userId={id as string} userRole="ADMIN" />
  }

  if (tab === 'profile') {
    try {
      const profile = await getUserProfileById(id as string);
      return <UserProfileForm userId={id as string} profile={profile} />
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return <div className="p-6 text-center text-red-600">Failed to load user profile</div>
    }
  }

  if (tab === 'bank-accounts') {
    return <BankAccountsManager userId={id as string} />
  }

  return <div>Remittance</div>
}