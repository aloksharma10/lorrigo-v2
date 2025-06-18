'use client';

import {
  Input,
  Label,
  Checkbox,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Badge,
} from '@lorrigo/ui/components';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Control, UseFormWatch, useFormContext } from 'react-hook-form';
import { type OrderFormValues } from '@lorrigo/utils/validations';
import { searchSellers, Seller } from '@/lib/apis/sellers';
import { Package2 } from 'lucide-react';

interface SellerDetailsFormProps {
  control: Control<OrderFormValues>;
  watch: UseFormWatch<OrderFormValues>;
  isLoading: boolean;
}

export function SellerDetailsForm({ control, watch, isLoading }: SellerDetailsFormProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [sellerOptions, setSellerOptions] = useState<Seller[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { setValue } = useFormContext<OrderFormValues>();

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
      setSellerOptions([]);
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
        const data = await searchSellers(query, abortControllerRef.current.signal);
        setSellerOptions(data);
      } catch (error) {
        // Only log errors that aren't from aborting
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.error('Error fetching sellers:', error);
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

  const handleSellerSelect = (selectedSeller: Seller) => {
    setValue('sellerDetails.name', selectedSeller.name, {
      shouldValidate: true,
      shouldDirty: true,
    });

    setValue('sellerDetails.gstNo', selectedSeller.gstNo || '', {
      shouldValidate: true,
      shouldDirty: true,
    });

    if (selectedSeller.address) {
      setValue('sellerDetails.isAddressAvailable', true, {
        shouldValidate: true,
        shouldDirty: true,
      });

      setValue('sellerDetails.address', selectedSeller.address, {
        shouldValidate: true,
        shouldDirty: true,
      });

      setValue('sellerDetails.contactNumber', selectedSeller.contactNumber || '', {
        shouldValidate: true,
        shouldDirty: true,
      });

      setValue('sellerDetails.pincode', selectedSeller.pincode || '', {
        shouldValidate: true,
        shouldDirty: true,
      });

      setValue('sellerDetails.city', selectedSeller.city || '', {
        shouldValidate: true,
        shouldDirty: true,
      });

      setValue('sellerDetails.state', selectedSeller.state || '', {
        shouldValidate: true,
        shouldDirty: true,
      });
    }

    setIsDropdownOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="relative" ref={dropdownRef}>
          <FormField
            control={control}
            name="sellerDetails.name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center text-sm font-medium">Seller Name</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="off"
                    placeholder="Enter the seller name"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      setSearchQuery(e.target.value);
                      if (!isDropdownOpen && e.target.value.length >= 2) {
                        setIsDropdownOpen(true);
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
          {isDropdownOpen && (
            <div className="bg-background absolute z-10 mt-1 w-full rounded-md border shadow-lg">
              {isSearchLoading ? (
                <div className="text-muted-foreground p-4 text-center text-sm">Loading...</div>
              ) : sellerOptions.length > 0 ? (
                <ul className="max-h-60 overflow-y-auto py-1">
                  {sellerOptions.map((option) => (
                    <li
                      key={option.id}
                      className="hover:bg-muted cursor-pointer px-4 py-2"
                      onClick={() => handleSellerSelect(option)}
                    >
                      <div className="flex items-center justify-between text-sm font-medium">
                        <Badge variant="outline">
                          <Package2 className="h-4 w-4" /> {option.name}
                        </Badge>
                        <Badge variant="outline" className="text-muted-foreground ml-2 text-xs">
                          <span className="text-xs font-bold">GST:</span> {option.gstNo}
                        </Badge>
                      </div>
                      {option.address && (
                        <div className="text-muted-foreground truncate text-xs">
                          {option.address}, {option.city}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : searchQuery.length >= 2 ? (
                <div className="text-muted-foreground p-4 text-center text-sm">
                  No sellers found
                </div>
              ) : (
                <div className="text-muted-foreground p-4 text-center text-sm">
                  Type at least 2 characters to search
                </div>
              )}
            </div>
          )}
        </div>

        <FormField
          control={control}
          name="sellerDetails.gstNo"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium">GST NO.</FormLabel>
              <FormControl>
                <Input placeholder="Enter the GST No." maxLength={15} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={control}
        name="sellerDetails.isAddressAvailable"
        render={({ field }) => (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="add-seller-address"
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked as boolean)}
            />
            <Label htmlFor="add-seller-address" className="font-medium">
              Add Seller Address
            </Label>
          </div>
        )}
      />

      {watch('sellerDetails.isAddressAvailable') && (
        <div className="space-y-6">
          <FormField
            control={control}
            name="sellerDetails.address"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Address</FormLabel>
                <FormControl>
                  <Input placeholder="Enter the address" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField
              control={control}
              name="sellerDetails.contactNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Contact Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter the contact number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="sellerDetails.pincode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Pincode</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter the pincode" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="sellerDetails.city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">City</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter the city" {...field} isLoading={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="sellerDetails.state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">State</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter the state" {...field} isLoading={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="sellerDetails.country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Country</FormLabel>
                  <FormControl>
                    <Input disabled {...field} value="India" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      )}
    </div>
  );
}
