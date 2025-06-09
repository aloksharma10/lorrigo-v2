'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import {
  DialogFooter,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Button,
  toast,
  Checkbox,
  LoadingInput,
} from '@lorrigo/ui/components';

import { useModalStore } from '@/modal/modal-store';
import { pickupAddressRegistrationSchema } from '@lorrigo/utils';
import useFetchCityState from '@/lib/hooks/use-fetch-city-state';
import { Loader2, X } from 'lucide-react';
import { useHubOperations } from '@/lib/apis/hub';
import { SubmitBtn } from '@/components/submit-btn';

export const AddPickupLocationModal = () => {
  const router = useRouter();
  const { modals, closeModal } = useModalStore();
  const modal_props = modals.filter((modal) => modal.type === 'seller:add-pickup-location')[0];
  const modal_id = modal_props!.id;
  const {
    createHub: { mutateAsync },
  } = useHubOperations();

  const form = useForm({
    resolver: zodResolver(pickupAddressRegistrationSchema),
    defaultValues: {
      facilityName: '',
      contactPersonName: '',
      phone: '',
      email: '',
      address: '',
      country: 'India',
      pincode: '',
      city: '',
      state: '',
      isRTOAddressSame: true,
      rtoAddress: '',
      rtoCity: '',
      rtoState: '',
      rtoPincode: '',
    },
  });

  const pincode = form.watch('pincode');
  const rtoPincode = form.watch('rtoPincode');
  const {
    cityState: cityStateRes,
    isTyping: isPinloading,
    loading: isPinLoading,
  } = useFetchCityState(pincode);
  const {
    cityState: rtoCityStateRes,
    isTyping: isRTOPinloading,
    loading: isRTOPinLoading,
  } = useFetchCityState(rtoPincode);

  const isFwPincodeLoading = isPinLoading || isPinloading;
  const isRwPincodeLoading = isRTOPinLoading || isRTOPinloading;

  useEffect(() => {
    if (cityStateRes) {
      form.setValue('city', cityStateRes.city);
      form.setValue('state', cityStateRes.state);
    }
    if (rtoCityStateRes) {
      form.setValue('rtoCity', rtoCityStateRes.city);
      form.setValue('rtoState', rtoCityStateRes.state);
    }
  }, [cityStateRes, form, rtoCityStateRes]);

  const isLoading = form.formState.isSubmitting;

  const onSubmit = async (values: z.infer<typeof pickupAddressRegistrationSchema>) => {
    try {
      if (
        !values.isRTOAddressSame &&
        ((values.rtoAddress?.length ?? 0) < 5 || values.rtoPincode?.length !== 6)
      ) {
        toast.error(
          'RTO Address must be at least 5 characters long and RTO Pincode must be 6 characters long.'
        );
        return;
      }

      await mutateAsync({
        facilityName: values.facilityName.trim(),
        email: values.email,
        pincode: values.pincode,
        address: values.address,
        address2: values.address,
        phone: values.phone,
        city: values.city,
        state: values.state,
        country: 'India',
        contactPersonName: values.contactPersonName,
        isRTOAddressSame: values.isRTOAddressSame || false,
        rtoAddress: values.rtoAddress,
        rtoCity: values.rtoCity,
        rtoState: values.rtoState,
        rtoPincode: values.rtoPincode,
      });

      toast.success('Pickup Location added successfully');
      form.reset();
      router.refresh();
      handleClose();
    } catch (error: any) {
      console.error('Error adding pickup location:', error);

      // Extract error message from the error response
      let errorMessage = 'Failed to add pickup location';

      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    }
  };

  const handleClose = () => {
    form.reset();
    closeModal(modal_id);
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-6 py-4">
        <h2 className="text-xl font-semibold">Add Pickup Location</h2>
        <button onClick={handleClose} className="rounded-full p-1 hover:bg-neutral-100">
          <X className="h-5 w-5 text-neutral-500" />
        </button>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <AddPickupLocationForm
            isLoading={isLoading}
            form={form}
            isPinLoading={isFwPincodeLoading}
            isRTOPinLoading={isRwPincodeLoading}
          />
          <DialogFooter className="px-6 py-4">
            <Button
              onClick={() => form.reset()}
              disabled={isLoading}
              variant={'secondary'}
              type="button"
            >
              Reset
            </Button>
            <SubmitBtn isLoading={isLoading} text="Add Pickup Location" />
          </DialogFooter>
        </form>
      </Form>
    </div>
  );
};

