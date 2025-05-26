export type CSVMapping = Record<string, string>
export type ParsedRow = Record<string, string>
export type RowValidator = (row: ParsedRow, rowIndex: number) => string[] // array of error messages
export type RowProcessor = (row: ParsedRow, rowIndex: number) => Promise<void> | void

export type CSVUploadOptions = {
  requiredFields?: string[]
  validateRow?: RowValidator
  processRow?: RowProcessor
}

export type CSVUploadResult = {
  success: boolean
  processedRows?: number
  errors?: string // CSV string format
}

export async function parseCSVUpload(
  file: File,
  mapping: CSVMapping,
  options: CSVUploadOptions = {}
): Promise<CSVUploadResult> {
  try {
    const text = await file.text()
    const lines = text.split("\n").filter((line) => line.trim())
    const headers = lines[0]?.split(",").map((h) => h.trim()) ?? []

    const reverseMapping: Record<string, string> = {}
    Object.entries(mapping).forEach(([expected, csvHeader]) => {
      reverseMapping[csvHeader] = expected
    })

    const errors: string[] = []
    let processedRows = 0

    for (let i = 1; i < lines.length; i++) {
      const row = lines?.[i]?.split(",").map((cell) => cell.trim())
      if (row?.length !== headers.length) {
        errors.push(`Row ${i + 1}: Invalid number of columns`)
        continue
      }

      const mappedRow: ParsedRow = {}
      headers.forEach((header, idx) => {
        const expected = reverseMapping[header]
        if (expected) mappedRow[expected] = row[idx] ?? ""
      })

      // Built-in required field check
      const missingFields = (options.requiredFields ?? []).filter((field) => !mappedRow[field])
      if (missingFields.length > 0) {
        errors.push(`Row ${i + 1}: Missing required fields: ${missingFields.join(", ")}`)
        continue
      }

      // Custom validation callback
      const customErrors = options.validateRow?.(mappedRow, i + 1) ?? []
      if (customErrors.length > 0) {
        customErrors.forEach((err) => errors.push(`Row ${i + 1}: ${err}`))
        continue
      }

      // Process valid row (e.g., save to DB)
      try {
        await options.processRow?.(mappedRow, i + 1)
        processedRows++
      } catch (e) {
        errors.push(`Row ${i + 1}: Failed to process row`)
      }
    }

    if (errors.length > 0) {
      const errorCSV =
        "Row,Error\n" +
        errors
          .map((err) => {
            const [rowPart, errPart] = err.split(":")
            return `"${rowPart?.trim() ?? ""}","${errPart?.trim() ?? ""}"`
          })
          .join("\n")
      return { success: false, errors: errorCSV }
    }

    return { success: true, processedRows }
  } catch (err) {
    console.error("CSV parsing error:", err)
    return {
      success: false,
      errors: 'Row,Error\n"General","Unexpected error occurred"',
    }
  }
}
