import { hasNumbers, hasSpecialChars } from './has';

export const formatAddress = (address: string): string => {
  // Add number prefix if none exists
  let modifiedAddress = hasNumbers(address) ? address : `0 ${address}`;

  // Add separator if none exists
  if (!hasSpecialChars(modifiedAddress)) {
    modifiedAddress = modifiedAddress.replace(' ', '/');
  }

  return modifiedAddress;
};

export const formatPhoneNumber = (phone: number): string => {
  const phoneStr = phone.toString();

  // Check if it's a 10 digit number
  if (phoneStr.length === 10) {
    return phoneStr;
  }

  // If it's more than 10 digits, return the last 10 digits
  if (phoneStr.length > 10) {
    return phoneStr.slice(-10);
  }

  // If it's less than 10 digits, pad with zeros (rare case)
  return phoneStr.padStart(10, '0');
};
