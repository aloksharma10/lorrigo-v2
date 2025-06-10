import courierData from './data/lorrigo.couriers.json';
import channelData from './data/lorrigo.envs.json';
import { prisma, DeliveryType, Zone } from '@lorrigo/db';


async function main() {

   const channelMap = new Map();

   // 1. Seed Channels
   for (const channel of channelData) {
      const dbChannel = await prisma.channelConfig.upsert({
         where: { name: channel.name },
         update: {},
         create: {
            name: channel.name,
            nickname: channel.nickName,
            is_active: true,
         },
      });

      channelMap.set(channel.name, dbChannel.id);
   }

   // Simulate plan ID (you should fetch your actual plan ID)
   const planId = 'cmbno133r0000h084bb24bvaq'; // Replace with your actual Plan ID

   for (const courier of courierData) {
      const channelId = channelMap.get(getChannelNameById(courier.vendor_channel_id.$oid));
      if (!channelId) continue;

      const code = `CR-${new Date().getFullYear().toString().slice(2)}${(new Date().getMonth() + 1)
         .toString()
         .padStart(2, '0')}-${String(Math.abs(courier.carrierID)).padStart(5, '0')}`;

      const dbCourier = await prisma.courier.upsert({
         where: {
            code_name_weight_slab: {
               code,
               name: courier.name,
               weight_slab: courier.weightSlab,
            },
         },
         update: {},
         create: {
            code,
            name: courier.name,
            courier_code: courier.carrierID.toString(),
            cod_charge_hard: courier.codCharge?.hard ?? 40,
            cod_charge_percent: courier.codCharge?.percent ?? 1.5,
            is_active: courier.isActive,
            is_reversed_courier: courier.isReversedCourier,
            weight_slab: courier.weightSlab,
            weight_unit: courier.weightUnit,
            increment_weight: courier.incrementWeight,
            type: courier.type.toUpperCase() as DeliveryType,
            pickup_time: courier.pickupTime,
            channel_config_id: channelId,
         },
      });

      // Create PlanCourierPricing
      const planCourierPricing = await prisma.planCourierPricing.upsert({
         where: {
            plan_id_courier_id: {
               plan_id: planId,
               courier_id: dbCourier.id,
            },
         },
         update: {},
         create: {
            plan_id: planId,
            courier_id: dbCourier.id,
            cod_charge_hard: courier.codCharge?.hard ?? 40,
            cod_charge_percent: courier.codCharge?.percent ?? 1.5,
            weight_slab: courier.weightSlab ?? 0.5,
            increment_weight: courier.incrementWeight ?? 0.5,
            increment_price: 0, // Will be handled by zones
            is_fw_applicable: true,
            is_rto_applicable: true,
            is_cod_applicable: true,
            is_cod_reversal_applicable: true,
         },
      });

      // Zones Mapping
      const zones: { zone: Zone; key: keyof typeof courier }[] = [
         { zone: 'WITHIN_CITY', key: 'withinCity' },
         { zone: 'WITHIN_STATE', key: 'withinZone' },
         { zone: 'WITHIN_METRO', key: 'withinMetro' },
         { zone: 'WITHIN_ROI', key: 'withinRoi' },
         { zone: 'NORTH_EAST', key: 'northEast' },
      ];

      for (const z of zones) {
         const price: { basePrice: number; incrementPrice: number } = courier[z.key] as { basePrice: number; incrementPrice: number };
         if (!price) continue;

         await prisma.zonePricing.upsert({
            where: {
               plan_courier_pricing_id_zone: {
                  plan_courier_pricing_id: planCourierPricing.id,
                  zone: z.zone,
               },
            },
            update: {},
            create: {
               zone: z.zone,
               base_price: price.basePrice,
               increment_price: price.incrementPrice,
               is_rto_same_as_fw: true,
               rto_base_price: price.basePrice,
               rto_increment_price: price.incrementPrice,
               flat_rto_charge: 0,
               plan_courier_pricing_id: planCourierPricing.id,
            },
         });
      }
   }

   console.log('✅ Seeding complete');
}

// Maps channel OIDs to names in env file
function getChannelNameById(oid: string): string | undefined {
   const mapping: Record<string, string> = {
      '6627acadabe95523ee592372': 'DELHIVERY',
      '6628abf579087bcaf24ef3da': 'SMARTSHIP',
      '6628abf779087bcaf24ef7b2': 'SMARTR',
      '66595e59ea09cc12380f0b85': 'DELHIVERY_0.5',
      '66695e2bc475271f3f11df4b': 'DELHIVERY_0.5',
      '66695e40c475271f3f11df4c': 'DELHIVERY_10',
      '66a34cbc3d165482f1409477': 'MARUTI',
   };
   return mapping[oid];
}

main()
   .catch((e) => {
      console.error('❌ Seeding failed', e);
   })
   .finally(() => prisma.$disconnect());
