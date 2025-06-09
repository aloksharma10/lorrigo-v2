export const hasSpecialChars = (address: string): boolean => {
  return /[\/#-]/.test(address);
};

export const hasNumbers = (address: string): boolean => {
  return /\d/.test(address);
};
