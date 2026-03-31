export function formatBRL(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits || digits === '0') return '';

  const padded = digits.padStart(3, '0');
  const intPart = padded.slice(0, -2).replace(/^0+/, '') || '0';
  const decPart = padded.slice(-2);
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `R$ ${intFormatted},${decPart}`;
}

export function parseBRL(formatted: string): string {
  return formatted.replace(/\D/g, '');
}

export function brlToFloat(raw: string): number {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
}
