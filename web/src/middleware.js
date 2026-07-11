import { NextResponse } from 'next/server';
import redirects from '../redirects.json';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const match = redirects.find((r) => r.from === pathname);
  if (match?.to) {
    const forwardedHost = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '')
      .split(',')[0]
      .trim()
      .replace(/:\d+$/, '');
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const target = `${proto}://${forwardedHost}${match.to.startsWith('/') ? match.to : `/${match.to}`}`;
    return NextResponse.redirect(target, match.status || 301);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/article/:path*'],
};
