import { getFinancialYear } from './get-financial-year';

export interface GenerateIdOptions {
  tableName: string; // e.g., 'order', 'invoice', 'payment'
  entityName: string; // e.g., sellerName, customerName, etc.
  lastUsedFinancialYear: string;
  lastSequenceNumber: number;
  prefix?: string; // Custom prefix per table
  baseNumber?: number; // Starting number for sequence
  suffixLength?: number; // Length of padded sequence number
}

export interface GeneratedIdResult {
  id: string;
  newFinancialYear: string;
  resetOccurred: boolean;
  sequenceNumber: number;
}

export function generateId({
  tableName,
  entityName,
  lastUsedFinancialYear,
  lastSequenceNumber,
  prefix = 'LS',
  baseNumber = 1,
  suffixLength = 7,
}: GenerateIdOptions): GeneratedIdResult {
  const today = new Date();

  const istDate = getISTDate(today);

  const financialYear = getFinancialYear(istDate);

  const isNewFY = financialYear !== lastUsedFinancialYear;
  const sequenceNumber = isNewFY ? baseNumber : lastSequenceNumber + 1;

  const initials = entityName
    .split(' ')
    .map((word) => word[0]?.toUpperCase())
    .join('');

  const suffix = String(sequenceNumber).padStart(suffixLength, '0');

  const effectivePrefix = prefix || tableName.slice(0, 2).toUpperCase();

  // Generate IST-based 3-letter timestamp
  const timeCode = generate3LetterTimestamp(istDate);

  // Construct final ID
  const id = `${effectivePrefix}${financialYear}${initials}${suffix}${timeCode}`;

  return {
    id,
    newFinancialYear: financialYear,
    resetOccurred: isNewFY,
    sequenceNumber,
  };
}

function getISTDate(date: Date): Date {
  const IST_OFFSET = 5.5 * 60 * 60 * 1000; // in milliseconds
  return new Date(date.getTime() + IST_OFFSET);
}

function generate3LetterTimestamp(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const s = date.getSeconds();

  const compact = `${h.toString(36)}${m.toString(36)}${s.toString(36)}`.toUpperCase();

  return compact.padEnd(3, 'X').slice(0, 3);
}


export function getFinancialYearStartDate(financialYear: string): Date {
  const [startYear] = financialYear.split('-').map(Number);
  return new Date(`${startYear}-04-01T00:00:00.000Z`);
}

// Simple billing ID generator for CSV processing
export function generateBillingId(date = new Date()) {
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const randomNumber = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `BL-${year}${month}-${randomNumber}`;
}
