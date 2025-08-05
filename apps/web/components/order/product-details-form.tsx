'use client';

import type React from 'react';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Info, Minus, Plus, Trash2 } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Alert,
  AlertTitle,
  AlertDescription,
  Badge,
} from '@lorrigo/ui/components';

import { useFieldArray, Control, UseFormWatch, useFormContext } from 'react-hook-form';
import { OrderFormValues } from '@lorrigo/utils/validations';
import { currencyFormatter } from '@lorrigo/utils';
import { searchProducts, Product } from '@/lib/apis/products';

interface ProductRowProps {
  index: number;
  control: Control<OrderFormValues>;
  watch: UseFormWatch<OrderFormValues>;
  remove: any;
  productsLength: number;
}

function ProductRow({ index, control, watch, remove, productsLength }: ProductRowProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [productOptions, setProductOptions] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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
      setProductOptions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      try {
        const data = await searchProducts(query, abortControllerRef.current.signal);
        setProductOptions(data);
      } catch (error) {
        // Only log errors that aren't from aborting
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.error('Error fetching products:', error);
        }
      } finally {
        setIsLoading(false);
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

  const handleProductSelect = (selectedProduct: Product) => {
    setValue(`productDetails.products.${index}.name`, selectedProduct.name, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue(`productDetails.products.${index}.price`, selectedProduct.price, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue(`productDetails.products.${index}.id`, selectedProduct.id, {
      shouldValidate: true,
      shouldDirty: true,
    });
    if (selectedProduct.hsnCode) {
      setValue(`productDetails.products.${index}.hsnCode`, selectedProduct.hsnCode, {
        shouldValidate: true,
        shouldDirty: true,
      });
    } else {
      setValue(`productDetails.products.${index}.hsnCode`, '', {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
    setIsDropdownOpen(false);
  };

  const handleQuantityChange = (change: number) => {
    const currentQuantity = watch(`productDetails.products.${index}.quantity`) || 1;
    const newQuantity = Math.max(1, currentQuantity + change);
    setValue(`productDetails.products.${index}.quantity`, newQuantity, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  return (
    <div className="space-y-2 rounded-lg border p-4">
      {/* Header Row with Product Name and Delete Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label htmlFor={`productDetails.products.${index}.name`} className="text-sm font-medium text-indigo-600">
            Product Name
          </Label>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => productsLength > 1 && remove(index)}
          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
          disabled={productsLength <= 1}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Product Name Input with Dropdown */}
      <div className="relative w-full" ref={dropdownRef}>
        <FormField
          control={control}
          name={`productDetails.products.${index}.name`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  id={`productDetails.products.${index}.name`}
                  placeholder="Enter or search your product name"
                  {...field}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    field.onChange(e.target.value);
                    if (!isDropdownOpen) setIsDropdownOpen(true);
                  }}
                  onClick={() => setIsDropdownOpen(true)}
                  className="w-full"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {isDropdownOpen && (
          <div className="bg-background absolute z-10 mt-1 w-full rounded-md border shadow-lg">
            {isLoading ? (
              <div className="text-muted-foreground p-4 text-center text-sm">Loading...</div>
            ) : productOptions.length > 0 ? (
              <ul className="max-h-60 overflow-y-auto py-1">
                {productOptions.map((option) => (
                  <li key={option.id} className="hover:bg-muted cursor-pointer px-4 py-2" onClick={() => handleProductSelect(option)}>
                    <div className="flex items-center justify-between text-sm font-medium">
                      {option.name}{' '}
                      <Badge variant="outline" className="text-muted-foreground ml-2 text-xs">
                        {option.id}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            ) : searchQuery.length >= 2 ? (
              <div className="text-muted-foreground p-4 text-center text-sm">No products found</div>
            ) : (
              <div className="text-muted-foreground p-4 text-center text-sm">Type at least 2 characters to search</div>
            )}
          </div>
        )}
      </div>

      {/* Price, Quantity, Tax Rate Row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Unit Price */}
        <div>
          <FormField
            control={control}
            name={`productDetails.products.${index}.price`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Unit Price</FormLabel>
                <div className="flex items-center">
                  <span className="bg-muted text-muted-foreground flex h-9 w-10 items-center justify-center rounded-l-md border border-r-0 text-sm">₹</span>
                  <FormControl>
                    <Input
                      id={`productDetails.products.${index}.price`}
                      type="text"
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : Number.parseFloat(e.target.value);
                        field.onChange(value);
                      }}
                      className="flex-1 rounded-l-none"
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Quantity */}
        <div>
          <FormField
            control={control}
            name={`productDetails.products.${index}.quantity`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Quantity</FormLabel>
                <div className="flex items-center">
                  <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-r-none" onClick={() => handleQuantityChange(-1)}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <FormControl>
                    <Input
                      id={`productDetails.products.${index}.quantity`}
                      type="text"
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 1 : Number.parseInt(e.target.value);
                        field.onChange(Math.max(1, value));
                      }}
                      className="h-9 min-w-0 flex-1 rounded-none text-center"
                    />
                  </FormControl>
                  <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-l-none" onClick={() => handleQuantityChange(1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Tax Rate */}
        <div>
          <FormField
            control={control}
            name={`productDetails.products.${index}.taxRate`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Tax Rate</FormLabel>
                <div className="flex items-center">
                  <FormControl>
                    <Input
                      id={`productDetails.products.${index}.taxRate`}
                      type="text"
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : Number.parseFloat(e.target.value);
                        field.onChange(value);
                      }}
                      className="flex-1 rounded-r-none"
                    />
                  </FormControl>
                  <span className="bg-muted text-muted-foreground flex h-9 w-10 items-center justify-center rounded-r-md border border-l-0 text-sm">%</span>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* HSN Code Section - Only show if product name is filled */}
      {watch(`productDetails.products.${index}.name`) && watch(`productDetails.products.${index}.name`).length > 0 && (
        <div className="border-t pt-2">
          <FormField
            control={control}
            name={`productDetails.products.${index}.hsnCode`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-sm font-medium">
                  HSN Code
                  <span className="text-muted-foreground text-xs">(Optional)</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-4 w-4 p-0">
                          <Info className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Why is it important?</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </FormLabel>
                <FormControl>
                  <Input id={`productDetails.products.${index}.hsnCode`} placeholder="Enter product HSN Code" {...field} className="max-w-md" />
                </FormControl>
                <div className="text-muted-foreground mt-1 text-xs">
                  Don't know your HSN Code?{' '}
                  <Button variant="link" className="h-auto p-0 text-xs text-indigo-600">
                    Know Here
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </div>
  );
}

interface ProductDetailsFormProps {
  control: Control<OrderFormValues>;
  watch: UseFormWatch<OrderFormValues>;
}

export function ProductDetailsForm({ control, watch }: ProductDetailsFormProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'productDetails.products',
  });
  const { setValue } = useFormContext<OrderFormValues>();

  const totalAmount =
    watch('productDetails.products')?.reduce((acc, item) => {
      const itemPrice = Number(item.price) || 0;
      const itemUnits = Number(item.quantity) || 0;
      return acc + itemPrice * itemUnits;
    }, 0) || 0;

  // Update taxableValue whenever totalAmount changes
  useEffect(() => {
    setValue('productDetails.taxableValue', totalAmount, {
      shouldValidate: true,
      shouldDirty: true,
    });
  }, [totalAmount, setValue]);

  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <ProductRow key={field.id} index={index} control={control} watch={watch} remove={remove} productsLength={fields.length} />
      ))}

      <div className="flex justify-start">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            append({
              id: '',
              name: '',
              price: 0,
              quantity: 1,
              taxRate: 0,
              hsnCode: '',
            })
          }
          className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Another Product
        </Button>
      </div>

      <Alert className="border-gray-200 bg-gray-50 dark:border-stone-700 dark:bg-stone-800">
        <AlertTitle className="text-lg font-semibold">Total Order Value: {currencyFormatter(totalAmount)}</AlertTitle>
        <AlertDescription className="text-sm text-gray-600 dark:text-gray-400">
          The total order value is the sum of the prices of all the products in the order.
        </AlertDescription>
      </Alert>
    </div>
  );
}
