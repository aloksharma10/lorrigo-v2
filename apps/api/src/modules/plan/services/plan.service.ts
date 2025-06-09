import { FastifyInstance } from 'fastify';
import { generatePlanId } from '../utils/id-generator';
import { getPincodeDetails } from '@/utils/pincode';
import { Zone } from '@lorrigo/db';
import {
  calculatePricesForCouriers,
  CourierWithPricing,
  PriceCalculationParams,
  validateCalculationParams,
} from '@/utils/calculate-order-price';

// Types
interface ZonePricingItem {
  base_price: number;
  increment_price: number;
  is_rto_same_as_fw: boolean;
  rto_base_price: number;
  rto_increment_price: number;
  flat_rto_charge: number;
}

interface ZonePricingData {
  withinCity: ZonePricingItem;
  withinZone: ZonePricingItem;
  withinMetro: ZonePricingItem;
  withinRoi: ZonePricingItem;
  northEast: ZonePricingItem;
}

interface PlanCourierPricingInput {
  courierId: string;
  cod_charge_hard: number;
  cod_charge_percent: number;
  is_cod_applicable: boolean;
  is_rto_applicable: boolean;
  is_fw_applicable: boolean;
  is_cod_reversal_applicable: boolean;
  weight_slab: number;
  increment_weight: number;
  increment_price: number;
  zonePricing: ZonePricingData;
}

export interface CreatePlanInput {
  name: string;
  description: string;
  isDefault: boolean;
  features: string[];
  courierPricing: PlanCourierPricingInput[];
}

export interface UpdatePlanInput {
  name?: string;
  description?: string;
  isDefault?: boolean;
  features?: string[];
  courierPricing?: PlanCourierPricingInput[];
}

export interface RateCalculationParams {
  pickupPincode: string;
  deliveryPincode: string;
  weight: number;
  weightUnit: 'kg' | 'g';
  boxLength: number;
  boxWidth: number;
  boxHeight: number;
  sizeUnit: 'cm' | 'in';
  paymentType: number; // 0 for prepaid, 1 for COD
  collectableAmount?: number;
  isReversedOrder?: boolean;
}

export interface RateCalculationResult {
  nickName?: string;
  name: string;
  minWeight: number;
  cod: number;
  isReversedCourier: boolean;
  rtoCharges: number;
  charge: number;
  type: string;
  expectedPickup: string;
  carrierId: string;
  order_zone: string;
  courier?: any;
}

export class PlanService {
  constructor(private fastify: FastifyInstance) {}

