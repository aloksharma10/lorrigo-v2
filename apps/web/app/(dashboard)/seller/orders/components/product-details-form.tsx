"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Info, Minus, Plus, Trash2 } from "lucide-react"
import {
  Button,
  Input,
  Label,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Form,
} from "@lorrigo/ui/components"

import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { type ProductFormValues, productDetailsSchema } from "../types"

interface ProductDetailsFormProps {
  onSubmit: (values: ProductFormValues) => void
  errors?: Record<string, any>
}

// Product interfaces
interface Product {
  id: string
  name: string
  price: number
  hsnCode?: string
}

// This is a mock API function that would be replaced with a real API call
async function fetchProducts(query: string): Promise<Product[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Mock data
  return [
    { id: "5J091710752", name: "Vastu Product", price: 10 },
    { id: "test1", name: "test product // - test product //", price: 15 },
    { id: "dummy1", name: "dummy product - dummy product", price: 20 },
    { id: "prod13", name: "Product 13 - Product 13", price: 25 },
    { id: "home25", name: "Home & Kitchen - Product 25", price: 30 },
  ].filter(
    (product) =>
      !query ||
      product.name.toLowerCase().includes(query.toLowerCase()) ||
      product.id.toLowerCase().includes(query.toLowerCase()),
  )
}

interface ProductRowProps {
  index: number
  control: any
  register: any
  setValue: any
  getValues: any
  errors: any
  remove: any
  productsLength: number
}

function ProductRow({
  index,
  control,
  register,
  setValue,
  getValues,
  errors,
  remove,
  productsLength,
}: ProductRowProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [productOptions, setProductOptions] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    const fetchProductOptions = async () => {
      if (isDropdownOpen && searchQuery) {
        setIsLoading(true)
        try {
          const data = await fetchProducts(searchQuery)
          setProductOptions(data)
        } catch (error) {
          console.error("Error fetching products:", error)
        } finally {
          setIsLoading(false)
        }
      }
    }

    fetchProductOptions()
  }, [searchQuery, isDropdownOpen])

  const handleProductSelect = async (selectedProduct: Product) => {
    setValue(`products.${index}.name`, selectedProduct.name)
    setValue(`products.${index}.price`, selectedProduct.price)
    setValue(`products.${index}.id`, selectedProduct.id)
    if (selectedProduct.hsnCode) {
      setValue(`products.${index}.hsnCode`, selectedProduct.hsnCode)
    }
    setIsDropdownOpen(false)
  }

  const handleQuantityChange = (change: number) => {
    const currentQuantity = getValues(`products.${index}.quantity`) || 1
    const newQuantity = Math.max(1, currentQuantity + change)
    setValue(`products.${index}.quantity`, newQuantity)
  }

  return (
    <div className="mb-4 grid gap-4 lg:grid-cols-10">
      <div className="relative col-span-4" ref={dropdownRef}>
        <Label htmlFor={`products.${index}.name`} className="text-sm font-medium text-indigo-600">
          Product Name
        </Label>
        <div className="relative">
          <Input
            id={`products.${index}.name`}
            {...register(`products.${index}.name`)}
            value={getValues(`products.${index}.name`) || searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setValue(`products.${index}.name`, e.target.value)
              if (!isDropdownOpen) setIsDropdownOpen(true)
            }}
            onClick={() => setIsDropdownOpen(true)}
            placeholder="Enter or search your product name"
            className="mt-1"
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
                <div className="text-muted-foreground p-4 text-center text-sm">No products found</div>
              )}
            </div>
          )}
        </div>
        {errors?.products?.[index]?.name && (
          <p className="mt-1 text-sm text-red-500">{errors.products[index].name.message}</p>
        )}

        {getValues(`products.${index}.name`) && getValues(`products.${index}.name`).length > 0 && (
          <div className="mt-2">
            <Label htmlFor={`products.${index}.hsnCode`} className="flex items-center gap-1 text-sm font-medium">
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
            </Label>
            <Input
              id={`products.${index}.hsnCode`}
              {...register(`products.${index}.hsnCode`)}
              placeholder="Enter product HSN Code"
              className="mt-1"
            />
            {errors?.products?.[index]?.hsnCode && (
              <p className="mt-1 text-sm text-red-500">{errors.products[index].hsnCode.message}</p>
            )}
            <div className="text-muted-foreground mt-1 text-xs">
              Don&apos;t know your HSN Code?{" "}
              <Button variant="link" className="h-auto p-0 text-xs text-indigo-600">
                Know Here
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="col-span-2">
        <Label htmlFor={`products.${index}.price`} className="text-sm font-medium">
          Unit Price
        </Label>
        <div className="mt-1 flex items-center">
          <span className="bg-muted text-muted-foreground flex h-9 w-10 items-center justify-center rounded-l-md border border-r-0">
            ₹
          </span>
          <Input
            id={`products.${index}.price`}
            type="text"
            {...register(`products.${index}.price`, {
              valueAsNumber: true,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                const value = e.target.value === "" ? 0 : Number.parseFloat(e.target.value)
                setValue(`products.${index}.price`, value)
              },
            })}
            className="rounded-l-none"
          />
        </div>
        {errors?.products?.[index]?.price && (
          <p className="mt-1 text-sm text-red-500">{errors.products[index].price.message}</p>
        )}
      </div>

      <div className="col-span-2">
        <Label htmlFor={`products.${index}.quantity`} className="text-sm font-medium">
          Quantity
        </Label>
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
          <Input
            id={`products.${index}.quantity`}
            type="text"
            {...register(`products.${index}.quantity`, {
              valueAsNumber: true,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                const value = e.target.value === "" ? 1 : Number.parseInt(e.target.value)
                setValue(`products.${index}.quantity`, Math.max(1, value))
              },
            })}
            className="h-10 rounded-none text-center"
          />
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
        {errors?.products?.[index]?.quantity && (
          <p className="mt-1 text-sm text-red-500">{errors.products[index].quantity.message}</p>
        )}
      </div>

      <div className="col-span-1">
        <Label htmlFor={`products.${index}.taxRate`} className="flex items-center gap-1 text-sm font-medium">
          Tax Rate
          <span className="text-muted-foreground text-xs">(Optional)</span>
        </Label>
        <div className="mt-1 flex items-center">
          <Input
            id={`products.${index}.taxRate`}
            type="text"
            {...register(`products.${index}.taxRate`, {
              valueAsNumber: true,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                const value = e.target.value === "" ? 0 : Number.parseFloat(e.target.value)
                setValue(`products.${index}.taxRate`, value)
              },
            })}
            className="rounded-r-none"
          />
          <span className="bg-muted text-muted-foreground flex h-9 w-10 items-center justify-center rounded-r-md border border-l-0">
            %
          </span>
        </div>
        {errors?.products?.[index]?.taxRate && (
          <p className="mt-1 text-sm text-red-500">{errors.products[index].taxRate.message}</p>
        )}
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
  )
}

