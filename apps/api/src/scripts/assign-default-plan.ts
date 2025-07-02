import { prisma } from '@lorrigo/db';

/**
 * This script assigns the default plan to all users who don't have a plan assigned
 */
export async function assignDefaultPlanToAllUsers() {
  try {
    // Get the default plan
    const defaultPlan = await prisma.plan.findFirst({
      where: { isDefault: true },
      include: {
        plan_courier_pricings: {
          include: {
            zone_pricing: true,
          },
        },
      },
    });

    if (!defaultPlan) {
      throw new Error('No default plan found after creation');
    }

    // Check zone pricing
    // const totalZonePricing = defaultPlan.plan_courier_pricings.reduce(
    //   (total, pricing) => total + pricing.zone_pricing.length,
    //   0
    // );

    // Get all users without a plan
    const usersWithoutPlan = await prisma.user.findMany({
      where: { plan_id: null },
      select: { id: true, email: true, name: true },
    });

    // Assign default plan to users without a plan
    if (usersWithoutPlan.length > 0) {
      const result = await prisma.user.updateMany({
        where: { plan_id: null },
        data: { plan_id: defaultPlan.id },
      });

      console.log(`Assigned default plan to ${result.count} users`);
    }

    // Get summary of all users and their plans
    const userPlanSummary = await prisma.user.groupBy({
      by: ['plan_id'],
      _count: { id: true },
    });

    for (const summary of userPlanSummary) {
      if (summary.plan_id) {
        const plan = await prisma.plan.findUnique({
          where: { id: summary.plan_id },
          select: { name: true, isDefault: true },
        });
        console.log(
          `  ${plan?.name || 'Unknown'} (${plan?.isDefault ? 'Default' : 'Custom'}): ${summary._count.id} users`
        );
      } else {
        console.log(`  No Plan: ${summary._count.id} users`);
      }
    }

    console.log('\n Default plan assignment completed successfully!');
  } catch (error) {
    console.error(' Error during default plan assignment:', error);
    // process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}
