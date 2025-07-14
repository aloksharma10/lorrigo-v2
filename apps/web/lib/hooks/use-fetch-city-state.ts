import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { getPincode } from '../actions/pincode';

interface CityStateResponse {
  city: string;
  state: string;
}

const useFetchCityState = (pincode?: string) => {
  const [isTyping, setIsTyping] = useState(false);
  const cacheRef = useRef<Map<string, CityStateResponse>>(new Map());
  const [cachedData, setCachedData] = useState<CityStateResponse | null>(null);

  const { data, error, isLoading, refetch } = useQuery<CityStateResponse, Error>({
    queryKey: ['cityState', pincode],
    queryFn: async () => {
      if (!pincode || pincode.length !== 6) throw new Error('Invalid pincode');

      // If cache exists, return from it
      if (cacheRef.current.has(pincode)) {
        return cacheRef.current.get(pincode)!;
      }

      const response = await getPincode(pincode);
      if (!response) throw new Error('No data found for pincode');
      cacheRef.current.set(pincode, response);
      return response;
    },
    enabled: false, // manual trigger only
    retry: 2,
  });

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (pincode?.length === 6) {
        setIsTyping(false);

        // Use cached value if present
        if (cacheRef.current.has(pincode)) {
          setCachedData(cacheRef.current.get(pincode)!);
        } else {
          const res = await refetch();
          if (res.data) {
            setCachedData(res.data);
          }
        }
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [pincode, refetch]);

  return {
    cityState: cachedData || { city: '', state: '' },
    loading: isLoading,
    error: error?.message || null,
    isTyping,
  };
};

export default useFetchCityState;
