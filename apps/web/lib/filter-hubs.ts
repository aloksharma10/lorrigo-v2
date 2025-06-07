
export function filterHubs(hubs: any[], query: string) {
  if (!query.trim()) return hubs;
  const lowerQuery = query.toLowerCase();
  return hubs.filter(
    (hub) =>
      hub.name?.toLowerCase().includes(lowerQuery) ||
      hub.address.address.toLowerCase().includes(lowerQuery)
  );
}
