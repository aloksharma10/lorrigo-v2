"use server"

import { parseCSVUpload } from "@lorrigo/utils"
import { revalidatePath } from "next/cache"

export async function uploadCSV(formData: FormData) {
  await new Promise((resolve) => setTimeout(resolve, 2000));

  
  const file = formData.get("file") as File
  const mappingStr = formData.get("mapping") as string
  const mapping = JSON.parse(mappingStr)

  const result = await parseCSVUpload(file, mapping, {
    requiredFields: ["order_id", "customer_name", "product_name"],
    validateRow: (row, i) => {
      const errors: string[] = []
      if (row.quantity && isNaN(Number(row.quantity))) {
        errors.push("Quantity must be a number")
      }
      return errors
    },
    processRow: async (row) => {
      // In real app, save to DB
      // await db.orders.create({ data: row })
    },
  })



  // if (result.success) {
  //   revalidatePath("/orders")
  // }

  // return result
}
