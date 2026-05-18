
export function generateRefId(prefix: 'REQ' | 'SES' | 'REP' | 'USR'): string {
  const random = Math.floor(1000 + Math.random() * 9000);
  const random2 = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${random}-${random2}`;
}
