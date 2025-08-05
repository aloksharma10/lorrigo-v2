import { writeFileSync } from 'fs';
import { Parser as Json2CsvParser } from 'json2csv';
import { utils, write } from 'xlsx';
import path from 'path';
import fs from 'fs';

type ExportFormat = 'csv' | 'xlsx' | 'json';

export function exportData(
  fields: string[],
  data: any[],
  format: ExportFormat,
  fileName: string
): {
  csvBuffer: Buffer;
  filename: string;
} {
  if (!Array.isArray(data)) {
    throw new Error('Data must be an array of objects.');
  }

  // Define the output directory
  // const outputDir = '../../tmp/files';
  const outputDir = path.join(process.cwd(), 'tmp', 'files');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  switch (format) {
    case 'csv': {
      const parser = new Json2CsvParser({ fields });
      const csv = parser.parse(data);
      const fullFileName = path.join(outputDir, fileName.endsWith('.csv') ? fileName : `${fileName}.csv`);
      writeFileSync(fullFileName, csv);
      return {
        csvBuffer: Buffer.from(csv, 'utf-8'),
        filename: fullFileName,
      };
    }

    case 'xlsx': {
      const worksheet = utils.json_to_sheet(data);
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, 'Sheet1');

      const fullFileName = path.join(outputDir, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`);

      // Generate buffer using write
      const wbBuffer = write(workbook, { bookType: 'xlsx', type: 'buffer' });

      // Save the file to disk
      writeFileSync(fullFileName, wbBuffer);

      return {
        csvBuffer: wbBuffer,
        filename: fullFileName,
      };
    }

    case 'json': {
      const json = JSON.stringify(data, null, 2);
      const fullFileName = path.join(outputDir, fileName.endsWith('.json') ? fileName : `${fileName}.json`);
      writeFileSync(fullFileName, json);
      return {
        csvBuffer: Buffer.from(json, 'utf-8'),
        filename: fullFileName,
      };
    }

    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}
