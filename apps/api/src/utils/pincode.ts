import axios from 'axios';
import { redis } from '@/lib/redis';

export const getPincodeDetails = async (pincode: number) => {
  const cacheKey = `pincode:${pincode}`;
  
  // Try to get from cache first
  const cachedData = await redis.get(cacheKey);
  if (cachedData) {
    return JSON.parse(cachedData);
  }
  
  try {
    // If not in cache, fetch from API
    const response = await axios.get(`https://api.postalpincode.in/pincode/${pincode}`);
    
    if (response.data && response.data[0].Status === 'Success') {
      const pincodeData = response.data[0].PostOffice[0];
      
      // Cache the data for 30 days (pincode data rarely changes)
      await redis.set(cacheKey, JSON.stringify(pincodeData), 'EX', 30 * 24 * 60 * 60);
      
      return pincodeData;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching pincode details:', error);
    return null;
  }
};
