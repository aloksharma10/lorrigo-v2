// import { type ClassValue } from "clsx"

// Color palette from purple to sky blue
export const chartColors = [
  '#a78bfa', // Purple
  '#818cf8', // Indigo
  '#60a5fa', // Blue
  '#38bdf8', // Light Blue
  '#22d3ee', // Cyan
  '#2dd4bf', // Teal
  '#34d399', // Emerald
  '#4ade80', // Green
  '#facc15', // Yellow
  '#fb923c', // Orange
  '#f87171', // Red
];

export function getChartColors(count: number): string[] {
  if (count <= chartColors.length) {
    return chartColors.slice(0, count);
  }

  // If we need more colors than available, cycle through them
  return Array.from({ length: count }, (_, i) => chartColors[i % chartColors.length] as string);
}
