import { writeFileSync } from 'fs';
import { Parser as Json2CsvParser } from 'json2csv';
import { utils, writeFile, write } from 'xlsx';

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

  switch (format) {
    case 'csv': {
      const parser = new Json2CsvParser({ fields });
      const csv = parser.parse(data);
      const fullFileName = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`;
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
    
      const fullFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
    
      // Generate buffer using write (not writeFile)
      const wbBuffer = write(workbook, { bookType: 'xlsx', type: 'buffer' });
    
      // Optionally save the file to disk
      writeFileSync(fullFileName, wbBuffer);
    
      return {
        csvBuffer: wbBuffer, // wbBuffer is already a Buffer, no need for Buffer.from
        filename: fullFileName,
      };
    }

    case 'json': {
      const json = JSON.stringify(data, null, 2);
      const fullFileName = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
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
