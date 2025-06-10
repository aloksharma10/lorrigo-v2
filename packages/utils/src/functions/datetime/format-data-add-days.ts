export const formatDateAddDays = (
   datetime: Date | string | number,
   options?: Intl.DateTimeFormatOptions
): string => {
   let dateObj: Date;

   if (typeof datetime === 'number') {
      // Add number of days to current date
      dateObj = new Date();
      dateObj.setDate(dateObj.getDate() + datetime);
   } else {
      dateObj = new Date(datetime);
   }

   // Check for invalid date
   if (isNaN(dateObj.getTime())) return '';

   // Return formatted string
   return dateObj.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short', // e.g., "Jun"
      year: 'numeric',
      ...options,
   });
};
