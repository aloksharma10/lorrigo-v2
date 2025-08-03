import { NextRequest } from 'next/server';
import { UAParser } from 'ua-parser-js';

export interface DeviceInfo {
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  country?: string;
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
}

export async function getDeviceInfo(req: NextRequest | Request): Promise<DeviceInfo> {
  const deviceInfo: DeviceInfo = {};

  try {
    // Extract IP address
    if (req instanceof NextRequest) {
      // NextRequest doesn't have an 'ip' property, use headers only
      deviceInfo.ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined;
    } else {
      // For regular Request objects
      deviceInfo.ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined;
    }

    // Extract User Agent
    deviceInfo.userAgent = req.headers.get('user-agent') || undefined;

    // Parse User Agent for device info
    if (deviceInfo.userAgent) {
      const parser = new UAParser(deviceInfo.userAgent);
      const result = parser.getResult();

      deviceInfo.browser = result.browser.name || undefined;
      deviceInfo.os = result.os.name || undefined;
      
      // Determine device type
      if (result.device.type) {
        deviceInfo.deviceType = result.device.type;
      } else if (result.os.name === 'iOS' || result.os.name === 'Android') {
        deviceInfo.deviceType = 'mobile';
      } else {
        deviceInfo.deviceType = 'desktop';
      }
    }

    // Note: For geolocation, you would typically use a service like MaxMind GeoIP2
    // or similar. This is a placeholder for the implementation
    // deviceInfo.country = await getCountryFromIP(deviceInfo.ipAddress);
    // deviceInfo.city = await getCityFromIP(deviceInfo.ipAddress);
    // deviceInfo.region = await getRegionFromIP(deviceInfo.ipAddress);

  } catch (error) {
    console.error('Error extracting device info:', error);
  }

  return deviceInfo;
}

export function getDeviceType(userAgent: string): string {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  if (result.device.type) {
    return result.device.type;
  }

  if (result.os.name === 'iOS' || result.os.name === 'Android') {
    return 'mobile';
  }

  return 'desktop';
}

export function getBrowserInfo(userAgent: string): { name?: string; version?: string } {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  return {
    name: result.browser.name,
    version: result.browser.version,
  };
}

export function getOSInfo(userAgent: string): { name?: string; version?: string } {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  return {
    name: result.os.name,
    version: result.os.version,
  };
} 