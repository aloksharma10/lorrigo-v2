export function maskLastSix(value?: string | null): string | null {
    if (!value) return null;
    const visible = value.slice(-6);
    const masked = '*'.repeat(value.length - 6) + visible;
    return masked;
  }