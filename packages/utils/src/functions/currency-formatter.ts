export const currencyFormatter = (value: number, options?: Intl.NumberFormatOptions) =>
  Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
