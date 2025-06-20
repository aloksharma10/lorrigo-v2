import fs from 'fs';
import path from 'path';
import { FastifyInstance } from 'fastify';
import { PDFDocument, PDFPage } from 'pdf-lib';

/**
 * Interface for bulk operation result
 */
export interface BulkOperationResult {
  id: string;
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  timestamp?: Date;
}

/**
 * Generate CSV report for bulk operation
 * @param operationId Bulk operation ID
 * @param results Operation results
 * @param fastify Fastify instance
 */
export async function generateCsvReport(
  operationId: string,
  results: BulkOperationResult[],
  fastify: FastifyInstance
): Promise<string | null> {
  try {
    // Create CSV header
    const header = 'ID,Success,Message,Error,Timestamp\n';

    // Format data for CSV
    const rows = results.map(result => {
      const id = result.id || '';
      const success = result.success ? 'Yes' : 'No';
      const message = (result.message || '').replace(/,/g, ';').replace(/\n/g, ' ');
      const error = (result.error || '').replace(/,/g, ';').replace(/\n/g, ' ');
      const timestamp = result.timestamp ? result.timestamp.toISOString() : new Date().toISOString();

      return `"${id}","${success}","${message}","${error}","${timestamp}"`;
    }).join('\n');

    // Generate CSV content
    const csvContent = header + rows;

    // Create directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads', 'reports');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Write CSV file
    const csvPath = path.join(uploadsDir, `bulk_operation_${operationId}.csv`);
    fs.writeFileSync(csvPath, csvContent);

    // Update bulk operation with CSV path
    await fastify.prisma.bulkOperation.update({
      where: { id: operationId },
      data: {
        report_path: csvPath,
      },
    });

    fastify.log.info(`CSV report generated for operation ${operationId}`);
    return csvPath;
  } catch (error) {
    fastify.log.error(`Error generating CSV report: ${error}`);
    return null;
  }
}

/**
 * Merge PDF buffers into a single PDF file
 * @param pdfBuffers Array of PDF buffers to merge
 * @param operationId Bulk operation ID
 * @param fastify Fastify instance
 */
export async function mergePdfBuffers(
  pdfBuffers: Buffer[],
  operationId: string,
  fastify: FastifyInstance
): Promise<string | null> {
  try {
    // Create a new PDF document
    const mergedPdf = await PDFDocument.create();

    // Add each PDF buffer to the merged document
    for (const buffer of pdfBuffers) {
      try {
        const pdf = await PDFDocument.load(buffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page: PDFPage) => {
          mergedPdf.addPage(page);
        });
      } catch (error) {
        fastify.log.error(`Error adding PDF to merged document: ${error}`);
        // Continue with other PDFs even if one fails
      }
    }

    // Save the merged PDF
    const mergedPdfBytes = await mergedPdf.save();
    const mergedPdfBuffer = Buffer.from(mergedPdfBytes);

    // Create directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads', 'labels');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Write merged PDF to file
    const pdfPath = path.join(uploadsDir, `bulk_labels_${operationId}.pdf`);
    fs.writeFileSync(pdfPath, mergedPdfBuffer);

    // Update bulk operation with PDF path
    await fastify.prisma.bulkOperation.update({
      where: { id: operationId },
      data: {
        file_path: pdfPath,
      },
    });

    fastify.log.info(`Merged PDF generated for operation ${operationId}`);
    return pdfPath;
  } catch (error) {
    fastify.log.error(`Error merging PDF buffers: ${error}`);
    return null;
  }
} 