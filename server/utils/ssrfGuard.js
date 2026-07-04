import dns from 'dns/promises';
import net from 'net';

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts[0] === 10) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 0) return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    const n = ip.toLowerCase();
    if (n === '::1' || n.startsWith('fe80:') || n.startsWith('fc') || n.startsWith('fd')) return true;
  }
  return false;
}

/** Reject URLs that resolve to private/local addresses (SSRF protection). */
export async function assertPublicHttpUrl(rawUrl) {
  const u = new URL(rawUrl);
  if (!['http:', 'https:'].includes(u.protocol)) {
    throw Object.assign(new Error('Invalid protocol'), { status: 400 });
  }

  const host = u.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host === '0.0.0.0'
  ) {
    throw Object.assign(new Error('Blocked host'), { status: 400 });
  }

  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw Object.assign(new Error('Blocked IP'), { status: 400 });
    return;
  }

  const records = await dns.lookup(host, { all: true });
  for (const { address } of records) {
    if (isPrivateIp(address)) {
      throw Object.assign(new Error('Blocked host resolution'), { status: 400 });
    }
  }
}
