export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
}

export function validateDateString(dateString: string): boolean {
  if (!dateString) return false;

  // Check if it's in YYYY-MM-DD format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;

  // Check if it's a valid date
  const date = new Date(dateString);
  return !Number.isNaN(date.getTime());
}

// Helper to parse a YYYY-MM-DD string to a Date object
export function parseDateFromUrl(dateString: string): Date | undefined {
  if (!validateDateString(dateString)) return undefined;
  return new Date(dateString);
}