  async getAllPlans() {
    return this.fastify.prisma.plan.findMany({
      include: {
        plan_courier_pricings: {
          include: {
            courier: true,
            zone_pricing: true,
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async getPlanById(id: string) {
    return this.fastify.prisma.plan.findUnique({
      where: { id },
      include: {
        plan_courier_pricings: {
          include: {
            courier: true,
            zone_pricing: true,
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async createPlan(data: CreatePlanInput) {
    // If this plan is set as default, unset any existing default plans
    if (data.isDefault) {
      await this.fastify.prisma.plan.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    // Create the plan
    return this.fastify.prisma.plan.create({
      data: {
        name: data.name,
        code: generatePlanId('PL'),
        description: data.description,
        isDefault: data.isDefault,
        features: data.features,
        plan_courier_pricings: {
          create: data.courierPricing.map((pricing) => {
            // Process the zonePricing data to match the DB schema
            const zonePricingData = [
              {
                zone: Zone.WITHIN_CITY,
                base_price: pricing.zonePricing.withinCity.base_price,
                increment_price: pricing.zonePricing.withinCity.increment_price,
                is_rto_same_as_fw: pricing.zonePricing.withinCity.is_rto_same_as_fw,
                rto_base_price: pricing.zonePricing.withinCity.rto_base_price,
                rto_increment_price: pricing.zonePricing.withinCity.rto_increment_price,
                flat_rto_charge: pricing.zonePricing.withinCity.flat_rto_charge,
              },
              {
                zone: Zone.WITHIN_STATE,
                base_price: pricing.zonePricing.withinZone.base_price,
                increment_price: pricing.zonePricing.withinZone.increment_price,
                is_rto_same_as_fw: pricing.zonePricing.withinZone.is_rto_same_as_fw,
                rto_base_price: pricing.zonePricing.withinZone.rto_base_price,
                rto_increment_price: pricing.zonePricing.withinZone.rto_increment_price,
                flat_rto_charge: pricing.zonePricing.withinZone.flat_rto_charge,
              },
              {
                zone: Zone.WITHIN_METRO,
                base_price: pricing.zonePricing.withinMetro.base_price,
                increment_price: pricing.zonePricing.withinMetro.increment_price,
                is_rto_same_as_fw: pricing.zonePricing.withinMetro.is_rto_same_as_fw,
                rto_base_price: pricing.zonePricing.withinMetro.rto_base_price,
                rto_increment_price: pricing.zonePricing.withinMetro.rto_increment_price,
                flat_rto_charge: pricing.zonePricing.withinMetro.flat_rto_charge,
              },
              {
                zone: Zone.WITHIN_ROI,
                base_price: pricing.zonePricing.withinRoi.base_price,
                increment_price: pricing.zonePricing.withinRoi.increment_price,
                is_rto_same_as_fw: pricing.zonePricing.withinRoi.is_rto_same_as_fw,
                rto_base_price: pricing.zonePricing.withinRoi.rto_base_price,
                rto_increment_price: pricing.zonePricing.withinRoi.rto_increment_price,
                flat_rto_charge: pricing.zonePricing.withinRoi.flat_rto_charge,
              },
              {
                zone: Zone.NORTH_EAST,
                base_price: pricing.zonePricing.northEast.base_price,
                increment_price: pricing.zonePricing.northEast.increment_price,
                is_rto_same_as_fw: pricing.zonePricing.northEast.is_rto_same_as_fw,
                rto_base_price: pricing.zonePricing.northEast.rto_base_price,
                rto_increment_price: pricing.zonePricing.northEast.rto_increment_price,
                flat_rto_charge: pricing.zonePricing.northEast.flat_rto_charge,
              },
            ];
            return {
              courier: {
                connect: {
                  id: pricing.courierId,
                },
              },
              is_fw_applicable: pricing.is_fw_applicable,
              is_rto_applicable: pricing.is_rto_applicable,
              is_cod_applicable: pricing.is_cod_applicable,
              is_cod_reversal_applicable: pricing.is_cod_reversal_applicable,
              cod_charge_hard: pricing.cod_charge_hard,
              cod_charge_percent: pricing.cod_charge_percent,
              weight_slab: pricing.weight_slab,
              increment_weight: pricing.increment_weight,
              increment_price: pricing.increment_price,
              zone_pricing: {
                create: zonePricingData,
              },
            };
          }),
        },
      },
      include: {
        plan_courier_pricings: {
          include: {
            courier: true,
            zone_pricing: true,
          },
        },
      },
    });
  }

  async updatePlan(id: string, data: UpdatePlanInput) {
    // Check if plan exists
    const existingPlan = await this.fastify.prisma.plan.findUnique({ where: { id } });
    if (!existingPlan) {
      return null;
    }

    // If this plan is being set as default, unset any existing default plans
    if (data.isDefault) {
      await this.fastify.prisma.plan.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    // Update courier pricing if provided
    if (data.courierPricing && data.courierPricing.length > 0) {
      // Delete existing pricing and zone pricing
      const existingPricings = await this.fastify.prisma.planCourierPricing.findMany({
        where: { plan_id: id },
        include: { zone_pricing: true },
      });

      // Delete zone pricing first (due to foreign key constraints)
      for (const pricing of existingPricings) {
        if (pricing.zone_pricing.length > 0) {
          await this.fastify.prisma.zonePricing.deleteMany({
            where: { plan_courier_pricing_id: pricing.id },
          });
        }
      }

      // Then delete plan courier pricing
      await this.fastify.prisma.planCourierPricing.deleteMany({
        where: { plan_id: id },
      });

      // Create new pricing
      for (const pricing of data.courierPricing) {
        // Create PlanCourierPricing first
        const newPricing = await this.fastify.prisma.planCourierPricing.create({
          data: {
            plan_id: id,
            courier_id: pricing.courierId,
            is_cod_applicable: pricing.is_cod_applicable,
            is_rto_applicable: pricing.is_rto_applicable,
            is_fw_applicable: pricing.is_fw_applicable,
            is_cod_reversal_applicable: pricing.is_cod_reversal_applicable,
            weight_slab: pricing.weight_slab,
            increment_weight: pricing.increment_weight,
            cod_charge_hard: pricing.cod_charge_hard,
            cod_charge_percent: pricing.cod_charge_percent,
            increment_price: pricing.increment_price,
          },
        });

        // Then create the zone pricing
        await this.fastify.prisma.zonePricing.createMany({
          data: [
            {
              zone: 'WITHIN_CITY',
              base_price: pricing.zonePricing.withinCity.base_price,
              increment_price: pricing.zonePricing.withinCity.increment_price,
              is_rto_same_as_fw: pricing.zonePricing.withinCity.is_rto_same_as_fw,
              rto_base_price: pricing.zonePricing.withinCity.rto_base_price,
              rto_increment_price: pricing.zonePricing.withinCity.rto_increment_price,
              flat_rto_charge: pricing.zonePricing.withinCity.flat_rto_charge,
              plan_courier_pricing_id: newPricing.id,
            },
            {
              zone: 'WITHIN_STATE',
              base_price: pricing.zonePricing.withinZone.base_price,
              increment_price: pricing.zonePricing.withinZone.increment_price,
              is_rto_same_as_fw: pricing.zonePricing.withinZone.is_rto_same_as_fw,
              rto_base_price: pricing.zonePricing.withinZone.rto_base_price,
              rto_increment_price: pricing.zonePricing.withinZone.rto_increment_price,
              flat_rto_charge: pricing.zonePricing.withinZone.flat_rto_charge,
              plan_courier_pricing_id: newPricing.id,
            },
            {
              zone: 'WITHIN_METRO',
              base_price: pricing.zonePricing.withinMetro.base_price,
              increment_price: pricing.zonePricing.withinMetro.increment_price,
              is_rto_same_as_fw: pricing.zonePricing.withinMetro.is_rto_same_as_fw,
              rto_base_price: pricing.zonePricing.withinMetro.rto_base_price,
              rto_increment_price: pricing.zonePricing.withinMetro.rto_increment_price,
              flat_rto_charge: pricing.zonePricing.withinMetro.flat_rto_charge,
              plan_courier_pricing_id: newPricing.id,
            },
            {
              zone: 'WITHIN_ROI',
              base_price: pricing.zonePricing.withinRoi.base_price,
              increment_price: pricing.zonePricing.withinRoi.increment_price,
              is_rto_same_as_fw: pricing.zonePricing.withinRoi.is_rto_same_as_fw,
              rto_base_price: pricing.zonePricing.withinRoi.rto_base_price,
              rto_increment_price: pricing.zonePricing.withinRoi.rto_increment_price,
              flat_rto_charge: pricing.zonePricing.withinRoi.flat_rto_charge,
              plan_courier_pricing_id: newPricing.id,
            },
            {
              zone: 'NORTH_EAST',
              base_price: pricing.zonePricing.northEast.base_price,
              increment_price: pricing.zonePricing.northEast.increment_price,
              is_rto_same_as_fw: pricing.zonePricing.northEast.is_rto_same_as_fw,
              rto_base_price: pricing.zonePricing.northEast.rto_base_price,
              rto_increment_price: pricing.zonePricing.northEast.rto_increment_price,
              flat_rto_charge: pricing.zonePricing.northEast.flat_rto_charge,
              plan_courier_pricing_id: newPricing.id,
            },
          ],
        });
      }
    }

    // Update plan
    return this.fastify.prisma.plan.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        isDefault: data.isDefault,
        features: data.features,
      },
      include: {
        plan_courier_pricings: {
          include: {
            courier: true,
            zone_pricing: true,
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async deletePlan(id: string) {
    // Check if plan exists
    const existingPlan = await this.fastify.prisma.plan.findUnique({ where: { id } });
    if (!existingPlan) {
      return null;
    }

    // Check if users are assigned to this plan
    const usersWithPlan = await this.fastify.prisma.user.count({
      where: { plan_id: id },
    });

    if (usersWithPlan > 0) {
      throw new Error('Cannot delete plan that is assigned to users');
    }

    // Get plan courier pricings to delete zone pricing first
    const planCourierPricings = await this.fastify.prisma.planCourierPricing.findMany({
      where: { plan_id: id },
      select: { id: true },
    });

    // Delete zone pricing entries first due to foreign key constraints
    for (const pricing of planCourierPricings) {
      await this.fastify.prisma.zonePricing.deleteMany({
        where: { plan_courier_pricing_id: pricing.id },
      });
    }

    // Delete plan courier pricing
    await this.fastify.prisma.planCourierPricing.deleteMany({
      where: { plan_id: id },
    });

    // Delete plan
    return this.fastify.prisma.plan.delete({
      where: { id },
    });
  }

  async assignPlanToUser(planId: string, userId: string) {
    // Check if plan exists
    const plan = await this.fastify.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      return null;
    }

    // Check if user exists
    const user = await this.fastify.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return null;
    }

    // Assign plan to user
    return this.fastify.prisma.user.update({
      where: { id: userId },
      data: { plan_id: planId },
      select: {
        id: true,
        name: true,
        email: true,
        plan: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });
  }
  async getDefaultPlan() {
    return this.fastify.prisma.plan.findFirst({
      where: { isDefault: true },
      include: {
        plan_courier_pricings: {
          include: {
            courier: true,
            zone_pricing: true,
          },
        },
      },
    });
  }

  async getUserPlan(userId: string) {
    try {
      const user = await this.fastify.prisma.user.findUnique({
        where: { id: userId },
        include: {
          plan: {
            include: {
              plan_courier_pricings: {
                include: {
                  courier: true,
                  zone_pricing: true,
                },
              },
            },
          },
        },
      });

      if (!user || !user.plan) {
        // If user has no plan, return default plan
        return this.getDefaultPlan();
      }

      return user.plan;
    } catch (error) {
      console.error(`Error getting user plan for user ${userId}:`, error);
      // If there's an error, fallback to default plan
      return this.getDefaultPlan();
    }
  }

  async calculateRates(
    params: RateCalculationParams,
    userId: string
  ): Promise<RateCalculationResult[] | { message: string }[]> {
    try {
      // Convert to utility params format
      const utilityParams: PriceCalculationParams = {
        weight: params.weight,
        weightUnit: params.weightUnit,
        boxLength: params.boxLength,
        boxWidth: params.boxWidth,
        boxHeight: params.boxHeight,
        sizeUnit: 'cm',
        paymentType: params.paymentType as 0 | 1,
        collectableAmount: params.collectableAmount,
        pickupPincode: params.pickupPincode,
        deliveryPincode: params.deliveryPincode,
        isReversedOrder: params.isReversedOrder,
      };

      // Validate input using utility
      const validationErrors = validateCalculationParams(utilityParams);
      if (validationErrors.length > 0) {
        return [{ message: validationErrors.join(', ') }];
      }

      // Get pincode details
      const [pickupDetails, deliveryDetails] = await Promise.all([
        getPincodeDetails(Number(params.pickupPincode)),
        getPincodeDetails(Number(params.deliveryPincode)),
      ]);

      if (!pickupDetails || !deliveryDetails) {
        return [{ message: 'Invalid pincode' }];
      }

      // Get user's plan with courier pricing
      const userPlan = await this.getUserPlan(userId);
      if (!userPlan) {
        return [{ message: 'No plan assigned to user' }];
      }

      // Extract courier pricing from plan
      const courierPricings = userPlan.plan_courier_pricings;
      if (!courierPricings || courierPricings.length === 0) {
        return [{ message: 'No couriers available in plan' }];
      }

      // Convert to utility format
      const couriersWithPricing: CourierWithPricing[] = courierPricings.map((courierPricing) => ({
        courier: {
          id: courierPricing.courier.id,
          name: courierPricing.courier.name,
          courier_code: courierPricing.courier.courier_code ?? '',
          type: courierPricing.courier.type,
          is_active: courierPricing.courier.is_active,
          is_reversed_courier: courierPricing.courier.is_reversed_courier,
          pickup_time: courierPricing.courier.pickup_time ?? '',
          weight_slab: courierPricing.weight_slab,
        },
        pricing: {
          weight_slab: courierPricing.weight_slab,
          increment_weight: courierPricing.increment_weight,
          cod_charge_hard: courierPricing.cod_charge_hard ?? 0,
          cod_charge_percent: courierPricing.cod_charge_percent ?? 0,
          is_cod_applicable: courierPricing.is_cod_applicable,
          is_rto_applicable: courierPricing.is_rto_applicable,
          is_fw_applicable: courierPricing.is_fw_applicable,
          zone_pricing: courierPricing.zone_pricing,
        },
      }));

      // Calculate prices using utility
      const utilityResults = calculatePricesForCouriers(
        utilityParams,
        couriersWithPricing,
        pickupDetails,
        deliveryDetails
      );

      // Convert utility results back to original format
      const rates: RateCalculationResult[] = utilityResults.map((result) => ({
        nickName: result.courier.name,
        name: result.courier.name,
        minWeight: result.pricing.weight_slab,
        cod: result.codCharges,
        isReversedCourier: result.courier.is_reversed_courier,
        rtoCharges: result.rtoCharges,
        charge: result.totalPrice,
        type: result.courier.type,
        expectedPickup: result.expectedPickup,
        carrierId: result.courier.id,
        order_zone: result.zoneName,
        courier: {
          id: result.courier.id,
          name: result.courier.name,
          courier_code: result.courier.courier_code,
          is_cod_applicable: result.pricing.is_cod_applicable,
          is_fw_applicable: result.pricing.is_fw_applicable,
          is_rto_applicable: result.pricing.is_rto_applicable,
        },
      }));

      return rates.length ? rates : [{ message: 'No serviceable couriers' }];
    } catch (error) {
      console.error('Error in calculateRates:', error);
      return [{ message: `Error: ${(error as Error).message}` }];
    }
  }
}
