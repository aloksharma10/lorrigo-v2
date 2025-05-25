"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
} from "@lorrigo/ui/components";

import { useRouter } from "next/navigation";
import { useEffect } from 'react';
import { useModalStore } from '@/modal/modal-store';
import { pickupAddressRegistrationSchema } from '@lorrigo/utils/validations';
import useFetchCityState from '@/lib/hooks/use-fetch-city-state';
import { Loader2, X } from 'lucide-react';

export const AddPickupLocationModal = () => {
    const router = useRouter();
    const { modals, closeModal } = useModalStore();
    const modal_props = modals.filter((modal) => modal.type === 'seller:add-pickup-location')[0]
    const modal_id = modal_props!.id

    const form = useForm({
        resolver: zodResolver(pickupAddressRegistrationSchema),
        defaultValues: {
            facilityName: "",
            contactPersonName: "",
            phone: "",
            email: "",
            address: "",
            country: "India",
            pincode: "",
            city: "",
            state: "",
            isRTOAddressSame: true,
            rtoAddress: "",
            rtoCity: "",
            rtoState: "",
            rtoPincode: "",
        }
    });


    const { cityState: cityStateRes, isTyping: isPinloading } = useFetchCityState(form.watch("pincode"));
    const { cityState: rtoCityStateRes, isTyping: isRTOPinloading } = useFetchCityState(form.watch("rtoPincode"));

    useEffect(() => {
        if (cityStateRes) {
            form.setValue('city', cityStateRes.city)
            form.setValue('state', cityStateRes.state)
        }
        if (rtoCityStateRes) {
            form.setValue('rtoCity', rtoCityStateRes.city)
            form.setValue('rtoState', rtoCityStateRes.state)
        }
    }, [cityStateRes, form, rtoCityStateRes])

    const isLoading = form.formState.isSubmitting;

    const onSubmit = async (values: z.infer<typeof pickupAddressRegistrationSchema>) => {
        try {

            if (!values.isRTOAddressSame && ((values.rtoAddress?.length ?? 0) < 5 || (values.rtoPincode?.length !== 6))) {
                toast.error("RTO Address must be at least 5 characters long and RTO Pincode must be 6 characters long.");
                return;
            }

            // await handleCreateHub({
            //     name: values.facilityName,
            //     email: values.email,
            //     pincode: values.pincode,
            //     address1: values.address,
            //     address2: values.address,
            //     phone: values.phone,
            //     city: values.city,
            //     state: values.state,
            //     contactPersonName: values.contactPersonName,
            //     isRTOAddressSame: values.isRTOAddressSame || false,
            //     rtoAddress: values.rtoAddress,
            //     rtoCity: values.rtoCity,
            //     rtoState: values.rtoState,
            //     rtoPincode: values.rtoPincode,
            // });

            // cityState({ city: "", state: "" })
            // rtoCityState({ city: "", state: "" })


            form.reset();
            router.refresh();
            // onClose();
        } catch (error) {
            console.error(error);
        }
    }

    const handleClose = () => {
        form.reset();
        closeModal(modal_id);
    }

    return (
        <div className="flex flex-col">
            <div className="px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Add Pickup Location</h2>
                <button onClick={handleClose} className="rounded-full p-1 hover:bg-neutral-100">
                    <X className="h-5 w-5 text-neutral-500" />
                </button>
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <AddPickupLocationForm isLoading={isLoading} form={form} isPinLoading={isPinloading} isRTOPinLoading={isRTOPinloading} />
                    <DialogFooter className="px-6 py-4">
                        <Button onClick={() => form.reset()} disabled={isLoading} variant={'secondary'} type='button'>
                            Reset
                        </Button>
                        <Button disabled={isLoading} variant={'default'} type='submit'>
                            Add Pickup Location
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </div>
    )
};

