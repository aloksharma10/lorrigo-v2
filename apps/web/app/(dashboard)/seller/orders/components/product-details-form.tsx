"use client"

import { useState, useEffect } from "react"
import { Info, Minus, Plus, Trash2 } from "lucide-react"
import {
   Button,
   Input,
   Label,
   Tooltip,
   TooltipContent,
   TooltipProvider,
   TooltipTrigger
} from "@lorrigo/ui/components"

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
  product: {
    id: string
    name: string
    price: number
    quantity: number
    discount: number
    taxRate: number
    hsnCode?: string
  }
  onProductChange: (index: number, field: string, value: any) => void
  onRemove: (index: number) => void
  isLast: boolean
}

function ProductRow({ index, product, onProductChange, onRemove, isLast }: ProductRowProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [productOptions, setProductOptions] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)

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
    onProductChange(index, "name", selectedProduct.name)
    onProductChange(index, "price", selectedProduct.price)
    onProductChange(index, "id", selectedProduct.id)
    if (selectedProduct.hsnCode) {
      onProductChange(index, "hsnCode", selectedProduct.hsnCode)
    }
    setIsDropdownOpen(false)
  }

  const handleQuantityChange = (change: number) => {
    const newQuantity = Math.max(1, product.quantity + change)
    onProductChange(index, "quantity", newQuantity)
  }

  return (
    <div className="grid grid-cols-12 gap-4 mb-4">
      <div className="col-span-4 relative">
        <Label htmlFor={`product-name-${index}`} className="text-sm font-medium text-indigo-600">
          Product Name
        </Label>
        <div className="relative">
          <Input
            id={`product-name-${index}`}
            value={product.name || searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              if (!isDropdownOpen) setIsDropdownOpen(true)
            }}
            onClick={() => setIsDropdownOpen(true)}
            placeholder="Enter or search your product name"
            className="mt-1"
          />

          {isDropdownOpen && (
            <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg">
              {isLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
              ) : productOptions.length > 0 ? (
                <ul className="max-h-60 overflow-auto py-1">
                  {productOptions.map((option) => (
                    <li
                      key={option.id}
                      className="cursor-pointer px-4 py-2 hover:bg-muted"
                      onClick={() => handleProductSelect(option)}
                    >
                      <div className="font-medium">
                        {option.id} - {option.name}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">No products found</div>
              )}
            </div>
          )}
        </div>

        {product.name && product.name.length > 0 && (
          <div className="mt-2">
            <Label htmlFor={`hsn-code-${index}`} className="text-sm font-medium flex items-center gap-1">
              HSN Code
              <span className="text-xs text-muted-foreground">(Optional)</span>
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
              id={`hsn-code-${index}`}
              value={product.hsnCode || ""}
              onChange={(e) => onProductChange(index, "hsnCode", e.target.value)}
              placeholder="Enter product HSN Code"
              className="mt-1"
            />
            <div className="mt-1 text-xs text-muted-foreground">
              Don&apos;t know your HSN Code?{" "}
              <Button variant="link" className="h-auto p-0 text-xs text-indigo-600">
                Know Here
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="col-span-2">
        <Label htmlFor={`unit-price-${index}`} className="text-sm font-medium">
          Unit Price
        </Label>
        <div className="flex items-center mt-1">
          <span className="flex h-10 w-10 items-center justify-center rounded-l-md border border-r-0 bg-muted text-muted-foreground">
            ₹
          </span>
          <Input
            id={`unit-price-${index}`}
            type="text"
            value={product.price || ""}
            onChange={(e) => onProductChange(index, "price", Number.parseFloat(e.target.value) || 0)}
            className="rounded-l-none"
          />
        </div>
      </div>

      <div className="col-span-2">
        <Label htmlFor={`quantity-${index}`} className="text-sm font-medium">
          Quantity
        </Label>
        <div className="flex items-center mt-1">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-r-none"
            onClick={() => handleQuantityChange(-1)}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Input
            id={`quantity-${index}`}
            type="text"
            value={product.quantity}
            onChange={(e) => onProductChange(index, "quantity", Number.parseInt(e.target.value) || 1)}
            className="h-10 rounded-none text-center"
          />
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-l-none"
            onClick={() => handleQuantityChange(1)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="col-span-2">
        <Label htmlFor={`discount-${index}`} className="text-sm font-medium flex items-center gap-1">
          Product Discount
          <span className="text-xs text-muted-foreground">(Optional)</span>
        </Label>
        <div className="flex items-center mt-1">
          <span className="flex h-10 w-10 items-center justify-center rounded-l-md border border-r-0 bg-muted text-muted-foreground">
            ₹
          </span>
          <Input
            id={`discount-${index}`}
            type="text"
            value={product.discount || ""}
            onChange={(e) => onProductChange(index, "discount", Number.parseFloat(e.target.value) || 0)}
            className="rounded-l-none rounded-r-none"
          />
        </div>
      </div>

      <div className="col-span-1">
        <Label htmlFor={`tax-rate-${index}`} className="text-sm font-medium flex items-center gap-1">
          Tax Rate
          <span className="text-xs text-muted-foreground">(Optional)</span>
        </Label>
        <div className="flex items-center mt-1">
          <Input
            id={`tax-rate-${index}`}
            type="text"
            value={product.taxRate || ""}
            onChange={(e) => onProductChange(index, "taxRate", Number.parseFloat(e.target.value) || 0)}
            className="rounded-r-none"
          />
          <span className="flex h-10 w-10 items-center justify-center rounded-r-md border border-l-0 bg-muted text-muted-foreground">
            %
          </span>
        </div>
      </div>

      <div className="col-span-1 flex items-end justify-center mb-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(index)}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}

export function ProductDetailsForm() {
  const [products, setProducts] = useState([
    {
      id: "",
      name: "",
      price: 0,
      quantity: 1,
      discount: 0,
      taxRate: 0,
      hsnCode: "",
    },
  ])

  const handleProductChange = (index: number, field: string, value: any) => {
    const updatedProducts = [...products]
    updatedProducts[index] = {
      ...updatedProducts[index],
      [field]: value,
    }
    setProducts(updatedProducts)
  }

  const handleAddProduct = () => {
    setProducts([
      ...products,
      {
        id: "",
        name: "",
        price: 0,
        quantity: 1,
        discount: 0,
        taxRate: 0,
        hsnCode: "",
      },
    ])
  }

  const handleRemoveProduct = (index: number) => {
    if (products.length > 1) {
      const updatedProducts = [...products]
      updatedProducts.splice(index, 1)
      setProducts(updatedProducts)
    }
  }

  return (
    <div>
      {products.map((product, index) => (
        <ProductRow
          key={index}
          index={index}
          product={product}
          onProductChange={handleProductChange}
          onRemove={handleRemoveProduct}
          isLast={index === products.length - 1}
        />
      ))}

      <Button variant="outline" onClick={handleAddProduct} className="mt-2 text-indigo-600">
        <Plus className="h-4 w-4 mr-2" />
        Add Another Product
      </Button>
    </div>
  )
}
