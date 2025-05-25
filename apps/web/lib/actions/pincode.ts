"use server"
import { prisma } from "@lorrigo/db";

export async function getPincode(pincode: number) {
   const pincode_data = await prisma.pincode.findUnique({
      where: {
         pincode: pincode
      }
   })
   return pincode_data
}

