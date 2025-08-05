'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { Button, Input, Form, FormControl, FormField, FormItem, FormMessage } from '@lorrigo/ui/components';
import { useForm } from 'react-hook-form';
import { useModal } from '@/modal/modal-provider';
import { useHubOperations } from '@/lib/apis/hub';
import { filterHubs } from '@/lib/filter-hubs';

interface Address {
  id: string;
  name: string;
  address: {
    address: string;
  };
  // verified: boolean;
}

interface PickupAddressSelectorProps {
  onAddressSelect: (address: Address | null) => void;
  error?: string;
  initialAddressId?: string;
}

// Interface for form values
interface AddressFormValues {
  address: string;
}

export function PickupAddressSelector({ onAddressSelect, error, initialAddressId }: PickupAddressSelectorProps) {
  const { openModal } = useModal();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasInitiallyFetched, setHasInitiallyFetched] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const {
    getHubsQuery: { data, refetch },
  } = useHubOperations();

  const form = useForm<AddressFormValues>({
    defaultValues: {
      address: '',
    },
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initial fetch if initialAddressId is provided
  useEffect(() => {
    const fetchInitialData = async () => {
      if (initialAddressId && !hasInitiallyFetched && (!data || data.length === 0)) {
        setIsLoading(true);
        try {
          await refetch();
          setHasInitiallyFetched(true);
        } catch (error) {
          console.error('Error fetching initial hubs:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchInitialData();
  }, [initialAddressId, hasInitiallyFetched, data, refetch]);

  // Fetch data when dropdown opens (only if no initial value or already fetched initially)
  useEffect(() => {
    const fetchHubs = async () => {
      if (isOpen && (!data || data.length === 0) && !initialAddressId && !hasInitiallyFetched) {
        setIsLoading(true);
        try {
          const response = await refetch();
          setAddresses(filterHubs(response.data ?? [], searchQuery));
          setHasInitiallyFetched(true);
        } catch (error) {
          console.error('Error fetching hubs:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchHubs();
  }, [isOpen, initialAddressId, hasInitiallyFetched, data, refetch, searchQuery]);

  useEffect(() => {
    if (data) {
      setAddresses(filterHubs(data, searchQuery));
    }
  }, [searchQuery, data]);

  // Set initial selected address
  useEffect(() => {
    if (initialAddressId && data) {
      const address = data.find((address: Address) => address.id === initialAddressId);
      if (address && !selectedAddress) {
        setSelectedAddress(address);
        form.setValue('address', address.id);
        onAddressSelect(address);
      }
    }
  }, [initialAddressId, data, form, selectedAddress, onAddressSelect]);

  const handleAddressSelect = (address: Address) => {
    setSelectedAddress(address);
    form.setValue('address', address.id);
    setIsOpen(false);
    onAddressSelect(address);
  };

  function onSubmit(values: AddressFormValues) {
    // console.log(values);
  }

  const handleOpenFormModal = () => {
    openModal('seller:add-pickup-location', {
      title: 'Add Pickup Location',
      onSubmit: (data: any) => console.log('Form submitted:', data),
    });
  };

  return (
    <Form {...form}>
      <div className="relative" ref={dropdownRef}>
        <div className="flex gap-2">
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <div className="relative">
                    <Input
                      placeholder="Search by pickup location"
                      value={selectedAddress ? ` ${selectedAddress.name} | ${selectedAddress.address.address}` : searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        field.onChange(e.target.value);
                        setSelectedAddress(null);
                        onAddressSelect(null);
                        if (!isOpen) setIsOpen(true);
                      }}
                      onClick={() => setIsOpen(true)}
                      className="pr-10"
                    />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full" onClick={() => setIsOpen(!isOpen)}>
                      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage>{error}</FormMessage>
              </FormItem>
            )}
          />
          <Button type="button" variant="outline" size="icon" onClick={handleOpenFormModal}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {isOpen && (
          <div className="bg-background absolute z-10 mt-1 w-full rounded-md border shadow-lg">
            {isLoading ? (
              <div className="text-muted-foreground p-4 text-center text-sm">Loading...</div>
            ) : addresses.length > 0 ? (
              <ul className="max-h-80 overflow-auto py-1">
                {addresses.map((address) => (
                  <li key={address.id} className="hover:bg-muted cursor-pointer border-b px-4 py-3" onClick={() => handleAddressSelect(address)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-base font-semibold">{address.name}</span>
                        <span className="text-muted-foreground"> | </span>
                        <span className="text-xs">{address.address.address}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-muted-foreground p-4 text-center text-sm">No addresses found</div>
            )}
          </div>
        )}
      </div>
    </Form>
  );
}
