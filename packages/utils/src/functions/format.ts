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

export const formatPhoneNumber = (phone: string | number): string => {
  // Convert input to string
  const phoneStr = phone.toString();

  // Remove all non-digit characters including spaces, tabs, +, -, etc.
  const cleaned = phoneStr.replace(/\D/g, '');

  let phoneNumber = cleaned;

  // Handle country code prefix (91) if length > 10
  if (phoneNumber.length > 10 && phoneNumber.startsWith('91')) {
    phoneNumber = phoneNumber.slice(-10); // keep last 10 digits
  }

  // Handle numbers with leading 0 if length > 10
  if (phoneNumber.length > 10 && phoneNumber.startsWith('0')) {
    phoneNumber = phoneNumber.slice(-10);
  }

  // If number is still longer than 10, trim to last 10 digits
  if (phoneNumber.length > 10) {
    phoneNumber = phoneNumber.slice(-10);
  }

  // If number is less than 10, throw an error (or pad optionally)
  if (phoneNumber.length < 10) {
    throw new Error('Invalid phone number: less than 10 digits');
    // OR: return phoneNumber.padStart(10, '0'); // if you want to pad
  }

  return phoneNumber;
};

export const formatShiprocketAddress = (address = '') => {
  const fullAddress = `0-/, ${address || ''}`;
  return fullAddress.length > 150 ? fullAddress.slice(0, 150) : fullAddress;
};
