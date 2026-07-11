import { NextResponse } from 'next/server';
import redirects from '../redirects.json';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const match = redirects.find((r) => r.from === pathname);
  if (match?.to) {
    const url = request.nextUrl.clone();
    url.pathname = match.to;
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    if (host) {
      url.host = host.split(',')[0].trim();
      url.protocol = `${proto}:`;
    }
    return NextResponse.redirect(url, match.status || 301);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/article/:path*'],
};
