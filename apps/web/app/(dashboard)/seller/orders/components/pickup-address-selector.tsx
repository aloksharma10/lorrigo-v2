"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronDown, ChevronUp, Edit, Plus } from "lucide-react"
import { Button, Input, Badge } from "@lorrigo/ui/components"

interface Address {
   id: string
   name: string
   address: string
   verified: boolean
}

interface PickupAddressSelectorProps {
   onAddressSelect: (address: Address | null) => void
}

// This is a mock API function that would be replaced with a real API call
async function fetchAddresses(query: string): Promise<Address[]> {
   // Simulate API delay
   await new Promise((resolve) => setTimeout(resolve, 500))

   // Mock data
   return [
      {
         id: "longo",
         name: "Longo",
         address: "E-18, Sector-3, Rohini, Delhi E-18, Sector-3, Rohini, Delhi Delhi-110085",
         verified: true,
      },
      {
         id: "parcelx170",
         name: "ParcelX170",
         address: "110081 A-4 4th FLOOR NAND RAM PARK PARJAPAT COLONY UTTAM NAGAR Delhi Delhi-110059",
         verified: false,
      },
      {
         id: "parcelx168",
         name: "ParcelX168",
         address:
            "ShopNo.4 Unit 13 2nd Floor Block F Sayona BIPL City Centre Palanpur 385001 Banaskantha Gujarat INDI BANASKANTHA Gujarat-385001",
         verified: false,
      },
      {
         id: "parcelx167",
         name: "ParcelX167",
         address:
            "Sharda Castle C-Wing 4 4th floor Behind Punjab National Bank O.T.Section Ulhasnagar 4. THANE Maharashtra-421004",
         verified: false,
      },
      {
         id: "parcelx162",
         name: "ParcelX162",
         address: "O/Opposite Yajonda Residency Alkapuri GWALIOR Madhya Pradesh-474004",
         verified: false,
      },
   ].filter(
      (addr) =>
         !query ||
         addr.name.toLowerCase().includes(query.toLowerCase()) ||
         addr.address.toLowerCase().includes(query.toLowerCase()),
   )
}

export function PickupAddressSelector({ onAddressSelect }: PickupAddressSelectorProps) {
   const [isOpen, setIsOpen] = useState(false)
   const [searchQuery, setSearchQuery] = useState("")
   const [addresses, setAddresses] = useState<Address[]>([])
   const [selectedAddress, setSelectedAddress] = useState<Address | null>(null)
   const [isLoading, setIsLoading] = useState(false)
   const dropdownRef = useRef<HTMLDivElement>(null)

   // Close dropdown when clicking outside
   useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
         if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setIsOpen(false)
         }
      }

      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
   }, [])

   // Fetch addresses when search query changes
   useEffect(() => {
      const fetchData = async () => {
         if (isOpen) {
            setIsLoading(true)
            try {
               const data = await fetchAddresses(searchQuery)
               setAddresses(data)
            } catch (error) {
               console.error("Error fetching addresses:", error)
            } finally {
               setIsLoading(false)
            }
         }
      }

      fetchData()
   }, [searchQuery, isOpen])

   const handleAddressSelect = (address: Address) => {
      setSelectedAddress(address)
      setIsOpen(false)
      onAddressSelect(address)
   }

   return (
      <div className="relative" ref={dropdownRef}>
         <div className="flex gap-2">
            <div className="relative flex-1">
               <Input
                  placeholder="Search by pickup location"
                  value={selectedAddress ? selectedAddress.address : searchQuery}
                  onChange={(e) => {
                     setSearchQuery(e.target.value)
                     setSelectedAddress(null)
                     onAddressSelect(null)
                     if (!isOpen) setIsOpen(true)
                  }}
                  onClick={() => setIsOpen(true)}
                  className="pr-10"
               />
               <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setIsOpen(!isOpen)}
               >
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
               </Button>
            </div>
            <Button variant="outline" size="icon">
               <Edit className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
               <Plus className="h-4 w-4" />
            </Button>
         </div>

         {isOpen && (
            <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg">
               {isLoading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
               ) : addresses.length > 0 ? (
                  <ul className="max-h-80 overflow-auto py-1">
                     {addresses.map((address) => (
                        <li
                           key={address.id}
                           className="cursor-pointer px-4 py-2 hover:bg-muted"
                           onClick={() => handleAddressSelect(address)}
                        >
                           <div className="flex items-center justify-between">
                              <div>
                                 <span className="font-medium">{address.name}</span>
                                 <span className="text-muted-foreground"> | </span>
                                 <span className="text-sm">{address.address}</span>
                              </div>
                              <Badge variant={address.verified ? "success" : "destructive"} className="ml-2">
                                 {address.verified ? "Verified" : "Unverified"}
                              </Badge>
                           </div>
                        </li>
                     ))}
                  </ul>
               ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">No addresses found</div>
               )}
            </div>
         )}
      </div>
   )
}
