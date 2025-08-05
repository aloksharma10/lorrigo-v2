import { useUserBankAccounts, useVerifyBankAccount } from '@/lib/apis/remittance';
import { Role } from '@lorrigo/db';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  ScrollArea,
  Separator,
} from '@lorrigo/ui/components';
import { useSession } from 'next-auth/react';
import { CopyBtn } from '../copy-btn';
import { useState } from 'react';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { AlertCircleIcon, CheckIcon, Loader2Icon } from 'lucide-react';

export default function ManageBankAccountsModal() {
  const [searchfilter, setSearchFilter] = useState('');
  const session = useSession();
  const isAdmin = session.data?.user?.role === Role.ADMIN;
  const { data: bankAccountsData, isLoading: isBankLoading, refetch: refetchBankAccounts } = useUserBankAccounts({ search: useDebounce(searchfilter, 500) });
  const { data: verifyBankAccountData, mutate: verifyBankAccount, isPending: isVerifyingBankAccount } = useVerifyBankAccount();
  const bankAccounts = bankAccountsData?.data?.bankAccounts || bankAccountsData?.bankAccounts || [];
  const message = bankAccountsData?.data?.message || bankAccountsData?.message || '';

  // const
  return (
    <div className="space-y-2 p-4">
      <h2 className="mb-4 text-lg font-semibold lg:text-xl">Manage Bank Accounts</h2>
      <Input
        type="search"
        isLoading={isBankLoading}
        value={searchfilter}
        onChange={(e) => setSearchFilter(e.target.value)}
        placeholder="Search by name, email, phone, account number, IFSC, or account holder name"
      />
      {message && !isBankLoading && !bankAccounts.length && (
        <Alert variant={'destructive'} className="flex items-center gap-2">
          <AlertTitle>
            <AlertCircleIcon className="h-4 w-4" />
          </AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      <ScrollArea className="h-[500px] space-y-2 overflow-hidden">
        {isBankLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2Icon className="h-4 w-4 animate-spin" />
          </div>
        ) : (
          bankAccounts.map((bankAccount: any) => (
            <Card key={bankAccount.id} className="mt-3">
              {isAdmin && (
                <>
                  <CardHeader>
                    <CardTitle className="justify-betweem flex text-sm">
                      {bankAccount.user.name}
                      <Badge variant={'outline'} className="ml-auto text-xs text-gray-500">
                        {bankAccount.user.role}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="flex items-center justify-between gap-2 text-xs">
                      <span>
                        {bankAccount.user.phone} | {bankAccount.user.email}
                      </span>
                      {/* {bankAccount.is_verified && (
                        <Badge variant={'status_success'} className="ml-auto">
                          Verified
                        </Badge>
                      )} */}
                    </CardDescription>
                  </CardHeader>
                  <Separator orientation="horizontal" />
                </>
              )}
              <CardContent>
                <div className="flex justify-end">
                  <Badge variant={bankAccount.is_verified ? 'status_success' : ('status_warning' as any)} className="ml-auto">
                    {bankAccount.is_verified ? 'Verified' : 'Unverified'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 items-center gap-2 text-base">
                  <div className="font-semibold">Bank Name</div>
                  <CopyBtn tooltipText={'Copy Bank Name'} label={bankAccount.bank_name} text={bankAccount.bank_name} />
                </div>
                <div className="grid grid-cols-2 items-center gap-2 text-base">
                  <span className="font-semibold">Account number</span>
                  <CopyBtn tooltipText={'Copy Account number'} label={bankAccount.account_number} text={bankAccount.account_number} />
                </div>
                <div className="grid grid-cols-2 items-center gap-2 text-base">
                  <span className="font-semibold">IFSC</span>
                  <CopyBtn tooltipText={'Copy IFSC Code'} label={bankAccount.ifsc} text={bankAccount.ifsc} />
                </div>
                <div className="grid grid-cols-2 items-center gap-2 text-base">
                  <span className="font-semibold">Account Holder Name</span>
                  <CopyBtn tooltipText={'Copy Account Holder Name'} label={bankAccount.account_holder} text={bankAccount.account_holder} />
                </div>
                {!bankAccount.is_verified && isAdmin && (
                  <>
                    <Separator orientation="horizontal" className="my-2" />
                    <div className="flex justify-end">
                      <Button
                        className="w-full"
                        disabled={isVerifyingBankAccount || bankAccount.is_verified}
                        isLoading={isVerifyingBankAccount}
                        onClick={() => verifyBankAccount({ bankAccountId: bankAccount.id, is_verified: !bankAccount.is_verified })}
                      >
                        {verifyBankAccountData?.data?.valid ? <CheckIcon className="h-4 w-4" /> : <AlertCircleIcon className="h-4 w-4" />}
                        {bankAccount.is_verified ? 'Unverify' : 'Verify'}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </ScrollArea>
    </div>
  );
}
