'use client';

import { Checkbox, Input, FormControl, FormField, FormItem, FormLabel, FormMessage, Badge } from '@lorrigo/ui/components';
import { OrderFormValues } from '@lorrigo/utils/validations';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Control, UseFormWatch, useFormContext } from 'react-hook-form';
import { searchCustomers, Customer } from '@/lib/apis/customers';
import { PhoneIcon, User2 } from 'lucide-react';

interface DeliveryDetailsFormProps {
  control: Control<OrderFormValues>;
  watch: UseFormWatch<OrderFormValues>;
  isLoading: boolean;
}

export function DeliveryDetailsForm({ control, watch, isLoading }: DeliveryDetailsFormProps) {
  const [billingIsSameAsDelivery, setBillingIsSameAsDelivery] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [customerOptions, setCustomerOptions] = useState<Customer[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { setValue } = useFormContext<OrderFormValues>();

  // Only sync billing details when checkbox is toggled, not on every field change
  const syncBillingWithDelivery = () => {
    const deliveryDetails = control._formValues.deliveryDetails;

    setValue('deliveryDetails.billingMobileNumber', deliveryDetails.mobileNumber || '', {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue('deliveryDetails.billingFullName', deliveryDetails.fullName || '', {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue('deliveryDetails.billingCompleteAddress', deliveryDetails.completeAddress || '', {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue('deliveryDetails.billingLandmark', deliveryDetails.landmark || '', {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue('deliveryDetails.billingPincode', deliveryDetails.pincode || '', {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue('deliveryDetails.billingCity', deliveryDetails.city || '', {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue('deliveryDetails.billingState', deliveryDetails.state || '', {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  useEffect(() => {
    // setValue('deliveryDetails.billingIsSameAsDelivery', true, {
    //   shouldValidate: true,
    //   shouldDirty: true,
    // });

    if (billingIsSameAsDelivery) {
      // Only sync when checkbox is checked, not continuously
      syncBillingWithDelivery();
    }
  }, [billingIsSameAsDelivery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const debouncedSearch = useCallback((query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.length < 2) {
      setCustomerOptions([]);
      setIsSearchLoading(false);
      return;
    }

    setIsSearchLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      try {
        const data = await searchCustomers(query, abortControllerRef.current.signal);
        setCustomerOptions(data);
      } catch (error) {
        // Only log errors that aren't from aborting
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.error('Error fetching customers:', error);
        }
      } finally {
        setIsSearchLoading(false);
      }
    }, 500); // 500ms debounce delay
  }, []);

  // Effect to handle search query changes
  useEffect(() => {
    if (isDropdownOpen) {
      debouncedSearch(searchQuery);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [searchQuery, isDropdownOpen, debouncedSearch]);

  const handleCustomerSelect = (selectedCustomer: Customer) => {
    // Fill in delivery details
    setValue('deliveryDetails.mobileNumber', selectedCustomer.phone || '', {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue('deliveryDetails.fullName', selectedCustomer.name || '', {
      shouldValidate: true,
      shouldDirty: true,
    });

    // Fill in address if available
    if (selectedCustomer.address) {
      setValue('deliveryDetails.completeAddress', selectedCustomer.address.address || '', {
        shouldValidate: true,
        shouldDirty: true,
      });
      setValue('deliveryDetails.landmark', selectedCustomer.address.address_2 || '', {
        shouldValidate: true,
        shouldDirty: true,
      });
      setValue('deliveryDetails.pincode', selectedCustomer.address.pincode || '', {
        shouldValidate: true,
        shouldDirty: true,
      });
      setValue('deliveryDetails.city', selectedCustomer.address.city || '', {
        shouldValidate: true,
        shouldDirty: true,
      });
      setValue('deliveryDetails.state', selectedCustomer.address.state || '', {
        shouldValidate: true,
        shouldDirty: true,
      });
    }

    // Sync billing details if needed
    if (billingIsSameAsDelivery) {
      syncBillingWithDelivery();
    }

    setIsDropdownOpen(false);
  };

  return (
    <div className="space-y-3">
      <FormField
        control={control}
        name="deliveryDetails.isBusiness"
        render={({ field }) => (
          <FormItem className="flex items-center space-x-2">
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} id="is-business" />
            </FormControl>
            <FormLabel htmlFor="is-business" className="cursor-pointer text-sm font-normal">
              This is a B2B Order
            </FormLabel>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-3">
        <div className="relative" ref={dropdownRef}>
          <FormField
            control={control}
            name="deliveryDetails.mobileNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mobile Number</FormLabel>
                <div className="flex">
                  <div className="bg-muted flex items-center justify-center rounded-l-md border px-2 text-xs">+91</div>
                  <FormControl>
                    <Input
                      {...field}
                      autoComplete="off"
                      placeholder="Mobile"
                      maxLength={10}
                      className="h-8 rounded-l-none text-sm"
                      onChange={(e) => {
                        field.onChange(e);
                        setSearchQuery(e.target.value);
                        if (!isDropdownOpen && e.target.value.length >= 2) {
                          setIsDropdownOpen(true);
                        }
                        // Sync immediately if billing is same as delivery
                        if (billingIsSameAsDelivery) {
                          setValue('deliveryDetails.billingMobileNumber', e.target.value, {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                        }
                      }}
                      onClick={() => {
                        if (field.value && field.value.length >= 2) {
                          setSearchQuery(field.value);
                          setIsDropdownOpen(true);
                        }
                      }}
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          {isDropdownOpen && (
            <div className="bg-background absolute z-10 mt-1 w-full rounded-md border shadow-lg">
              {isSearchLoading ? (
                <div className="text-muted-foreground p-4 text-center text-sm">Loading...</div>
              ) : customerOptions.length > 0 ? (
                <ul className="max-h-60 overflow-y-auto py-1">
                  {customerOptions.map((option) => (
                    <li key={option.id} className="hover:bg-muted cursor-pointer px-4 py-2" onClick={() => handleCustomerSelect(option)}>
                      <div className="flex items-center justify-between text-sm font-medium">
                        <Badge variant="outline">
                          <User2 className="h-4 w-4" /> {option.name}
                        </Badge>{' '}
                        <Badge variant="outline" className="text-muted-foreground ml-2 text-xs">
                          <PhoneIcon className="h-4 w-4" /> {option.phone}
                        </Badge>
                      </div>
                      {option.address && (
                        <div className="text-muted-foreground mt-2 truncate text-xs">
                          {option.address.address}, {option.address.city}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : searchQuery.length >= 2 ? (
                <div className="text-muted-foreground p-4 text-center text-sm">No customers found</div>
              ) : (
                <div className="text-muted-foreground p-4 text-center text-sm">Type at least 2 characters to search</div>
              )}
            </div>
          )}
        </div>
        <FormField
          control={control}
          name="deliveryDetails.fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Full Name"
                  className="h-8"
                  onChange={(e) => {
                    field.onChange(e);
                    setSearchQuery(e.target.value);
                    if (!isDropdownOpen && e.target.value.length >= 2) {
                      setIsDropdownOpen(true);
                    }
                    if (billingIsSameAsDelivery) {
                      setValue('deliveryDetails.billingFullName', e.target.value, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                    }
                  }}
                  onClick={() => {
                    if (field.value && field.value.length >= 2) {
                      setSearchQuery(field.value);
                      setIsDropdownOpen(true);
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={control}
        name="deliveryDetails.completeAddress"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Complete Address</FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder="Full address"
                className="h-8"
                onChange={(e) => {
                  field.onChange(e);
                  if (billingIsSameAsDelivery) {
                    setValue('deliveryDetails.billingCompleteAddress', e.target.value, {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                  }
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-3 gap-3">
        <FormField
          control={control}
          name="deliveryDetails.landmark"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-muted-foreground">
                <span className="text-black">Landmark</span>(Optional)
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Landmark"
                  className="h-8"
                  onChange={(e) => {
                    field.onChange(e);
                    if (billingIsSameAsDelivery) {
                      setValue('deliveryDetails.billingLandmark', e.target.value, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="deliveryDetails.pincode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pincode</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Pincode"
                  className="h-8"
                  onChange={(e) => {
                    field.onChange(e);
                    if (billingIsSameAsDelivery) {
                      setValue('deliveryDetails.billingPincode', e.target.value, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="deliveryDetails.city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>City</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="City"
                  className="h-8"
                  isLoading={isLoading}
                  onChange={(e) => {
                    field.onChange(e);
                    if (billingIsSameAsDelivery) {
                      setValue('deliveryDetails.billingCity', e.target.value, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <FormField
          control={control}
          name="deliveryDetails.state"
          render={({ field }) => (
            <FormItem>
              <FormLabel>State</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="State"
                  className="h-8"
                  isLoading={isLoading}
                  onChange={(e) => {
                    field.onChange(e);
                    if (billingIsSameAsDelivery) {
                      setValue('deliveryDetails.billingState', e.target.value, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="deliveryDetails.email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-muted-foreground">
                <span className="text-black">Email</span> (Optional)
              </FormLabel>
              <FormControl>
                <Input {...field} placeholder="Email" className="h-8" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