export const AddPickupLocationForm = ({
  isLoading,
  form,
  isPinLoading,
  isRTOPinLoading,
}: {
  isRTOPinLoading: boolean;
  isLoading: boolean;
  isPinLoading: boolean;
  form: any;
}) => {
  return (
    <div className="grid grid-cols-2 gap-3 rounded-md px-6 dark:bg-stone-900">
      <FormField
        control={form.control}
        name="facilityName"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs font-bold">Facility Name</FormLabel>
            <FormControl>
              <Input disabled={isLoading} placeholder="Enter the Facility Name" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="contactPersonName"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs font-bold">Contact Person Name</FormLabel>
            <FormControl>
              <Input disabled={isLoading} placeholder="Enter the contact person name" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="phone"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs font-bold">Pickup Location Contact</FormLabel>
            <FormControl>
              {/* <PhoneInput
                                disabled={isLoading}
                                className="bg-zinc-300/10 border-0 dark:bg-zinc-700 dark:text-white focus-visible:ring-0 text-black focus-visible:ring-offset-0"
                                defaultCountry='IN'
                                placeholder='Enter the contact number'
                                {...field}
                                maxLength={10}
                            /> */}
              <Input
                disabled={isLoading}
                maxLength={10}
                placeholder="Enter the contact number"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem className="">
            <FormLabel className="text-xs font-bold">
              <div className="flex items-baseline justify-between">
                Email <span className="ml-1 text-[10px] opacity-60">Optional</span>
              </div>
            </FormLabel>
            <FormControl>
              <Input disabled={isLoading} placeholder="Enter email address" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="address"
        render={({ field }) => (
          <FormItem className="col-span-2">
            <FormLabel className="text-xs font-bold">Address Line</FormLabel>
            <FormControl>
              <Input disabled={isLoading} placeholder="Enter address" {...field} />
            </FormControl>
            <FormDescription className="text-xs">
              This will be used in the invoices that you will print.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="pincode"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs font-bold">Pincode</FormLabel>
            <FormControl>
              <LoadingInput
                isLoading={isPinLoading}
                disabled={isLoading}
                placeholder="Enter the pincode"
                {...field}
                maxLength={6}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="city"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs font-bold">City</FormLabel>
            <FormControl>
              <LoadingInput isLoading={isPinLoading} placeholder="Enter the city" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="state"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs font-bold">State</FormLabel>
            <FormControl>
              <LoadingInput isLoading={isPinLoading} placeholder="Enter the state" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="country"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs font-bold">Country</FormLabel>
            <FormControl>
              <Input disabled={true} placeholder="Enter the country" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="col-span-2 items-center">
        <h3 className="scroll-m-20 text-lg font-semibold tracking-tight">Return Details</h3>
        <FormField
          control={form.control}
          name="isRTOAddressSame"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border-0 p-4">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="leading-none">
                <FormLabel>Return address is the same as Pickup Address.</FormLabel>
              </div>
            </FormItem>
          )}
        />
      </div>
      {!form.watch('isRTOAddressSame') && (
        <>
          <FormField
            control={form.control}
            name="rtoAddress"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel className="text-xs font-bold">Address</FormLabel>
                <FormControl>
                  <Input disabled={isLoading} placeholder="Enter the address" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="rtoPincode"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold">Pincode</FormLabel>
                <FormControl>
                  <Input disabled={isLoading} placeholder="Enter the pincode" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="rtoCity"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold">City</FormLabel>
                <FormControl>
                  <div className="flex items-center rounded-md bg-zinc-300/50 pr-3">
                    <Input
                      disabled={isLoading || isRTOPinLoading}
                      className="border-0 bg-transparent text-black focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-zinc-700 dark:text-white"
                      placeholder="Enter the city"
                      {...field}
                    />
                    {isRTOPinLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="rtoState"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold">State</FormLabel>
                <FormControl>
                  <div className="flex items-center rounded-md bg-zinc-300/50 pr-3">
                    <Input
                      disabled={isLoading || isRTOPinLoading}
                      className="border-0 bg-transparent text-black focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-zinc-700 dark:text-white"
                      placeholder="Enter the state"
                      {...field}
                    />
                    {isRTOPinLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold">Country</FormLabel>
                <FormControl>
                  <Input disabled={true} placeholder="Enter the country" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
    </div>
  );
};