export function ProductDetailsForm({ onSubmit, errors }: ProductDetailsFormProps) {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productDetailsSchema),
    defaultValues: {
      products: [
        {
          id: "",
          name: "",
          price: 0,
          quantity: 1,
          taxRate: 0,
          hsnCode: "",
        },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "products",
  })

  // Watch for form changes and update parent
  useEffect(() => {
    const subscription = form.watch((value) => {
      onSubmit(value as ProductFormValues)
    })
    return () => subscription.unsubscribe()
  }, [form, onSubmit])

  // Add this effect to handle errors passed from parent
  useEffect(() => {
    if (errors) {
      Object.entries(errors).forEach(([key, value]) => {
        if (value && typeof value === "object" && "message" in value) {
          form.setError(key as any, {
            type: "manual",
            message: value.message as string,
          })
        }
      })
    }
  }, [errors, form])

  function handleSubmit(values: ProductFormValues) {
    onSubmit(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {fields.map((field, index) => (
          <ProductRow
            key={field.id}
            index={index}
            control={form.control}
            register={form.register}
            setValue={form.setValue}
            getValues={form.getValues}
            errors={form.formState.errors}
            remove={remove}
            productsLength={fields.length}
          />
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() =>
            append({
              id: "",
              name: "",
              price: 0,
              quantity: 1,
              taxRate: 0,
              hsnCode: "",
            })
          }
          className="mt-2 text-indigo-600"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Another Product
        </Button>
      </form>
    </Form>
  )
}
