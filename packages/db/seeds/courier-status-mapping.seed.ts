import { prisma } from '@lorrigo/db';
import { delhiveryStatusMappings, shiprocketB2BStatusMappings, shiprocketStatusMappings, smartshipStatusMappings } from './data/couriers';

async function main() {
  console.log('Seeding courier status mappings...');

  // Define status mappings by bucket
  const statusMappings = [
    ...delhiveryStatusMappings,
    ...shiprocketStatusMappings,
    ...shiprocketB2BStatusMappings,
    ...smartshipStatusMappings,
  ];
  // Create or update status mappings
  for (const mapping of statusMappings) {
    await prisma.courierStatusMapping.upsert({
      where: {
        courier_name_status_code: {
          courier_name: mapping.courier_name,
          status_code: mapping.status_code,
        },
      },
      update: {
        status_label: mapping.status_label,
        status_description: mapping.status_description,
        bucket: mapping.bucket,
        is_active: mapping.is_active,
      },
      create: mapping,
    });
  }

  console.log(`Seeded ${statusMappings.length} courier status mappings`);
}

main()
  .catch((error) => {
    console.error('Error seeding courier status mappings:', error);
    // Don't exit with error code to allow other seeds to run
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 