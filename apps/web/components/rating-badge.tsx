interface RatingBadgeProps {
  rating: number;
  className?: string;
}

export function RatingBadge({ rating, className = '' }: RatingBadgeProps) {
  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'bg-green-500';
    if (rating >= 4.0) return 'bg-green-400';
    if (rating >= 3.5) return 'bg-yellow-500';
    if (rating >= 3.0) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div
      className={`h-12 w-12 rounded-full ${getRatingColor(
        rating
      )} flex items-center justify-center text-sm font-bold text-white ${className}`}
    >
      {rating.toFixed(1)}
    </div>
  );
}
