import { FastifyInstance } from 'fastify';
import { generatePlanId } from '../utils/id-generator';
import { getPincodeDetails } from '@/utils/pincode';

// Types
interface PlanCourierPricing {
  courierId: string;
  basePrice: number;
  weightSlab: number;
  incrementWeight: number;
  incrementPrice: number;
  zonePricing: {
    withinCity: {
      basePrice: number;
      incrementPrice: number;
      isRTOSameAsFW: boolean;
      rtoBasePrice?: number;
      rtoIncrementPrice?: number;
    };
    withinZone: {
      basePrice: number;
      incrementPrice: number;
      isRTOSameAsFW: boolean;
      rtoBasePrice?: number;
      rtoIncrementPrice?: number;
    };
    withinMetro: {
      basePrice: number;
      incrementPrice: number;
      isRTOSameAsFW: boolean;
      rtoBasePrice?: number;
      rtoIncrementPrice?: number;
    };
    withinRoi: {
      basePrice: number;
      incrementPrice: number;
      isRTOSameAsFW: boolean;
      rtoBasePrice?: number;
      rtoIncrementPrice?: number;
    };
    northEast: {
      basePrice: number;
      incrementPrice: number;
      isRTOSameAsFW: boolean;
      rtoBasePrice?: number;
      rtoIncrementPrice?: number;
    };
  };
}

export interface CreatePlanInput {
  name: string;
  description: string;
  isDefault: boolean;
  features: string[];
  courierPricing: PlanCourierPricing[];
}

