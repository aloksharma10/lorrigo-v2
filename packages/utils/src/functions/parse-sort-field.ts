export function parseSortField(sort: { field: string; direction: string }): Record<string, any> {
  const direction = sort.direction.toLowerCase() === 'asc' ? 'asc' : 'desc';
  const fieldParts = sort.field.split('.'); // e.g., ['customer', 'name']

  if (fieldParts.length === 1) {
    return { [fieldParts[0] as string]: direction };
  }

  return fieldParts.reduceRight<Record<string, any>>(
    (acc, curr) => ({ [curr]: acc }),
    direction as unknown as Record<string, any>
  );
}
