'use client';

import type React from 'react';

import { useState, useEffect, useRef } from 'react';
import { Info, Minus, Plus, Trash2 } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Alert,
  AlertTitle,
  AlertDescription,
} from '@lorrigo/ui/components';

import { useFieldArray, Control, UseFormWatch, useFormContext } from 'react-hook-form';
import { OrderFormValues } from '../types';

interface Product {
  id: string;
  name: string;
  price: number;
  hsnCode?: string;
}

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
  const { setValue } = useFormContext<OrderFormValues>(); // Get setValue from form context

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchProductOptions = async () => {
      if (isDropdownOpen && searchQuery) {
        setIsLoading(true);
        try {
          const data = await fetchProducts(searchQuery);
          setProductOptions(data);
        } catch (error) {
          console.error('Error fetching products:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchProductOptions();
  }, [searchQuery, isDropdownOpen]);

  const handleProductSelect = (selectedProduct: Product) => {
    // Use setValue to update form fields, triggering re-renders and validation
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
    <div className="mb-4 grid gap-4 lg:grid-cols-10">
      <div className="relative col-span-4" ref={dropdownRef}>
        <Label
          htmlFor={`productDetails.products.${index}.name`}
          className="text-sm font-medium text-indigo-600"
        >
          Product Name
        </Label>
        <div className="relative">
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
                    className="mt-1"
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
                <ul className="max-h-60 overflow-auto py-1">
                  {productOptions.map((option) => (
                    <li
                      key={option.id}
                      className="hover:bg-muted cursor-pointer px-4 py-2"
                      onClick={() => handleProductSelect(option)}
                    >
                      <div className="font-medium">
                        {option.id} - {option.name}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-muted-foreground p-4 text-center text-sm">
                  No products found
                </div>
              )}
            </div>
          )}
        </div>
        {watch(`productDetails.products.${index}.name`) &&
          watch(`productDetails.products.${index}.name`).length > 0 && (
            <div className="mt-2">
              <FormField
                control={control}
                name={`productDetails.products.${index}.hsnCode`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1 text-sm font-medium">
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
                      <Input
                        id={`productDetails.products.${index}.hsnCode`}
                        placeholder="Enter product HSN Code"
                        {...field}
                        className="mt-1"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="text-muted-foreground mt-1 text-xs">
                Don't know your HSN Code?{' '}
                <Button variant="link" className="h-auto p-0 text-xs text-indigo-600">
                  Know Here
                </Button>
              </div>
            </div>
          )}
      </div>
      <div className="col-span-2">
        <FormField
          control={control}
          name={`productDetails.products.${index}.price`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit Price</FormLabel>
              <div className="mt-1 flex items-center">
                <span className="bg-muted text-muted-foreground flex h-9 w-10 items-center justify-center rounded-l-md border border-r-0">
                  ₹
                </span>
                <FormControl>
                  <Input
                    id={`productDetails.products.${index}.price`}
                    type="text"
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value === '' ? 0 : Number.parseFloat(e.target.value);
                      field.onChange(value);
                    }}
                    className="rounded-l-none"
                  />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="col-span-2">
        <FormField
          control={control}
          name={`productDetails.products.${index}.quantity`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity</FormLabel>
              <div className="mt-1 flex items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-r-none"
                  onClick={() => handleQuantityChange(-1)}
                >
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
                    className="h-10 rounded-none text-center"
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-l-none"
                  onClick={() => handleQuantityChange(1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="col-span-1">
        <FormField
          control={control}
          name={`productDetails.products.${index}.taxRate`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1 text-sm font-medium">
                Tax Rate
                <span className="text-muted-foreground text-xs">(Optional)</span>
              </FormLabel>
              <div className="mt-1 flex items-center">
                <FormControl>
                  <Input
                    id={`productDetails.products.${index}.taxRate`}
                    type="text"
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value === '' ? 0 : Number.parseFloat(e.target.value);
                      field.onChange(value);
                    }}
                    className="rounded-r-none"
                  />
                </FormControl>
                <span className="bg-muted text-muted-foreground flex h-9 w-10 items-center justify-center rounded-r-md border border-l-0">
                  %
                </span>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="col-span-1 mb-1 flex items-end justify-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => productsLength > 1 && remove(index)}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          disabled={productsLength <= 1}
        >
          <Trash2 className="h-5 w-5" />
        </Button>
      </div>
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
  const { setValue } = useFormContext<OrderFormValues>(); // Get setValue from form context

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
    <div className="space-y-6">
      {fields.map((field, index) => (
        <ProductRow
          key={field.id}
          index={index}
          control={control}
          watch={watch}
          remove={remove}
          productsLength={fields.length}
        />
      ))}
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
        className="mt-2 text-indigo-600"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Another Product
      </Button>
      <Alert className="bg-gray-200">
        <AlertTitle>Total Order Value: ₹{totalAmount}</AlertTitle>
        <AlertDescription>
          The total order value is the sum of the prices of all the products in the order.
        </AlertDescription>
      </Alert>
    </div>
  );
}

// Mock API function
async function fetchProducts(query: string): Promise<Product[]> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return [
    { id: '5J091710752', name: 'Vastu Product', price: 10 },
    { id: 'test1', name: 'test product // - test product //', price: 15 },
    { id: 'dummy1', name: 'dummy product - dummy product', price: 20 },
    { id: 'prod13', name: 'Product 13 - Product 13', price: 25 },
    { id: 'home25', name: 'Home & Kitchen - Product 25', price: 30 },
  ].filter(
    (product) =>
      !query ||
      product.name.toLowerCase().includes(query.toLowerCase()) ||
      product.id.toLowerCase().includes(query.toLowerCase())
  );
}