export interface UpdatePlanInput {
  name?: string;
  description?: string;
  isDefault?: boolean;
  features?: string[];
  courierPricing?: PlanCourierPricing[];
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

// Constants
const MetroCities = ['Mumbai', 'Delhi', 'Kolkata', 'Chennai', 'Bengaluru', 'Hyderabad'];
const NorthEastStates = ['Assam', 'Arunachal Pradesh', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Sikkim', 'Tripura'];

export class PlanService {

  constructor(private fastify: FastifyInstance) { }

  async getAllPlans() {
    return this.fastify.prisma.plan.findMany({
      include: {
        plan_courier_pricings: {
          include: {
            courier: true
          }
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  }

  async getPlanById(id: string) {
    return this.fastify.prisma.plan.findUnique({
      where: { id },
      include: {
        plan_courier_pricings: {
          include: {
            courier: true
          }
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  }

  async createPlan(data: CreatePlanInput) {
    // If this plan is set as default, unset any existing default plans
    if (data.isDefault) {
      await this.fastify.prisma.plan.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
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
          create: data.courierPricing.map(pricing => ({
            courier_id: pricing.courierId,
            base_price: pricing.basePrice,
            weight_slab: pricing.weightSlab,
            increment_weight: pricing.incrementWeight,
            incrementPrice: pricing.incrementPrice,
            zonePricing: pricing.zonePricing
          }))
        }
      },
      include: {
        plan_courier_pricings: {
          include: {
            courier: true
          }
        }
      }
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
        data: { isDefault: false }
      });
    }

    // Update courier pricing if provided
    if (data.courierPricing && data.courierPricing.length > 0) {
      // Delete existing pricing
      await this.fastify.prisma.planCourierPricing.deleteMany({
        where: { plan_id: id }
      });

      // Create new pricing
      for (const pricing of data.courierPricing) {
        await this.fastify.prisma.planCourierPricing.create({
          data: {
            plan_id: id,
            courier_id: pricing.courierId,
            base_price: pricing.basePrice,
            weight_slab: pricing.weightSlab,
            increment_weight: pricing.incrementWeight,
            increment_price: pricing.incrementPrice,
            zonePricing: pricing.zonePricing
          }
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
        features: data.features
      },
      include: {
        plan_courier_pricings: {
          include: {
            courier: true
          }
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
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
      where: { plan_id: id }
    });

    if (usersWithPlan > 0) {
      throw new Error('Cannot delete plan that is assigned to users');
    }

    // Delete plan courier pricing
    await this.fastify.prisma.planCourierPricing.deleteMany({
      where: { plan_id: id }
    });

    // Delete plan
    return this.fastify.prisma.plan.delete({
      where: { id }
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
      include: {
        plan: true
      }
    });
  }

  async getDefaultPlan() {
    return this.fastify.prisma.plan.findFirst({
      where: { isDefault: true },
      include: {
        plan_courier_pricings: {
          include: {
            courier: true
          }
        }
      }
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
                  courier: true
                }
              }
            }
          }
        }
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


  async calculateRates(params: RateCalculationParams, userId: string): Promise<RateCalculationResult[] | { message: string }[]> {
    try {
      // Input validation
      if (!(params.paymentType === 0 || params.paymentType === 1)) {
        throw new Error('Invalid paymentType');
      }
      if (params.paymentType === 1 && !params.collectableAmount) {
        throw new Error('Collectable amount is required for COD');
      }

      // Weight calculations
      let weight = params.weight;
      if (params.weightUnit === 'g') weight /= 1000;
      
      const volume = params.sizeUnit === 'cm' 
        ? (params.boxLength * params.boxWidth * params.boxHeight) / 5000 
        : (params.boxLength * params.boxWidth * params.boxHeight) / 5;
      
      const volumetricWeight = Math.round(volume);
      const finalWeight = Math.max(volumetricWeight, Number(weight));

      // Get pincode details
      const [pickupDetails, deliveryDetails] = await Promise.all([
        getPincodeDetails(Number(params.pickupPincode)),
        getPincodeDetails(Number(params.deliveryPincode))
      ]);

      if (!pickupDetails || !deliveryDetails) {
        throw new Error('Invalid pincode');
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

      // Calculate rates for each courier
      const rates: RateCalculationResult[] = [];

      for (const courierPricing of courierPricings) {
        const courier = courierPricing.courier;
        
        // Skip inactive couriers
        if (!courier.is_active) continue;
        
        // Skip couriers that don't match the reversed order flag
        if (courier.is_reversed_courier !== Boolean(params.isReversedOrder)) continue;

        // Determine zone
        let order_zone = '';
        let zonePricing: any = null;

        if (pickupDetails.district === deliveryDetails.district) {
          zonePricing = courierPricing?.zonePricing?.withinCity;
          order_zone = 'Zone A';
        } else if (pickupDetails.state === deliveryDetails.state) {
          zonePricing = courierPricing.zonePricing.withinZone;
          order_zone = 'Zone B';
        } else if (
          MetroCities.includes(pickupDetails.city) && 
          MetroCities.includes(deliveryDetails.city)
        ) {
          zonePricing = courierPricing.zonePricing.withinMetro;
          order_zone = 'Zone C';
        } else if (
          NorthEastStates.includes(pickupDetails.state) ||
          NorthEastStates.includes(deliveryDetails.state)
        ) {
          zonePricing = courierPricing.zonePricing.northEast;
          order_zone = 'Zone E';
        } else {
          zonePricing = courierPricing.zonePricing.withinRoi;
          order_zone = 'Zone D';
        }

        if (!zonePricing) {
          continue;
        }

        // Parse pickup time
        const [hour, minute, second] = courier.pickup_time?.split(':').map(Number) || [12, 0, 0];
        const pickupTime = new Date().setHours(hour, minute, second, 0);
        const expectedPickup = pickupTime < Date.now() ? 'Tomorrow' : 'Today';

        // Adjust weight based on minimum weight
        let orderWeight = finalWeight;
        const minWeight = courierPricing.weight_slab || 0;
        if (orderWeight < minWeight) {
          orderWeight = minWeight;
        }

        // Calculate base charges
        let totalCharge = zonePricing.base_price || 0;
        const weightIncrementRatio = Math.ceil((orderWeight - minWeight) / (courierPricing.increment_weight || 1));
        totalCharge += (zonePricing.increment_price || 0) * weightIncrementRatio;

        // COD calculation
        const codPrice = courier.cod_charge_hard || 0;
        const codAfterPercent = ((courier.cod_charge_percent || 0) / 100) * (params.collectableAmount || 0);
        const isCodDeduct = courier.is_cod_applicable;
        const cod = params.paymentType === 1 && isCodDeduct ? Math.max(codPrice, codAfterPercent) : 0;

        totalCharge += cod;

        // RTO charges
        const isRtoDeduct = courier.is_rto_applicable;
        const isRTOSameAsFW = zonePricing.isRTOSameAsFW === undefined ? true : Boolean(zonePricing.isRTOSameAsFW);
        
        let rtoCharges = 0;
        if (isRtoDeduct) {
          rtoCharges = isRTOSameAsFW
            ? totalCharge - cod
            : (zonePricing.rto_base_price || 0) + ((zonePricing.rto_increment_price || 0) * weightIncrementRatio);
        }

        const isFwdDeduct = courier.is_fw_applicable;

        // Prepare result
        const result: RateCalculationResult = {
          nickName: courier.name,
          name: courier.name,
          minWeight,
          cod,
          isReversedCourier: courier.is_reversed_courier,
          rtoCharges,
          charge: isFwdDeduct ? totalCharge : 0,
          type: courier.type,
          expectedPickup,
          carrierId: courier.id,
          order_zone,
          courier: {
            id: courier.id,
            name: courier.name,
            courier_code: courier.courier_code,
            is_cod_applicable: courier.is_cod_applicable,
            is_fw_applicable: courier.is_fw_applicable,
            is_rto_applicable: courier.is_rto_applicable
          }
        };

        rates.push(result);
      }

      return rates.length ? rates : [{ message: 'No serviceable couriers' }];
    } catch (error) {
      console.error('Error in calculateRates:', error);
      return [{ message: `Error: ${(error as Error).message}` }];
    }
  }
} 