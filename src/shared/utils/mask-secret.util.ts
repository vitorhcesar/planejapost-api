export function maskSecret(value: string): string {
  if (value.length <= 8) {
    return "***";
  }

  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}
