'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, ChevronUp, Search, MapPin, Phone, Plus } from 'lucide-react';
import { Button, Input, Form, FormControl, FormField, FormItem, FormMessage, Badge, Card } from '@lorrigo/ui/components';
import { useForm } from 'react-hook-form';
import { useModal } from '@/modal/modal-provider';
import { useHubOperations } from '@/lib/apis/hub';
import { filterHubs } from '@/lib/filter-hubs';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { api } from '@/lib/apis/axios';

interface Address {
  id: string
  name: string
  phone: string
  address: {
    address: string
  }
}

interface PickupAddressSelectorProps {
  onAddressSelect: (address: Address | null) => void
  error?: string
  initialAddressId?: string
  addresses?: Address[]
  onAddNewAddress?: () => void
}

interface AddressFormValues {
  address: string
}

export function PickupAddressSelector({
  onAddressSelect,
  error,
  initialAddressId,
  onAddNewAddress,
}: PickupAddressSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredAddresses, setFilteredAddresses] = useState<Address[]>([])
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { openModal } = useModal();
  const [hasInitiallyFetched, setHasInitiallyFetched] = useState(false);
  const [isSearchingBackend, setIsSearchingBackend] = useState(false);
  const [lastSearchQuery, setLastSearchQuery] = useState('');

  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const {
    getHubsQueryLegacy: { data, refetch },
  } = useHubOperations();

  const form = useForm<AddressFormValues>({
    defaultValues: {
      address: "",
    },
  })

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  useEffect(() => {
    const fetchHubs = async () => {
      if (isOpen && (!data || data.length === 0) && !initialAddressId && !hasInitiallyFetched) {
        setIsLoading(true);
        try {
          const response = await refetch();
          console.log(response);
          setFilteredAddresses(filterHubs(response.data ?? [], searchQuery));
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

  const searchBackendAPI = useCallback(async (query: string) => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('globalFilter', query);
      queryParams.append('limit', '10');

      const response = await api.get<any>(`/pickup-address?${queryParams.toString()}`);
      return response?.hubs || [];
    } catch (error) {
      console.error('Error searching backend:', error);
      return [];
    }
  }, []);

  const performSearch = useCallback(
    async (query: string) => {
      if (query === lastSearchQuery) return;

      setLastSearchQuery(query);

      if (!query || query.length < 3) {
        if (data) {
          setFilteredAddresses(data);
        }
        return;
      }

      const localResults = data ? filterHubs(data, query) : [];

      if (localResults.length === 0) {
        setIsSearchingBackend(true);
        try {
          const backendResults = await searchBackendAPI(query);

          if (backendResults.length > 0) {
            const transformedResults = backendResults.map((hub: any) => ({
              id: hub.id,
              name: hub.name,
              address: {
                address: hub.address?.address || '',
              },
            }));
            setFilteredAddresses(transformedResults);
          } else {
            setFilteredAddresses([]);
          }
        } catch (error) {
          console.error('Error searching backend:', error);
          setFilteredAddresses([]);
        } finally {
          setIsSearchingBackend(false);
        }
      } else {
        setFilteredAddresses(localResults);
      }
    },
    [data, searchBackendAPI, lastSearchQuery]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setIsLoading(true)
      const filtered = filterHubs(data ?? [], searchQuery)
      setFilteredAddresses(filtered)
      setIsLoading(false)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, data])

  // Set initial selected address
  useEffect(() => {
    if (initialAddressId && filteredAddresses.length > 0) {
      const address = filteredAddresses.find((addr) => addr.id === initialAddressId)
      if (address && !selectedAddress) {
        setSelectedAddress(address)
        form.setValue("address", address.id)
        onAddressSelect(address)
      }
    }
  }, [initialAddressId, filteredAddresses, form, selectedAddress, onAddressSelect])

  const handleAddressSelect = (address: Address) => {
    setSelectedAddress(address)
    form.setValue("address", address.id)
    setIsOpen(false)
    setSearchQuery("")
    onAddressSelect(address)
  }

  const handleClearSelection = () => {
    setSelectedAddress(null)
    setSearchQuery("")
    form.setValue("address", "")
    onAddressSelect(null)
    setFilteredAddresses(filteredAddresses)
  }

  const handleInputChange = (value: string) => {
    setSearchQuery(value)
    form.setValue("address", value)

    // Clear selection if user is typing something different
    if (selectedAddress) {
      const expectedValue = `${selectedAddress.name} | ${selectedAddress.address.address}`
      if (value !== expectedValue) {
        setSelectedAddress(null)
        onAddressSelect(null)
      }
    }

    if (!isOpen) setIsOpen(true)
  }

  const displayValue = selectedAddress ? `${selectedAddress.name} | ${selectedAddress.address.address}` : searchQuery

  return (
    <Form {...form}>
      <div className="relative w-full" ref={dropdownRef}>
        <div className="flex gap-3">
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <Search className="h-4 w-4" />
                    </div>
                    <Input
                      placeholder="Search pickup locations..."
                      value={displayValue}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          handleClearSelection()
                          setIsOpen(false)
                        }
                        if (e.key === "Enter") {
                          e.preventDefault()
                        }
                      }}
                      onClick={() => setIsOpen(true)}
                      className="pl-10 pr-10 h-11 border-2 focus:border-primary transition-colors"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted/50"
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

          {onAddNewAddress && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11 border-2 hover:border-primary transition-colors bg-transparent"
              onClick={onAddNewAddress}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>

        {isOpen && (
          <Card className="absolute z-50 mt-2 w-full border-2 shadow-lg">
            {isLoading ? (
              <div className="p-6 text-center">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span className="text-sm">Searching...</span>
                </div>
              </div>
            ) : filteredAddresses.length > 0 ? (
              <div className="max-h-80 overflow-auto">
                {filteredAddresses.map((address, index) => (
                  <div
                    key={address.id}
                    className={`cursor-pointer p-4 transition-colors hover:bg-muted/50 ${
                      index !== filteredAddresses.length - 1 ? "border-b" : ""
                    } ${selectedAddress?.id === address.id ? "bg-primary/5 border-l-4 border-l-primary" : ""}`}
                    onClick={() => handleAddressSelect(address)}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-foreground">{address.name}</h4>
                        {selectedAddress?.id === address.id && (
                          <Badge variant="secondary" className="text-xs">
                            Selected
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span className="flex-1">{address.address.address}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
                  <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {searchQuery.length > 0
                      ? `No pickup addresses found for "${searchQuery}"`
                      : "No addresses available"}
                  </p>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </Form>
  )
}
