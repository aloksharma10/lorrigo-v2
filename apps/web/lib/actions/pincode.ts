'use server';
import { prisma } from '@lorrigo/db';

export async function getPincode(pincode: string) {
  const pincode_data = await prisma.pincode.findUnique({
    where: {
      pincode: pincode.toString() || '',
    },
  });
  return pincode_data;
}
