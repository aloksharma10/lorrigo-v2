import { prisma } from '@lorrigo/db';

/**
 * This script assigns the default plan to all users who don't have a plan assigned
 */
async function assignDefaultPlanToUsers() {
  try {
    // Find the default plan
    const defaultPlan = await prisma.plan.findFirst({
      where: { isDefault: true },
    });

    if (!defaultPlan) {
      console.error(
        'No default plan found. Please ensure a default plan exists before running this script.'
      );
      return;
    }

    // Find all users without a plan
    const usersWithoutPlan = await prisma.user.findMany({
      where: {
        plan_id: null,
      },
    });

    if (usersWithoutPlan.length === 0) {
      console.log('All users already have a plan assigned.');
      return;
    }

    console.log(`Found ${usersWithoutPlan.length} users without a plan. Assigning default plan...`);

    // Update all users to use the default plan
    const result = await prisma.user.updateMany({
      where: {
        plan_id: null,
      },
      data: {
        plan_id: defaultPlan.id,
      },
    });

    console.log(`Successfully assigned default plan to ${result.count} users.`);
  } catch (error) {
    console.error('Error assigning default plan to users:', error);
  }
}

// Run the script if this file is executed directly
if (require.main === module) {
  assignDefaultPlanToUsers()
    .then(() => console.log('Script completed'))
    .catch((error) => console.error('Script failed:', error));
}

export default assignDefaultPlanToUsers;
