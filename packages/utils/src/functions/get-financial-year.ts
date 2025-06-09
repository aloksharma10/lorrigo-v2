export function getFinancialYear(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // Jan = 0, Apr = 3
  const fyStart = month >= 3 ? year : year - 1;
  return `${String(fyStart).slice(-2)}${String(fyStart + 1).slice(-2)}`;
}
