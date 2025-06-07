'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Edit, Plus } from 'lucide-react';
import {
  Button,
  Input,
  Badge,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@lorrigo/ui/components';
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
}

// Interface for form values
interface AddressFormValues {
  address: string;
}

export function PickupAddressSelector({ onAddressSelect, error }: PickupAddressSelectorProps) {
  const { openModal } = useModal();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { getHubsQuery: { data, refetch } } = useHubOperations();

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

  useEffect(() => {
    const fetchHubs = async () => {
      if (isOpen && (!data || data.length === 0)) {
        setIsLoading(true);
        try {
          const response = await refetch(); // fetch only once when opened
          setAddresses(filterHubs(response.data ?? [], searchQuery));
        } catch (error) {
          console.error('Error fetching hubs:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchHubs();
  }, [isOpen]);

  useEffect(() => {
    if (data) {
      setAddresses(filterHubs(data, searchQuery));
    }
  }, [searchQuery, data]);

  const handleAddressSelect = (address: Address) => {
    setSelectedAddress(address);
    form.setValue('address', address.id);
    setIsOpen(false);
    onAddressSelect(address);
  };

  function onSubmit(values: AddressFormValues) {
    console.log(values);
  }



  // const handleConfirm = () => {
  //   onConfirm();
  //   onClose();
  // };

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
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setIsOpen(!isOpen)}
                    >
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage>{error}</FormMessage>
              </FormItem>
            )}
          />
          {/* <Button type="button" variant="outline" size="icon">
            <Edit className="h-4 w-4" />
          </Button> */}
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
                  <li
                    key={address.id}
                    className="hover:bg-muted cursor-pointer px-4 py-3 border-b"
                    onClick={() => handleAddressSelect(address)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-base ">{address.name}</span>
                        <span className="text-muted-foreground"> | </span>
                        <span className="text-xs">{address.address.address}</span>
                      </div>
                      {/* {address.verified && (
                          <Badge
                            variant={address.verified ? 'success' : 'destructive'}
                            className="ml-2"
                          >
                            {address.verified ? 'Verified' : 'Unverified'}
                          </Badge>
                      )} */}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-muted-foreground p-4 text-center text-sm">
                No addresses found
              </div>
            )}
          </div>
        )}
      </div>
    </Form>
  );
}
