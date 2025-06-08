import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "./axios"

export interface CourierRate {
  nickName: string
  name: string
  minWeight: number
  cod: number
  isReversedCourier: boolean
  rtoCharges: number
  charge: number
  type: "EXPRESS" | "SURFACE" | "AIR"
  expectedPickup: string
  carrierId: string
  order_zone: string
  courier: {
    id: string
    name: string
    courier_code: string
    is_cod_applicable: boolean
    is_fw_applicable: boolean
    is_rto_applicable: boolean
  }
}

export interface ShippingRatesResponse {
  rates: CourierRate[]
  order: any
}

export const useShippingOperations = () => {
  const queryClient = useQueryClient()

  // Fetch shipping rates for an order
  const getShippingRates = (orderId: string) => {
    return useQuery({
      queryKey: ["shipping-rates", orderId],
      queryFn: () => api.get(`/orders/${orderId}/rates`).then((res: any) => res.data as ShippingRatesResponse),
      enabled: !!orderId,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
    })
  }

  // Ship order with selected courier
  const shipOrder = useMutation({
    mutationFn: ({ orderId, carrierId }: { orderId: string; carrierId: string }) =>
      api.post(`/orders/${orderId}/ship`, { carrierId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] })
    },
  })

  return {
    getShippingRates,
    shipOrder,
  }
}
