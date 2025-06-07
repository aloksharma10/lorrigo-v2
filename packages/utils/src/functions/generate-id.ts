import { getFinancialYear } from "./get-financial-year";

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
   // Get current financial year
   const today = new Date();
   const financialYear = getFinancialYear(today);

   // Determine if it's a new financial year
   const isNewFY = financialYear !== lastUsedFinancialYear;
   const sequenceNumber = isNewFY ? baseNumber : lastSequenceNumber + 1;

   // Generate entity initials
   const initials = entityName
      .split(' ')
      .map((word) => word[0]?.toUpperCase())
      .join('');

   // Format sequence number with specified length
   const suffix = String(sequenceNumber).padStart(suffixLength, '0');

   // Generate table-specific prefix if not provided
   const effectivePrefix = prefix || tableName.slice(0, 2).toUpperCase();

   // Construct final ID
   const id = `${effectivePrefix}${financialYear}${initials}${suffix}`;

   return {
      id,
      newFinancialYear: financialYear,
      resetOccurred: isNewFY,
      sequenceNumber,
   };
}

export function getFinancialYearStartDate(financialYear: string): Date {
   const [startYear] = financialYear.split('-').map(Number);
   return new Date(`${startYear}-04-01T00:00:00.000Z`);
 }
 