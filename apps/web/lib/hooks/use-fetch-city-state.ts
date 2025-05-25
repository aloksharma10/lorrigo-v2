import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { getPincode } from '../actions/pincode';

interface CityStateResponse {
  city: string;
  state: string;
}

const useFetchCityState = (pincode?: string) => {
  const { data: session, status } = useSession(); // NextAuth session
  const [isTyping, setIsTyping] = useState(false);

  // React Query to fetch city/state    
  const { data, error, isLoading, refetch } = useQuery<CityStateResponse, Error>({
    queryKey: ['cityState', pincode],
    queryFn: async () => {
      if (!pincode || pincode.length !== 6) throw new Error('Invalid pincode');

      const pincode_data = await getPincode(Number(pincode));
      if (!pincode_data) throw new Error('No data found for pincode');
      return pincode_data;
    },
    enabled: false, // Disable auto-fetch (we'll trigger manually)
    retry: 2, // Retry twice on failure
  });

  // Debounce and trigger fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pincode?.length === 6) {
        refetch();
        setIsTyping(false);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [pincode, refetch]);

  return {
    cityState: data || { city: '', state: '' },
    loading: isLoading,
    error: error?.message || null,
    isTyping,
  };
};

export default useFetchCityState;
