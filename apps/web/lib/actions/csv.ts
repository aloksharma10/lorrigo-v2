"use server"

import { revalidatePath } from "next/cache"

type UploadResult = {
  success: boolean
  processedRows?: number
  errors?: string
}

export async function uploadCSV(formData: FormData): Promise<UploadResult> {
  try {
    // Get the file and mapping from the form data
    const file = formData.get("file") as File
    const mappingStr = formData.get("mapping") as string
    const mapping = JSON.parse(mappingStr) as Record<string, string>

    // Simulate a delay to show the progress indicator
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Read the file content
    const text = await file.text()
    const lines = text.split("\n").filter((line) => line.trim())
    const headers = lines[0]?.split(",").map((h) => h.trim()) ?? []

    // Process the CSV data
    const errors: string[] = []
    let processedRows = 0

    // Create a reverse mapping (CSV header -> expected header)
    const reverseMapping: Record<string, string> = {}
    Object.entries(mapping).forEach(([expectedHeader, csvHeader]) => {
      reverseMapping[csvHeader] = expectedHeader
    })

    // Process each row (skip header row)
    for (let i = 1; i < lines.length; i++) {
      const row = lines?.[i]?.split(",").map((cell) => cell.trim())

      // Basic validation - check if row has the right number of columns
      if (row?.length !== headers.length) {
        errors.push(`Row ${i + 1}: Invalid number of columns`)
        continue
      }

      // Create an object with the mapped data
      const mappedData: Record<string, string> = {}
      headers.forEach((header, index) => {
        const expectedHeader = reverseMapping[header]
        if (expectedHeader) {
          mappedData[expectedHeader] = row?.[index] ?? ""
        }
      })

      // Validate required fields
      const requiredFields = ["order_id", "customer_name", "product_name"]
      const missingFields = requiredFields.filter((field) => !mappedData[field])

      if (missingFields.length > 0) {
        errors.push(`Row ${i + 1}: Missing required fields: ${missingFields.join(", ")}`)
        continue
      }

      // Additional validation (example: quantity must be a number)
      if (mappedData.quantity && isNaN(Number(mappedData.quantity))) {
        errors.push(`Row ${i + 1}: Quantity must be a number`)
        continue
      }

      // If we get here, the row is valid
      processedRows++

      // In a real app, you would save the data to your database here
      // await db.orders.create({ data: mappedData })
    }

    // If there are errors, return them as a CSV
    if (errors.length > 0) {
      const errorCSV =
        "Row,Error\n" +
        errors
          .map((error) => {
            const [rowPart, errorPart] = error.split(":")
            return `"${rowPart?.trim() ?? ""}","${errorPart?.trim() ?? ""}"`
          })
          .join("\n")

      return {
        success: false,
        errors: errorCSV,
      }
    }

    // Revalidate the orders page to show the new data
    revalidatePath("/orders")

    return {
      success: true,
      processedRows,
    }
  } catch (error) {
    console.error("CSV upload error:", error)
    return {
      success: false,
      errors: 'Row,Error\n"General","An unexpected error occurred during processing"',
    }
  }
}
