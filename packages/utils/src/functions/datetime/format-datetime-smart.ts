export const formatDateTimeSmart = (datetime: string | number | Date): string => {
  const date = new Date(datetime);

  const formattedDate = date.toLocaleDateString(); // e.g., 06/08/2025
  const formattedTime = date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  }); // e.g., 02:23 PM

  return `${formattedDate} | ${formattedTime}`
};
