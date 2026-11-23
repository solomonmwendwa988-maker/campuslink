/** Security helpers intentionally keep identifying values out of auth logs. */
export function maskLoginIdentifier(identifier: string): string {
  const value = identifier.trim().slice(0, 254);
  if (!value) return '***';
  const at = value.indexOf('@');
  if (at > 0) {
    const local = value.slice(0, at);
    const domain = value.slice(at);
    const visible = local.length <= 2 ? local.slice(0, 1) : `${local[0]}***${local.slice(-1)}`;
    return `${visible}${domain}`.slice(0, 160);
  }
  return `${value.slice(0, 1)}***`.slice(0, 160);
}


/** Defaults to no proxy trust locally and one trusted reverse-proxy hop in production. */
export function resolveTrustProxyHops(value: string | undefined, isProduction: boolean): number {
  if (value === undefined || value.trim() === '') return isProduction ? 1 : 0;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 5) {
    throw new Error('TRUST_PROXY_HOPS must be an integer between 0 and 5.');
  }
  return parsed;
}
