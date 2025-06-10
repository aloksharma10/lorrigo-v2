import { prisma } from '@lorrigo/db';
import pincodes from './data/lorrigo.pincodes.json';

type RawPincode = {
  Pincode: number;
  StateName: string;
  City: string;
  District: string;
};

async function seedPincodes() {
  // Step 1: Deduplicate JSON on Pincode
  const uniqueData = Array.from(
    // @ts-ignore
    new Map(pincodes.map((item) => [item.Pincode, item])).values()
  ) as RawPincode[];

  // Step 2: Fetch already existing pincodes
  const existingPincodes = await prisma.pincode.findMany({
    where: {
      pincode: {
        in: uniqueData.map((item) => item.Pincode),
      },
    },
    select: {
      pincode: true,
    },
  });

  const existingPincodeSet = new Set(existingPincodes.map((p) => p.pincode));

  // Step 3: Filter out pincodes that already exist
  const newEntries = uniqueData.filter((item) => !existingPincodeSet.has(item.Pincode));

  // Step 4: Bulk insert new entries using createMany
  if (newEntries.length > 0) {
    await prisma.pincode.createMany({
      data: newEntries.map((item) => ({
        pincode: item.Pincode,
        city: item.City,
        state: item.StateName,
        district: item.District,
      })),
      skipDuplicates: true, // extra safety
    });

    console.log(`Inserted ${newEntries.length} new pincodes.`);
  } else {
    console.log(`No new pincodes to insert.`);
  }
}

seedPincodes().catch(console.error);
