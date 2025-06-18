type DateComparisonResult = {
   isEqual: boolean;
   isBefore: boolean;
   isAfter: boolean;
   message: string;
};

export function compareDates(dateStr1: string, dateStr2: string): DateComparisonResult {
   const date1 = new Date(dateStr1);
   const date2 = new Date(dateStr2);

   if (isNaN(date1.getTime()) || isNaN(date2.getTime())) {
      return {
         isEqual: false,
         isBefore: false,
         isAfter: false,
         message: 'Invalid date(s) provided',
      };
   }

   if (date1.getTime() === date2.getTime()) {
      return {
         isEqual: true,
         isBefore: false,
         isAfter: false,
         message: 'Both dates are equal',
      };
   }

   if (date1.getTime() < date2.getTime()) {
      return {
         isEqual: false,
         isBefore: true,
         isAfter: false,
         message: `${dateStr1} is before ${dateStr2}`,
      };
   }

   return {
      isEqual: false,
      isBefore: false,
      isAfter: true,
      message: `${dateStr1} is after ${dateStr2}`,
   };
}