export const AddPickupLocationForm = ({ isLoading, form, isPinLoading, isRTOPinLoading }: { isRTOPinLoading: boolean, isLoading: boolean, isPinLoading: boolean, form: any }) => {
    return (
        <div className="grid grid-cols-2 px-6 gap-3 dark:bg-stone-900 rounded-md">
            <FormField
                control={form.control}
                name="facilityName"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-xs font-bold">
                            Facility Name
                        </FormLabel>
                        <FormControl>
                            <Input
                                disabled={isLoading}
                                placeholder="Enter the Facility Name"
                                {...field}
                            />
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
                        <FormLabel className="text-xs font-bold">
                            Contact Person Name
                        </FormLabel>
                        <FormControl>
                            <Input
                                disabled={isLoading}
                                placeholder="Enter the contact person name"
                                {...field}
                            />
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
                        <FormLabel className="text-xs font-bold">
                            Pickup Location Contact
                        </FormLabel>
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
                                placeholder='Enter the contact number'
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
                    <FormItem className=''>
                        <FormLabel className="text-xs font-bold">
                            <div className='flex justify-between items-baseline'>Email <span className='ml-1 text-[10px] opacity-60'>Optional</span></div>
                        </FormLabel>
                        <FormControl>
                            <Input
                                disabled={isLoading}
                                placeholder="Enter email address"
                                {...field}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                    <FormItem className='col-span-2'>
                        <FormLabel className="text-xs font-bold">
                            Address Line
                        </FormLabel>
                        <FormControl>
                            <Input
                                disabled={isLoading}
                                placeholder="Enter address"
                                {...field}
                            />
                        </FormControl>
                        <FormDescription className='text-xs'>This will be used in the invoices that you will print.</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="pincode"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-xs font-bold">
                            Pincode
                        </FormLabel>
                        <FormControl>
                            <Input
                                disabled={isLoading}
                                placeholder="Enter the pincode"
                                {...field}
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
                        <FormLabel className="text-xs font-bold">
                            City
                        </FormLabel>
                        <FormControl>
                            <div className='flex items-center bg-zinc-300/50 rounded-md pr-3'>
                                <Input
                                    disabled={isLoading || isPinLoading}
                                    className="bg-transparent border-0 dark:bg-zinc-700 dark:text-white focus-visible:ring-0 text-black focus-visible:ring-offset-0"
                                    placeholder="Enter the city"
                                    {...field}
                                />
                                {isPinLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            </div>
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
                        <FormLabel className="text-xs font-bold">
                            State
                        </FormLabel>
                        <FormControl>
                            <div className='flex items-center bg-zinc-300/50 rounded-md pr-3'>
                                <Input
                                    disabled={isLoading || isPinLoading}
                                    className="bg-transparent border-0 dark:bg-zinc-700 dark:text-white focus-visible:ring-0 text-black focus-visible:ring-offset-0"
                                    placeholder="Enter the state"
                                    {...field}
                                />
                                {isPinLoading && <Loader2 className="w-4 h-4 animate-spin" />}
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
                        <FormLabel className="text-xs font-bold">
                            Country
                        </FormLabel>
                        <FormControl>
                            <Input
                                disabled={true}
                                placeholder="Enter the country"
                                {...field}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <div className='col-span-2 items-center'>
                <h3 className="scroll-m-20 text-lg font-semibold tracking-tight">
                    Return Details
                </h3>
                <FormField
                    control={form.control}
                    name="isRTOAddressSame"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border-0 p-4">
                            <FormControl>
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <div className="leading-none">
                                <FormLabel>
                                    Return address is the same as Pickup Address.
                                </FormLabel>
                            </div>
                        </FormItem>
                    )}
                />
            </div>
            {
                !form.watch('isRTOAddressSame') && (
                    <>
                        <FormField
                            control={form.control}
                            name="rtoAddress"
                            render={({ field }) => (
                                <FormItem className='col-span-2'>
                                    <FormLabel className="text-xs font-bold">
                                        Address
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            disabled={isLoading}
                                            placeholder="Enter the address"
                                            {...field}
                                        />
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
                                    <FormLabel className="text-xs font-bold">
                                        Pincode
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            disabled={isLoading}
                                            placeholder="Enter the pincode"
                                            {...field}
                                        />
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
                                    <FormLabel className="text-xs font-bold">
                                        City
                                    </FormLabel>
                                    <FormControl>
                                        <div className='flex items-center bg-zinc-300/50 rounded-md pr-3'>
                                            <Input
                                                disabled={isLoading || isRTOPinLoading}
                                                className="bg-transparent border-0 dark:bg-zinc-700 dark:text-white focus-visible:ring-0 text-black focus-visible:ring-offset-0"
                                                placeholder="Enter the city"
                                                {...field}
                                            />
                                            {isRTOPinLoading && <Loader2 className="w-4 h-4 animate-spin" />}
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
                                    <FormLabel className="text-xs font-bold">
                                        State
                                    </FormLabel>
                                    <FormControl>
                                        <div className='flex items-center bg-zinc-300/50 rounded-md pr-3'>
                                            <Input
                                                disabled={isLoading || isRTOPinLoading}
                                                className="bg-transparent border-0 dark:bg-zinc-700 dark:text-white focus-visible:ring-0 text-black focus-visible:ring-offset-0"
                                                placeholder="Enter the state"
                                                {...field}
                                            />
                                            {isRTOPinLoading && <Loader2 className="w-4 h-4 animate-spin" />}
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
                                    <FormLabel className="text-xs font-bold">
                                        Country
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            disabled={true}
                                            placeholder="Enter the country"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </>
                )
            }
        </div>
    )
}