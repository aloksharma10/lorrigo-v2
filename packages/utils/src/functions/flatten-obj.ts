type AnyObject = Record<string, any>;

export function flattenObject(obj: AnyObject, prefix = ''): AnyObject {
  let result: AnyObject = {};

  for (const key in obj) {
    if (!obj.hasOwnProperty(key)) continue;

    const value = obj[key];
    const prefixedKey = prefix ? `${prefix}_${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nested = flattenObject(value, prefixedKey);
      result = { ...result, ...nested };
    } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
      // Handle first object in arrays like address[0]
      const nested = flattenObject(value[0], prefixedKey);
      result = { ...result, ...nested };
    } else {
      result[prefixedKey] = value;
    }
  }

  return result;
}