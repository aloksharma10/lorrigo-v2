"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { X, MapPin, Package, CreditCard, Weight, AlertTriangle, Clock, Calendar, Truck, Info } from "lucide-react"
import { toast, Button, Separator, Alert, AlertDescription, Badge, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Tabs, TabsList, TabsTrigger, Card, CardContent, CardHeader, CardTitle } from "@lorrigo/ui/components"
import { CourierLogo } from "@/components/courier-logo"
import { RatingBadge } from "@/components/rating-badge"
import { useShippingOperations, type CourierRate } from "@/lib/apis/shipment"

export default function ShipOrderPage() {
   const params = useParams()
   const orderId = params.orderId as string
   const [activeTab, setActiveTab] = useState("All")
   const [sortBy, setSortBy] = useState("custom")
   const [isShipping, setIsShipping] = useState<string | null>(null)

   const { getShippingRates, shipOrder } = useShippingOperations()
   const { data, isLoading, error } = getShippingRates(orderId)

   const handleShipOrder = async (carrierId: string, courierName: string) => {
      setIsShipping(carrierId)
      try {
         await shipOrder.mutateAsync({ orderId, carrierId })
         toast.success(`Order has been assigned to ${courierName}`)
      } catch (error) {
         toast.error("Failed to ship the order. Please try again.")
      } finally {
         setIsShipping(null)
      }
   }

   const filterCouriersByTab = (rates: CourierRate[]) => {
      if (activeTab === "All") return rates
      if (activeTab === "Air") return rates.filter((rate) => rate.type === "AIR")
      if (activeTab === "Surface") return rates.filter((rate) => rate.type === "SURFACE")
      if (activeTab === "Self-Fulfilled") return rates.filter((rate) => rate.name.includes("Self"))
      if (activeTab === "Non-Serviceable") return rates.filter((rate) => !rate.courier.is_fw_applicable)
      return rates
   }

   const sortCouriers = (rates: CourierRate[]) => {
      const sorted = [...rates]
      if (sortBy === "price-low") return sorted.sort((a, b) => a.charge - b.charge)
      if (sortBy === "price-high") return sorted.sort((a, b) => b.charge - a.charge)
      if (sortBy === "rating") return sorted.sort((a, b) => 4.5 - 4.0) // Mock rating sort
      return sorted
   }

   if (isLoading) {
      return (
         <div className="container mx-auto py-6">
            <div className="flex items-center justify-center h-64">
               <div className="text-center">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground animate-pulse" />
                  <p className="mt-2 text-muted-foreground">Loading shipping rates...</p>
               </div>
            </div>
         </div>
      )
   }

   if (error || !data) {
      return (
         <div className="container mx-auto py-6">
            <Alert variant="destructive">
               <AlertTriangle className="h-4 w-4" />
               <AlertDescription>Failed to load shipping rates. Please try again.</AlertDescription>
            </Alert>
         </div>
      )
   }

   const filteredRates = sortCouriers(filterCouriersByTab(data.rates))
   const order = data.order

   return (
      <div className="min-h-screen bg-gray-50">
         <div className="flex">
            {/* Left Panel - Order Details */}
            <div className="w-80 bg-white border-r border-gray-200 p-6 space-y-6">
               <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Order Details</h2>
                  <Button variant="ghost" size="sm">
                     <X className="h-4 w-4" />
                  </Button>
               </div>

               <div className="space-y-4">
                  {/* Pickup Location */}
                  <div>
                     <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <MapPin className="h-4 w-4" />
                        Pickup From
                     </div>
                     <div className="font-medium">110080, Delhi</div>
                     <div className="text-sm text-muted-foreground">India</div>
                  </div>

                  <Separator />

                  {/* Delivery Location */}
                  <div>
                     <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <MapPin className="h-4 w-4" />
                        Deliver To
                     </div>
                     <div className="font-medium">203205, Uttar Pradesh</div>
                     <div className="text-sm text-muted-foreground">India</div>
                  </div>

                  <Separator />

                  {/* Order Value */}
                  <div>
                     <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <CreditCard className="h-4 w-4" />
                        Order Value
                     </div>
                     <div className="font-medium text-lg">₹40.00</div>
                  </div>

                  <Separator />

                  {/* Payment Mode */}
                  <div>
                     <div className="text-sm text-muted-foreground mb-1">Payment Mode</div>
                     <Badge variant="secondary">Prepaid</Badge>
                  </div>

                  <Separator />

                  {/* Weight */}
                  <div>
                     <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Weight className="h-4 w-4" />
                        Applicable Weight (in Kg)
                     </div>
                     <div className="font-medium">0.5 Kg</div>
                  </div>
               </div>

               {/* Buyer Insights */}
               <Card>
                  <CardHeader className="pb-3">
                     <CardTitle className="text-base">Buyer Insights</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                     <div>
                        <div className="text-sm text-muted-foreground mb-2">Last Successful Delivery To Buyer:</div>
                        <div className="space-y-2">
                           <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                                 <Package className="h-3 w-3 text-orange-600" />
                              </div>
                              <div>
                                 <div className="font-medium text-sm">On Your Store</div>
                                 <div className="text-xs text-muted-foreground">No orders yet</div>
                              </div>
                           </div>
                           <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                                 <Truck className="h-3 w-3 text-orange-600" />
                              </div>
                              <div>
                                 <div className="font-medium text-sm">On Shiprocket</div>
                                 <div className="text-xs text-muted-foreground">No orders yet</div>
                              </div>
                           </div>
                        </div>
                     </div>
                     <Button variant="outline" size="sm" className="w-full">
                        View All Details
                     </Button>
                  </CardContent>
               </Card>
            </div>

            {/* Right Panel - Courier Selection */}
            <div className="flex-1 p-6">
               <div className="max-w-6xl mx-auto space-y-6">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                     <h1 className="text-2xl font-bold">Select Courier Partner</h1>
                     <Button variant="ghost" size="sm">
                        <X className="h-4 w-4" />
                     </Button>
                  </div>

                  {/* Tabs and Sort */}
                  <div className="flex items-center justify-between">
                     <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-fit grid-cols-5">
                           <TabsTrigger value="All">All</TabsTrigger>
                           <TabsTrigger value="Air">Air</TabsTrigger>
                           <TabsTrigger value="Surface">Surface</TabsTrigger>
                           <TabsTrigger value="Self-Fulfilled">Self-Fulfilled</TabsTrigger>
                           <TabsTrigger value="Non-Serviceable" className="relative">
                              Non-Serviceable
                              <AlertTriangle className="ml-1 h-3 w-3 text-orange-500" />
                           </TabsTrigger>
                        </TabsList>
                     </Tabs>

                     <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-64">
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                           <SelectItem value="custom">Sort By: Custom (Sorted on courier priorities)</SelectItem>
                           <SelectItem value="price-low">Price: Low to High</SelectItem>
                           <SelectItem value="price-high">Price: High to Low</SelectItem>
                           <SelectItem value="rating">Rating: High to Low</SelectItem>
                        </SelectContent>
                     </Select>
                  </div>

                  {/* Warning Alert */}
                  <Alert className="border-orange-200 bg-orange-50">
                     <AlertTriangle className="h-4 w-4 text-orange-600" />
                     <AlertDescription className="text-orange-800">
                        Some of your frequently used courier partners are non serviceable. Please check the Non-Serviceable tab
                        for more details
                     </AlertDescription>
                  </Alert>

                  {/* Couriers Count */}
                  <div className="text-sm text-muted-foreground">{filteredRates.length} Couriers Found</div>

                  {/* Couriers Table */}
                  <Card>
                     <CardContent className="p-0">
                        <div className="overflow-x-auto">
                           <table className="w-full">
                              <thead className="border-b bg-gray-50">
                                 <tr>
                                    <th className="text-left p-4 font-medium text-sm">Courier Partner</th>
                                    <th className="text-left p-4 font-medium text-sm">Rating</th>
                                    <th className="text-left p-4 font-medium text-sm">Expected Pickup</th>
                                    <th className="text-left p-4 font-medium text-sm">Estimated Delivery</th>
                                    <th className="text-left p-4 font-medium text-sm">
                                       <div className="flex items-center gap-1">
                                          Chargeable Weight
                                          <Info className="h-3 w-3 text-muted-foreground" />
                                       </div>
                                    </th>
                                    <th className="text-left p-4 font-medium text-sm">
                                       <div className="flex items-center gap-1">
                                          Charges
                                          <Info className="h-3 w-3 text-muted-foreground" />
                                       </div>
                                    </th>
                                    <th className="text-left p-4 font-medium text-sm">Action</th>
                                 </tr>
                              </thead>
                              <tbody>
                                 {filteredRates.map((rate, index) => (
                                    <tr key={rate.carrierId} className="border-b hover:bg-gray-50">
                                       <td className="p-4">
                                          <div className="flex items-center gap-3">
                                             {index === 0 && (
                                                <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-xs">
                                                   Recommended
                                                </Badge>
                                             )}
                                             <CourierLogo courierName={rate.name} />
                                             <div>
                                                <div className="font-medium">{rate.name}</div>
                                                <div className="text-sm text-muted-foreground">
                                                   {rate.type} | Min-weight: {rate.minWeight} Kg
                                                </div>
                                                <div className="text-sm text-muted-foreground">RTO Charges: ₹{rate.rtoCharges}</div>
                                             </div>
                                          </div>
                                       </td>
                                       <td className="p-4">
                                          <RatingBadge rating={4.0 + Math.random() * 0.8} />
                                       </td>
                                       <td className="p-4">
                                          <div className="flex items-center gap-2">
                                             <Clock className="h-4 w-4 text-muted-foreground" />
                                             <span>{rate.expectedPickup}</span>
                                          </div>
                                       </td>
                                       <td className="p-4">
                                          <div className="flex items-center gap-2">
                                             <Calendar className="h-4 w-4 text-muted-foreground" />
                                             <span>Jun 12, 2025</span>
                                          </div>
                                       </td>
                                       <td className="p-4">
                                          <span>{rate.minWeight} Kg</span>
                                       </td>
                                       <td className="p-4">
                                          <div className="font-bold text-lg">₹{rate.charge}</div>
                                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                             <Info className="h-3 w-3" />
                                          </div>
                                       </td>
                                       <td className="p-4">
                                          <Button
                                             onClick={() => handleShipOrder(rate.carrierId, rate.name)}
                                             disabled={isShipping === rate.carrierId}
                                             className="bg-purple-600 hover:bg-purple-700"
                                          >
                                             {isShipping === rate.carrierId ? "Shipping..." : "Ship Now"}
                                          </Button>
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     </CardContent>
                  </Card>

                  {/* Auto-Scheduled Pickup Info */}
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                     <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                     <span>Auto-Scheduled Pickup</span>
                     <span className="text-muted-foreground">Tomorrow</span>
                  </div>
               </div>
            </div>
         </div>
      </div>
   )
}
