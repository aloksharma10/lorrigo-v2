'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, ChevronUp, MapPin, Phone, Plus, MapPinPlusIcon } from 'lucide-react';
import { Button, Input, Form, FormControl, FormField, FormItem, FormMessage, Badge, Card } from '@lorrigo/ui/components';
import { useForm } from 'react-hook-form';
import { useModal } from '@/modal/modal-provider';
import { useHubOperations } from '@/lib/apis/hub';
import { filterHubs } from '@/lib/filter-hubs';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { api } from '@/lib/apis/axios';

interface Address {
  id: string;
  name: string;
  phone: string;
  address: {
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
}

interface PickupAddressSelectorProps {
  onAddressSelect: (address: Address | null) => void;
  error?: string;
  initialAddressId?: string;
  addresses?: Address[];
  onAddNewAddress?: () => void;
}

interface AddressFormValues {
  address: string;
}

export function PickupAddressSelector({ onAddressSelect, error, initialAddressId, addresses = [], onAddNewAddress }: PickupAddressSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredAddresses, setFilteredAddresses] = useState<Address[]>(addresses);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { openModal } = useModal();
  const [hasInitiallyFetched, setHasInitiallyFetched] = useState(false);
  const [lastSearchQuery, setLastSearchQuery] = useState('');

  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const {
    getHubsQueryLegacy: { data, refetch },
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

  // Set initial address in edit mode
  useEffect(() => {
    if (initialAddressId && addresses.length > 0 && !selectedAddress) {
      const initialAddress = addresses.find((addr) => addr.id === initialAddressId);
      if (initialAddress) {
        setSelectedAddress(initialAddress);
        setFilteredAddresses(addresses);
        form.setValue('address', `${initialAddress.name} | ${initialAddress.address.address}`);
        onAddressSelect(initialAddress);
      }
    }
  }, [initialAddressId, addresses, selectedAddress, form, onAddressSelect]);

  // Fetch hubs if addresses prop is not provided
  useEffect(() => {
    const fetchInitialData = async () => {
      if (addresses.length === 0 && !hasInitiallyFetched && (!data || data.length === 0)) {
        setIsLoading(true);
        try {
          const response = await refetch();
          setFilteredAddresses(response.data ?? []);
          setHasInitiallyFetched(true);
          if (initialAddressId) {
            const initialAddress = response.data?.find((addr: Address) => addr.id === initialAddressId);
            if (initialAddress) {
              setSelectedAddress(initialAddress);
              form.setValue('address', `${initialAddress.name} | ${initialAddress.address.address}`);
              onAddressSelect(initialAddress);
            }
          }
        } catch (error) {
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchInitialData();
  }, [initialAddressId, hasInitiallyFetched, data, refetch, addresses, form, onAddressSelect]);

  const searchBackendAPI = useCallback(async (query: string) => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('globalFilter', query);
      queryParams.append('limit', '10');

      const response = await api.get<any>(`/pickup-address?${queryParams.toString()}`);
      return response?.hubs || [];
    } catch (error) {
      return [];
    }
  }, []);

  const performSearch = useCallback(
    async (query: string) => {
      if (query === lastSearchQuery) return;

      setLastSearchQuery(query);

      if (!query || query.length < 3) {
        setFilteredAddresses(addresses.length > 0 ? addresses : data ?? []);
        return;
      }

      const localResults = addresses.length > 0 ? filterHubs(addresses, query) : data ? filterHubs(data, query) : [];

      if (localResults.length === 0) {
        try {
          const backendResults = await searchBackendAPI(query);
          setFilteredAddresses(backendResults);
        } catch (error) {
          setFilteredAddresses([]);
        }
      } else {
        setFilteredAddresses(localResults);
      }
    },
    [data, addresses, searchBackendAPI, lastSearchQuery]
  );

  useEffect(() => {
    if (debouncedSearchQuery !== lastSearchQuery) {
      performSearch(debouncedSearchQuery);
    }
  }, [debouncedSearchQuery, performSearch, lastSearchQuery]);

  const handleAddressSelect = (address: Address) => {
    setSelectedAddress(address);
    form.setValue('address', `${address.name} | ${address.address.address}`);
    setIsOpen(false);
    setSearchQuery('');
    onAddressSelect(address);
  };

  const handleClearSelection = () => {
    setSelectedAddress(null);
    setSearchQuery('');
    form.setValue('address', '');
    onAddressSelect(null);
    setFilteredAddresses(addresses.length > 0 ? addresses : data ?? []);
  };

  const handleInputChange = (value: string) => {
    setSearchQuery(value);
    form.setValue('address', value);

    if (selectedAddress) {
      const expectedValue = `${selectedAddress.name} | ${selectedAddress.address.address}`;
      if (value !== expectedValue) {
        setSelectedAddress(null);
        onAddressSelect(null);
      }
    }

    if (!isOpen) setIsOpen(true);
  };

  const displayValue = selectedAddress ? `${selectedAddress.name} | ${selectedAddress.address.address}` : searchQuery;

  return (
    <Form {...form}>
      <div className="relative w-full" ref={dropdownRef}>
        <div className="flex gap-2">
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <div className="relative">
                    <Input
                      type="search"
                      placeholder="Search pickup locations by name, address, phone, pincode."
                      value={displayValue}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          handleClearSelection();
                          setIsOpen(false);
                        }
                        if (e.key === 'Enter') {
                          e.preventDefault();
                        }
                      }}
                      onClick={() => setIsOpen(true)}
                      className="focus:border-primary border-2 pl-10 pr-10 transition-colors"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="hover:bg-muted/50 absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 p-0"
                      onClick={() => setIsOpen(!isOpen)}
                    >
                      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </FormControl>
                {error && <FormMessage className="text-destructive">{error}</FormMessage>}
              </FormItem>
            )}
          />
          <Button icon={MapPinPlusIcon} variant={'secondary'} onClick={() => openModal('seller:add-pickup-location')} />

          {onAddNewAddress && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="hover:border-primary h-11 w-11 border-2 bg-transparent transition-colors"
              onClick={onAddNewAddress}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>

        {isOpen && (
          <Card className="absolute z-50 mt-2 w-full border-2 py-0 shadow-lg">
            {isLoading ? (
              <div className="p-6 text-center">
                <div className="text-muted-foreground flex items-center justify-center gap-2">
                  <div className="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
                  <span className="text-sm">Searching...</span>
                </div>
              </div>
            ) : filteredAddresses.length > 0 ? (
              <div className="max-h-80 overflow-auto">
                {filteredAddresses.map((address, index) => (
                  <div
                    key={address.id}
                    className={`hover:bg-muted/50 cursor-pointer p-2 px-4 transition-colors ${
                      index !== filteredAddresses.length - 1 ? 'border-b' : ''
                    } ${selectedAddress?.id === address.id ? 'bg-primary/5 border-l-primary border-l-4' : ''}`}
                    onClick={() => handleAddressSelect(address)}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-foreground font-semibold">{address.name}</h4>
                        {selectedAddress?.id === address.id && (
                          <Badge variant="secondary" className="text-xs">
                            Selected
                          </Badge>
                        )}
                      </div>

                      <div className="text-muted-foreground flex items-start gap-2 text-sm">
                        <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <span className="flex-1">
                          {address.address.address}, {address.address.city}, {address.address.state}, {address.address.pincode}
                        </span>
                      </div>

                      <div className="text-muted-foreground flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 flex-shrink-0" />
                        <span>{address.phone}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center">
                <div className="text-muted-foreground">
                  <MapPin className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p className="text-sm">{searchQuery.length > 0 ? `No pickup addresses found for "${searchQuery}"` : 'No addresses available'}</p>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </Form>
  );
}