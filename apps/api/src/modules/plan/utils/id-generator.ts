/**
 * Generate a unique plan ID with format: [prefix]-YYMM-XXXXX
 * @param prefix - Prefix for the ID (e.g., 'PL' for plans)
 * @returns Formatted ID string
 */
export function generatePlanId(prefix: string): string {
  // Get current date for YYMM part
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  
  // Generate random 5-digit number for XXXXX part
  const random = Math.floor(10000 + Math.random() * 90000);
  
  // Combine all parts
  return `${prefix}-${year}${month}-${random}`;
} 