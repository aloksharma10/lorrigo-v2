interface CourierLogoProps {
  courierName: string;
  className?: string;
}

export function CourierLogo({ courierName, className = 'w-8 h-8' }: CourierLogoProps) {
  // Map courier names to their logo colors/styles
  const courierStyles: Record<string, { bg: string; text: string }> = {
    'Blue Dart': { bg: 'bg-blue-600', text: 'text-white' },
    BlueDart: { bg: 'bg-blue-600', text: 'text-white' },
    Delhivery: { bg: 'bg-black', text: 'text-white' },
    Amazon: { bg: 'bg-orange-500', text: 'text-white' },
    FedEx: { bg: 'bg-purple-600', text: 'text-white' },
    DHL: { bg: 'bg-red-600', text: 'text-white' },
  };

  const style = courierStyles[courierName] || { bg: 'bg-gray-600', text: 'text-white' };

  return (
    <div
      className={`${className} ${style.bg} ${style.text} flex items-center justify-center rounded-md text-xs font-bold`}
    >
      {courierName.substring(0, 2).toUpperCase()}
    </div>
  );
}
