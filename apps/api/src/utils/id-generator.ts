/**
 * Generates a custom ID for various entities in the format PREFIX-YYMM-XXXXX
 * @param prefix Entity prefix (e.g., PL for Plan, US for User)
 * @returns Generated ID
 */
export function generateCustomId(prefix: string): string {
  // Get current date
  const date = new Date();

  // Extract year and month
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');

  // Generate random 5-digit number
  const random = Math.floor(10000 + Math.random() * 90000);

  // Format: PREFIX-YYMM-XXXXX
  return `${prefix}-${year}${month}-${random}`;
}
